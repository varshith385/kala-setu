"use client";

import Link from "next/link";
import { useWishlist } from "../context/WishlistContext";
import { artworks } from "../data/artworks";
import WishlistButton from "../components/WishlistButton";

export default function WishlistPage() {
  const { wishlist } = useWishlist();

  const savedArtworks = artworks.filter((art) => wishlist.includes(art.id));

  return (
    <main className="min-h-screen bg-black text-white px-5 md:px-16 py-12 md:py-20">
      <h1 className="font-display text-3xl md:text-4xl text-yellow-500 mb-8 md:mb-12">
        Your Wishlist
      </h1>

      {savedArtworks.length === 0 ? (
        <div className="text-center py-16 md:py-20">
          <p className="text-gray-400 mb-6">
            You haven't saved any artworks yet.
          </p>
          <Link
            href="/explore"
            className="inline-block border border-yellow-600 text-yellow-500 px-8 py-3 hover:bg-yellow-600 hover:text-black transition duration-500"
          >
            Explore Collection →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-10 max-w-6xl mx-auto">
          {savedArtworks.map((art) => (
            <Link
              key={art.id}
              href={`/explore/${art.slug}`}
              className="group block bg-neutral-900 border border-yellow-600/30 rounded-xl overflow-hidden hover:border-yellow-500 transition duration-500"
            >
              <div className="relative overflow-hidden">
                <img
                  src={art.images[0]}
                  alt={art.title}
                  className="h-32 md:h-60 w-full object-cover transition duration-700 group-hover:scale-110"
                />
                <WishlistButton artworkId={art.id} />
              </div>

              <div className="p-3 md:p-6">
                <h3 className="font-display text-yellow-400 text-sm md:text-lg mb-0.5 md:mb-1 line-clamp-1">
                  {art.title}
                </h3>
                <p className="text-white font-semibold text-sm md:text-lg">
                  ₹ {art.pricing.amount.toLocaleString("en-IN")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}