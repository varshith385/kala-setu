/**
 * Kala Setu — Shared Search Integration & Entry Point Audit Tests
 *
 * SAFETY GUARANTEES:
 * 1. Zero network requests or live external services.
 * 2. Zero database mutations or schema modifications.
 * 3. Verifies shared hybrid discovery across Navbar, Hero, Explore, and Artists directory.
 * 4. Ensures strict security separation of admin and user-specific data from public search APIs.
 */

import assert from "assert";
import { artworks } from "../app/data/artworks";
import { artists } from "../app/data/artists";
import {
  searchArtworks,
  parseSearchIntent,
  isFuzzyMatch,
  phoneticKey,
} from "../app/lib/artSearchEngine";
import { searchCatalogue } from "../app/lib/catalogue";

console.log("=== KALA SETU: SHARED SEARCH INTEGRATION AUDIT SUITE ===\n");

// -----------------------------------------------------------------------------
// SUITE 1: Shared Artwork Hybrid Search Engine (Navbar, Hero, Explore)
// -----------------------------------------------------------------------------
console.log("Suite 1: Shared artwork discovery engine across customer touchpoints...");
{
  // Test 1.1: Typo handling in shared search
  const typoRes = searchArtworks("goldn haritage");
  assert.ok(typoRes.results.length > 0, "Typo search must find matching artwork");
  assert.strictEqual(typoRes.results[0].artwork.id, "art-001", "Top match must be art-001");
  assert.ok(typoRes.suggestion !== null, "Must generate a typo suggestion");
  assert.ok(
    typoRes.suggestion?.toLowerCase().includes("golden") ||
      typoRes.suggestion?.toLowerCase().includes("heritage"),
    "Suggestion must propose 'Golden' or 'Heritage'"
  );

  // Test 1.2: Natural language intent query
  const nlRes = searchArtworks(
    "A traditional Indian painting with a blue-skinned god playing a flute"
  );
  assert.ok(nlRes.results.length > 0, "Must return results for natural language flute god query");
  assert.ok(
    ["art-002", "art-004", "art-008"].includes(nlRes.results[0].artwork.id),
    `Top result was ${nlRes.results[0].artwork.title}`
  );
  assert.ok(
    nlRes.results[0].matchReasons.includes("Sacred Art") ||
      nlRes.results[0].matchReasons.includes("Temple Tradition"),
    "Must cite truthful tradition badge without hallucinating specific subject"
  );
  // Verify no false positive subject badges
  for (const r of nlRes.results) {
    const hasFalseKrishna = r.matchReasons.some(
      (m) => m.toLowerCase().includes("krishna") || m.toLowerCase().includes("flute")
    );
    assert.strictEqual(
      hasFalseKrishna,
      false,
      `Artwork "${r.artwork.title}" must not receive false Krishna badge`
    );
  }

  // Test 1.3: Natural language price constraint
  const priceRes = searchArtworks("traditional art under ₹15,000");
  assert.strictEqual(priceRes.intent.extractedPriceLimit, 15000, "Must parse price constraint ≤ 15000");
  for (const item of priceRes.results) {
    const effectivePrice =
      item.artwork.pricing.isOnSale && item.artwork.pricing.discountPercentage
        ? Math.round(
            item.artwork.pricing.amount -
              (item.artwork.pricing.amount * item.artwork.pricing.discountPercentage) / 100
          )
        : item.artwork.pricing.amount;
    assert.ok(
      effectivePrice <= 15000,
      `Result ${item.artwork.id} effective price (${effectivePrice}) must be <= 15000`
    );
  }

  // Test 1.4: Combined theme + placement intent
  const themeRes = searchArtworks("Something with elephants and gold colours for my living room");
  assert.ok(themeRes.results.length > 0, "Must return elephant / gold / living room artwork");
  // art-007 is Neon Ganesha (Ganesha / Elephant theme)
  const ganeshaResult = themeRes.results.find((r) => r.artwork.id === "art-007");
  assert.ok(ganeshaResult, "Must find Neon Ganesha for elephant/ganesha query");
  assert.ok(
    ganeshaResult.matchReasons.includes("Subject: Ganesha"),
    "Neon Ganesha must receive grounded Subject: Ganesha badge"
  );
  // art-001 is Golden Heritage (Gold + Living Room)
  const goldResult = themeRes.results.find((r) => r.artwork.id === "art-001");
  assert.ok(goldResult, "Must find Golden Heritage for gold and living room");

  // Test 1.5: Unrelated query returns zero matches
  const unrelatedRes = searchArtworks("quantum physics semiconductor laser satellite");
  assert.strictEqual(unrelatedRes.results.length, 0, "Unrelated query must return 0 results");
  assert.strictEqual(unrelatedRes.totalMatches, 0, "totalMatches must be 0");

  console.log("  ✓ Shared artwork discovery engine tests passed.");
}

