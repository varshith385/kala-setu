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

    const url = `https://wa.me/${form.artistPhone}?text=${encodeURIComponent(
      message
    )}`;

    window.open(url, "_blank");
  };

  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-2xl mx-auto">

        <h1 className="text-4xl text-yellow-500 mb-10">
          Request Custom Artwork
        </h1>

        <div className="space-y-6">

          <input
            placeholder="Your Name"
            className="w-full bg-gray-900 border border-gray-700 px-4 py-3"
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <textarea
            placeholder="Describe your custom artwork idea"
            className="w-full bg-gray-900 border border-gray-700 px-4 py-3"
            rows={4}
            onChange={(e) =>
              setForm({ ...form, idea: e.target.value })
            }
          />

          <input
            placeholder="Your Budget (₹)"
            className="w-full bg-gray-900 border border-gray-700 px-4 py-3"
            onChange={(e) =>
              setForm({ ...form, budget: e.target.value })
            }
          />

          <select
            className="w-full bg-gray-900 border border-gray-700 px-4 py-3"
            onChange={(e) =>
              setForm({ ...form, artistPhone: e.target.value })
            }
          >
            <option>Select Artist</option>

            {artists.map((artist) => (
              <option key={artist.id} value={artist.phone}>
                {artist.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleSubmit}
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 font-semibold transition"
          >
            Contact Artist on WhatsApp
          </button>

        </div>

      </div>
    </main>
  );
}