/**
 * Kala Setu — Phase 2A: Fulfillment State Machine Unit Tests
 *
 * SAFETY GUARANTEES:
 * 1. Zero database writes, reads, or mutations.
 * 2. Zero network requests or external service calls.
 * 3. Pure in-memory state transition validation.
 * 4. Models strict sequential fulfillment for multi-artist orders.
 */

export type ShipmentStatus =
  | "Processing"
  | "Dispatched"
  | "In Transit"
  | "Out for Delivery"
  | "Delivered"
  | "Returned"
  | "Cancelled";

export interface ShipmentTransitionInput {
  currentStatus: ShipmentStatus;
  targetStatus: ShipmentStatus;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  cancellationReason?: string | null;
  returnReason?: string | null;
  actorRole: "buyer" | "artist" | "admin" | "system";
}

export interface TransitionValidationResult {
  valid: boolean;
  newStatus?: ShipmentStatus;
  errorCode?:
    | "ILLEGAL_TRANSITION"
    | "TERMINAL_STATE_LOCKED"
    | "DISPATCH_METADATA_REQUIRED"
    | "UNAUTHORIZED_ACTOR"
    | "UNRESOLVED_POLICY_APPROVAL_REQUIRED"
    | "IDEMPOTENT_NOOP";
  message: string;
  policyNote?: string;
}

/**
 * Pure transition validator for fine art shipment lifecycle.
 */
