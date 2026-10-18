/**
 * Kala Setu — In-Memory Mocked Unit Test Suite
 *
 * SAFETY GUARANTEE:
 * 1. Zero network requests to Supabase or Razorpay.
 * 2. Zero database writes, reads, or mutations against staging or production.
 * 3. In-memory state only.
 * 4. Verifies atomic transaction safety, fail-closed semantics, concurrency,
 *    authorization, catalogue validation, sanitized client error messages,
 *    and zero-fallback write behavior.
 */

import { executeAtomicReconciliation } from "../app/lib/reconciliationEngine";
import { isAuthorizedAdmin } from "../app/lib/authHelpers";

interface MockOrder {
  id: string;
  order_ref: string;
  total: number;
  status: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  payment_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  items: unknown;
  user_id: string | null;
  updated_at?: string;
}

interface MockOrderItem {
  order_id: string;
  artwork_id: string | null;
  artist_id: string | null;
  quantity: number;
  price_at_purchase: number;
  artwork_title: string;
  artwork_image: string | null;
}

class InMemoryMockSupabase {
  public orders = new Map<string, MockOrder>();
  public orderItems: MockOrderItem[] = [];
  public fallbackTableWritesAttempted = 0;

  // Query Simulation Controls
  public simulateOrderQueryError = false;

  // RPC Simulation Controls
  public simulateRpcAvailable = false;
  public simulateRpcThrows = false;
  public simulateRpcPermissionDenied = false;
  public simulateRpcConcurrencyConflict = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public rpcCallHistory: any[] = [];

