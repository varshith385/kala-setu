import { artworks, Artwork } from "../data/artworks";

/**
 * Entity and Intent parsed from a user's natural language query.
 */
export interface SearchIntent {
  rawQuery: string;
  cleanedTokens: string[];
  extractedPriceLimit: number | null;
  extractedFormat: "physical" | "digital" | null;
  extractedRooms: string[];
  extractedMediums: string[];
  extractedTraditions: string[];
  detectedThemes: string[];
  detectedColors: string[];
  isNaturalLanguage: boolean;
  expandedSynonyms: string[];
}

/**
 * Scored artwork result with human-readable relevance explanations.
 */
export interface ScoredArtworkResult {
  artwork: Artwork;
  score: number;
  matchReasons: string[];
  relevanceLevel: "high" | "medium" | "low";
}

/**
 * Search response containing parsed intent, suggestions, and ranked results.
 */
export interface SearchResultPackage {
  query: string;
  intent: SearchIntent;
  results: ScoredArtworkResult[];
  artworks: Artwork[];
  suggestion: string | null;
  totalMatches: number;
}

// ============================================================================
// CURATED INDIAN ART SYNONYM & TRANSLITERATION GRAPH
// ============================================================================

/**
 * Curated synonyms and transliteration variants for traditional Indian art,
 * mediums, deities, subjects, and architectural motifs.
 * Strictly reviewable and grounded in authentic art-historical conventions.
 */
export const INDIAN_ART_SYNONYMS: Record<string, string[]> = {
  // Transliterations & Regional Names
  pichwai: ["pichvai", "pichhavai", "pechwai", "shrinathji", "nathdwara", "lotus", "devotional", "krishna"],
  pichvai: ["pichwai", "pichhavai", "shrinathji", "krishna"],
  mughal: ["mogul", "moghul", "durbar", "darbar", "court", "miniature", "imperial", "peacock throne"],
  mogul: ["mughal", "durbar", "court", "miniature"],
  rajasthani: ["mewar", "marwar", "rajput", "jaipur", "jodhpur", "wasli", "court miniature"],
  tanjore: ["thanjavur", "tanjavur", "gold foil", "temple art", "classical south indian"],
  thanjavur: ["tanjore", "tanjavur", "gold foil"],
  madhubani: ["mithila", "bihari folk", "intricate line art", "tribal folk", "kachni", "bharni"],
  mithila: ["madhubani", "folk art", "tribal"],
  kalamkari: ["qalamkari", "kalamkaari", "srikalahasti", "machilipatnam", "natural dyes"],
  warli: ["varli", "maharashtra tribal", "tarpa", "geometric folk"],
  kerala: ["malabar", "temple mural", "fresco", "panchavarna", "teakwood", "backwaters", "vembanad"],
  deccan: ["hyderabad", "golconda", "bijapur", "deccani", "mughal gold", "bidri"],
  vedic: ["ganga", "ghats", "sacred river", "varanasi", "kashi", "banaras", "dawn prayer", "aarti"],
  dravidian: ["tamil", "chola", "pallava", "gopuram", "temple architecture", "south indian stone"],

  // Deities & Sacred Subjects
  krishna: ["blue god", "flute", "shrinathji", "govinda", "gopala", "murli", "peacock feather", "divine"],
  ganesha: ["ganesh", "ganapati", "vinayaka", "elephant god", "vighnaharta", "modak"],
  ganesh: ["ganesha", "ganapati", "vinayaka", "elephant god"],
  devi: ["goddess", "shakti", "durga", "feminine", "divine mother", "tantric", "yantra", "cosmic"],
  goddess: ["devi", "shakti", "divine feminine", "durga"],

  // Motifs & Fauna
  peacock: ["peacock throne", "feather", "mayura", "mor", "blue", "lapiz"],
  elephant: ["hathi", "gaja", "ganesha", "royal beast", "procession"],
  camel: ["desert", "thar", "caravan", "dusk", "rajasthan", "dunes"],
  palace: ["durbar", "court", "maharaja", "royal", "haveli", "fort", "miniature"],
  durbar: ["darbar", "court", "royal gathering", "palace", "mewar"],
  monsoon: ["rain", "varsha", "petrichor", "clouds", "overcast", "courtyard"],
  river: ["ganga", "currents", "sacred water", "ghats", "flow"],

  // Mediums & Materials
  gold: ["gold leaf", "burnished", "gilded", "royal gold", "vark", "impasto", "metallic"],
  charcoal: ["sketch", "black and white", "monochrome", "chiaroscuro", "shading", "minimal"],
  oil: ["oil on canvas", "linen", "glaze", "rich texture"],
  acrylic: ["acrylic on canvas", "fast drying", "vibrant"],
  watercolor: ["watercolour", "wash", "transparent", "paper"],
  gouache: ["opaque watercolor", "wasli", "mineral colors", "natural pigments"],
  digital: ["illustration", "cyber", "glitch", "neon", "virtual", "print edition"],
  wasli: ["vasli", "handmade paper", "miniature paper"],

  // Spaces & Placement
  living: ["living room", "drawing room", "hall", "lounge", "foyer"],
  pooja: ["pooja room", "puja", "mandir", "prayer room", "temple altar", "sacred"],
  bedroom: ["bedroom", "master suite", "restful", "quiet", "tranquil"],
  office: ["executive suite", "study", "library", "workspace", "boardroom"],
};