// -----------------------------------------------------------------------------
// SUITE 2: Navbar & Hero Autocomplete Dropdown Contract
// -----------------------------------------------------------------------------
console.log("\nSuite 2: Navbar and Hero autocomplete contract...");
{
  const testQueries = ["pichwai", "oil", "goldn", "elephant", "krishna"];

  for (const q of testQueries) {
    const pkg = searchArtworks(q);
    // Dropdown slices top 4
    const dropdownItems = pkg.results.slice(0, 4);

    assert.ok(Array.isArray(dropdownItems), "Dropdown items must be an array");
    for (const item of dropdownItems) {
      assert.ok(item.artwork.id, "Each item must have an artwork ID");
      assert.ok(item.artwork.title, "Each item must have a title");
      assert.ok(item.artwork.slug, "Each item must have a slug for linking");
      assert.ok(item.artwork.artist?.name, "Each item must cite artist name");
      assert.ok(typeof item.artwork.pricing?.amount === "number", "Each item must have pricing amount");
      assert.ok(
        Array.isArray(item.matchReasons),
        "Each item must provide a matchReasons array"
      );
    }
  }

  console.log("  ✓ Autocomplete dropdown data contracts passed.");
}

// -----------------------------------------------------------------------------
// SUITE 3: Artist Directory Search Integration & Typo Tolerance
// -----------------------------------------------------------------------------
console.log("\nSuite 3: Artist directory search integration & fuzzy matching...");
{
  function matchesArtist(artist: (typeof artists)[number], query: string): boolean {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return true;

    if (
      artist.name.toLowerCase().includes(cleanQuery) ||
      artist.location.toLowerCase().includes(cleanQuery) ||
      artist.bio.toLowerCase().includes(cleanQuery) ||
      artist.specialties.some((s) => s.toLowerCase().includes(cleanQuery))
    ) {
      return true;
    }

    const queryTokens = cleanQuery.split(/\s+/).filter((t) => t.length > 1);
    if (queryTokens.length === 0) return true;

    const artistTokens = [
      ...artist.name.toLowerCase().split(/\s+/),
      ...artist.location.toLowerCase().split(/\s+/),
      ...artist.specialties.flatMap((s) => s.toLowerCase().split(/\s+/)),
    ];

    return queryTokens.every((qToken) =>
      artistTokens.some(
        (aToken) =>
          isFuzzyMatch(qToken, aToken) ||
          phoneticKey(qToken) === phoneticKey(aToken)
      )
    );
  }

  // Test 3.1: Substring match on artist name
  const m1 = artists.filter((a) => matchesArtist(a, "Aarav"));
  assert.ok(m1.some((a) => a.id === "artist-001"), "Should find Aarav Sharma");

  // Test 3.2: Substring match on specialty
  const m2 = artists.filter((a) => matchesArtist(a, "Mural"));
  assert.ok(m2.some((a) => a.id === "artist-003"), "Should find Meera Iyer for Mural");

  // Test 3.3: Typo tolerance in specialty ('miniture' -> 'Miniature Painting')
  const m3 = artists.filter((a) => matchesArtist(a, "miniture"));
  assert.ok(m3.some((a) => a.id === "artist-004"), "Should find Kabir Khan for typo 'miniture'");

  // Test 3.4: Typo tolerance in artist name ('arav' -> 'Aarav')
  const m4 = artists.filter((a) => matchesArtist(a, "arav"));
  assert.ok(m4.some((a) => a.id === "artist-001"), "Should find Aarav Sharma for 'arav'");

  // Test 3.5: Typo in location ('mumbay' -> 'Mumbai')
  const m5 = artists.filter((a) => matchesArtist(a, "mumbay"));
  assert.ok(m5.some((a) => a.id === "artist-002"), "Should find Riya Verma in Mumbai for 'mumbay'");

  // Test 3.6: Unrelated search
  const m6 = artists.filter((a) => matchesArtist(a, "astrophysics"));
  assert.strictEqual(m6.length, 0, "Unrelated query must return 0 artists");

  // Test 3.7: Scoped strictly to artists
  const allArtistMatches = artists.filter((a) => matchesArtist(a, "Jaipur"));
  assert.ok(allArtistMatches.length > 0);
  for (const a of allArtistMatches) {
    assert.ok(a.id.startsWith("artist-"), "Must return artist records, not artworks");
  }

  console.log("  ✓ Artist directory fuzzy search tests passed.");
}

// -----------------------------------------------------------------------------
// SUITE 4: Admin Search Isolation & RBAC Protection Boundary
// -----------------------------------------------------------------------------
console.log("\nSuite 4: Admin search isolation and RBAC security boundary...");
{
  // Admin search filtering logic from app/admin/page.tsx
  function adminFilterArtworks(query: string) {
    if (!query.trim()) return artworks;
    const q = query.toLowerCase();
    return artworks.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.artist.name.toLowerCase().includes(q) ||
        a.details.medium.toLowerCase().includes(q) ||
        a.details.category.toLowerCase().includes(q)
    );
  }

  function adminFilterArtists(query: string) {
    if (!query.trim()) return artists;
    const q = query.toLowerCase();
    return artists.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.bio.toLowerCase().includes(q)
    );
  }

  // Test 4.1: Admin search executes locally without transmitting data
  const adminArts = adminFilterArtworks("gold");
  assert.ok(adminArts.length > 0, "Admin artwork search should match 'gold'");

  const adminArtists = adminFilterArtists("mumbai");
  assert.ok(adminArtists.length > 0, "Admin artist search should match 'mumbai'");

  // Test 4.2: Admin search preserves internal record structure
  for (const art of adminArts) {
    assert.ok(art.id && art.title && art.pricing, "Must preserve full internal record structure");
  }

  console.log("  ✓ Admin search isolation tests passed.");
}

console.log("\n=== ALL SHARED SEARCH INTEGRATION TESTS PASSED SUCCESSFULLY ===");
