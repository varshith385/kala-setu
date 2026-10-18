"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

type OrderItem = {
  id?: string;
  title: string;
  quantity?: number;
  pricing?: {
    amount: number;
    currency?: string;
  };
  reconciliation_required?: boolean;
  reason?: string;
};

type Order = {
  id: string;
  order_ref: string;
  items: OrderItem[];
  total: number;
  customer_name?: string;
  payment_id?: string;
  razorpay_payment_id?: string;
  status?: string;
  payment_status?: string;
  created_at: string;
};

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrders(data as Order[]);
      }

      setLoading(false);
    };

    fetchOrders();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Loading your collector orders...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 md:px-16 py-12 md:py-20">
      <div className="max-w-4xl mx-auto">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-gray-400 flex items-center gap-2">
          <Link href="/" className="hover:text-yellow-500 transition">Home</Link>
          <span>/</span>
          <span className="text-yellow-500">My Orders</span>
        </nav>

        <div className="flex items-center justify-between mb-8 md:mb-12 border-b border-yellow-600/20 pb-6">
          <div>
            <h1 className="font-display text-3xl md:text-5xl text-yellow-500">
              My Orders & Acquisitions
            </h1>
            <p className="text-gray-400 text-xs md:text-sm mt-1">
              Verified records of your original artworks and digital licenses
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/account"
              className="border border-yellow-600/40 text-yellow-400 hover:bg-yellow-500/10 px-3.5 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
            >
              <span>🏛️</span>
              <span>Collector Vault</span>
            </Link>
            <Link
              href="/explore"
              className="hidden sm:inline-block border border-yellow-600/50 text-yellow-400 hover:bg-yellow-500/10 px-4 py-2 rounded-lg text-xs font-medium transition"
            >
              Explore Art →
            </Link>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900 border border-yellow-600/30 rounded-2xl p-8">
            <p className="text-4xl mb-4">🖼️</p>
            <h2 className="font-display text-xl text-white mb-2">No Acquisitions Yet</h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
              When you purchase an artwork on Kala Setu, your order status, payment receipt, and artist dispatch updates will appear here.
            </p>
            <Link
              href="/explore"
              className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-lg font-bold text-sm transition"
            >
              Explore Collection →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const displayPaymentId = order.razorpay_payment_id || order.payment_id || "Recorded";
              const isPaid = order.payment_status === "paid" || order.status === "Paid";
              const hasReconciliation = order.items && order.items.some((it) => it.reconciliation_required);

              return (
                <div
                  key={order.id}
                  className="bg-neutral-900 border border-yellow-600/30 rounded-2xl p-6 md:p-8"
                >
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-5 pb-5 border-b border-yellow-600/15">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-yellow-400 font-display text-lg">
                          Order #{order.order_ref}
                        </p>
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                            hasReconciliation
                              ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                              : isPaid
                              ? "bg-green-950/60 border-green-500/40 text-green-400"
                              : "bg-yellow-950/60 border-yellow-500/40 text-yellow-400"
                          }`}
                        >
                          {hasReconciliation
                            ? "⚠️ Verification in Progress"
                            : isPaid
                            ? "✓ Paid & Confirmed"
                            : order.status || "Processing"}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs">
                        Placed on{" "}
                        {new Date(order.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-400">Total Paid</p>
                      <p className="text-white font-bold text-xl md:text-2xl">
                        ₹ {Number(order.total).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* ORDER ITEMS LIST */}
                  <div className="space-y-3 mb-6">
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Artworks Included:</p>
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => {
                        const isReconItem = item.reconciliation_required;
                        return (
                          <div
                            key={idx}
                            className={`flex justify-between items-center text-sm py-2 px-3 rounded-lg border ${
                              isReconItem
                                ? "bg-amber-950/30 border-amber-500/30"
                                : "bg-black/40 border border-yellow-600/10"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={isReconItem ? "text-amber-400 font-medium" : "text-yellow-500 font-medium"}>
                                {isReconItem ? "⚠️" : "●"}
                              </span>
                              <span className="text-gray-200 font-medium">
                                {item.title || "Order item"}
                              </span>
                              {item.quantity && <span className="text-gray-500 text-xs">× {item.quantity}</span>}
                            </div>
                            <span className={isReconItem ? "text-amber-300 text-xs font-semibold" : "text-gray-300 font-semibold"}>
                              {isReconItem
                                ? "Manual Verification"
                                : `₹ ${(item.pricing?.amount ? item.pricing.amount * (item.quantity || 1) : 0).toLocaleString("en-IN")}`}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-gray-500 italic">No line items detailed.</p>
                    )}
                  </div>

                  {/* FOOTER DETAILS & ASSURANCE */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-yellow-600/10 text-xs text-gray-400">
                    <div className="flex flex-wrap items-center gap-4">
                      <span>
                        <strong className="text-gray-300">Gateway Ref:</strong> {displayPaymentId}
                      </span>
                      <span>
                        <strong className="text-gray-300">Fulfillment:</strong>{" "}
                        {hasReconciliation ? "Pending Manual Verification" : "Direct Artist Dispatch"}
                      </span>
                    </div>
                    <span className="text-yellow-500/80">
                      {hasReconciliation ? "Verification Ticket Assigned" : "Original Studio Work"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}