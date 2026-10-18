/**
 * Kala Setu — Canonical Catalogue Helper Utilities
 *
 * Single source of truth for catalogue identity resolution, pricing,
 * availability, inventory limits, and formatted currency strings.
 */

import { artworks, Artwork } from "@/app/data/artworks";
import { artists } from "@/app/data/artists";

export type Artist = (typeof artists)[number];

export interface FilterOptions {
  category?: string;
  medium?: string;
  type?: "physical" | "digital" | "all";
  artistId?: string;
  minPrice?: number;
  maxPrice?: number;
  searchQuery?: string;
  sortBy?: "featured" | "price-asc" | "price-desc" | "newest" | "rating";
}

/**
 * Format an integer or float amount into Indian Rupee (INR) representation.
 * Example: 15000 -> "₹15,000"
 */
export function formatPrice(amount: number, currency: string = "INR"): string {
  if (typeof amount !== "number" || isNaN(amount)) {
    return "₹0";
  }
  const formatted = Math.round(amount).toLocaleString("en-IN");
  return currency === "INR" ? `₹${formatted}` : `${currency} ${formatted}`;
}

/**
 * Calculate the effective purchase price of an artwork taking active sales into account.
 * Follows authoritative order validation logic.
 */
export function getEffectivePrice(artwork: Artwork): number {
  if (!artwork || !artwork.pricing) {
    return 0;
  }
  const { amount, isOnSale, discountPercentage } = artwork.pricing;
  if (
    isOnSale &&
    typeof discountPercentage === "number" &&
    discountPercentage > 0 &&
    discountPercentage <= 100
  ) {
    return Math.round(amount - (amount * discountPercentage) / 100);
  }
  return amount;
}

/**
 * Check if an artwork is currently available for purchase in the catalogue.
 */
export function isArtworkAvailable(artwork: Artwork): boolean {
  if (!artwork || !artwork.inventory) return false;
  if (artwork.inventory.available === false) return false;
  return (artwork.inventory.quantity ?? 0) > 0;
}

/**
 * Enforce maximum purchasable quantity per item:
 * - Physical art: Available stock (often unique = 1)
 * - Digital art: Maximum 5 licenses per order
 */
export function getMaxOrderQuantity(artwork: Artwork): number {
  if (!artwork || !artwork.inventory) return 0;
  if (artwork.inventory.available === false) return 0;

  if (artwork.type === "digital") {
    const stock = artwork.inventory.quantity ?? 5;
    return Math.max(0, Math.min(5, stock));
  }

  return Math.max(0, artwork.inventory.quantity ?? 0);
}

/**
 * Resolve an artwork from the canonical catalogue by ID (e.g. "art-001") or Slug (e.g. "golden-heritage").
 */
export function resolveArtwork(identifier: string): Artwork | null {
  if (!identifier || typeof identifier !== "string") return null;
  const clean = identifier.trim().toLowerCase();

  // 1. Direct ID match
  const byId = artworks.find((a) => a.id.toLowerCase() === clean);
  if (byId) return byId;

  // 2. Direct Slug match
  const bySlug = artworks.find((a) => a.slug.toLowerCase() === clean);
  if (bySlug) return bySlug;

  return null;
}

/**
 * Get an artwork strictly by its canonical ID.
 */
export function getArtworkById(id: string): Artwork | null {
  if (!id || typeof id !== "string") return null;
  const clean = id.trim().toLowerCase();
  return artworks.find((a) => a.id.toLowerCase() === clean) || null;
}

/**
 * Get an artwork strictly by its canonical slug.
 */
export function getArtworkBySlug(slug: string): Artwork | null {
  if (!slug || typeof slug !== "string") return null;
  const clean = slug.trim().toLowerCase();
  return artworks.find((a) => a.slug.toLowerCase() === clean) || null;
}

/**
 * Resolve an artist by ID (e.g. "artist-001") or exact Name.
 */
