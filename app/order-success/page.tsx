"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function OrderContent() {
  const searchParams = useSearchParams();

  const orderId = searchParams.get("orderId");
  const total = searchParams.get("total");

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="text-center max-w-lg">

        <h1 className="text-4xl text-yellow-500 mb-6">
          Order Confirmed 🎉
        </h1>

        <p className="text-gray-400 mb-6">
          Thank you for purchasing from Kala Setu.
        </p>

        <p className="mb-2">
          Order ID: <span className="text-yellow-500">{orderId}</span>
        </p>

        <p className="mb-8">
          Total Paid: <span className="text-yellow-500">₹{total}</span>
        </p>

        <p className="text-gray-400 mb-10">
          The artist will contact you shortly regarding your artwork.
        </p>

        <Link
          href="/explore"
          className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 font-semibold transition"
        >
          Continue Exploring
        </Link>

      </div>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
      <OrderContent />
    </Suspense>
  );
}