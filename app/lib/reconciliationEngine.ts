import { validateAndNormalizeCart, NormalizedItem } from "@/app/lib/orderValidation";
import { artworks } from "@/app/data/artworks";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ReconciliationInput {
  orderId: string;
  paymentId: string;
  razorpayOrderId?: string | null;
  resolvedItems: unknown[];
  adminUserId: string;
  testIsolationTag?: string | null;
}

export interface ReconciliationResponse {
  status: number;
  body: {
    success?: boolean;
    message?: string;
    error?: string;
    details?: string;
    code?: string;
    orderId?: string;
    orderRef?: string;
    status?: string;
    currentStatus?: string;
    reconciledTotal?: number;
    calculatedTotal?: number;
    orderTotal?: number;
    items?: unknown[];
    strategyUsed?: "database_rpc";
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReconciliationDatabaseClient = any;

/**
 * Executes an atomic order reconciliation against the provided Supabase client.
 *
 * Guarantees:
 * 1. Test Isolation Safeguard: Rejects attempts to resolve orders not matching the test isolation tag.
 * 2. Payment Identity Verification: Enforces payment_id, razorpay_order_id, and payment_status === 'paid'.
 * 3. Authoritative Catalogue Pricing: Ignores client-supplied prices; resolves exclusively against artworks.ts.
 * 4. Amount Matching: Authoritative sum of items must equal the captured order total down to the rupee.
 * 5. Atomic Transaction: Strictly executes atomic database RPC (resolve_reconciliation_order_atomic).
 * 6. Fail-Closed: If RPC is missing, uninstalled, or fails, rejects with HTTP 503 (RPC_NOT_INSTALLED) or 500. Zero client-side multi-request writes.
 * 7. Fulfillment Separation: Sets status to 'Processing' only; never transitions to 'Shipped' or 'Delivered'.
 */
export async function executeAtomicReconciliation(
  supabase: ReconciliationDatabaseClient,
  input: ReconciliationInput
): Promise<ReconciliationResponse> {
  const { orderId, paymentId, razorpayOrderId, resolvedItems, adminUserId, testIsolationTag } = input;

  if (!orderId || !paymentId) {
    return {
      status: 400,
      body: { error: "Both orderId and paymentId are required to resolve a payment" },
    };
  }

  if (!Array.isArray(resolvedItems) || resolvedItems.length === 0) {
    return {
      status: 400,
      body: { error: "Resolution requires authoritative catalogue artwork items with positive quantities" },
    };
  }

  // 1. Query Target Order
  const { data: order, error: orderQueryError } = await supabase
    .from("orders")
    .select(
      "id, order_ref, total, status, payment_status, payment_id, razorpay_payment_id, razorpay_order_id, items, user_id"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderQueryError) {
    console.error("[Reconciliation Engine] Error querying order record:", orderQueryError.message);
    return {
      status: 500,
      body: {
        error: "Database error querying order record. Transaction was not initiated.",
        code: "DATABASE_QUERY_ERROR",
      },
    };
  }

  if (!order) {
    return {
      status: 404,
      body: { error: "Order record not found" },
    };
  }

  // 2. Test Isolation Safeguard
  if (testIsolationTag) {
    const matchesRef = order.order_ref && order.order_ref.includes(testIsolationTag);
    const matchesId = order.id === testIsolationTag;
    if (!matchesRef && !matchesId) {
      return {
        status: 403,
        body: { error: "Test isolation safeguard: Refusing to modify order that does not belong to active test run" },
      };
    }
  }

  // 3. Payment Identity Verification
  const existingPayment = order.razorpay_payment_id || order.payment_id;
  if (!existingPayment || existingPayment !== paymentId) {
    return {
      status: 400,
      body: { error: "Payment identifier mismatch: provided payment ID does not match order record" },
    };
  }

  if (razorpayOrderId && order.razorpay_order_id && order.razorpay_order_id !== razorpayOrderId) {
    return {
      status: 400,
      body: { error: "Order association mismatch: provided Razorpay order ID does not match order record" },
    };
  }

  // 4. Expected Status & Reconciliation Requirement Checks
  if (order.payment_status !== "paid") {
    return {
      status: 400,
      body: { error: `Cannot resolve order with payment status '${order.payment_status}'. Payment must be 'paid'.` },
    };
  }

  const currentItems = order.items as unknown;
  const isPendingReconciliation =
    Array.isArray(currentItems) &&
    currentItems.some(
      (it) => it && typeof it === "object" && (it as Record<string, unknown>).reconciliation_required === true
    );

  if (!isPendingReconciliation || order.status !== "Pending") {
    return {
      status: 409,
      body: {
        error: "Order is not pending reconciliation or has already been resolved",
        currentStatus: order.status,
      },
    };
  }

  // 5. Authoritative Catalogue Validation & Amount Enforcement
  const { normalizedItems: validatedItems, calculatedTotal, error: cartError } = validateAndNormalizeCart(resolvedItems);

  if (cartError || !validatedItems || validatedItems.length === 0) {
    return {
      status: 400,
      body: { error: `Authoritative inventory validation failed: ${cartError}` },
    };
  }

  if (calculatedTotal !== order.total) {
    return {
      status: 400,
      body: {
        error: `Amount mismatch: Authoritative item sum (₹${calculatedTotal}) does not match captured payment total (₹${order.total})`,
        calculatedTotal,
        orderTotal: order.total,
      },
    };
  }

  // 6. Enrich Items with Authoritative Metadata
  const enrichedResolvedItems = validatedItems.map((item: NormalizedItem) => ({
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    pricing: {
      amount: item.price,
      currency: "INR",
    },
    image: item.image,
    reconciliation_resolved: true,
    resolved_by_admin: adminUserId,
    resolved_at: new Date().toISOString(),
  }));

  // Prepare relational order_items rows
  const orderItemRows = validatedItems.map((item: NormalizedItem) => {
    const catalogArtwork = artworks.find((a) => a.id === item.id);
    const artworkUuid = item.id && UUID_REGEX.test(item.id) ? item.id : null;
    const artistUuid =
      catalogArtwork?.artist?.id && UUID_REGEX.test(catalogArtwork.artist.id)
        ? catalogArtwork.artist.id
        : null;

    return {
      order_id: order.id,
      artwork_id: artworkUuid,
      artist_id: artistUuid,
      quantity: item.quantity,
      price_at_purchase: item.price,
      artwork_title: item.title,
      artwork_image: item.image || null,
    };
  });

  // 7. Atomic Database Transaction Execution via Verified RPC
  // Strictly enforce engine-level ACID atomicity. Multi-request client fallback is completely disabled.
  if (typeof supabase.rpc !== "function") {
    return {
      status: 503,
      body: {
        error: "Atomic reconciliation is unavailable: database client does not support RPC or migration is uninstalled",
        code: "RPC_NOT_INSTALLED",
      },
    };
  }

  try {
    const { error: rpcError } = await supabase.rpc(
      "resolve_reconciliation_order_atomic",
      {
        p_order_id: order.id,
        p_expected_payment_id: paymentId,
        p_expected_razorpay_order_id: razorpayOrderId || null,
        p_expected_total: calculatedTotal,
        p_sanitized_items: enrichedResolvedItems,
        p_order_items_payload: orderItemRows,
      }
    );

    if (!rpcError) {
      return {
        status: 200,
        body: {
          success: true,
          message: "Order successfully reconciled and bound to verified catalogue items via atomic transaction",
          orderId: order.id,
          orderRef: order.order_ref,
          status: "Processing",
          reconciledTotal: calculatedTotal,
          items: enrichedResolvedItems,
          strategyUsed: "database_rpc",
        },
      };
    }

    if (rpcError.code === "23505") {
      return {
        status: 409,
        body: {
          error: "Order was already resolved by another concurrent operation",
          currentStatus: "Processing",
        },
      };
    }

    if (rpcError.code === "22000" || rpcError.code === "P0002") {
      return {
        status: 400,
        body: { error: rpcError.message },
      };
    }

    const isNotFound =
      rpcError.code === "PGRST202" ||
      rpcError.code === "42883" ||
      rpcError.message?.toLowerCase().includes("could not find") ||
      rpcError.message?.toLowerCase().includes("does not exist");

    if (isNotFound) {
      return {
        status: 503,
        body: {
          error: "Atomic reconciliation is temporarily unavailable: required database migration has not been installed",
          code: "RPC_NOT_INSTALLED",
        },
      };
    }

    // Permission errors (42501), timeouts, or other database-level failures fail closed
    console.error("[Reconciliation Engine] Database transaction failure:", {
      code: rpcError.code,
      message: rpcError.message,
    });
    return {
      status: 500,
      body: {
        error: "Database transaction error encountered during reconciliation. The transaction was not completed.",
        code: rpcError.code || "RPC_TRANSACTION_FAILED",
      },
    };
  } catch (err: unknown) {
    // Fail closed on thrown network exceptions, connection aborts, or timeouts — NEVER fall back to multi-request writes
    const message = err instanceof Error ? err.message : "RPC execution failure";
    console.error("[Reconciliation Engine] Network or execution exception during RPC:", message);
    return {
      status: 500,
      body: {
        error: "A network or connection error occurred while communicating with the database. Transaction outcome may be unconfirmed.",
        code: "RPC_EXECUTION_ERROR",
      },
    };
  }
}