/**
 * Common English/Hinglish stop words to remove during intent extraction.
 */
const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "for", "with", "and", "or", "to", "from",
  "by", "of", "is", "are", "was", "were", "it", "its", "i", "me", "my", "we",
  "our", "you", "your", "something", "anything", "some", "painting", "paintings",
  "artwork", "artworks", "art", "arts", "picture", "pictures", "piece", "pieces",
  "find", "show", "get", "want", "looking", "need", "like", "don't", "dont",
  "remember", "name", "called", "type", "kind", "style", "traditional", "indian",
  "please", "can", "could", "would", "under", "below", "less", "than", "budget",
  "around", "approx", "about", "gift", "for", "home"
]);

// ============================================================================
// FUZZY STRING MATCHING (LEVENSHTEIN & PHONETIC NORMALIZATION)
// ============================================================================

/**
 * Calculates the Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[al][bl];
}

/**
 * Determines if two tokens fuzzy match within an adaptive distance threshold.
 */
export function isFuzzyMatch(tokenA: string, tokenB: string): boolean {
  if (tokenA === tokenB) return true;
  if (tokenA.startsWith(tokenB) || tokenB.startsWith(tokenA)) {
    if (Math.min(tokenA.length, tokenB.length) >= 4) return true;
  }

  const maxLen = Math.max(tokenA.length, tokenB.length);
  if (maxLen <= 3) return tokenA === tokenB;

  const allowedDist = maxLen <= 5 ? 1 : 2;
  return levenshteinDistance(tokenA, tokenB) <= allowedDist;
}

/**
 * Generates simplified phonetic representation of an Indian English word
 * to catch common transliteration variants (e.g. sh/s, v/w, ph/f, ee/i, oo/u).
 */
export function phoneticKey(word: string): string {
  return word
    .toLowerCase()
    .replace(/ph/g, "f")
    .replace(/sh/g, "s")
    .replace(/v/g, "w")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/aa/g, "a")
    .replace(/dh/g, "d")
    .replace(/th/g, "t")
    .replace(/kh/g, "k")
    .replace(/gh/g, "g")
    .replace(/bh/g, "b")
    .replace(/ch/g, "c")
    .replace(/ck/g, "k")
    .replace(/q/g, "k")
    .replace(/[^a-z0-9]/g, "");
}

// ============================================================================
// NATURAL LANGUAGE QUERY PARSER & INTENT EXTRACTOR
// ============================================================================

/**
 * Parses user search query into structured constraints, detected entities,
 * and expanded synonyms.
 */
