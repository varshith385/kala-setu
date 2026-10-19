"use client";

import Link from "next/link";
import Image from "next/image";
import { Artwork } from "../data/artworks";
import WishlistButton from "./WishlistButton";

interface ArtworkCardProps {
  artwork: Artwork;
  onViewInRoom?: (artwork: Artwork) => void;
  priority?: boolean;
  matchReasons?: string[];
}

export default function ArtworkCard({ artwork, onViewInRoom, priority = false, matchReasons }: ArtworkCardProps) {
  const discountedPrice =
    artwork.pricing.isOnSale &&
    typeof artwork.pricing.discountPercentage === "number" &&
    artwork.pricing.discountPercentage > 0
      ? Math.round(
          artwork.pricing.amount -
            (artwork.pricing.amount * artwork.pricing.discountPercentage) / 100
        )
      : artwork.pricing.amount;

  return (
    <div className="group relative flex flex-col bg-neutral-900/90 border border-yellow-600/20 hover:border-yellow-500/60 rounded-xl overflow-hidden transition-all duration-500 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(234,179,8,0.1)]">
      {/* IMAGE CONTAINER */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-950">
        <Link href={`/explore/${artwork.slug}`} className="block w-full h-full">
          <Image
            src={artwork.images[0] || artwork.thumbnail}
            alt={artwork.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </Link>

        {/* TOP BADGES */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none z-10">
          <div className="flex flex-col gap-1.5">
            {artwork.pricing.isOnSale && typeof artwork.pricing.discountPercentage === "number" && (
              <span className="bg-yellow-500 text-black text-[10px] md:text-xs font-bold px-2 py-0.5 rounded shadow-md pointer-events-auto">
                -{artwork.pricing.discountPercentage}% SALE
              </span>
            )}
            <span className="bg-black/70 backdrop-blur-sm text-gray-300 text-[10px] px-2 py-0.5 rounded border border-white/10 uppercase tracking-wider font-medium pointer-events-auto">
              {artwork.type === "digital" ? "Digital Art" : "Original"}
            </span>
          </div>

          <div className="pointer-events-auto">
            <WishlistButton artworkId={artwork.id} />
          </div>
        </div>

        {/* VIEW IN ROOM QUICK ACTION (HOVER OVERLAY) */}
        {onViewInRoom && (
          <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onViewInRoom(artwork);
              }}
              className="w-full bg-black/85 hover:bg-yellow-500 text-yellow-400 hover:text-black border border-yellow-500/50 hover:border-yellow-400 text-xs font-semibold py-2 px-3 rounded-lg backdrop-blur-md transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
            >
              <span>🖼️</span>
              <span>View in Room</span>
            </button>
          </div>
        )}
      </div>

      {/* CARD CONTENT */}
      <div className="p-4 md:p-5 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* ARTIST & MEDIUM */}
          <div className="flex items-center justify-between gap-2 text-xs text-gray-400 mb-1">
            <Link
              href={`/artists/${artwork.artist.id}`}
              className="hover:text-yellow-400 transition truncate font-medium flex items-center gap-1"
            >
              <span>{artwork.artist.name}</span>
              {artwork.artist.verified && (
                <span className="text-yellow-500 text-[11px]" title="Verified Artist">
                  ✓
                </span>
              )}
            </Link>
            <span className="text-gray-500 text-[11px] truncate shrink-0">
              {artwork.details.medium}
            </span>
          </div>

          {/* TITLE */}
          <Link href={`/explore/${artwork.slug}`}>
            <h3 className="font-display text-base md:text-lg text-white group-hover:text-yellow-400 transition line-clamp-1">
              {artwork.title}
            </h3>
          </Link>

          {/* DIMENSIONS */}
          {artwork.details.dimensions && (
            <p className="text-[11px] text-gray-500 mt-0.5">
              {artwork.details.dimensions}
            </p>
          )}

          {/* AI DISCOVERY MATCH REASONS */}
          {matchReasons && matchReasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {matchReasons.slice(0, 2).map((reason, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center text-[10px] font-medium bg-yellow-500/10 text-yellow-300 border border-yellow-500/25 px-2 py-0.5 rounded-full"
                >
                  ✦ {reason}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* PRICING & INVENTORY */}
        <div className="pt-3 border-t border-yellow-600/15 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-white text-base md:text-lg">
              ₹ {discountedPrice.toLocaleString("en-IN")}
            </span>
            {artwork.pricing.isOnSale && (
              <span className="text-gray-500 line-through text-xs">
                ₹ {artwork.pricing.amount.toLocaleString("en-IN")}
              </span>
            )}
          </div>

          <span className="text-[11px] text-gray-400">
            {artwork.inventory?.available ? (
              <span className="text-emerald-400 font-medium">In Stock</span>
            ) : (
              <span className="text-red-400 font-medium">Sold Out</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
