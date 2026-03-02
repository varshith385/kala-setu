"use client";

import { useCart } from "@/context/CartContext";
import Link from "next/link";

export default function CartPage() {
  const cartContext = useCart();

  if (!cartContext) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading cart...
      </div>
    );
  }

  const { cart, increaseQty, decreaseQty, removeFromCart } = cartContext;

  const total = cart.reduce(
    (sum, item) => sum + item.pricing.amount * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-black text-white px-6 py-20">
      <h1 className="text-4xl font-bold mb-10">Your Cart</h1>

      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <div className="space-y-8">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center border-b border-yellow-600/30 pb-6"
              >
                <div>
                  <h2 className="text-xl font-semibold">{item.title}</h2>
                  <p className="text-yellow-500">
                    ₹{item.pricing.amount}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => decreaseQty(item.id)}
                    className="px-3 py-1 bg-gray-800"
                  >
                    -
                  </button>

                  <span>{item.quantity}</span>

                  <button
                    onClick={() => increaseQty(item.id)}
                    className="px-3 py-1 bg-gray-800"
                  >
                    +
                  </button>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <h2 className="text-2xl font-bold">
              Total: ₹{total}
            </h2>

            <Link
              href="/checkout"
              className="inline-block mt-6 bg-yellow-500 text-black px-6 py-3 font-semibold"
            >
              Proceed to Checkout
            </Link>
          </div>
        </>
      )}
    </div>
  );
}