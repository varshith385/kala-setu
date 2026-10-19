/**
 * Kala Setu — WhatsApp Inquiry & Click-to-Chat Unit Tests
 *
 * SAFETY GUARANTEES:
 * 1. Zero network calls or external API calls.
 * 2. Zero database reads, writes, or schema mutations.
 * 3. Pure in-memory unit testing for URL generation, phone normalization, and message formatting.
 */

import assert from "assert";
import { artists } from "../app/data/artists";
import {
  normalizeWhatsAppPhone,
  isValidWhatsAppPhone,
  buildWhatsAppInquiryMessage,
  buildWhatsAppUrl,
  openWhatsAppSafely,
} from "../app/lib/whatsapp";

console.log("=== KALA SETU: WHATSAPP INQUIRY & DEEP-LINK TEST SUITE ===\n");

// -----------------------------------------------------------------------------
// SUITE 1: Phone Number Normalization & Validation
// -----------------------------------------------------------------------------
console.log("Suite 1: Phone number normalization to international E.164 digits...");
{
  // Test 1.1: Standard Indian number with '+'
  const n1 = normalizeWhatsAppPhone("+918522847389");
  assert.strictEqual(n1, "918522847389", "Should strip leading +");

  // Test 1.2: Standard Indian number with spaces and hyphens
  const n2 = normalizeWhatsAppPhone("+91 85228-47389");
  assert.strictEqual(n2, "918522847389", "Should strip spaces and hyphens");

  // Test 1.3: Number with brackets and dots
  const n3 = normalizeWhatsAppPhone("+91 (852) 284.7389");
  assert.strictEqual(n3, "918522847389", "Should strip brackets and dots");

  // Test 1.4: 10-digit Indian local number without country code
  const n4 = normalizeWhatsAppPhone("8522847389");
  assert.strictEqual(n4, "918522847389", "Should default to 91 country code for 10-digit numbers");

  // Test 1.5: 11-digit Indian number with trunk '0'
  const n5 = normalizeWhatsAppPhone("08522847389");
  assert.strictEqual(n5, "918522847389", "Should strip leading 0 and prepend 91 for 11-digit numbers");

  // Test 1.6: International '00' dialing prefix
  const n6 = normalizeWhatsAppPhone("00918522847389");
  assert.strictEqual(n6, "918522847389", "Should strip leading 00 international prefix");

  // Test 1.7: Non-Indian international phone (US number)
  const n7 = normalizeWhatsAppPhone("+1 (555) 234-5678");
  assert.strictEqual(n7, "15552345678", "Should normalize US number correctly");

  // Test 1.8: Non-Indian international phone (UK number)
  const n8 = normalizeWhatsAppPhone("+44 7911 123456");
  assert.strictEqual(n8, "447911123456", "Should normalize UK number correctly");

  // Test 1.9: Invalid inputs trigger errors
  assert.throws(() => normalizeWhatsAppPhone(""), /must be a non-empty string/);
  assert.throws(() => normalizeWhatsAppPhone("abc-xyz"), /does not contain any digits/);
  assert.throws(() => normalizeWhatsAppPhone("12345"), /between 10 and 15 digits/);
  assert.throws(() => normalizeWhatsAppPhone("1234567890123456789"), /between 10 and 15 digits/);

  // Test 1.10: isValidWhatsAppPhone helper
  assert.strictEqual(isValidWhatsAppPhone("+918522847389"), true);
  assert.strictEqual(isValidWhatsAppPhone("8522847389"), true);
  assert.strictEqual(isValidWhatsAppPhone("invalid"), false);
  assert.strictEqual(isValidWhatsAppPhone(""), false);

  // Test 1.11: Every artist in the catalogue has a valid, normalizable phone number
  for (const artist of artists) {
    assert.ok(isValidWhatsAppPhone(artist.phone), `Artist ${artist.name} must have a valid phone`);
    const clean = normalizeWhatsAppPhone(artist.phone);
    assert.strictEqual(clean, "918522847389", `Artist ${artist.name} must normalize to 918522847389`);
  }

  console.log("  ✓ All phone normalization test cases passed.");
}

