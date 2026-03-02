"use client";

import { useCart } from "../context/CartContext";
import Image from "next/image";

export default function CartPage() {
  const {
    cart,
    increaseQty,
    decreaseQty,
    removeFromCart,
    clearCart,
  } = useCart();

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <main className="min-h-screen bg-black text-white px-16 py-20">
      <h1 className="text-4xl text-yellow-500 mb-12">
        Your Cart
      </h1>

      {cart.length === 0 ? (
        <p className="text-gray-400">Your cart is empty.</p>
      ) : (
        <>
          <div className="space-y-10">
            {cart.map((item, index) => (
              <div
                key={item.id + "-" + index}
                className="flex items-center gap-10 border-b border-yellow-600/20 pb-6"
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  width={120}
                  height={100}
                  className="object-cover"
                />

                <div className="flex-1">
                  <h2 className="text-yellow-500 text-xl">
                    {item.title}
                  </h2>
                  <p>₹{item.price}</p>

                  <div className="flex items-center gap-4 mt-2">
                    <button
                      onClick={() => decreaseQty(item.id)}
                      className="px-3 py-1 border border-yellow-500"
                    >
                      -
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      onClick={() => increaseQty(item.id)}
                      className="px-3 py-1 border border-yellow-500"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-12 text-2xl text-yellow-500">
            Total: ₹{total}
          </div>

          <button
            onClick={clearCart}
            className="mt-6 px-8 py-3 border border-red-600 text-red-500 hover:bg-red-600 hover:text-black transition"
          >
            Clear Cart
          </button>
        </>
      )}
    </main>
  );
}