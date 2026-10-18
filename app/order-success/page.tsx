"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function OrderContent() {
  const searchParams = useSearchParams();

  const orderId = searchParams.get("orderId");
  const total = searchParams.get("total");

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-16">
      <div className="text-center max-w-lg bg-neutral-900 border border-yellow-600/40 rounded-2xl p-8 md:p-12 shadow-2xl">
        <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/30 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl text-yellow-400">
          ✓
        </div>

        <p className="text-xs uppercase tracking-widest text-yellow-500 font-semibold mb-2">
          Payment Verified & Recorded
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-white mb-4">
          Order Confirmed 🎉
        </h1>

        <p className="text-gray-300 text-sm leading-relaxed mb-6">
          Thank you for supporting authentic Indian artists through Kala Setu. Your acquisition has been reserved and secured.
        </p>

        <div className="border border-yellow-600/20 bg-black/50 rounded-xl p-4 text-left text-sm mb-6 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs">Order Reference:</span>
            <span className="text-yellow-400 font-mono font-medium">{orderId || "Confirmed"}</span>
          </div>
          {total && (
            <div className="flex justify-between items-center border-t border-yellow-600/10 pt-2">
              <span className="text-gray-400 text-xs">Total Amount Paid:</span>
              <span className="text-white font-bold text-base">₹{Number(total).toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="flex justify-between items-center border-t border-yellow-600/10 pt-2">
            <span className="text-gray-400 text-xs">Fulfillment Status:</span>
            <span className="text-green-400 text-xs font-medium">Order Received & Sent to Artist</span>
          </div>
        </div>

        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3.5 mb-8 text-xs text-gray-300 text-left">
          <p className="text-yellow-400 font-medium mb-1">Direct Artist Fulfillment:</p>
          <p className="text-gray-400">
            The artist has been notified of your order and will carefully prepare your artwork for dispatch. You can track this acquisition on your Orders page.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/orders"
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-lg font-bold text-sm transition shadow-[0_0_15px_rgba(234,179,8,0.3)]"
          >
            View My Orders →
          </Link>
          <Link
            href="/explore"
            className="border border-yellow-600/50 hover:bg-yellow-500/10 text-yellow-400 px-6 py-3 rounded-lg font-semibold text-sm transition"
          >
            Continue Exploring
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center p-10">Loading confirmation...</div>}>
      <OrderContent />
    </Suspense>
  );
}