"use client";

import { useState, useRef, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { searchArtworks, SearchResultPackage } from "@/app/lib/artSearchEngine";

export interface NavbarSearchProps {
  id?: string;
  placeholder?: string;
  className?: string;
  onNavigate?: () => void;
  variant?: "desktop" | "mobile" | "hero";
  defaultValue?: string;
}

export default function NavbarSearch({
  id: explicitId,
  placeholder = "Search artworks, artists, styles...",
  className = "",
  onNavigate,
  variant = "desktop",
  defaultValue = "",
}: NavbarSearchProps) {
  const router = useRouter();
  const searchId = useId();
  const inputId = explicitId || `search-input-${searchId}`;
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResultPackage | null>(null);

  // Synchronize when defaultValue changes
  useEffect(() => {
    if (defaultValue) {
      setQuery(defaultValue);
    }
  }, [defaultValue]);

  // Live in-memory hybrid search evaluation as the user types
  useEffect(() => {
    if (!query.trim()) {
      setSearchResult(null);
      return;
    }

    const trimmed = query.trim();
    // Use the shared hybrid engine synchronously for instantaneous client responsiveness
    const result = searchArtworks(trimmed);
    setSearchResult(result);
  }, [query]);

  // Handle click outside to dismiss the search autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsOpen(false);
    onNavigate?.();
    router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSelectArtwork = () => {
    setIsOpen(false);
    onNavigate?.();
  };

  const handleApplySuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setIsOpen(false);
    onNavigate?.();
    router.push(`/explore?q=${encodeURIComponent(suggestion)}`);
  };

  const isHero = variant === "hero";
  const isMobile = variant === "mobile";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative flex items-center w-full">
        <label htmlFor={inputId} className="sr-only">
          Search Artworks
        </label>

        {isHero ? (
          <div className="relative w-full">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500/70 text-lg select-none pointer-events-none"
              aria-hidden="true"
            >
              ⌕
            </span>
            <input
              id={inputId}
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                if (query.trim()) setIsOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsOpen(false);
              }}
              placeholder={placeholder}
              aria-label="Search artworks by medium, artist name, style, or title"
              className="w-full bg-neutral-900/90 border border-yellow-600/40 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/50 outline-none pl-12 pr-28 py-3.5 text-white placeholder-neutral-400 rounded-xl text-sm transition shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition shadow-md cursor-pointer"
            >
              Explore →
            </button>
          </div>
        ) : isMobile ? (
          <div className="relative w-full">
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-yellow-500/70 text-sm select-none pointer-events-none"
              aria-hidden="true"
            >
              ⌕
            </span>
            <input
              id={inputId}
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                if (query.trim()) setIsOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsOpen(false);
              }}
              placeholder={placeholder}
              aria-label="Search artworks, creators, and styles"
              className="w-full bg-neutral-900 border border-yellow-600/40 focus:border-yellow-400 outline-none pl-9 pr-8 py-2.5 text-sm text-white placeholder-neutral-500 rounded-xl"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSearchResult(null);
                  setIsOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs px-1 cursor-pointer"
                aria-label="Clear search input"
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          <div className="relative w-full">
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-yellow-500/70 text-sm select-none pointer-events-none"
              aria-hidden="true"
            >
              ⌕
            </span>
            <input
              id={inputId}
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                if (query.trim()) setIsOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsOpen(false);
              }}
              placeholder={placeholder}
              aria-label="Search artworks across catalogue"
              className="w-full bg-neutral-900/90 border border-yellow-600/30 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/40 outline-none pl-9 pr-7 py-1.5 md:py-2 text-xs text-white placeholder-neutral-500 rounded-full transition-all shadow-inner"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSearchResult(null);
                  setIsOpen(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs px-1 cursor-pointer"
                aria-label="Clear search input"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </form>

      {/* Autocomplete Results Dropdown */}
      {isOpen && query.trim() && searchResult && (
        <div
          className={`absolute left-0 top-full mt-2 w-full min-w-[280px] sm:min-w-[340px] md:min-w-[420px] max-w-[95vw] bg-neutral-950/98 backdrop-blur-md border border-yellow-600/40 rounded-xl shadow-2xl z-50 overflow-hidden text-xs`}
          role="region"
          aria-label="Search Suggestions and Results"
        >
          {/* Typo / Query Suggestion Banner */}
          {searchResult.suggestion && (
            <div className="bg-yellow-500/10 border-b border-yellow-600/20 px-3.5 py-2 flex items-center justify-between text-yellow-300">
              <span>
                Did you mean:{" "}
                <button
                  type="button"
                  onClick={() => handleApplySuggestion(searchResult.suggestion!)}
                  className="font-semibold text-yellow-400 hover:underline cursor-pointer"
                >
                  &ldquo;{searchResult.suggestion}&rdquo;
                </button>
                ?
              </span>
            </div>
          )}

          {/* Natural Language Intent Badges */}
          {searchResult.intent && searchResult.intent.isNaturalLanguage && (
            <div className="px-3.5 py-2 border-b border-yellow-600/15 bg-neutral-900/40 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Detected:</span>
              {searchResult.intent.extractedMediums && searchResult.intent.extractedMediums.length > 0 && (
                <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[10px]">
                  {searchResult.intent.extractedMediums[0]}
                </span>
              )}
              {searchResult.intent.extractedTraditions && searchResult.intent.extractedTraditions.length > 0 && (
                <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[10px]">
                  {searchResult.intent.extractedTraditions[0]}
                </span>
              )}
              {searchResult.intent.extractedPriceLimit !== null && (
                <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[10px]">
                  ≤ ₹{searchResult.intent.extractedPriceLimit.toLocaleString("en-IN")}
                </span>
              )}
            </div>
          )}

          {/* Quick Result Items */}
          <div className="max-h-72 overflow-y-auto divide-y divide-yellow-600/10">
            {searchResult.results.length === 0 ? (
              <div className="p-4 text-center text-neutral-400">
                <p className="mb-1">No matching artworks found.</p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="text-yellow-400 hover:underline text-xs cursor-pointer"
                >
                  Explore broader search in Gallery →
                </button>
              </div>
            ) : (
              searchResult.results.slice(0, 4).map(({ artwork, matchReasons }) => (
                <Link
                  key={artwork.id}
                  href={`/explore/${artwork.slug}`}
                  onClick={handleSelectArtwork}
                  className="flex items-center gap-3 p-2.5 hover:bg-neutral-900/80 transition group"
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-yellow-600/20">
                    <Image
                      src={artwork.images[0] || artwork.thumbnail}
                      alt={artwork.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-200 group-hover:text-yellow-400 transition truncate text-xs">
                      {artwork.title}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {artwork.artist.name} · {artwork.details.medium}
                    </p>
                    {matchReasons && matchReasons.length > 0 && (
                      <p className="text-[10px] text-yellow-500/90 truncate mt-0.5">
                        {matchReasons[0]}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-yellow-400 font-mono font-medium text-xs">
                      ₹ {artwork.pricing.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Footer View All Link */}
          {searchResult.results.length > 0 && (
            <div className="p-2.5 bg-neutral-900/90 border-t border-yellow-600/20 text-center">
              <Link
                href={`/explore?q=${encodeURIComponent(query.trim())}`}
                onClick={handleSelectArtwork}
                className="text-xs text-yellow-400 hover:text-yellow-300 font-medium inline-flex items-center gap-1 transition"
              >
                <span>View all {searchResult.totalMatches} results in Explore Gallery</span>
                <span>→</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
