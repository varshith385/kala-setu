"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { artworks, Artwork } from "./data/artworks";
import { artists } from "./data/artists";
import { getEffectivePrice, formatPrice } from "@/app/lib/catalogue";
import ArtworkCard from "./components/ArtworkCard";
import ArtistCard from "./components/ArtistCard";
import RecentlyViewed from "./components/RecentlyViewed";
import RoomModal from "./components/RoomModal";
import NavbarSearch from "./components/NavbarSearch";

const fadeUp = {
  hidden: { opacity: 0, y: 35 },
  visible: { opacity: 1, y: 0 },
};

export default function Home() {
  const router = useRouter();
  const [heroSearch, setHeroSearch] = useState("");
  const [roomArtwork, setRoomArtwork] = useState<Artwork | null>(null);
  const [discoveryTab, setDiscoveryTab] = useState<"tradition" | "room" | "medium" | "price">("tradition");

  const featured = artworks.filter((art) => art.featured);

  const trending = [...artworks]
    .sort((a, b) => b.engagement.views - a.engagement.views)
    .slice(0, 3);

  const newArrivals = [...artworks]
    .sort((a, b) => (b.details.yearCreated || 0) - (a.details.yearCreated || 0))
    .slice(0, 3);

  const verifiedArtistCount = artists.filter((a) => a.verified !== false).length;
  const totalArtworks = artworks.length;
  const avgRating =
    artworks.reduce((sum, a) => sum + a.engagement.rating, 0) / artworks.length;
  const totalArtistSales = artists.reduce((sum, a) => sum + (a.totalSales || 0), 0);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      router.push(`/explore?q=${encodeURIComponent(heroSearch.trim())}`);
    } else {
      router.push("/explore");
    }
  };

  const curatedCollections = [
    {
      title: "Heritage & Pichwai",
      subtitle: "Centuries of devotional gold foil & natural pigment traditions",
      link: "/explore?q=pichwai",
      image: "https://images.unsplash.com/photo-1582561424760-0321d75e81fa?auto=format&fit=crop&w=800&q=80",
      tag: "Heritage",
    },
    {
      title: "Contemporary Oils & Acrylics",
      subtitle: "Bold expressionism & tactile palette-knife mastery",
      link: "/explore?medium=Oil",
      image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80",
      tag: "Contemporary",
    },
    {
      title: "Folk & Tribal Expressions",
      subtitle: "Living tribal folklore, Madhubani lines, & narrative roots",
      link: "/explore?q=folk",
      image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80",
      tag: "Tribal",
    },
    {
      title: "Digital Visionaries",
      subtitle: "Ultra-high-definition concept art and neo-Indian surrealism",
      link: "/explore?type=digital",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      tag: "Digital",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white selection:bg-yellow-500/30 selection:text-yellow-200">
      {/* HERO SECTION */}
      <section className="relative px-5 md:px-16 pt-16 md:pt-24 pb-16 md:pb-28 border-b border-yellow-600/20 overflow-hidden">
        {/* Subtle gallery lighting ambient background */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-yellow-600/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[450px] h-[300px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left Column: Editorial Headline & Search */}
          <div className="lg:col-span-7 z-10">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs tracking-wider uppercase mb-6 font-medium"
            >
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              Direct from India&apos;s Independent Masters
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="font-display text-4xl sm:text-5xl md:text-7xl font-medium leading-[1.08] mb-6 tracking-tight text-neutral-100"
            >
              Indian Art <br />
              Deserves A <br />
              <span className="bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                True Sanctuary
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-xl text-neutral-300 text-base md:text-lg mb-8 leading-relaxed font-light"
            >
              Connecting discerning collectors with verified Indian artists.
              Explore curated originals and digital masterworks, visualize them
              live in architectural rooms, or commission a bespoke work of art.
            </motion.p>

            {/* QUICK DISCOVERY SEARCH BAR */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25 }}
              className="relative max-w-xl mb-6"
            >
              <NavbarSearch
                id="hero-search-input"
                variant="hero"
                placeholder="Search by medium, artist name, style, or title..."
              />
            </motion.div>

            {/* Popular Search Suggestions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.35 }}
              className="flex flex-wrap items-center gap-2 text-xs text-neutral-400"
            >
              <span className="text-neutral-300 font-medium">Curated tags:</span>
              {[
                { label: "Pichwai", query: "pichwai" },
                { label: "Oil on Canvas", query: "Oil" },
                { label: "Spiritual & Divine", query: "spiritual" },
                { label: "Digital Editions", query: "digital" },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={`/explore?q=${item.query}`}
                  className="px-2.5 py-1 rounded-md bg-neutral-900 border border-yellow-600/20 text-neutral-300 hover:text-yellow-400 hover:border-yellow-500/40 transition"
                >
                  {item.label}
                </Link>
              ))}
            </motion.div>
          </div>

          {/* Right Column: Featured Artwork Hero Spotlight */}
          <div className="lg:col-span-5">
            {featured[0] && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.2 }}
                className="relative group rounded-2xl overflow-hidden border border-yellow-600/30 bg-neutral-900 shadow-2xl"
              >
                <div className="relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden">
                  <img
                    src={featured[0].images[0]}
                    alt={featured[0].title}
                    className="w-full h-full object-cover transition duration-1000 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-yellow-500 text-black text-[11px] font-bold px-2.5 py-1 rounded shadow">
                      Curator&apos;s Pick
                    </span>
                    {featured[0].details.framed && (
                      <span className="bg-black/80 backdrop-blur text-yellow-400 border border-yellow-500/30 text-[11px] px-2.5 py-1 rounded">
                        Gallery Framed
                      </span>
                    )}
                  </div>

                  {/* View in Room Interactive Shortcut */}
                  <button
                    onClick={() => setRoomArtwork(featured[0])}
                    className="absolute top-4 right-4 bg-black/80 hover:bg-yellow-500 hover:text-black backdrop-blur border border-yellow-600/40 text-yellow-400 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-lg"
                  >
                    <span>🏛️</span> View in Room
                  </button>

                  {/* Bottom Metadata & CTAs */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                    <p className="text-yellow-400 text-xs uppercase tracking-widest font-semibold mb-1">
                      {featured[0].details.medium} · {featured[0].details.dimensions}
                    </p>
                    <h2 className="font-display text-2xl md:text-3xl text-white mb-2 leading-tight">
                      {featured[0].title}
                    </h2>
                    <p className="text-neutral-300 text-sm mb-4">
                      by{" "}
                      <Link
                        href={`/artists/${featured[0].artist.id}`}
                        className="text-yellow-400 hover:underline"
                      >
                        {featured[0].artist.name}
                      </Link>{" "}
                      {featured[0].artist.verified && (
                        <span className="text-yellow-400" title="Verified Creator">✓</span>
                      )}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-yellow-600/20">
                      <div>
                        <span className="text-xs text-neutral-400 block">Acquisition Value</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl md:text-2xl font-bold text-white">
                            {formatPrice(getEffectivePrice(featured[0]))}
                          </span>
                          {featured[0].pricing.isOnSale && (
                            <span className="text-xs text-neutral-500 line-through">
                              {formatPrice(featured[0].pricing.amount)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/explore/${featured[0].slug}`}
                          className="bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition shadow-md"
                        >
                          View Artwork →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* TRUST PILLARS BAR */}
      <section className="border-b border-yellow-600/20 bg-neutral-950 py-8 md:py-10 px-5 md:px-16">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 text-center">
          <div className="p-3">
            <p className="font-display text-3xl md:text-4xl text-yellow-400 mb-1">
              {verifiedArtistCount}
            </p>
            <p className="text-neutral-400 text-xs md:text-sm uppercase tracking-wider font-medium">
              Verified Masters
            </p>
          </div>
          <div className="p-3">
            <p className="font-display text-3xl md:text-4xl text-yellow-400 mb-1">
              {totalArtworks}
            </p>
            <p className="text-neutral-400 text-xs md:text-sm uppercase tracking-wider font-medium">
              Original Pieces
            </p>
          </div>
          <div className="p-3">
            <p className="font-display text-3xl md:text-4xl text-yellow-400 mb-1">
              {avgRating.toFixed(1)} ★
            </p>
            <p className="text-neutral-400 text-xs md:text-sm uppercase tracking-wider font-medium">
              Collector Satisfaction
            </p>
          </div>
          <div className="p-3">
            <p className="font-display text-3xl md:text-4xl text-yellow-400 mb-1">
              {totalArtistSales}+
            </p>
            <p className="text-neutral-400 text-xs md:text-sm uppercase tracking-wider font-medium">
              Pieces Collected
            </p>
          </div>
        </div>
      </section>

      {/* CURATED ART COLLECTIONS */}
      <section className="px-5 md:px-16 py-16 md:py-24 border-b border-yellow-600/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 md:mb-14">
            <div>
              <p className="text-yellow-500 text-xs uppercase tracking-[0.25em] font-semibold mb-2">
                Curated Series
              </p>
              <h2 className="font-display text-2xl md:text-4xl text-white">
                Explore Art by Movement & Heritage
              </h2>
            </div>
            <Link
              href="/explore"
              className="text-neutral-400 hover:text-yellow-400 transition text-sm mt-3 sm:mt-0 inline-flex items-center gap-1"
            >
              View Full Catalogue →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {curatedCollections.map((col, index) => (
              <Link
                key={index}
                href={col.link}
                className="group relative rounded-xl overflow-hidden border border-yellow-600/20 bg-neutral-900 aspect-[3/4] block hover:border-yellow-500/60 transition duration-500 shadow-lg"
              >
                <img
                  src={col.image}
                  alt={col.title}
                  className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className="text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded bg-black/70 backdrop-blur border border-yellow-500/30 text-yellow-400">
                    {col.tag}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-display text-lg text-white group-hover:text-yellow-400 transition mb-1">
                    {col.title}
                  </h3>
                  <p className="text-neutral-300 text-xs line-clamp-2 leading-relaxed">
                    {col.subtitle}
                  </p>
                  <span className="inline-block mt-3 text-xs text-yellow-500 group-hover:translate-x-1 transition font-medium">
                    Explore Series →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* DISCOVERY MATRIX: SHOP BY TRADITION, SPACE, MEDIUM & PRICE */}
      <section className="px-5 md:px-16 py-16 md:py-20 border-b border-yellow-600/20 bg-neutral-950">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 md:mb-10">
            <div>
              <p className="text-yellow-500 text-xs uppercase tracking-[0.25em] font-semibold mb-2">
                Collector Navigation
              </p>
              <h2 className="font-display text-2xl md:text-4xl text-white">
                Curate by Space, Tradition & Medium
              </h2>
            </div>
            <Link
              href="/explore"
              className="text-neutral-400 hover:text-yellow-400 transition text-sm mt-3 sm:mt-0"
            >
              Open Full Filter Gallery →
            </Link>
          </div>

          {/* TAB BUTTONS */}
          <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-yellow-600/20 pb-4">
            <button
              onClick={() => setDiscoveryTab("tradition")}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
                discoveryTab === "tradition"
                  ? "bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                  : "border border-yellow-600/30 text-neutral-300 hover:text-yellow-400 hover:bg-neutral-900"
              }`}
            >
              🏛️ Regional Traditions ({7})
            </button>
            <button
              onClick={() => setDiscoveryTab("room")}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
                discoveryTab === "room"
                  ? "bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                  : "border border-yellow-600/30 text-neutral-300 hover:text-yellow-400 hover:bg-neutral-900"
              }`}
            >
              🛋️ By Architectural Space ({7})
            </button>
            <button
              onClick={() => setDiscoveryTab("medium")}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
                discoveryTab === "medium"
                  ? "bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                  : "border border-yellow-600/30 text-neutral-300 hover:text-yellow-400 hover:bg-neutral-900"
              }`}
            >
              🎨 By Artistic Medium ({6})
            </button>
            <button
              onClick={() => setDiscoveryTab("price")}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
                discoveryTab === "price"
                  ? "bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                  : "border border-yellow-600/30 text-neutral-300 hover:text-yellow-400 hover:bg-neutral-900"
              }`}
            >
              💎 By Price Bracket ({4})
            </button>
          </div>

          {/* TAB PANELS */}
          {discoveryTab === "tradition" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { title: "Deccan & Mughal Gold", desc: "Gold foil, royal courts & lapis inlays", query: "Deccan", icon: "👑" },
                { title: "Kerala Temple Murals", desc: "Panchavarna pigments on wood panels", query: "Kerala", icon: "🛕" },
                { title: "Rajasthani Miniatures", desc: "Mewar court scenes on antique wasli", query: "Rajasthani", icon: "🏰" },
                { title: "Vedic & Sacred Waters", desc: "Ghats, rivers and spiritual devotion", query: "Vedic", icon: "🌊" },
                { title: "Dravidian Architecture", desc: "Charcoal chiaroscuro of stone pillars", query: "Dravidian", icon: "🏛️" },
                { title: "Contemporary Urban", desc: "Surrealism & modern Indian identity", query: "Urban", icon: "🏙️" },
                { title: "Thar Desert Folklore", desc: "Caravans, ochre dunes & twilight", query: "Thar", icon: "🐪" },
              ].map((item) => (
                <Link
                  key={item.title}
                  href={`/explore?tradition=${encodeURIComponent(item.query)}`}
                  className="group p-5 rounded-xl bg-neutral-900/90 border border-yellow-600/25 hover:border-yellow-500/60 transition-all duration-300 block hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5),0_0_15px_rgba(234,179,8,0.1)]"
                >
                  <span className="text-2xl mb-2 block">{item.icon}</span>
                  <h3 className="font-display text-base text-white group-hover:text-yellow-400 transition mb-1">
                    {item.title}
                  </h3>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    {item.desc}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {discoveryTab === "room" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { title: "Living Room Statement", desc: "Focal canvases designed for prominent walls", query: "Living Room", icon: "🛋️" },
                { title: "Pooja & Devotional Space", desc: "Sacred imagery, divine gold, & murals", query: "Pooja Room", icon: "🪔" },
                { title: "Executive Suite & Office", desc: "Prestigious miniatures and regal studies", query: "Executive Suite", icon: "💼" },
                { title: "Modern Lounge & Den", desc: "Vibrant concept art & neo-surrealism", query: "Modern Lounge", icon: "🍸" },
                { title: "Master Bedroom Haven", desc: "Atmospheric, tranquil & meditative tones", query: "Bedroom", icon: "🛏️" },
                { title: "Study & Library", desc: "Intricate miniatures & quiet charcoals", query: "Study", icon: "📚" },
                { title: "Dining & Foyer", desc: "Conversational masterworks & warm vistas", query: "Dining Room", icon: "🍷" },
              ].map((item) => (
                <Link
                  key={item.title}
                  href={`/explore?room=${encodeURIComponent(item.query)}`}
                  className="group p-5 rounded-xl bg-neutral-900/90 border border-yellow-600/25 hover:border-yellow-500/60 transition-all duration-300 block hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5),0_0_15px_rgba(234,179,8,0.1)]"
                >
                  <span className="text-2xl mb-2 block">{item.icon}</span>
                  <h3 className="font-display text-base text-white group-hover:text-yellow-400 transition mb-1">
                    {item.title}
                  </h3>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    {item.desc}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {discoveryTab === "medium" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { title: "Acrylic on Canvas", desc: "Rich impasto, gold leaf & enduring pigments", query: "Acrylic", icon: "🎨" },
                { title: "Oil on Canvas", desc: "Luminous glazing and deep spiritual depth", query: "Oil", icon: "🖼️" },
                { title: "Gouache on Wasli Paper", desc: "Microscopic miniature brushwork", query: "Gouache", icon: "🖌️" },
                { title: "Natural Pigments on Wood", desc: "Authentic temple Panchavarna on teak", query: "Natural Pigments", icon: "🪵" },
                { title: "Charcoal on Paper", desc: "Dramatic contrast and sacred chiaroscuro", query: "Charcoal", icon: "✏️" },
                { title: "Digital Masterworks", desc: "High-definition limited collector editions", query: "Digital", icon: "💻" },
              ].map((item) => (
                <Link
                  key={item.title}
                  href={`/explore?medium=${encodeURIComponent(item.query)}`}
                  className="group p-5 rounded-xl bg-neutral-900/90 border border-yellow-600/25 hover:border-yellow-500/60 transition-all duration-300 block hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5),0_0_15px_rgba(234,179,8,0.1)]"
                >
                  <span className="text-2xl mb-2 block">{item.icon}</span>
                  <h3 className="font-display text-base text-white group-hover:text-yellow-400 transition mb-1">
                    {item.title}
                  </h3>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    {item.desc}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {discoveryTab === "price" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { title: "Under ₹12,000", desc: "Accessible original studies & works on paper", query: "under12", icon: "🌱" },
                { title: "₹12,000 – ₹16,000", desc: "Mid-format canvases & detailed illustrations", query: "12to16", icon: "✨" },
                { title: "₹16,000 – ₹20,000", desc: "Substantial original canvases & temple murals", query: "16to20", icon: "⚜️" },
                { title: "Above ₹20,000", desc: "Signature court miniatures & grand originals", query: "above20", icon: "👑" },
              ].map((item) => (
                <Link
                  key={item.title}
                  href={`/explore?price=${encodeURIComponent(item.query)}`}
                  className="group p-5 rounded-xl bg-neutral-900/90 border border-yellow-600/25 hover:border-yellow-500/60 transition-all duration-300 block hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5),0_0_15px_rgba(234,179,8,0.1)]"
                >
                  <span className="text-2xl mb-2 block">{item.icon}</span>
                  <h3 className="font-display text-base text-white group-hover:text-yellow-400 transition mb-1">
                    {item.title}
                  </h3>
                  <p className="text-neutral-400 text-xs leading-relaxed">
                    {item.desc}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FEATURED MASTERPIECES */}
      <section className="px-5 md:px-16 py-16 md:py-24 border-b border-yellow-600/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10 md:mb-14">
            <div>
              <p className="text-yellow-500 text-xs uppercase tracking-[0.25em] font-semibold mb-2">
                Handpicked Works
              </p>
              <h2 className="font-display text-2xl md:text-4xl text-white">
                Featured Masterpieces
              </h2>
            </div>
            <Link
              href="/explore"
              className="text-neutral-400 hover:text-yellow-400 transition text-sm hidden sm:inline-block"
            >
              Browse All ({artworks.length}) →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {featured.slice(0, 6).map((art) => (
              <ArtworkCard
                key={art.id}
                artwork={art}
                onViewInRoom={(item) => setRoomArtwork(item)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* HOW KALA SETU WORKS */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
        transition={{ duration: 0.8 }}
        className="px-5 md:px-16 py-16 md:py-24 border-b border-yellow-600/20 bg-neutral-950"
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <p className="text-yellow-500 text-xs uppercase tracking-[0.25em] font-semibold mb-2">
              The Collector Journey
            </p>
            <h2 className="font-display text-2xl md:text-4xl text-white">
              Transparent, Curated & Direct
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            <Step
              number="01"
              title="Curate & Discover"
              description="Browse authentic original physical canvases and limited digital creations, complete with verified artist credentials, dimensions, and medium details."
            />
            <Step
              number="02"
              title="Preview in Architectural Space"
              description="Our in-browser View in Room studio allows you to visualize any piece against realistic architectural living rooms, offices, and galleries to scale."
            />
            <Step
              number="03"
              title="Direct Studio Acquisition"
              description="Secure checkout with direct-to-artist revenue sharing, verified creator profiles, and studio-packed transit direct from independent artists across India."
            />
          </div>
        </div>
      </motion.section>

      {/* TRENDING NOW & NEW ARRIVALS */}
      <section className="px-5 md:px-16 py-16 md:py-24 border-b border-yellow-600/20">
        <div className="max-w-7xl mx-auto space-y-16">
          {/* Trending */}
          <div>
            <div className="flex items-end justify-between mb-8 md:mb-10">
              <div>
                <p className="text-yellow-500 text-xs uppercase tracking-[0.25em] font-semibold mb-1">
                  High Engagement
                </p>
                <h2 className="font-display text-2xl md:text-3xl text-white">
                  Trending in Galleries
                </h2>
              </div>
              <Link
                href="/explore?sort=rating"
                className="text-neutral-400 hover:text-yellow-400 transition text-sm"
              >
                View Top Rated →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {trending.map((art) => (
                <ArtworkCard
                  key={art.id}
                  artwork={art}
                  onViewInRoom={(item) => setRoomArtwork(item)}
                />
              ))}
            </div>
          </div>

          {/* New Arrivals */}
          <div className="pt-8 border-t border-yellow-600/10">
            <div className="flex items-end justify-between mb-8 md:mb-10">
              <div>
                <p className="text-yellow-500 text-xs uppercase tracking-[0.25em] font-semibold mb-1">
                  Fresh from Studios
                </p>
                <h2 className="font-display text-2xl md:text-3xl text-white">
                  Recent Creations
                </h2>
              </div>
              <Link
                href="/explore?sort=newest"
                className="text-neutral-400 hover:text-yellow-400 transition text-sm"
              >
                View Newest First →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {newArrivals.map((art) => (
                <ArtworkCard
                  key={art.id}
                  artwork={art}
                  onViewInRoom={(item) => setRoomArtwork(item)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MEET THE ARTISTS SPOTLIGHT */}
      <section className="px-5 md:px-16 py-16 md:py-24 border-b border-yellow-600/20 bg-neutral-950">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 md:mb-14">
            <div>
              <p className="text-yellow-500 text-xs uppercase tracking-[0.25em] font-semibold mb-2">
                Creator Spotlight
              </p>
              <h2 className="font-display text-2xl md:text-4xl text-white">
                Meet India&apos;s Independent Masters
              </h2>
            </div>
            <Link
              href="/artists"
              className="text-neutral-400 hover:text-yellow-400 transition text-sm mt-3 sm:mt-0"
            >
              Explore All Artists ({artists.length}) →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {artists.slice(0, 4).map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        </div>
      </section>

      {/* RECENTLY VIEWED GALLERY CAROUSEL */}
      <section className="px-5 md:px-16 py-12 md:py-16 border-b border-yellow-600/20 max-w-7xl mx-auto">
        <RecentlyViewed onViewInRoom={(item) => setRoomArtwork(item)} />
      </section>

      {/* BESPOKE CUSTOM ART COMMISSION CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
        transition={{ duration: 0.8 }}
        className="py-16 md:py-24 px-5 border-b border-yellow-600/20 bg-gradient-to-b from-neutral-900 to-black"
      >
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-yellow-500 text-xs uppercase tracking-widest font-semibold block mb-3">
            Bespoke Art Advisory
          </span>
          <h2 className="font-display text-3xl md:text-5xl text-white mb-6">
            Have Something Specific in Mind?
          </h2>

          <p className="text-neutral-300 text-base md:text-lg mb-8 md:mb-10 leading-relaxed font-light">
            Skip the search. Commission our verified masters for bespoke canvas
            dimensions, devotional iconography, heritage Pichwai panels, or modern
            interior color palettes tailored to your space.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/custom-request"
              className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3.5 font-bold rounded-lg transition shadow-lg shadow-yellow-500/20"
            >
              Request Custom Artwork →
            </Link>
            <Link
              href="/artists"
              className="border border-yellow-600/60 hover:border-yellow-400 text-yellow-400 px-8 py-3.5 font-medium rounded-lg transition"
            >
              Browse Artist Portfolios
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ROOM PREVIEW MODAL */}
      <RoomModal
        isOpen={Boolean(roomArtwork)}
        onClose={() => setRoomArtwork(null)}
        artwork={roomArtwork}
      />
    </main>
  );
}

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
    <div className="p-6 rounded-xl bg-neutral-900/60 border border-yellow-600/20">
      <p className="text-yellow-500/70 font-mono text-xs mb-3 tracking-widest">
        [{number}]
      </p>
      <h3 className="font-display text-lg text-white mb-2">{title}</h3>
      <p className="text-neutral-400 leading-relaxed text-sm">{description}</p>
    </div>
  );
}