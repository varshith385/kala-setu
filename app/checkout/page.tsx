"use client";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
  };
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: (response: RazorpayFailureResponse) => void) => void;
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
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
  const [processingStatus, setProcessingStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentSuccessWarning, setPaymentSuccessWarning] = useState<{
    paymentId: string;
    message: string;
  } | null>(null);

  // Client-side display estimate (actual price will be validated & determined server-side from catalog)
  const estimatedTotal = cart.reduce(
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
    setPaymentSuccessWarning(null);

    if (!user) {
      setErrorMessage("Please log in to place an order.");
      return;
    }

    if (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim()) {
      setErrorMessage("Please fill in all customer details before proceeding.");
      return;
    }

    if (cart.length === 0) {
      setErrorMessage("Your cart is empty.");
      return;
    }

    setIsProcessing(true);
    setProcessingStatus("Initializing secure checkout...");

    try {
      // 1. Get current authenticated user session token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (sessionError || !accessToken) {
        setErrorMessage("Your session has expired. Please log in again to checkout.");
        setIsProcessing(false);
        setProcessingStatus("");
        return;
      }

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setErrorMessage("Could not load the payment gateway. Please check your internet connection and try again.");
        setIsProcessing(false);
        setProcessingStatus("");
        return;
      }

      // 3. Request server to create Razorpay order with server-calculated price
      // DO NOT send client total or untrusted prices. Only send artwork IDs and quantities.
      const createOrderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
          customer: {
            name: customer.name.trim(),
            phone: customer.phone.trim(),
            address: customer.address.trim(),
          },
        }),
      });

      const orderData = await createOrderRes.json();

      if (!createOrderRes.ok || !orderData.razorpayOrderId) {
        setErrorMessage(orderData.error || "Could not initialize order with server. Please try again.");
        setIsProcessing(false);
        setProcessingStatus("");
        return;
      }

      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        setErrorMessage("Payment gateway configuration missing. Please contact support.");
        setIsProcessing(false);
        setProcessingStatus("");
        return;
      }

      setProcessingStatus("Awaiting payment completion...");

      // 4. Configure Razorpay modal options
      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Kala Setu",
        description: "Indian Art Marketplace",
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: customer.name.trim(),
          contact: customer.phone.trim(),
          email: user.email || "",
        },
        notes: {
          address: customer.address.trim(),
        },
        theme: {
          color: "#EAB308",
        },
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          setProcessingStatus("Verifying payment and confirming order with server...");

          try {
            // Re-fetch token in case it refreshed
            const { data: latestSession } = await supabase.auth.getSession();
            const currentToken = latestSession?.session?.access_token || accessToken;

            // 5. Verify payment server-side and insert order
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${currentToken}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                items: cart.map((item) => ({
                  id: item.id,
                  quantity: item.quantity,
                })),
                customer: {
                  name: customer.name.trim(),
                  phone: customer.phone.trim(),
                  address: customer.address.trim(),
                },
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              // Order is guaranteed recorded on server. Safely clear cart and redirect.
              clearCart();
              router.push(
                `/order-success?orderId=${verifyData.orderId}&total=${verifyData.total}&paymentId=${verifyData.paymentId}`
              );
              return;
            }

            // Persistence or verification failed after gateway captured payment
            if (verifyData.requiresSupport || response.razorpay_payment_id) {
              setPaymentSuccessWarning({
                paymentId: response.razorpay_payment_id,
                message:
                  verifyData.error ||
                  "Your payment was completed, but our system encountered an issue recording your order. Please DO NOT pay again.",
              });
              // DO NOT clear cart; DO NOT encourage paying again
              setIsProcessing(false);
              setProcessingStatus("");
              return;
            }

            setErrorMessage(verifyData.error || "Payment verification failed. Please try again.");
            setIsProcessing(false);
            setProcessingStatus("");
          } catch (verifyErr: unknown) {
            console.error("Network error during payment verification:", verifyErr);
            setPaymentSuccessWarning({
              paymentId: response.razorpay_payment_id,
              message:
                "Your payment was processed, but a network error occurred while confirming your order with our server. Please DO NOT re-submit payment.",
            });
            setIsProcessing(false);
            setProcessingStatus("");
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setProcessingStatus("");
          },
        },
      };

      if (!window.Razorpay) {
        throw new Error("Razorpay SDK failed to load. Please refresh and try again.");
      }
      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on("payment.failed", function (response: RazorpayFailureResponse) {
        console.error("Razorpay payment failed:", response.error);
        setErrorMessage(
          response.error?.description ||
            "Payment could not be completed. Please check your card or UPI details and try again."
        );
        setIsProcessing(false);
        setProcessingStatus("");
      });

      razorpayInstance.open();
    } catch (error: unknown) {
      console.error("Unexpected checkout error:", error);
      const errMsg =
        error instanceof Error
          ? error.message
          : "Something went wrong while processing your order. Please try again.";
      setErrorMessage(errMsg);
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-5 md:px-6 py-12 md:py-20">
      <h1 className="font-display text-3xl md:text-4xl font-bold mb-8 md:mb-12">Checkout</h1>

      {!user && (
        <div className="bg-neutral-900 border border-yellow-600/40 rounded-lg p-4 mb-6 max-w-2xl">
          <p className="text-gray-300 text-xs md:text-sm">
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

      {/* Recoverable Payment Persistence Warning */}
      {paymentSuccessWarning && (
        <div className="bg-amber-950/70 border border-amber-500 rounded-xl p-6 mb-8 max-w-2xl shadow-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-amber-300 font-semibold text-base md:text-lg mb-2">
                Action Required: Payment Received
              </h3>
              <p className="text-gray-200 text-sm mb-4 leading-relaxed">
                {paymentSuccessWarning.message}
              </p>
              <div className="bg-black/60 rounded-lg p-3 border border-amber-500/40 mb-4">
                <p className="text-xs text-gray-400">Razorpay Payment Reference:</p>
                <p className="font-mono text-yellow-400 font-bold text-sm md:text-base select-all">
                  {paymentSuccessWarning.paymentId}
                </p>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed mb-4">
                Your cart has been preserved. Please save this Reference ID and contact our support desk:
                <br />
                <strong>Email:</strong> support@kalasetu.art &nbsp;|&nbsp; <strong>Phone / WhatsApp:</strong> +91 85228 47389
              </p>
              <Link
                href="/orders"
                className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold px-4 py-2 rounded transition"
              >
                Check My Orders Page →
              </Link>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-4 mb-8 md:mb-10 max-w-2xl">
          <p className="text-red-300 text-xs md:text-sm">{errorMessage}</p>
        </div>
      )}

      {cart.length === 0 ? (
        <p className="text-gray-400">Your cart is empty.</p>
      ) : (
        <div className="flex flex-col md:grid md:grid-cols-2 gap-10 md:gap-16">

          {/* Order Summary */}
          <div className="order-1 md:order-2">
            <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6">
              Order Summary
            </h2>

            <div className="bg-neutral-900 border border-yellow-600/20 rounded-xl p-4 md:p-0 md:bg-transparent md:border-0 space-y-4 md:space-y-6 mb-6 md:mb-10">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between border-b border-yellow-600/30 pb-3 md:pb-4 text-sm md:text-base"
                >
                  <div>
                    <span className="block font-medium">{item.title}</span>
                    <span className="text-xs text-gray-400">ID: {item.id}</span>
                  </div>
                  <span>
                    ₹{item.pricing.amount.toLocaleString("en-IN")} × {item.quantity}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-yellow-600/30 pt-4 mb-6 md:mb-8">
              <div className="flex justify-between items-center text-xl md:text-2xl font-bold">
                <span>Total:</span>
                <span className="text-yellow-400">₹{estimatedTotal.toLocaleString("en-IN")}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Prices and availability are verified against our catalog before payment.
              </p>
            </div>

            {isProcessing && processingStatus && (
              <div className="mb-4 p-3 bg-neutral-900 border border-yellow-500/40 rounded-lg text-center">
                <p className="text-xs text-yellow-400 animate-pulse">{processingStatus}</p>
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={isProcessing || !!paymentSuccessWarning}
              className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black px-8 py-3 font-semibold transition rounded-lg"
            >
              {isProcessing ? "Processing..." : paymentSuccessWarning ? "Payment Under Review" : "Pay Now"}
            </button>
          </div>

          {/* Customer Details */}
          <div className="order-2 md:order-1">
            <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6">
              Customer Details
            </h2>

            <div className="space-y-4 md:space-y-6">
              <div>
                <label htmlFor="customer-full-name" className="block text-xs text-gray-400 mb-1">Full Name</label>
                <input
                  id="customer-full-name"
                  name="fullName"
                  type="text"
                  placeholder="e.g. Aditi Rao"
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer({ ...customer, name: e.target.value })
                  }
                  disabled={isProcessing}
                  className="w-full bg-gray-900 border border-gray-700 px-4 py-3 rounded-lg text-sm md:text-base text-white focus:border-yellow-500 outline-none"
                />
              </div>

              <div>
                <label htmlFor="customer-phone-number" className="block text-xs text-gray-400 mb-1">Phone Number</label>
                <input
                  id="customer-phone-number"
                  name="phoneNumber"
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={customer.phone}
                  onChange={(e) =>
                    setCustomer({ ...customer, phone: e.target.value })
                  }
                  disabled={isProcessing}
                  className="w-full bg-gray-900 border border-gray-700 px-4 py-3 rounded-lg text-sm md:text-base text-white focus:border-yellow-500 outline-none"
                />
              </div>

              <div>
                <label htmlFor="customer-delivery-address" className="block text-xs text-gray-400 mb-1">Delivery Address</label>
                <textarea
                  id="customer-delivery-address"
                  name="deliveryAddress"
                  placeholder="Street address, City, State, PIN code"
                  value={customer.address}
                  onChange={(e) =>
                    setCustomer({ ...customer, address: e.target.value })
                  }
                  disabled={isProcessing}
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-700 px-4 py-3 rounded-lg text-sm md:text-base text-white focus:border-yellow-500 outline-none"
                />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}