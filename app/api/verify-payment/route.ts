import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { supabaseAdmin, authenticateServerRequest } from "@/app/lib/supabaseServer";
import {
  validateCustomer,
  validateAndNormalizeCart,
  computeOrderFingerprint,
  validateRequestSize,
  NormalizedItem,
} from "@/app/lib/orderValidation";
import { artworks } from "@/app/data/artworks";
import type { Json } from "@/app/lib/database.types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function buildAuthoritativeOrderItemRows(orderId: string, normalizedItems: NormalizedItem[]) {
  // Query artworks table for any items that might exist in DB by slug
  const slugsToQuery = normalizedItems
    .map((item) => {
      const cat = artworks.find((a) => a.id === item.id || a.slug === item.id);
      return cat?.slug || (UUID_REGEX.test(item.id) ? null : item.id);
    })
    .filter((s): s is string => Boolean(s));

  const dbArtworksMap = new Map<string, { id: string; artist_id: string | null }>();
  if (slugsToQuery.length > 0) {
    try {
      const { data: dbArtworks } = await supabaseAdmin
        .from("artworks")
        .select("id, artist_id, slug")
        .in("slug", slugsToQuery);
      if (dbArtworks) {
        for (const art of dbArtworks) {
          if (art.slug) dbArtworksMap.set(art.slug, { id: art.id, artist_id: art.artist_id });
        }
      }
    } catch {
      // Non-fatal; falls back to catalogue / null
    }
  }

  return normalizedItems.map((item) => {
    let artworkUuid: string | null = UUID_REGEX.test(item.id) ? item.id : null;
    let artistUuid: string | null = null;

    const catalogArtwork = artworks.find((a) => a.id === item.id || a.slug === item.id);
    if (catalogArtwork?.artist?.id && UUID_REGEX.test(catalogArtwork.artist.id)) {
      artistUuid = catalogArtwork.artist.id;
    }

    if (!artworkUuid && catalogArtwork?.slug && dbArtworksMap.has(catalogArtwork.slug)) {
      const dbMatch = dbArtworksMap.get(catalogArtwork.slug)!;
      artworkUuid = dbMatch.id;
      if (dbMatch.artist_id && UUID_REGEX.test(dbMatch.artist_id)) {
        artistUuid = dbMatch.artist_id;
      }
    }

    return {
      order_id: orderId,
      artwork_id: artworkUuid,
      artist_id: artistUuid,
      quantity: item.quantity,
      price_at_purchase: item.price,
      artwork_title: item.title,
      artwork_image: item.image || null,
    };
  });
}

interface PersistedItemForValidation {
  artwork_id?: string | null;
  artwork_title?: string | null;
  quantity?: number | null;
  price_at_purchase?: number | string | null;
}

/**
 * Validates that existing persisted order items form an exact 1-to-1 multiset match
 * with normalized cart items. Tracks matched indices to ensure duplicate cart lines
 * cannot be satisfied by the same persisted row.
 */
function validateLineItemMultiset(
  existingItems: PersistedItemForValidation[],
  expectedItems: Array<{
    id: string;
    title: string;
    price: number;
    quantity: number;
  }>
): boolean {
  if (existingItems.length !== expectedItems.length) {
    return false;
  }

  const availableIndices = new Set(existingItems.keys());

  for (const exp of expectedItems) {
    let matchedIndex: number | null = null;

    for (const idx of availableIndices) {
      const act = existingItems[idx];
      const titleMatches = act.artwork_title === exp.title;
      const qtyMatches = act.quantity === exp.quantity;
      const priceMatches = Number(act.price_at_purchase) === exp.price;

      // If expected item has a database UUID, verify artwork_id
      const isExpectedUuid = UUID_REGEX.test(exp.id);
      const idMatches = isExpectedUuid ? act.artwork_id === exp.id : true;

      if (titleMatches && qtyMatches && priceMatches && idMatches) {
        matchedIndex = idx;
        break;
      }
    }

    if (matchedIndex === null) {
      return false;
    }

    availableIndices.delete(matchedIndex);
  }

  return availableIndices.size === 0;
}

