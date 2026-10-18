/**
 * KALA SETU — PHASE 2L CHECKOUT & V7 ADVERSARIAL UNIT TESTS
 * 
 * STRICT DIRECTIVE:
 * - Pure In-Memory Static Logic Verification (Zero DB, Zero Network).
 * - Clearly Labeled: This test suite simulates SQL algorithms and application
 *   controllers in TypeScript; it does NOT substitute for live PostgreSQL RLS,
 *   engine concurrency execution, or live Razorpay webhooks.
 * 
 * Test Groups:
 * 1. Canonical Shipment Request Hash & Parameter Coverage (Finding-03, Finding-04)
 * 2. Commission Attachment UPDATE Policy & Authorization (Finding-02)
 * 3. Duplicate Payment Callback Handling & Idempotency
 * 4. Conflicting Payment/Order Associations & Multi-Tenant Boundaries
 * 5. Invalid / Untrusted Catalogue IDs and Price Tampering
 * 6. Partial Persistence Recovery & Atomic Checkout Simulation
 */

import * as crypto from 'crypto';

// =============================================================================
// 1. CANONICAL SHIPMENT REQUEST HASH SIMULATOR (V7 SQL ALGORITHM)
// =============================================================================

export interface ShipmentItemInput {
  order_item_id: string;
  quantity: number;
}

export function computeV7CanonicalShipmentHash(params: {
  orderId: string;
  artistId: string;
  courierName: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  notes?: string | null;
  items: ShipmentItemInput[];
}): string {
  // Simulates PostgreSQL string_agg(x.order_item_id::text || ':' || x.quantity::text, ',' ORDER BY x.order_item_id ASC)
  const canonicalItems = [...params.items]
    .sort((a, b) => a.order_item_id.localeCompare(b.order_item_id))
    .map((item) => `${item.order_item_id}:${item.quantity}`)
    .join(',');

  const rawPayload = [
    params.orderId,
    params.artistId,
    params.courierName.trim(),
    params.trackingNumber.trim(),
    (params.trackingUrl ?? '').trim(),
    (params.notes ?? '').trim(),
    canonicalItems,
  ].join('|');

  return crypto.createHash('sha256').update(rawPayload, 'utf8').digest('hex');
}

// =============================================================================
// 2. COMMISSION ATTACHMENT STORAGE UPDATE POLICY SIMULATOR (V7 SQL)
// =============================================================================

export interface MockCommissionRecord {
  id: string;
  user_id: string; // Collector / requester
  artist_id: string; // Assigned artist
}

export function evaluateCommissionStorageUpdatePolicy(params: {
  bucketId: string;
  objectPath: string; // e.g. "commissions/c1/sketch.png" or "c1/sketch.png"
  newObjectPath?: string; // For testing WITH CHECK path alterations
  authUid: string | null;
  isAdmin: boolean;
  commissionRecords: MockCommissionRecord[];
}): { allowed: boolean; reason: string } {
  // 1. Bucket check
  if (params.bucketId !== 'commissions') {
    return { allowed: false, reason: 'Bucket is not commissions' };
  }

  // 2. Admin override
  if (params.isAdmin) {
    return { allowed: true, reason: 'Admin granted full update access' };
  }

  // 3. Authenticated check
  if (!params.authUid) {
    return { allowed: false, reason: 'Anonymous callers cannot update storage objects' };
  }

  // 4. Folder path evaluation for USING clause
  const segments = params.objectPath.split('/').filter(Boolean);
  let commissionId: string | null = null;

  if (segments.length === 2) {
    // Format: {commission_id}/{filename} (depth 1 folder)
    commissionId = segments[0];
  } else if (segments.length === 3 && segments[0] === 'commissions') {
    // Format: commissions/{commission_id}/{filename} (depth 2 folder)
    commissionId = segments[1];
  } else {
    return { allowed: false, reason: 'Path violates folder depth requirements (must be depth 1 or 2 with valid commission folder)' };
  }

  // 5. Ownership verification: collector who created commission request
  const comm = params.commissionRecords.find((c) => c.id === commissionId);
  if (!comm) {
    return { allowed: false, reason: 'Associated commission request does not exist' };
  }

  if (comm.user_id !== params.authUid) {
    return { allowed: false, reason: 'Unauthorized: Only the commission owner (collector) can update reference attachments' };
  }

  // 6. WITH CHECK clause evaluation (preventing path tampering during update)
  if (params.newObjectPath) {
    const newSegments = params.newObjectPath.split('/').filter(Boolean);
    let newCommId: string | null = null;
    if (newSegments.length === 2) {
      newCommId = newSegments[0];
    } else if (newSegments.length === 3 && newSegments[0] === 'commissions') {
      newCommId = newSegments[1];
    } else {
      return { allowed: false, reason: 'WITH CHECK violation: Target path violates folder structure' };
    }

    if (newCommId !== commissionId) {
      return { allowed: false, reason: 'WITH CHECK violation: Cannot move attachment across commission boundaries' };
    }
  }

  return { allowed: true, reason: 'Permitted: Collector updating own commission reference attachment' };
}

