"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { artworks } from "./data/artworks";

type Artwork = typeof artworks[number];

export default function Home() {
  const featured = artworks.filter((art) => art.featured);

  const trending = [...artworks]
    .sort((a, b) => b.engagement.views - a.engagement.views)
    .slice(0, 3);

  const newArrivals = [...artworks]
    .sort((a, b) => b.details.yearCreated - a.details.yearCreated)
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-black text-white">

      {/* HERO */}
      <section className="text-center py-40 px-6 md:px-16">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-4xl md:text-6xl font-light leading-tight mb-8"
        >
          The Golden Standard <br />
          <span className="text-yellow-500">Of Indian Art</span>
        </motion.h1>

        <p className="max-w-2xl mx-auto text-gray-400 text-lg mb-10">
          A curated marketplace connecting collectors with India's
          finest physical and digital artists.
        </p>

        <Link
          href="/explore"
          className="border border-yellow-600 text-yellow-500 px-8 py-3 hover:bg-yellow-600 hover:text-black transition duration-500"
        >
          Explore Collection →
        </Link>
      </section>

      {/* PHYSICAL SECTION */}
      <CategorySection
        title="Physical Artworks"
        description="Own tangible masterpieces crafted with authenticity and heritage."
        link="/explore?type=physical"
        image="/physical-preview.jpg"
      />

      {/* DIGITAL SECTION */}
      <CategorySection
        title="Digital Masterworks"
        description="Futuristic, bold and high-resolution creations for modern collectors."
        link="/explore?type=digital"
        image="/digital-preview.jpg"
      />

      {/* FEATURED */}
      <ArtworkSection title="Featured Masterpieces" data={featured} />

      {/* TRENDING */}
      <ArtworkSection title="Trending Now" data={trending} />

      {/* NEW ARRIVALS */}
      <ArtworkSection title="New Arrivals" data={newArrivals} />

    </main>
  );
}

/* ================= CATEGORY SECTION ================= */

function CategorySection({
  title,
  description,
  link,
  image,
}: {
  title: string;
  description: string;
  link: string;
  image: string;
}) {
  return (
    <section className="px-6 md:px-16 py-24 border-t border-yellow-600/20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

        <div>
          <h2 className="text-3xl md:text-4xl text-yellow-500 mb-6">
            {title}
          </h2>

          <p className="text-gray-400 mb-8 leading-relaxed">
            {description}
          </p>

          <Link
            href={link}
            className="border border-yellow-600 text-yellow-500 px-8 py-3 hover:bg-yellow-600 hover:text-black transition duration-500"
          >
            Explore →
          </Link>
        </div>

        <div className="relative group">
          <img
            src={image}
            alt={title}
            className="h-[350px] w-full object-cover rounded-xl border border-yellow-600/20 transition duration-700 group-hover:scale-105"
          />
        </div>

      </div>
    </section>
  );
}

/* ================= ARTWORK GRID SECTION ================= */

function ArtworkSection({
  title,
  data,
}: {
  title: string;
  data: Artwork[];
}) {
  return (
    <section className="px-6 md:px-16 py-24 border-t border-yellow-600/20">
      <h2 className="text-3xl md:text-4xl text-yellow-500 mb-12">
        {title}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

        {data.map((art) => (
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
    </section>
  );
}