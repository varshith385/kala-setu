/**
 * Kala Setu — Phase 2A: Catalogue Identity Resolver Unit Tests
 *
 * SAFETY GUARANTEES:
 * 1. Zero network requests or Supabase client invocations.
 * 2. Zero database reads, writes, or schema mutations.
 * 3. Pure in-memory reference validation against authoritative catalogue records.
 * 4. Never invents, generates, or assumes arbitrary database UUIDs.
 */

import { artworks, Artwork } from "../app/data/artworks";
import { artists } from "../app/data/artists";

export interface ResolutionResult {
  found: boolean;
  artwork: Artwork | null;
  canonicalSlug?: string;
  matchedBy?: "id" | "slug";
  errorCode?: "NOT_FOUND" | "AMBIGUOUS_MATCH" | "INVALID_INPUT";
  message?: string;
}

export interface ArtistResolutionResult {
  found: boolean;
  artist: (typeof artists)[number] | null;
  canonicalId?: string;
  matchedBy?: "id" | "name";
  errorCode?: "NOT_FOUND" | "AMBIGUOUS_MATCH" | "INVALID_INPUT";
  message?: string;
}

/**
 * Pure catalogue identity resolver for artworks.
 * Maps an incoming identifier (either legacy static ID e.g. "art-001" or canonical slug e.g. "golden-heritage")
 * to the verified in-memory catalogue record.
 */
export function resolveCatalogueArtwork(
  identifier: unknown,
  catalogue: Artwork[] = artworks
): ResolutionResult {
  if (typeof identifier !== "string" || !identifier.trim()) {
    return {
      found: false,
      artwork: null,
      errorCode: "INVALID_INPUT",
      message: "Identifier must be a non-empty string",
    };
  }

  const clean = identifier.trim().toLowerCase();

  // Step 1: Search by exact static ID (e.g. "art-001")
  const idMatches = catalogue.filter((a) => a.id.toLowerCase() === clean);
  // Step 2: Search by exact canonical slug (e.g. "golden-heritage")
  const slugMatches = catalogue.filter((a) => a.slug.toLowerCase() === clean);

  // Ambiguity detection: If an ID and a Slug in a modified or corrupted catalogue collide across different artworks
  if (idMatches.length > 1 || slugMatches.length > 1) {
    return {
      found: false,
      artwork: null,
      errorCode: "AMBIGUOUS_MATCH",
      message: `Ambiguous mapping: multiple artworks matched identifier "${identifier}"`,
    };
  }

  if (idMatches.length === 1 && slugMatches.length === 1 && idMatches[0].id !== slugMatches[0].id) {
    return {
      found: false,
      artwork: null,
      errorCode: "AMBIGUOUS_MATCH",
      message: `Ambiguous cross-match: ID and Slug matched different artworks for "${identifier}"`,
    };
  }

  if (idMatches.length === 1) {
    const art = idMatches[0];
    return {
      found: true,
      artwork: art,
      canonicalSlug: art.slug,
      matchedBy: "id",
    };
  }

  if (slugMatches.length === 1) {
    const art = slugMatches[0];
    return {
      found: true,
      artwork: art,
      canonicalSlug: art.slug,
      matchedBy: "slug",
    };
  }

  return {
    found: false,
    artwork: null,
    errorCode: "NOT_FOUND",
    message: `Artwork not found in catalogue for identifier "${identifier}"`,
  };
}

/**
 * Pure artist identity resolver.
 */
export function resolveCatalogueArtist(
  identifier: unknown,
  artistList: typeof artists = artists
): ArtistResolutionResult {
  if (typeof identifier !== "string" || !identifier.trim()) {
    return {
      found: false,
      artist: null,
      errorCode: "INVALID_INPUT",
      message: "Artist identifier must be a non-empty string",
    };
  }

  const clean = identifier.trim().toLowerCase();
  const idMatches = artistList.filter((a) => a.id.toLowerCase() === clean);
  const nameMatches = artistList.filter((a) => a.name.toLowerCase() === clean);

  if (idMatches.length > 1 || nameMatches.length > 1) {
    return {
      found: false,
      artist: null,
      errorCode: "AMBIGUOUS_MATCH",
      message: `Ambiguous artist mapping for "${identifier}"`,
    };
  }

  if (idMatches.length === 1) {
    return {
      found: true,
      artist: idMatches[0],
      canonicalId: idMatches[0].id,
      matchedBy: "id",
    };
  }

  if (nameMatches.length === 1) {
    return {
      found: true,
      artist: nameMatches[0],
      canonicalId: nameMatches[0].id,
      matchedBy: "name",
    };
  }

  return {
    found: false,
    artist: null,
    errorCode: "NOT_FOUND",
    message: `Artist not found for identifier "${identifier}"`,
  };
}

