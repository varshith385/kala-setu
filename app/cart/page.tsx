"use client";

import { useCart } from "../context/CartContext";
import Link from "next/link";

export default function CartPage() {
  const cartContext = useCart();

  if (!cartContext) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        Loading cart...
      </div>
    );
  }

  const { cart, increaseQty, decreaseQty, removeFromCart } = cartContext;

  const safeCart = cart as any[];

  const total = safeCart.reduce(
    (sum: number, item: any) =>
      sum + item.pricing.amount * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-black text-white px-5 md:px-16 py-12 md:py-20">
      <h1 className="font-display text-3xl md:text-4xl text-yellow-500 mb-8 md:mb-12">
        Your Cart
      </h1>

      {safeCart.length === 0 ? (
        <div className="text-center py-16 md:py-20">
          <p className="text-gray-400 mb-6">Your cart is empty.</p>
          <Link
            href="/explore"
            className="inline-block border border-yellow-600 text-yellow-500 px-8 py-3 hover:bg-yellow-600 hover:text-black transition duration-500"
          >
            Explore Collection →
          </Link>
        </div>
      ) : (
        <div className="max-w-4xl">
          <div className="space-y-3 md:space-y-4">
            {safeCart.map((item: any) => (
              <div
                key={item.id}
                className="bg-neutral-900 border border-yellow-600/30 rounded-xl p-4 md:p-6"
              >
                <div className="flex justify-between items-start mb-3 md:mb-0">
                  <div>
                    <h2 className="font-display text-base md:text-xl text-white mb-1">
                      {item.title}
                    </h2>
                    <p className="text-yellow-400 font-medium text-sm md:text-base">
                      ₹{item.pricing.amount.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 md:mt-0">
                  <div className="flex items-center border border-yellow-600/40 rounded-md overflow-hidden">
                    <button
                      onClick={() => decreaseQty(item.id)}
                      className="px-3 py-1.5 bg-black hover:bg-neutral-800 transition text-yellow-400"
                    >
                      −
                    </button>

                    <span className="w-8 text-center text-white text-sm">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => increaseQty(item.id)}
                      className="px-3 py-1.5 bg-black hover:bg-neutral-800 transition text-yellow-400"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-400 hover:text-red-300 transition text-xs md:text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 md:mt-10 bg-neutral-900 border border-yellow-600/30 rounded-xl p-5 md:p-8">
            <div className="flex justify-between items-center mb-5 md:mb-6">
              <span className="text-gray-400 text-sm md:text-base">Total</span>
              <h2 className="text-xl md:text-3xl font-bold text-white">
                ₹{total.toLocaleString("en-IN")}
              </h2>
            </div>

            <Link
              href="/checkout"
              className="block text-center bg-yellow-500 hover:bg-yellow-400 text-black py-3 font-semibold transition rounded-lg text-sm md:text-base"
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}