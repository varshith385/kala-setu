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

  useEffect(() => {
    setActiveFilter(typeFromUrl);
  }, [typeFromUrl]);

  let filtered = artworks;

  /* ================= FILTER LOGIC ================= */

  if (activeFilter === "physical") {
    filtered = artworks.filter(
      (art) => art.details.category === "Physical Art"
    );
  }

  if (activeFilter === "digital") {
    filtered = artworks.filter(
      (art) => art.details.category === "Digital Art"
    );
  }

  /* ================= SORT LOGIC ================= */

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

  /* ================= HANDLE FILTER CHANGE ================= */

  const handleFilterChange = (value: string | null) => {
    setActiveFilter(value);

    if (value) {
      router.push(`/explore?type=${value}`);
    } else {
      router.push(`/explore`);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-6 md:px-16 py-24">

      {/* HEADER */}
      <div className="mb-12">
        <h1 className="text-4xl text-yellow-500 mb-6">
          Explore Collection
        </h1>

        {/* FILTER + SORT BAR */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 border border-yellow-600/20 p-4 rounded-lg">

          {/* FILTER BUTTONS */}
          <div className="flex gap-4">

            <button
              onClick={() => handleFilterChange(null)}
              className={`px-4 py-2 border ${
                !activeFilter
                  ? "bg-yellow-600 text-black"
                  : "border-yellow-600 text-yellow-500"
              }`}
            >
              All
            </button>

            <button
              onClick={() => handleFilterChange("physical")}
              className={`px-4 py-2 border ${
                activeFilter === "physical"
                  ? "bg-yellow-600 text-black"
                  : "border-yellow-600 text-yellow-500"
              }`}
            >
              Physical
            </button>

            <button
              onClick={() => handleFilterChange("digital")}
              className={`px-4 py-2 border ${
                activeFilter === "digital"
                  ? "bg-yellow-600 text-black"
                  : "border-yellow-600 text-yellow-500"
              }`}
            >
              Digital
            </button>

          </div>

          {/* SORT DROPDOWN */}
          <div className="flex items-center gap-4">

            <span className="text-gray-400 text-sm">
              {filtered.length} Results
            </span>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-black border border-yellow-600 text-yellow-500 px-4 py-2"
            >
              <option value="">Sort By</option>
              <option value="low">Price: Low → High</option>
              <option value="high">Price: High → Low</option>
            </select>

          </div>

        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {filtered.map((art) => (
          <Link
            key={art.id}
            href={`/explore/${art.slug}`}
            className="block border border-yellow-600/20 p-6 rounded-xl hover:border-yellow-500/50 hover:scale-[1.02] transition duration-500"
          >
            <img
              src={art.images[0]}
              alt={art.title}
              className="h-60 w-full object-cover rounded mb-6"
            />

            <h3 className="text-yellow-500 text-lg mb-2">
              {art.title}
            </h3>

            <p className="text-gray-400 mb-1">
              ₹ {art.pricing.amount}
            </p>

            <p className="text-xs text-gray-500 uppercase">
              {art.details.category}
            </p>
          </Link>
        ))}
      </div>

    </main>
  );
}