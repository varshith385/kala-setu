import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { authenticateServerRequest } from "@/app/lib/supabaseServer";
import {
  validateCustomer,
  validateAndNormalizeCart,
  computeOrderFingerprint,
  validateRequestSize,
} from "@/app/lib/orderValidation";

export async function POST(req: NextRequest) {
  // 1. Request payload size safeguard (50KB limit)
  const sizeError = validateRequestSize(req);
  if (sizeError) {
    return NextResponse.json({ error: sizeError }, { status: 413 });
  }

  try {
    // 2. Authenticate caller with Supabase token — never trust client-supplied user_id
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

    const { items, customer } = body;

    // 4. Validate customer fields server-side with length & format bounds
    const { error: customerError, customer: sanitizedCustomer } = validateCustomer(customer);
    if (customerError || !sanitizedCustomer) {
      return NextResponse.json(
        { error: customerError || "Invalid customer details" },
        { status: 400 }
      );
    }

    // 5. Validate, aggregate, and normalize cart items against catalogue inventory
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

    // 6. Compute deterministic fingerprint binding the exact items & quantities
    const itemsFingerprint = computeOrderFingerprint(normalizedItems);

    // 7. Verify Razorpay credentials
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Razorpay environment configuration missing on server");
      return NextResponse.json(
        { error: "Payment gateway configuration error on server" },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // 8. Create Razorpay order with server-calculated amount and cryptographic bindings
    const receiptId = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(calculatedTotal * 100), // Razorpay requires paise
      currency: "INR",
      receipt: receiptId,
      notes: {
        userId: user.id,
        itemsFingerprint: itemsFingerprint,
        itemCount: normalizedItems.length.toString(),
        customerName: sanitizedCustomer.name.slice(0, 40),
        customerPhone: sanitizedCustomer.phone.slice(0, 20),
        customerAddress: sanitizedCustomer.address.slice(0, 200),
        itemsCompact: normalizedItems.map((i) => `${i.id}:${i.quantity}`).join(",").slice(0, 250),
        itemsJson: JSON.stringify(
          normalizedItems.map((i) => ({ id: i.id, q: i.quantity, p: i.price, t: i.title }))
        ).slice(0, 250),
      },
    });

    return NextResponse.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      total: calculatedTotal,
      items: normalizedItems,
    });
  } catch (error: unknown) {
    // Log diagnostics privately without exposing internal traces or headers
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to initialize payment order:", {
      message,
    });
    return NextResponse.json(
      { error: "Failed to initialize payment order. Please try again." },
      { status: 500 }
    );
  }
}