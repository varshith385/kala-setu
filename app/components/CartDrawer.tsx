"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import Image from "next/image";
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
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3 }}
            className="fixed right-0 top-0 h-full w-[400px] bg-black border-l border-yellow-600/30 z-50 p-8 overflow-y-auto"
          >
            <h2 className="text-2xl text-yellow-500 mb-6">
              Your Cart
            </h2>

            {cart.length === 0 ? (
              <p className="text-gray-400">Cart is empty</p>
            ) : (
              <>
                <div className="space-y-6">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="border-b border-yellow-600/20 pb-4"
                    >
                      <Image
                        src={item.image}
                        alt={item.title}
                        width={300}
                        height={200}
                        className="mb-2 object-cover"
                      />

                      <h3 className="text-yellow-500">
                        {item.title}
                      </h3>

                      <p className="text-gray-400">
                        ₹{item.price}
                      </p>

                      <div className="flex items-center gap-4 mt-3">
                        <button
                          onClick={() => decreaseQty(item.id)}
                          className="border px-3"
                        >
                          -
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          onClick={() => increaseQty(item.id)}
                          className="border px-3"
                        >
                          +
                        </button>

                        <button
                          onClick={() =>
                            removeFromCart(item.id)
                          }
                          className="ml-auto text-red-400 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 text-xl text-yellow-500">
                  Total: ₹{total}
                </div>

                <Link href="/checkout">
                  <button className="mt-6 w-full py-3 bg-yellow-600 text-black">
                    Proceed to Checkout
                  </button>
                </Link>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}