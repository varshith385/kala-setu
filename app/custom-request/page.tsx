"use client";

import { useState } from "react";
import { artists } from "../data/artists";

export default function CustomRequestPage() {
  const [form, setForm] = useState({
    name: "",
    idea: "",
    budget: "",
    artistPhone: "",
  });

  const handleSubmit = () => {
    if (!form.name || !form.idea || !form.artistPhone) {
      alert("Please fill all fields");
      return;
    }

    const message = `Hello! My name is ${form.name}.
I want to request a custom artwork.

Idea: ${form.idea}

Budget: ₹${form.budget}

Can we discuss further?`;

    const url = `https://wa.me/${form.artistPhone}?text=${encodeURIComponent(message)}`;

    // Reset form then open WhatsApp in new tab
    setForm({ name: "", idea: "", budget: "", artistPhone: "" });
    window.open(url, "_blank");
  };

  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-2xl mx-auto">

        <p className="uppercase tracking-[0.25em] text-xs text-yellow-500/70 mb-3 text-center">
          Made Just For You
        </p>
        <h1 className="font-display text-4xl text-yellow-500 mb-4 text-center">
          Request Custom Artwork
        </h1>
        <p className="text-gray-400 text-center mb-12">
          Tell us your idea, pick an artist, and we'll connect you directly on WhatsApp.
        </p>

        <div className="bg-neutral-900 border border-yellow-600/30 rounded-xl p-8 space-y-6">

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Your Name</label>
            <input
              placeholder="e.g. Priya Sharma"
              value={form.name}
              className="w-full bg-black border border-yellow-600/40 focus:border-yellow-500 outline-none px-4 py-3 rounded-lg text-white placeholder-gray-500"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Describe Your Idea</label>
            <textarea
              placeholder="What do you want the artwork to depict? Style, colors, mood..."
              value={form.idea}
              className="w-full bg-black border border-yellow-600/40 focus:border-yellow-500 outline-none px-4 py-3 rounded-lg text-white placeholder-gray-500"
              rows={4}
              onChange={(e) => setForm({ ...form, idea: e.target.value })}
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Your Budget (₹)</label>
            <input
              placeholder="e.g. 15000"
              value={form.budget}
              className="w-full bg-black border border-yellow-600/40 focus:border-yellow-500 outline-none px-4 py-3 rounded-lg text-white placeholder-gray-500"
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Select Artist</label>
            <select
              value={form.artistPhone}
              className="w-full bg-black border border-yellow-600/40 focus:border-yellow-500 outline-none px-4 py-3 rounded-lg text-white"
              onChange={(e) => setForm({ ...form, artistPhone: e.target.value })}
            >
              <option value="">Choose an artist...</option>
              {artists.map((artist) => (
                <option key={artist.id} value={artist.phone}>
                  {artist.name} — {artist.specialties[0]}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 font-semibold transition rounded-lg"
          >
            Contact Artist on WhatsApp
          </button>

        </div>

      </div>
    </main>
  );
}