export function validateShipmentTransition(
  input: ShipmentTransitionInput
): TransitionValidationResult {
  const { currentStatus, targetStatus, courierName, trackingNumber, actorRole } = input;

  // 1. Idempotency / No-op check: Transitioning to identical status
  if (currentStatus === targetStatus) {
    return {
      valid: true,
      newStatus: currentStatus,
      errorCode: "IDEMPOTENT_NOOP",
      message: `Shipment is already in status '${currentStatus}'. No state change performed.`,
    };
  }

  // 2. Terminal State Lock: Delivered, Returned, and Cancelled cannot regress
  const terminalStates: ShipmentStatus[] = ["Delivered", "Returned", "Cancelled"];
  if (terminalStates.includes(currentStatus)) {
    return {
      valid: false,
      errorCode: "TERMINAL_STATE_LOCKED",
      message: `Cannot transition from terminal state '${currentStatus}' to '${targetStatus}'. Historical consignments are immutable.`,
    };
  }

  // 3. Actor authorization check
  // Buyers can NEVER change shipment status directly (anti-tampering)
  if (actorRole === "buyer") {
    return {
      valid: false,
      errorCode: "UNAUTHORIZED_ACTOR",
      message: "Buyers are not permitted to mutate shipment fulfillment status.",
    };
  }

  // 4. Sequential Lifecycle Transitions
  switch (currentStatus) {
    case "Processing": {
      if (targetStatus === "Dispatched") {
        const cleanCourier = typeof courierName === "string" ? courierName.trim() : "";
        const cleanTracking = typeof trackingNumber === "string" ? trackingNumber.trim() : "";

        if (!cleanCourier) {
          return {
            valid: false,
            errorCode: "DISPATCH_METADATA_REQUIRED",
            message: "Courier name is required when dispatching physical artwork.",
          };
        }
        if (!cleanTracking || cleanTracking.length < 4) {
          return {
            valid: false,
            errorCode: "DISPATCH_METADATA_REQUIRED",
            message: "Valid carrier tracking number (min 4 chars) is required when dispatching physical artwork.",
          };
        }

        return {
          valid: true,
          newStatus: "Dispatched",
          message: "Shipment successfully marked Dispatched with verified courier tracking.",
        };
      }

      if (targetStatus === "Cancelled") {
        // Pre-dispatch cancellation: permitted by Admin or Artist before handover
        return {
          valid: true,
          newStatus: "Cancelled",
          message: "Shipment cancelled prior to dispatch.",
          policyNote: "Approved pre-dispatch cancellation rule.",
        };
      }

      // Any other forward jump (e.g. Processing -> Delivered or In Transit) is illegal
      return {
        valid: false,
        errorCode: "ILLEGAL_TRANSITION",
        message: `Illegal forward jump from '${currentStatus}' to '${targetStatus}'. Consignment must be Dispatched with tracking first.`,
      };
    }

    case "Dispatched": {
      if (targetStatus === "In Transit") {
        return {
          valid: true,
          newStatus: "In Transit",
          message: "Consignment picked up and scanned by carrier.",
        };
      }

      if (targetStatus === "Cancelled") {
        // In-flight cancellation policy is UNRESOLVED
        return {
          valid: false,
          errorCode: "UNRESOLVED_POLICY_APPROVAL_REQUIRED",
          message: "In-flight cancellation after dispatch requires carrier intercept protocol and business owner approval.",
          policyNote: "UNRESOLVED POLICY: Requires carrier intercept agreement & formal return liability sign-off.",
        };
      }

      return {
        valid: false,
        errorCode: "ILLEGAL_TRANSITION",
        message: `Illegal transition from 'Dispatched' to '${targetStatus}'. Next expected status is 'In Transit'.`,
      };
    }

    case "In Transit": {
      if (targetStatus === "Out for Delivery") {
        return {
          valid: true,
          newStatus: "Out for Delivery",
          message: "Consignment arrived at destination hub and out for delivery.",
        };
      }

      if (targetStatus === "Returned") {
        // Failed delivery or return to origin
        return {
          valid: true,
          newStatus: "Returned",
          message: "Consignment returned to studio origin by carrier.",
          policyNote: "UNRESOLVED POLICY: Restock vs. damage inspection workflow requires studio confirmation.",
        };
      }

      return {
        valid: false,
        errorCode: "ILLEGAL_TRANSITION",
        message: `Illegal transition from 'In Transit' to '${targetStatus}'. Expected 'Out for Delivery' or 'Returned'.`,
      };
    }

    case "Out for Delivery": {
      if (targetStatus === "Delivered") {
        return {
          valid: true,
          newStatus: "Delivered",
          message: "Delivery confirmed and signed by collector.",
        };
      }

      if (targetStatus === "Returned") {
        return {
          valid: true,
          newStatus: "Returned",
          message: "Delivery failed after attempt; consignment returning to sender.",
        };
      }

      return {
        valid: false,
        errorCode: "ILLEGAL_TRANSITION",
        message: `Illegal transition from 'Out for Delivery' to '${targetStatus}'. Expected 'Delivered' or 'Returned'.`,
      };
    }

    default:
      return {
        valid: false,
        errorCode: "ILLEGAL_TRANSITION",
        message: `Unknown or unhandled shipment status: '${currentStatus}'.`,
      };
  }
}

// =============================================================================
// TEST SUITE EXECUTION
// =============================================================================

