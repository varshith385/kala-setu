"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useCollector } from "../../context/CollectorContext";
import { useRouter } from "next/navigation";
import RoomPreview from "../../components/RoomPreview";
import WishlistButton from "../../components/WishlistButton";
import ArtworkCard from "../../components/ArtworkCard";
import RecentlyViewed from "../../components/RecentlyViewed";
import RoomModal from "../../components/RoomModal";
import { artworks, Artwork } from "../../data/artworks";

export default function ArtworkClient({ artwork }: { artwork: Artwork }) {
  const { addToCart } = useCart();
  const router = useRouter();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { collections, toggleArtworkInCollection, createCollection } = useCollector();
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const isSaved = isWishlisted(artwork.id);
  const [copied, setCopied] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState<1 | 1.5 | 2.5>(1);
  const [roomModalArtwork, setRoomModalArtwork] = useState<Artwork | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"specs" | "policies" | "artist">("specs");

  const discountedPrice =
    artwork.pricing.isOnSale &&
    typeof artwork.pricing.discountPercentage === "number" &&
    artwork.pricing.discountPercentage > 0
      ? Math.round(
          artwork.pricing.amount -
            (artwork.pricing.amount * artwork.pricing.discountPercentage) / 100
        )
      : artwork.pricing.amount;

  const handleShare = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Find 3 related artworks from same artist or same medium/tradition
  const relatedArtworks = artworks
    .filter(
      (a) =>
        a.id !== artwork.id &&
        (a.artist.id === artwork.artist.id ||
          a.details.medium === artwork.details.medium ||
          a.details.regionalTradition === artwork.details.regionalTradition)
    )
    .slice(0, 3);

  // Standard Schema.org Product Structured Data
  const siteBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kala-setu-eight.vercel.app";
  const canonicalUrl = `${siteBaseUrl}/explore/${artwork.slug}`;
  const absoluteImages = (artwork.images || []).map((img) =>
    img.startsWith("http") ? img : `${siteBaseUrl}${img.startsWith("/") ? "" : "/"}${img}`
  );

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: artwork.title,
    image: absoluteImages,
    description: artwork.description,
    url: canonicalUrl,
    brand: {
      "@type": "Person",
      name: artwork.artist.name,
    },
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "INR",
      price: discountedPrice,
      availability: artwork.inventory?.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "Kala Setu",
      },
    },
  };

  const currentImage = artwork.images[selectedImageIndex] || artwork.thumbnail || artwork.images[0];

  return (
    <main className="min-h-screen bg-black text-white px-5 md:px-16 py-10 md:py-16 selection:bg-yellow-500/30 selection:text-yellow-200">
      {/* Inject Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-6xl mx-auto">
        {/* BREADCRUMB */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-400 flex items-center gap-2">
          <Link href="/" className="hover:text-yellow-400 transition">Home</Link>
          <span>/</span>
          <Link href="/explore" className="hover:text-yellow-400 transition">Explore</Link>
          <span>/</span>
          {artwork.details.regionalTradition && (
            <>
              <Link
                href={`/explore?tradition=${encodeURIComponent(artwork.details.regionalTradition)}`}
                className="hover:text-yellow-400 transition hidden sm:inline"
              >
                {artwork.details.regionalTradition}
              </Link>
              <span className="hidden sm:inline">/</span>
            </>
          )}
          <span className="text-yellow-400 truncate max-w-xs">{artwork.title}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-10 md:gap-16">
          {/* LEFT: IMAGE GALLERY & ROOM PREVIEW */}
          <div>
            {/* MAIN IMAGE DISPLAY */}
            <div
              onClick={() => {
                setLightboxZoom(1);
                setIsLightboxOpen(true);
              }}
              className="relative aspect-[4/3] w-full border border-yellow-600/30 rounded-xl overflow-hidden bg-neutral-950 mb-4 group cursor-zoom-in shadow-2xl"
            >
              <Image
                src={currentImage}
                alt={artwork.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition duration-700 group-hover:scale-105"
              />

              <div
                className="absolute top-4 right-4 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <WishlistButton artworkId={artwork.id} />
              </div>

              {artwork.pricing.isOnSale && typeof artwork.pricing.discountPercentage === "number" && (
                <span className="absolute top-4 left-4 bg-yellow-500 text-black text-xs px-2.5 py-1 rounded font-bold shadow-lg">
                  -{artwork.pricing.discountPercentage}% LIMITED SALE
                </span>
              )}

              <span className="absolute bottom-3 right-3 bg-black/80 text-gray-300 text-[11px] px-3 py-1.5 rounded-md border border-white/10 opacity-0 group-hover:opacity-100 transition backdrop-blur-sm pointer-events-none flex items-center gap-1.5 shadow-lg">
                <span>🔍</span> High-Resolution Zoom
              </span>
            </div>

            {/* THUMBNAIL STRIP */}
            {artwork.images.length > 1 && (
              <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                {artwork.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-20 h-16 rounded-lg overflow-hidden border-2 transition ${
                      selectedImageIndex === idx
                        ? "border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.4)]"
                        : "border-yellow-600/25 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image src={img} alt={`View ${idx + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* INTERACTIVE ROOM PREVIEW STUDIO INTEGRATION */}
            <div className="mt-6">
              <RoomPreview
                artworkImage={currentImage}
                artworkTitle={artwork.title}
                artworkDimensions={artwork.details.dimensions}
                artworkId={artwork.id}
                artworkPrice={discountedPrice}
                artworkSlug={artwork.slug}
              />
            </div>
          </div>

          {/* RIGHT: DETAILS, TRUST, & PURCHASE */}
          <div>
            {/* TITLE & ARTIST */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <span className="text-[11px] uppercase tracking-widest text-yellow-500/80 font-semibold block mb-1">
                  {artwork.details.regionalTradition || artwork.details.category}
                </span>
                <h1 className="font-display text-3xl md:text-5xl text-yellow-500 leading-tight">
                  {artwork.title}
                </h1>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => toggleWishlist(artwork.id)}
                  className={`text-xs border px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap font-medium ${
                    isSaved
                      ? "border-red-500/60 bg-red-500/15 text-red-400"
                      : "border-yellow-600/40 hover:border-yellow-500 text-yellow-400 bg-neutral-900/60"
                  }`}
                  title={isSaved ? "Remove from Saved Wishlist" : "Save to Wishlist"}
                >
                  <span>{isSaved ? "♥ Saved" : "♡ Wishlist"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCollectionModal(true)}
                  className="text-xs border border-yellow-600/40 hover:border-yellow-500 text-yellow-400 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap bg-neutral-900/60 font-medium"
                  title="Add to a Named Private Collection"
                >
                  <span>🏛️ Vault Collection</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="text-xs border border-yellow-600/40 hover:border-yellow-500 text-yellow-400 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap bg-neutral-900/60 font-medium"
                  title="Share artwork link"
                >
                  <span>↗</span>
                  <span>{copied ? "Copied!" : "Share"}</span>
                </button>
              </div>
            </div>

            {/* ARTIST METADATA LINK */}
            <div className="flex flex-wrap items-center gap-3 mb-5 border-b border-yellow-600/20 pb-4">
              <p className="text-gray-300 text-base">
                by{" "}
                <Link
                  href={`/artists/${artwork.artist.id}`}
                  className="text-yellow-400 hover:underline font-semibold"
                >
                  {artwork.artist.name}
                </Link>
              </p>
              {artwork.artist.verified && (
                <span className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  ✓ Verified Creator
                </span>
              )}
              <span className="text-gray-500 text-sm">
                ⭐ {artwork.artist.rating} rating · {artwork.artist.totalSales} pieces collected
              </span>
            </div>

            {/* PRICE & INVENTORY DISPLAY */}
            <div className="mb-6 p-5 rounded-xl bg-neutral-900/90 border border-yellow-600/30 flex items-baseline justify-between shadow-xl">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Acquisition Price (All Taxes Included)</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl md:text-4xl font-bold text-white">
                    ₹ {discountedPrice.toLocaleString("en-IN")}
                  </span>
                  {artwork.pricing.isOnSale && (
                    <span className="text-gray-500 line-through text-base md:text-lg">
                      ₹ {artwork.pricing.amount.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>
              <div>
                {artwork.inventory?.available ? (
                  <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    In Stock ({artwork.inventory.quantity} {artwork.type === "physical" ? "unique piece" : "editions"})
                  </span>
                ) : (
                  <span className="text-xs text-red-400 bg-red-950/60 border border-red-500/40 px-3 py-1.5 rounded-full font-medium">
                    Sold Out
                  </span>
                )}
              </div>
            </div>

            {/* TRUST & PROVENANCE BADGES */}
            <div className="flex flex-wrap gap-2 mb-6">
              {artwork.details.signed && <TrustBadge label="✓ Hand-Signed by Artist" />}
              {artwork.details.framed && <TrustBadge label="✓ Gallery Framed & Ready to Hang" />}
              <TrustBadge
                label={
                  artwork.type === "digital"
                    ? "⚡ Direct Digital Fulfillment"
                    : "🏛️ Direct Artist Studio Dispatch"
                }
              />
              {artwork.inventory?.limitedEdition && (
                <TrustBadge label="Numbered Limited Edition" />
              )}
            </div>

            {/* ADD TO CART & COMMISSIONS */}
            <div className="mb-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {
                  addToCart({
                    id: artwork.id,
                    title: artwork.title,
                    pricing: {
                      amount: discountedPrice,
                    },
                    quantity: 1,
                  });
                  router.push("/cart");
                }}
                disabled={!artwork.inventory?.available}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-black py-4 px-8 rounded-lg font-bold text-base transition duration-300 shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] text-center cursor-pointer"
              >
                {artwork.inventory?.available ? "Add to Cart & Checkout" : "Sold Out"}
              </button>

              <Link
                href={`/custom-request?artist=${artwork.artist.id}&ref=${encodeURIComponent(artwork.title)}`}
                className="border border-yellow-600/60 hover:border-yellow-400 hover:bg-yellow-500/10 text-yellow-400 py-4 px-6 rounded-lg font-semibold text-sm transition text-center flex items-center justify-center gap-2"
              >
                <span>🎨</span>
                <span>Request Custom Original</span>
              </Link>
            </div>

            {/* TABBED INFORMATION DRAWER */}
            <div className="border border-yellow-600/25 bg-neutral-900/60 rounded-xl overflow-hidden mb-6">
              <div className="flex border-b border-yellow-600/20 text-xs md:text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab("specs")}
                  className={`flex-1 py-3 px-4 text-center transition ${
                    activeTab === "specs"
                      ? "text-yellow-400 border-b-2 border-yellow-400 bg-neutral-900"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Artwork Specifications
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("policies")}
                  className={`flex-1 py-3 px-4 text-center transition ${
                    activeTab === "policies"
                      ? "text-yellow-400 border-b-2 border-yellow-400 bg-neutral-900"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Shipping & Returns
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("artist")}
                  className={`flex-1 py-3 px-4 text-center transition ${
                    activeTab === "artist"
                      ? "text-yellow-400 border-b-2 border-yellow-400 bg-neutral-900"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Artist Studio
                </button>
              </div>

              <div className="p-5 text-xs md:text-sm text-neutral-300">
                {activeTab === "specs" && (
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Medium & Surface</span>
                      <span className="text-white font-medium">{artwork.details.medium}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Dimensions</span>
                      <span className="text-white font-medium">{artwork.details.dimensions}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Regional Tradition</span>
                      <span className="text-white font-medium">{artwork.details.regionalTradition || "Indian Contemporary"}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Movement / Style</span>
                      <span className="text-white font-medium">{artwork.details.style || "Fine Art"}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Year Created</span>
                      <span className="text-white font-medium">{artwork.details.yearCreated}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Framing Status</span>
                      <span className="text-white font-medium">
                        {artwork.details.framed ? "Gallery Framed (Ready to Hang)" : "Unframed Stretched Canvas"}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Weight / Format</span>
                      <span className="text-white font-medium">{artwork.details.weight} ({artwork.type})</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Signature</span>
                      <span className="text-white font-medium">
                        {artwork.details.signed ? "Hand-signed by artist" : "Studio verified"}
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === "policies" && (
                  <div className="space-y-3 leading-relaxed">
                    <div>
                      <h4 className="text-white font-semibold text-xs mb-1">
                        📦 Transit Packaging & Direct Dispatch
                      </h4>
                      <p className="text-neutral-400 text-xs">
                        Dispatched directly from the artist&apos;s verified studio in <strong className="text-white">{artwork.shipping?.shipsFrom || "India"}</strong>. Every physical piece is wrapped in acid-free glassine, cushioned with protective corners, and secured in rigid transit packaging. Estimated delivery: {artwork.shipping?.estimatedDeliveryDays || 5} business days across India.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-yellow-600/15">
                      <h4 className="text-white font-semibold text-xs mb-1">
                        🛡️ 7-Day Collector Inspection Window
                      </h4>
                      <p className="text-neutral-400 text-xs">
                        Collectors enjoy a 7-day inspection period upon receipt. If the artwork arrives damaged in transit or is substantially different from its listing, contact concierge@kalasetu.art with photographic documentation for safe return and full resolution.
                      </p>
                      <Link
                        href="/policies"
                        className="inline-block mt-2.5 text-xs text-yellow-400 hover:text-yellow-300 font-semibold underline"
                      >
                        Read Full Marketplace Policies & Protection Guidelines →
                      </Link>
                    </div>
                  </div>
                )}

                {activeTab === "artist" && (
                  <div className="space-y-3">
                    <p className="text-neutral-300 text-xs leading-relaxed">
                      {artwork.artist.name} is an active, verified Indian master on Kala Setu with {artwork.artist.totalSales}+ pieces collected nationwide.
                    </p>
                    <div className="pt-2">
                      <Link
                        href={`/artists/${artwork.artist.id}`}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-yellow-400 hover:text-yellow-300 transition"
                      >
                        <span>Visit {artwork.artist.name}&apos;s Storefront & Studio Catalogue</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CURATOR'S NOTE / DESCRIPTION */}
            <div className="p-5 rounded-xl border border-yellow-600/20 bg-neutral-900/50">
              <h3 className="text-yellow-500 font-display text-base mb-2">Curator&apos;s Statement</h3>
              <p className="text-neutral-300 text-xs md:text-sm leading-relaxed">{artwork.description}</p>
            </div>
          </div>
        </div>

        {/* RELATED ARTWORKS SECTION */}
        {relatedArtworks.length > 0 && (
          <div className="mt-16 md:mt-24 border-t border-yellow-600/20 pt-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs uppercase tracking-widest text-yellow-500 mb-1 font-semibold">
                  Curated Recommendations
                </p>
                <h2 className="font-display text-2xl md:text-3xl text-white">
                  More Works from This Movement
                </h2>
              </div>
              <Link href="/explore" className="text-xs text-yellow-400 hover:underline">
                View Full Catalogue →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {relatedArtworks.map((rel) => (
                <ArtworkCard
                  key={rel.id}
                  artwork={rel}
                  onViewInRoom={(art) => setRoomModalArtwork(art)}
                />
              ))}
            </div>
          </div>
        )}

        {/* RECENTLY VIEWED ARTWORKS */}
        <RecentlyViewed
          currentArtworkId={artwork.id}
          onViewInRoom={(art) => setRoomModalArtwork(art)}
        />

        {/* ROOM STUDIO MODAL FOR RELATED/RECENT ARTWORKS */}
        <RoomModal
          artwork={roomModalArtwork}
          onClose={() => setRoomModalArtwork(null)}
        />

        {/* HIGH-RESOLUTION ZOOMABLE LIGHTBOX MODAL */}
        {isLightboxOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="High Resolution Artwork Inspection"
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
          >
            {/* LIGHTBOX TOP TOOLBAR */}
            <div className="absolute top-4 inset-x-6 flex items-center justify-between z-50">
              <div className="text-left">
                <h3 className="font-display text-white text-sm md:text-base font-semibold">{artwork.title}</h3>
                <p className="text-neutral-400 text-xs">by {artwork.artist.name} · {artwork.details.medium}</p>
              </div>

              <div className="flex items-center gap-3">
                {/* ZOOM CONTROLS */}
                <div className="bg-neutral-900 border border-yellow-600/40 rounded-lg p-1 flex items-center gap-1 text-xs">
                  <button
                    onClick={() => setLightboxZoom(1)}
                    className={`px-2.5 py-1 rounded ${lightboxZoom === 1 ? "bg-yellow-500 text-black font-bold" : "text-neutral-300 hover:text-white"}`}
                  >
                    1x
                  </button>
                  <button
                    onClick={() => setLightboxZoom(1.5)}
                    className={`px-2.5 py-1 rounded ${lightboxZoom === 1.5 ? "bg-yellow-500 text-black font-bold" : "text-neutral-300 hover:text-white"}`}
                  >
                    1.5x
                  </button>
                  <button
                    onClick={() => setLightboxZoom(2.5)}
                    className={`px-2.5 py-1 rounded ${lightboxZoom === 2.5 ? "bg-yellow-500 text-black font-bold" : "text-neutral-300 hover:text-white"}`}
                  >
                    2.5x Close-Up
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  className="text-neutral-300 hover:text-white text-xl p-2 rounded-full bg-neutral-900 border border-white/20 transition"
                  aria-label="Close image inspection"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ZOOMABLE IMAGE CONTAINER */}
            <div className="relative max-w-5xl max-h-[75vh] w-full h-full flex items-center justify-center overflow-auto mt-12 p-4">
              <img
                src={currentImage}
                alt={artwork.title}
                style={{
                  transform: `scale(${lightboxZoom})`,
                  transformOrigin: "center center",
                  transition: "transform 0.3s ease-out",
                }}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl border border-yellow-600/30"
              />
            </div>

            <p className="text-neutral-400 text-xs mt-3 text-center">
              Use controls above to inspect surface brushwork and texture detail · Press ESC or click ✕ to close
            </p>
          </div>
        )}
        {/* COLLECTOR VAULT / PRIVATE COLLECTIONS MODAL */}
        {showCollectionModal && (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-yellow-600/40 p-6 rounded-2xl max-w-md w-full shadow-2xl">
              <div className="flex justify-between items-center pb-3 mb-4 border-b border-yellow-600/20">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏛️</span>
                  <h3 className="font-display text-lg text-yellow-400 font-semibold">Collector Vault Collections</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCollectionModal(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-neutral-300 mb-4">
                Organize &ldquo;{artwork.title}&rdquo; into your private curatorial wishlists.
              </p>

              <div className="space-y-2 mb-5 max-h-52 overflow-y-auto pr-1">
                {collections.map((col) => {
                  const contains = col.artworkIds.includes(artwork.id);
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => toggleArtworkInCollection(col.id, artwork.id)}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition text-xs ${
                        contains
                          ? "bg-yellow-500/15 border-yellow-500/60 text-yellow-400"
                          : "bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-yellow-600/40"
                      }`}
                    >
                      <div>
                        <p className="font-semibold">{col.name}</p>
                        <p className="text-[10px] text-neutral-500">{col.artworkIds.length} pieces curated</p>
                      </div>
                      <span className="text-sm font-bold">{contains ? "✓ In Vault" : "+ Add"}</span>
                    </button>
                  );
                })}
              </div>

              {/* CREATE INLINE COLLECTION */}
              <div className="pt-3 border-t border-yellow-600/20">
                <label className="text-[10px] uppercase tracking-wider text-neutral-400 block mb-1">Create New Curated Collection</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Master Bedroom Sanctuary"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="flex-1 bg-black border border-yellow-600/30 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newCollectionName.trim()) return;
                      const newId = createCollection(newCollectionName.trim(), "Private collector wishlist");
                      toggleArtworkInCollection(newId, artwork.id);
                      setNewCollectionName("");
                    }}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  >
                    Create
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800 flex justify-between items-center text-xs">
                <Link href="/account?tab=collections" className="text-yellow-400/80 hover:text-yellow-400 underline text-[11px]">
                  Manage All Collections in Portal →
                </Link>
                <button
                  type="button"
                  onClick={() => setShowCollectionModal(false)}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded-lg text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function TrustBadge({ label }: { label: string }) {
  return (
    <span className="text-xs px-3 py-1.5 border border-yellow-600/40 text-yellow-400 rounded-full bg-neutral-900/90 font-medium">
      {label}
    </span>
  );
}