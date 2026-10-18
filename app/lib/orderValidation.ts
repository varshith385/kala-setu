import * as crypto from "crypto";
import type { NextRequest } from "next/server";
import { artworks } from "@/app/data/artworks";

export interface NormalizedItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

export interface CustomerData {
  name: string;
  phone: string;
  address: string;
}

/**
 * Validates and sanitizes customer contact and shipping details.
 */
export function validateCustomer(customer: unknown): {
  error: string | null;
  customer: CustomerData | null;
} {
  if (!customer || typeof customer !== "object") {
    return { error: "Customer details are required", customer: null };
  }

  const cust = customer as Record<string, unknown>;
  const name = typeof cust.name === "string" ? cust.name.trim() : "";
  const phone = typeof cust.phone === "string" ? cust.phone.trim() : "";
  const address = typeof cust.address === "string" ? cust.address.trim() : "";

  if (!name || name.length < 2 || name.length > 100) {
    return { error: "Please provide a valid full name (2 to 100 characters)", customer: null };
  }

  // Must contain between 7 and 20 characters and at least 7 digits
  const digitCount = (phone.match(/\d/g) || []).length;
  if (!phone || phone.length < 7 || phone.length > 20 || digitCount < 7) {
    return { error: "Please provide a valid phone number (7 to 20 digits)", customer: null };
  }

  if (!address || address.length < 5 || address.length > 500) {
    return { error: "Please provide a complete delivery address (5 to 500 characters)", customer: null };
  }

  return {
    error: null,
    customer: { name, phone, address },
  };
}

/**
 * Validates, normalizes, and aggregates cart items against trusted catalogue inventory.
 * 
 * Rules:
 * 1. Rejects missing, empty, malformed, or oversized arrays (>20 entries).
 * 2. Aggregates duplicate artwork IDs before checking inventory and calculating totals.
 * 3. Enforces catalogue inventory for physical art (e.g. unique pieces with stock = 1).
 * 4. Applies explicit cap (5 units) for digital artworks.
 * 5. Deterministically sorts items by ID for cryptographic fingerprint generation.
 */