async function runFulfillmentStateMachineTests() {
  console.log("===============================================================");
  console.log(" KALA SETU — FULFILLMENT STATE MACHINE UNIT TESTS             ");
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
  // 1. Valid Sequential Happy Path Transitions
  // ---------------------------------------------------------------------------
  console.log("--- 1. Valid Sequential Happy Path Lifecycle ---");

  // Step 1: Processing -> Dispatched (Valid with courier & tracking)
  const step1 = validateShipmentTransition({
    currentStatus: "Processing",
    targetStatus: "Dispatched",
    courierName: "Dedicated Fine Art Logistics",
    trackingNumber: "KS-DEL-98472",
    actorRole: "artist",
  });
  assert("Processing -> Dispatched succeeds with courier and tracking number", step1.valid && step1.newStatus === "Dispatched");

  // Step 2: Dispatched -> In Transit
  const step2 = validateShipmentTransition({
    currentStatus: "Dispatched",
    targetStatus: "In Transit",
    actorRole: "system",
  });
  assert("Dispatched -> In Transit succeeds on carrier scan", step2.valid && step2.newStatus === "In Transit");

  // Step 3: In Transit -> Out for Delivery
  const step3 = validateShipmentTransition({
    currentStatus: "In Transit",
    targetStatus: "Out for Delivery",
    actorRole: "system",
  });
  assert("In Transit -> Out for Delivery succeeds on destination arrival", step3.valid && step3.newStatus === "Out for Delivery");

  // Step 4: Out for Delivery -> Delivered
  const step4 = validateShipmentTransition({
    currentStatus: "Out for Delivery",
    targetStatus: "Delivered",
    actorRole: "system",
  });
  assert("Out for Delivery -> Delivered succeeds on collector handover", step4.valid && step4.newStatus === "Delivered");

  // ---------------------------------------------------------------------------
  // 2. Dispatch Metadata Enforcement
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. Dispatch Metadata Enforcement ---");

  const missingCourier = validateShipmentTransition({
    currentStatus: "Processing",
    targetStatus: "Dispatched",
    courierName: "",
    trackingNumber: "TRACK-1234",
    actorRole: "artist",
  });
  assert("Dispatch without courier name is rejected with 'DISPATCH_METADATA_REQUIRED'", !missingCourier.valid && missingCourier.errorCode === "DISPATCH_METADATA_REQUIRED");

  const missingTracking = validateShipmentTransition({
    currentStatus: "Processing",
    targetStatus: "Dispatched",
    courierName: "Blue Dart Apex",
    trackingNumber: "",
    actorRole: "artist",
  });
  assert("Dispatch without tracking number is rejected with 'DISPATCH_METADATA_REQUIRED'", !missingTracking.valid && missingTracking.errorCode === "DISPATCH_METADATA_REQUIRED");

  const whitespaceTracking = validateShipmentTransition({
    currentStatus: "Processing",
    targetStatus: "Dispatched",
    courierName: "Blue Dart Apex",
    trackingNumber: "   ",
    actorRole: "artist",
  });
  assert("Dispatch with whitespace tracking is rejected", !whitespaceTracking.valid);

  const shortTracking = validateShipmentTransition({
    currentStatus: "Processing",
    targetStatus: "Dispatched",
    courierName: "Blue Dart Apex",
    trackingNumber: "12",
    actorRole: "artist",
  });
  assert("Dispatch with sub-4-char tracking number is rejected", !shortTracking.valid);

  // ---------------------------------------------------------------------------
  // 3. Illegal State Skipping (Anti-Tampering)
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. Illegal State Skipping Prevention ---");

  const skipToDelivered = validateShipmentTransition({
    currentStatus: "Processing",
    targetStatus: "Delivered",
    actorRole: "artist",
  });
  assert("Skipping from Processing directly to Delivered is rejected with 'ILLEGAL_TRANSITION'", !skipToDelivered.valid && skipToDelivered.errorCode === "ILLEGAL_TRANSITION");

  const skipToInTransit = validateShipmentTransition({
    currentStatus: "Processing",
    targetStatus: "In Transit",
    actorRole: "artist",
  });
  assert("Skipping from Processing directly to In Transit is rejected", !skipToInTransit.valid && skipToInTransit.errorCode === "ILLEGAL_TRANSITION");

  const skipDispatchedToDelivered = validateShipmentTransition({
    currentStatus: "Dispatched",
    targetStatus: "Delivered",
    actorRole: "artist",
  });
  assert("Skipping from Dispatched directly to Delivered is rejected", !skipDispatchedToDelivered.valid);

  // ---------------------------------------------------------------------------
  // 4. Terminal State Immutability (Anti-Regression)
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. Terminal State Immutability ---");

  const deliveredToProcessing = validateShipmentTransition({
    currentStatus: "Delivered",
    targetStatus: "Processing",
    actorRole: "artist",
  });
  assert("Delivered consignment cannot regress to Processing ('TERMINAL_STATE_LOCKED')", !deliveredToProcessing.valid && deliveredToProcessing.errorCode === "TERMINAL_STATE_LOCKED");

  const deliveredToShipped = validateShipmentTransition({
    currentStatus: "Delivered",
    targetStatus: "Dispatched",
    actorRole: "admin",
  });
  assert("Delivered consignment cannot regress to Dispatched", !deliveredToShipped.valid && deliveredToShipped.errorCode === "TERMINAL_STATE_LOCKED");

  const cancelledToProcessing = validateShipmentTransition({
    currentStatus: "Cancelled",
    targetStatus: "Processing",
    actorRole: "artist",
  });
  assert("Cancelled shipment cannot regress to Processing", !cancelledToProcessing.valid && cancelledToProcessing.errorCode === "TERMINAL_STATE_LOCKED");

  const returnedToInTransit = validateShipmentTransition({
    currentStatus: "Returned",
    targetStatus: "In Transit",
    actorRole: "system",
  });
  assert("Returned shipment cannot regress to In Transit", !returnedToInTransit.valid && returnedToInTransit.errorCode === "TERMINAL_STATE_LOCKED");

  // ---------------------------------------------------------------------------
  // 5. Actor Authorization Boundaries
  // ---------------------------------------------------------------------------
  console.log("\n--- 5. Actor Authorization Boundaries ---");

  const buyerAttempt = validateShipmentTransition({
    currentStatus: "Processing",
    targetStatus: "Dispatched",
    courierName: "Fine Art Logistics",
    trackingNumber: "KS-12345",
    actorRole: "buyer",
  });
  assert("Buyer attempt to mutate shipment fulfillment is rejected with 'UNAUTHORIZED_ACTOR'", !buyerAttempt.valid && buyerAttempt.errorCode === "UNAUTHORIZED_ACTOR");

  // ---------------------------------------------------------------------------
  // 6. Idempotency & Repeated Request Handling
  // ---------------------------------------------------------------------------
  console.log("\n--- 6. Idempotency & Repeated Requests ---");

  const idempotentDispatched = validateShipmentTransition({
    currentStatus: "Dispatched",
    targetStatus: "Dispatched",
    actorRole: "artist",
  });
  assert("Repeated request to identical status returns valid: true with 'IDEMPOTENT_NOOP'", idempotentDispatched.valid && idempotentDispatched.errorCode === "IDEMPOTENT_NOOP");

  // ---------------------------------------------------------------------------
  // 7. Unresolved Business Decision Rules (Flagged for Owner Approval)
  // ---------------------------------------------------------------------------
  console.log("\n--- 7. Unresolved Business Decision Rules ---");

  const inFlightCancel = validateShipmentTransition({
    currentStatus: "Dispatched",
    targetStatus: "Cancelled",
    actorRole: "admin",
  });
  assert(
    "In-flight cancellation after dispatch is flagged as 'UNRESOLVED_POLICY_APPROVAL_REQUIRED'",
    !inFlightCancel.valid && inFlightCancel.errorCode === "UNRESOLVED_POLICY_APPROVAL_REQUIRED"
  );
  assert("Flagged in-flight cancellation contains explicit policy note", Boolean(inFlightCancel.policyNote?.includes("carrier intercept")));

  const inTransitReturn = validateShipmentTransition({
    currentStatus: "In Transit",
    targetStatus: "Returned",
    actorRole: "system",
  });
  assert("In-transit return is marked with policy note regarding studio condition inspection", inTransitReturn.valid && inTransitReturn.newStatus === "Returned" && Boolean(inTransitReturn.policyNote));

  // Pre-dispatch cancellation is cleanly allowed
  const preDispatchCancel = validateShipmentTransition({
    currentStatus: "Processing",
    targetStatus: "Cancelled",
    actorRole: "artist",
  });
  assert("Pre-dispatch cancellation before handover is cleanly permitted", preDispatchCancel.valid && preDispatchCancel.newStatus === "Cancelled");

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

runFulfillmentStateMachineTests().catch((err) => {
  console.error("Fatal test execution error:", err);
  process.exit(1);
});
