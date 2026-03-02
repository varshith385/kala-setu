"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { artworks } from "../data/artworks";

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const urlType = searchParams.get("type");

  const [selectedType, setSelectedType] = useState(
    urlType ? urlType : "all"
  );
  const [selectedArtist, setSelectedArtist] = useState("all");
  const [sortOption, setSortOption] = useState("default");
  const [searchTerm, setSearchTerm] = useState("");
  const [maxPrice, setMaxPrice] = useState(25000);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  const artists = Array.from(
    new Set(artworks.map((art) => art.artist.name))
  );

  const filteredArtworks = useMemo(() => {
    let filtered = [...artworks];

    // Type filter
    if (selectedType !== "all") {
      filtered = filtered.filter(
        (art) =>
          art.type.toLowerCase() === selectedType.toLowerCase()
      );
    }

    // Artist filter
    if (selectedArtist !== "all") {
      filtered = filtered.filter(
        (art) => art.artist.name === selectedArtist
      );
    }

    // Search filter
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter((art) =>
        art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        art.artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        art.tags.join(" ").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Price filter
    filtered = filtered.filter(
      (art) => art.pricing.amount <= maxPrice
    );

    // Sorting
    if (sortOption === "priceLow") {
      filtered.sort((a, b) => a.pricing.amount - b.pricing.amount);
    }

    if (sortOption === "priceHigh") {
      filtered.sort((a, b) => b.pricing.amount - a.pricing.amount);
    }

    if (sortOption === "rating") {
      filtered.sort(
        (a, b) => b.engagement.rating - a.engagement.rating
      );
    }

    return filtered;
  }, [
    selectedType,
    selectedArtist,
    sortOption,
    searchTerm,
    maxPrice,
  ]);

  const totalPages = Math.ceil(
    filteredArtworks.length / itemsPerPage
  );

  const paginatedArtworks = filteredArtworks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <main className="min-h-screen bg-black text-white px-16 py-20">

      <h1 className="text-4xl text-yellow-500 mb-12">
        Explore Artworks
      </h1>

      {/* FILTER BAR */}
      <div className="grid md:grid-cols-5 gap-6 mb-16 border border-yellow-600/20 p-6 rounded-xl">

        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-black border border-yellow-600/20 p-2 rounded text-white w-full"
        />

        <select
          value={selectedType}
          onChange={(e) => {
            setSelectedType(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-black border border-yellow-600/20 p-2 rounded text-white"
        >
          <option value="all">All</option>
          <option value="physical">Physical</option>
          <option value="digital">Digital</option>
        </select>

        <select
          value={selectedArtist}
          onChange={(e) => {
            setSelectedArtist(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-black border border-yellow-600/20 p-2 rounded text-white"
        >
          <option value="all">All Artists</option>
          {artists.map((artist) => (
            <option key={artist} value={artist}>
              {artist}
            </option>
          ))}
        </select>

        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="bg-black border border-yellow-600/20 p-2 rounded text-white"
        >
          <option value="default">Sort</option>
          <option value="priceLow">Price Low → High</option>
          <option value="priceHigh">Price High → Low</option>
          <option value="rating">Highest Rating</option>
        </select>

        <input
          type="range"
          min="0"
          max="25000"
          step="1000"
          value={maxPrice}
          onChange={(e) => {
            setMaxPrice(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="w-full accent-yellow-500"
        />
      </div>

      <p className="text-gray-400 mb-8">
        Showing {filteredArtworks.length} results
      </p>

      {/* ART GRID */}
      <div className="grid md:grid-cols-3 gap-10">
        {paginatedArtworks.map((art) => (
          <Link
            key={art.id}
            href={`/explore/${art.slug}`}
            className="border border-yellow-600/20 p-6 rounded-lg hover:border-yellow-500/40 transition block"
          >
            <img
              src={art.images[0]}
              className="h-60 w-full object-cover rounded mb-6"
            />

            <h2 className="text-yellow-500 text-lg mb-2">
              {art.title}
            </h2>

            <p className="text-sm text-gray-400 mb-2">
              ₹ {art.pricing.amount}
            </p>

            <p className="text-xs text-gray-500 uppercase">
              {art.type}
            </p>

            <p className="text-xs text-gray-400 mt-2">
              ⭐ {art.engagement.rating}
            </p>
          </Link>
        ))}
      </div>

      {/* PAGINATION */}
      <div className="flex justify-center mt-16 gap-4">
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index}
            onClick={() => setCurrentPage(index + 1)}
            className={`px-4 py-2 border ${
              currentPage === index + 1
                ? "bg-yellow-500 text-black"
                : "border-yellow-600 text-yellow-500"
            } rounded`}
          >
            {index + 1}
          </button>
        ))}
      </div>

    </main>
  );
}