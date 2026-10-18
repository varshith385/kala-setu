import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, authenticateServerRequest, isAuthorizedAdmin } from "@/app/lib/supabaseServer";
import { executeAtomicReconciliation } from "@/app/lib/reconciliationEngine";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reconciliation/resolve
 *
 * Resolves an unreconciled captured payment order by binding authentic catalogue artwork items
 * matching the exact captured monetary total.
 *
 * Safety & Security Guarantees:
 * 1. Requires valid Supabase Bearer token and authoritative administrator verification via isAuthorizedAdmin.
 * 2. Enforces test isolation safeguards if x-test-isolation-tag header is present.
 * 3. Enforces that the order is currently pending reconciliation and payment was captured.
 * 4. Strictly validates submitted items against the authoritative catalogue (stock limits, active sales).
 * 5. Requires item sum to match the captured order total down to the rupee (ZERO fabrication).
 * 6. Strictly executes atomic database RPC (resolve_reconciliation_order_atomic); fails closed without multi-request fallback.
 * 7. Transitions status to 'Processing' (reconciled and confirmed; separate from 'Shipped' / 'Delivered').
 * 8. Prevents duplicate resolution attempts (HTTP 409 Conflict).
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authoritative Session Authentication
    const { user, error: authError } = await authenticateServerRequest(req);
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required to access administrator resources" },
        { status: 401 }
      );
    }

    // 2. Authoritative Administrator Verification
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!isAuthorizedAdmin(user, profile?.role)) {
      return NextResponse.json(
        { error: "Access denied: Administrator privileges required" },
        { status: 403 }
      );
    }

    // 3. Parse and Validate Request Payload
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Malformed request payload: JSON parsing failed" },
        { status: 400 }
      );
    }

    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
    const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim() : "";
    const razorpayOrderId = typeof body.razorpayOrderId === "string" ? body.razorpayOrderId.trim() : null;
    const resolvedItems = body.resolvedItems;
    const testIsolationTag = req.headers.get("x-test-isolation-tag") || req.headers.get("x-test-run-id");

    // 4. Delegate to Atomic Reconciliation Engine
    const result = await executeAtomicReconciliation(supabaseAdmin, {
      orderId,
      paymentId,
      razorpayOrderId,
      resolvedItems: Array.isArray(resolvedItems) ? resolvedItems : [],
      adminUserId: user.id,
      testIsolationTag,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Admin Resolve] Unexpected server exception:", message);
    return NextResponse.json(
      { error: "Internal server error during payment reconciliation" },
      { status: 500 }
    );
  }
}
