"use client";

import { useCart } from "../context/CartContext";
import Link from "next/link";
import { artworks } from "../data/artworks";
import { getArtworkById, getEffectivePrice, getMaxOrderQuantity } from "@/app/lib/catalogue";

export default function CartDrawer() {
  const {
    cart,
    isOpen,
    closeCart,
    removeFromCart,
    increaseQty,
    decreaseQty,
  } = useCart();

  const total = cart.reduce((sum, item) => {
    const art = getArtworkById(item.id);
    const price = art ? getEffectivePrice(art) : item.pricing.amount;
    return sum + price * item.quantity;
  }, 0);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={closeCart}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-neutral-950 text-white shadow-2xl z-50 transform transition-transform duration-300 border-l border-yellow-600/30 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-6 flex justify-between items-center border-b border-yellow-600/20 bg-black">
          <div>
            <span className="text-[10px] text-yellow-500 uppercase tracking-widest font-semibold block">
              Collector Cart
            </span>
            <h2 className="font-display text-xl text-white">
              Your Curated Pieces ({cart.reduce((s, i) => s + i.quantity, 0)})
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="text-neutral-400 hover:text-white text-lg p-2 rounded-lg hover:bg-neutral-900 transition"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {/* Items List */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-3xl mb-3">🎨</p>
              <p className="font-display text-lg text-white mb-2">Your cart is empty</p>
              <p className="text-neutral-400 text-xs mb-6 max-w-xs mx-auto">
                Explore authentic physical and digital pieces by India&apos;s independent creators.
              </p>
              <Link
                href="/explore"
                onClick={closeCart}
                className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2.5 rounded-lg font-semibold text-xs transition"
              >
                Browse Curated Art →
              </Link>
            </div>
          ) : (
            cart.map((item) => {
              const matchedArt = getArtworkById(item.id);
              const unitPrice = matchedArt ? getEffectivePrice(matchedArt) : item.pricing.amount;
              const maxQty = matchedArt ? getMaxOrderQuantity(matchedArt) : 25;
              const isAtMax = item.quantity >= maxQty;

              return (
                <div
                  key={item.id}
                  className="bg-neutral-900 border border-yellow-600/20 rounded-xl p-4 flex gap-4 items-center"
                >
                  {matchedArt && matchedArt.images?.[0] ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-950 flex-shrink-0 border border-yellow-600/30">
                      <img
                        src={matchedArt.images[0]}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-neutral-800 flex items-center justify-center text-xs text-yellow-500 flex-shrink-0">
                      Art
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-white text-sm line-clamp-1 mb-0.5">
                      {item.title}
                    </h3>
                    {matchedArt && (
                      <p className="text-neutral-400 text-xs truncate mb-1">
                        by {matchedArt.artist.name}
                      </p>
                    )}
                    <p className="text-yellow-400 font-semibold text-sm">
                      ₹ {(unitPrice * item.quantity).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center border border-yellow-600/40 rounded-lg overflow-hidden bg-black text-xs">
                      <button
                        onClick={() => decreaseQty(item.id)}
                        className="px-2.5 py-1 hover:bg-neutral-800 text-yellow-400 transition"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="px-2 font-medium text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => increaseQty(item.id)}
                        disabled={isAtMax}
                        className="px-2.5 py-1 hover:bg-neutral-800 text-yellow-400 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Increase quantity"
                        title={isAtMax ? "Maximum inventory reached" : "Increase quantity"}
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-neutral-500 hover:text-red-400 text-[11px] transition"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Section */}
        {cart.length > 0 && (
          <div className="p-6 border-t border-yellow-600/20 bg-black space-y-4">
            <div className="space-y-1.5 text-xs text-neutral-400">
              <div className="flex justify-between">
                <span>
                  {cart.some((item) => {
                    const art = artworks.find((a) => a.id === item.id);
                    return art?.type === "physical";
                  })
                    ? "Studio Courier Delivery"
                    : "Digital Delivery"}
                </span>
                <span className="text-emerald-400 font-medium">
                  {cart.some((item) => {
                    const art = artworks.find((a) => a.id === item.id);
                    return art?.type === "physical" && !art.shipping?.freeShipping;
                  })
                    ? "Standard"
                    : "Included"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Artist Provenance</span>
                <span className="text-yellow-400 font-medium">Direct Studio</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-yellow-600/20">
                <span>Total Value</span>
                <span className="text-yellow-400 font-display">
                  ₹ {total.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <Link
              href="/checkout"
              onClick={closeCart}
              className="block text-center bg-yellow-500 hover:bg-yellow-400 text-black py-3.5 rounded-xl font-bold transition shadow-lg shadow-yellow-500/20 text-sm"
            >
              Proceed to Secure Checkout →
            </Link>

            <div className="text-center">
              <Link
                href="/cart"
                onClick={closeCart}
                className="text-neutral-400 hover:text-yellow-400 text-xs transition underline"
              >
                View Detailed Cart Summary
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}