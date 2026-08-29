"use client";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const total = cart.reduce(
    (sum, item) => sum + item.pricing.amount * item.quantity,
    0
  );

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setErrorMessage("");

    if (!user) {
      setErrorMessage("Please log in to place an order.");
      return;
    }

    if (!customer.name || !customer.phone || !customer.address) {
      setErrorMessage("Please fill in all customer details before proceeding.");
      return;
    }

    setIsProcessing(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setErrorMessage("Could not load the payment gateway. Please check your internet connection and try again.");
        setIsProcessing(false);
        return;
      }

      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });

      const order = await res.json();

      if (!order.id) {
        setErrorMessage("Could not start your payment. Please try again in a moment.");
        setIsProcessing(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Kala Setu",
        description: "Artwork Purchase",
        order_id: order.id,
        handler: async function (response: any) {
          const orderRef = "KS" + Math.floor(Math.random() * 100000);

          const { error } = await supabase.from("orders").insert({
            user_id: user.id,
            order_ref: orderRef,
            items: cart,
            total: total,
            customer_name: customer.name,
            customer_phone: customer.phone,
            customer_address: customer.address,
            payment_id: response.razorpay_payment_id,
          });

          if (error) {
            console.error("Failed to save order:", error);
          }

          clearCart();
          router.push(
            `/order-success?orderId=${orderRef}&total=${total}&paymentId=${response.razorpay_payment_id}`
          );
        },
        prefill: {
          name: customer.name,
          contact: customer.phone,
        },
        notes: {
          address: customer.address,
        },
        theme: {
          color: "#EAB308",
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on("payment.failed", function () {
        setErrorMessage("Payment failed. Please check your card details and try again.");
        setIsProcessing(false);
      });

      razorpayInstance.open();
    } catch (error) {
      console.error("Payment error:", error);
      setErrorMessage("Something went wrong on our end. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-20">
      <h1 className="font-display text-4xl font-bold mb-12">Checkout</h1>

      {!user && (
        <div className="bg-neutral-900 border border-yellow-600/40 rounded-lg p-4 mb-6 max-w-2xl">
          <p className="text-gray-300 text-sm">
            You need to be logged in to complete a purchase.{" "}
            <Link href="/login" className="text-yellow-500 hover:underline">
              Log in
            </Link>{" "}
            or{" "}
            <Link href="/signup" className="text-yellow-500 hover:underline">
              create an account
            </Link>
            .
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-4 mb-10 max-w-2xl">
          <p className="text-red-300 text-sm">{errorMessage}</p>
        </div>
      )}

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
              disabled={isProcessing}
              className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black px-8 py-3 font-semibold transition"
            >
              {isProcessing ? "Processing..." : "Pay Now"}
            </button>

          </div>

        </div>
      )}
    </div>
  );
}