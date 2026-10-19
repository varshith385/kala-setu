"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { artworks, Artwork } from "../data/artworks";
import ArtworkCard from "../components/ArtworkCard";
import RoomModal from "../components/RoomModal";
import { useCollector } from "../context/CollectorContext";
import { searchArtworks, SearchResultPackage } from "../lib/artSearchEngine";

// Helper to deduce orientation from actual dimensions (e.g. "24x36 inches")
function getArtworkOrientation(dimensions?: string): "portrait" | "landscape" | "square" | null {
  if (!dimensions) return null;
  const match = dimensions.match(/(\d+(?:\.\d+)?)\s*[xX*×]\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const w = parseFloat(match[1]);
  const h = parseFloat(match[2]);
  if (isNaN(w) || isNaN(h)) return null;
  if (Math.abs(w - h) < 1) return "square";
  return w > h ? "landscape" : "portrait";
}

export default function ExploreClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addSavedSearch } = useCollector();
  const [savedSearchSuccess, setSavedSearchSuccess] = useState(false);
  const [selectedRoomArtwork, setSelectedRoomArtwork] = useState<Artwork | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const handleSaveCurrentSearch = () => {
    const params = searchParams.toString();
    const label = searchQuery
      ? `Query: "${searchQuery}"`
      : activeTradition
      ? `${activeTradition} Tradition`
      : activeMedium
      ? `${activeMedium} Art`
      : "Curated Explore Preset";
    addSavedSearch(label, params);
    setSavedSearchSuccess(true);
    setTimeout(() => setSavedSearchSuccess(false), 2500);
  };

  // Read search params directly as source of truth
  const searchQuery = searchParams.get("q") || "";
  const activeType = searchParams.get("type") || "";
  const activeMedium = searchParams.get("medium") || "";
  const activeTradition = searchParams.get("tradition") || "";
  const activeRoom = searchParams.get("room") || "";
  const activeOrientation = searchParams.get("orientation") || "";
  const activeFramed = searchParams.get("framed") || "";
  const activePriceRange = searchParams.get("price") || "";
  const activeSort = searchParams.get("sort") || "";
  const activeOnSale = searchParams.get("onSale") === "true";
  const activeInStock = searchParams.get("inStock") === "true";

  // Debounced input state for real-time smooth search with shareable URL synchronization
  const [inputValue, setInputValue] = useState(searchQuery);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (inputValue === searchQuery) {
      setIsDebouncing(false);
      return;
    }
    setIsDebouncing(true);
    const timer = setTimeout(() => {
      updateFilter({ q: inputValue.trim() || null });
      setIsDebouncing(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [inputValue, searchQuery]);

  // Helper to calculate effective price (incorporating active sale discounts)
  const getEffectivePrice = (art: Artwork) => {
    if (art.pricing.isOnSale && typeof art.pricing.discountPercentage === "number" && art.pricing.discountPercentage > 0) {
      return Math.round(art.pricing.amount - (art.pricing.amount * art.pricing.discountPercentage) / 100);
    }
    return art.pricing.amount;
  };

  // Helper to update URL search parameters
  const updateFilter = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    }
    const qs = params.toString();
    router.push(qs ? `/explore?${qs}` : `/explore`);
  };

  const clearAll = () => {
    setInputValue("");
    router.push("/explore");
  };

  // 1. Facet Filtering (applied to catalogue candidates)
  let candidates = artworks;

  // Type Filter (Physical vs Digital)
  if (activeType === "physical") {
    candidates = candidates.filter((art) => art.type === "physical" || art.details.category === "Physical Art");
  } else if (activeType === "digital") {
    candidates = candidates.filter((art) => art.type === "digital" || art.details.category === "Digital Art");
  }

  // Medium Filter
  if (activeMedium) {
    candidates = candidates.filter((art) =>
      art.details.medium.toLowerCase().includes(activeMedium.toLowerCase())
    );
  }

  // Regional Tradition Filter
  if (activeTradition) {
    candidates = candidates.filter((art) =>
      art.details.regionalTradition?.toLowerCase().includes(activeTradition.toLowerCase()) ||
      art.details.style?.toLowerCase().includes(activeTradition.toLowerCase())
    );
  }

  // Room Suitability Filter
  if (activeRoom) {
    candidates = candidates.filter((art) =>
      art.details.roomSuitability?.some((r) => r.toLowerCase().includes(activeRoom.toLowerCase()))
    );
  }

  // Orientation Filter
  if (activeOrientation) {
    candidates = candidates.filter((art) => {
      const orient = getArtworkOrientation(art.details.dimensions);
      return orient === activeOrientation;
    });
  }

  // Framing Filter
  if (activeFramed === "framed") {
    candidates = candidates.filter((art) => Boolean(art.details.framed));
  } else if (activeFramed === "unframed") {
    candidates = candidates.filter((art) => !art.details.framed);
  }

  // On Sale Filter
  if (activeOnSale) {
    candidates = candidates.filter((art) => Boolean(art.pricing.isOnSale));
  }

  // In Stock Filter
  if (activeInStock) {
    candidates = candidates.filter((art) => Boolean(art.inventory?.available));
  }

  // Price Range Filter (Uses effective discounted price)
  if (activePriceRange === "under12") {
    candidates = candidates.filter((art) => getEffectivePrice(art) < 12000);
  } else if (activePriceRange === "12to16") {
    candidates = candidates.filter(
      (art) => getEffectivePrice(art) >= 12000 && getEffectivePrice(art) <= 16000
    );
  } else if (activePriceRange === "16to20") {
    candidates = candidates.filter(
      (art) => getEffectivePrice(art) > 16000 && getEffectivePrice(art) <= 20000
    );
  } else if (activePriceRange === "above20") {
    candidates = candidates.filter((art) => getEffectivePrice(art) > 20000);
  } else if (activePriceRange === "under15") {
    candidates = candidates.filter((art) => getEffectivePrice(art) < 15000);
  } else if (activePriceRange === "15to20") {
    candidates = candidates.filter(
      (art) => getEffectivePrice(art) >= 15000 && getEffectivePrice(art) <= 20000
    );
  }

  // 2. Multi-tier Hybrid AI Art Discovery (Exact, Fuzzy, Transliterations, Synonyms & Intent)
  const searchPkg: SearchResultPackage = useMemo(() => {
    return searchArtworks(searchQuery, candidates);
  }, [searchQuery, candidates]);

  const reasonsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const res of searchPkg.results) {
      map[res.artwork.id] = res.matchReasons;
    }
    return map;
  }, [searchPkg.results]);

  let filtered = searchPkg.artworks;

  // 3. Sorting (Preserve AI relevance rank by default if search query active, else apply explicit user sort)
  if (activeSort === "low") {
    filtered = [...filtered].sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
  } else if (activeSort === "high") {
    filtered = [...filtered].sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
  } else if (activeSort === "newest") {
    filtered = [...filtered].sort((a, b) => (b.details.yearCreated || 0) - (a.details.yearCreated || 0));
  } else if (activeSort === "rating") {
    filtered = [...filtered].sort((a, b) => b.engagement.rating - a.engagement.rating);
  } else if (activeSort === "views") {
    filtered = [...filtered].sort((a, b) => b.engagement.views - a.engagement.views);
  }

  const hasActiveFilters = Boolean(
    searchQuery ||
    activeType ||
    activeMedium ||
    activeTradition ||
    activeRoom ||
    activeOrientation ||
    activeFramed ||
    activePriceRange ||
    activeOnSale ||
    activeInStock ||
    activeSort
  );

  const availableMediums = [
    "Acrylic",
    "Oil",
    "Watercolor",
    "Gouache",
    "Charcoal",
    "Digital",
    "Mixed Media",
  ];

  const availableTraditions = [
    { label: "Deccan & Mughal Gold", value: "Deccan" },
    { label: "Vedic & Sacred River", value: "Vedic" },
    { label: "Kerala Temple Murals", value: "Kerala" },
    { label: "Rajasthani Court Miniatures", value: "Rajasthani" },
    { label: "Contemporary Urban", value: "Urban" },
    { label: "Dravidian Temple", value: "Dravidian" },
    { label: "Thar Desert Folklore", value: "Thar" },
  ];

  const availableRooms = [
    "Living Room",
    "Pooja Room",
    "Executive Suite",
    "Modern Lounge",
    "Bedroom",
    "Study / Library",
    "Dining Room",
  ];

  return (
    <main className="min-h-screen bg-black text-white px-5 md:px-16 py-12 md:py-20 selection:bg-yellow-500/30 selection:text-yellow-200">
      <div className="mb-8 md:mb-12 max-w-7xl mx-auto">
        {/* BREADCRUMB */}
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-neutral-400 flex items-center gap-2">
          <Link href="/" className="hover:text-yellow-400 transition">Home</Link>
          <span>/</span>
          <span className="text-yellow-400">Catalogue Collection</span>
        </nav>

        <p className="uppercase tracking-[0.2em] md:tracking-[0.25em] text-[10px] md:text-xs text-yellow-500 mb-2 md:mb-3 font-medium">
          {artworks.length} Curated Masterpieces Available Across India
        </p>
        <h1 className="font-display text-3xl md:text-5xl text-white mb-6 md:mb-8 font-normal">
          Explore the <span className="text-yellow-400">Collection</span>
        </h1>

        {/* SEARCH BAR WITH AI DISCOVERY INDICATOR */}
        <div className="relative mb-3">
          <span className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-yellow-500/80 text-base md:text-lg flex items-center">
            {isDebouncing ? (
              <span className="inline-block animate-spin text-yellow-400">✦</span>
            ) : (
              <span>⌕</span>
            )}
          </span>
          <input
            id="explore-search-input"
            name="q"
            type="text"
            placeholder="Search artists, titles, or describe in plain English (e.g. 'blue god playing flute', 'elephants for living room', 'under ₹15,000')..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-neutral-900 border border-yellow-600/40 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/40 outline-none pl-11 md:pl-12 pr-28 py-3.5 md:py-4 text-white placeholder-neutral-400 rounded-xl transition text-sm md:text-base shadow-inner"
            aria-label="Search artworks"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {inputValue && (
              <button
                type="button"
                onClick={() => {
                  setInputValue("");
                  updateFilter({ q: null });
                }}
                className="text-neutral-400 hover:text-white text-xs bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded transition"
                aria-label="Clear search"
              >
                ✕ Clear
              </button>
            )}
            <span
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-yellow-400/90 bg-yellow-500/10 border border-yellow-500/25 px-2.5 py-1 rounded-md"
              title="Hybrid Natural Language, Phonetic & Curated Indian Art Engine"
            >
              ✦ AI Discovery
            </span>
          </div>
        </div>

        {/* CURATED NATURAL LANGUAGE EXAMPLE PROMPTS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none text-xs text-neutral-400">
          <span className="shrink-0 text-yellow-500/80 font-medium">Try:</span>
          {[
            "Blue-skinned god playing flute",
            "Elephants & gold for living room",
            "Palace with miniature figures",
            "Original art under ₹15,000",
            "Madhubani & intricate patterns",
            "Monsoon courtyard rain",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setInputValue(prompt);
                updateFilter({ q: prompt });
              }}
              className="shrink-0 px-3 py-1 rounded-full bg-neutral-900/90 border border-yellow-600/30 text-neutral-300 hover:text-yellow-300 hover:border-yellow-400 transition"
            >
              ✦ {prompt}
            </button>
          ))}
        </div>

        {/* "DID YOU MEAN..." SUGGESTION CARD */}
        {searchPkg.suggestion &&
          searchPkg.suggestion.toLowerCase() !== (searchQuery || "").toLowerCase() && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-2.5 text-xs text-yellow-300 shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 font-bold">✦</span>
                <span className="text-neutral-300">Did you mean:</span>
                <button
                  type="button"
                  onClick={() => {
                    setInputValue(searchPkg.suggestion!);
                    updateFilter({ q: searchPkg.suggestion });
                  }}
                  className="font-semibold text-yellow-400 underline hover:text-yellow-200 transition"
                >
                  &ldquo;{searchPkg.suggestion}&rdquo;
                </button>
                <span className="text-neutral-400">?</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInputValue(searchPkg.suggestion!);
                  updateFilter({ q: searchPkg.suggestion });
                }}
                className="text-[11px] text-black bg-yellow-400 hover:bg-yellow-300 font-semibold px-2.5 py-1 rounded transition shrink-0"
              >
                Search this instead
              </button>
            </div>
          )}

        {/* FACET FILTER & CONTROLS CONTAINER */}
        <div className="flex flex-col gap-4 border border-yellow-600/30 p-4 md:p-6 rounded-2xl bg-neutral-900/90 backdrop-blur-sm shadow-xl">
          {/* PRIMARY ROW: FORMAT, SALES & IN-STOCK */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <FilterPill active={!activeType} onClick={() => updateFilter({ type: null })}>
              All Formats
            </FilterPill>
            <FilterPill
              active={activeType === "physical"}
              onClick={() => updateFilter({ type: activeType === "physical" ? null : "physical" })}
            >
              Original Physical Art
            </FilterPill>
            <FilterPill
              active={activeType === "digital"}
              onClick={() => updateFilter({ type: activeType === "digital" ? null : "digital" })}
            >
              Digital Editions
            </FilterPill>

            <FilterPill
              active={activeOnSale}
              onClick={() => updateFilter({ onSale: activeOnSale ? null : "true" })}
            >
              🔥 On Sale
            </FilterPill>

            <FilterPill
              active={activeInStock}
              onClick={() => updateFilter({ inStock: activeInStock ? null : "true" })}
            >
              ✓ In Stock Only
            </FilterPill>

            {/* MEDIUM SELECT */}
            <select
              id="medium-filter-select"
              name="medium"
              value={activeMedium}
              onChange={(e) => updateFilter({ medium: e.target.value || null })}
              className="bg-black border border-yellow-600/50 text-yellow-400 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium focus:outline-none focus:border-yellow-400"
              aria-label="Filter by medium"
            >
              <option value="">All Mediums</option>
              {availableMediums.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* PRICE SELECT */}
            <select
              id="price-filter-select"
              name="price"
              value={activePriceRange}
              onChange={(e) => updateFilter({ price: e.target.value || null })}
              className="bg-black border border-yellow-600/50 text-yellow-400 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium focus:outline-none focus:border-yellow-400"
              aria-label="Filter by price range"
            >
              <option value="">All Price Brackets</option>
              <option value="under12">Under ₹12,000</option>
              <option value="12to16">₹12,000 – ₹16,000</option>
              <option value="16to20">₹16,000 – ₹20,000</option>
              <option value="above20">Above ₹20,000</option>
            </select>

            {/* ADVANCED TOGGLE BUTTON */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="ml-auto flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-600/40 px-3 py-2 rounded-lg bg-black/50"
            >
              <span>⚙️</span>
              <span>{showAdvancedFilters ? "Less Filters" : "More Filters (Tradition, Room, Framing)"}</span>
            </button>
          </div>

          {/* SECONDARY ADVANCED FILTERS ROW */}
          {showAdvancedFilters && (
            <div className="pt-3 border-t border-yellow-600/20 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* REGIONAL TRADITION */}
              <div>
                <label htmlFor="tradition-filter-select" className="block text-[11px] text-neutral-400 mb-1">
                  Regional Tradition & Movement
                </label>
                <select
                  id="tradition-filter-select"
                  name="tradition"
                  value={activeTradition}
                  onChange={(e) => updateFilter({ tradition: e.target.value || null })}
                  className="w-full bg-black border border-yellow-600/50 text-yellow-400 px-3 py-2 rounded-lg text-xs md:text-sm font-medium focus:outline-none focus:border-yellow-400"
                >
                  <option value="">All Indian Traditions</option>
                  {availableTraditions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* ROOM SUITABILITY */}
              <div>
                <label htmlFor="room-filter-select" className="block text-[11px] text-neutral-400 mb-1">
                  Architectural Room Fit
                </label>
                <select
                  id="room-filter-select"
                  name="room"
                  value={activeRoom}
                  onChange={(e) => updateFilter({ room: e.target.value || null })}
                  className="w-full bg-black border border-yellow-600/50 text-yellow-400 px-3 py-2 rounded-lg text-xs md:text-sm font-medium focus:outline-none focus:border-yellow-400"
                >
                  <option value="">All Architectural Rooms</option>
                  {availableRooms.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* ORIENTATION & FRAMING */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="orientation-filter-select" className="block text-[11px] text-neutral-400 mb-1">
                    Orientation
                  </label>
                  <select
                    id="orientation-filter-select"
                    name="orientation"
                    value={activeOrientation}
                    onChange={(e) => updateFilter({ orientation: e.target.value || null })}
                    className="w-full bg-black border border-yellow-600/50 text-yellow-400 px-2.5 py-2 rounded-lg text-xs font-medium focus:outline-none focus:border-yellow-400"
                  >
                    <option value="">All</option>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                    <option value="square">Square</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="framed-filter-select" className="block text-[11px] text-neutral-400 mb-1">
                    Framing
                  </label>
                  <select
                    id="framed-filter-select"
                    name="framed"
                    value={activeFramed}
                    onChange={(e) => updateFilter({ framed: e.target.value || null })}
                    className="w-full bg-black border border-yellow-600/50 text-yellow-400 px-2.5 py-2 rounded-lg text-xs font-medium focus:outline-none focus:border-yellow-400"
                  >
                    <option value="">All</option>
                    <option value="framed">Framed</option>
                    <option value="unframed">Unframed</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE FILTER BADGES / SUMMARY */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-yellow-600/20 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-neutral-300 text-xs md:text-sm font-medium">
                {filtered.length} Artwork{filtered.length !== 1 ? "s" : ""} Found
              </span>

              {/* Active Filter Chips */}
              {activeType && (
                <span className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-2.5 py-1 rounded-full">
                  Format: {activeType}
                  <button onClick={() => updateFilter({ type: null })} className="hover:text-white" aria-label="Remove format filter">✕</button>
                </span>
              )}
              {activeMedium && (
                <span className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-2.5 py-1 rounded-full">
                  Medium: {activeMedium}
                  <button onClick={() => updateFilter({ medium: null })} className="hover:text-white" aria-label="Remove medium filter">✕</button>
                </span>
              )}
              {activeTradition && (
                <span className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-2.5 py-1 rounded-full">
                  Tradition: {activeTradition}
                  <button onClick={() => updateFilter({ tradition: null })} className="hover:text-white" aria-label="Remove tradition filter">✕</button>
                </span>
              )}
              {activeRoom && (
                <span className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-2.5 py-1 rounded-full">
                  Room: {activeRoom}
                  <button onClick={() => updateFilter({ room: null })} className="hover:text-white" aria-label="Remove room filter">✕</button>
                </span>
              )}
              {activeOrientation && (
                <span className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-2.5 py-1 rounded-full capitalize">
                  Orientation: {activeOrientation}
                  <button onClick={() => updateFilter({ orientation: null })} className="hover:text-white" aria-label="Remove orientation filter">✕</button>
                </span>
              )}
              {activeFramed && (
                <span className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-2.5 py-1 rounded-full capitalize">
                  {activeFramed === "framed" ? "Framed" : "Unframed"}
                  <button onClick={() => updateFilter({ framed: null })} className="hover:text-white" aria-label="Remove framing filter">✕</button>
                </span>
              )}
              {activePriceRange && (
                <span className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-2.5 py-1 rounded-full">
                  Price: {activePriceRange === "under12" ? "< ₹12k" : activePriceRange === "12to16" ? "₹12k-₹16k" : activePriceRange === "16to20" ? "₹16k-₹20k" : "> ₹20k"}
                  <button onClick={() => updateFilter({ price: null })} className="hover:text-white" aria-label="Remove price filter">✕</button>
                </span>
              )}
              {activeOnSale && (
                <span className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-2.5 py-1 rounded-full">
                  On Sale
                  <button onClick={() => updateFilter({ onSale: null })} className="hover:text-white" aria-label="Remove on sale filter">✕</button>
                </span>
              )}
              {activeInStock && (
                <span className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-2.5 py-1 rounded-full">
                  In Stock Only
                  <button onClick={() => updateFilter({ inStock: null })} className="hover:text-white" aria-label="Remove in stock filter">✕</button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-2.5 py-1 rounded-full">
                  &ldquo;{searchQuery}&rdquo;
                  <button onClick={() => { setInputValue(""); updateFilter({ q: null }); }} className="hover:text-white" aria-label="Clear search term">✕</button>
                </span>
              )}

              {/* Natural Language Extracted Intent Badges */}
              {searchQuery && searchPkg.intent.isNaturalLanguage && (
                <>
                  {searchPkg.intent.extractedPriceLimit !== null && (
                    <span className="inline-flex items-center gap-1 bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs px-2.5 py-1 rounded-full">
                      ✦ Max ₹{searchPkg.intent.extractedPriceLimit.toLocaleString("en-IN")}
                    </span>
                  )}
                  {searchPkg.intent.extractedFormat && (
                    <span className="inline-flex items-center gap-1 bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs px-2.5 py-1 rounded-full capitalize">
                      ✦ {searchPkg.intent.extractedFormat}
                    </span>
                  )}
                  {searchPkg.intent.extractedRooms.map((r) => (
                    <span key={r} className="inline-flex items-center gap-1 bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs px-2.5 py-1 rounded-full">
                      ✦ {r}
                    </span>
                  ))}
                  {searchPkg.intent.detectedThemes.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs px-2.5 py-1 rounded-full">
                      ✦ {t}
                    </span>
                  ))}
                </>
              )}

              {hasActiveFilters && (
                <>
                  <button
                    onClick={clearAll}
                    className="text-neutral-400 hover:text-yellow-400 text-xs underline transition ml-2"
                  >
                    Clear all filters
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveCurrentSearch}
                    className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-600/40 hover:border-yellow-400 px-3 py-1 rounded-full transition bg-neutral-900 flex items-center gap-1 font-medium ml-2"
                    title="Save this search to your Collector Account"
                  >
                    <span>{savedSearchSuccess ? "✓ Saved to Vault!" : "💾 Save Search"}</span>
                  </button>
                </>
              )}
            </div>

            {/* SORTING SELECT */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-neutral-400 text-xs hidden sm:inline">
                Sort By:
              </label>
              <select
                id="sort-select"
                name="sort"
                value={activeSort}
                onChange={(e) => updateFilter({ sort: e.target.value || null })}
                className="bg-black border border-yellow-600/50 text-yellow-400 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium focus:outline-none focus:border-yellow-400"
              >
                <option value="">Curated Curation</option>
                <option value="low">Price: Low → High</option>
                <option value="high">Price: High → Low</option>
                <option value="newest">Newest Creations</option>
                <option value="rating">Top Collector Rating</option>
                <option value="views">Most Viewed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ARTWORK GRID */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 md:py-24 max-w-lg mx-auto bg-neutral-900 border border-yellow-600/30 rounded-2xl p-8 shadow-xl">
          <p className="text-4xl md:text-5xl mb-4">🎨</p>
          <h2 className="text-white text-lg md:text-xl mb-2 font-display">No matching artworks found</h2>
          <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
            {searchQuery
              ? `We couldn't find any artworks matching "${searchQuery}". Try a broader description, or check the suggested terms below:`
              : "We couldn't find any pieces matching your current filters. Try one of our suggested curated terms or reset your filters:"}
          </p>
          {searchPkg.suggestion && (
            <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl inline-flex items-center gap-2 text-xs text-yellow-300">
              <span>Did you mean:</span>
              <button
                type="button"
                onClick={() => {
                  setInputValue(searchPkg.suggestion!);
                  updateFilter({ q: searchPkg.suggestion });
                }}
                className="font-bold underline text-yellow-400 hover:text-white"
              >
                &ldquo;{searchPkg.suggestion}&rdquo;
              </button>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {["Blue god flute", "Elephants & gold", "Miniature palace", "Pichwai", "Kerala Mural", "Under ₹15000"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setInputValue(tag);
                  updateFilter({ q: tag, type: null, medium: null, tradition: null, room: null, price: null });
                }}
                className="px-3 py-1 bg-black border border-yellow-600/40 text-yellow-400 rounded-full text-xs hover:bg-yellow-500/10 transition"
              >
                ✦ {tag}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={clearAll}
            className="border border-yellow-500 text-yellow-400 px-6 py-2.5 rounded-lg hover:bg-yellow-500 hover:text-black transition font-semibold text-sm"
          >
            Clear All Filters & Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto">
          {filtered.map((art) => (
            <ArtworkCard
              key={art.id}
              artwork={art}
              matchReasons={searchQuery ? reasonsMap[art.id] : undefined}
              onViewInRoom={(item) => setSelectedRoomArtwork(item)}
            />
          ))}
        </div>
      )}

      {/* ROOM PREVIEW MODAL */}
      <RoomModal
        isOpen={Boolean(selectedRoomArtwork)}
        onClose={() => setSelectedRoomArtwork(null)}
        artwork={selectedRoomArtwork}
      />
    </main>
  );
}

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
      className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition font-medium ${
        active
          ? "bg-yellow-500 text-black shadow-[0_0_12px_rgba(234,179,8,0.35)]"
          : "border border-yellow-600/50 text-yellow-400 hover:bg-yellow-500/10"
      }`}
    >
      {children}
    </button>
  );
}