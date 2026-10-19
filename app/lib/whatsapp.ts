/**
 * Kala Setu WhatsApp Inquiry & Deep-Link Utility
 *
 * Provides phone number normalization, message construction, and
 * safe URL generation adhering strictly to the official WhatsApp Click-to-Chat standard:
 * https://wa.me/<number>?text=<encoded_text>
 */

export interface CustomInquiryDetails {
  collectorName: string;
  collectorPhone?: string;
  collectorEmail?: string;
  artistName: string;
  artistLocation?: string;
  artworkReference?: string;
  medium: string;
  size: string;
  budget?: string;
  vision: string;
}

/**
 * Normalizes a raw phone number to international digits only for WhatsApp (E.164 digits without +).
 * Strips '+', spaces, brackets, hyphens, and other punctuation.
 * Strips international dialing prefix '00' or single trunk prefix '0'.
 * Defaults to Indian country code '91' for 10-digit numbers or 11-digit numbers with leading 0.
 *
 * WhatsApp requirements:
 * - Phone numbers should be in international format without any leading zeroes, brackets, or dashes.
 * - E.g. '918522847389' or '15551234567'.
 */
export function normalizeWhatsAppPhone(rawPhone: string, defaultCountryCode = "91"): string {
  if (!rawPhone || typeof rawPhone !== "string") {
    throw new Error("Phone number must be a non-empty string");
  }

  // Strip all non-digit characters
  let digits = rawPhone.replace(/\D/g, "");

  if (!digits) {
    throw new Error("Phone number does not contain any digits");
  }

  // Handle international '00' prefix (e.g. 00918522847389 -> 918522847389)
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // Handle leading '0' with 11 digits (e.g., Indian trunk call 08522847389 -> 918522847389)
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = defaultCountryCode + digits.slice(1);
  } else if (digits.length === 10) {
    // 10 digits without country code (e.g., 8522847389 -> 918522847389)
    digits = defaultCountryCode + digits;
  }

  // Validate E.164 length (between 10 and 15 digits)
  if (digits.length < 10 || digits.length > 15) {
    throw new Error(
      `Normalized phone number must be between 10 and 15 digits, got ${digits.length} digits`
    );
  }

  return digits;
}

export function isValidWhatsAppPhone(rawPhone: string, defaultCountryCode = "91"): boolean {
  try {
    normalizeWhatsAppPhone(rawPhone, defaultCountryCode);
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats a clean, professional, readable inquiry message for WhatsApp.
 */
export function buildWhatsAppInquiryMessage(details: CustomInquiryDetails): string {
  const parts: string[] = [
    "🎨 *Kala Setu Custom Art Commission Enquiry*",
    "----------------------------------------",
    `*Collector Name:* ${details.collectorName.trim()}`,
  ];

  if (details.collectorPhone?.trim()) {
    parts.push(`*Phone:* ${details.collectorPhone.trim()}`);
  }
  if (details.collectorEmail?.trim()) {
    parts.push(`*Email:* ${details.collectorEmail.trim()}`);
  }

  const artistDisplay = details.artistLocation?.trim()
    ? `${details.artistName.trim()} (${details.artistLocation.trim()})`
    : details.artistName.trim();
  parts.push(`*Artist Selected:* ${artistDisplay}`);

  if (details.artworkReference?.trim()) {
    parts.push(`*Reference Artwork:* ${details.artworkReference.trim()}`);
  }

  parts.push(`*Preferred Medium:* ${details.medium.trim()}`);
  parts.push(`*Desired Size:* ${details.size.trim()}`);

  const rawBudget = details.budget?.trim();
  const budgetDisplay = rawBudget
    ? rawBudget.startsWith("₹")
      ? rawBudget
      : `₹${rawBudget}`
    : "Open to artist proposal";
  parts.push(`*Budget Range:* ${budgetDisplay}`);

  parts.push("");
  parts.push("*Enquiry / Creative Vision:*");
  parts.push(details.vision.trim());
  parts.push("----------------------------------------");
  parts.push("_Initiated securely via Kala Setu Art Marketplace_");

  return parts.join("\n");
}

/**
 * Generates an official WhatsApp click-to-chat URL:
 * https://wa.me/PHONE_NUMBER?text=ENCODED_MESSAGE
 */
export function buildWhatsAppUrl(
  rawPhone: string,
  message: string,
  defaultCountryCode = "91"
): string {
  const cleanPhone = normalizeWhatsAppPhone(rawPhone, defaultCountryCode);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

export interface OpenWhatsAppResult {
  attempted: boolean;
  opened: boolean;
  popupBlocked: boolean;
}

/**
 * Safely attempts to open WhatsApp in a new tab without aggressive windowFeatures
 * which trigger browser popup blockers.
 * Detects whether the window was blocked by the browser.
 */
export function openWhatsAppSafely(url: string): OpenWhatsAppResult {
  if (typeof window === "undefined") {
    return { attempted: false, opened: false, popupBlocked: false };
  }

  try {
    // Calling window.open with only "_blank" (no feature string) ensures the browser treats
    // it as a normal tab request rather than an unrequested popup window, dramatically
    // reducing popup-blocker false positives.
    const newWindow = window.open(url, "_blank");
    if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
      return { attempted: true, opened: false, popupBlocked: true };
    }
    return { attempted: true, opened: true, popupBlocked: false };
  } catch {
    return { attempted: true, opened: false, popupBlocked: true };
  }
}