// =============================================================================
// TEST SUITE EXECUTION
// =============================================================================

async function runCatalogueResolverTests() {
  console.log("===============================================================");
  console.log(" KALA SETU — CATALOGUE IDENTITY RESOLVER UNIT TESTS            ");
  console.log(" Mode: Pure In-Memory (Zero Network / Zero Database Mutations) ");
  console.log("===============================================================\n");

  let passed = 0;
  let total = 0;

  function assert(testName: string, condition: boolean, extraInfo?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] Test ${total}: ${testName}`);
    } else {
      console.error(`[FAIL] Test ${total}: ${testName}${extraInfo ? ` — ${extraInfo}` : ""}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Static Catalogue Size & 1:1 Slug Bijection
  // ---------------------------------------------------------------------------
  console.log("--- 1. Static Catalogue Inventory & Slug Bijection ---");

  assert("Catalogue contains exactly 13 canonical artworks", artworks.length === 13);

  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  let allIdsUnique = true;
  let allSlugsUnique = true;

  for (const art of artworks) {
    if (seenIds.has(art.id)) allIdsUnique = false;
    seenIds.add(art.id);

    if (seenSlugs.has(art.slug)) allSlugsUnique = false;
    seenSlugs.add(art.slug);
  }

  assert("All 13 static artwork IDs are unique", allIdsUnique);
  assert("All 13 static artwork slugs are unique", allSlugsUnique);
  assert("Artwork IDs and slugs have a 1-to-1 bijection", seenIds.size === 13 && seenSlugs.size === 13);

  // Verify all 13 artworks individually map to their canonical slug
  for (const art of artworks) {
    const resId = resolveCatalogueArtwork(art.id);
    assert(
      `Static ID "${art.id}" resolves to canonical slug "${art.slug}"`,
      resId.found && resId.canonicalSlug === art.slug && resId.artwork?.id === art.id
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Demonstration Artist Integrity
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. Demonstration Artist Integrity ---");

  assert("Demonstration artist list contains exactly 4 master artists", artists.length === 4);

  const artistIds = new Set(artists.map((a) => a.id));
  assert("All 4 demonstration artist IDs are unique", artistIds.size === 4);

  const expectedArtistIds = ["artist-001", "artist-002", "artist-003", "artist-004"];
  const allExpectedPresent = expectedArtistIds.every((id) => artistIds.has(id));
  assert("Demonstration artist IDs match expected canonical set", allExpectedPresent);

  // Verify every artwork links to an authentic artist ID in artists.ts
  let allArtworksHaveValidArtist = true;
  for (const art of artworks) {
    if (!artistIds.has(art.artist.id)) {
      allArtworksHaveValidArtist = false;
    }
  }
  assert("Every artwork in catalogue references an existing artist in artists.ts", allArtworksHaveValidArtist);

  // ---------------------------------------------------------------------------
  // 3. Equivalence: Static ID vs. Canonical Slug Lookup
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. Static ID vs. Canonical Slug Equivalence ---");

  for (const art of artworks) {
    const fromId = resolveCatalogueArtwork(art.id);
    const fromSlug = resolveCatalogueArtwork(art.slug);

    assert(
      `ID "${art.id}" and Slug "${art.slug}" resolve to identical artwork ("${art.title}")`,
      fromId.found &&
        fromSlug.found &&
        fromId.artwork === fromSlug.artwork &&
        fromId.artwork?.title === art.title &&
        fromId.matchedBy === "id" &&
        fromSlug.matchedBy === "slug"
    );
  }

  // Case-insensitivity check
  const mixedCaseId = resolveCatalogueArtwork("ArT-001");
  const mixedCaseSlug = resolveCatalogueArtwork("GoLdEn-HeRiTaGe");
  assert(
    "Resolver supports case-insensitive lookup for ID and slug",
    mixedCaseId.found &&
      mixedCaseSlug.found &&
      mixedCaseId.artwork?.id === "art-001" &&
      mixedCaseSlug.artwork?.slug === "golden-heritage"
  );

  // ---------------------------------------------------------------------------
  // 4. Explicit Not-Found Handling for Unknown Inputs
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. Explicit Not-Found & Invalid Input Handling ---");

  const unknownId = resolveCatalogueArtwork("art-999");
  assert("Unknown artwork ID returns found: false", !unknownId.found);
  assert("Unknown artwork ID returns errorCode: 'NOT_FOUND'", unknownId.errorCode === "NOT_FOUND");
  assert("Unknown artwork ID returns artwork: null", unknownId.artwork === null);

  const unknownSlug = resolveCatalogueArtwork("non-existent-masterpiece-slug");
  assert("Unknown slug returns found: false with 'NOT_FOUND'", !unknownSlug.found && unknownSlug.errorCode === "NOT_FOUND");

  const emptyString = resolveCatalogueArtwork("");
  assert("Empty string identifier returns 'INVALID_INPUT'", !emptyString.found && emptyString.errorCode === "INVALID_INPUT");

  const whitespaceString = resolveCatalogueArtwork("   ");
  assert("Whitespace-only identifier returns 'INVALID_INPUT'", !whitespaceString.found && whitespaceString.errorCode === "INVALID_INPUT");

  const nonStringInput = resolveCatalogueArtwork(null);
  assert("Null input returns 'INVALID_INPUT'", !nonStringInput.found && nonStringInput.errorCode === "INVALID_INPUT");

  // Unknown artist lookup
  const unknownArtist = resolveCatalogueArtist("artist-999");
  assert("Unknown artist ID returns 'NOT_FOUND'", !unknownArtist.found && unknownArtist.errorCode === "NOT_FOUND");

  // ---------------------------------------------------------------------------
  // 5. Ambiguity & Duplicate Protection
  // ---------------------------------------------------------------------------
  console.log("\n--- 5. Ambiguity & Duplicate Detection ---");

  // Construct a synthetic catalogue with a duplicate slug to test defensive handling
  const corruptedCatalogue: Artwork[] = [
    { ...artworks[0], id: "art-custom-1", slug: "duplicate-slug" },
    { ...artworks[1], id: "art-custom-2", slug: "duplicate-slug" },
  ];

  const ambiguousSlugResult = resolveCatalogueArtwork("duplicate-slug", corruptedCatalogue);
  assert(
    "Ambiguous slug across multiple artworks fails cleanly with 'AMBIGUOUS_MATCH'",
    !ambiguousSlugResult.found && ambiguousSlugResult.errorCode === "AMBIGUOUS_MATCH"
  );

  // Synthetic catalogue where an ID of Artwork A collides with the Slug of Artwork B
  const crossCollisionCatalogue: Artwork[] = [
    { ...artworks[0], id: "shared-key", slug: "unique-slug-a" },
    { ...artworks[1], id: "unique-id-b", slug: "shared-key" },
  ];

  const collisionResult = resolveCatalogueArtwork("shared-key", crossCollisionCatalogue);
  assert(
    "Cross-collision between ID and Slug of different artworks fails with 'AMBIGUOUS_MATCH'",
    !collisionResult.found && collisionResult.errorCode === "AMBIGUOUS_MATCH"
  );

  // ---------------------------------------------------------------------------
  // 6. Verification That No Invented Database UUIDs Are Emitted
  // ---------------------------------------------------------------------------
  console.log("\n--- 6. No Invented Database UUID Invariant ---");

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  let anyInventedUuidFound = false;
  for (const art of artworks) {
    const res = resolveCatalogueArtwork(art.id);
    if (res.artwork) {
      if (UUID_REGEX.test(res.artwork.id) || (res.canonicalSlug && UUID_REGEX.test(res.canonicalSlug))) {
        anyInventedUuidFound = true;
      }
    }
  }

  assert(
    "Resolver returns authentic catalogue keys without fabricating database UUIDs",
    !anyInventedUuidFound
  );

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n===============================================================");
  console.log(` SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log(` RESULT: ${passed === total ? "ALL IN-MEMORY UNIT TESTS PASSED ✅" : "SOME TESTS FAILED ❌"}`);
  console.log("===============================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runCatalogueResolverTests().catch((err) => {
  console.error("Fatal test execution error:", err);
  process.exit(1);
});