// =============================================================================
// 3. IN-MEMORY CHECKOUT & ORDER PERSISTENCE SIMULATOR
// =============================================================================

export interface MockOrderItem {
  id: string;
  order_id: string;
  artwork_id: string | null;
  artist_id: string | null;
  quantity: number;
  price_at_purchase: number;
  artwork_title: string;
  artwork_image: string | null;
}

export interface MockOrder {
  id: string;
  order_ref: string;
  user_id: string | null;
  total: number;
  payment_id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string;
  status: string;
  payment_status: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: unknown;
}

export class MockDatabase {
  orders: MockOrder[] = [];
  orderItems: MockOrderItem[] = [];
  failOrderItemsInsert = false;

  reset() {
    this.orders = [];
    this.orderItems = [];
    this.failOrderItemsInsert = false;
  }

  // Simulates public.create_checkout_order_atomic RPC
  createCheckoutOrderAtomic(params: {
    callerUid: string | null;
    isAdmin: boolean;
    userId: string;
    orderRef: string;
    total: number;
    paymentId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    itemsJson: unknown;
    orderItems: Array<{
      artwork_id: string | null;
      artist_id: string | null;
      quantity: number;
      price_at_purchase: number;
      artwork_title: string;
      artwork_image: string | null;
    }>;
  }): { success: boolean; orderId?: string; orderRef?: string; total?: number; paymentId?: string; alreadyProcessed?: boolean; error?: string; code?: string } {
    // 1. Authorization
    if (!params.callerUid || (params.callerUid !== params.userId && !params.isAdmin)) {
      return { success: false, error: 'Unauthorized: Caller cannot create order for another user', code: '42501' };
    }

    // 2. Validation
    if (!params.orderRef || params.orderRef.trim().length === 0) {
      return { success: false, error: 'Order reference is required', code: '22000' };
    }
    if (params.total <= 0) {
      return { success: false, error: 'Order total must be positive', code: '22000' };
    }
    if (!params.orderItems || params.orderItems.length === 0) {
      return { success: false, error: 'Order items must be a non-empty array', code: '22000' };
    }

    // 3. Idempotency Check
    const existing = this.orders.find(
      (o) => o.payment_id === params.paymentId || o.razorpay_payment_id === params.razorpayPaymentId || o.order_ref === params.orderRef
    );

    if (existing) {
      if (existing.user_id !== params.userId && !params.isAdmin) {
        return { success: false, error: 'Access denied: payment reference is associated with another account', code: '42501' };
      }

      // Check if line items exist (Recoverable backfill)
      const existingItems = this.orderItems.filter((oi) => oi.order_id === existing.id);
      if (existingItems.length === 0) {
        for (const item of params.orderItems) {
          this.orderItems.push({
            id: `oi_${crypto.randomUUID()}`,
            order_id: existing.id,
            artwork_id: item.artwork_id,
            artist_id: item.artist_id,
            quantity: item.quantity,
            price_at_purchase: item.price_at_purchase,
            artwork_title: item.artwork_title,
            artwork_image: item.artwork_image,
          });
        }
      }

      return {
        success: true,
        orderId: existing.id,
        orderRef: existing.order_ref,
        total: existing.total,
        paymentId: existing.payment_id,
        alreadyProcessed: true,
      };
    }

    // 4. Atomic Transactional Insert
    if (this.failOrderItemsInsert) {
      // Transaction aborts atomically: no order and no items are committed
      return { success: false, error: 'Transaction rolled back due to internal error', code: 'XX000' };
    }

    const newOrderId = `ord_${crypto.randomUUID()}`;
    const newOrder: MockOrder = {
      id: newOrderId,
      order_ref: params.orderRef.trim(),
      user_id: params.userId,
      total: params.total,
      payment_id: params.paymentId.trim(),
      razorpay_order_id: params.razorpayOrderId,
      razorpay_payment_id: params.razorpayPaymentId.trim(),
      status: 'Pending',
      payment_status: 'paid',
      customer_name: params.customerName.trim(),
      customer_phone: params.customerPhone.trim(),
      customer_address: params.customerAddress.trim(),
      items: params.itemsJson,
    };

    this.orders.push(newOrder);

    for (const item of params.orderItems) {
      this.orderItems.push({
        id: `oi_${crypto.randomUUID()}`,
        order_id: newOrderId,
        artwork_id: item.artwork_id,
        artist_id: item.artist_id,
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
        artwork_title: item.artwork_title,
        artwork_image: item.artwork_image,
      });
    }

    return {
      success: true,
      orderId: newOrderId,
      orderRef: newOrder.order_ref,
      total: newOrder.total,
      paymentId: newOrder.payment_id,
      alreadyProcessed: false,
    };
  }

