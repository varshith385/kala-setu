"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { artworks } from "../data/artworks";

export default function ExploreClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const typeFromUrl = searchParams.get("type");

  const [activeFilter, setActiveFilter] = useState<string | null>(typeFromUrl);
  const [sortOrder, setSortOrder] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState("");

  useEffect(() => {
    setActiveFilter(typeFromUrl);
  }, [typeFromUrl]);

  let filtered = artworks;

  if (searchQuery.trim() !== "") {
    const q = searchQuery.trim().toLowerCase();
    filtered = filtered.filter(
      (art) =>
        art.title.toLowerCase().includes(q) ||
        art.artist.name.toLowerCase().includes(q) ||
        art.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }

  if (activeFilter === "physical") {
    filtered = filtered.filter(
      (art) => art.details.category === "Physical Art"
    );
  }

  if (activeFilter === "digital") {
    filtered = filtered.filter(
      (art) => art.details.category === "Digital Art"
    );
  }

  if (priceRange === "under15") {
    filtered = filtered.filter((art) => art.pricing.amount < 15000);
  }

  if (priceRange === "15to20") {
    filtered = filtered.filter(
      (art) => art.pricing.amount >= 15000 && art.pricing.amount <= 20000
    );
  }

  if (priceRange === "above20") {
    filtered = filtered.filter((art) => art.pricing.amount > 20000);
  }

  if (sortOrder === "low") {
    filtered = [...filtered].sort(
      (a, b) => a.pricing.amount - b.pricing.amount
    );
  }

  if (sortOrder === "high") {
    filtered = [...filtered].sort(
      (a, b) => b.pricing.amount - a.pricing.amount
    );
  }

  const handleFilterChange = (value: string | null) => {
    setActiveFilter(value);

    if (value) {
      router.push(`/explore?type=${value}`);
    } else {
      router.push(`/explore`);
    }
  };

  const clearAll = () => {
    setSearchQuery("");
    setPriceRange("");
    setSortOrder("");
    handleFilterChange(null);
  };

  const hasActiveFilters =
    searchQuery !== "" || priceRange !== "" || activeFilter !== null;

  return (
    <main className="min-h-screen bg-black text-white px-5 md:px-16 py-12 md:py-24">

      {/* HEADER */}
      <div className="mb-8 md:mb-14 max-w-6xl mx-auto">
        <p className="uppercase tracking-[0.2em] md:tracking-[0.25em] text-[10px] md:text-xs text-yellow-500 mb-2 md:mb-3 font-medium">
          {artworks.length} Curated Pieces
        </p>
        <h1 className="font-display text-3xl md:text-5xl text-white mb-6 md:mb-10">
          Explore the <span className="text-yellow-500">Collection</span>
        </h1>

        {/* SEARCH BAR */}
        <div className="relative mb-4 md:mb-6">
          <span className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-yellow-500/70 text-base md:text-lg">
            ⌕
          </span>
          <input
            type="text"
            placeholder="Search artwork, artist, style..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-yellow-600/40 focus:border-yellow-500 outline-none pl-11 md:pl-12 pr-4 md:pr-5 py-3 md:py-4 text-white placeholder-gray-400 rounded-lg transition text-sm md:text-base"
          />
        </div>

        {/* FILTER + SORT BAR */}
        <div className="flex flex-col gap-4 border border-yellow-600/40 p-4 md:p-5 rounded-lg bg-neutral-900">

          <div className="flex flex-wrap items-center gap-2 md:gap-3">

            <FilterPill active={!activeFilter} onClick={() => handleFilterChange(null)}>
              All
            </FilterPill>

            <FilterPill active={activeFilter === "physical"} onClick={() => handleFilterChange("physical")}>
              Physical
            </FilterPill>

            <FilterPill active={activeFilter === "digital"} onClick={() => handleFilterChange("digital")}>
              Digital
            </FilterPill>

            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="bg-black border border-yellow-600/50 text-yellow-400 px-3 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium"
            >
              <option value="">All Prices</option>
              <option value="under15">Under ₹15,000</option>
              <option value="15to20">₹15,000 – ₹20,000</option>
              <option value="above20">Above ₹20,000</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearAll}
                className="text-gray-400 hover:text-yellow-400 text-xs md:text-sm underline transition"
              >
                Clear all
              </button>
            )}

          </div>

          <div className="flex items-center justify-between gap-4 border-t border-yellow-600/10 pt-3 md:border-0 md:pt-0">
            <span className="text-gray-300 text-xs md:text-sm whitespace-nowrap font-medium">
              {filtered.length} Result{filtered.length !== 1 ? "s" : ""}
            </span>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-black border border-yellow-600/50 text-yellow-400 px-3 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium"
            >
              <option value="">Sort By</option>
              <option value="low">Price: Low → High</option>
              <option value="high">Price: High → Low</option>
            </select>
          </div>

        </div>
      </div>

      {/* GRID */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 md:py-24 max-w-md mx-auto">
          <p className="text-4xl md:text-5xl mb-4">🔍</p>
          <p className="text-white text-base md:text-lg mb-2 font-medium">No artworks found</p>
          <p className="text-gray-400 text-sm mb-6">
            Try a different keyword, or clear your filters to see everything.
          </p>
          <button
            onClick={clearAll}
            className="border border-yellow-500 text-yellow-400 px-6 py-2 hover:bg-yellow-500 hover:text-black transition font-medium"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-10 max-w-6xl mx-auto">
          {filtered.map((art) => (
            <Link
              key={art.id}
              href={`/explore/${art.slug}`}
              className="group block bg-neutral-900 border border-yellow-600/30 rounded-xl overflow-hidden hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/10 transition duration-500"
            >
              <div className="relative overflow-hidden">
                <img
                  src={art.images[0]}
                  alt={art.title}
                  className="h-32 md:h-60 w-full object-cover transition duration-700 group-hover:scale-110"
                />
                {art.pricing.isOnSale && (
                  <span className="absolute top-2 left-2 bg-yellow-500 text-black text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded font-bold">
                    -{art.pricing.discountPercentage}%
                  </span>
                )}
              </div>

              <div className="p-3 md:p-6">
                <h3 className="font-display text-yellow-400 text-sm md:text-lg mb-0.5 md:mb-1 line-clamp-1">
                  {art.title}
                </h3>

                <p className="text-gray-400 text-[10px] md:text-xs mb-2 md:mb-3 line-clamp-1">
                  by {art.artist.name}
                </p>

                <p className="text-white mb-1 md:mb-2 font-semibold text-sm md:text-lg">
                  ₹ {art.pricing.amount.toLocaleString("en-IN")}
                </p>

                <div className="flex items-center justify-between">
                  <p className="text-[10px] md:text-xs text-gray-400 uppercase">
                    {art.details.category}
                  </p>
                  <p className="text-[10px] md:text-xs text-yellow-400 font-medium">
                    ⭐ {art.engagement.rating}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

    </main>
  );
}

/* ================= FILTER PILL ================= */

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm transition font-medium ${
        active
          ? "bg-yellow-500 text-black"
          : "border border-yellow-600/50 text-yellow-400 hover:bg-yellow-500/10"
      }`}
    >
      {children}
    </button>
  );
}