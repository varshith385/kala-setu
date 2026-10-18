import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, authenticateServerRequest, isAuthorizedAdmin } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/reconciliation
 *
 * Lists all orders currently requiring manual payment reconciliation.
 *
 * Security & Access Control:
 * 1. Cryptographically validates Supabase Bearer token via authenticateServerRequest.
 * 2. Checks authoritative admin privilege via isAuthorizedAdmin (database role, server config).
 * 3. Ordinary buyers and artists are rejected with HTTP 403 Forbidden.
 * 4. Never exposes database service role credentials or internal server traces.
 */
export async function GET(req: NextRequest) {
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

    // 3. Fetch Paid Orders Pending Reconciliation
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_ref, total, status, payment_status, payment_id, razorpay_payment_id, razorpay_order_id, customer_name, customer_phone, customer_address, items, user_id, created_at, updated_at"
      )
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("[Admin Reconciliation] Database fetch error:", ordersError.message);
      return NextResponse.json(
        { error: "Database error retrieving reconciliation orders" },
        { status: 500 }
      );
    }

    // 4. Filter for orders carrying the reconciliation_required flag
    const reconciliationRecords = (orders || [])
      .filter((o) => {
        const items = o.items as unknown;
        return (
          Array.isArray(items) &&
          items.some(
            (it: unknown) =>
              it && typeof it === "object" && (it as Record<string, unknown>).reconciliation_required === true
          )
        );
      })
      .map((o) => {
        const items = o.items as unknown as Array<Record<string, unknown>>;
        const reconItem = items.find((it) => it?.reconciliation_required === true) || {};

        return {
          id: o.id,
          orderRef: o.order_ref,
          userId: o.user_id,
          total: o.total,
          status: o.status,
          paymentStatus: o.payment_status,
          paymentId: o.razorpay_payment_id || o.payment_id,
          razorpayOrderId: o.razorpay_order_id,
          customerName: o.customer_name || "Guest Customer",
          customerPhone: o.customer_phone || "Not provided",
          customerAddress: o.customer_address || "Not provided",
          createdAt: o.created_at,
          reconciliationData: {
            title: (reconItem.title as string) || "Captured Payment — Items Pending Manual Reconciliation",
            reason: (reconItem.reason as string) || "Manual inventory reconciliation required",
            chargedAmountPaise:
              (reconItem.charged_amount_paise as number) || Math.round(Number(o.total) * 100),
            reconstructedSum: (reconItem.reconstructed_sum as number) || 0,
            itemsToken: (reconItem.items_token as string) || null,
          },
        };
      });

    return NextResponse.json({
      orders: reconciliationRecords,
      totalCount: reconciliationRecords.length,
      mode: "staging",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Admin Reconciliation] Unexpected server exception:", message);
    return NextResponse.json(
      { error: "Internal server error during reconciliation query" },
      { status: 500 }
    );
  }
}
