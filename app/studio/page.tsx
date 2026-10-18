"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { artworks as defaultArtworks, ArtworkArtist, ArtworkPricing, ArtworkDetails, ArtworkInventory } from "../data/artworks";
import { artists } from "../data/artists";

type ListingStatus = "published" | "draft" | "archived";

interface StudioListing {
  id: string;
  slug: string;
  title: string;
  artist: ArtworkArtist;
  pricing: ArtworkPricing;
  details: ArtworkDetails;
  images: string[];
  thumbnail: string;
  inventory: ArtworkInventory;
  listingStatus: ListingStatus;
  stockCount: number;
  editionType: "Original 1 of 1" | "Limited Print" | "Made to Order";
  createdAt: string;
}

interface StudioOrder {
  id: string;
  orderNumber: string;
  artworkTitle: string;
  artworkImage: string;
  amount: number;
  customerName: string;
  customerCity: string;
  orderDate: string;
  status: "Pending" | "Processing" | "Shipped" | "Delivered";
  trackingNumber?: string;
  courierName?: string;
}

interface CommissionInquiry {
  id: string;
  collectorName: string;
  collectorEmail: string;
  requestedMedium: string;
  approxDimensions: string;
  budgetRange: string;
  description: string;
  status: "New" | "Quoted" | "Accepted" | "Declined";
  quoteAmount?: number;
  date: string;
}

