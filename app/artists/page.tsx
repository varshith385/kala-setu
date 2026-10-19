"use client";

import { useState } from "react";
import Link from "next/link";
import { artists } from "../data/artists";
import ArtistCard from "../components/ArtistCard";
import { isFuzzyMatch, phoneticKey } from "../lib/artSearchEngine";

function matchesArtist(artist: (typeof artists)[number], query: string): boolean {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return true;

  // 1. Exact or substring match across all artist fields
  if (
    artist.name.toLowerCase().includes(cleanQuery) ||
    artist.location.toLowerCase().includes(cleanQuery) ||
    artist.bio.toLowerCase().includes(cleanQuery) ||
    artist.specialties.some((s) => s.toLowerCase().includes(cleanQuery))
  ) {
    return true;
  }

  // 2. Tokenized fuzzy & phonetic matching for typos
  const queryTokens = cleanQuery.split(/\s+/).filter((t) => t.length > 1);
  if (queryTokens.length === 0) return true;

  const artistTokens = [
    ...artist.name.toLowerCase().split(/\s+/),
    ...artist.location.toLowerCase().split(/\s+/),
    ...artist.specialties.flatMap((s) => s.toLowerCase().split(/\s+/)),
  ];

  return queryTokens.every((qToken) =>
    artistTokens.some(
      (aToken) =>
        isFuzzyMatch(qToken, aToken) ||
        phoneticKey(qToken) === phoneticKey(aToken)
    )
  );
}

export default function AllArtistsPage() {
  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  const locations = Array.from(new Set(artists.map((a) => a.location))).filter(Boolean);

  let filtered = artists;
  if (search.trim()) {
    filtered = filtered.filter((a) => matchesArtist(a, search));
  }

  if (selectedLocation) {
    filtered = filtered.filter((a) => a.location === selectedLocation);
  }

  return (
    <main className="min-h-screen bg-black text-white px-5 md:px-16 py-12 md:py-20 selection:bg-yellow-500/30 selection:text-yellow-200">
      <div className="max-w-7xl mx-auto">
        {/* BREADCRUMB */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-400 flex items-center gap-2">
          <Link href="/" className="hover:text-yellow-400 transition">
            Home
          </Link>
          <span>/</span>
          <span className="text-yellow-400">Artists Directory</span>
        </nav>

        {/* HEADER */}
        <div className="mb-8 md:mb-12">
          <p className="uppercase tracking-[0.25em] text-[10px] md:text-xs text-yellow-500 mb-2 font-medium">
            {artists.length} Verified Independent Masters
          </p>
          <h1 className="font-display text-3xl md:text-5xl text-white mb-4">
            Meet the <span className="text-yellow-400">Creators</span>
          </h1>
          <p className="text-neutral-400 text-sm md:text-base max-w-2xl leading-relaxed">
            Every artist on Kala Setu is vetted for authentic craftsmanship, traditional mastery, or contemporary innovation. Discover their stories, browse their studio catalogues, or commission custom originals.
          </p>
        </div>

        {/* FILTER & SEARCH BAR */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10 p-4 rounded-xl bg-neutral-900 border border-yellow-600/30">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-yellow-500/70 text-sm">
              ⌕
            </span>
            <input
              id="artist-search-input"
              name="artistSearch"
              type="text"
              placeholder="Search by artist name, style, or specialty (e.g. Pichwai, Oil, Madhubani)..."
              aria-label="Search artists by name, style, or specialty"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black border border-yellow-600/40 focus:border-yellow-400 outline-none pl-9 pr-8 py-2.5 rounded-lg text-sm text-white placeholder-neutral-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <select
            id="artist-location-select"
            name="location"
            aria-label="Filter artists by location"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="bg-black border border-yellow-600/40 text-yellow-400 text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-yellow-400"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* ARTISTS GRID */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-neutral-900 border border-yellow-600/30 rounded-2xl p-8 max-w-md mx-auto">
            <p className="text-4xl mb-3">👨‍🎨</p>
            <h2 className="text-white text-lg font-display mb-1">No artists found</h2>
            <p className="text-neutral-400 text-sm mb-4">
              Try adjusting your search criteria or clearing filters.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setSelectedLocation("");
              }}
              className="text-yellow-400 border border-yellow-500/40 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-yellow-500 hover:text-black transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {filtered.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        )}

        {/* ARTIST INVITATION BANNER */}
        <div className="mt-16 md:mt-24 p-8 md:p-12 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-yellow-950/20 border border-yellow-600/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="text-yellow-400 text-xs uppercase tracking-widest font-semibold block mb-2">
              For Independent Artists
            </span>
            <h3 className="font-display text-2xl md:text-3xl text-white mb-2">
              Are you an Indian artist looking to showcase your work?
            </h3>
            <p className="text-neutral-400 text-sm max-w-xl leading-relaxed">
              Join Kala Setu to gain access to domestic and international collectors, receive direct commission requests, and keep up to 85% of your sale value.
            </p>
          </div>

          <Link
            href="/signup"
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-lg font-bold text-sm transition shadow-lg shadow-yellow-500/20 whitespace-nowrap"
          >
            Apply as an Artist →
          </Link>
        </div>
      </div>
    </main>
  );
}