  // Simulates Strategy B (Non-atomic fallback with recoverable retry)
  fallbackInsert(params: {
    userId: string;
    orderRef: string;
    total: number;
    paymentId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    itemsJson: unknown;
    orderItems: Array<{
      artwork_id: string | null;
      artist_id: string | null;
      quantity: number;
      price_at_purchase: number;
      artwork_title: string;
      artwork_image: string | null;
    }>;
  }): { success: boolean; orderId?: string; orderRef?: string; error?: string; status: number; requiresSupport?: boolean } {
    // 1. Idempotency Check
    const existing = this.orders.find(
      (o) => o.payment_id === params.paymentId || o.razorpay_payment_id === params.razorpayPaymentId
    );

    if (existing) {
      if (existing.user_id !== params.userId) {
        return { success: false, error: 'Access denied: payment reference is associated with another account', status: 403 };
      }

      // Recoverable backfill
      const existingItems = this.orderItems.filter((oi) => oi.order_id === existing.id);
      if (existingItems.length === 0) {
        for (const item of params.orderItems) {
          this.orderItems.push({
            id: `oi_${crypto.randomUUID()}`,
            order_id: existing.id,
            artwork_id: item.artwork_id,
            artist_id: item.artist_id,
            quantity: item.quantity,
            price_at_purchase: item.price_at_purchase,
            artwork_title: item.artwork_title,
            artwork_image: item.artwork_image,
          });
        }
      }

      return { success: true, orderId: existing.id, orderRef: existing.order_ref, status: 200 };
    }

    // 2. Insert order
    const orderId = `ord_${crypto.randomUUID()}`;
    const newOrder: MockOrder = {
      id: orderId,
      order_ref: params.orderRef,
      user_id: params.userId,
      total: params.total,
      payment_id: params.paymentId,
      razorpay_order_id: params.razorpayOrderId,
      razorpay_payment_id: params.razorpayPaymentId,
      status: 'Pending',
      payment_status: 'paid',
      customer_name: params.customerName,
      customer_phone: params.customerPhone,
      customer_address: params.customerAddress,
      items: params.itemsJson,
    };
    this.orders.push(newOrder);

    // 3. Insert items (may fail simulated network drop)
    if (this.failOrderItemsInsert) {
      return {
        success: false,
        error: `Your payment was completed (Reference ID: ${params.paymentId}), but line items could not be saved. Please retry or contact support.`,
        status: 500,
        requiresSupport: true,
      };
    }

    for (const item of params.orderItems) {
      this.orderItems.push({
        id: `oi_${crypto.randomUUID()}`,
        order_id: orderId,
        artwork_id: item.artwork_id,
        artist_id: item.artist_id,
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
        artwork_title: item.artwork_title,
        artwork_image: item.artwork_image,
      });
    }

    return { success: true, orderId, orderRef: newOrder.order_ref, status: 200 };
  }
}

