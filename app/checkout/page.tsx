"use client";

import { useCart } from "../context/CartContext";

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();

  const total = cart.reduce(
    (sum, item) => sum + item.pricing.amount * item.quantity,
    0
  );

  const handlePayment = () => {
    alert("Payment Successful (Demo)");
    clearCart();
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-20">
      <h1 className="text-4xl font-bold mb-10">Checkout</h1>

      {cart.length === 0 ? (
        <p className="text-gray-400">Your cart is empty.</p>
      ) : (
        <>
          <div className="space-y-6 mb-10">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between border-b border-yellow-600/30 pb-4"
              >
                <span>{item.title}</span>
                <span>
                  ₹{item.pricing.amount} × {item.quantity}
                </span>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold mb-6">
            Total: ₹{total}
          </h2>

          <button
            onClick={handlePayment}
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 font-semibold transition"
          >
            Pay Now
          </button>
        </>
      )}
    </div>
  );
}