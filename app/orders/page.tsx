"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

type Order = {
  id: string;
  order_ref: string;
  items: any[];
  total: number;
  customer_name: string;
  payment_id: string;
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
        <p className="text-gray-400">Loading your orders...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 md:px-16 py-20">
      <h1 className="font-display text-4xl text-yellow-500 mb-12">
        My Orders
      </h1>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 mb-6">You haven't placed any orders yet.</p>
          <Link
            href="/explore"
            className="inline-block border border-yellow-600 text-yellow-500 px-8 py-3 hover:bg-yellow-600 hover:text-black transition duration-500"
          >
            Explore Collection →
          </Link>
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-neutral-900 border border-yellow-600/30 rounded-xl p-6"
            >
              <div className="flex flex-wrap justify-between items-start gap-4 mb-4 pb-4 border-b border-yellow-600/20">
                <div>
                  <p className="text-yellow-400 font-medium">
                    Order #{order.order_ref}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {new Date(order.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <p className="text-white font-semibold text-lg">
                  ₹ {order.total.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="space-y-2 mb-4">
                {order.items?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between text-sm text-gray-300"
                  >
                    <span>{item.title} × {item.quantity}</span>
                    <span>₹{item.pricing.amount}</span>
                  </div>
                ))}
              </div>

              <p className="text-gray-500 text-xs">
                Payment ID: {order.payment_id}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}