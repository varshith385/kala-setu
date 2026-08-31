"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { artworks } from "./data/artworks";
import { artists } from "./data/artists";

type Artwork = typeof artworks[number];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

export default function Home() {
  const featured = artworks.filter((art) => art.featured);

  const trending = [...artworks]
    .sort((a, b) => b.engagement.views - a.engagement.views)
    .slice(0, 3);

  const newArrivals = [...artworks]
    .sort((a, b) => b.details.yearCreated - a.details.yearCreated)
    .slice(0, 3);

  const verifiedArtistCount = artists.filter((a) => a.verified !== false).length;
  const totalArtworks = artworks.length;
  const avgRating =
    artworks.reduce((sum, a) => sum + a.engagement.rating, 0) / artworks.length;

  return (
    <main className="min-h-screen bg-black text-white">

      {/* HERO */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-12 px-5 md:px-16 py-16 md:py-32 items-center border-b border-yellow-600/20">

        <div className="md:col-span-3">
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-sm text-yellow-500/80 mb-4 md:mb-6"
          >
            A Digital Bridge Between India's Artists and the World
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1 }}
            className="font-display text-4xl md:text-7xl font-medium leading-[1.1] md:leading-[1.05] mb-6 md:mb-8"
          >
            Indian Art <br />
            Deserves A <br />
            <span className="text-yellow-500">Real Marketplace</span>
          </motion.h1>

          <p className="max-w-xl text-gray-400 text-base md:text-lg mb-4">
            Independent Indian artists are scattered across Instagram DMs,
            WhatsApp chats and word of mouth — and collectors have no single
            place to discover them.
          </p>

          <p className="max-w-xl text-gray-400 text-base md:text-lg mb-8 md:mb-10">
            Kala Setu brings buyers and artists onto one trusted platform —
            to discover, purchase, and commission authentic Indian art.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/explore"
              className="text-center border border-yellow-600 text-yellow-500 px-8 py-3 hover:bg-yellow-600 hover:text-black transition duration-500"
            >
              Explore Collection →
            </Link>

            <Link
              href="/signup"
              className="text-center border border-gray-700 text-gray-300 px-8 py-3 hover:border-yellow-600 hover:text-yellow-500 transition duration-500"
            >
              I'm an Artist →
            </Link>
          </div>
        </div>

        <div className="md:col-span-2">
          {featured[0] && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative group"
            >
              <img
                src={featured[0].images[0]}
                alt={featured[0].title}
                className="w-full h-[280px] md:h-[480px] object-cover rounded-xl border border-yellow-600/20 transition duration-700 group-hover:scale-[1.02]"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 md:p-6 rounded-b-xl">
                <p className="text-yellow-500 font-display text-lg md:text-xl mb-1">
                  {featured[0].title}
                </p>
                <p className="text-gray-300 text-xs md:text-sm">
                  by {featured[0].artist.name} · ₹{featured[0].pricing.amount}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="border-b border-yellow-600/20 py-8 md:py-10 px-5 md:px-16">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-4 md:gap-8 text-center">
          <div>
            <p className="font-display text-2xl md:text-4xl text-yellow-500 mb-1">
              {verifiedArtistCount}
            </p>
            <p className="text-gray-500 text-[10px] md:text-sm uppercase tracking-wide">
              Verified Artists
            </p>
          </div>
          <div>
            <p className="font-display text-2xl md:text-4xl text-yellow-500 mb-1">
              {totalArtworks}
            </p>
            <p className="text-gray-500 text-[10px] md:text-sm uppercase tracking-wide">
              Curated Artworks
            </p>
          </div>
          <div>
            <p className="font-display text-2xl md:text-4xl text-yellow-500 mb-1">
              {avgRating.toFixed(1)} ★
            </p>
            <p className="text-gray-500 text-[10px] md:text-sm uppercase tracking-wide">
              Average Rating
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
        transition={{ duration: 0.8 }}
        className="px-5 md:px-16 py-16 md:py-24 border-b border-yellow-600/20"
      >
        <h2 className="font-display text-2xl md:text-4xl text-yellow-500 mb-10 md:mb-16 text-center">
          How Kala Setu Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 max-w-5xl mx-auto">
          <Step
            number="01"
            title="Discover"
            description="Browse physical and digital artworks from verified Indian artists, filtered by style, medium and price."
          />
          <Step
            number="02"
            title="Connect"
            description="View artist profiles, their story, and their full portfolio before you buy or commission a piece."
          />
          <Step
            number="03"
            title="Own or Commission"
            description="Purchase a finished piece directly, or describe your idea and have an artist create it for you."
          />
        </div>
      </motion.section>

      {/* ARTIST SPOTLIGHT */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeUp}
        transition={{ duration: 0.8 }}
        className="px-5 md:px-16 py-16 md:py-24 border-b border-yellow-600/20"
      >
        <div className="flex justify-between items-end mb-10 md:mb-16">
          <h2 className="font-display text-2xl md:text-4xl text-yellow-500">
            Meet The Artists
          </h2>
          <Link
            href="/artists"
            className="text-gray-400 hover:text-yellow-500 transition text-sm hidden sm:block"
          >
            View All Artists →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {artists.map((artist) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.id}`}
              className="group flex gap-5 md:gap-6 border border-yellow-600/20 p-5 md:p-6 rounded-xl hover:border-yellow-500/50 transition duration-500"
            >
              <img
                src={artist.profileImage}
                alt={artist.name}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-yellow-600 object-cover flex-shrink-0 transition duration-500 group-hover:border-yellow-400"
              />
              <div>
                <h3 className="font-display text-lg md:text-xl text-yellow-500 mb-1 group-hover:text-yellow-400 transition">
                  {artist.name}
                </h3>
                <p className="text-gray-500 text-xs mb-2 md:mb-3">
                  ⭐ {artist.rating} · {artist.location} · {artist.experience}
                </p>
                <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
                  {artist.bio}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 sm:hidden text-center">
          <Link
            href="/artists"
            className="text-gray-400 hover:text-yellow-500 transition text-sm"
          >
            View All Artists →
          </Link>
        </div>
      </motion.section>

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

      {/* CUSTOM ART SECTION */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
        transition={{ duration: 0.8 }}
        className="py-16 md:py-24 px-5 border-t border-yellow-600/20 bg-black"
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl md:text-4xl text-yellow-500 mb-6">
            Have Something Specific In Mind?
          </h2>

          <p className="text-gray-400 mb-8 md:mb-10 leading-relaxed">
            Skip the search. Tell one of our artists exactly what you're
            picturing — style, size, budget — and get a piece made just
            for you.
          </p>

          <Link
            href="/custom-request"
            className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 font-semibold transition"
          >
            Request Custom Artwork →
          </Link>
        </div>
      </motion.section>

    </main>
  );
}

/* ================= HOW IT WORKS STEP ================= */

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <p className="text-yellow-600/50 text-sm mb-3 tracking-widest">
        {number}
      </p>
      <h3 className="font-display text-xl text-yellow-500 mb-4">{title}</h3>
      <p className="text-gray-400 leading-relaxed text-sm">
        {description}
      </p>
    </div>
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
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={fadeUp}
      transition={{ duration: 0.8 }}
      className="px-5 md:px-16 py-16 md:py-24 border-t border-yellow-600/20"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">

        <div className="order-2 md:order-1">
          <h2 className="font-display text-2xl md:text-4xl text-yellow-500 mb-4 md:mb-6">
            {title}
          </h2>

          <p className="text-gray-400 mb-6 md:mb-8 leading-relaxed">
            {description}
          </p>

          <Link
            href={link}
            className="inline-block border border-yellow-600 text-yellow-500 px-8 py-3 hover:bg-yellow-600 hover:text-black transition duration-500"
          >
            Explore →
          </Link>
        </div>

        <div className="order-1 md:order-2 relative group">
          <img
            src={image}
            alt={title}
            className="h-[220px] md:h-[350px] w-full object-cover rounded-xl border border-yellow-600/20 transition duration-700 group-hover:scale-105"
          />
        </div>

      </div>
    </motion.section>
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
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={fadeUp}
      transition={{ duration: 0.8 }}
      className="px-5 md:px-16 py-16 md:py-24 border-t border-yellow-600/20"
    >
      <h2 className="font-display text-2xl md:text-4xl text-yellow-500 mb-8 md:mb-12">
        {title}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-10">

        {data.map((art) => (
          <Link
            key={art.id}
            href={`/explore/${art.slug}`}
            className="group block border border-yellow-600/20 rounded-xl overflow-hidden hover:border-yellow-500/50 transition duration-500"
          >
            <div className="relative overflow-hidden">
              <img
                src={art.images[0]}
                alt={art.title}
                className="h-32 md:h-60 w-full object-cover transition duration-700 group-hover:scale-110"
              />
              {art.pricing.isOnSale && (
                <span className="absolute top-2 left-2 bg-yellow-500 text-black text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded font-semibold">
                  -{art.pricing.discountPercentage}%
                </span>
              )}
            </div>

            <div className="p-3 md:p-6">
              <h3 className="font-display text-yellow-500 text-sm md:text-lg mb-1 md:mb-2 line-clamp-1">
                {art.title}
              </h3>

              <p className="text-gray-400 text-sm md:text-base mb-1">
                ₹ {art.pricing.amount}
              </p>

              <div className="flex items-center justify-between">
                <p className="text-[10px] md:text-xs text-gray-500 uppercase">
                  {art.details.category}
                </p>
                <p className="text-[10px] md:text-xs text-yellow-600">
                  ⭐ {art.engagement.rating}
                </p>
              </div>
            </div>
          </Link>
        ))}

      </div>
    </motion.section>
  );
}