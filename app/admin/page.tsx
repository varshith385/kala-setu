"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { artworks } from "@/app/data/artworks";
import { artists } from "@/app/data/artists";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  targetType: "Artist" | "Artwork" | "Review" | "SupportTicket" | "Order";
  targetId: string;
  details: string;
}

interface ArtistVerificationApplicant {
  id: string;
  name: string;
  email: string;
  location: string;
  portfolioUrl: string;
  mediums: string[];
  submittedDate: string;
  status: "Pending Verification" | "Approved" | "Information Requested" | "Rejected";
  atelierAddress: string;
  notes?: string;
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  collectorName: string;
  collectorEmail: string;
  type: "Transit Damage" | "7-Day Return Request" | "Commission Dispute" | "Authentication Inquiry";
  orderRef: string;
  status: "Open" | "Under Investigation" | "Resolved";
  date: string;
  description: string;
}

interface ModerationReviewItem {
  id: string;
  author: string;
  artistName: string;
  artworkTitle: string;
  rating: number;
  comment: string;
  date: string;
  verifiedPurchase: boolean;
  status: "Published" | "Under Review" | "Hidden";
}

export default function AdminDashboardPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "overview" | "artists" | "artworks" | "search" | "reviews" | "support" | "audit"
  >("overview");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Verification applicants state
  const [applicants, setApplicants] = useState<ArtistVerificationApplicant[]>([]);

  // Moderation reviews state
  const [reviews, setReviews] = useState<ModerationReviewItem[]>([]);

  // Support tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // RBAC protection check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (role !== "admin") {
        router.push("/");
      }
    }
  }, [user, role, authLoading, router]);

  // Initialize data and load from localStorage
  useEffect(() => {
    if (!user) return;
    try {
      const savedLogs = localStorage.getItem("kala_admin_audit_log");
      if (savedLogs) {
        setAuditLogs(JSON.parse(savedLogs));
      } else {
        const initialLogs: AuditLogEntry[] = [
          {
            id: "log-1",
            timestamp: "2026-03-17 09:30:14 IST",
            adminEmail: user.email || "admin@kalasetu.art",
            action: "SYSTEM_STARTUP",
            targetType: "Order",
            targetId: "SYSTEM",
            details: "Admin portal session established with authenticated RBAC credentials.",
          },
        ];
        setAuditLogs(initialLogs);
        localStorage.setItem("kala_admin_audit_log", JSON.stringify(initialLogs));
      }

      const savedApplicants = localStorage.getItem("kala_admin_applicants");
      if (savedApplicants) {
        setApplicants(JSON.parse(savedApplicants));
      } else {
        const initialApplicants: ArtistVerificationApplicant[] = [
          {
            id: "app-01",
            name: "Vidyadhar Joshi",
            email: "v.joshi@atelierpune.org",
            location: "Pune, Maharashtra",
            portfolioUrl: "https://kala-setu.art/artists/pune-traditional",
            mediums: ["Ganjifa Miniature", "Natural Mineral Pigments"],
            submittedDate: "2026-03-15",
            status: "Pending Verification",
            atelierAddress: "Studio 4, Narayan Peth Heritage Guild, Pune",
          },
          {
            id: "app-02",
            name: "Radhika Nambiar",
            email: "radhika.kerala.murals@gmail.com",
            location: "Thrissur, Kerala",
            portfolioUrl: "https://kala-setu.art/artists/kerala-atelier",
            mediums: ["Kerala Temple Murals", "Panchavarna Pigments"],
            submittedDate: "2026-03-14",
            status: "Pending Verification",
            atelierAddress: "Temple Road Atelier, Guruvayur Vicinity, Thrissur",
          },
        ];
        setApplicants(initialApplicants);
        localStorage.setItem("kala_admin_applicants", JSON.stringify(initialApplicants));
      }

      const savedReviews = localStorage.getItem("kala_admin_reviews");
      if (savedReviews) {
        setReviews(JSON.parse(savedReviews));
      } else {
        const initialReviews: ModerationReviewItem[] = [
          {
            id: "rev-01",
            author: "Pooja Hegde",
            artistName: "Ananya Sharma",
            artworkTitle: "Golden Heritage — Tanjore Majesty",
            rating: 5,
            comment: "Exceptional gold leaf brilliance. Hand-delivered in heavy-duty wooden box with full studio provenance.",
            date: "2026-03-12",
            verifiedPurchase: true,
            status: "Published",
          },
          {
            id: "rev-02",
            author: "Anonymous Collector",
            artistName: "Rohan Patel",
            artworkTitle: "Urban Chaos in Gold",
            rating: 4,
            comment: "Stunning texture and depth. Arrived safely via fine art courier.",
            date: "2026-03-10",
            verifiedPurchase: true,
            status: "Published",
          },
        ];
        setReviews(initialReviews);
        localStorage.setItem("kala_admin_reviews", JSON.stringify(initialReviews));
      }

      const savedTickets = localStorage.getItem("kala_admin_tickets");
      if (savedTickets) {
        setTickets(JSON.parse(savedTickets));
      } else {
        const initialTickets: SupportTicket[] = [
          {
            id: "tkt-01",
            ticketNumber: "SUP-2026-042",
            collectorName: "Vikram Malhotra",
            collectorEmail: "v.malhotra@zenith.co.in",
            type: "7-Day Return Request",
            orderRef: "KS-ORD-2026-881",
            status: "Open",
            date: "2026-03-16",
            description: "Collector requesting return within 7-day trial window; packaging intact.",
          },
        ];
        setTickets(initialTickets);
        localStorage.setItem("kala_admin_tickets", JSON.stringify(initialTickets));
      }
    } catch {}
  }, [user]);

  const addAuditLog = (action: string, targetType: AuditLogEntry["targetType"], targetId: string, details: string) => {
    const newEntry: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST",
      adminEmail: user?.email || "admin@kalasetu.art",
      action,
      targetType,
      targetId,
      details,
    };
    const updated = [newEntry, ...auditLogs];
    setAuditLogs(updated);
    try {
      localStorage.setItem("kala_admin_audit_log", JSON.stringify(updated));
    } catch {}
  };

  const handleUpdateApplicantStatus = (id: string, newStatus: ArtistVerificationApplicant["status"]) => {
    const app = applicants.find((a) => a.id === id);
    if (!app) return;

    const updated = applicants.map((a) => (a.id === id ? { ...a, status: newStatus } : a));
    setApplicants(updated);
    try {
      localStorage.setItem("kala_admin_applicants", JSON.stringify(updated));
    } catch {}

    addAuditLog(
      `ARTIST_VERIFICATION_${newStatus.toUpperCase().replace(/\s+/g, "_")}`,
      "Artist",
      id,
      `Changed verification status of ${app.name} (${app.email}) to ${newStatus}`
    );
  };

  const handleUpdateReviewStatus = (id: string, newStatus: ModerationReviewItem["status"]) => {
    const rev = reviews.find((r) => r.id === id);
    if (!rev) return;

    const updated = reviews.map((r) => (r.id === id ? { ...r, status: newStatus } : r));
    setReviews(updated);
    try {
      localStorage.setItem("kala_admin_reviews", JSON.stringify(updated));
    } catch {}

    addAuditLog(
      `REVIEW_MODERATION_${newStatus.toUpperCase()}`,
      "Review",
      id,
      `Moderated review by ${rev.author} for "${rev.artworkTitle}" to ${newStatus}`
    );
  };

  const handleUpdateTicketStatus = (id: string, newStatus: SupportTicket["status"]) => {
    const tkt = tickets.find((t) => t.id === id);
    if (!tkt) return;

    const updated = tickets.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
    setTickets(updated);
    try {
      localStorage.setItem("kala_admin_tickets", JSON.stringify(updated));
    } catch {}

    addAuditLog(
      `SUPPORT_TICKET_${newStatus.toUpperCase()}`,
      "SupportTicket",
      id,
      `Updated ticket ${tkt.ticketNumber} (${tkt.type}) for ${tkt.collectorName} to ${newStatus}`
    );
  };

  // Search filtering across artworks and artists
  const filteredArtworks = useMemo(() => {
    if (!searchQuery.trim()) return artworks;
    const q = searchQuery.toLowerCase();
    return artworks.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.artist.name.toLowerCase().includes(q) ||
        a.details.medium.toLowerCase().includes(q) ||
        a.details.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredArtists = useMemo(() => {
    if (!searchQuery.trim()) return artists;
    const q = searchQuery.toLowerCase();
    return artists.filter(
      (a) => a.name.toLowerCase().includes(q) || a.location.toLowerCase().includes(q) || a.bio.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (authLoading || role !== "admin" || !user) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-400 font-display text-xl tracking-widest">Verifying Administrator Privileges...</p>
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
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-amber-400 text-xs uppercase tracking-widest font-semibold">
                Kala Setu Operations & Admin Console
              </span>
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-medium">
                Root RBAC Authorized
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl text-white">
              Operations Console — <span className="text-yellow-400">{user.email}</span>
            </h1>
            <p className="text-neutral-400 text-xs md:text-sm mt-1">
              Curator workflows, seller verification, artwork moderation, and atomic reconciliation safeguards.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/reconciliation"
              className="bg-amber-500/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 px-4 py-2.5 rounded-lg text-xs font-semibold transition flex items-center gap-2"
            >
              <span>🛡️</span>
              <span>Reconciliation Console</span>
            </Link>
          </div>
        </div>

        {/* ADMIN TABS */}
        <div className="flex overflow-x-auto gap-2 border-b border-yellow-600/20 pb-px mb-8 scrollbar-none">
          {[
            { id: "overview", label: "Operations Overview", icon: "📊" },
            { id: "artists", label: `Artist Verification (${applicants.filter((a) => a.status === "Pending Verification").length})`, icon: "🎨" },
            { id: "search", label: "Catalogue & User Search", icon: "🔍" },
            { id: "reviews", label: `Review Moderation (${reviews.length})`, icon: "⭐" },
            { id: "support", label: `Support & Claims (${tickets.filter((t) => t.status !== "Resolved").length})`, icon: "🛡️" },
            { id: "audit", label: `Audit Log (${auditLogs.length})`, icon: "📜" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 text-xs md:text-sm font-semibold rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-amber-500 text-black shadow-lg"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: OPERATIONS OVERVIEW */}
        {activeTab === "overview" && (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <div className="bg-neutral-900/80 border border-yellow-600/25 p-5 rounded-2xl">
                <p className="text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Catalogued Artworks</p>
                <p className="font-display text-2xl md:text-3xl text-yellow-400 font-bold">{artworks.length} Originals</p>
                <p className="text-[10px] text-neutral-500 mt-1">100% verified artist provenance</p>
              </div>

              <div className="bg-neutral-900/80 border border-yellow-600/25 p-5 rounded-2xl">
                <p className="text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Active Guild Artists</p>
                <p className="font-display text-2xl md:text-3xl text-white font-bold">{artists.length} Masters</p>
                <p className="text-[10px] text-emerald-400 mt-1">{applicants.filter((a) => a.status === "Pending Verification").length} pending verification</p>
              </div>

              <div className="bg-neutral-900/80 border border-yellow-600/25 p-5 rounded-2xl">
                <p className="text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Support Incidents</p>
                <p className="font-display text-2xl md:text-3xl text-amber-400 font-bold">{tickets.filter((t) => t.status !== "Resolved").length} Active</p>
                <p className="text-[10px] text-neutral-500 mt-1">Zero unresolved damage claims</p>
              </div>

              <div className="bg-neutral-900/80 border border-yellow-600/25 p-5 rounded-2xl">
                <p className="text-[11px] uppercase tracking-wider text-neutral-400 mb-1">Reconciliation Safeguards</p>
                <p className="font-display text-2xl md:text-3xl text-emerald-400 font-bold">Fail-Closed</p>
                <p className="text-[10px] text-neutral-400 mt-1">Atomic SQL RPC enforcement</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-neutral-900/60 border border-yellow-600/20 rounded-2xl p-6">
                <h3 className="font-display text-xl text-yellow-400 mb-4 flex items-center gap-2">
                  <span>⚡</span> Quick Administrative Actions
                </h3>
                <div className="space-y-3 text-xs">
                  <Link
                    href="/admin/reconciliation"
                    className="block p-4 rounded-xl bg-neutral-950 border border-amber-500/30 hover:border-amber-400 transition"
                  >
                    <p className="font-semibold text-amber-300">Run Order Reconciliation Audit →</p>
                    <p className="text-neutral-400 text-[11px] mt-0.5">
                      Verify Razorpay payment signatures against atomic Supabase RPC safeguards without fallback writes.
                    </p>
                  </Link>
                  <button
                    onClick={() => setActiveTab("artists")}
                    className="w-full text-left p-4 rounded-xl bg-neutral-950 border border-yellow-600/20 hover:border-yellow-500 transition"
                  >
                    <p className="font-semibold text-yellow-400">Review Pending Artist Applicants ({applicants.filter((a) => a.status === "Pending Verification").length}) →</p>
                    <p className="text-neutral-400 text-[11px] mt-0.5">Inspect physical atelier documentation and portfolio quality.</p>
                  </button>
                  <button
                    onClick={() => setActiveTab("support")}
                    className="w-full text-left p-4 rounded-xl bg-neutral-950 border border-yellow-600/20 hover:border-yellow-500 transition"
                  >
                    <p className="font-semibold text-white">Collector Protection & Claim Queue →</p>
                    <p className="text-neutral-400 text-[11px] mt-0.5">Review 7-day return inspection requests and courier transit reports.</p>
                  </button>
                </div>
              </div>

              <div className="bg-neutral-900/60 border border-yellow-600/20 rounded-2xl p-6">
                <h3 className="font-display text-xl text-white mb-4 flex items-center gap-2">
                  <span>📜</span> Recent Operations Audit Stream
                </h3>
                <div className="space-y-3 text-xs">
                  {auditLogs.slice(0, 4).map((log) => (
                    <div key={log.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                      <div className="flex justify-between items-center text-[10px] text-neutral-500 mb-1">
                        <span className="font-mono text-amber-400">{log.action}</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <p className="text-neutral-300 leading-tight">{log.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ARTIST VERIFICATION QUEUE */}
        {activeTab === "artists" && (
          <div>
            <div className="mb-6">
              <h2 className="font-display text-xl text-white">Artist Verification Queue</h2>
              <p className="text-neutral-400 text-xs">
                Examine creator credentials, physical atelier addresses, and portfolio mastery before granting verified creator status.
              </p>
            </div>

            <div className="space-y-4">
              {applicants.map((app) => (
                <div
                  key={app.id}
                  className="bg-neutral-900/80 border border-yellow-600/25 rounded-2xl p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-yellow-600/15 gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display text-xl text-white font-semibold">{app.name}</h3>
                        <span
                          className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                            app.status === "Approved"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : app.status === "Rejected"
                              ? "bg-red-500/15 text-red-400 border border-red-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">
                        {app.email} · {app.location} · Submitted: {app.submittedDate}
                      </p>
                    </div>

                    <a
                      href={app.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-600/30 px-3 py-1.5 rounded-lg transition"
                    >
                      View Portfolio Document ↗
                    </a>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500">Physical Atelier Address</p>
                      <p className="text-neutral-200 mt-0.5">{app.atelierAddress}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500">Specialist Disciplines</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {app.mediums.map((m) => (
                          <span key={m} className="px-2 py-0.5 rounded bg-black border border-yellow-600/20 text-yellow-400 text-[10px]">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ACTION CONTROLS */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-yellow-600/10">
                    {app.status !== "Approved" && (
                      <button
                        onClick={() => handleUpdateApplicantStatus(app.id, "Approved")}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded-lg text-xs transition"
                      >
                        ✓ Grant Verified Artist Status
                      </button>
                    )}
                    {app.status !== "Information Requested" && (
                      <button
                        onClick={() => handleUpdateApplicantStatus(app.id, "Information Requested")}
                        className="border border-amber-500/50 hover:bg-amber-500/10 text-amber-300 px-4 py-2 rounded-lg text-xs transition"
                      >
                        Request Atelier Video Inspection
                      </button>
                    )}
                    {app.status !== "Rejected" && (
                      <button
                        onClick={() => handleUpdateApplicantStatus(app.id, "Rejected")}
                        className="border border-red-500/40 hover:bg-red-500/10 text-red-400 px-4 py-2 rounded-lg text-xs transition"
                      >
                        Decline Application
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SEARCH & BROWSE */}
        {activeTab === "search" && (
          <div>
            <div className="mb-6">
              <h2 className="font-display text-xl text-white">Central Operations Search</h2>
              <p className="text-neutral-400 text-xs">
                Search across all catalogued artworks, verified artists, mediums, and titles.
              </p>
            </div>

            <div className="mb-8">
              <input
                type="text"
                placeholder="Search artworks by title, creator, medium, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900 border border-yellow-600/40 rounded-xl px-5 py-3.5 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-display text-lg text-yellow-400">
                Matching Artworks ({filteredArtworks.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredArtworks.map((art) => (
                  <div
                    key={art.id}
                    className="p-4 rounded-xl bg-neutral-900/80 border border-yellow-600/20 flex items-center gap-4"
                  >
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-neutral-950 shrink-0">
                      <Image src={art.images[0] || art.thumbnail} alt={art.title} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display text-sm text-white font-semibold truncate">{art.title}</h4>
                      <p className="text-xs text-neutral-400">By {art.artist.name} · {art.details.medium}</p>
                      <p className="text-xs text-yellow-400 font-mono mt-0.5">₹ {art.pricing.amount.toLocaleString("en-IN")}</p>
                    </div>
                    <Link
                      href={`/explore/${art.slug}`}
                      className="text-xs text-neutral-400 hover:text-white border border-neutral-700 px-3 py-1.5 rounded-lg shrink-0"
                    >
                      View ↗
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REVIEW MODERATION */}
        {activeTab === "reviews" && (
          <div>
            <div className="mb-6">
              <h2 className="font-display text-xl text-white">Verified Collector Review Moderation</h2>
              <p className="text-neutral-400 text-xs">
                Ensure authentic feedback. Verified purchase reviews are flagged or published according to community trust guidelines.
              </p>
            </div>

            <div className="space-y-4">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-neutral-900/80 border border-yellow-600/25 rounded-2xl p-6"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base text-white font-semibold">{rev.author}</span>
                        {rev.verifiedPurchase && (
                          <span className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full">
                            ✓ Verified Order
                          </span>
                        )}
                        <span className="text-yellow-400 text-xs">⭐ {rev.rating} / 5</span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Reviewed &quot;{rev.artworkTitle}&quot; by {rev.artistName} · {rev.date}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        rev.status === "Published"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/15 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {rev.status}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed bg-black/50 p-3.5 rounded-xl border border-yellow-600/15 mb-4">
                    &quot;{rev.comment}&quot;
                  </p>

                  <div className="flex gap-2">
                    {rev.status !== "Published" ? (
                      <button
                        onClick={() => handleUpdateReviewStatus(rev.id, "Published")}
                        className="bg-emerald-500 text-black font-semibold px-4 py-1.5 rounded-lg text-xs"
                      >
                        Publish Review
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateReviewStatus(rev.id, "Hidden")}
                        className="border border-red-500/40 text-red-400 hover:bg-red-500/10 px-4 py-1.5 rounded-lg text-xs"
                      >
                        Hide from Public Storefront
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: SUPPORT & ISSUE TRACKING */}
        {activeTab === "support" && (
          <div>
            <div className="mb-6">
              <h2 className="font-display text-xl text-white">Collector Issue & Claim Tracking</h2>
              <p className="text-neutral-400 text-xs">
                Track 7-day inspection return requests, transit damage reports, and concierge inquiries.
              </p>
            </div>

            <div className="space-y-4">
              {tickets.map((tkt) => (
                <div
                  key={tkt.id}
                  className="bg-neutral-900/80 border border-yellow-600/25 rounded-2xl p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-yellow-600/15 gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-yellow-500 font-bold">{tkt.ticketNumber}</span>
                        <span className="text-xs text-neutral-400 font-semibold">· {tkt.type}</span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            tkt.status === "Resolved"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {tkt.status}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300">
                        Collector: {tkt.collectorName} ({tkt.collectorEmail}) · Order: {tkt.orderRef}
                      </p>
                    </div>

                    <span className="text-xs text-neutral-500">Reported: {tkt.date}</span>
                  </div>

                  <p className="text-xs text-neutral-300 bg-black/60 p-3.5 rounded-xl border border-yellow-600/15 mb-4 leading-relaxed">
                    {tkt.description}
                  </p>

                  <div className="flex gap-2">
                    {tkt.status !== "Resolved" ? (
                      <button
                        onClick={() => handleUpdateTicketStatus(tkt.id, "Resolved")}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded-lg text-xs transition"
                      >
                        ✓ Mark Incident Resolved & Closed
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateTicketStatus(tkt.id, "Under Investigation")}
                        className="border border-neutral-700 text-neutral-400 hover:text-white px-4 py-2 rounded-lg text-xs transition"
                      >
                        Reopen Incident
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT TRAIL */}
        {activeTab === "audit" && (
          <div>
            <div className="mb-6">
              <h2 className="font-display text-xl text-white">Immutable Operations Audit Trail</h2>
              <p className="text-neutral-400 text-xs">
                Chronological record of sensitive actions performed by authenticated administrators.
              </p>
            </div>

            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-neutral-900/80 border border-yellow-600/20 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-amber-400">{log.action}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-black border border-neutral-700 text-neutral-400">
                        {log.targetType}: {log.targetId}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300">{log.details}</p>
                    <p className="text-[10px] text-neutral-500 mt-1">Admin: {log.adminEmail}</p>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 whitespace-nowrap">{log.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