export function validateAndNormalizeCart(items: unknown): {
  error: string | null;
  calculatedTotal: number;
  normalizedItems: NormalizedItem[];
} {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Cart must contain at least one artwork", calculatedTotal: 0, normalizedItems: [] };
  }

  if (items.length > 20) {
    return { error: "Cart exceeds maximum of 20 distinct entries per order", calculatedTotal: 0, normalizedItems: [] };
  }

  // Step 1: Aggregate quantities across submitted entries
  const aggregatedQtyMap = new Map<string, number>();

  for (const entry of items) {
    if (!entry || typeof entry !== "object") {
      return { error: "Malformed cart item entry", calculatedTotal: 0, normalizedItems: [] };
    }

    const entryObj = entry as Record<string, unknown>;
    const id = typeof entryObj.id === "string" ? entryObj.id.trim() : "";
    const quantity = Number(entryObj.quantity);

    if (!id) {
      return { error: "Artwork ID is required for every item", calculatedTotal: 0, normalizedItems: [] };
    }

    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 25) {
      return {
        error: `Invalid quantity for artwork "${id}". Quantity must be an integer between 1 and 25`,
        calculatedTotal: 0,
        normalizedItems: [],
      };
    }

    const currentQty = aggregatedQtyMap.get(id) || 0;
    aggregatedQtyMap.set(id, currentQty + quantity);
  }

  // Step 2: Validate against trusted catalogue data and inventory
  let total = 0;
  const normalizedItems: NormalizedItem[] = [];
  const sortedIds = Array.from(aggregatedQtyMap.keys()).sort();

  for (const id of sortedIds) {
    const aggregatedQty = aggregatedQtyMap.get(id)!;
    const catalogItem = artworks.find((art) => art.id === id);

    if (!catalogItem) {
      return {
        error: `Artwork with ID "${id}" was not found in the verified catalogue`,
        calculatedTotal: 0,
        normalizedItems: [],
      };
    }

    // Availability validation
    if (catalogItem.inventory?.available === false) {
      return {
        error: `"${catalogItem.title}" is currently marked unavailable for purchase`,
        calculatedTotal: 0,
        normalizedItems: [],
      };
    }

    // Inventory constraint enforcement
    if (catalogItem.type === "physical") {
      const availableStock = catalogItem.inventory?.quantity;
      if (availableStock === undefined || availableStock === null || availableStock <= 0) {
        return {
          error: `"${catalogItem.title}" is currently out of stock`,
          calculatedTotal: 0,
          normalizedItems: [],
        };
      }
      if (aggregatedQty > availableStock) {
        return {
          error: `Requested quantity (${aggregatedQty}) for "${catalogItem.title}" exceeds available stock (${availableStock})`,
          calculatedTotal: 0,
          normalizedItems: [],
        };
      }
    } else if (catalogItem.type === "digital") {
      // Documented explicit limit for digital licenses: max 5 units per order
      const DIGITAL_ORDER_LIMIT = 5;
      const stock = catalogItem.inventory?.quantity ?? DIGITAL_ORDER_LIMIT;
      const effectiveMax = Math.min(DIGITAL_ORDER_LIMIT, stock);
      if (aggregatedQty > effectiveMax) {
        return {
          error: `Maximum of ${effectiveMax} copies permitted per order for digital artwork "${catalogItem.title}"`,
          calculatedTotal: 0,
          normalizedItems: [],
        };
      }
    } else {
      // Fallback stock check for unspecified types
      const stock = catalogItem.inventory?.quantity ?? 1;
      if (aggregatedQty > stock) {
        return {
          error: `Requested quantity (${aggregatedQty}) for "${catalogItem.title}" exceeds available stock (${stock})`,
          calculatedTotal: 0,
          normalizedItems: [],
        };
      }
    }

    // Pricing validation (in INR)
    // If artwork is marked on sale in the authoritative catalogue, calculate discounted price
    let price = catalogItem.pricing?.amount;
    if (
      catalogItem.pricing?.isOnSale &&
      typeof catalogItem.pricing.discountPercentage === "number" &&
      catalogItem.pricing.discountPercentage > 0 &&
      catalogItem.pricing.discountPercentage <= 100
    ) {
      price = Math.round(
        catalogItem.pricing.amount -
          (catalogItem.pricing.amount * catalogItem.pricing.discountPercentage) / 100
      );
    }

    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      return {
        error: `Invalid pricing configuration for "${catalogItem.title}"`,
        calculatedTotal: 0,
        normalizedItems: [],
      };
    }

    total += price * aggregatedQty;

    normalizedItems.push({
      id: catalogItem.id,
      title: catalogItem.title,
      price: price,
      quantity: aggregatedQty,
      image: catalogItem.thumbnail || (catalogItem.images && catalogItem.images[0]) || "",
    });
  }

  // Sanity and overflow limit: max ₹50,00,000 per order
  if (total <= 0 || total > 50000000) {
    return {
      error: "Order total is outside acceptable processing limits (₹1 to ₹50,00,000)",
      calculatedTotal: 0,
      normalizedItems: [],
    };
  }

  return { error: null, calculatedTotal: total, normalizedItems };
}

/**
 * Computes a deterministic SHA-256 fingerprint of the normalized cart items.
 * Binds the exact artwork IDs and aggregated quantities to the Razorpay order notes.
 */
export function computeOrderFingerprint(normalizedItems: NormalizedItem[]): string {
  // Items are pre-sorted by id in validateAndNormalizeCart
  const canonicalString = normalizedItems
    .map((item) => `${item.id}:${item.quantity}`)
    .join("|");
  return crypto.createHash("sha256").update(canonicalString).digest("hex");
}

/**
 * Request payload size check safeguard.
 */
export function validateRequestSize(req: NextRequest, maxBytes = 51200): string | null {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return `Payload exceeds maximum permitted size of ${Math.round(maxBytes / 1024)}KB`;
  }
  return null;
}
