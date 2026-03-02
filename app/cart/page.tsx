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

  // Tell TypeScript cart is an array (no feature change)
  const safeCart = cart as any[];

  const total = safeCart.reduce(
    (sum: number, item: any) =>
      sum + item.pricing.amount * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-black text-white px-6 py-20">
      <h1 className="text-4xl font-bold mb-10">Your Cart</h1>

      {safeCart.length === 0 ? (
        <p className="text-gray-400">Your cart is empty.</p>
      ) : (
        <>
          <div className="space-y-8">
            {safeCart.map((item: any) => (
              <div
                key={item.id}
                className="flex justify-between items-center border-b border-yellow-600/30 pb-6"
              >
                <div>
                  <h2 className="text-xl font-semibold">
                    {item.title}
                  </h2>
                  <p className="text-yellow-500 font-medium">
                    ₹{item.pricing.amount}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => decreaseQty(item.id)}
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 transition"
                  >
                    -
                  </button>

                  <span className="w-6 text-center">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => increaseQty(item.id)}
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 transition"
                  >
                    +
                  </button>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500 hover:text-red-400 transition ml-4"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 border-t border-yellow-600/30 pt-8">
            <h2 className="text-2xl font-bold">
              Total: ₹{total}
            </h2>

            <Link
              href="/checkout"
              className="inline-block mt-6 bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 font-semibold transition"
            >
              Proceed to Checkout
            </Link>
          </div>
        </>
      )}
    </div>
  );
}