export async function POST(req: NextRequest) {
  // 1. Request payload size safeguard (50KB limit)
  const sizeError = validateRequestSize(req);
  if (sizeError) {
    return NextResponse.json({ error: sizeError }, { status: 413 });
  }

  try {
    // 2. Authenticate caller using verified Supabase session token
    const { user, error: authError } = await authenticateServerRequest(req);
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Authentication required" },
        { status: 401 }
      );
    }

    // 3. Parse JSON request body safely
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request payload must be a JSON object" },
        { status: 400 }
      );
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      customer,
    } = body;

    // 4. Validate required payment identifiers
    if (!razorpay_order_id || typeof razorpay_order_id !== "string" || !razorpay_order_id.startsWith("order_")) {
      return NextResponse.json({ error: "Invalid or missing razorpay_order_id" }, { status: 400 });
    }
    if (!razorpay_payment_id || typeof razorpay_payment_id !== "string" || !razorpay_payment_id.startsWith("pay_")) {
      return NextResponse.json({ error: "Invalid or missing razorpay_payment_id" }, { status: 400 });
    }
    if (!razorpay_signature || typeof razorpay_signature !== "string" || razorpay_signature.length < 32) {
      return NextResponse.json({ error: "Invalid or missing razorpay_signature" }, { status: 400 });
    }

    // 5. Validate customer details server-side
    const { error: customerError, customer: sanitizedCustomer } = validateCustomer(customer);
    if (customerError || !sanitizedCustomer) {
      return NextResponse.json({ error: customerError || "Invalid customer details" }, { status: 400 });
    }

    // 6. Validate and normalize cart items against catalogue inventory
    const {
      error: cartError,
      calculatedTotal,
      normalizedItems,
    } = validateAndNormalizeCart(items);

    if (cartError || calculatedTotal <= 0 || normalizedItems.length === 0) {
      return NextResponse.json(
        { error: cartError || "Invalid cart contents" },
        { status: 400 }
      );
    }

    // 7. Compute deterministic fingerprint of current cart items
    const currentFingerprint = computeOrderFingerprint(normalizedItems);

    // 8. Timing-safe HMAC-SHA256 signature verification
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error("RAZORPAY_KEY_SECRET is not configured on server");
      return NextResponse.json({ error: "Payment gateway configuration error on server" }, { status: 500 });
    }

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    const sigBuffer = Buffer.from(razorpay_signature, "utf8");
    const genBuffer = Buffer.from(generatedSignature, "utf8");

    if (sigBuffer.length !== genBuffer.length || !crypto.timingSafeEqual(sigBuffer, genBuffer)) {
      console.error("Payment signature mismatch for payment ID:", razorpay_payment_id);
      return NextResponse.json(
        { error: "Payment verification failed: invalid signature" },
        { status: 400 }
      );
    }

    // 9. Initialize Razorpay client
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const razorpay = new Razorpay({
      key_id: keyId!,
      key_secret: secret,
    });

    // 10. Authoritative Razorpay Order Verification (Ownership & Cart Binding)
    interface RazorpayOrderData {
      id: string;
      notes?: {
        userId?: string;
        itemsFingerprint?: string;
      };
    }
    let rzpOrder: RazorpayOrderData | null = null;
    try {
      rzpOrder = (await razorpay.orders.fetch(razorpay_order_id as string)) as RazorpayOrderData;
    } catch (orderFetchErr: unknown) {
      const errMsg = orderFetchErr instanceof Error ? orderFetchErr.message : "Fetch error";
      console.error("Failed to fetch Razorpay order:", { orderId: razorpay_order_id, error: errMsg });
      return NextResponse.json({ error: "Could not retrieve order details from payment gateway" }, { status: 400 });
    }

    if (!rzpOrder) {
      return NextResponse.json({ error: "Order record not found on payment gateway" }, { status: 400 });
    }

    // Verify ownership: order notes MUST match authenticated user id
    if (!rzpOrder.notes?.userId || rzpOrder.notes.userId !== user.id) {
      console.warn("Payment ownership mismatch detected:", {
        orderUserId: rzpOrder.notes?.userId,
        authenticatedUserId: user.id,
        orderId: razorpay_order_id,
      });
      return NextResponse.json(
        { error: "Access denied: payment order does not belong to the authenticated user" },
        { status: 403 }
      );
    }

    // Verify item fingerprint: submitted cart MUST match exact items bound to Razorpay order
    if (!rzpOrder.notes?.itemsFingerprint || rzpOrder.notes.itemsFingerprint !== currentFingerprint) {
      console.warn("Cart fingerprint mismatch detected:", {
        orderFingerprint: rzpOrder.notes?.itemsFingerprint,
        submittedFingerprint: currentFingerprint,
        orderId: razorpay_order_id,
      });
      return NextResponse.json(
        { error: "Cart contents mismatch: submitted items do not match the authorized payment order" },
        { status: 400 }
      );
    }

    // 11. Authoritative Razorpay Payment Verification
    interface RazorpayPaymentData {
      id: string;
      order_id?: string;
      amount?: number | string;
      currency?: string;
      status?: string;
    }
    let payment: RazorpayPaymentData | null = null;
    try {
      payment = (await razorpay.payments.fetch(razorpay_payment_id as string)) as RazorpayPaymentData;
    } catch (payFetchErr: unknown) {
      const errMsg = payFetchErr instanceof Error ? payFetchErr.message : "Fetch error";
      console.error("Failed to fetch Razorpay payment:", { paymentId: razorpay_payment_id, error: errMsg });
      return NextResponse.json({ error: "Could not retrieve payment details from gateway" }, { status: 400 });
    }

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found on payment gateway" }, { status: 400 });
    }

    if (payment.order_id !== razorpay_order_id) {
      return NextResponse.json(
        { error: "Payment does not correspond to the specified Razorpay order ID" },
        { status: 400 }
      );
    }

    if (payment.currency !== "INR") {
      return NextResponse.json(
        { error: "Invalid payment currency. Expected INR." },
        { status: 400 }
      );
    }

    const expectedAmountPaise = Math.round(calculatedTotal * 100);
    if (Number(payment.amount) !== expectedAmountPaise) {
      return NextResponse.json(
        { error: "Payment amount does not match verified catalogue total" },
        { status: 400 }
      );
    }

    // Verify captured payment state: do not treat authorized payments as paid without capturing
    if (payment.status === "authorized") {
      try {
        payment = (await razorpay.payments.capture(razorpay_payment_id as string, Number(payment.amount), "INR")) as RazorpayPaymentData;
      } catch (captureErr: unknown) {
        const errMsg = captureErr instanceof Error ? captureErr.message : "Capture error";
        console.error("Failed to capture authorized payment:", { paymentId: razorpay_payment_id, error: errMsg });
        return NextResponse.json(
          { error: "Payment authorization could not be captured by gateway" },
          { status: 400 }
        );
      }
    }

    if (payment.status !== "captured") {
      return NextResponse.json(
        { error: `Payment is not in captured status (current status: ${payment.status})` },
        { status: 400 }
      );
    }

    // 12. Idempotency Check: Prevent duplicate order insertion & verify caller ownership
    const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
      .from("orders")
      .select("id, order_ref, total, payment_id, razorpay_payment_id, user_id")
      .or(`payment_id.eq.${razorpay_payment_id},razorpay_payment_id.eq.${razorpay_payment_id}`)
      .maybeSingle();

    if (existingOrderError) {
      console.error("Database query error during idempotency check:", existingOrderError);
      return NextResponse.json(
        { error: "Database error verifying order status. Please retry." },
        { status: 500 }
      );
    }

    if (existingOrder) {
      // SECURITY CHECK: Verify the existing order belongs to the authenticated user
      if (existingOrder.user_id !== user.id) {
        console.warn("Unauthorized access attempt to existing order:", {
          existingOrderUserId: existingOrder.user_id,
          callingUserId: user.id,
          paymentId: razorpay_payment_id,
        });
        return NextResponse.json(
          { error: "Access denied: payment reference is associated with another account" },
          { status: 403 }
        );
      }

      // Query existing order_items to verify complete line-item consistency
      const { data: existingItems, error: itemsQueryError } = await supabaseAdmin
        .from("order_items")
        .select("id, artwork_id, artist_id, quantity, price_at_purchase, artwork_title")
        .eq("order_id", existingOrder.id);

      if (itemsQueryError) {
        console.error("Database error querying existing order_items:", itemsQueryError);
        return NextResponse.json(
          { error: "Database error querying order items on retry. Please retry." },
          { status: 500 }
        );
      }

      // Check item consistency:
      const hasExistingItems = existingItems && existingItems.length > 0;
      if (hasExistingItems) {
        // Validate full item set: count, quantities, prices, titles, and artwork identity using multiset bijection
        const isMatch = validateLineItemMultiset(existingItems, normalizedItems);

        if (!isMatch) {
          console.error("Existing order has conflicting or incomplete line items:", {
            existingCount: existingItems.length,
            expectedCount: normalizedItems.length,
            existingOrderId: existingOrder.id,
          });
          return NextResponse.json(
            {
              error: "Existing order has conflicting or incomplete line items. Manual reconciliation required.",
              paymentId: razorpay_payment_id,
              requiresSupport: true,
            },
            { status: 409 }
          );
        }

        // Existing order and all line items are complete and verified!
        return NextResponse.json({
          success: true,
          orderId: existingOrder.order_ref,
          total: existingOrder.total,
          paymentId: razorpay_payment_id,
          alreadyProcessed: true,
        });
      }

      // If existingItems has 0 rows (e.g. from prior interrupted write or webhook header-only insert):
      // DO NOT perform a non-atomic sequential insert in TypeScript (which risks duplicate items on concurrent callbacks).
      // Fall through to Step 13 where create_checkout_order_atomic transactionally backfills line items with ACID atomicity.
      console.warn("Existing order header found with 0 line items. Delegating atomic backfill to create_checkout_order_atomic RPC:", {
        orderId: existingOrder.id,
        paymentId: razorpay_payment_id,
      });
    }

    // 13. Server-side atomic order persistence using Supabase Service Role client
    const orderRef = `KS${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
    const enrichedItems = normalizedItems.map((item) => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      pricing: {
        amount: item.price,
        currency: "INR",
      },
      image: item.image,
    }));

    // Pre-build authoritative line item rows
    const lineItemRowsForRpc = await buildAuthoritativeOrderItemRows("", normalizedItems);
    const rpcOrderItems = lineItemRowsForRpc.map((r) => ({
      artwork_id: r.artwork_id,
      artist_id: r.artist_id,
      quantity: r.quantity,
      price_at_purchase: r.price_at_purchase,
      artwork_title: r.artwork_title,
      artwork_image: r.artwork_image,
    }));

    // Atomic Transactional Persistence via create_checkout_order_atomic RPC
    let rpcResult: unknown = null;
    let rpcErr: { code?: string; message?: string } | null = null;

    try {
      const res = await supabaseAdmin.rpc("create_checkout_order_atomic", {
        p_user_id: user.id,
        p_order_ref: orderRef,
        p_total: calculatedTotal,
        p_items_json: enrichedItems as unknown as Json,
        p_payment_id: razorpay_payment_id,
        p_razorpay_order_id: razorpay_order_id,
        p_razorpay_payment_id: razorpay_payment_id,
        p_customer_name: sanitizedCustomer.name,
        p_customer_phone: sanitizedCustomer.phone,
        p_customer_address: sanitizedCustomer.address,
        p_order_items: rpcOrderItems as unknown as Json,
      });
      rpcResult = res.data;
      rpcErr = res.error as { code?: string; message?: string } | null;
    } catch (networkErr: unknown) {
      rpcErr = {
        code: "NETWORK_EXCEPTION",
        message: networkErr instanceof Error ? networkErr.message : "Network error during RPC invocation",
      };
    }

    // Handle RPC response
    if (rpcErr) {
      // 1. Authorization denial: caller attempting cross-user order creation
      if (rpcErr.code === "42501") {
        return NextResponse.json(
          { error: "Access denied: payment reference is associated with another account" },
          { status: 403 }
        );
      }

      // 2. Data validation or line-item conflict from database
      if (rpcErr.code === "22000") {
        return NextResponse.json(
          { error: rpcErr.message || "Order persistence rejected due to data validation error" },
          { status: 409 }
        );
      }

      // 3. RPC uninstalled or missing in database environment (Fail-Closed)
      const isRpcMissing =
        rpcErr.code === "PGRST202" ||
        rpcErr.code === "42883" ||
        (rpcErr.message && rpcErr.message.toLowerCase().includes("could not find"));

      if (isRpcMissing) {
        console.error("CRITICAL: create_checkout_order_atomic RPC is not installed in database:", rpcErr);
        return NextResponse.json(
          {
            error: `Order persistence is temporarily unavailable: atomic checkout migration has not been installed. Payment has been captured (Reference ID: ${razorpay_payment_id}). Please contact support for assistance.`,
            paymentId: razorpay_payment_id,
            code: "RPC_NOT_INSTALLED",
            requiresSupport: true,
          },
          { status: 503 }
        );
      }

      // 4. Ambiguous outcome / Network drop: Check if the transaction actually committed before reporting error
      try {
        const { data: committedOrder, error: checkErr } = await supabaseAdmin
          .from("orders")
          .select("id, order_ref, total, payment_id, user_id")
          .eq("payment_id", razorpay_payment_id)
          .maybeSingle();

        if (checkErr) {
          console.error("Database query error checking committed order during recovery:", checkErr);
        } else if (committedOrder) {
          if (committedOrder.user_id !== user.id) {
            console.warn("Ambiguous recovery detected cross-user order ownership mismatch:", {
              orderUserId: committedOrder.user_id,
              callingUserId: user.id,
              paymentId: razorpay_payment_id,
            });
            return NextResponse.json(
              { error: "Access denied: payment reference is associated with another account" },
              { status: 403 }
            );
          }

          const { data: commItems, error: commItemsErr } = await supabaseAdmin
            .from("order_items")
            .select("id, artwork_id, quantity, artwork_title, price_at_purchase")
            .eq("order_id", committedOrder.id);

          if (commItemsErr) {
            console.error("Database error querying order_items during ambiguous recovery:", commItemsErr);
          } else if (commItems && validateLineItemMultiset(commItems, normalizedItems)) {
            return NextResponse.json({
              success: true,
              orderId: committedOrder.order_ref,
              total: committedOrder.total,
              paymentId: razorpay_payment_id,
              alreadyProcessed: true,
            });
          } else {
            console.error("Ambiguous recovery detected line-item conflict on committed order:", {
              orderId: committedOrder.id,
              commItemsCount: commItems?.length,
              expectedCount: normalizedItems.length,
            });
            return NextResponse.json(
              {
                error: "Your payment was processed, but the saved order items conflict with your cart. Support assistance is required.",
                paymentId: razorpay_payment_id,
                requiresSupport: true,
              },
              { status: 409 }
            );
          }
        }
      } catch (ambiguousCheckErr) {
        console.warn("Failed to check committed state after ambiguous RPC error:", ambiguousCheckErr);
      }

      console.error("CRITICAL: Payment succeeded at gateway, but database persistence failed:", {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        userId: user.id,
        error: rpcErr,
      });

      return NextResponse.json(
        {
          success: false,
          error: `Your payment was successfully completed (Reference ID: ${razorpay_payment_id}), but our database could not confirm the order. Please DO NOT pay again. Contact support at support@kalasetu.art or +91 85228 47389 with this Reference ID.`,
          paymentId: razorpay_payment_id,
          requiresSupport: true,
        },
        { status: 500 }
      );
    }

    if (rpcResult && typeof rpcResult === "object") {
      const res = rpcResult as Record<string, unknown>;
      if (res.success) {
        return NextResponse.json({
          success: true,
          orderId: (res.order_ref as string) || orderRef,
          total: calculatedTotal,
          paymentId: razorpay_payment_id,
          ...(res.already_processed ? { alreadyProcessed: true } : {}),
        });
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: `Your payment was completed (Reference ID: ${razorpay_payment_id}), but order confirmation failed. Please contact support.`,
        paymentId: razorpay_payment_id,
        requiresSupport: true,
      },
      { status: 500 }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Unhandled error in payment verification:", {
      message: errMsg,
    });
    return NextResponse.json(
      { error: "An unexpected error occurred during payment verification. Please contact support." },
      { status: 500 }
    );
  }
}