// -----------------------------------------------------------------------------
// SUITE 2: Inquiry Message Construction & Special Characters
// -----------------------------------------------------------------------------
console.log("\nSuite 2: Inquiry message construction and special character handling...");
{
  // Test 2.1: Full inquiry details
  const msg1 = buildWhatsAppInquiryMessage({
    collectorName: "Priya Sharma",
    collectorPhone: "+91 98765 43210",
    collectorEmail: "priya@example.com",
    artistName: "Aarav Sharma",
    artistLocation: "Hyderabad",
    artworkReference: "Golden Heritage",
    medium: "Acrylic on Canvas",
    size: "Medium (24x36 inches)",
    budget: "25000",
    vision: "Living room statement piece with royal temple motifs & 24k gold leaf highlights.",
  });

  assert.ok(msg1.includes("*Collector Name:* Priya Sharma"), "Must include collector name");
  assert.ok(msg1.includes("*Phone:* +91 98765 43210"), "Must include collector phone");
  assert.ok(msg1.includes("*Email:* priya@example.com"), "Must include collector email");
  assert.ok(msg1.includes("*Artist Selected:* Aarav Sharma (Hyderabad)"), "Must include artist and location");
  assert.ok(msg1.includes("*Reference Artwork:* Golden Heritage"), "Must include reference artwork");
  assert.ok(msg1.includes("*Preferred Medium:* Acrylic on Canvas"), "Must include preferred medium");
  assert.ok(msg1.includes("*Desired Size:* Medium (24x36 inches)"), "Must include desired size");
  assert.ok(msg1.includes("*Budget Range:* ₹25000"), "Must format budget with ₹ symbol");
  assert.ok(
    msg1.includes("Living room statement piece with royal temple motifs & 24k gold leaf highlights."),
    "Must preserve creative vision"
  );
  assert.ok(msg1.includes("🎨 *Kala Setu Custom Art Commission Enquiry*"), "Must include header emoji");

  // Test 2.2: Minimal inquiry details (no optional phone, email, or refParam)
  const msg2 = buildWhatsAppInquiryMessage({
    collectorName: "Rahul Kumar",
    artistName: "Meera Iyer",
    medium: "Oil on Canvas",
    size: "Custom Size",
    vision: "A serene coastal landscape at twilight.",
  });

  assert.ok(msg2.includes("*Collector Name:* Rahul Kumar"));
  assert.ok(!msg2.includes("*Phone:*"), "Should not include phone when omitted");
  assert.ok(!msg2.includes("*Email:*"), "Should not include email when omitted");
  assert.ok(!msg2.includes("*Reference Artwork:*"), "Should not include reference artwork when omitted");
  assert.ok(msg2.includes("*Budget Range:* Open to artist proposal"), "Should state open to proposal when budget is empty");

  // Test 2.3: Budget with existing rupee symbol
  const msg3 = buildWhatsAppInquiryMessage({
    collectorName: "Anita Roy",
    artistName: "Kabir Khan",
    medium: "Gouache on Paper",
    size: "Small (12x18 inches)",
    budget: "₹30,000 - ₹40,000",
    vision: "Miniature peacock study.",
  });
  assert.ok(msg3.includes("*Budget Range:* ₹30,000 - ₹40,000"), "Should not double-prefix ₹");

  console.log("  ✓ Message formatting and field presence tests passed.");
}

// -----------------------------------------------------------------------------
// SUITE 3: WhatsApp Click-to-Chat URL Generation
// -----------------------------------------------------------------------------
console.log("\nSuite 3: WhatsApp URL generation and encoding...");
{
  const rawPhone = "+91 85228 47389";
  const rawMessage = `🎨 *Kala Setu Custom Art Commission Enquiry*
----------------------------------------
*Collector Name:* Priya Sharma & Vikram Roy
*Artist Selected:* Aarav Sharma
*Budget Range:* ₹50,000
*Enquiry / Creative Vision:*
Need "Deccan Peacock" style with 24k gold leaf + blue & green lapis hues.
----------------------------------------
_Initiated securely via Kala Setu Art Marketplace_`;

  const waUrl = buildWhatsAppUrl(rawPhone, rawMessage);

  // Test 3.1: URL structure
  assert.ok(waUrl.startsWith("https://wa.me/"), "URL must start with https://wa.me/");
  const parsed = new URL(waUrl);
  assert.strictEqual(parsed.protocol, "https:", "Protocol must be https:");
  assert.strictEqual(parsed.hostname, "wa.me", "Host must be wa.me");
  assert.strictEqual(parsed.pathname, "/918522847389", "Path must be /<cleanDigits> without + or spaces");

  // Test 3.2: Query parameter encoding
  const textParam = parsed.searchParams.get("text");
  assert.ok(textParam, "URL must contain a 'text' query parameter");

  // Test 3.3: Round-trip fidelity
  assert.strictEqual(
    textParam,
    rawMessage,
    "Decoding the text query parameter must exactly reproduce the original raw message"
  );

  // Test 3.4: Special characters must be properly percent-encoded in raw URL
  assert.ok(!waUrl.includes(" "), "URL must not contain raw whitespace");
  assert.ok(!waUrl.includes("\n"), "URL must not contain raw newlines");
  assert.ok(waUrl.includes("%0A") || waUrl.includes("%0a"), "URL must encode newlines as %0A");

  console.log("  ✓ WhatsApp URL generation and round-trip fidelity tests passed.");
}