export function resolveArtist(identifier: string): Artist | null {
  if (!identifier || typeof identifier !== "string") return null;
  const clean = identifier.trim().toLowerCase();

  const byId = artists.find((a) => a.id.toLowerCase() === clean);
  if (byId) return byId;

  const byName = artists.find((a) => a.name.toLowerCase() === clean);
  if (byName) return byName;

  return null;
}

/**
 * Get an artist strictly by ID.
 */
export function getArtistById(id: string): Artist | null {
  if (!id || typeof id !== "string") return null;
  const clean = id.trim().toLowerCase();
  return artists.find((a) => a.id.toLowerCase() === clean) || null;
}

/**
 * Get all artworks created by a given artist ID.
 */
export function getArtworksByArtist(artistId: string): Artwork[] {
  if (!artistId || typeof artistId !== "string") return [];
  const clean = artistId.trim().toLowerCase();
  return artworks.filter((a) => a.artist?.id.toLowerCase() === clean);
}

/**
 * Get related artworks for a given artwork (same artist, category, or style, excluding self).
 */
export function getRelatedArtworks(artwork: Artwork, limit: number = 3): Artwork[] {
  if (!artwork) return [];
  const related = artworks.filter((a) => {
    if (a.id === artwork.id) return false;
    if (a.artist?.id === artwork.artist?.id) return true;
    if (a.details?.category === artwork.details?.category) return true;
    if (a.details?.style === artwork.details?.style) return true;
    return false;
  });

  // Fallback to other artworks if fewer than limit found
  if (related.length < limit) {
    for (const a of artworks) {
      if (a.id !== artwork.id && !related.some((r) => r.id === a.id)) {
        related.push(a);
        if (related.length >= limit) break;
      }
    }
  }

  return related.slice(0, limit);
}

/**
 * Filter and sort artworks using authoritative catalogue data.
 */
export function filterArtworks(options: FilterOptions = {}): Artwork[] {
  const {
    category,
    medium,
    type,
    artistId,
    minPrice,
    maxPrice,
    searchQuery,
    sortBy = "featured",
  } = options;

  let result = [...artworks];

  // Category filter
  if (category && category !== "All" && category !== "all") {
    result = result.filter(
      (a) =>
        a.details?.category?.toLowerCase() === category.toLowerCase() ||
        a.type?.toLowerCase() === category.toLowerCase()
    );
  }

  // Medium filter
  if (medium && medium !== "All" && medium !== "all") {
    result = result.filter(
      (a) => a.details?.medium?.toLowerCase().includes(medium.toLowerCase())
    );
  }

  // Type filter
  if (type && type !== "all") {
    result = result.filter((a) => a.type === type);
  }

  // Artist ID filter
  if (artistId && artistId !== "all") {
    result = result.filter(
      (a) => a.artist?.id?.toLowerCase() === artistId.toLowerCase()
    );
  }

  // Price range filter
  if (typeof minPrice === "number" && !isNaN(minPrice)) {
    result = result.filter((a) => getEffectivePrice(a) >= minPrice);
  }
  if (typeof maxPrice === "number" && !isNaN(maxPrice)) {
    result = result.filter((a) => getEffectivePrice(a) <= maxPrice);
  }

  // Search query
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    result = result.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.artist?.name.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.details?.regionalTradition?.toLowerCase().includes(q) ||
        a.details?.style?.toLowerCase().includes(q) ||
        a.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Sorting
  switch (sortBy) {
    case "price-asc":
      result.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
      break;
    case "price-desc":
      result.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
      break;
    case "newest":
      result.sort(
        (a, b) => (b.details?.yearCreated ?? 0) - (a.details?.yearCreated ?? 0)
      );
      break;
    case "rating":
      result.sort(
        (a, b) => (b.artist?.rating ?? 0) - (a.artist?.rating ?? 0)
      );
      break;
    case "featured":
    default:
      // Featured items first, then by ID
      result.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return a.id.localeCompare(b.id);
      });
      break;
  }

  return result;
}