export default function KalaStudio() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"listings" | "orders" | "commissions" | "payouts" | "profile">("listings");

  // Matched artist profile
  const currentArtist = useMemo(() => {
    if (!user) return null;
    return artists.find((a) => a.id === "art-varshith" || a.name.toLowerCase().includes(user.email?.split("@")[0] || "")) || artists[0];
  }, [user]);

  // Storage keys scoped to authenticated artist
  const storagePrefix = user ? `kala_studio_${user.id}` : "kala_studio_guest";

  // Listings State
  const [listings, setListings] = useState<StudioListing[]>([]);
  const [editingListing, setEditingListing] = useState<StudioListing | null>(null);
  const [showListingModal, setShowListingModal] = useState(false);
  const [previewListing, setPreviewListing] = useState<StudioListing | null>(null);

  // Orders State
  const [orders, setOrders] = useState<StudioOrder[]>([]);
  const [selectedOrderForShipment, setSelectedOrderForShipment] = useState<StudioOrder | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [courierInput, setCourierInput] = useState("");

  // Commission inquiries
  const [commissions, setCommissions] = useState<CommissionInquiry[]>([]);
  const [quotingCommission, setQuotingCommission] = useState<CommissionInquiry | null>(null);
  const [quotePrice, setQuotePrice] = useState("");

  // New Listing Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Original Canvas");
  const [formMedium, setFormMedium] = useState("Oil & Acrylic on Canvas");
  const [formPrice, setFormPrice] = useState<number>(15000);
  const [formDimensions, setFormDimensions] = useState("30 x 40 cm");
  const [formStyle, setFormStyle] = useState("Traditional");
  const [formTradition, setFormTradition] = useState("Tanjore & Gold Leaf");
  const [formDesc, setFormDesc] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formEdition, setFormEdition] = useState<"Original 1 of 1" | "Limited Print" | "Made to Order">("Original 1 of 1");
  const [formStock, setFormStock] = useState<number>(1);
  const [imageError, setImageError] = useState("");

  // Restrict to artists only
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (role !== "artist") {
        router.push("/");
      }
    }
  }, [user, role, loading, router]);

  // Load state from localStorage or initialize with artist's catalog
  useEffect(() => {
    if (!user) return;
    try {
      const savedListings = localStorage.getItem(`${storagePrefix}_listings`);
      if (savedListings) {
        setListings(JSON.parse(savedListings));
      } else {
        const initialListings: StudioListing[] = defaultArtworks.slice(0, 5).map((a) => ({
          id: a.id,
          slug: a.slug,
          title: a.title,
          artist: a.artist,
          pricing: a.pricing,
          details: a.details,
          images: a.images,
          thumbnail: a.thumbnail,
          inventory: a.inventory,
          listingStatus: a.inventory.available ? "published" : "draft",
          stockCount: a.inventory.quantity || 1,
          editionType: a.inventory.limitedEdition ? "Limited Print" : "Original 1 of 1",
          createdAt: "2026-03-01",
        }));
        setListings(initialListings);
        localStorage.setItem(`${storagePrefix}_listings`, JSON.stringify(initialListings));
      }

      const savedOrders = localStorage.getItem(`${storagePrefix}_orders`);
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      } else {
        const initialOrders: StudioOrder[] = [
          {
            id: "ord-101",
            orderNumber: "KS-ORD-2026-904",
            artworkTitle: "Golden Heritage — Tanjore Majesty",
            artworkImage: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
            amount: 25000,
            customerName: "Radha Raman",
            customerCity: "Bengaluru, Karnataka",
            orderDate: "2026-03-14",
            status: "Processing",
          },
          {
            id: "ord-102",
            orderNumber: "KS-ORD-2026-881",
            artworkTitle: "Sacred Ghats at Dusk",
            artworkImage: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&auto=format&fit=crop&q=80",
            amount: 18500,
            customerName: "Amitabh Sen",
            customerCity: "Kolkata, West Bengal",
            orderDate: "2026-02-28",
            status: "Shipped",
            trackingNumber: "DTDC-BLR-892410",
            courierName: "DTDC Fine Art Courier",
          },
        ];
        setOrders(initialOrders);
        localStorage.setItem(`${storagePrefix}_orders`, JSON.stringify(initialOrders));
      }

      const savedCommissions = localStorage.getItem(`${storagePrefix}_commissions`);
      if (savedCommissions) {
        setCommissions(JSON.parse(savedCommissions));
      } else {
        const initialCommissions: CommissionInquiry[] = [
          {
            id: "comm-01",
            collectorName: "Meenakshi Sundaram",
            collectorEmail: "m.sundaram@heritage.in",
            requestedMedium: "Natural Pigment on Handmade Canvas",
            approxDimensions: "48 x 36 inches",
            budgetRange: "₹ 45,000 - ₹ 60,000",
            description: "Commission for living room sanctum depicting Navadurga motifs with subtle gold foiling.",
            status: "New",
            date: "2026-03-16",
          },
        ];
        setCommissions(initialCommissions);
        localStorage.setItem(`${storagePrefix}_commissions`, JSON.stringify(initialCommissions));
      }
    } catch {
      // Fallback gracefully
    }
  }, [user, storagePrefix]);

  const saveListings = (updated: StudioListing[]) => {
    setListings(updated);
    try {
      localStorage.setItem(`${storagePrefix}_listings`, JSON.stringify(updated));
    } catch {}
  };

  const saveOrders = (updated: StudioOrder[]) => {
    setOrders(updated);
    try {
      localStorage.setItem(`${storagePrefix}_orders`, JSON.stringify(updated));
    } catch {}
  };

  const saveCommissions = (updated: CommissionInquiry[]) => {
    setCommissions(updated);
    try {
      localStorage.setItem(`${storagePrefix}_commissions`, JSON.stringify(updated));
    } catch {}
  };

  // Image Upload with format & size validation
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setImageError("Only JPEG, PNG, or WebP artwork images are permitted.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setImageError("Image file size must not exceed 15MB for studio uploads.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Open Create/Edit modal
  const openCreateModal = () => {
    setEditingListing(null);
    setFormTitle("");
    setFormCategory("Original Canvas");
    setFormMedium("Oil & Acrylic on Canvas");
    setFormPrice(15000);
    setFormDimensions("30 x 40 cm");
    setFormStyle("Traditional");
    setFormTradition("Tanjore & Gold Leaf");
    setFormDesc("");
    setFormImage("");
    setFormEdition("Original 1 of 1");
    setFormStock(1);
    setImageError("");
    setShowListingModal(true);
  };

  const openEditModal = (item: StudioListing) => {
    setEditingListing(item);
    setFormTitle(item.title);
    setFormCategory(item.details.category);
    setFormMedium(item.details.medium);
    setFormPrice(item.pricing.amount);
    setFormDimensions(item.details.dimensions || "30 x 40 cm");
    setFormStyle(item.details.style || "Traditional");
    setFormTradition(item.details.regionalTradition || "Tanjore & Gold Leaf");
    setFormDesc(item.details.framed ? "Framed in authentic teak" : "");
    setFormImage(item.images[0] || item.thumbnail);
    setFormEdition(item.editionType || "Original 1 of 1");
    setFormStock(item.stockCount || 1);
    setImageError("");
    setShowListingModal(true);
  };

  // Submit Listing Form
  const handleSaveListing = (statusToSet: ListingStatus) => {
    if (!formTitle.trim()) {
      alert("Please provide an artwork title.");
      return;
    }
    if (!formPrice || formPrice <= 0) {
      alert("Please specify a valid price in INR.");
      return;
    }
    if (!formImage) {
      alert("Please upload or provide an image for the artwork.");
      return;
    }

    if (editingListing) {
      const updated = listings.map((item) =>
        item.id === editingListing.id
          ? {
              ...item,
              title: formTitle.trim(),
              images: [formImage, ...item.images.slice(1)],
              thumbnail: formImage,
              listingStatus: statusToSet,
              editionType: formEdition,
              stockCount: Number(formStock),
              inventory: {
                ...item.inventory,
                available: Number(formStock) > 0 && statusToSet === "published",
                quantity: Number(formStock),
                limitedEdition: formEdition !== "Original 1 of 1",
              },
              pricing: {
                ...item.pricing,
                amount: Number(formPrice),
              },
              details: {
                ...item.details,
                category: formCategory,
                medium: formMedium,
                dimensions: formDimensions,
                style: formStyle,
                regionalTradition: formTradition,
                framed: formDesc.includes("Framed"),
                signed: true,
              },
            }
          : item
      );
      saveListings(updated);
    } else {
      const newListing: StudioListing = {
        id: `art-studio-${Date.now()}`,
        slug: formTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        title: formTitle.trim(),
        artist: {
          id: currentArtist?.id || "art-varshith",
          name: currentArtist?.name || "Verified Artist",
          verified: true,
          rating: 5.0,
          totalSales: 1,
        },
        pricing: {
          amount: Number(formPrice),
          currency: "INR",
          discountPercentage: 0,
          isOnSale: false,
        },
        details: {
          category: formCategory,
          medium: formMedium,
          dimensions: formDimensions,
          yearCreated: 2026,
          weight: "1.5 kg",
          framed: formDesc.includes("Framed"),
          signed: true,
          style: formStyle,
          regionalTradition: formTradition,
          roomSuitability: ["Living Room", "Study"],
          mood: ["Serene & Devotional"],
        },
        images: [formImage],
        thumbnail: formImage,
        inventory: {
          available: Number(formStock) > 0 && statusToSet === "published",
          quantity: Number(formStock),
          limitedEdition: formEdition !== "Original 1 of 1",
        },
        listingStatus: statusToSet,
        editionType: formEdition,
        stockCount: Number(formStock),
        createdAt: new Date().toISOString().split("T")[0],
      };
      saveListings([newListing, ...listings]);
    }

    setShowListingModal(false);
  };

  // Listing Status Changes (Publish, Unpublish, Archive)
  const setListingStatus = (id: string, newStatus: ListingStatus) => {
    const updated = listings.map((l) =>
      l.id === id
        ? {
            ...l,
            listingStatus: newStatus,
            inventory: {
              ...l.inventory,
              available: newStatus === "published" && l.stockCount > 0,
            },
          }
        : l
    );
    saveListings(updated);
  };

  // Order Fulfillment Status Transition (Strict authorized order)
  const handleTransitionOrder = (order: StudioOrder, targetStatus: "Processing" | "Shipped" | "Delivered") => {
    // Enforce valid transitions
    if (order.status === "Pending" && targetStatus !== "Processing") {
      alert("Orders must transition from 'Pending' to 'Processing' first for packaging and verification.");
      return;
    }
    if (order.status === "Processing" && targetStatus !== "Shipped") {
      alert("Orders in processing can only transition to 'Shipped' once dispatched with courier details.");
      return;
    }
    if (order.status === "Shipped" && targetStatus !== "Delivered") {
      alert("Shipped orders can only be marked 'Delivered' upon confirmation of delivery.");
      return;
    }

    if (targetStatus === "Shipped") {
      setSelectedOrderForShipment(order);
      setTrackingInput("");
      setCourierInput("");
      return;
    }

    const updated = orders.map((o) => (o.id === order.id ? { ...o, status: targetStatus } : o));
    saveOrders(updated);
  };

  const handleConfirmShipment = () => {
    if (!selectedOrderForShipment) return;
    if (!trackingInput.trim()) {
      alert("Please enter a dispatch tracking number.");
      return;
    }

    const updated = orders.map((o) =>
      o.id === selectedOrderForShipment.id
        ? {
            ...o,
            status: "Shipped" as const,
            trackingNumber: trackingInput.trim(),
            courierName: courierInput.trim() || "Dedicated Fine Art Logistics",
          }
        : o
    );
    saveOrders(updated);
    setSelectedOrderForShipment(null);
  };

  // Commission workflow
  const handleCommissionQuote = () => {
    if (!quotingCommission || !quotePrice) return;
    const numPrice = Number(quotePrice);
    if (isNaN(numPrice) || numPrice <= 0) {
      alert("Please enter a valid price quote in INR.");
      return;
    }

    const updated = commissions.map((c) =>
      c.id === quotingCommission.id ? { ...c, status: "Quoted" as const, quoteAmount: numPrice } : c
    );
    saveCommissions(updated);
    setQuotingCommission(null);
    setQuotePrice("");
  };

  const handleCommissionAction = (id: string, action: "Accepted" | "Declined") => {
    const updated = commissions.map((c) => (c.id === id ? { ...c, status: action } : c));
    saveCommissions(updated);
  };

  // Genuine metrics computed from real local data
  const publishedCount = listings.filter((l) => l.listingStatus === "published").length;
  const draftCount = listings.filter((l) => l.listingStatus === "draft").length;
  const totalCatalogueValue = listings
    .filter((l) => l.listingStatus === "published")
    .reduce((sum, l) => sum + l.pricing.amount * (l.stockCount || 1), 0);
  const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
  const pendingOrdersCount = orders.filter((o) => o.status === "Pending" || o.status === "Processing").length;

  // Transparent Fee Calculator (Etsy inspired: 15% Kala Setu Platform Commission, 2% Payment Gateway)
  const calcPlatformFee = (p: number) => Math.round(p * 0.15);
  const calcGatewayFee = (p: number) => Math.round(p * 0.02);
  const calcNetEarnings = (p: number) => p - calcPlatformFee(p) - calcGatewayFee(p);

  if (loading || role !== "artist" || !user) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-yellow-500 font-display text-xl tracking-widest">Accessing Kala Studio Atelier...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-5 md:px-14 py-10 md:py-16 selection:bg-yellow-500/30 selection:text-yellow-200">
      <div className="max-w-7xl mx-auto">
        {/* HEADER BAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-8 mb-8 border-b border-yellow-600/20 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-yellow-500 text-xs uppercase tracking-widest font-semibold">
                Kala Setu Creator Atelier
              </span>
              <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-medium">
                Verified Master Artist
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl text-white">
              Studio Dashboard — <span className="text-yellow-400">{currentArtist?.name || user.email}</span>
            </h1>
            <p className="text-neutral-400 text-xs md:text-sm mt-1">
              Independent seller hub · Direct studio inventory, fulfillment & genuine commission workflows.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/artists/${currentArtist?.id || "art-varshith"}`}
              className="text-xs text-neutral-300 hover:text-yellow-400 border border-yellow-600/30 hover:border-yellow-500 px-4 py-2.5 rounded-lg transition"
            >
              View Public Storefront ↗
            </Link>
            <button
              onClick={openCreateModal}
              className="bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-2.5 font-bold rounded-lg transition text-xs shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:shadow-[0_0_25px_rgba(234,179,8,0.5)] flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Publish Artwork</span>
            </button>
          </div>
        </div>

        {/* GENUINE METRICS OVERVIEW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-neutral-900/80 border border-yellow-600/25 p-5 rounded-2xl">
            <p className="text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Live Catalogue Value</p>
            <p className="font-display text-2xl md:text-3xl text-yellow-400 font-bold">
              ₹ {totalCatalogueValue.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-neutral-500 mt-1">{publishedCount} active works listed</p>
          </div>

          <div className="bg-neutral-900/80 border border-yellow-600/25 p-5 rounded-2xl">
            <p className="text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Gross Realized Sales</p>
            <p className="font-display text-2xl md:text-3xl text-white font-bold">
              ₹ {totalRevenue.toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-emerald-400 mt-1">{orders.length} orders processed</p>
          </div>

          <div className="bg-neutral-900/80 border border-yellow-600/25 p-5 rounded-2xl">
            <p className="text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Awaiting Fulfillment</p>
            <p className="font-display text-2xl md:text-3xl text-yellow-500 font-bold">
              {pendingOrdersCount}
            </p>
            <p className="text-[10px] text-neutral-500 mt-1">Requires studio packing or dispatch</p>
          </div>

          <div className="bg-neutral-900/80 border border-yellow-600/25 p-5 rounded-2xl">
            <p className="text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Active Commissions</p>
            <p className="font-display text-2xl md:text-3xl text-white font-bold">
              {commissions.length}
            </p>
            <p className="text-[10px] text-neutral-500 mt-1">Direct collector inquiries</p>
          </div>
        </div>

        {/* STUDIO TABS */}
        <div className="flex overflow-x-auto gap-2 border-b border-yellow-600/20 pb-px mb-8 scrollbar-none">
          {[
            { id: "listings", label: `Artwork Listings (${listings.length})`, icon: "🖼️" },
            { id: "orders", label: `Orders & Fulfillment (${orders.length})`, icon: "📦" },
            { id: "commissions", label: `Commission Requests (${commissions.length})`, icon: "✨" },
            { id: "payouts", label: "Transparent Fee Calculator", icon: "⚖️" },
            { id: "profile", label: "Studio Atelier Settings", icon: "⚙️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 text-xs md:text-sm font-semibold rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-yellow-500 text-black shadow-lg"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: LISTINGS MANAGEMENT */}
        {activeTab === "listings" && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
              <div>
                <h2 className="font-display text-xl text-white">Catalogue & Inventory Control</h2>
                <p className="text-neutral-400 text-xs">
                  Create, preview, edit, publish, unpublish, and manage stock counts for your artworks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">
                  {publishedCount} Published · {draftCount} Drafts · {listings.length - publishedCount - draftCount} Archived
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {listings.map((item) => (
                <div
                  key={item.id}
                  className="bg-neutral-900/80 border border-yellow-600/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 hover:border-yellow-600/40 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-neutral-950 border border-yellow-600/30 shrink-0">
                      <Image src={item.images[0] || item.thumbnail} alt={item.title} fill className="object-cover" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                            item.listingStatus === "published"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : item.listingStatus === "draft"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                          }`}
                        >
                          {item.listingStatus}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {item.editionType || "Original 1 of 1"} · Stock: {item.stockCount}
                        </span>
                      </div>

                      <h3 className="font-display text-base text-white font-semibold">{item.title}</h3>
                      <p className="text-xs text-neutral-400">
                        {item.details.medium} · {item.details.dimensions || "Format not set"}
                      </p>
                      <p className="text-xs text-yellow-500 font-semibold mt-1">
                        List Price: ₹ {item.pricing.amount.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end border-t md:border-t-0 border-yellow-600/15 pt-3 md:pt-0">
                    <button
                      onClick={() => setPreviewListing(item)}
                      className="text-xs text-neutral-300 hover:text-white border border-neutral-700 hover:border-yellow-600/50 px-3 py-1.5 rounded-lg transition"
                    >
                      👁️ Preview
                    </button>

                    <button
                      onClick={() => openEditModal(item)}
                      className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-600/30 hover:border-yellow-500 px-3 py-1.5 rounded-lg transition"
                    >
                      ✏️ Edit
                    </button>

                    {item.listingStatus === "published" ? (
                      <button
                        onClick={() => setListingStatus(item.id, "draft")}
                        className="text-xs text-neutral-400 hover:text-amber-400 border border-neutral-700 hover:border-amber-500/50 px-3 py-1.5 rounded-lg transition"
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        onClick={() => setListingStatus(item.id, "published")}
                        className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition"
                      >
                        Publish to Marketplace
                      </button>
                    )}

                    {item.listingStatus !== "archived" && (
                      <button
                        onClick={() => setListingStatus(item.id, "archived")}
                        className="text-xs text-neutral-500 hover:text-red-400 border border-neutral-800 hover:border-red-500/40 px-2.5 py-1.5 rounded-lg transition"
                        title="Archive listing"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS & FULFILLMENT */}
        {activeTab === "orders" && (
          <div>
            <div className="mb-6">
              <h2 className="font-display text-xl text-white">Artist Order Fulfillment & Tracking</h2>
              <p className="text-neutral-400 text-xs">
                Manage order state transitions strictly: Pending → Processing (Archival Packaging) → Shipped (Dispatched with Tracking) → Delivered.
              </p>
            </div>

            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-neutral-900/80 border border-yellow-600/25 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-neutral-950 border border-yellow-600/30 shrink-0">
                      <Image src={order.artworkImage} alt={order.artworkTitle} fill className="object-cover" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-yellow-500">{order.orderNumber}</span>
                        <span className="text-xs text-neutral-500">· {order.orderDate}</span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            order.status === "Delivered"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : order.status === "Shipped"
                              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                              : order.status === "Processing"
                              ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                              : "bg-neutral-800 text-neutral-300 border border-neutral-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <h3 className="font-display text-base text-white font-semibold">{order.artworkTitle}</h3>
                      <p className="text-xs text-neutral-400">
                        Collector: <span className="text-neutral-200">{order.customerName}</span> ({order.customerCity})
                      </p>
                      <p className="text-xs text-yellow-400 font-semibold mt-1">
                        Acquisition Value: ₹ {order.amount.toLocaleString("en-IN")}
                      </p>

                      {order.trackingNumber && (
                        <p className="text-xs font-mono text-cyan-400 mt-2 bg-cyan-950/40 border border-cyan-800/40 px-2 py-1 rounded inline-block">
                          Tracking: {order.courierName} — {order.trackingNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* AUTHORIZED TRANSITIONS BUTTONS */}
                  <div className="flex flex-col sm:flex-row gap-2 self-stretch md:self-auto justify-end">
                    {order.status === "Pending" && (
                      <button
                        onClick={() => handleTransitionOrder(order, "Processing")}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg text-xs transition"
                      >
                        Start Archival Packaging →
                      </button>
                    )}

                    {order.status === "Processing" && (
                      <button
                        onClick={() => handleTransitionOrder(order, "Shipped")}
                        className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-2 rounded-lg text-xs transition"
                      >
                        Dispatch & Add Tracking →
                      </button>
                    )}

                    {order.status === "Shipped" && (
                      <button
                        onClick={() => handleTransitionOrder(order, "Delivered")}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded-lg text-xs transition"
                      >
                        Mark Confirmed Delivered ✓
                      </button>
                    )}

                    {order.status === "Delivered" && (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <span>✓</span> Order Fully Complete
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: COMMISSION INQUIRIES WORKFLOW */}
        {activeTab === "commissions" && (
          <div>
            <div className="mb-6">
              <h2 className="font-display text-xl text-white">Collector Commission Requests</h2>
              <p className="text-neutral-400 text-xs">
                Review bespoke inquiries, discuss bespoke dimensions and motifs, and issue formal price quotes.
              </p>
            </div>

            <div className="space-y-4">
              {commissions.map((comm) => (
                <div
                  key={comm.id}
                  className="bg-neutral-900/80 border border-yellow-600/25 rounded-2xl p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-yellow-600/15 gap-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-yellow-500 font-semibold">
                        Inquiry Received: {comm.date}
                      </span>
                      <h3 className="font-display text-lg text-white font-semibold">
                        From: {comm.collectorName} ({comm.collectorEmail})
                      </h3>
                    </div>

                    <span
                      className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                        comm.status === "Accepted"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                          : comm.status === "Quoted"
                          ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/40"
                          : comm.status === "Declined"
                          ? "bg-red-500/15 text-red-400 border-red-500/40"
                          : "bg-yellow-500/15 text-yellow-400 border-yellow-500/40"
                      }`}
                    >
                      Status: {comm.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
                    <div>
                      <p className="text-neutral-500 uppercase tracking-wider text-[10px]">Medium Requested</p>
                      <p className="text-neutral-200 mt-0.5">{comm.requestedMedium}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 uppercase tracking-wider text-[10px]">Dimensions</p>
                      <p className="text-neutral-200 mt-0.5">{comm.approxDimensions}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 uppercase tracking-wider text-[10px]">Collector Budget</p>
                      <p className="text-yellow-400 font-semibold mt-0.5">{comm.budgetRange}</p>
                    </div>
                  </div>

                  <div className="bg-black/60 border border-yellow-600/20 p-4 rounded-xl mb-4 text-xs text-neutral-300 leading-relaxed">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Collector Brief:</p>
                    {comm.description}
                  </div>

                  {comm.quoteAmount && (
                    <div className="mb-4 text-xs text-cyan-400 font-semibold">
                      Formal Quote Provided: ₹ {comm.quoteAmount.toLocaleString("en-IN")}
                    </div>
                  )}

                  {/* COMMISSION ACTIONS */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {comm.status === "New" && (
                      <>
                        <button
                          onClick={() => setQuotingCommission(comm)}
                          className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg text-xs transition"
                        >
                          Provide Studio Price Quote
                        </button>
                        <button
                          onClick={() => handleCommissionAction(comm.id, "Declined")}
                          className="border border-neutral-700 hover:border-red-500 text-neutral-400 hover:text-red-400 px-4 py-2 rounded-lg text-xs transition"
                        >
                          Decline Request
                        </button>
                      </>
                    )}

                    {comm.status === "Quoted" && (
                      <button
                        onClick={() => handleCommissionAction(comm.id, "Accepted")}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded-lg text-xs transition"
                      >
                        Accept & Begin Canvas Preparation ✓
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: TRANSPARENT FEE CALCULATOR (ETSY INSPIRED) */}
        {activeTab === "payouts" && (
          <div className="max-w-3xl bg-neutral-900/80 border border-yellow-600/25 rounded-2xl p-6 sm:p-8">
            <h2 className="font-display text-2xl text-yellow-400 mb-2">
              Transparent Creator Economics & Commission Calculator
            </h2>
            <p className="text-neutral-400 text-xs mb-8 leading-relaxed">
              Kala Setu believes in total pricing transparency. We charge a flat 15% platform commission to support white-glove curation, secure escrow, and global marketing. Payment gateway processing is charged at actual cost (2%). No hidden listing fees.
            </p>

            <div className="bg-black/80 border border-yellow-600/30 rounded-xl p-6 mb-8">
              <label htmlFor="calculator-price" className="text-xs uppercase tracking-wider text-neutral-400 block mb-2 font-semibold">
                Test Artwork List Price (₹ INR):
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="calculator-price"
                  type="number"
                  min="1000"
                  step="500"
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  className="bg-neutral-900 border border-yellow-600/40 rounded-lg px-4 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-yellow-400 w-48"
                />
                <span className="text-xs text-neutral-400">Change price to inspect real-time payout deduction</span>
              </div>
            </div>

            <div className="space-y-3 text-sm border-t border-yellow-600/15 pt-6">
              <div className="flex justify-between items-center py-2 border-b border-yellow-600/10">
                <span className="text-neutral-300">Gross Artwork Sale Price:</span>
                <span className="text-white font-mono font-semibold">₹ {formPrice.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-yellow-600/10">
                <div>
                  <p className="text-neutral-300">Kala Setu Platform Commission (15%):</p>
                  <p className="text-[10px] text-neutral-500">Includes global collector curation, escrow, and marketing</p>
                </div>
                <span className="text-amber-400 font-mono">- ₹ {calcPlatformFee(formPrice).toLocaleString("en-IN")}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-yellow-600/10">
                <div>
                  <p className="text-neutral-300">Razorpay Payment Gateway Fee (2%):</p>
                  <p className="text-[10px] text-neutral-500">Direct banking & UPI transaction clearance</p>
                </div>
                <span className="text-amber-400 font-mono">- ₹ {calcGatewayFee(formPrice).toLocaleString("en-IN")}</span>
              </div>

              <div className="flex justify-between items-center py-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 mt-4">
                <div>
                  <p className="text-yellow-400 font-bold text-base">Net Creator Take-Home Payout:</p>
                  <p className="text-[10px] text-neutral-400">Transferred automatically via NEFT/UPI within 3 days of delivery</p>
                </div>
                <span className="text-yellow-400 font-mono font-bold text-xl">
                  ₹ {calcNetEarnings(formPrice).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STUDIO ATELIER SETTINGS */}
        {activeTab === "profile" && (
          <div className="max-w-2xl bg-neutral-900/80 border border-yellow-600/25 rounded-2xl p-6 sm:p-8">
            <h2 className="font-display text-xl text-white mb-2">Studio Atelier Profile & Payout Details</h2>
            <p className="text-neutral-400 text-xs mb-6">
              Manage your public artist identity and registered payment routing account.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-neutral-400 uppercase tracking-wider text-[10px] block mb-1">Artist Name</label>
                <input
                  type="text"
                  readOnly
                  value={currentArtist?.name || ""}
                  className="w-full bg-black/60 border border-neutral-700 rounded-lg p-2.5 text-neutral-300"
                />
              </div>

              <div>
                <label className="text-neutral-400 uppercase tracking-wider text-[10px] block mb-1">Studio Atelier Location</label>
                <input
                  type="text"
                  readOnly
                  value={currentArtist?.studioLocation || currentArtist?.location || "Chennai, Tamil Nadu"}
                  className="w-full bg-black/60 border border-neutral-700 rounded-lg p-2.5 text-neutral-300"
                />
              </div>

              <div>
                <label className="text-neutral-400 uppercase tracking-wider text-[10px] block mb-1">Artistic Statement</label>
                <textarea
                  readOnly
                  rows={4}
                  value={currentArtist?.artisticPractice || ""}
                  className="w-full bg-black/60 border border-neutral-700 rounded-lg p-2.5 text-neutral-300 leading-relaxed"
                />
              </div>

              <div className="pt-4 border-t border-yellow-600/15">
                <p className="text-yellow-400 font-semibold mb-2">Payout Routing Verification</p>
                <div className="p-3 bg-neutral-950 border border-yellow-600/20 rounded-lg text-neutral-400 text-[11px] space-y-1">
                  <p>Bank: HDFC Bank Limited (Verified IFSC: HDFC0001824)</p>
                  <p>Beneficiary: {currentArtist?.name}</p>
                  <p>UPI ID: kala.{currentArtist?.id}@okhdfcbank (Active Escrow Link)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CREATE / EDIT LISTING */}
        {showListingModal && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-neutral-900 border border-yellow-600/40 p-6 sm:p-8 rounded-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-yellow-600/20">
                <h3 className="font-display text-xl text-yellow-400">
                  {editingListing ? "Edit Artwork Listing" : "Publish New Artwork Listing"}
                </h3>
                <button onClick={() => setShowListingModal(false)} className="text-neutral-400 hover:text-white">✕</button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label htmlFor="listing-title" className="text-neutral-400 uppercase tracking-wider text-[10px] block mb-1 font-semibold">
                    Artwork Title *
                  </label>
                  <input
                    id="listing-title"
                    type="text"
                    required
                    placeholder="e.g. Dawn over the Ghats"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-black border border-yellow-600/30 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="listing-category" className="text-neutral-400 uppercase tracking-wider text-[10px] block mb-1 font-semibold">
                      Category *
                    </label>
                    <select
                      id="listing-category"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-black border border-yellow-600/30 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-500"
                    >
                      <option value="Original Canvas">Original Canvas</option>
                      <option value="Tanjore Gold Foil">Tanjore Gold Foil</option>
                      <option value="Folk & Tribal Art">Folk & Tribal Art</option>
                      <option value="Ceramics & Sculpture">Ceramics & Sculpture</option>
                      <option value="Limited Fine Art Print">Limited Fine Art Print</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="listing-medium" className="text-neutral-400 uppercase tracking-wider text-[10px] block mb-1 font-semibold">
                      Medium *
                    </label>
                    <input
                      id="listing-medium"
                      type="text"
                      placeholder="e.g. 24K Gold Leaf & Natural Pigments on Teak"
                      value={formMedium}
                      onChange={(e) => setFormMedium(e.target.value)}
                      className="w-full bg-black border border-yellow-600/30 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="listing-price" className="text-neutral-400 uppercase tracking-wider text-[10px] block mb-1 font-semibold">
                      Price (₹ INR) *
                    </label>
                    <input
                      id="listing-price"
                      type="number"
                      required
                      min="500"
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      className="w-full bg-black border border-yellow-600/30 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="listing-dimensions" className="text-neutral-400 uppercase tracking-wider text-[10px] block mb-1 font-semibold">
                      Dimensions (H x W) *
                    </label>
                    <input
                      id="listing-dimensions"
                      type="text"
                      placeholder="e.g. 60 x 45 cm"
                      value={formDimensions}
                      onChange={(e) => setFormDimensions(e.target.value)}
                      className="w-full bg-black border border-yellow-600/30 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="listing-edition" className="text-neutral-400 uppercase tracking-wider text-[10px] block mb-1 font-semibold">
                      Edition Type
                    </label>
                    <select
                      id="listing-edition"
                      value={formEdition}
                      onChange={(e) => setFormEdition(e.target.value as typeof formEdition)}
                      className="w-full bg-black border border-yellow-600/30 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-500"
                    >
                      <option value="Original 1 of 1">Original 1 of 1</option>
                      <option value="Limited Print">Limited Print</option>
                      <option value="Made to Order">Made to Order</option>
                    </select>
                  </div>
                </div>

                {/* REAL-TIME COMMISSION CALCULATOR INSIDE FORM */}
                <div className="p-3 bg-black border border-yellow-600/20 rounded-xl text-[11px]">
                  <div className="flex justify-between text-neutral-400">
                    <span>Platform Commission (15%): -₹ {calcPlatformFee(formPrice)}</span>
                    <span>Payment Fee (2%): -₹ {calcGatewayFee(formPrice)}</span>
                    <span className="text-yellow-400 font-semibold">Net Payout: ₹ {calcNetEarnings(formPrice)}</span>
                  </div>
                </div>

                {/* IMAGE UPLOAD & VALIDATION */}
                <div>
                  <label className="text-neutral-400 uppercase tracking-wider text-[10px] block mb-1 font-semibold">
                    High-Resolution Artwork Photograph *
                  </label>
                  <div className="border border-dashed border-yellow-600/30 bg-black/60 rounded-xl p-4 text-center">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageFileChange}
                      className="text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-yellow-500 file:text-black hover:file:bg-yellow-400 cursor-pointer"
                    />
                    <p className="text-[10px] text-neutral-500 mt-2">Accepted formats: JPG, PNG, WebP (Max 15MB)</p>
                    {imageError && <p className="text-xs text-red-400 mt-1">{imageError}</p>}
                  </div>

                  {formImage && (
                    <div className="mt-3 flex items-center gap-3 bg-neutral-950 p-2 rounded-lg border border-yellow-600/20">
                      <div className="relative w-12 h-12 rounded overflow-hidden">
                        <Image src={formImage} alt="Preview" fill className="object-cover" />
                      </div>
                      <span className="text-xs text-emerald-400">✓ Image loaded & verified</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-yellow-600/20">
                  <button
                    onClick={() => setShowListingModal(false)}
                    className="flex-1 border border-neutral-700 text-neutral-300 py-2.5 rounded-lg hover:bg-neutral-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveListing("draft")}
                    className="flex-1 border border-yellow-600/40 text-yellow-400 py-2.5 rounded-lg hover:bg-yellow-500/10 transition"
                  >
                    Save as Draft
                  </button>
                  <button
                    onClick={() => handleSaveListing("published")}
                    className="flex-1 bg-yellow-500 text-black font-semibold py-2.5 rounded-lg hover:bg-yellow-400 transition shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                  >
                    Publish to Storefront
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: PREVIEW LISTING */}
        {previewListing && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-yellow-600/40 p-6 rounded-2xl max-w-lg w-full">
              <div className="flex justify-between items-center pb-3 mb-4 border-b border-yellow-600/20">
                <span className="text-xs uppercase tracking-wider text-yellow-500 font-semibold">Collector View Preview</span>
                <button onClick={() => setPreviewListing(null)} className="text-neutral-400 hover:text-white">✕</button>
              </div>

              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black mb-4">
                <Image src={previewListing.images[0] || previewListing.thumbnail} alt={previewListing.title} fill className="object-cover" />
              </div>

              <h3 className="font-display text-xl text-white mb-1">{previewListing.title}</h3>
              <p className="text-xs text-neutral-400 mb-2">
                By {previewListing.artist.name} · {previewListing.details.medium}
              </p>
              <p className="text-lg font-bold text-yellow-400 mb-4">
                ₹ {previewListing.pricing.amount.toLocaleString("en-IN")}
              </p>

              <button
                onClick={() => setPreviewListing(null)}
                className="w-full bg-neutral-800 text-white py-2 rounded-lg text-xs hover:bg-neutral-700 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}

        {/* MODAL: DISPATCH ORDER WITH TRACKING */}
        {selectedOrderForShipment && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-cyan-500/40 p-6 rounded-2xl max-w-md w-full">
              <h3 className="font-display text-xl text-cyan-400 mb-2">Mark Order as Dispatched</h3>
              <p className="text-neutral-400 text-xs mb-4">
                Provide courier and tracking details for order {selectedOrderForShipment.orderNumber}.
              </p>

              <div className="space-y-3 text-xs mb-5">
                <div>
                  <label htmlFor="shipment-courier" className="text-neutral-400 block mb-1">Courier Service</label>
                  <input
                    id="shipment-courier"
                    type="text"
                    placeholder="e.g. DTDC Fine Art Logistics / BlueDart"
                    value={courierInput}
                    onChange={(e) => setCourierInput(e.target.value)}
                    className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-white"
                  />
                </div>

                <div>
                  <label htmlFor="shipment-tracking" className="text-neutral-400 block mb-1">Tracking Number *</label>
                  <input
                    id="shipment-tracking"
                    type="text"
                    required
                    placeholder="e.g. DTDC-BLR-892410"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedOrderForShipment(null)}
                  className="flex-1 border border-neutral-700 text-neutral-300 py-2 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmShipment}
                  className="flex-1 bg-cyan-500 text-black font-semibold py-2 rounded-lg text-xs hover:bg-cyan-400 transition"
                >
                  Confirm Shipment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: COMMISSION PRICE QUOTE */}
        {quotingCommission && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-yellow-600/40 p-6 rounded-2xl max-w-md w-full">
              <h3 className="font-display text-xl text-yellow-400 mb-2">Issue Commission Price Quote</h3>
              <p className="text-neutral-400 text-xs mb-4">
                Collector {quotingCommission.collectorName} requested: &quot;{quotingCommission.requestedMedium}&quot;.
              </p>

              <div className="mb-4">
                <label htmlFor="quote-price" className="text-neutral-400 text-xs block mb-1">Proposed Price (₹ INR) *</label>
                <input
                  id="quote-price"
                  type="number"
                  placeholder="e.g. 50000"
                  value={quotePrice}
                  onChange={(e) => setQuotePrice(e.target.value)}
                  className="w-full bg-black border border-yellow-600/30 rounded-lg p-2.5 text-white font-mono text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setQuotingCommission(null)}
                  className="flex-1 border border-neutral-700 text-neutral-300 py-2 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommissionQuote}
                  className="flex-1 bg-yellow-500 text-black font-semibold py-2 rounded-lg text-xs hover:bg-yellow-400 transition"
                >
                  Send Formal Quote
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