// -----------------------------------------------------------------------------
// SUITE 4: Safe Window Opener & Popup Blocker Detection
// -----------------------------------------------------------------------------
console.log("\nSuite 4: Safe window opener and popup blocker handling...");
{
  // Test 4.1: Server-Side Rendering (Node environment without window)
  const ssrResult = openWhatsAppSafely("https://wa.me/918522847389");
  assert.strictEqual(ssrResult.attempted, false, "SSR should not attempt window.open");
  assert.strictEqual(ssrResult.opened, false);
  assert.strictEqual(ssrResult.popupBlocked, false);

  // Test 4.2: Browser environment simulation - Popup blocker blocks (returns null)
  const mockGlobal = globalThis as Record<string, unknown>;
  const originalWindow = mockGlobal.window;

  mockGlobal.window = {
    open: () => null, // popup blocker returns null
  };

  const blockedResult = openWhatsAppSafely("https://wa.me/918522847389");
  assert.strictEqual(blockedResult.attempted, true, "Should attempt window.open in browser");
  assert.strictEqual(blockedResult.opened, false, "Should report opened: false when popup is blocked");
  assert.strictEqual(blockedResult.popupBlocked, true, "Should detect popupBlocked: true");

  // Test 4.3: Browser environment simulation - Popup window immediately closed
  mockGlobal.window = {
    open: () => ({ closed: true }),
  };

  const closedResult = openWhatsAppSafely("https://wa.me/918522847389");
  assert.strictEqual(closedResult.popupBlocked, true, "Should detect closed window as blocked");

  // Test 4.4: Browser environment simulation - Successful window opening
  mockGlobal.window = {
    open: (url: string, target?: string) => {
      assert.strictEqual(target, "_blank", "Must use target _blank without window features string");
      return { closed: false };
    },
  };

  const successResult = openWhatsAppSafely("https://wa.me/918522847389");
  assert.strictEqual(successResult.attempted, true);
  assert.strictEqual(successResult.opened, true, "Should report opened: true on success");
  assert.strictEqual(successResult.popupBlocked, false, "Should report popupBlocked: false on success");

  // Restore original environment
  if (originalWindow !== undefined) {
    mockGlobal.window = originalWindow;
  } else {
    delete mockGlobal.window;
  }

  console.log("  ✓ Safe window opener and popup blocker detection tests passed.");
}

// -----------------------------------------------------------------------------
// SUITE 5: Catalogue Artist Integration & Commission Flows
// -----------------------------------------------------------------------------
console.log("\nSuite 5: Catalogue artist integration with custom request flows...");
{
  for (const artist of artists) {
    const message = buildWhatsAppInquiryMessage({
      collectorName: "Test Collector",
      artistName: artist.name,
      artistLocation: artist.location,
      medium: artist.specialties[0] || "Custom",
      size: "Medium (24x36 inches)",
      budget: "20000",
      vision: `Commission for ${artist.name} in style of ${artist.specialties.join(", ")}`,
    });

    const url = buildWhatsAppUrl(artist.phone, message);
    assert.ok(url.startsWith("https://wa.me/918522847389"), `Must target artist phone for ${artist.name}`);
    assert.ok(url.includes(encodeURIComponent(artist.name)), `URL must include artist name ${artist.name}`);
  }

  console.log("  ✓ All 4 catalogue artists produce valid WhatsApp inquiry links.");
}

console.log("\n=== ALL WHATSAPP INQUIRY TESTS PASSED SUCCESSFULLY ===");
