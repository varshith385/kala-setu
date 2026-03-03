"use client";

import { useCart } from "../context/CartContext";
import Link from "next/link";

export default function CartDrawer() {
  const {
    cart,
    isOpen,
    closeCart,
    removeFromCart,
    increaseQty,
    decreaseQty,
  } = useCart();

  const total = cart.reduce(
    (sum, item) => sum + item.pricing.amount * item.quantity,
    0
  );

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={closeCart}
          className="fixed inset-0 bg-black/50 z-40"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-black text-white shadow-2xl z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 flex justify-between items-center border-b border-yellow-600/30">
          <h2 className="text-2xl font-bold">Your Cart</h2>
          <button
            onClick={closeCart}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6 overflow-y-auto h-[calc(100%-200px)]">
          {cart.length === 0 ? (
            <p className="text-gray-400">Your cart is empty.</p>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="border-b border-yellow-600/20 pb-4"
              >
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-yellow-500">
                  ₹{item.pricing.amount}
                </p>

                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => decreaseQty(item.id)}
                    className="px-2 bg-gray-800"
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() => increaseQty(item.id)}
                    className="px-2 bg-gray-800"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="ml-auto text-red-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Section */}
        <div className="p-6 border-t border-yellow-600/30">
          <h3 className="text-xl font-bold mb-4">
            Total: ₹{total}
          </h3>

          <Link
            href="/checkout"
            onClick={closeCart}
            className="block text-center bg-yellow-500 hover:bg-yellow-400 text-black py-3 font-semibold transition"
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </>
  );
}