"use client";

import { useCart } from "../context/CartContext";

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleFakePayment = () => {
    alert("Payment Successful (Demo Mode)");
    clearCart();
  };

  return (
    <main className="min-h-screen bg-black text-white px-16 py-20">
      <h1 className="text-4xl text-yellow-500 mb-12">
        Checkout
      </h1>

      {cart.length === 0 ? (
        <p className="text-gray-400">
          Your cart is empty.
        </p>
      ) : (
        <>
          <div className="space-y-6 mb-10">
            {cart.map((item) => (
              <div
                key={item.id}
                className="border-b border-yellow-600/20 pb-4"
              >
                <h3 className="text-yellow-500">
                  {item.title}
                </h3>
                <p>
                  ₹{item.price} × {item.quantity}
                </p>
              </div>
            ))}
          </div>

          <h2 className="text-2xl text-yellow-500 mb-6">
            Total: ₹{total}
          </h2>

          <button
            onClick={handleFakePayment}
            className="px-8 py-3 bg-yellow-600 text-black hover:bg-yellow-500 transition"
          >
            Pay Now
          </button>
        </>
      )}
    </main>
  );
}