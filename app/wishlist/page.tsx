"use client";

import { useState } from "react";
import Link from "next/link";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { artworks, Artwork } from "../data/artworks";
import { getEffectivePrice, isArtworkAvailable } from "@/app/lib/catalogue";
import ArtworkCard from "../components/ArtworkCard";
import RoomModal from "../components/RoomModal";

export default function WishlistPage() {
  const { wishlist, toggleWishlist } = useWishlist();
  const { addToCart, openCart } = useCart();
  const [roomArtwork, setRoomArtwork] = useState<Artwork | null>(null);
  const [addedAll, setAddedAll] = useState(false);

  const savedArtworks = artworks.filter((art) => wishlist.includes(art.id));

  // Compute total wishlist value using canonical effective pricing
  const totalValue = savedArtworks.reduce((sum, art) => sum + getEffectivePrice(art), 0);

  const handleAddAllToCart = () => {
    const availableItems = savedArtworks.filter((art) => isArtworkAvailable(art));
    availableItems.forEach((art) => {
      const price = getEffectivePrice(art);
      addToCart({
        id: art.id,
        title: art.title,
        pricing: { amount: price },
        quantity: 1,
      });
    });
    setAddedAll(true);
    setTimeout(() => {
      setAddedAll(false);
      openCart();
    }, 800);
  };

  const handleClearAll = () => {
    if (confirm("Remove all artworks from your wishlist?")) {
      savedArtworks.forEach((art) => toggleWishlist(art.id));
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-5 md:px-16 py-12 md:py-20 selection:bg-yellow-500/30 selection:text-yellow-200">
      <div className="max-w-7xl mx-auto">
        {/* BREADCRUMB */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-400 flex items-center gap-2">
          <Link href="/" className="hover:text-yellow-400 transition">
            Home
          </Link>
          <span>/</span>
          <span className="text-yellow-400">Curated Wishlist</span>
        </nav>

        {/* HEADER & SUMMARY BAR */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8 border-b border-yellow-600/20">
          <div>
            <p className="uppercase tracking-[0.25em] text-[10px] md:text-xs text-yellow-500 mb-2 font-medium">
              Collector Saved Collection
            </p>
            <h1 className="font-display text-3xl md:text-5xl text-white">
              Your <span className="text-yellow-400">Wishlist</span>
            </h1>
            <p className="text-neutral-400 text-xs mt-2">
              Bookmark favorites or{" "}
              <Link href="/account?tab=collections" className="text-yellow-400 hover:underline">
                organize into Named Private Collections in your Collector Vault →
              </Link>
            </p>
          </div>

          {savedArtworks.length > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="bg-neutral-900 border border-yellow-600/30 px-5 py-2.5 rounded-xl">
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">
                  Collection Value ({savedArtworks.length} {savedArtworks.length === 1 ? "piece" : "pieces"})
                </span>
                <span className="text-lg md:text-xl font-bold text-yellow-400">
                  ₹ {totalValue.toLocaleString("en-IN")}
                </span>
              </div>

              <button
                onClick={handleAddAllToCart}
                disabled={addedAll}
                className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg shadow-yellow-500/20 disabled:opacity-60"
              >
                {addedAll ? "✓ Adding to Cart..." : "Move All to Cart →"}
              </button>

              <button
                onClick={handleClearAll}
                className="text-neutral-400 hover:text-red-400 text-xs px-3 py-2 transition"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {savedArtworks.length === 0 ? (
          <div className="text-center py-16 md:py-24 max-w-lg mx-auto bg-neutral-900 border border-yellow-600/30 rounded-2xl p-8 md:p-12">
            <p className="text-5xl mb-4">✨</p>
            <h2 className="font-display text-2xl text-white mb-3">
              Your curated collection is empty
            </h2>
            <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
              Explore artworks from India&apos;s independent artists, bookmark your favorite pieces, and preview them together on your walls.
            </p>
            <Link
              href="/explore"
              className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3.5 rounded-xl font-bold text-sm transition shadow-lg shadow-yellow-500/20"
            >
              Explore Curated Collection →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {savedArtworks.map((art) => (
              <ArtworkCard
                key={art.id}
                artwork={art}
                onViewInRoom={(item) => setRoomArtwork(item)}
              />
            ))}
          </div>
        )}

        {/* ROOM PREVIEW MODAL */}
        <RoomModal
          isOpen={Boolean(roomArtwork)}
          onClose={() => setRoomArtwork(null)}
          artwork={roomArtwork}
        />
      </div>
    </main>
  );
}