export function parseSearchIntent(query: string): SearchIntent {
  const raw = (query || "").trim();
  const lower = raw.toLowerCase();

  // 1. Extract Price Constraint (e.g. "under 15000", "< 20000", "under ₹15,000", "12k", "below 15k")
  let extractedPriceLimit: number | null = null;
  const priceRegex = /(?:under|below|less\s+than|budget(?:\s+of)?|max|upto|up\s+to|within|<=?)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|thousand|lakh)?/i;
  const priceMatch = lower.match(priceRegex);

  if (priceMatch) {
    let numeric = parseFloat(priceMatch[1].replace(/,/g, ""));
    const unit = (priceMatch[2] || "").toLowerCase();
    if (unit === "k" || unit === "thousand") {
      numeric *= 1000;
    } else if (unit === "lakh") {
      numeric *= 100000;
    }
    if (!isNaN(numeric) && numeric > 0) {
      extractedPriceLimit = Math.round(numeric);
    }
  }

  // 2. Extract Format / Category Intent (Physical vs Digital)
  let extractedFormat: "physical" | "digital" | null = null;
  if (/\b(digital|nft|print|cyber|glitch|illustration)\b/i.test(lower)) {
    extractedFormat = "digital";
  } else if (/\b(original|physical|canvas|wood|linen|handmade|acrylic|oil|gouache|charcoal)\b/i.test(lower)) {
    extractedFormat = "physical";
  }

  // 3. Extract Room Suitability
  const extractedRooms: string[] = [];
  const roomPatterns: [RegExp, string][] = [
    [/\b(living\s*room|hall|drawing\s*room|lounge|foyer)\b/i, "Living Room"],
    [/\b(pooja|puja|mandir|prayer|temple)\b/i, "Pooja Room"],
    [/\b(bed\s*room|master\s*bedroom)\b/i, "Bedroom"],
    [/\b(executive\s*suite|office|boardroom)\b/i, "Executive Suite"],
    [/\b(study|library|workspace)\b/i, "Study / Library"],
    [/\b(dining\s*room|dining)\b/i, "Dining Room"],
    [/\b(creative\s*studio|studio)\b/i, "Creative Studio"],
  ];
  for (const [pattern, roomName] of roomPatterns) {
    if (pattern.test(lower) && !extractedRooms.includes(roomName)) {
      extractedRooms.push(roomName);
    }
  }

  // 4. Extract Mediums
  const extractedMediums: string[] = [];
  const mediumPatterns: [RegExp, string][] = [
    [/\b(acrylic)\b/i, "Acrylic"],
    [/\b(oil|linen)\b/i, "Oil"],
    [/\b(watercolor|watercolour)\b/i, "Watercolor"],
    [/\b(gouache|wasli)\b/i, "Gouache"],
    [/\b(charcoal)\b/i, "Charcoal"],
    [/\b(digital)\b/i, "Digital"],
    [/\b(pigment|panchavarna)\b/i, "Natural Pigments"],
    [/\b(mixed\s*media)\b/i, "Mixed Media"],
  ];
  for (const [pattern, med] of mediumPatterns) {
    if (pattern.test(lower) && !extractedMediums.includes(med)) {
      extractedMediums.push(med);
    }
  }

  // 5. Extract Traditions
  const extractedTraditions: string[] = [];
  const traditionPatterns: [RegExp, string][] = [
    [/\b(deccan|mughal|mogul|gold)\b/i, "Deccan & Mughal Gold"],
    [/\b(vedic|ganga|ghat|river)\b/i, "Vedic & Sacred River"],
    [/\b(kerala|malabar|mural)\b/i, "Kerala Temple Murals"],
    [/\b(rajasthan|rajasthani|mewar|miniature|durbar)\b/i, "Rajasthani Court Miniatures"],
    [/\b(dravidian|chola|temple\s*silence)\b/i, "Dravidian Temple Architecture"],
    [/\b(thar|desert|camel)\b/i, "Thar Desert Folklore"],
  ];
  for (const [pattern, trad] of traditionPatterns) {
    if (pattern.test(lower) && !extractedTraditions.includes(trad)) {
      extractedTraditions.push(trad);
    }
  }

  // 6. Extract Themes & Iconography
  const detectedThemes: string[] = [];
  const themePatterns: [RegExp, string][] = [
    [/\b(flute|flutes|krishna|blue\s*skinned|blue\s*god|shrinathji)\b/i, "Krishna / Sacred Divine"],
    [/\b(elephant|elephants|hathi|gaja|ganesh|ganesha|ganapati)\b/i, "Ganesha / Royal Elephant"],
    [/\b(peacock|peacocks|feather|feathers|throne)\b/i, "Peacock Motif"],
    [/\b(camel|camels|caravan|caravans|desert|deserts|dune|dunes)\b/i, "Desert Caravan"],
    [/\b(durbar|darbar|palace|palaces|court|courts|maharaja|maharajas|miniature|miniatures|figure|figures)\b/i, "Royal Durbar & Palace"],
    [/\b(rain|monsoon|monsoons|petrichor|cloud|clouds)\b/i, "Monsoon & Rain"],
    [/\b(devi|devis|goddess|goddesses|feminine|shakti)\b/i, "Divine Feminine"],
    [/\b(river|rivers|water|waters|current|currents|ghat|ghats)\b/i, "Sacred Waters"],
    [/\b(temple|temples|sacred|sanctuary|sanctuaries|pooja)\b/i, "Temple Sanctuary"],
  ];
  for (const [pattern, theme] of themePatterns) {
    if (pattern.test(lower) && !detectedThemes.includes(theme)) {
      detectedThemes.push(theme);
    }
  }

  // 7. Extract Colors
  const detectedColors: string[] = [];
  const colorWords = ["gold", "golden", "blue", "red", "neon", "charcoal", "black", "white", "terracotta", "ochre", "green", "emerald"];
  for (const c of colorWords) {
    if (new RegExp(`\\b${c}\\b`, "i").test(lower) && !detectedColors.includes(c)) {
      detectedColors.push(c);
    }
  }

  // 8. Clean tokens and expand synonyms with singular/plural normalization
  const rawWords = lower
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const cleanedTokens: string[] = [];
  const expandedSynonyms: string[] = [];

  for (const rawWord of rawWords) {
    if (STOP_WORDS.has(rawWord)) continue;

    // Stem plural forms (e.g. "elephants" -> "elephant", "patterns" -> "pattern")
    const singular =
      rawWord.endsWith("ies") && rawWord.length > 4
        ? rawWord.slice(0, -3) + "y"
        : rawWord.endsWith("es") && rawWord.length > 4 && !rawWord.endsWith("ees")
        ? rawWord.slice(0, -2)
        : rawWord.endsWith("s") && rawWord.length > 3 && !rawWord.endsWith("ss")
        ? rawWord.slice(0, -1)
        : rawWord;

    if (!cleanedTokens.includes(rawWord)) {
      cleanedTokens.push(rawWord);
    }

    const wordsToProcess = Array.from(new Set([rawWord, singular]));

    for (const word of wordsToProcess) {
      // Check synonym dictionary
      if (INDIAN_ART_SYNONYMS[word]) {
        for (const syn of INDIAN_ART_SYNONYMS[word]) {
          if (!expandedSynonyms.includes(syn)) {
            expandedSynonyms.push(syn);
          }
        }
      }

      // Check phonetic match in synonym keys
      const pKey = phoneticKey(word);
      for (const [synKey, synList] of Object.entries(INDIAN_ART_SYNONYMS)) {
        if (phoneticKey(synKey) === pKey && synKey !== word) {
          if (!expandedSynonyms.includes(synKey)) {
            expandedSynonyms.push(synKey);
          }
          for (const s of synList) {
            if (!expandedSynonyms.includes(s)) {
              expandedSynonyms.push(s);
            }
          }
        }
      }
    }
  }

  const isNaturalLanguage =
    raw.split(/\s+/).length >= 4 ||
    extractedPriceLimit !== null ||
    extractedRooms.length > 0 ||
    detectedThemes.length > 0;

  return {
    rawQuery: raw,
    cleanedTokens,
    extractedPriceLimit,
    extractedFormat,
    extractedRooms,
    extractedMediums,
    extractedTraditions,
    detectedThemes,
    detectedColors,
    isNaturalLanguage,
    expandedSynonyms,
  };
}

