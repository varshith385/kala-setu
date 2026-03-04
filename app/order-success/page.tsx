"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function OrderSuccessPage() {
  const params = useSearchParams();

  const orderId = params.get("orderId");
  const total = params.get("total");

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">

      <div className="max-w-xl text-center">

        <h1 className="text-4xl font-bold text-yellow-500 mb-6">
          Order Confirmed 🎉
        </h1>

        <p className="text-gray-400 mb-4">
          Thank you for purchasing from Kala Setu.
        </p>

        <p className="text-lg mb-2">
          Order ID:
          <span className="text-yellow-500 ml-2">
            {orderId}
          </span>
        </p>

        <p className="text-lg mb-8">
          Total Paid:
          <span className="text-yellow-500 ml-2">
            ₹{total}
          </span>
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

    </div>
  );
}