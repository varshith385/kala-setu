import { NextRequest, NextResponse } from "next/server";
import { searchArtworks, SearchResultPackage } from "@/app/lib/artSearchEngine";

// ============================================================================
// RATE LIMITING SAFEGUARD (IN-MEMORY SLIDING WINDOW)
// ============================================================================
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 queries/min per IP
const ipRequestMap = new Map<string, RateLimitRecord>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = ipRequestMap.get(ip);

  // Clean expired records periodically
  if (ipRequestMap.size > 2000) {
    for (const [key, val] of ipRequestMap.entries()) {
      if (val.resetAt < now) {
        ipRequestMap.delete(key);
      }
    }
  }

  if (!record || record.resetAt < now) {
    ipRequestMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count += 1;
  return { allowed: true };
}

// ============================================================================
// INPUT SANITIZATION & SAFEGUARDS
// ============================================================================
const MAX_QUERY_LENGTH = 250;

function sanitizeSearchQuery(input: unknown): string {
  if (typeof input !== "string") return "";
  // Strip null bytes, unprintable ASCII control characters, and excess whitespace
  let clean = input.replace(/[\x00-\x1F\x7F]/g, "").trim();
  // Strip potential script / HTML tags to eliminate injection
  clean = clean.replace(/<[^>]*>?/gm, "");
  // Limit length
  if (clean.length > MAX_QUERY_LENGTH) {
    clean = clean.slice(0, MAX_QUERY_LENGTH).trim();
  }
  return clean;
}

// ============================================================================
// OPTIONAL SERVER-SIDE GEMINI QUERY ENHANCEMENT (WITH SAFE LOCAL FALLBACK)
// ============================================================================
async function fetchGeminiSynonymEnhancement(
  query: string
): Promise<{ synonyms: string[]; motifs: string[] } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // 2-second timeout

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const prompt = `You are a specialist in traditional and contemporary Indian art terminology.
User search query: "${query}"
Task: Extract relevant Indian artform synonyms, regional traditions, and motifs.
Respond with pure JSON only, matching this structure:
{"synonyms": ["string"], "motifs": ["string"]}
Do NOT include markdown backticks or commentary. Never fabricate artworks, artist identities, or inventory.`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    // Clean any markdown formatting
    const cleanedJson = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanedJson);

    return {
      synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.map(String) : [],
      motifs: Array.isArray(parsed.motifs) ? parsed.motifs.map(String) : [],
    };
  } catch {
    // Fail safely to local hybrid retrieval without throwing error
    return null;
  }
}

// ============================================================================
// SEARCH HANDLERS (GET & POST)
// ============================================================================
export async function GET(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait a moment before searching again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateCheck.retryAfter ?? 10) },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") || "";
  const query = sanitizeSearchQuery(rawQuery);

  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(50, Math.max(1, parseInt(limitParam, 10) || 20)) : 20;

  // Perform hybrid search with local NLP engine
  let searchResult: SearchResultPackage = searchArtworks(query);
  let provider = "hybrid-local-engine";

  // If query is descriptive natural language and Gemini key exists, enrich synonyms
  if (query && searchResult.intent.isNaturalLanguage && process.env.GEMINI_API_KEY) {
    const aiEnhancement = await fetchGeminiSynonymEnhancement(query);
    if (aiEnhancement && aiEnhancement.synonyms.length > 0) {
      // Append AI-discovered synonyms to query for re-scoring
      const combinedQuery = `${query} ${aiEnhancement.synonyms.slice(0, 3).join(" ")}`;
      searchResult = searchArtworks(combinedQuery);
      provider = "hybrid-local-engine+gemini";
    }
  }

  // Format and clamp results
  const slicedResults = searchResult.results.slice(0, limit);

  return NextResponse.json(
    {
      success: true,
      query,
      intent: searchResult.intent,
      suggestion: searchResult.suggestion,
      totalMatches: searchResult.totalMatches,
      results: slicedResults,
      artworks: slicedResults.map((r) => r.artwork),
      provider,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait a moment before searching again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateCheck.retryAfter ?? 10) },
      }
    );
  }

  let body: { query?: string; limit?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
  }

  const query = sanitizeSearchQuery(body.query);
  const limit = typeof body.limit === "number" ? Math.min(50, Math.max(1, body.limit)) : 20;

  const searchResult = searchArtworks(query);
  const slicedResults = searchResult.results.slice(0, limit);

  return NextResponse.json({
    success: true,
    query,
    intent: searchResult.intent,
    suggestion: searchResult.suggestion,
    totalMatches: searchResult.totalMatches,
    results: slicedResults,
    artworks: slicedResults.map((r) => r.artwork),
    provider: "hybrid-local-engine",
  });
}