// ============================================================================
// VOCABULARY INDEX & "DID YOU MEAN..." SUGGESTION GENERATOR
// ============================================================================

/**
 * Authoritative vocabulary compiled from catalogue artworks, artists, traditions,
 * mediums, descriptions, and curated synonyms.
 */
function buildCatalogueVocabulary(): string[] {
  const vocab = new Set<string>();

  for (const a of artworks) {
    // Add words from title
    a.title.toLowerCase().split(/\s+/).forEach((w) => vocab.add(w.replace(/[^\w]/g, "")));
    // Add artist words
    a.artist.name.toLowerCase().split(/\s+/).forEach((w) => vocab.add(w.replace(/[^\w]/g, "")));
    // Add regional tradition words
    if (a.details.regionalTradition) {
      a.details.regionalTradition.toLowerCase().split(/\s+/).forEach((w) => vocab.add(w.replace(/[^\w]/g, "")));
    }
    // Add medium words
    a.details.medium.toLowerCase().split(/\s+/).forEach((w) => vocab.add(w.replace(/[^\w]/g, "")));
    // Add description words
    a.description.toLowerCase().split(/\s+/).forEach((w) => vocab.add(w.replace(/[^\w]/g, "")));
    // Add tags
    a.tags.forEach((t) => vocab.add(t.toLowerCase().replace(/[^\w]/g, "")));
  }

  // Add key synonym anchors & phrases
  Object.keys(INDIAN_ART_SYNONYMS).forEach((k) => {
    vocab.add(k);
    INDIAN_ART_SYNONYMS[k].forEach((syn) =>
      syn.toLowerCase().split(/\s+/).forEach((w) => vocab.add(w.replace(/[^\w]/g, "")))
    );
  });

  const commonKeywords = [
    "god", "goddess", "deity", "divine", "sacred", "temple", "flute", "blue", "gold", "golden",
    "elephant", "elephants", "palace", "palaces", "miniature", "miniatures", "figure", "figures",
    "monsoon", "dusk", "desert", "caravan", "river", "rivers", "painting", "paintings",
    "colour", "colours", "color", "colors", "living", "room", "traditional", "indian", "folk",
    "pattern", "patterns", "intricate", "mural", "murals", "fresco", "panel"
  ];
  commonKeywords.forEach((w) => vocab.add(w));

  return Array.from(vocab).filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

const CATALOGUE_VOCABULARY = buildCatalogueVocabulary();

/**
 * Finds the closest vocabulary correction for misspelled query tokens.
 */
export function generateSearchSuggestion(query: string, tokens: string[]): string | null {
  if (!query || tokens.length === 0) return null;

  let hasCorrection = false;
  const correctedTokens: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();
    // If token already exists in vocabulary, keep it
    if (CATALOGUE_VOCABULARY.includes(lower)) {
      correctedTokens.push(token);
      continue;
    }

    // Check phonetic match first
    const pToken = phoneticKey(lower);
    let bestMatch: string | null = null;
    let bestDist = 99;

    for (const vocabWord of CATALOGUE_VOCABULARY) {
      if (phoneticKey(vocabWord) === pToken) {
        bestMatch = vocabWord;
        bestDist = 0;
        break;
      }
      const dist = levenshteinDistance(lower, vocabWord);
      // Stricter distance threshold:
      // Length <= 3: no fuzzy substitution (must be exact/phonetic)
      // Length 4-5: at most 1 substitution
      // Length >= 6: at most 2 substitutions
      const maxAllowed = lower.length <= 3 ? 0 : lower.length <= 5 ? 1 : 2;
      if (dist > 0 && dist <= maxAllowed && dist < bestDist) {
        bestDist = dist;
        bestMatch = vocabWord;
      }
    }

    if (bestMatch && bestMatch !== lower) {
      correctedTokens.push(bestMatch);
      hasCorrection = true;
    } else {
      correctedTokens.push(token);
    }
  }

  if (hasCorrection) {
    const result = correctedTokens.join(" ");
    if (result.toLowerCase() !== query.toLowerCase().trim()) {
      return result;
    }
  }

  return null;
}

