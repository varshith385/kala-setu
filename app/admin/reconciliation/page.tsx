"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { supabase } from "@/app/lib/supabaseClient";
import { artworks } from "@/app/data/artworks";

interface ReconciliationRecord {
  id: string;
  orderRef: string;
  userId: string | null;
  total: number;
  status: string;
  paymentStatus: string;
  paymentId: string;
  razorpayOrderId: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  createdAt: string;
  reconciliationData: {
    title: string;
    reason: string;
    chargedAmountPaise: number;
    reconstructedSum: number;
    itemsToken: string | null;
  };
}

export default function AdminReconciliationPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected order for resolution
  const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null);
  const [selectedArtworks, setSelectedArtworks] = useState<Array<{ id: string; quantity: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Computed sum of currently selected artworks in resolution panel
  const computedResolutionSum = useMemo(() => {
    return selectedArtworks.reduce((sum, item) => {
      const art = artworks.find((a) => a.id === item.id);
      if (!art) return sum;
      const price =
        art.pricing?.isOnSale &&
        typeof art.pricing.discountPercentage === "number" &&
        art.pricing.discountPercentage > 0
          ? Math.round(art.pricing.amount - (art.pricing.amount * art.pricing.discountPercentage) / 100)
          : art.pricing.amount;
      return sum + price * item.quantity;
    }, 0);
  }, [selectedArtworks]);

  const fetchRecords = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setErrorMsg("Authentication token unavailable. Please sign in again.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/reconciliation", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setErrorMsg("Access Denied: Your account does not have administrator privileges.");
        } else {
          setErrorMsg(errJson.error || `Failed to fetch reconciliation records (${res.status})`);
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      setRecords(data.orders || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error fetching records";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (role === "admin") {
      let isMounted = true;
      const loadInitialRecords = async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          if (!token || !isMounted) return;
          const res = await fetch("/api/admin/reconciliation", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            if (isMounted) {
              if (res.status === 403) {
                setErrorMsg("Access Denied: Your account does not have administrator privileges.");
              } else {
                setErrorMsg(errJson.error || `Failed to fetch reconciliation records (${res.status})`);
              }
            }
            return;
          }
          const data = await res.json();
          if (isMounted) {
            setRecords(data.orders || []);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Network error fetching records";
          if (isMounted) setErrorMsg(msg);
        }
      };
      void loadInitialRecords();
      return () => {
        isMounted = false;
      };
    }
  }, [user, role, authLoading, router]);

  const handleOpenResolve = (record: ReconciliationRecord) => {
    setSelectedRecord(record);
    setSelectedArtworks([]);
    setErrorMsg(null);
    setSuccessMsg(null);

    // If itemsToken is available and clean (e.g. "art-001:1"), pre-seed the selector
    if (record.reconciliationData.itemsToken) {
      try {
        const tokens = record.reconciliationData.itemsToken.split(",");
        const initialItems: Array<{ id: string; quantity: number }> = [];
        for (const tok of tokens) {
          const [artId, qStr] = tok.split(":");
          if (artworks.some((a) => a.id === artId)) {
            const q = parseInt(qStr, 10);
            initialItems.push({ id: artId, quantity: Number.isInteger(q) && q > 0 ? q : 1 });
          }
        }
        if (initialItems.length > 0) {
          setSelectedArtworks(initialItems);
        }
      } catch {
        // Pre-seed failed; start empty
      }
    }
  };

  const handleAddArtwork = (artworkId: string) => {
    if (!artworkId) return;
    setSelectedArtworks((prev) => {
      const existing = prev.find((i) => i.id === artworkId);
      if (existing) {
        return prev.map((i) => (i.id === artworkId ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { id: artworkId, quantity: 1 }];
    });
  };

  const handleRemoveArtwork = (artworkId: string) => {
    setSelectedArtworks((prev) => prev.filter((i) => i.id !== artworkId));
  };

  const handleQuantityChange = (artworkId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveArtwork(artworkId);
      return;
    }
    setSelectedArtworks((prev) =>
      prev.map((i) => (i.id === artworkId ? { ...i, quantity } : i))
    );
  };

  const handleConfirmResolve = async () => {
    if (!selectedRecord) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setErrorMsg("Session expired. Please sign in again.");
        setIsSubmitting(false);
        return;
      }

      const res = await fetch("/api/admin/reconciliation/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: selectedRecord.id,
          paymentId: selectedRecord.paymentId,
          razorpayOrderId: selectedRecord.razorpayOrderId,
          resolvedItems: selectedArtworks,
        }),
      });

      let json: { error?: string; code?: string } = {};
      try {
        json = await res.json();
      } catch {
        json = {};
      }

      if (!res.ok) {
        if (json.code === "RPC_NOT_INSTALLED") {
          setErrorMsg(
            "Atomic reconciliation is currently unavailable: the required database migration has not been installed. No order changes were made."
          );
        } else if (json.code === "RPC_EXECUTION_ERROR" || res.status === 504 || res.status === 502) {
          setErrorMsg(
            "A communication timeout or network error occurred during the transaction. The database transaction outcome may be UNCERTAIN. Please refresh the order list and verify the current order state before attempting resolution again."
          );
        } else if (res.status === 409) {
          setErrorMsg(
            "Order reconciliation conflict: this order was already resolved by another concurrent session. Please refresh the order list to view updated records."
          );
        } else {
          setErrorMsg(
            json.error
              ? `${json.error} If a connection timeout occurred, the transaction outcome may be UNCERTAIN; please refresh the order queue and verify state before retrying.`
              : "Resolution request failed. The transaction outcome may be UNCERTAIN; please refresh the order list and verify the current order state before attempting resolution again."
          );
        }
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(
        `Order #${selectedRecord.orderRef} successfully reconciled (₹${Number(selectedRecord.total).toLocaleString("en-IN")}). Status transitioned to 'Processing'.`
      );
      setSelectedRecord(null);
      setSelectedArtworks([]);
      await fetchRecords();
    } catch {
      setErrorMsg(
        "A network or connection failure occurred while communicating with the server. The transaction outcome may be UNCERTAIN. Please refresh the order list and verify the current order state before attempting resolution again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Verifying administrator authorization...</p>
        </div>
      </main>
    );
  }

  if (role !== "admin") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-neutral-900 border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-950/40 border border-red-500/40 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl text-red-400">
            🛡️
          </div>
          <h1 className="font-display text-2xl text-white mb-2">Restricted Console</h1>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            The Payment Reconciliation Console is strictly restricted to Kala Setu administrators. Ordinary buyers and artists cannot view or resolve unallocated payments.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/orders"
              className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2.5 rounded-lg font-bold text-sm transition"
            >
              Return to My Orders
            </Link>
            <Link
              href="/"
              className="border border-yellow-600/30 hover:bg-yellow-500/10 text-yellow-400 px-6 py-2.5 rounded-lg text-sm transition"
            >
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading && !records.length && !errorMsg) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading reconciliation records...</p>
        </div>
      </main>
    );
  }

  const totalUnreconciledValue = records.reduce((sum, r) => sum + Number(r.total || 0), 0);

  return (
    <main className="min-h-screen bg-black text-white py-12 md:py-16 px-4 md:px-12">
      <div className="max-w-7xl mx-auto">
        {/* BREADCRUMB */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-gray-400 flex items-center gap-2">
          <Link href="/" className="hover:text-yellow-500 transition">
            Home
          </Link>
          <span>/</span>
          <span className="text-gray-500">Admin Console</span>
          <span>/</span>
          <span className="text-yellow-500">Payment Reconciliation</span>
        </nav>

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-yellow-600/20">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-2xl md:text-3xl text-white">
                Payment Reconciliation Console
              </h1>
              <span className="bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                Staging Recovery
              </span>
            </div>
            <p className="text-gray-400 text-xs md:text-sm">
              Authoritatively bind genuine captured payments to catalogue inventory without fabricating line items.
            </p>
          </div>

          <button
            onClick={fetchRecords}
            disabled={loading}
            className="flex items-center gap-2 border border-yellow-600/40 hover:bg-yellow-500/10 text-yellow-400 text-xs px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
          >
            <span>↻</span> Refresh Queue
          </button>
        </div>

        {/* ARCHITECTURE LIFECYCLE GUIDE */}
        <div className="bg-neutral-900/60 border border-yellow-600/20 rounded-xl p-4 mb-8">
          <p className="text-xs uppercase tracking-widest text-yellow-500 font-semibold mb-3">
            Authoritative Order Lifecycle Architecture
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-black/40 border border-yellow-600/10 p-3 rounded-lg">
              <span className="text-amber-400 font-bold block mb-1">1. Payment Captured</span>
              <p className="text-gray-400 leading-relaxed">
                Gateway funds captured via Razorpay HMAC signature. Safely recorded in staging DB with status <code className="text-amber-300">Pending</code>.
              </p>
            </div>
            <div className="bg-black/40 border border-yellow-600/10 p-3 rounded-lg">
              <span className="text-yellow-400 font-bold block mb-1">2. Order Reconciled</span>
              <p className="text-gray-400 leading-relaxed">
                Admin verifies authoritative catalogue artwork items matching exact rupee total. Status transitions to <code className="text-yellow-300">Processing</code>.
              </p>
            </div>
            <div className="bg-black/40 border border-yellow-600/10 p-3 rounded-lg">
              <span className="text-green-400 font-bold block mb-1">3. Order Fulfilled</span>
              <p className="text-gray-400 leading-relaxed">
                Physical artwork safely packaged and dispatched directly by the creator. Status updates to <code className="text-green-300">Shipped</code>.
              </p>
            </div>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-neutral-900 border border-yellow-600/20 rounded-xl p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Pending Orders</p>
            <p className="text-2xl font-display text-white">{records.length}</p>
          </div>
          <div className="bg-neutral-900 border border-yellow-600/20 rounded-xl p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Unreconciled Value</p>
            <p className="text-2xl font-bold text-yellow-400">
              ₹ {totalUnreconciledValue.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-neutral-900 border border-yellow-600/20 rounded-xl p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Operator Authorization</p>
            <p className="text-sm font-semibold text-green-400 mt-1 flex items-center gap-1.5">
              <span>●</span> Role: admin (Verified)
            </p>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        {errorMsg && (
          <div className="bg-red-950/70 border border-red-500/50 text-red-200 text-xs p-4 rounded-xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-lg">
            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <p className="font-semibold text-red-200">{errorMsg}</p>
                {errorMsg.includes("UNCERTAIN") && (
                  <p className="text-gray-300 text-[11px] mt-1">
                    To prevent duplicate resolution, verify whether the order transitioned to Processing before submitting again.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={fetchRecords}
                className="bg-red-900/60 hover:bg-red-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg border border-red-500/40 transition"
              >
                ↻ Refresh Orders
              </button>
              <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white px-2 py-1">
                ✕
              </button>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-green-950/60 border border-green-500/40 text-green-300 text-xs p-4 rounded-xl mb-6 flex justify-between items-center">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-green-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* RESOLUTION WORKFLOW MODAL / PANEL */}
        {selectedRecord && (
          <div className="bg-neutral-900 border-2 border-yellow-500/60 rounded-2xl p-6 md:p-8 mb-10 shadow-[0_0_30px_rgba(234,179,8,0.15)]">
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-yellow-600/20">
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-widest block mb-1">
                  Active Reconciliation Workflow
                </span>
                <h2 className="font-display text-xl text-white">
                  Reconcile Order #{selectedRecord.orderRef}
                </h2>
                <p className="text-gray-400 text-xs mt-1">
                  Target Captured Total: <strong className="text-yellow-400">₹ {Number(selectedRecord.total).toLocaleString("en-IN")}</strong> | Payment ID: <code className="text-gray-300">{selectedRecord.paymentId}</code>
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-white text-sm px-3 py-1 rounded-lg border border-gray-700 hover:border-gray-500 transition"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* AVAILABLE CATALOGUE ARTWORKS */}
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-300 font-semibold mb-3">
                  1. Select Catalogue Artworks:
                </p>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-2 border border-yellow-600/10 rounded-xl p-3 bg-black/40">
                  {artworks.map((art) => {
                    const price =
                      art.pricing?.isOnSale &&
                      typeof art.pricing.discountPercentage === "number" &&
                      art.pricing.discountPercentage > 0
                        ? Math.round(art.pricing.amount - (art.pricing.amount * art.pricing.discountPercentage) / 100)
                        : art.pricing.amount;

                    return (
                      <div
                        key={art.id}
                        className="flex justify-between items-center text-xs py-2 px-3 bg-neutral-900/80 border border-yellow-600/15 rounded-lg hover:border-yellow-500/40 transition"
                      >
                        <div>
                          <p className="text-white font-medium">{art.title}</p>
                          <p className="text-gray-400 text-[11px]">
                            ID: <code className="text-gray-300">{art.id}</code> • ₹ {price.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddArtwork(art.id)}
                          className="bg-yellow-500/20 hover:bg-yellow-500 text-yellow-300 hover:text-black font-semibold px-3 py-1 rounded transition text-xs"
                        >
                          + Add Item
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CHOSEN ITEMS & FINANCIAL RECONCILIATION */}
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-300 font-semibold mb-3">
                  2. Authoritative Allocated Line Items:
                </p>

                {selectedArtworks.length === 0 ? (
                  <div className="border border-dashed border-gray-800 rounded-xl p-8 text-center text-xs text-gray-500">
                    No artworks selected yet. Click &quot;+ Add Item&quot; from the catalog.
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    {selectedArtworks.map((item) => {
                      const art = artworks.find((a) => a.id === item.id);
                      if (!art) return null;
                      const price =
                        art.pricing?.isOnSale &&
                        typeof art.pricing.discountPercentage === "number" &&
                        art.pricing.discountPercentage > 0
                          ? Math.round(art.pricing.amount - (art.pricing.amount * art.pricing.discountPercentage) / 100)
                          : art.pricing.amount;

                      return (
                        <div
                          key={item.id}
                          className="flex justify-between items-center bg-black/60 border border-yellow-600/20 p-3 rounded-lg text-xs"
                        >
                          <div>
                            <p className="text-white font-medium">{art.title}</p>
                            <p className="text-gray-400">₹ {price.toLocaleString("en-IN")} each</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center border border-gray-700 rounded">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                className="px-2 py-0.5 text-gray-400 hover:text-white"
                              >
                                -
                              </button>
                              <span className="px-2 font-mono">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                className="px-2 py-0.5 text-gray-400 hover:text-white"
                              >
                                +
                              </button>
                            </div>
                            <span className="font-bold text-white min-w-16 text-right">
                              ₹ {(price * item.quantity).toLocaleString("en-IN")}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveArtwork(item.id)}
                              className="text-red-400 hover:text-red-300 ml-1"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* FINANCIAL COMPARISON SUMMARY */}
                <div className="bg-black/80 border border-yellow-600/30 rounded-xl p-4 text-xs space-y-2 mt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Captured Payment Total:</span>
                    <span className="text-white font-mono font-bold">
                      ₹ {Number(selectedRecord.total).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Selected Line Items Sum:</span>
                    <span
                      className={`font-mono font-bold ${
                        computedResolutionSum === Number(selectedRecord.total)
                          ? "text-green-400"
                          : "text-amber-400"
                      }`}
                    >
                      ₹ {computedResolutionSum.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-800 flex justify-between items-center">
                    <span className="text-gray-400">Reconciliation Match:</span>
                    {computedResolutionSum === Number(selectedRecord.total) ? (
                      <span className="text-green-400 font-bold flex items-center gap-1">
                        ✓ Exact Match (Ready to Resolve)
                      </span>
                    ) : (
                      <span className="text-amber-400 font-medium">
                        Difference: ₹ {(Number(selectedRecord.total) - computedResolutionSum).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-yellow-600/20">
              <p className="text-xs text-gray-400">
                Resolution will transition the order from <code className="text-amber-300">Pending</code> to <code className="text-yellow-300">Processing</code> and mirror rows to <code className="text-gray-300">order_items</code>.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResolve}
                  disabled={
                    isSubmitting ||
                    selectedArtworks.length === 0 ||
                    computedResolutionSum !== Number(selectedRecord.total)
                  }
                  className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:hover:bg-yellow-500 text-black font-bold px-6 py-2 rounded-lg text-xs transition shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                >
                  {isSubmitting ? "Reconciling..." : "Confirm & Reconcile Order →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RECONCILIATION QUEUE LIST */}
        {records.length === 0 ? (
          <div className="bg-neutral-900/60 border border-yellow-600/20 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl text-yellow-400">
              ✓
            </div>
            <h3 className="font-display text-xl text-white mb-2">Reconciliation Queue Clear</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              There are currently zero unreconciled orders in the staging database. All captured payments have verified line items.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {records.map((record) => (
              <div
                key={record.id}
                data-order-id={record.id}
                data-order-ref={record.orderRef}
                className="bg-neutral-900 border border-yellow-600/30 rounded-2xl p-6 md:p-8 hover:border-yellow-500/50 transition"
              >
                <div className="flex flex-wrap justify-between items-start gap-4 mb-4 pb-4 border-b border-yellow-600/15">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-yellow-400 font-display text-lg">
                        Order #{record.orderRef}
                      </span>
                      <span className="bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
                        ⚠️ Pending Manual Reconciliation
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs">
                      Placed on{" "}
                      {new Date(record.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-400">Captured Amount</p>
                    <p className="text-white font-bold text-xl md:text-2xl">
                      ₹ {Number(record.total).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* DIAGNOSTIC DETAILS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-xs">
                  <div className="bg-black/40 border border-yellow-600/10 p-3.5 rounded-xl space-y-1.5">
                    <p className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                      Customer Details:
                    </p>
                    <p className="text-white font-medium">{record.customerName}</p>
                    <p className="text-gray-400">Phone: {record.customerPhone}</p>
                    <p className="text-gray-400 truncate">Delivery: {record.customerAddress}</p>
                  </div>

                  <div className="bg-black/40 border border-yellow-600/10 p-3.5 rounded-xl space-y-1.5">
                    <p className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                      Gateway Diagnostics:
                    </p>
                    <p className="text-gray-300">
                      Payment ID: <code className="text-yellow-400 font-mono">{record.paymentId}</code>
                    </p>
                    <p className="text-gray-300">
                      Razorpay Order: <code className="text-gray-300 font-mono">{record.razorpayOrderId || "N/A"}</code>
                    </p>
                    <p className="text-amber-300 italic">
                      Reason: {record.reconciliationData.reason}
                    </p>
                    {record.reconciliationData.itemsToken && (
                      <p className="text-gray-400">
                        Token hint: <code className="text-gray-200">{record.reconciliationData.itemsToken}</code>
                      </p>
                    )}
                  </div>
                </div>

                {/* ACTION BUTTON */}
                <div className="flex justify-between items-center pt-2">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>Payment Status: <strong className="text-green-400">paid</strong></span>
                    <span>•</span>
                    <span>Order Status: <strong className="text-amber-400">{record.status}</strong></span>
                  </div>

                  <button
                    type="button"
                    data-order-id={record.id}
                    data-order-ref={record.orderRef}
                    data-action="resolve-order"
                    onClick={() => handleOpenResolve(record)}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                  >
                    Resolve Order & Bind Inventory →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