// =============================================================================
// TEST RUNNER
// =============================================================================

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
  }
}

export function runAllTests() {
  console.log('================================================================');
  console.log('KALA SETU PHASE 2L — V7 PROPOSAL & CHECKOUT PERSISTENCE TESTS');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // TEST GROUP 1: Canonical Shipment Request Hash (Finding-03 & 04)
  // ---------------------------------------------------------------------------
  console.log('Test Group 1: Canonical Shipment Request Hash (Finding-03 & 04)');
  {
    const baseParams = {
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      artistId: '660e8400-e29b-41d4-a716-446655440001',
      courierName: 'BlueDart Express',
      trackingNumber: 'BD123456789',
      trackingUrl: 'https://bluedart.com/track/BD123456789',
      notes: 'Fragile artwork, handle with care',
      items: [
        { order_item_id: '770e8400-e29b-41d4-a716-446655440002', quantity: 1 },
        { order_item_id: '110e8400-e29b-41d4-a716-446655440003', quantity: 2 },
      ],
    };

    const reversedItemsParams = {
      ...baseParams,
      items: [
        { order_item_id: '110e8400-e29b-41d4-a716-446655440003', quantity: 2 },
        { order_item_id: '770e8400-e29b-41d4-a716-446655440002', quantity: 1 },
      ],
    };

    const hash1 = computeV7CanonicalShipmentHash(baseParams);
    const hash2 = computeV7CanonicalShipmentHash(reversedItemsParams);

    assert(hash1.length === 64, 'SHA-256 hash is 64 hex characters');
    assert(hash1 === hash2, 'Canonical sorting ensures identical hash regardless of item array order (Finding-03 resolved)');

    // Parameter coverage checks (Finding-04)
    const modifiedTrackingUrl = computeV7CanonicalShipmentHash({
      ...baseParams,
      trackingUrl: 'https://other-courier.com/track/BD123456789',
    });
    assert(hash1 !== modifiedTrackingUrl, 'Modifying tracking_url alters the request hash (Finding-04 resolved)');

    const modifiedNotes = computeV7CanonicalShipmentHash({
      ...baseParams,
      notes: 'Expedited shipping requested',
    });
    assert(hash1 !== modifiedNotes, 'Modifying notes alters the request hash (Finding-04 resolved)');

    const nullFieldsParams = computeV7CanonicalShipmentHash({
      ...baseParams,
      trackingUrl: null,
      notes: null,
    });
    assert(nullFieldsParams.length === 64, 'Null tracking_url and notes normalize gracefully without error');
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 2: Commission Storage UPDATE Policy & Authorization (Finding-02)
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 2: Commission Storage UPDATE Policy Authorization (Finding-02)');
  {
    const commissions: MockCommissionRecord[] = [
      { id: 'comm_111', user_id: 'user_collector_1', artist_id: 'user_artist_1' },
      { id: 'comm_222', user_id: 'user_collector_2', artist_id: 'user_artist_2' },
    ];

    // Case 1: Collector updating own commission attachment
    const c1Update = evaluateCommissionStorageUpdatePolicy({
      bucketId: 'commissions',
      objectPath: 'commissions/comm_111/sketch_v2.png',
      authUid: 'user_collector_1',
      isAdmin: false,
      commissionRecords: commissions,
    });
    assert(c1Update.allowed, 'Collector C1 is permitted to update own commission attachment (upsert: true)');

    // Case 2: Depth 1 path format (comm_111/sketch.png)
    const c1Depth1Update = evaluateCommissionStorageUpdatePolicy({
      bucketId: 'commissions',
      objectPath: 'comm_111/sketch_v2.png',
      authUid: 'user_collector_1',
      isAdmin: false,
      commissionRecords: commissions,
    });
    assert(c1Depth1Update.allowed, 'Collector C1 permitted with depth-1 path (comm_111/file.png)');

    // Case 3: Assigned artist attempting to update collector reference attachment
    const artistUpdate = evaluateCommissionStorageUpdatePolicy({
      bucketId: 'commissions',
      objectPath: 'commissions/comm_111/sketch_v2.png',
      authUid: 'user_artist_1',
      isAdmin: false,
      commissionRecords: commissions,
    });
    assert(!artistUpdate.allowed, 'Assigned artist is DENIED update on collector references (Least privilege maintained)');

    // Case 4: Third-party collector attempting to update another collector's attachment
    const thirdPartyUpdate = evaluateCommissionStorageUpdatePolicy({
      bucketId: 'commissions',
      objectPath: 'commissions/comm_111/sketch_v2.png',
      authUid: 'user_collector_2',
      isAdmin: false,
      commissionRecords: commissions,
    });
    assert(!thirdPartyUpdate.allowed, 'Collector C2 is DENIED update on Collector C1 attachments');

    // Case 5: Anonymous update
    const anonUpdate = evaluateCommissionStorageUpdatePolicy({
      bucketId: 'commissions',
      objectPath: 'commissions/comm_111/sketch_v2.png',
      authUid: null,
      isAdmin: false,
      commissionRecords: commissions,
    });
    assert(!anonUpdate.allowed, 'Anonymous update is strictly DENIED');

    // Case 6: Admin override
    const adminUpdate = evaluateCommissionStorageUpdatePolicy({
      bucketId: 'commissions',
      objectPath: 'commissions/comm_111/sketch_v2.png',
      authUid: 'user_admin',
      isAdmin: true,
      commissionRecords: commissions,
    });
    assert(adminUpdate.allowed, 'Admin is permitted update access for moderation/dispute resolution');

    // Case 7: Invalid path nesting (root upload without commission folder)
    const rootPathUpdate = evaluateCommissionStorageUpdatePolicy({
      bucketId: 'commissions',
      objectPath: 'sketch_v2.png',
      authUid: 'user_collector_1',
      isAdmin: false,
      commissionRecords: commissions,
    });
    assert(!rootPathUpdate.allowed, 'Root upload without commission folder is DENIED');

    // Case 8: Target path tampering (WITH CHECK violation across commissions)
    const tamperingUpdate = evaluateCommissionStorageUpdatePolicy({
      bucketId: 'commissions',
      objectPath: 'commissions/comm_111/sketch_v2.png',
      newObjectPath: 'commissions/comm_222/sketch_v2.png',
      authUid: 'user_collector_1',
      isAdmin: false,
      commissionRecords: commissions,
    });
    assert(!tamperingUpdate.allowed, 'Moving file across commission folders violates WITH CHECK and is DENIED');
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 3: Duplicate Payment Callback Handling & Idempotency
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 3: Duplicate Payment Callback Handling & Idempotency');
  {
    const db = new MockDatabase();

    const orderPayload = {
      callerUid: 'user_collector_1',
      isAdmin: false,
      userId: 'user_collector_1',
      orderRef: 'KS123456789',
      total: 15000,
      paymentId: 'pay_test_dup_001',
      razorpayOrderId: 'order_test_dup_001',
      razorpayPaymentId: 'pay_test_dup_001',
      customerName: 'Ananya Sharma',
      customerPhone: '+91 98765 43210',
      customerAddress: '123 MG Road, Bengaluru',
      itemsJson: [{ id: 'item_1', title: 'Madhubani Fish' }],
      orderItems: [
        {
          artwork_id: '550e8400-e29b-41d4-a716-446655440010',
          artist_id: '660e8400-e29b-41d4-a716-446655440020',
          quantity: 1,
          price_at_purchase: 15000,
          artwork_title: 'Madhubani Fish',
          artwork_image: '/images/madhubani.jpg',
        },
      ],
    };

    // First callback
    const res1 = db.createCheckoutOrderAtomic(orderPayload);
    assert(res1.success, 'First checkout callback succeeds');
    assert(!res1.alreadyProcessed, 'First callback is marked as freshly processed');
    assert(db.orders.length === 1, 'Exactly one order record created');
    assert(db.orderItems.length === 1, 'Exactly one order_item record created');

    // Duplicate callback with same payment ID
    const res2 = db.createCheckoutOrderAtomic(orderPayload);
    assert(res2.success, 'Duplicate callback returns success');
    assert(res2.alreadyProcessed === true, 'Duplicate callback flagged with alreadyProcessed: true');
    assert(res2.orderId === res1.orderId, 'Duplicate callback returns identical orderId');
    assert(db.orders.length === 1, 'No duplicate order created in database');
    assert(db.orderItems.length === 1, 'No duplicate line items created in database');
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 4: Conflicting Payment / Order Associations & Multi-Tenant Boundaries
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 4: Conflicting Payment / Order Associations');
  {
    const db = new MockDatabase();

    // User A creates order with pay_test_conflict_001
    db.createCheckoutOrderAtomic({
      callerUid: 'user_A',
      isAdmin: false,
      userId: 'user_A',
      orderRef: 'KS111111111',
      total: 10000,
      paymentId: 'pay_test_conflict_001',
      razorpayOrderId: 'order_test_conflict_001',
      razorpayPaymentId: 'pay_test_conflict_001',
      customerName: 'User A',
      customerPhone: '+91 99999 11111',
      customerAddress: 'Address A',
      itemsJson: [],
      orderItems: [
        {
          artwork_id: '550e8400-e29b-41d4-a716-446655440010',
          artist_id: null,
          quantity: 1,
          price_at_purchase: 10000,
          artwork_title: 'Artwork A',
          artwork_image: null,
        },
      ],
    });

    // User B attempts to claim the same payment ID
    const conflictRes = db.createCheckoutOrderAtomic({
      callerUid: 'user_B',
      isAdmin: false,
      userId: 'user_B',
      orderRef: 'KS222222222',
      total: 10000,
      paymentId: 'pay_test_conflict_001',
      razorpayOrderId: 'order_test_conflict_001',
      razorpayPaymentId: 'pay_test_conflict_001',
      customerName: 'User B',
      customerPhone: '+91 99999 22222',
      customerAddress: 'Address B',
      itemsJson: [],
      orderItems: [
        {
          artwork_id: '550e8400-e29b-41d4-a716-446655440010',
          artist_id: null,
          quantity: 1,
          price_at_purchase: 10000,
          artwork_title: 'Artwork A',
          artwork_image: null,
        },
      ],
    });

    assert(!conflictRes.success, 'Conflicting user claim is rejected');
    assert(conflictRes.code === '42501', 'Conflicting user claim raises 42501 authorization exception');
    assert(db.orders.length === 1, 'Database remains untampered with 1 order');
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 5: Invalid / Untrusted Catalogue IDs and Price Tampering
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 5: Untrusted Catalogue IDs & Price Tampering');
  {
    // Simulating buildAuthoritativeOrderItemRows logic from verify-payment/route.ts
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    function sanitizeOrderItem(item: { id: string; clientPrice: number; catalogPrice: number }) {
      const isDbUuid = UUID_REGEX.test(item.id);
      return {
        artwork_id: isDbUuid ? item.id : null, // Prototype slugs map to null!
        price_at_purchase: item.catalogPrice, // Authoritative price overrides client price!
      };
    }

    // Case 1: Prototype slug like "art-001"
    const protoResult = sanitizeOrderItem({
      id: 'art-001',
      clientPrice: 100, // Tampered price
      catalogPrice: 12000,
    });
    assert(protoResult.artwork_id === null, 'Prototype slug "art-001" is mapped to NULL artwork_id (never crashes UUID cast)');
    assert(protoResult.price_at_purchase === 12000, 'Authoritative catalogue price (12000) overrides client price (100)');

    // Case 2: Legitimate DB UUID
    const legitimateUuid = 'd3b07384-d113-4422-9fa0-022634352f11';
    const dbResult = sanitizeOrderItem({
      id: legitimateUuid,
      clientPrice: 50,
      catalogPrice: 25000,
    });
    assert(dbResult.artwork_id === legitimateUuid, 'Legitimate database UUID is preserved as artwork_id');
    assert(dbResult.price_at_purchase === 25000, 'Catalogue price enforced for database UUID item');
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 6: Partial Persistence Recovery & Atomic Checkout Simulation
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 6: Partial Persistence Recovery & Atomic Checkout');
  {
    const db = new MockDatabase();

    // Scenario A: Atomic RPC rolls back entirely on failure (no orphan orders)
    db.failOrderItemsInsert = true;
    const atomicFail = db.createCheckoutOrderAtomic({
      callerUid: 'user_collector_1',
      isAdmin: false,
      userId: 'user_collector_1',
      orderRef: 'KS_ATOMIC_FAIL',
      total: 8000,
      paymentId: 'pay_fail_001',
      razorpayOrderId: 'order_fail_001',
      razorpayPaymentId: 'pay_fail_001',
      customerName: 'Collector',
      customerPhone: '+91 98765 00000',
      customerAddress: 'Test Address',
      itemsJson: [],
      orderItems: [
        {
          artwork_id: null,
          artist_id: null,
          quantity: 1,
          price_at_purchase: 8000,
          artwork_title: 'Test',
          artwork_image: null,
        },
      ],
    });
    assert(!atomicFail.success, 'Atomic RPC fails closed when items insert encounters error');
    assert(db.orders.length === 0, 'No partial/orphan order left behind in atomic failure (Atomicity guaranteed)');
    assert(db.orderItems.length === 0, 'No partial items left behind in atomic failure');

    // Scenario B: Fallback path experiences partial failure (Order written, items failed)
    db.reset();
    db.failOrderItemsInsert = true;
    const fallbackFail = db.fallbackInsert({
      userId: 'user_collector_1',
      orderRef: 'KS_FALLBACK_PARTIAL',
      total: 8000,
      paymentId: 'pay_fallback_001',
      razorpayOrderId: 'order_fallback_001',
      razorpayPaymentId: 'pay_fallback_001',
      customerName: 'Collector',
      customerPhone: '+91 98765 00000',
      customerAddress: 'Test Address',
      itemsJson: [],
      orderItems: [
        {
          artwork_id: null,
          artist_id: null,
          quantity: 1,
          price_at_purchase: 8000,
          artwork_title: 'Test',
          artwork_image: null,
        },
      ],
    });
    assert(!fallbackFail.success, 'Fallback reports failure when line items fail');
    assert(fallbackFail.requiresSupport === true, 'Fallback marks response with requiresSupport: true');
    assert(fallbackFail.status === 500, 'Fallback returns 500 error status');
    assert(db.orders.length === 1, 'Fallback leaves order record in Pending status');
    assert(db.orderItems.length === 0, 'Line items are currently missing (0 items)');

    // Scenario C: Client retries after network restoration
    db.failOrderItemsInsert = false; // Network restored
    const fallbackRetry = db.fallbackInsert({
      userId: 'user_collector_1',
      orderRef: 'KS_FALLBACK_PARTIAL',
      total: 8000,
      paymentId: 'pay_fallback_001',
      razorpayOrderId: 'order_fallback_001',
      razorpayPaymentId: 'pay_fallback_001',
      customerName: 'Collector',
      customerPhone: '+91 98765 00000',
      customerAddress: 'Test Address',
      itemsJson: [],
      orderItems: [
        {
          artwork_id: null,
          artist_id: null,
          quantity: 1,
          price_at_purchase: 8000,
          artwork_title: 'Test',
          artwork_image: null,
        },
      ],
    });

    assert(fallbackRetry.success, 'Retry succeeds');
    assert(fallbackRetry.status === 200, 'Retry returns 200 OK');
    assert(db.orders.length === 1, 'Still exactly 1 order record (no duplicate order created)');
    assert(db.orderItems.length === 1, 'Missing line items successfully backfilled (Recoverable persistence verified)');
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

// Execute tests if run directly
runAllTests();