// ============================================================================
// HYBRID SCORING & RETRIEVAL ENGINE
// ============================================================================

/**
 * Calculates effective price considering active discounts.
 */
function getEffectivePrice(art: Artwork): number {
  if (
    art.pricing.isOnSale &&
    typeof art.pricing.discountPercentage === "number" &&
    art.pricing.discountPercentage > 0
  ) {
    return Math.round(
      art.pricing.amount - (art.pricing.amount * art.pricing.discountPercentage) / 100
    );
  }
  return art.pricing.amount;
}

/**
 * Executes multi-layered hybrid art discovery over the catalogue.
 */
export function searchArtworks(query: string, candidateArtworks?: Artwork[]): SearchResultPackage {
  const catalogue = candidateArtworks || artworks;
  const rawQuery = (query || "").trim();

  // Handle empty query: return catalogue untouched with empty intent
  if (!rawQuery) {
    return {
      query: "",
      intent: parseSearchIntent(""),
      results: catalogue.map((artwork) => ({
        artwork,
        score: 1.0,
        matchReasons: [],
        relevanceLevel: "high",
      })),
      artworks: catalogue,
      suggestion: null,
      totalMatches: catalogue.length,
    };
  }

  const intent = parseSearchIntent(rawQuery);
  const suggestion = generateSearchSuggestion(rawQuery, intent.cleanedTokens);

  // Search words pool = query tokens + expanded synonyms + phonetic variants
  const searchWords = Array.from(new Set([...intent.cleanedTokens, ...intent.expandedSynonyms]));
  const queryLower = rawQuery.toLowerCase();

  const scored: ScoredArtworkResult[] = [];

  for (const art of catalogue) {
    let score = 0;
    const matchReasons: string[] = [];

    const titleLower = art.title.toLowerCase();
    const artistLower = art.artist.name.toLowerCase();
    const traditionLower = (art.details.regionalTradition || "").toLowerCase();
    const styleLower = (art.details.style || "").toLowerCase();
    const mediumLower = art.details.medium.toLowerCase();
    const descLower = art.description.toLowerCase();
    const tagsLower = art.tags.map((t) => t.toLowerCase());
    const roomsLower = (art.details.roomSuitability || []).map((r) => r.toLowerCase());
    const moodLower = (art.details.mood || []).map((m) => m.toLowerCase());
    const effectivePrice = getEffectivePrice(art);

    // 1. EXACT PHRASE MATCHES
    if (titleLower === queryLower) {
      score += 50;
      matchReasons.push("Exact Title Match");
    } else if (titleLower.includes(queryLower)) {
      score += 25;
      matchReasons.push(`Title contains "${rawQuery}"`);
    }

    if (artistLower.includes(queryLower)) {
      score += 25;
      matchReasons.push(`Created by ${art.artist.name}`);
    }

    // 2. TOKEN & SYNONYM MATCHING
    for (const word of searchWords) {
      let wordMatched = false;

      // Title match
      if (titleLower.includes(word) || isFuzzyMatch(word, titleLower)) {
        score += 10;
        wordMatched = true;
      }

      // Artist name match
      if (artistLower.includes(word) || isFuzzyMatch(word, artistLower)) {
        score += 8;
        if (!matchReasons.includes(`Artist: ${art.artist.name}`)) {
          matchReasons.push(`Artist: ${art.artist.name}`);
        }
        wordMatched = true;
      }

      // Tradition / Style match
      if (traditionLower.includes(word) || isFuzzyMatch(word, traditionLower) || styleLower.includes(word)) {
        score += 9;
        const tradName = art.details.regionalTradition || art.details.style;
        if (!matchReasons.includes(`Tradition: ${tradName}`)) {
          matchReasons.push(`Tradition: ${tradName}`);
        }
        wordMatched = true;
      }

      // Medium match
      if (mediumLower.includes(word) || isFuzzyMatch(word, mediumLower)) {
        score += 7;
        if (!matchReasons.includes(`Medium: ${art.details.medium}`)) {
          matchReasons.push(`Medium: ${art.details.medium}`);
        }
        wordMatched = true;
      }

      // Tags match
      for (const tag of tagsLower) {
        if (tag.includes(word) || isFuzzyMatch(word, tag)) {
          score += 6;
          wordMatched = true;
          break;
        }
      }

      // Room suitability match
      for (const room of roomsLower) {
        if (room.includes(word)) {
          score += 6;
          const origRoom = art.details.roomSuitability.find((r) => r.toLowerCase() === room) || room;
          if (!matchReasons.includes(`Ideal for ${origRoom}`)) {
            matchReasons.push(`Ideal for ${origRoom}`);
          }
          wordMatched = true;
          break;
        }
      }

      // Description match
      if (descLower.includes(word)) {
        score += 4;
        wordMatched = true;
      }

      // Mood match
      for (const mood of moodLower) {
        if (mood.includes(word)) {
          score += 4;
          wordMatched = true;
          break;
        }
      }
    }

    // 3. STRUCTURED CONSTRAINT ENFORCEMENT & BOOSTS
    // Price constraint
    if (intent.extractedPriceLimit !== null) {
      if (effectivePrice <= intent.extractedPriceLimit) {
        score += 15;
        matchReasons.push(`Within budget: ₹${effectivePrice.toLocaleString("en-IN")} (under ₹${intent.extractedPriceLimit.toLocaleString("en-IN")})`);
      } else {
        // Exclude items that strictly exceed the requested price limit
        score = -100;
      }
    }

    // Format constraint (physical vs digital)
    if (intent.extractedFormat !== null) {
      if (art.type === intent.extractedFormat) {
        score += 10;
        matchReasons.push(intent.extractedFormat === "physical" ? "Original Physical Art" : "Digital Edition");
      } else {
        score -= 15;
      }
    }

    // Room constraint match
    for (const r of intent.extractedRooms) {
      if (art.details.roomSuitability?.some((room) => room.toLowerCase().includes(r.toLowerCase()))) {
        score += 12;
        if (!matchReasons.includes(`Suited for ${r}`)) {
          matchReasons.push(`Suited for ${r}`);
        }
      }
    }

    // Color match
    for (const color of intent.detectedColors) {
      if (
        descLower.includes(color) ||
        titleLower.includes(color) ||
        tagsLower.some((t) => t.includes(color)) ||
        traditionLower.includes(color)
      ) {
        score += 6;
        if (!matchReasons.includes(`Color tones: ${color}`)) {
          matchReasons.push(`Color tones: ${color}`);
        }
      }
    }

    // 4. THEME & ICONOGRAPHY MATCHING (STRICT SUBJECT GROUNDING VS BROAD TRADITIONS)
    for (const theme of intent.detectedThemes) {
      if (theme.includes("Krishna")) {
        const hasKrishnaSubject =
          /\b(krishna|shrinathji|govinda|gopala|murli)\b/i.test(titleLower) ||
          /\b(krishna|shrinathji|govinda|gopala|murli)\b/i.test(descLower) ||
          tagsLower.some((t) => /\b(krishna|shrinathji|govinda|gopala|murli)\b/i.test(t));

        const hasFluteSubject =
          /\b(flute|muralidhar|bansuri)\b/i.test(titleLower) ||
          /\b(flute|muralidhar|bansuri)\b/i.test(descLower) ||
          tagsLower.some((t) => /\b(flute|bansuri)\b/i.test(t));

        if (hasKrishnaSubject && hasFluteSubject) {
          score += 25;
          matchReasons.push("Subject: Krishna with Flute");
        } else if (hasKrishnaSubject) {
          score += 20;
          matchReasons.push("Subject: Krishna");
        } else if (hasFluteSubject) {
          score += 20;
          matchReasons.push("Subject: Flute");
        } else {
          // Broad sacred/temple tradition recommendation (NEVER label as Krishna)
          if (traditionLower.includes("temple") || titleLower.includes("temple") || tagsLower.includes("temple")) {
            score += 15;
            if (!matchReasons.includes("Temple Tradition")) {
              matchReasons.push("Temple Tradition");
            }
          } else if (
            traditionLower.includes("vedic") ||
            styleLower.includes("devotional") ||
            titleLower.includes("sacred") ||
            tagsLower.includes("devotional")
          ) {
            score += 15;
            if (!matchReasons.includes("Sacred Art")) {
              matchReasons.push("Sacred Art");
            }
          }
        }
      } else if (theme.includes("Ganesha")) {
        const hasGaneshaSubject =
          /\b(ganesh|ganesha|ganapati|vinayaka)\b/i.test(titleLower) ||
          /\b(ganesh|ganesha|ganapati|vinayaka)\b/i.test(descLower) ||
          tagsLower.some((t) => /\b(ganesh|ganesha|ganapati|vinayaka)\b/i.test(t));

        const hasElephantMotif =
          /\b(elephant|elephants|hathi|gaja)\b/i.test(titleLower) ||
          /\b(elephant|elephants|hathi|gaja)\b/i.test(descLower) ||
          tagsLower.some((t) => /\b(elephant|elephants|hathi|gaja)\b/i.test(t));

        if (hasGaneshaSubject) {
          score += 20;
          matchReasons.push("Subject: Ganesha");
        }
        if (hasElephantMotif) {
          score += 20;
          matchReasons.push("Motif: Elephant");
        }
      } else if (theme.includes("Peacock")) {
        const hasPeacockMotif =
          /\b(peacock|peacocks)\b/i.test(titleLower) ||
          /\b(peacock|peacocks)\b/i.test(descLower) ||
          tagsLower.some((t) => /\b(peacock|peacocks)\b/i.test(t));

        const hasFeatherMotif =
          /\b(feather|feathers)\b/i.test(titleLower) ||
          /\b(feather|feathers)\b/i.test(descLower) ||
          tagsLower.some((t) => /\b(feather|feathers)\b/i.test(t));

        if (hasPeacockMotif) {
          score += 18;
          matchReasons.push("Motif: Peacock");
        } else if (hasFeatherMotif) {
          score += 15;
          matchReasons.push("Motif: Peacock Feather");
        }
      } else if (theme.includes("Desert")) {
        const hasDesertTheme =
          /\b(camel|camels|caravan|desert|thar)\b/i.test(titleLower) ||
          /\b(camel|camels|caravan|desert|thar)\b/i.test(descLower) ||
          tagsLower.some((t) => /\b(camel|camels|caravan|desert|thar)\b/i.test(t)) ||
          traditionLower.includes("thar") ||
          styleLower.includes("desert");

        if (hasDesertTheme) {
          score += 15;
          matchReasons.push("Theme: Desert Caravan");
        }
      } else if (theme.includes("Durbar")) {
        const hasDurbarTheme =
          /\b(durbar|darbar|court|maharaja|palace)\b/i.test(titleLower) ||
          /\b(durbar|darbar|court|maharaja|palace)\b/i.test(descLower) ||
          tagsLower.some((t) => /\b(durbar|darbar|court|maharaja|palace|royal)\b/i.test(t)) ||
          traditionLower.includes("court") ||
          styleLower.includes("royal");

        if (hasDurbarTheme) {
          score += 15;
          matchReasons.push("Theme: Royal Durbar & Palace");
        }
      } else if (theme.includes("Monsoon")) {
        const hasMonsoonTheme =
          /\b(monsoon|rain|rains|petrichor)\b/i.test(titleLower) ||
          /\b(monsoon|rain|rains|petrichor)\b/i.test(descLower) ||
          tagsLower.some((t) => /\b(monsoon|rain)\b/i.test(t));

        if (hasMonsoonTheme) {
          score += 15;
          matchReasons.push("Theme: Monsoon & Rain");
        }
      } else if (theme.includes("Feminine")) {
        const hasFeminineTheme =
          /\b(devi|devis|goddess|goddesses|shakti|feminine)\b/i.test(titleLower) ||
          /\b(devi|devis|goddess|goddesses|shakti|feminine)\b/i.test(descLower) ||
          tagsLower.some((t) => /\b(devi|goddess)\b/i.test(t));

        if (hasFeminineTheme) {
          score += 15;
          matchReasons.push("Subject: Devi / Goddess");
        }
      } else if (theme.includes("Waters")) {
        const hasWatersTheme =
          /\b(river|rivers|ganga|ghat|ghats|water|waters|currents)\b/i.test(titleLower) ||
          /\b(river|rivers|ganga|ghat|ghats|water|waters|currents)\b/i.test(descLower) ||
          tagsLower.some((t) => /\b(river|ghat|water)\b/i.test(t)) ||
          traditionLower.includes("sacred river") ||
          traditionLower.includes("ghats");

        if (hasWatersTheme) {
          score += 12;
          matchReasons.push("Theme: Sacred Waters");
        }
      } else if (theme.includes("Temple")) {
        const hasTempleTheme =
          /\b(temple|temples|sanctuary|mandir)\b/i.test(titleLower) ||
          /\b(temple|temples|sanctuary|mandir)\b/i.test(descLower) ||
          tagsLower.some((t) => /\b(temple|mandir|sacred)\b/i.test(t)) ||
          traditionLower.includes("temple");

        if (hasTempleTheme) {
          score += 12;
          matchReasons.push("Temple Tradition");
        }
      }
    }

    // Only include artworks that scored positive relevance
    if (score > 0) {
      const relevanceLevel: "high" | "medium" | "low" =
        score >= 25 ? "high" : score >= 12 ? "medium" : "low";

      scored.push({
        artwork: art,
        score,
        matchReasons: matchReasons.slice(0, 3), // Top 3 reasons
        relevanceLevel,
      });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return {
    query: rawQuery,
    intent,
    results: scored,
    artworks: scored.map((s) => s.artwork),
    suggestion,
    totalMatches: scored.length,
  };
}
