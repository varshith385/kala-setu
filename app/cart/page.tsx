"use client";

import { useCart } from "../context/CartContext";
import Link from "next/link";
import { artworks } from "../data/artworks";
import { getArtworkById, getEffectivePrice, getMaxOrderQuantity, formatPrice } from "@/app/lib/catalogue";

export default function CartPage() {
  const cartContext = useCart();

  if (!cartContext) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400 text-sm">Loading your curated cart...</p>
        </div>
      </div>
    );
  }

  const { cart, increaseQty, decreaseQty, removeFromCart } = cartContext;

  const total = cart.reduce((sum: number, item) => {
    const matchedArt = getArtworkById(item.id);
    const unitPrice = matchedArt ? getEffectivePrice(matchedArt) : item.pricing.amount;
    return sum + unitPrice * item.quantity;
  }, 0);

  return (
    <main className="min-h-screen bg-black text-white px-5 md:px-16 py-12 md:py-20 selection:bg-yellow-500/30 selection:text-yellow-200">
      <div className="max-w-6xl mx-auto">
        {/* BREADCRUMB */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-400 flex items-center gap-2">
          <Link href="/" className="hover:text-yellow-400 transition">
            Home
          </Link>
          <span>/</span>
          <span className="text-yellow-400">Shopping Cart</span>
        </nav>

        {/* HEADER */}
        <div className="mb-8 md:mb-12">
          <p className="uppercase tracking-[0.25em] text-[10px] md:text-xs text-yellow-500 mb-2 font-medium">
            Checkout Summary
          </p>
          <h1 className="font-display text-3xl md:text-5xl text-white">
            Your Selected <span className="text-yellow-400">Artworks</span>
          </h1>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-16 md:py-24 max-w-lg mx-auto bg-neutral-900 border border-yellow-600/30 rounded-2xl p-8 md:p-12">
            <p className="text-5xl mb-4">🛒</p>
            <h2 className="font-display text-2xl text-white mb-3">Your cart is currently empty</h2>
            <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
              Discover unique canvases, miniature devotional paintings, and digital masterworks from India&apos;s leading creators.
            </p>
            <Link
              href="/explore"
              className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3.5 rounded-xl font-bold text-sm transition shadow-lg shadow-yellow-500/20"
            >
              Explore Collection →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* ITEMS LIST */}
            <div className="lg:col-span-8 space-y-4">
              {cart.map((item) => {
                const matchedArt = getArtworkById(item.id);
                const unitPrice = matchedArt ? getEffectivePrice(matchedArt) : item.pricing.amount;
                const maxQty = matchedArt ? getMaxOrderQuantity(matchedArt) : 25;
                const isAtMax = item.quantity >= maxQty;
                const isAvailable = matchedArt ? matchedArt.inventory?.available : true;

                return (
                  <div
                    key={item.id}
                    className="bg-neutral-900 border border-yellow-600/30 rounded-2xl p-4 md:p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center"
                  >
                    {matchedArt && matchedArt.images?.[0] ? (
                      <Link
                        href={`/explore/${matchedArt.slug}`}
                        className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-neutral-950 flex-shrink-0 border border-yellow-600/30 block group"
                      >
                        <img
                          src={matchedArt.images[0]}
                          alt={item.title}
                          className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                        />
                      </Link>
                    ) : (
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-neutral-950 border border-yellow-600/30 flex items-center justify-center text-xs text-yellow-500 flex-shrink-0">
                        Art
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {matchedArt && (
                        <p className="text-[10px] md:text-xs text-yellow-500 uppercase tracking-wider font-medium mb-1">
                          {matchedArt.details.category} · {matchedArt.details.medium}
                        </p>
                      )}
                      <h2 className="font-display text-lg md:text-xl text-white mb-1">
                        {matchedArt ? (
                          <Link href={`/explore/${matchedArt.slug}`} className="hover:text-yellow-400 transition">
                            {item.title}
                          </Link>
                        ) : (
                          item.title
                        )}
                      </h2>
                      {matchedArt && (
                        <p className="text-neutral-400 text-xs md:text-sm mb-2">
                          by {matchedArt.artist.name} {matchedArt.artist.verified && "✓"}
                        </p>
                      )}

                      {!isAvailable ? (
                        <span className="inline-block bg-red-950/80 text-red-400 border border-red-500/30 text-xs px-2.5 py-1 rounded-md font-medium mb-2">
                          Sold Out (Please remove before checkout)
                        </span>
                      ) : null}

                      <div className="flex items-baseline gap-2">
                        <span className="text-yellow-400 font-bold text-base md:text-lg">
                          ₹ {(unitPrice * item.quantity).toLocaleString("en-IN")}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-neutral-500 text-xs">
                            (₹ {unitPrice.toLocaleString("en-IN")} each)
                          </span>
                        )}
                        {matchedArt?.pricing?.isOnSale && (
                          <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded font-medium">
                            Sale
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-yellow-600/20">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center border border-yellow-600/40 rounded-lg overflow-hidden bg-black text-sm">
                          <button
                            onClick={() => decreaseQty(item.id)}
                            className="px-3 py-1.5 hover:bg-neutral-800 text-yellow-400 transition"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="px-3 font-semibold text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => increaseQty(item.id)}
                            disabled={isAtMax}
                            className="px-3 py-1.5 hover:bg-neutral-800 text-yellow-400 transition disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Increase quantity"
                            title={isAtMax ? "Maximum available inventory reached" : "Increase quantity"}
                          >
                            +
                          </button>
                        </div>
                        {isAtMax && (
                          <span className="text-[10px] text-neutral-400">
                            Max {maxQty} {maxQty === 1 ? "unit" : "units"} available
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-neutral-500 hover:text-red-400 text-xs transition"
                      >
                        Remove from Cart
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ORDER SUMMARY */}
            <div className="lg:col-span-4 bg-neutral-900 border border-yellow-600/30 rounded-2xl p-6 md:p-8 space-y-6">
              <h2 className="font-display text-xl text-white pb-4 border-b border-yellow-600/20">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm text-neutral-300">
                <div className="flex justify-between">
                  <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span className="font-semibold text-white">
                    ₹ {total.toLocaleString("en-IN")}
                  </span>
                </div>

                {cart.some((item) => {
                  const art = artworks.find((a) => a.id === item.id);
                  return art?.type === "physical";
                }) ? (
                  <div className="flex justify-between items-center">
                    <div>
                      <span>Studio Courier Dispatch</span>
                      <span className="text-[11px] text-neutral-500 block">Direct from Verified Artist Studio</span>
                    </div>
                    <span className="text-emerald-400 font-semibold uppercase text-xs">
                      {cart.every((item) => {
                        const art = artworks.find((a) => a.id === item.id);
                        return art?.type !== "physical" || art.shipping?.freeShipping;
                      }) ? "Free" : "Standard"}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <span>Digital Download Delivery</span>
                      <span className="text-[11px] text-neutral-500 block">Instant High-Resolution Access</span>
                    </div>
                    <span className="text-emerald-400 font-semibold uppercase text-xs">
                      Instant
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div>
                    <span>Artist Provenance</span>
                    <span className="text-[11px] text-neutral-500 block">Direct Creator Fulfillment</span>
                  </div>
                  <span className="text-yellow-400 font-semibold uppercase text-xs">
                    Included
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-yellow-600/20 flex justify-between items-baseline">
                <span className="text-base font-semibold text-white">Estimated Total</span>
                <span className="font-display text-2xl md:text-3xl text-yellow-400 font-bold">
                  ₹ {total.toLocaleString("en-IN")}
                </span>
              </div>

              <Link
                href="/checkout"
                className="block text-center bg-yellow-500 hover:bg-yellow-400 text-black py-4 rounded-xl font-bold transition shadow-lg shadow-yellow-500/20 text-sm md:text-base"
              >
                Proceed to Checkout →
              </Link>

              {/* TRUST GUARANTEES */}
              <div className="pt-4 border-t border-yellow-600/10 space-y-2 text-xs text-neutral-400">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">🛡️</span>
                  <span>Authentic Art Directly from Independent Creators</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">🔒</span>
                  <span>Encrypted Payment Processing via Razorpay</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">🤝</span>
                  <span>Direct Fair Payout to Independent Artist</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}