  from(table: string) {
    if (table === "orders") {
      return {
        select: () => ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          eq: (field: string, val: any) => ({
            maybeSingle: async () => {
              if (this.simulateOrderQueryError) {
                return {
                  data: null,
                  error: {
                    message: "FATAL: connection to internal.supabase.co:5432 failed with password authentication error",
                  },
                };
              }
              if (field === "id") {
                const order = this.orders.get(val);
                return { data: order ? { ...order } : null, error: null };
              }
              return { data: null, error: null };
            },
          }),
        }),
        update: () => {
          // Track any fallback write attempts to the orders table
          this.fallbackTableWritesAttempted++;
          throw new Error("UNSAFE_FALLBACK_ATTEMPTED: Direct update to orders table must not occur");
        },
      };
    }

    if (table === "order_items") {
      return {
        delete: () => {
          this.fallbackTableWritesAttempted++;
          throw new Error("UNSAFE_FALLBACK_ATTEMPTED: Direct delete from order_items must not occur");
        },
        insert: async () => {
          this.fallbackTableWritesAttempted++;
          throw new Error("UNSAFE_FALLBACK_ATTEMPTED: Direct insert to order_items must not occur");
        },
      };
    }

    throw new Error(`Unhandled mock table: ${table}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async rpc(funcName: string, args: any) {
    this.rpcCallHistory.push({ funcName, args });

    if (this.simulateRpcThrows) {
      throw new Error(
        "FETCH_FAILED: connect ECONNREFUSED https://tgloneuszflwxzdxzujj.supabase.co:443/rest/v1/rpc/resolve_reconciliation_order_atomic"
      );
    }

    if (this.simulateRpcPermissionDenied) {
      return {
        data: null,
        error: {
          message: "permission denied for table public.orders - internal relation 16402",
          code: "42501",
        },
      };
    }

    if (!this.simulateRpcAvailable) {
      return {
        data: null,
        error: {
          message: "Could not find the function public.resolve_reconciliation_order_atomic in schema cache",
          code: "PGRST202",
        },
      };
    }

    if (this.simulateRpcConcurrencyConflict) {
      return {
        data: null,
        error: {
          message: "Order reconciliation conflict: Order is in status Processing, expected Pending",
          code: "23505",
        },
      };
    }

    const order = this.orders.get(args.p_order_id);
    if (!order) {
      return { data: null, error: { message: "Order record not found", code: "P0002" } };
    }
    if (order.status !== "Pending") {
      return { data: null, error: { message: "Order is already resolved", code: "23505" } };
    }
    if (order.total !== args.p_expected_total) {
      return { data: null, error: { message: "Total mismatch", code: "22000" } };
    }

    // Atomic update inside database engine
    order.status = "Processing";
    order.items = args.p_sanitized_items;
    this.orderItems = this.orderItems.filter((oi) => oi.order_id !== args.p_order_id);
    this.orderItems.push(...args.p_order_items_payload);

    return {
      data: { success: true, order_id: order.id, status: "Processing" },
      error: null,
    };
  }
}

async function runUnitTests() {
  console.log("===============================================================");
  console.log(" KALA SETU — RECONCILIATION FAIL-CLOSED ATOMIC UNIT TESTS      ");
  console.log(" Mode: Pure Mock In-Memory (Zero Network / Zero DB Mutations)  ");
  console.log("===============================================================\n");

  let passed = 0;
  let total = 0;

  function assert(testName: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${testName}${details ? " - " + details : ""}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Authorization & Role Security
  // ---------------------------------------------------------------------------
  console.log("--- 1. Authorization & Role Security ---");
  const buyerUser = { id: "user-buyer-1", email: "buyer@example.com", email_confirmed_at: "2026-10-01" };
  const unconfirmedAdmin = { id: "user-rogue-1", email: "admin@kalasetu.art", email_confirmed_at: null };

  assert("Profile role 'admin' grants admin privileges", isAuthorizedAdmin(buyerUser, "admin") === true);
  assert("Profile role 'buyer' is denied admin privileges", isAuthorizedAdmin(buyerUser, "buyer") === false);
  assert(
    "Unconfirmed email account is strictly rejected even if email matches admin allowlist",
    isAuthorizedAdmin(unconfirmedAdmin, "buyer") === false
  );

  // ---------------------------------------------------------------------------
  // 2. Safe Error Handling on Order Query Failure (No Raw Message Leak)
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. Database Order Query Failure Sanitization ---");
  const dbQueryErr = new InMemoryMockSupabase();
  dbQueryErr.simulateOrderQueryError = true;
  const testOrderId0 = "order-test-uuid-000";

  const resQueryErr = await executeAtomicReconciliation(dbQueryErr, {
    orderId: testOrderId0,
    paymentId: "pay_test_000",
    resolvedItems: [{ id: "art-001", quantity: 1 }],
    adminUserId: "admin-uuid-1",
  });

  assert("Order query error returns HTTP 500", resQueryErr.status === 500);
  assert("Response code indicates DATABASE_QUERY_ERROR", resQueryErr.body.code === "DATABASE_QUERY_ERROR");
  assert(
    "Client error is generic without raw connection/password leak",
    resQueryErr.body.error === "Database error querying order record. Transaction was not initiated." &&
      !resQueryErr.body.error.includes("password") &&
      !resQueryErr.body.error.includes("internal.supabase.co")
  );
  assert("Zero fallback direct writes to tables occurred", dbQueryErr.fallbackTableWritesAttempted === 0);

  // ---------------------------------------------------------------------------
  // 3. Missing Atomic RPC Fail-Closed Verification (Zero Fallback Writes)
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. Missing Atomic RPC Fail-Closed (Zero Fallback Writes) ---");
  const dbMissingRpc = new InMemoryMockSupabase();
  dbMissingRpc.simulateRpcAvailable = false; // Simulates missing SQL migration in database
  const testOrderId1 = "order-test-uuid-001";
  const testOrderRef1 = "TEST-RUN-001-KS123";

  dbMissingRpc.orders.set(testOrderId1, {
    id: testOrderId1,
    order_ref: testOrderRef1,
    total: 13500,
    status: "Pending",
    payment_status: "paid",
    payment_id: "pay_test_001",
    razorpay_payment_id: null,
    razorpay_order_id: "order_rzp_001",
    user_id: "user-buyer-1",
    items: [{ title: "Captured Payment", reconciliation_required: true }],
  });

  const resMissingRpc = await executeAtomicReconciliation(dbMissingRpc, {
    orderId: testOrderId1,
    paymentId: "pay_test_001",
    razorpayOrderId: "order_rzp_001",
    resolvedItems: [{ id: "art-001", quantity: 1 }],
    adminUserId: "admin-uuid-1",
    testIsolationTag: "TEST-RUN-001",
  });

  assert("Missing RPC returns HTTP 503 (Service Unavailable)", resMissingRpc.status === 503);
  assert("Response code indicates RPC_NOT_INSTALLED", resMissingRpc.body.code === "RPC_NOT_INSTALLED");
  assert(
    "Client error clearly explains migration is not installed without internal details",
    resMissingRpc.body.error === "Atomic reconciliation is temporarily unavailable: required database migration has not been installed"
  );
  assert("Order status in DB remains strictly 'Pending'", dbMissingRpc.orders.get(testOrderId1)?.status === "Pending");
  assert("Zero fallback direct writes to tables occurred", dbMissingRpc.fallbackTableWritesAttempted === 0);
  assert("Zero order_items records created in DB", dbMissingRpc.orderItems.length === 0);

  // ---------------------------------------------------------------------------
  // 4. Thrown Network Exception / Timeout (Uncertain Outcome Communication)
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. Thrown Network Exception Fail-Closed (Uncertain Outcome) ---");
  const dbTimeout = new InMemoryMockSupabase();
  dbTimeout.simulateRpcAvailable = true;
  dbTimeout.simulateRpcThrows = true; // Simulates network drop or TCP timeout during RPC
  const testOrderId2 = "order-test-uuid-002";

  dbTimeout.orders.set(testOrderId2, {
    id: testOrderId2,
    order_ref: "TEST-RUN-002-KS456",
    total: 13500,
    status: "Pending",
    payment_status: "paid",
    payment_id: "pay_test_002",
    razorpay_payment_id: null,
    razorpay_order_id: "order_rzp_002",
    user_id: "user-buyer-1",
    items: [{ title: "Captured Payment", reconciliation_required: true }],
  });

  const resTimeout = await executeAtomicReconciliation(dbTimeout, {
    orderId: testOrderId2,
    paymentId: "pay_test_002",
    resolvedItems: [{ id: "art-001", quantity: 1 }],
    adminUserId: "admin-uuid-1",
  });

  assert("Thrown network exception returns HTTP 500", resTimeout.status === 500);
  assert("Error code indicates RPC_EXECUTION_ERROR", resTimeout.body.code === "RPC_EXECUTION_ERROR");
  assert(
    "Client error clearly communicates transaction outcome may be unconfirmed",
    resTimeout.body.error === "A network or connection error occurred while communicating with the database. Transaction outcome may be unconfirmed."
  );
  assert(
    "Client error does NOT leak internal URLs, hostnames, or endpoints",
    !resTimeout.body.error?.includes("supabase.co") &&
      !resTimeout.body.error?.includes("rest/v1") &&
      !resTimeout.body.error?.includes("ECONNREFUSED")
  );
  assert("Order status in DB remains strictly 'Pending'", dbTimeout.orders.get(testOrderId2)?.status === "Pending");
  assert("Zero fallback direct writes attempted after network exception", dbTimeout.fallbackTableWritesAttempted === 0);
  assert("Zero order_items records created in DB", dbTimeout.orderItems.length === 0);

  // ---------------------------------------------------------------------------
  // 5. Database Permission Denied Fail-Closed (Sanitized Error)
  // ---------------------------------------------------------------------------
  console.log("\n--- 5. Database Permission Denied Fail-Closed (Sanitized) ---");
  const dbPermission = new InMemoryMockSupabase();
  dbPermission.simulateRpcAvailable = true;
  dbPermission.simulateRpcPermissionDenied = true; // Simulates PostgREST 42501 permission denied
  const testOrderId3 = "order-test-uuid-003";

  dbPermission.orders.set(testOrderId3, {
    id: testOrderId3,
    order_ref: "TEST-RUN-003-KS789",
    total: 13500,
    status: "Pending",
    payment_status: "paid",
    payment_id: "pay_test_003",
    razorpay_payment_id: null,
    razorpay_order_id: null,
    user_id: "user-buyer-1",
    items: [{ title: "Captured Payment", reconciliation_required: true }],
  });

  const resPermission = await executeAtomicReconciliation(dbPermission, {
    orderId: testOrderId3,
    paymentId: "pay_test_003",
    resolvedItems: [{ id: "art-001", quantity: 1 }],
    adminUserId: "admin-uuid-1",
  });

  assert("Permission denied returns HTTP 500", resPermission.status === 500);
  assert("Error code preserves PostgreSQL 42501", resPermission.body.code === "42501");
  assert(
    "Client error is generic and does NOT leak internal relation IDs or table names",
    resPermission.body.error === "Database transaction error encountered during reconciliation. The transaction was not completed." &&
      !resPermission.body.error.includes("public.orders") &&
      !resPermission.body.error.includes("16402")
  );
  assert("Order status in DB remains strictly 'Pending'", dbPermission.orders.get(testOrderId3)?.status === "Pending");
  assert("Zero fallback direct writes attempted after permission denial", dbPermission.fallbackTableWritesAttempted === 0);
  assert("Zero order_items records created in DB", dbPermission.orderItems.length === 0);

  // ---------------------------------------------------------------------------
  // 6. Valid Atomic RPC Execution Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- 6. Valid Atomic RPC Execution ---");
  const dbAtomic = new InMemoryMockSupabase();
  dbAtomic.simulateRpcAvailable = true;
  const testOrderId4 = "order-test-uuid-004";

  dbAtomic.orders.set(testOrderId4, {
    id: testOrderId4,
    order_ref: "TEST-RUN-004-ATOMIC",
    total: 13500,
    status: "Pending",
    payment_status: "paid",
    payment_id: "pay_test_004",
    razorpay_payment_id: null,
    razorpay_order_id: "order_rzp_004",
    user_id: "user-buyer-1",
    items: [{ title: "Captured Payment", reconciliation_required: true }],
  });

  const resAtomic = await executeAtomicReconciliation(dbAtomic, {
    orderId: testOrderId4,
    paymentId: "pay_test_004",
    razorpayOrderId: "order_rzp_004",
    resolvedItems: [{ id: "art-001", quantity: 1 }], // Golden Heritage ₹13,500
    adminUserId: "admin-uuid-1",
    testIsolationTag: "TEST-RUN-004",
  });

  assert("Atomic RPC execution returns HTTP 200", resAtomic.status === 200);
  assert("Strategy reported is strictly 'database_rpc'", resAtomic.body.strategyUsed === "database_rpc");
  assert("Status transitions to 'Processing'", resAtomic.body.status === "Processing");
  assert("Order status in DB is updated to 'Processing'", dbAtomic.orders.get(testOrderId4)?.status === "Processing");
  assert("Relational order_items has exactly 1 mirrored row", dbAtomic.orderItems.length === 1);
  assert(
    "Relational order_item uses price_at_purchase column (₹13,500)",
    dbAtomic.orderItems[0].price_at_purchase === 13500
  );
  assert("Relational order_item has title 'Golden Heritage'", dbAtomic.orderItems[0].artwork_title === "Golden Heritage");
  assert("Relational order_item maps non-UUID slug 'art-001' to artwork_id null", dbAtomic.orderItems[0].artwork_id === null);
  assert("Zero fallback direct writes occurred", dbAtomic.fallbackTableWritesAttempted === 0);

  // ---------------------------------------------------------------------------
  // 7. Authoritative Pricing & Total Mismatch Guards
  // ---------------------------------------------------------------------------
  console.log("\n--- 7. Authoritative Pricing & Total Mismatch Guards ---");
  const dbValidation = new InMemoryMockSupabase();
  dbValidation.simulateRpcAvailable = true;
  const testOrderId5 = "order-test-uuid-005";

  dbValidation.orders.set(testOrderId5, {
    id: testOrderId5,
    order_ref: "TEST-RUN-005-VALIDATE",
    total: 13500, // ₹13,500
    status: "Pending",
    payment_status: "paid",
    payment_id: "pay_test_005",
    razorpay_payment_id: null,
    razorpay_order_id: "order_rzp_005",
    user_id: "user-buyer-1",
    items: [{ reconciliation_required: true }],
  });

  // Mismatched total (Sacred Flow ₹12,000 != ₹13,500)
  const resMismatch = await executeAtomicReconciliation(dbValidation, {
    orderId: testOrderId5,
    paymentId: "pay_test_005",
    resolvedItems: [{ id: "art-002", quantity: 1 }],
    adminUserId: "admin-uuid-1",
  });
  assert("Amount mismatch is rejected with HTTP 400", resMismatch.status === 400);

  // Unknown catalogue item
  const resUnknown = await executeAtomicReconciliation(dbValidation, {
    orderId: testOrderId5,
    paymentId: "pay_test_005",
    resolvedItems: [{ id: "art-unknown-fake-999", quantity: 1 }],
    adminUserId: "admin-uuid-1",
  });
  assert("Unknown catalogue item rejected with HTTP 400", resUnknown.status === 400);

  // Client-supplied price tampering (client says price is ₹1,000 for art-001)
  const resPriceTamper = await executeAtomicReconciliation(dbValidation, {
    orderId: testOrderId5,
    paymentId: "pay_test_005",
    resolvedItems: [{ id: "art-001", quantity: 1, price: 1000 }], // art-001 is authoritative ₹13,500
    adminUserId: "admin-uuid-1",
  });
  assert(
    "Server ignores client price tampering, computes authoritative ₹13,500, and resolves via RPC",
    resPriceTamper.status === 200 && resPriceTamper.body.reconciledTotal === 13500
  );

  // ---------------------------------------------------------------------------
  // 8. Concurrency & Duplicate Prevention
  // ---------------------------------------------------------------------------
  console.log("\n--- 8. Concurrency & Duplicate Prevention ---");
  const dbConcurrency = new InMemoryMockSupabase();
  dbConcurrency.simulateRpcAvailable = true;
  const testOrderId6 = "order-test-uuid-006";

  // Case A: Order already in 'Processing' status in database
  dbConcurrency.orders.set(testOrderId6, {
    id: testOrderId6,
    order_ref: "TEST-RUN-006",
    total: 13500,
    status: "Processing", // ALREADY RESOLVED
    payment_status: "paid",
    payment_id: "pay_test_006",
    razorpay_payment_id: null,
    razorpay_order_id: null,
    user_id: "user-buyer-1",
    items: [{ reconciliation_resolved: true }],
  });

  const resDuplicate = await executeAtomicReconciliation(dbConcurrency, {
    orderId: testOrderId6,
    paymentId: "pay_test_006",
    resolvedItems: [{ id: "art-001", quantity: 1 }],
    adminUserId: "admin-uuid-1",
  });
  assert("Duplicate resolution on already-resolved order returns HTTP 409 Conflict", resDuplicate.status === 409);

  // Case B: In-flight race condition where database RPC catches concurrent transition (23505)
  const dbRace = new InMemoryMockSupabase();
  dbRace.simulateRpcAvailable = true;
  dbRace.simulateRpcConcurrencyConflict = true; // Simulates RPC detecting concurrent lock winner
  const testOrderId7 = "order-test-uuid-007";

  dbRace.orders.set(testOrderId7, {
    id: testOrderId7,
    order_ref: "TEST-RUN-007",
    total: 13500,
    status: "Pending",
    payment_status: "paid",
    payment_id: "pay_test_007",
    razorpay_payment_id: null,
    razorpay_order_id: null,
    user_id: "user-buyer-1",
    items: [{ reconciliation_required: true }],
  });

  const resRace = await executeAtomicReconciliation(dbRace, {
    orderId: testOrderId7,
    paymentId: "pay_test_007",
    resolvedItems: [{ id: "art-001", quantity: 1 }],
    adminUserId: "admin-uuid-1",
  });
  assert("RPC in-flight race conflict (23505) maps to HTTP 409 Conflict", resRace.status === 409);

  // ---------------------------------------------------------------------------
  // 9. Test-Isolation Safeguard Enforcement
  // ---------------------------------------------------------------------------
  console.log("\n--- 9. Test-Isolation Safeguard Enforcement ---");
  const dbIsolation = new InMemoryMockSupabase();
  dbIsolation.simulateRpcAvailable = true;
  const baselineOrderId = "baseline-order-existing-8f52";

  dbIsolation.orders.set(baselineOrderId, {
    id: baselineOrderId,
    order_ref: "EXISTING-STAGING-ORDER", // NOT part of active test run!
    total: 13500,
    status: "Pending",
    payment_status: "paid",
    payment_id: "pay_existing",
    razorpay_payment_id: null,
    razorpay_order_id: null,
    user_id: "user-1",
    items: [{ reconciliation_required: true }],
  });

  const resIsolationBlocked = await executeAtomicReconciliation(dbIsolation, {
    orderId: baselineOrderId,
    paymentId: "pay_existing",
    resolvedItems: [{ id: "art-001", quantity: 1 }],
    adminUserId: "admin-uuid-1",
    testIsolationTag: "TEST-SESSION-999", // Does NOT match EXISTING-STAGING-ORDER!
  });

  assert(
    "Test isolation safeguard blocks attempt to resolve an order not matching test tag",
    resIsolationBlocked.status === 403
  );
  assert(
    "Existing order status remains strictly 'Pending'",
    dbIsolation.orders.get(baselineOrderId)?.status === "Pending"
  );
  assert("Zero fallback direct writes attempted on blocked order", dbIsolation.fallbackTableWritesAttempted === 0);

  console.log("\n===============================================================");
  console.log(` SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log(` RESULT: ${passed === total ? "ALL IN-MEMORY UNIT TESTS PASSED ✅" : "SOME TESTS FAILED ❌"}`);
  console.log("===============================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runUnitTests().catch((err) => {
  console.error("Fatal test execution error:", err);
  process.exit(1);
});
