import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/app/lib/supabaseServer";
import { artworks } from "@/app/data/artworks";

export const dynamic = "force-dynamic";

interface RazorpayWebhookPayload {
  entity?: string;
  account_id?: string;
  event: string;
  contains?: string[];
  payload?: {
    payment?: {
      entity?: {
        id: string;
        entity: string;
        amount: number;
        currency: string;
        status: string;
        order_id?: string;
        notes?: Record<string, string>;
      };
    };
    order?: {
      entity?: {
        id: string;
        entity: string;
        amount: number;
        amount_paid?: number;
        currency: string;
        status: string;
        notes?: Record<string, string>;
      };
    };
  };
  created_at?: number;
}

/**
 * Razorpay Webhook Handler
 * Endpoint: POST /api/webhooks/razorpay
 *
 * Responsibilities:
 * 1. Verify HMAC-SHA256 signature against the raw request body.
 * 2. Handle payment.captured and order.paid events.
 * 3. Idempotently check whether the Kala Setu order was already saved by /api/verify-payment.
 * 4. Recover and insert the order into public.orders if the client disconnected or failed.
 * 5. Return 200 for processed or duplicate events; 400 for invalid signatures; 500 for transient DB errors.
 */
export async function POST(req: NextRequest) {
  // 1. Read raw body text BEFORE JSON parsing for cryptographic signature verification
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  // 2. Extract and validate signature header
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
  }

  // Strict requirement: Razorpay webhook secret MUST be configured and distinct from API secret
  // Failing closed if unconfigured prevents unauthorized simulated events
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is unconfigured on server. Webhook validation failing closed.");
    return NextResponse.json({ error: "Webhook secret is unconfigured on server" }, { status: 500 });
  }

  // 3. Compute expected signature and perform timing-safe comparison
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const sigBuffer = Buffer.from(signature, "utf-8");
  const expBuffer = Buffer.from(expectedSignature, "utf-8");

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  // 4. Parse verified payload
  let eventData: RazorpayWebhookPayload;
  try {
    eventData = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
  }

  const event = eventData.event;

  // 5. Filter for supported payment lifecycle events
  if (event !== "payment.captured" && event !== "order.paid") {
    // Return 200 to acknowledge and ignore unsupported events without triggering provider retries
    return NextResponse.json(
      { status: "ignored", reason: `Unsupported event: ${event}` },
      { status: 200 }
    );
  }

  // 6. Extract payment and order entities
  const paymentEntity = eventData.payload?.payment?.entity;
  const orderEntity = eventData.payload?.order?.entity;

  const paymentId = paymentEntity?.id;
  const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
  const amountPaise = paymentEntity?.amount ?? orderEntity?.amount;
  const currency = paymentEntity?.currency ?? orderEntity?.currency;

  if (!paymentId || !razorpayOrderId || typeof amountPaise !== "number" || amountPaise <= 0) {
    return NextResponse.json(
      { error: "Missing required payment or order identifiers in webhook payload" },
      { status: 400 }
    );
  }

  if (currency !== "INR") {
    return NextResponse.json(
      { error: `Unexpected currency in webhook payload: ${currency}` },
      { status: 400 }
    );
  }

  // Enforce authoritative payment state: never mark order paid if payment is not captured
  if (event === "payment.captured" && paymentEntity?.status !== "captured") {
    return NextResponse.json(
      { error: `Invalid payment status for payment.captured event: ${paymentEntity?.status}` },
      { status: 400 }
    );
  }

  if (event === "order.paid" && orderEntity?.status !== "paid") {
    return NextResponse.json(
      { error: `Invalid order status for order.paid event: ${orderEntity?.status}` },
      { status: 400 }
    );
  }

  try {
    // 7. Extract metadata from server-bound order/payment notes
    const notes = orderEntity?.notes || paymentEntity?.notes || {};
    const userId = notes.userId || null;
    const customerName = notes.customerName || "Customer";
    const customerPhone = notes.customerPhone || "";
    const customerAddress = notes.customerAddress || "";

    // Verify user profile if userId provided
    let verifiedUserId: string | null = null;
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      if (profile) {
        verifiedUserId = profile.id;
      }
    }

    // 8. Check if order was already recorded by /api/verify-payment (Idempotency check)
    const { data: existingOrder, error: queryError } = await supabaseAdmin
      .from("orders")
      .select("id, order_ref, status, payment_status, total, user_id, razorpay_payment_id, payment_id, razorpay_order_id")
      .or(
        `razorpay_payment_id.eq.${paymentId},payment_id.eq.${paymentId},razorpay_order_id.eq.${razorpayOrderId}`
      )
      .maybeSingle();

    if (queryError) {
      console.error("Database query error in Razorpay webhook handler:", queryError.message);
      return NextResponse.json(
        { error: "Database error during idempotency check" },
        { status: 500 }
      );
    }

    if (existingOrder) {
      // Validate payment and user association to avoid treating mismatched payments as matches
      const existingPayment = existingOrder.razorpay_payment_id || existingOrder.payment_id;
      if (existingPayment && existingPayment !== paymentId) {
        console.error("[Razorpay Webhook] Order found by order_id has conflicting payment_id:", {
          existingOrderId: existingOrder.id,
          existingPayment,
          incomingPaymentId: paymentId,
        });
        return NextResponse.json(
          { error: "Conflicting payment identifier for existing order" },
          { status: 409 }
        );
      }

      const incomingUser = verifiedUserId || userId;
      if (incomingUser && existingOrder.user_id && existingOrder.user_id !== incomingUser) {
        console.error("[Razorpay Webhook] Order found but associated with different user_id:", {
          existingOrderId: existingOrder.id,
          existingUserId: existingOrder.user_id,
          incomingUserId: incomingUser,
        });
        return NextResponse.json(
          { error: "Conflicting user association for order" },
          { status: 409 }
        );
      }

      // Order already exists
      if (existingOrder.payment_status === "paid") {
        return NextResponse.json(
          {
            status: "already_processed",
            message: "Order already confirmed and recorded",
            orderId: existingOrder.id,
            orderRef: existingOrder.order_ref,
          },
          { status: 200 }
        );
      }

      // Order exists in pending state; update to paid
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid" as const,
          razorpay_payment_id: paymentId,
          payment_id: paymentId,
        })
        .eq("id", existingOrder.id);

      if (updateError) {
        console.error("Failed to update existing order status to paid:", updateError.message);
        return NextResponse.json(
          { error: "Database error updating order status" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          status: "updated",
          message: "Existing order payment status updated to paid",
          orderId: existingOrder.id,
          orderRef: existingOrder.order_ref,
        },
        { status: 200 }
      );
    }

    const calculatedTotal = Math.round(amountPaise / 100);

    // Reconstruct items from notes: prefer itemsCompact to avoid 256-character note truncation
    let reconstructedItems: Array<{
      id: string;
      title: string;
      quantity: number;
      pricing: { amount: number; currency: string };
    }> = [];

    if (notes.itemsCompact && typeof notes.itemsCompact === "string") {
      try {
        const itemTokens = notes.itemsCompact.split(",");
        for (const token of itemTokens) {
          const [artworkId, qtyStr] = token.split(":");
          if (!artworkId) continue;
          const qty = parseInt(qtyStr, 10);
          const validQty = Number.isInteger(qty) && qty > 0 ? qty : 1;
          const catalogArtwork = artworks.find((a) => a.id === artworkId.trim());

          if (catalogArtwork) {
            const price =
              catalogArtwork.pricing?.isOnSale &&
              typeof catalogArtwork.pricing.discountPercentage === "number" &&
              catalogArtwork.pricing.discountPercentage > 0
                ? Math.round(
                    catalogArtwork.pricing.amount -
                      (catalogArtwork.pricing.amount * catalogArtwork.pricing.discountPercentage) / 100
                  )
                : catalogArtwork.pricing.amount;

            reconstructedItems.push({
              id: catalogArtwork.id,
              title: catalogArtwork.title,
              quantity: validQty,
              pricing: {
                amount: price,
                currency: "INR",
              },
            });
          }
        }
      } catch {
        // Fall back to itemsJson or generic recovery item below
      }
    }

    // Fallback to itemsJson if itemsCompact was not present
    if (reconstructedItems.length === 0 && notes.itemsJson) {
      try {
        const parsed = JSON.parse(notes.itemsJson);
        if (Array.isArray(parsed)) {
          reconstructedItems = parsed.map((item: { id: string; q?: number; p?: number; t?: string }) => {
            const catalogArtwork = artworks.find((a) => a.id === item.id);
            const price = catalogArtwork
              ? catalogArtwork.pricing?.isOnSale &&
                typeof catalogArtwork.pricing.discountPercentage === "number" &&
                catalogArtwork.pricing.discountPercentage > 0
                ? Math.round(
                    catalogArtwork.pricing.amount -
                      (catalogArtwork.pricing.amount * catalogArtwork.pricing.discountPercentage) / 100
                  )
                : catalogArtwork.pricing.amount
              : item.p || 0;

            return {
              id: item.id,
              title: catalogArtwork ? catalogArtwork.title : item.t || "Artwork",
              quantity: typeof item.q === "number" && item.q > 0 ? item.q : 1,
              pricing: {
                amount: price,
                currency: "INR",
              },
            };
          });
        }
      } catch {
        // Fall back to generic recovery item below
      }
    }

    // Critical Webhook Requirement:
    // Never invent or fabricate an order line item to force a webhook's amount to match the payment total.
    // If payment notes, cart reconstruction, or amount validation fails, do not create a misleading completed order.
    // Safely record genuine captured payments with a reconciliation flag so the customer's payment is never lost,
    // and acknowledge receipt to Razorpay (200) to avoid 24-hour retry loops.
    const itemsSum = reconstructedItems.reduce((acc, it) => acc + it.pricing.amount * it.quantity, 0);
    const requiresReconciliation = reconstructedItems.length === 0 || itemsSum !== calculatedTotal;

    const orderRef = `KS${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;

    const itemsToPersist = requiresReconciliation
      ? [
          {
            reconciliation_required: true,
            title: "Captured Payment — Items Pending Manual Reconciliation",
            reason:
              reconstructedItems.length === 0
                ? "Cart items missing or unparseable from payment notes without fabrication"
                : `Item sum (₹${itemsSum}) does not match captured payment amount (₹${calculatedTotal})`,
            charged_amount_paise: amountPaise,
            reconstructed_sum: itemsSum,
            items_token:
              typeof notes.itemsCompact === "string" ? notes.itemsCompact.slice(0, 100) : null,
          },
        ]
      : reconstructedItems;

    const { data: insertedOrder, error: insertError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: verifiedUserId,
        order_ref: orderRef,
        items: itemsToPersist,
        total: calculatedTotal,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        payment_id: paymentId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: paymentId,
        status: "Pending" as const, // Never marked completed/confirmed
        payment_status: "paid" as const, // Genuine captured payment verified by gateway signature
      })
      .select("id, order_ref, total, payment_id, user_id")
      .single();

    if (insertError) {
      const errObj = insertError as { code?: string };
      if (errObj?.code === "23505") {
        // Database error 23505 is only treated as a duplicate after checking
        // the existing record's identity and payment association.
        const { data: conflictOrder, error: conflictErr } = await supabaseAdmin
          .from("orders")
          .select("id, order_ref, user_id, razorpay_order_id, razorpay_payment_id, payment_id")
          .or(`razorpay_payment_id.eq.${paymentId},payment_id.eq.${paymentId}`)
          .maybeSingle();

        if (conflictErr) {
          console.error("Failed to inspect 23505 conflicting record:", conflictErr.message);
          return NextResponse.json(
            { error: "Database error verifying duplicate record" },
            { status: 500 } // retryable error for gateway
          );
        }

        if (conflictOrder) {
          const paymentMatches =
            conflictOrder.razorpay_payment_id === paymentId ||
            conflictOrder.payment_id === paymentId;

          const orderMatches =
            !conflictOrder.razorpay_order_id ||
            !razorpayOrderId ||
            conflictOrder.razorpay_order_id === razorpayOrderId;

          const incomingUser = verifiedUserId || userId;
          const userMatches =
            !incomingUser ||
            !conflictOrder.user_id ||
            conflictOrder.user_id === incomingUser;

          if (paymentMatches && orderMatches && userMatches) {
            return NextResponse.json(
              {
                status: "already_processed",
                message: "Order was inserted concurrently by identical payment",
                orderId: conflictOrder.id,
                orderRef: conflictOrder.order_ref,
              },
              { status: 200 }
            );
          } else {
            console.error("[Razorpay Webhook] Duplicate 23505 conflict anomaly detected:", {
              paymentId,
              incomingRazorpayOrderId: razorpayOrderId,
              incomingUserId: verifiedUserId,
              conflictOrder,
            });
            return NextResponse.json(
              {
                error: "Unique violation conflict: payment ID or reference mismatch with existing record",
              },
              { status: 409 }
            );
          }
        }

        // If 23505 was not from payment_id (e.g. unexpected order_ref collision), return 500 retryable error
        console.error(
          "[Razorpay Webhook] 23505 occurred but no matching payment_id record found (possible order_ref collision)"
        );
        return NextResponse.json(
          { error: "Database unique violation on non-payment constraint. Retryable." },
          { status: 500 }
        );
      }

      console.error("Failed to insert recovered/reconciled order in webhook:", insertError.message);
      return NextResponse.json(
        { error: "Database insertion failure during order recovery" },
        { status: 500 }
      );
    }

    if (requiresReconciliation) {
      console.warn("[Razorpay Webhook] Captured payment safely recorded with reconciliation flag:", {
        orderId: insertedOrder?.id,
        orderRef: insertedOrder?.order_ref,
        paymentId,
        chargedTotal: calculatedTotal,
      });
      return NextResponse.json(
        {
          status: "reconciliation_recorded",
          message: "Payment safely recorded in database; line items require manual reconciliation",
          orderId: insertedOrder?.id,
          orderRef: insertedOrder?.order_ref,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        status: "recovered",
        message: "Order successfully recovered and recorded",
        orderId: insertedOrder?.id,
        orderRef: insertedOrder?.order_ref,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Unhandled error in Razorpay webhook handler:", message);
    return NextResponse.json(
      { error: "Internal webhook processing error" },
      { status: 500 }
    );
  }
}
