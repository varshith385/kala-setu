"use client";

import { useCart } from "../context/CartContext";
import { useState } from "react";

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const total = cart.reduce(
    (sum, item) => sum + item.pricing.amount * item.quantity,
    0
  );

  const handlePayment = () => {
    if (!customer.name || !customer.phone || !customer.address) {
      alert("Please fill all customer details");
      return;
    }
   
  const orderId = "KS" + Math.floor(Math.random() * 100000);

  alert("Payment Successful (Demo)");

  clearCart();

  window.location.href = `/order-success?orderId=${orderId}&total=${total}`;
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-20">
      <h1 className="text-4xl font-bold mb-12">Checkout</h1>

      {cart.length === 0 ? (
        <p className="text-gray-400">Your cart is empty.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-16">

          {/* Customer Details */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">
              Customer Details
            </h2>

            <div className="space-y-6">

              <input
                type="text"
                placeholder="Full Name"
                value={customer.name}
                onChange={(e) =>
                  setCustomer({ ...customer, name: e.target.value })
                }
                className="w-full bg-gray-900 border border-gray-700 px-4 py-3"
              />

              <input
                type="text"
                placeholder="Phone Number"
                value={customer.phone}
                onChange={(e) =>
                  setCustomer({ ...customer, phone: e.target.value })
                }
                className="w-full bg-gray-900 border border-gray-700 px-4 py-3"
              />

              <textarea
                placeholder="Delivery Address"
                value={customer.address}
                onChange={(e) =>
                  setCustomer({ ...customer, address: e.target.value })
                }
                className="w-full bg-gray-900 border border-gray-700 px-4 py-3"
              />

            </div>
          </div>

          {/* Order Summary */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">
              Order Summary
            </h2>

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

            <h2 className="text-2xl font-bold mb-8">
              Total: ₹{total}
            </h2>

            <button
              onClick={handlePayment}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 font-semibold transition"
            >
              Pay Now
            </button>
          </div>

        </div>
      )}
    </div>
  );
}