"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { artworks, Artwork } from "../data/artworks";

const STORAGE_KEY = "kala_setu_recent_artworks";

export function recordArtworkView(artworkId: string) {
  if (typeof window === "undefined" || !artworkId) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const existing: string[] = Array.isArray(parsed) ? parsed : [];
    const updated = [artworkId, ...existing.filter((id) => id !== artworkId)].slice(0, 8);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors safely
  }
}

interface RecentlyViewedProps {
  currentArtworkId?: string;
  onViewInRoom?: (artwork: Artwork) => void;
}

export default function RecentlyViewed({ currentArtworkId, onViewInRoom }: RecentlyViewedProps) {
  const [recentArtworks, setRecentArtworks] = useState<Artwork[]>([]);

  useEffect(() => {
    if (currentArtworkId) {
      recordArtworkView(currentArtworkId);
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const ids: string[] = Array.isArray(parsed) ? parsed : [];
        const filteredIds = currentArtworkId ? ids.filter((id) => id !== currentArtworkId) : ids;
        const matching = filteredIds
          .map((id) => artworks.find((a) => a.id === id))
          .filter((a): a is Artwork => Boolean(a))
          .slice(0, 4);
        setRecentArtworks(matching);
      }
    } catch {
      // Storage unavailable or parsing error
    }
  }, [currentArtworkId]);

  if (recentArtworks.length === 0) return null;

  return (
    <section className="py-12 border-t border-yellow-600/20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs uppercase tracking-widest text-yellow-500 font-semibold block mb-1">
            Your Gallery History
          </span>
          <h2 className="font-display text-xl md:text-2xl text-white">
            Recently Viewed Artworks
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            try {
              localStorage.removeItem(STORAGE_KEY);
              setRecentArtworks([]);
            } catch {
              // Ignore
            }
          }}
          className="text-xs text-gray-400 hover:text-white transition underline"
        >
          Clear History
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
        {recentArtworks.map((art) => {
          const discountedPrice =
            art.pricing.isOnSale &&
            typeof art.pricing.discountPercentage === "number" &&
            art.pricing.discountPercentage > 0
              ? Math.round(
                  art.pricing.amount -
                    (art.pricing.amount * art.pricing.discountPercentage) / 100
                )
              : art.pricing.amount;

          return (
            <div
              key={art.id}
              className="group bg-neutral-900/60 border border-yellow-600/20 hover:border-yellow-500/50 rounded-xl overflow-hidden transition-all duration-300"
            >
              <div className="relative aspect-[4/3] w-full bg-neutral-950 overflow-hidden">
                <Link href={`/explore/${art.slug}`}>
                  <Image
                    src={art.images[0] || art.thumbnail}
                    alt={art.title}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>
                {onViewInRoom && (
                  <button
                    type="button"
                    onClick={() => onViewInRoom(art)}
                    className="absolute bottom-2 right-2 bg-black/80 hover:bg-yellow-500 text-yellow-400 hover:text-black p-1.5 rounded-md text-xs transition border border-yellow-500/40"
                    title="View in Room"
                  >
                    🖼️
                  </button>
                )}
              </div>

              <div className="p-3">
                <p className="text-[11px] text-gray-400 truncate mb-0.5">{art.artist.name}</p>
                <Link href={`/explore/${art.slug}`}>
                  <h4 className="font-display text-xs md:text-sm text-white group-hover:text-yellow-400 transition truncate">
                    {art.title}
                  </h4>
                </Link>
                <p className="text-xs font-bold text-yellow-400 mt-1">
                  ₹ {discountedPrice.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
