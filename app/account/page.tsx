"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";
import { useCollector, NamedCollection, SavedAddress } from "../context/CollectorContext";
import { supabase } from "../lib/supabaseClient";
import { artworks, Artwork } from "../data/artworks";
import { artists } from "../data/artists";

interface OrderItem {
  id?: string;
  title: string;
  quantity?: number;
  pricing?: {
    amount: number;
    currency?: string;
  };
  image?: string;
  reconciliation_required?: boolean;
}

interface OrderRecord {
  id: string;
  order_ref: string;
  items: OrderItem[];
  total: number;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  payment_id?: string;
  razorpay_payment_id?: string;
  status?: string;
  payment_status?: string;
  created_at: string;
}

function AccountContent() {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const {
    collections,
    createCollection,
    deleteCollection,
    removeFromCollection,
    followedArtists,
    toggleFollowArtist,
    savedSearches,
    removeSavedSearch,
    addresses,
    addAddress,
    deleteAddress,
    setDefaultAddress,
    notificationsEnabled,
    toggleNotifications,
  } = useCollector();

  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "orders";

  const [activeTab, setActiveTab] = useState<"orders" | "collections" | "artists" | "addresses" | "searches" | "settings">(
    (initialTab as "orders" | "collections" | "artists" | "addresses" | "searches" | "settings") || "orders"
  );

  // Orders State
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  // Collections State
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    collections[0]?.id || "col-default"
  );
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");

  // New Address State
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState("Home");
  const [newAddrName, setNewAddrName] = useState("");
  const [newAddrPhone, setNewAddrPhone] = useState("");
  const [newAddrText, setNewAddrText] = useState("");
  const [newAddrDefault, setNewAddrDefault] = useState(false);

  // Support Enquiry State
  const [supportMessageOrder, setSupportMessageOrder] = useState<string | null>(null);

  // Authenticated Orders Fetch
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setOrdersLoading(false);
      return;
    }

    async function loadOrders() {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setOrders(data as OrderRecord[]);
        }
      } catch {
        // Safe fallback
      } finally {
        setOrdersLoading(false);
      }
    }

    loadOrders();
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-yellow-500 font-display text-xl tracking-widest animate-pulse">
          Loading Collector Account...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md bg-neutral-900 border border-yellow-600/30 rounded-xl p-8 text-center shadow-2xl">
          <span className="text-4xl mb-4 block">🏛️</span>
          <h1 className="font-display text-2xl text-yellow-500 mb-3">Collector Portal</h1>
          <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
            Please log in or create an account to view your order history, manage private curated collections, and track followed artists.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-lg font-semibold transition"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="w-full border border-yellow-600/50 hover:bg-yellow-500/10 text-yellow-400 py-3 rounded-lg font-semibold transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const selectedCol = collections.find((c) => c.id === selectedCollectionId) || collections[0];
  const collectionArtworks = selectedCol
    ? selectedCol.artworkIds
        .map((id) => artworks.find((a) => a.id === id))
        .filter((a): a is Artwork => Boolean(a))
    : [];

  const followedArtistDetails = followedArtists
    .map((id) => artists.find((a) => a.id === id))
    .filter((a): a is (typeof artists)[number] => Boolean(a));

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    const newId = createCollection(newColName, newColDesc);
    setSelectedCollectionId(newId);
    setNewColName("");
    setNewColDesc("");
    setShowNewCollectionModal(false);
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrName.trim() || !newAddrPhone.trim() || !newAddrText.trim()) return;
    addAddress({
      label: newAddrLabel.trim() || "Address",
      name: newAddrName.trim(),
      phone: newAddrPhone.trim(),
      address: newAddrText.trim(),
      isDefault: newAddrDefault,
    });
    setNewAddrName("");
    setNewAddrPhone("");
    setNewAddrText("");
    setShowAddAddressModal(false);
  };

  return (
    <main className="min-h-screen bg-black text-white px-5 md:px-16 py-12 md:py-20 selection:bg-yellow-500/30 selection:text-yellow-200">
      <div className="max-w-7xl mx-auto">
        {/* HEADER BAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-yellow-600/20 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-yellow-500 text-xs uppercase tracking-widest font-semibold">
                Kala Setu Collector Portal
              </span>
              <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 text-[10px] px-2 py-0.5 rounded-full capitalize">
                {role || "buyer"}
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-white">
              Welcome, <span className="text-yellow-400">{user.email?.split("@")[0]}</span>
            </h1>
            <p className="text-neutral-400 text-xs mt-1">
              Account: {user.email} · Private & Encrypted Session
            </p>
          </div>

          <div className="flex items-center gap-3">
            {role === "artist" && (
              <Link
                href="/studio"
                className="bg-neutral-900 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 px-4 py-2 rounded-lg text-xs font-semibold transition"
              >
                ✨ Kala Studio
              </Link>
            )}
            <button
              onClick={() => signOut()}
              className="border border-neutral-700 hover:border-red-500/50 hover:text-red-400 text-neutral-400 px-4 py-2 rounded-lg text-xs font-medium transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* QUICK STATS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="p-4 rounded-xl bg-neutral-900/80 border border-yellow-600/20">
            <span className="text-xs text-neutral-400 block mb-1">Acquisition Orders</span>
            <span className="text-2xl font-bold text-white font-display">{orders.length}</span>
          </div>
          <div className="p-4 rounded-xl bg-neutral-900/80 border border-yellow-600/20">
            <span className="text-xs text-neutral-400 block mb-1">Curated Collections</span>
            <span className="text-2xl font-bold text-yellow-400 font-display">{collections.length}</span>
          </div>
          <div className="p-4 rounded-xl bg-neutral-900/80 border border-yellow-600/20">
            <span className="text-xs text-neutral-400 block mb-1">Followed Artists</span>
            <span className="text-2xl font-bold text-white font-display">{followedArtists.length}</span>
          </div>
          <div className="p-4 rounded-xl bg-neutral-900/80 border border-yellow-600/20">
            <span className="text-xs text-neutral-400 block mb-1">Saved Searches</span>
            <span className="text-2xl font-bold text-yellow-400 font-display">{savedSearches.length}</span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-yellow-600/20 pb-4 text-xs md:text-sm">
          {[
            { id: "orders", label: "📦 My Orders & Timeline", count: orders.length },
            { id: "collections", label: "🖼️ Private Collections", count: collections.length },
            { id: "artists", label: "🎨 Followed Artists", count: followedArtists.length },
            { id: "addresses", label: "📍 Delivery Addresses", count: addresses.length },
            { id: "searches", label: "🔍 Saved Searches", count: savedSearches.length },
            { id: "settings", label: "⚙️ Preferences & Alerts" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2.5 rounded-lg font-semibold transition flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                  : "border border-yellow-600/25 text-neutral-300 hover:text-yellow-400 hover:bg-neutral-900"
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                    activeTab === tab.id ? "bg-black text-yellow-400" : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB CONTENT: ORDERS */}
        {activeTab === "orders" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl md:text-2xl text-white">Acquisition History & Status</h2>
              <Link href="/explore" className="text-xs text-yellow-400 hover:underline">
                Explore More Artworks →
              </Link>
            </div>

            {ordersLoading ? (
              <p className="text-neutral-400 text-sm py-12 text-center">Loading orders...</p>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 bg-neutral-900 border border-yellow-600/20 rounded-2xl p-8 max-w-md mx-auto">
                <p className="text-4xl mb-3">📦</p>
                <h3 className="font-display text-lg text-white mb-2">No acquisitions yet</h3>
                <p className="text-neutral-400 text-xs mb-6 leading-relaxed">
                  When you purchase original or digital works from India&apos;s independent creators, their order timeline and dispatch updates will appear here.
                </p>
                <Link
                  href="/explore"
                  className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2.5 rounded-lg text-xs font-semibold transition"
                >
                  Browse Collection
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-6 rounded-2xl bg-neutral-900/90 border border-yellow-600/25 shadow-xl"
                  >
                    {/* ORDER HEADER */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-yellow-600/15 gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-display text-lg text-yellow-400 font-semibold">
                            {order.order_ref}
                          </span>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                            {order.payment_status === "paid" ? "Payment Confirmed" : order.payment_status || "Paid"}
                          </span>
                        </div>
                        <p className="text-neutral-400 text-xs mt-1">
                          Placed on {new Date(order.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })} · Payment ID: {order.razorpay_payment_id || order.payment_id || "N/A"}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-neutral-400 block">Total Amount</span>
                        <span className="text-xl font-bold text-white font-display">
                          ₹ {order.total.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    {/* FULFILLMENT STATUS TIMELINE */}
                    <div className="py-6 border-b border-yellow-600/15">
                      <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4 font-semibold">
                        Fulfillment Timeline
                      </p>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <TimelineStep
                          number="1"
                          label="Payment Captured"
                          desc="Authoritative Razorpay HMAC verified"
                          status="completed"
                        />
                        <TimelineStep
                          number="2"
                          label="Studio Packing"
                          desc="Archival wrapping & inspection"
                          status={order.status === "Pending" ? "current" : "completed"}
                        />
                        <TimelineStep
                          number="3"
                          label="Dispatched"
                          desc="In transit from creator studio"
                          status={order.status === "Processing" ? "current" : order.status === "Shipped" || order.status === "Delivered" ? "completed" : "pending"}
                        />
                        <TimelineStep
                          number="4"
                          label="Delivered"
                          desc="Received by collector"
                          status={order.status === "Delivered" ? "completed" : "pending"}
                        />
                      </div>
                    </div>

                    {/* ITEMS LIST */}
                    <div className="py-4">
                      <p className="text-xs text-neutral-400 mb-3 font-medium">Acquired Works ({order.items?.length || 0}):</p>
                      <div className="space-y-3">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-neutral-950/60 p-3 rounded-lg border border-yellow-600/15">
                            <div className="flex items-center gap-3">
                              {item.image && (
                                <div className="relative w-12 h-10 rounded overflow-hidden border border-yellow-600/20">
                                  <Image src={item.image} alt={item.title} fill className="object-cover" />
                                </div>
                              )}
                              <div>
                                <span className="text-white font-semibold block">{item.title}</span>
                                <span className="text-neutral-400 text-[11px]">Quantity: {item.quantity || 1}</span>
                              </div>
                            </div>
                            <span className="text-white font-medium">
                              ₹ {(item.pricing?.amount || order.total).toLocaleString("en-IN")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SUPPORT & ACTIONS FOOTER */}
                    <div className="pt-3 border-t border-yellow-600/15 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="text-neutral-400">
                        Shipping to: <strong className="text-neutral-200">{order.customer_name}</strong> ({order.customer_phone})
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSupportMessageOrder(order.order_ref)}
                          className="text-neutral-300 hover:text-yellow-400 border border-yellow-600/30 px-3 py-1.5 rounded-md transition"
                        >
                          Request Support / Tracking
                        </button>
                      </div>
                    </div>

                    {/* IN-LINE SUPPORT MODAL */}
                    {supportMessageOrder === order.order_ref && (
                      <div className="mt-4 p-4 rounded-xl bg-black border border-yellow-500/40 text-xs">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-yellow-400">Order Advisory & Support for #{order.order_ref}</p>
                          <button onClick={() => setSupportMessageOrder(null)} className="text-neutral-400 hover:text-white">✕</button>
                        </div>
                        <p className="text-neutral-300 mb-3">
                          For delivery inquiries, courier tracking IDs, or packaging questions, our direct concierge is available at:
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <a
                            href={`mailto:support@kalasetu.art?subject=Support%20Request%20for%20Order%20${order.order_ref}`}
                            className="bg-yellow-500 text-black px-4 py-2 rounded-md font-semibold hover:bg-yellow-400 transition"
                          >
                            Email support@kalasetu.art
                          </a>
                          <a
                            href={`https://wa.me/918522847389?text=Hello%20Kala%20Setu%20Support,%20I%20have%20an%20inquiry%20regarding%20Order%20${order.order_ref}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border border-yellow-500/50 text-yellow-400 px-4 py-2 rounded-md font-semibold hover:bg-yellow-500/10 transition"
                          >
                            WhatsApp Concierge
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: COLLECTIONS */}
        {activeTab === "collections" && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-3">
              <div>
                <h2 className="font-display text-xl md:text-2xl text-white">Curated Private Collections</h2>
                <p className="text-neutral-400 text-xs mt-1">Organize your prospective acquisitions into custom named themes.</p>
              </div>

              <button
                onClick={() => setShowNewCollectionModal(true)}
                className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                <span>+</span> New Collection
              </button>
            </div>

            {/* COLLECTION SELECTOR PILLS */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-yellow-600/20 pb-4">
              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setSelectedCollectionId(col.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    selectedCollectionId === col.id
                      ? "bg-yellow-500 text-black shadow-md font-semibold"
                      : "border border-yellow-600/30 text-neutral-300 hover:text-yellow-400 hover:bg-neutral-900"
                  }`}
                >
                  {col.name} ({col.artworkIds.length})
                </button>
              ))}
            </div>

            {/* ACTIVE COLLECTION DETAIL */}
            {selectedCol && (
              <div className="mb-8 p-6 rounded-2xl bg-neutral-900/80 border border-yellow-600/25">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display text-xl text-yellow-400">{selectedCol.name}</h3>
                      <span className="text-[10px] bg-black/60 border border-yellow-600/30 text-neutral-400 px-2 py-0.5 rounded">
                        🔒 Private to You
                      </span>
                    </div>
                    {selectedCol.description && (
                      <p className="text-neutral-400 text-xs">{selectedCol.description}</p>
                    )}
                  </div>

                  {collections.length > 1 && (
                    <button
                      onClick={() => deleteCollection(selectedCol.id)}
                      className="text-neutral-500 hover:text-red-400 text-xs transition"
                    >
                      Delete Collection
                    </button>
                  )}
                </div>

                {collectionArtworks.length === 0 ? (
                  <div className="text-center py-12 text-neutral-400 text-xs">
                    <p className="mb-3 text-2xl">🖼️</p>
                    <p>No artworks in this collection yet.</p>
                    <Link href="/explore" className="text-yellow-400 underline mt-2 inline-block">
                      Browse Catalogue to Add Pieces →
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collectionArtworks.map((art) => (
                      <div
                        key={art.id}
                        className="p-4 rounded-xl bg-black border border-yellow-600/20 flex flex-col justify-between"
                      >
                        <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden mb-3">
                          <Image src={art.images[0] || art.thumbnail} alt={art.title} fill className="object-cover" />
                        </div>
                        <div>
                          <p className="text-[11px] text-yellow-500/80">{art.artist.name}</p>
                          <Link href={`/explore/${art.slug}`}>
                            <h4 className="font-display text-sm text-white hover:text-yellow-400 transition font-semibold">
                              {art.title}
                            </h4>
                          </Link>
                          <p className="text-xs text-neutral-300 mt-1">₹ {art.pricing.amount.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-yellow-600/15 flex items-center justify-between text-xs">
                          <Link href={`/explore/${art.slug}`} className="text-yellow-400 hover:underline">
                            View Artwork
                          </Link>
                          <button
                            onClick={() => removeFromCollection(selectedCol.id, art.id)}
                            className="text-neutral-500 hover:text-red-400"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CREATE COLLECTION MODAL */}
            {showNewCollectionModal && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <form
                  onSubmit={handleCreateCollection}
                  className="bg-neutral-900 border border-yellow-600/40 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                >
                  <h3 className="font-display text-lg text-yellow-500 mb-4">Create Named Collection</h3>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-xs text-neutral-300 block mb-1">Collection Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Living Room Centerpieces, Heritage Gold"
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                        className="w-full bg-black border border-yellow-600/30 rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-yellow-400 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-300 block mb-1">Description (Optional)</label>
                      <textarea
                        placeholder="Add notes on your concept or architectural theme..."
                        value={newColDesc}
                        onChange={(e) => setNewColDesc(e.target.value)}
                        className="w-full bg-black border border-yellow-600/30 rounded-lg px-3.5 py-2 text-white text-xs focus:border-yellow-400 outline-none"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowNewCollectionModal(false)}
                      className="px-4 py-2 border border-neutral-700 text-neutral-300 text-xs rounded-lg hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-semibold rounded-lg"
                    >
                      Create Collection
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: ARTISTS */}
        {activeTab === "artists" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl md:text-2xl text-white">Artists You Follow</h2>
              <Link href="/artists" className="text-xs text-yellow-400 hover:underline">
                Explore Artist Directory →
              </Link>
            </div>

            {followedArtistDetails.length === 0 ? (
              <div className="text-center py-16 bg-neutral-900 border border-yellow-600/20 rounded-2xl p-8 max-w-md mx-auto text-xs text-neutral-400">
                <p className="text-3xl mb-3">🎨</p>
                <p className="mb-4">You are not following any artists yet.</p>
                <Link
                  href="/artists"
                  className="bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-2 rounded-lg font-semibold inline-block"
                >
                  Meet Verified Indian Masters
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {followedArtistDetails.map((artist) => (
                  <div
                    key={artist.id}
                    className="p-6 rounded-2xl bg-neutral-900/80 border border-yellow-600/25 flex items-start gap-4 justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-yellow-500/50 shrink-0">
                        <Image src={artist.profileImage} alt={artist.name} fill className="object-cover" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-lg text-white font-semibold">{artist.name}</h3>
                          {artist.verified && <span className="text-yellow-400 text-xs">✓</span>}
                        </div>
                        <p className="text-neutral-400 text-xs mb-2">{artist.location} · {artist.experience}</p>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {artist.specialties.map((spec) => (
                            <span key={spec} className="text-[10px] px-2 py-0.5 rounded bg-black border border-yellow-600/30 text-yellow-400">
                              {spec}
                            </span>
                          ))}
                        </div>
                        <Link
                          href={`/artists/${artist.id}`}
                          className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 inline-flex items-center gap-1"
                        >
                          Visit Storefront Catalogue →
                        </Link>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleFollowArtist(artist.id)}
                      className="text-xs text-neutral-400 hover:text-red-400 border border-neutral-700 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition shrink-0"
                    >
                      Unfollow
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: ADDRESSES */}
        {activeTab === "addresses" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-display text-xl md:text-2xl text-white">Delivery Address Book</h2>
                <p className="text-neutral-400 text-xs mt-1">Addresses are stored securely for rapid studio art checkout.</p>
              </div>

              <button
                onClick={() => setShowAddAddressModal(true)}
                className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg text-xs font-semibold transition"
              >
                + Add New Address
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`p-5 rounded-xl bg-neutral-900/80 border transition flex flex-col justify-between ${
                    addr.isDefault ? "border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.15)]" : "border-yellow-600/25"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                        {addr.label}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full font-semibold">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-white mb-1">{addr.name}</p>
                    <p className="text-xs text-neutral-400 mb-2">{addr.phone}</p>
                    <p className="text-xs text-neutral-300 leading-relaxed">{addr.address}</p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-yellow-600/15 flex items-center justify-between text-xs">
                    {!addr.isDefault && (
                      <button
                        onClick={() => setDefaultAddress(addr.id)}
                        className="text-yellow-400 hover:underline"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => deleteAddress(addr.id)}
                      className="text-neutral-500 hover:text-red-400 ml-auto"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ADD ADDRESS MODAL */}
            {showAddAddressModal && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <form
                  onSubmit={handleAddAddress}
                  className="bg-neutral-900 border border-yellow-600/40 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                >
                  <h3 className="font-display text-lg text-yellow-500 mb-4">Add Delivery Address</h3>
                  <div className="space-y-3 mb-6 text-xs">
                    <div>
                      <label className="text-neutral-300 block mb-1">Address Label</label>
                      <input
                        type="text"
                        placeholder="Home / Studio / Corporate Office"
                        value={newAddrLabel}
                        onChange={(e) => setNewAddrLabel(e.target.value)}
                        className="w-full bg-black border border-yellow-600/30 rounded-lg px-3 py-2 text-white outline-none focus:border-yellow-400"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-300 block mb-1">Full Recipient Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Varshith Kumar"
                        value={newAddrName}
                        onChange={(e) => setNewAddrName(e.target.value)}
                        className="w-full bg-black border border-yellow-600/30 rounded-lg px-3 py-2 text-white outline-none focus:border-yellow-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-neutral-300 block mb-1">Contact Phone *</label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={newAddrPhone}
                        onChange={(e) => setNewAddrPhone(e.target.value)}
                        className="w-full bg-black border border-yellow-600/30 rounded-lg px-3 py-2 text-white outline-none focus:border-yellow-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-neutral-300 block mb-1">Complete Delivery Address *</label>
                      <textarea
                        placeholder="House/Plot No., Street, City, State, PIN Code"
                        value={newAddrText}
                        onChange={(e) => setNewAddrText(e.target.value)}
                        className="w-full bg-black border border-yellow-600/30 rounded-lg px-3 py-2 text-white outline-none focus:border-yellow-400"
                        rows={3}
                        required
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={newAddrDefault}
                        onChange={(e) => setNewAddrDefault(e.target.checked)}
                        className="accent-yellow-500"
                      />
                      <span className="text-neutral-300">Set as default delivery address</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowAddAddressModal(false)}
                      className="px-4 py-2 border border-neutral-700 text-neutral-300 rounded-lg hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: SAVED SEARCHES */}
        {activeTab === "searches" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-display text-xl md:text-2xl text-white">Saved Discovery Searches</h2>
                <p className="text-neutral-400 text-xs mt-1">Re-run your favorite filters and movements with a single click.</p>
              </div>
            </div>

            {savedSearches.length === 0 ? (
              <p className="text-neutral-400 text-xs py-8 text-center">No saved searches yet.</p>
            ) : (
              <div className="space-y-3">
                {savedSearches.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl bg-neutral-900/80 border border-yellow-600/25 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-white text-sm">{s.name}</p>
                      <p className="text-neutral-400 text-xs mt-0.5">Filter: {s.queryString}</p>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <Link
                        href={`/explore?${s.queryString}`}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-1.5 rounded-lg font-semibold transition"
                      >
                        Run Search →
                      </Link>
                      <button
                        onClick={() => removeSavedSearch(s.id)}
                        className="text-neutral-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: SETTINGS & PREFERENCES */}
        {activeTab === "settings" && (
          <div className="max-w-2xl bg-neutral-900/80 border border-yellow-600/25 rounded-2xl p-6">
            <h2 className="font-display text-xl text-white mb-4">Collector Preferences & Alerts</h2>
            <div className="space-y-4 text-xs md:text-sm">
              <div className="flex items-center justify-between py-3 border-b border-yellow-600/15">
                <div>
                  <p className="text-white font-medium">New Studio Creations Alert</p>
                  <p className="text-neutral-400 text-xs">Receive notifications when your followed artists publish new artworks.</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={toggleNotifications}
                  className="accent-yellow-500 h-4 w-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-yellow-600/15">
                <div>
                  <p className="text-white font-medium">Curated Exhibition & Sale Invitations</p>
                  <p className="text-neutral-400 text-xs">Receive early access to seasonal curated collections and private previews.</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="accent-yellow-500 h-4 w-4 cursor-pointer"
                />
              </div>

              <div className="pt-2 text-xs text-neutral-400 leading-relaxed">
                <p>
                  Kala Setu respects collector privacy. Your addresses, orders, and private collections are never visible to other users or external search engines.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function TimelineStep({
  number,
  label,
  desc,
  status,
}: {
  number: string;
  label: string;
  desc: string;
  status: "completed" | "current" | "pending";
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 transition-colors ${
          status === "completed"
            ? "bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)]"
            : status === "current"
            ? "border-2 border-yellow-500 text-yellow-400 bg-neutral-900 animate-pulse"
            : "border border-neutral-700 text-neutral-500 bg-neutral-950"
        }`}
      >
        {status === "completed" ? "✓" : number}
      </div>
      <p
        className={`font-medium ${
          status === "completed" || status === "current" ? "text-yellow-400" : "text-neutral-500"
        }`}
      >
        {label}
      </p>
      <p className="text-[10px] text-neutral-500 hidden sm:block mt-0.5 leading-tight">{desc}</p>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <AccountContent />
    </Suspense>
  );
}
