"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { artists } from "../data/artists";
import {
  buildWhatsAppInquiryMessage,
  buildWhatsAppUrl,
  normalizeWhatsAppPhone,
  openWhatsAppSafely,
} from "../lib/whatsapp";

function CustomRequestContent() {
  const searchParams = useSearchParams();
  const artistParam = searchParams.get("artist") || "";
  const refParam = searchParams.get("ref") || "";

  const [form, setForm] = useState(() => ({
    name: "",
    phone: "",
    email: "",
    artistId: artistParam,
    idea: refParam ? `Inspired by "${refParam}": ` : "",
    medium: "Acrylic on Canvas",
    size: "Medium (24x36 inches)",
    budget: "",
  }));

  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [popupBlocked, setPopupBlocked] = useState(false);

  const selectedArtist = artists.find((a) => a.id === form.artistId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!form.name.trim() || !form.idea.trim() || !selectedArtist) {
      setErrorMessage("Please provide your name, idea description, and select an artist.");
      return;
    }

    try {
      const message = buildWhatsAppInquiryMessage({
        collectorName: form.name,
        collectorPhone: form.phone,
        collectorEmail: form.email,
        artistName: selectedArtist.name,
        artistLocation: selectedArtist.location,
        artworkReference: refParam || undefined,
        medium: form.medium,
        size: form.size,
        budget: form.budget,
        vision: form.idea,
      });

      const waUrl = buildWhatsAppUrl(selectedArtist.phone, message);
      const cleanPhone = normalizeWhatsAppPhone(selectedArtist.phone);

      setGeneratedMessage(message);
      setWhatsappUrl(waUrl);
      setNormalizedPhone(cleanPhone);

      // Attempt to open WhatsApp directly
      const openResult = openWhatsAppSafely(waUrl);
      setPopupBlocked(openResult.popupBlocked);
      setSubmitted(true);
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : "Failed to prepare inquiry for WhatsApp";
      setErrorMessage(errText);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-gray-400 flex items-center justify-center gap-2">
        <Link href="/" className="hover:text-yellow-500 transition">Home</Link>
        <span>/</span>
        <span className="text-yellow-500">Commission Custom Art</span>
      </nav>

      <p className="uppercase tracking-[0.25em] text-xs text-yellow-500/80 mb-3 text-center font-medium">
        Made Just For You · Authentic Indian Art
      </p>
      <h1 className="font-display text-4xl md:text-5xl text-yellow-500 mb-4 text-center">
        Commission Custom Artwork
      </h1>
      <p className="text-gray-400 text-center mb-10 leading-relaxed text-sm md:text-base">
        Collaborate directly with India&apos;s master artists. Share your vision, specify canvas dimensions, and connect directly with the artist.
      </p>

      {submitted ? (
        <div className="bg-neutral-900 border border-yellow-600/40 rounded-2xl p-8 md:p-10 text-center">
          <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl text-yellow-400">
            ✓
          </div>
          <h2 className="font-display text-2xl text-yellow-500 mb-2">Inquiry Prepared for WhatsApp</h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Your inquiry for <strong className="text-yellow-400">{selectedArtist?.name}</strong> has been drafted.
          </p>

          {popupBlocked ? (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 text-xs text-amber-300 mb-6 text-left leading-relaxed flex items-start gap-3" role="alert">
              <span className="text-base select-none">⚠️</span>
              <div>
                <p className="font-semibold text-amber-200">Popup Blocked by Browser</p>
                <p className="mt-1 text-amber-300/90">
                  Your browser prevented WhatsApp from opening automatically. Click <strong>&ldquo;Open WhatsApp Now&rdquo;</strong> below to start your conversation with the artist.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3.5 text-xs text-yellow-300 mb-6 text-left leading-relaxed">
              <strong>Next Step:</strong> WhatsApp was opened in a new tab. Please ensure you press <strong>&ldquo;Send&rdquo;</strong> in your WhatsApp chat window to deliver your inquiry to the artist. If WhatsApp did not open automatically, you can open it below or copy the message text.
            </div>
          )}

          <div className="border border-yellow-600/20 bg-black/60 rounded-xl p-4 text-left text-xs text-gray-400 mb-6 space-y-2">
            <p><strong className="text-gray-300">Artist:</strong> {selectedArtist?.name} ({selectedArtist?.location})</p>
            <p><strong className="text-gray-300">WhatsApp Destination:</strong> +{normalizedPhone || "918522847389"}</p>
            {refParam && (
              <p><strong className="text-gray-300">Reference Artwork:</strong> {refParam}</p>
            )}
            <p><strong className="text-gray-300">Format:</strong> {form.medium} · {form.size}</p>
            <p><strong className="text-gray-300">Budget:</strong> ₹{form.budget.trim() || "Open to artist proposal"}</p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2.5 rounded-lg text-sm font-semibold transition inline-flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:shadow-[0_0_25px_rgba(234,179,8,0.5)] cursor-pointer"
            >
              <span>💬</span>
              <span>{popupBlocked ? "Open WhatsApp Now →" : "Open WhatsApp Again →"}</span>
            </a>
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(generatedMessage);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                }
              }}
              className="border border-yellow-600/50 text-yellow-400 hover:bg-yellow-500/10 px-6 py-2.5 rounded-lg text-sm transition cursor-pointer"
            >
              {copied ? "✓ Copied to Clipboard" : "Copy Inquiry Message"}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 border-t border-yellow-600/15">
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setCopied(false);
                setPopupBlocked(false);
              }}
              className="text-gray-400 hover:text-white px-4 py-2 text-xs transition cursor-pointer"
            >
              ← Edit & Submit Another Request
            </button>
            <Link
              href="/explore"
              className="border border-yellow-600/40 text-yellow-400 hover:bg-yellow-500/10 px-5 py-2 rounded-lg text-xs font-medium transition"
            >
              Browse Gallery
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-neutral-900 border border-yellow-600/30 rounded-2xl p-6 md:p-10 space-y-6">
          {errorMessage && (
            <div className="bg-red-950/60 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm" role="alert">
              {errorMessage}
            </div>
          )}

          {/* ARTIST SELECTION */}
          <div>
            <label htmlFor="artist-select" className="text-gray-300 text-sm mb-2 block font-medium">
              Select Artist <span className="text-yellow-500">*</span>
            </label>
            <select
              id="artist-select"
              value={form.artistId}
              required
              className="w-full bg-black border border-yellow-600/40 focus:border-yellow-500 outline-none px-4 py-3 rounded-lg text-white text-sm"
              onChange={(e) => setForm({ ...form, artistId: e.target.value })}
            >
              <option value="">Choose an artist...</option>
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name} ({artist.location}) — {artist.specialties.join(", ")}
                </option>
              ))}
            </select>
            {selectedArtist && (
              <p className="text-xs text-yellow-500/80 mt-1.5 flex items-center gap-1.5">
                <span>⭐ {selectedArtist.rating} Rating</span>
                <span>·</span>
                <span>Experience: {selectedArtist.experience}</span>
              </p>
            )}
          </div>

          {/* COLLECTOR DETAILS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="collector-name" className="text-gray-300 text-sm mb-2 block font-medium">
                Your Name <span className="text-yellow-500">*</span>
              </label>
              <input
                id="collector-name"
                type="text"
                required
                placeholder="e.g. Priya Sharma"
                value={form.name}
                className="w-full bg-black border border-yellow-600/40 focus:border-yellow-500 outline-none px-4 py-3 rounded-lg text-white placeholder-gray-500 text-sm"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="collector-phone" className="text-gray-300 text-sm mb-2 block font-medium">
                Phone Number (WhatsApp)
              </label>
              <input
                id="collector-phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                className="w-full bg-black border border-yellow-600/40 focus:border-yellow-500 outline-none px-4 py-3 rounded-lg text-white placeholder-gray-500 text-sm"
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          {/* MEDIUM & SIZE PREFERENCES (ARTFINDER SPEC) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="medium-select" className="text-gray-300 text-sm mb-2 block font-medium">
                Preferred Medium
              </label>
              <select
                id="medium-select"
                value={form.medium}
                className="w-full bg-black border border-yellow-600/40 focus:border-yellow-500 outline-none px-4 py-3 rounded-lg text-white text-sm"
                onChange={(e) => setForm({ ...form, medium: e.target.value })}
              >
                <option value="Acrylic on Canvas">Acrylic on Canvas</option>
                <option value="Oil on Canvas">Oil on Canvas</option>
                <option value="Watercolor on Archival Paper">Watercolor on Paper</option>
                <option value="Traditional Indian Folk (Madhubani / Warli)">Traditional Folk Art</option>
                <option value="Digital Illustration / Limited Print">Digital Illustration</option>
                <option value="Mixed Media & Gold Leaf">Mixed Media & Gold Leaf</option>
              </select>
            </div>
            <div>
              <label htmlFor="size-select" className="text-gray-300 text-sm mb-2 block font-medium">
                Desired Canvas Dimensions
              </label>
              <select
                id="size-select"
                value={form.size}
                className="w-full bg-black border border-yellow-600/40 focus:border-yellow-500 outline-none px-4 py-3 rounded-lg text-white text-sm"
                onChange={(e) => setForm({ ...form, size: e.target.value })}
              >
                <option value="Small (12x18 inches)">Small (12×18 inches)</option>
                <option value="Medium (24x36 inches)">Medium (24×36 inches)</option>
                <option value="Large (36x48 inches)">Large (36×48 inches)</option>
                <option value="Statement Oversized (48x72+ inches)">Statement (48×72+ inches)</option>
                <option value="Custom Size">Custom Size (Discuss with artist)</option>
              </select>
            </div>
          </div>

          {/* BUDGET */}
          <div>
            <label htmlFor="budget-input" className="text-gray-300 text-sm mb-2 block font-medium">
              Target Budget (₹ INR)
            </label>
            <input
              id="budget-input"
              type="text"
              placeholder="e.g. 25000"
              value={form.budget}
              className="w-full bg-black border border-yellow-600/40 focus:border-yellow-500 outline-none px-4 py-3 rounded-lg text-white placeholder-gray-500 text-sm"
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
            />
          </div>

          {/* IDEA DESCRIPTION */}
          <div>
            <label htmlFor="idea-textarea" className="text-gray-300 text-sm mb-2 block font-medium">
              Describe Your Vision <span className="text-yellow-500">*</span>
            </label>
            <textarea
              id="idea-textarea"
              required
              rows={4}
              placeholder="Describe your subject, mood, color palette, or wall placement (e.g., Living room statement piece with royal temple motifs)..."
              value={form.idea}
              className="w-full bg-black border border-yellow-600/40 focus:border-yellow-500 outline-none px-4 py-3 rounded-lg text-white placeholder-gray-500 text-sm leading-relaxed"
              onChange={(e) => setForm({ ...form, idea: e.target.value })}
            />
          </div>

          {/* TRUST FOOTER NOTE */}
          <div className="p-4 bg-black/40 border border-yellow-600/20 rounded-xl text-xs text-gray-400 space-y-1">
            <p className="text-yellow-400 font-medium">Direct Artist Collaboration:</p>
            <p>You are connecting directly with the artist to discuss bespoke dimensions, color palette, and pricing proposals before commissioning.</p>
          </div>

          <button
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-4 px-8 rounded-lg font-bold text-base transition duration-300 shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)]"
          >
            Connect with Artist on WhatsApp →
          </button>
        </form>
      )}
    </div>
  );
}

export default function CustomRequestPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-12 md:py-20">
      <Suspense fallback={<div className="text-center py-20 text-yellow-500">Loading commission portal...</div>}>
        <CustomRequestContent />
      </Suspense>
    </main>
  );
}