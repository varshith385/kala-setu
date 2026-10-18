/**
 * Kala Setu — Phase 2F: V4 Allocation, Rollup, & Scoped Fulfillment Unit Tests
 *
 * SAFETY GUARANTEES:
 * 1. Zero database writes, reads, or connections.
 * 2. Zero network requests or external service calls.
 * 3. Pure in-memory static algorithmic verification of V4 proposal logic.
 */

export interface OrderItem {
  id: string; // UUID
  orderId: string;
  artistId: string;
  quantity: number;
  priceAtPurchase: number;
  artworkTitle: string;
}

export interface ShipmentAllocationItem {
  orderItemId: string;
  quantity: number;
}

export interface OrderShipment {
  id: string;
  orderId: string;
  artistId: string;
  status: 'Processing' | 'Dispatched' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Returned' | 'Cancelled';
  courierName?: string | null;
  trackingNumber?: string | null;
  idempotencyKey?: string | null;
  items: ShipmentAllocationItem[];
}

export interface OrderRecord {
  id: string;
  orderRef: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  total: number;
}

// ============================================================================
// 1. PURE V4 ALLOCATION VALIDATOR
// ============================================================================

export function validateShipmentAllocationPayload(params: {
  order: OrderRecord;
  callerArtistId: string;
  isAdmin: boolean;
  orderItems: OrderItem[];
  existingShipments: OrderShipment[];
  itemsPayload: unknown;
  idempotencyKey?: string | null;
}): {
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
  idempotentRetry?: boolean;
  sortedItemIds?: string[];
} {
  const { order, callerArtistId, isAdmin, orderItems, existingShipments, itemsPayload, idempotencyKey } = params;

  // 1. Caller Authorization
  if (!isAdmin && orderItems.every((it) => it.artistId !== callerArtistId)) {
    return { valid: false, errorCode: '42501', errorMessage: 'Caller is not an artist for this order' };
  }

  // 2. Payload Array Validation (Remediates F-10)
  if (!itemsPayload || !Array.isArray(itemsPayload)) {
    return { valid: false, errorCode: '22000', errorMessage: 'Shipment items must be a non-null JSON array' };
  }

  if (itemsPayload.length === 0) {
    return { valid: false, errorCode: '22000', errorMessage: 'Cannot create shipment with empty items array' };
  }

  // 3. Idempotency Check (Remediates F-14)
  if (idempotencyKey && idempotencyKey.trim().length > 0) {
    const existing = existingShipments.find(
      (s) => s.orderId === order.id && s.artistId === callerArtistId && s.idempotencyKey === idempotencyKey.trim()
    );
    if (existing) {
      return { valid: true, idempotentRetry: true };
    }
  }

  // 4. Payment verification
  if (order.paymentStatus !== 'paid') {
    return { valid: false, errorCode: '22000', errorMessage: 'Cannot ship unpaid order' };
  }

  // 5. Deterministic sorting to eliminate deadlock risk (Remediates F-12)
  const typedItems = itemsPayload as ShipmentAllocationItem[];
  const sortedItems = [...typedItems].sort((a, b) => a.orderItemId.localeCompare(b.orderItemId));

  // 6. Item by item locking and allocation checks
  for (const item of sortedItems) {
    if (!item.quantity || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { valid: false, errorCode: '22000', errorMessage: 'Quantity must be a positive integer' };
    }

    const orderItem = orderItems.find((oi) => oi.id === item.orderItemId);
    if (!orderItem) {
      return { valid: false, errorCode: 'P0002', errorMessage: `Order item ${item.orderItemId} not found` };
    }

    if (orderItem.orderId !== order.id) {
      return { valid: false, errorCode: '22000', errorMessage: `Item does not belong to order ${order.id}` };
    }

    if (!isAdmin && orderItem.artistId !== callerArtistId) {
      return { valid: false, errorCode: '42501', errorMessage: 'Artist cannot ship items owned by another artist' };
    }

    // Active allocated quantity check (excluding Cancelled shipments)
    const activeAllocated = existingShipments
      .filter((s) => s.status !== 'Cancelled')
      .flatMap((s) => s.items)
      .filter((si) => si.orderItemId === item.orderItemId)
      .reduce((sum, si) => sum + si.quantity, 0);

    if (activeAllocated + item.quantity > orderItem.quantity) {
      return {
        valid: false,
        errorCode: '22000',
        errorMessage: `Quantity allocation overflow: purchased ${orderItem.quantity}, allocated ${activeAllocated}, requested ${item.quantity}`,
      };
    }
  }

  return {
    valid: true,
    sortedItemIds: sortedItems.map((it) => it.orderItemId),
  };
}

// ============================================================================
// 2. PURE V4 ORDER STATUS ROLLUP LOGIC (Remediates F-11)
// ============================================================================

export function calculateOrderRollupStatus(shipments: OrderShipment[]): OrderRecord['status'] {
  const activeShipments = shipments.filter((s) => s.status !== 'Cancelled');
  const total = activeShipments.length;

  if (total === 0) {
    return 'Processing';
  }

  const delivered = activeShipments.filter((s) => s.status === 'Delivered').length;
  const returned = activeShipments.filter((s) => s.status === 'Returned').length;
  const activeDispatchedOrLater = activeShipments.filter((s) =>
    ['Dispatched', 'In Transit', 'Out for Delivery', 'Delivered'].includes(s.status)
  ).length;

  // Case A: All active delivered
  if (delivered === total) {
    return 'Delivered';
  }

  // Case B: All active returned (Remediates F-11: Maps to 'Cancelled' closed state, NEVER 'Processing'!)
  if (returned === total) {
    return 'Cancelled';
  }

  // Case C: Mixed Delivered and Returned (All items resolved, at least one delivered)
  if (delivered + returned === total && delivered > 0) {
    return 'Delivered';
  }

  // Case D: All active shipments dispatched or later
  if (activeDispatchedOrLater + returned === total && activeDispatchedOrLater > 0) {
    return 'Shipped';
  }

  // Case E: Partially processing
  return 'Processing';
}

// ============================================================================
// 3. PURE V4 SCOPED ARTIST FULFILLMENT SELECTOR (Remediates F-13)
// ============================================================================

export function getScopedArtistFulfillmentData(params: {
  order: OrderRecord;
  orderItems: OrderItem[];
  shipments: OrderShipment[];
  artistId: string;
}) {
  const { order, orderItems, shipments, artistId } = params;

  // Only items belonging to THIS artist
  const myItems = orderItems.filter((oi) => oi.artistId === artistId);
  if (myItems.length === 0) {
    return null; // Artist has no items in this order
  }

  // Only shipments belonging to THIS artist
  const myShipments = shipments.filter((s) => s.artistId === artistId);

  return {
    orderId: order.id,
    orderRef: order.orderRef,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerAddress: order.customerAddress,
    items: myItems.map((it) => ({
      orderItemId: it.id,
      artworkTitle: it.artworkTitle,
      quantity: it.quantity,
      priceAtPurchase: it.priceAtPurchase,
    })),
    shipments: myShipments,
    // Excluded from artist view:
    // - Other artists' line items
    // - Other artists' pricing
    // - Full order grand total
  };
}

// ============================================================================
// 4. TEST SUITE EXECUTION
// ============================================================================

async function runV4RemediationUnitTests() {
  console.log('===============================================================');
  console.log(' KALA SETU — V4 REMEDIATION ALLOCATION & ROLLUP UNIT TESTS    ');
  console.log(' Mode: Pure In-Memory Static Logic Verification (Zero DB)     ');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(desc: string, condition: boolean) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${desc}`);
    }
  }

  const mockOrder: OrderRecord = {
    id: '11111111-1111-1111-1111-111111111111',
    orderRef: 'KS-ORD-901',
    userId: '22222222-2222-2222-2222-222222222222',
    customerName: 'Aarav Patel',
    customerPhone: '+91 98765 43210',
    customerAddress: 'Flat 402, Lotus Towers, Bandra West, Mumbai 400050',
    status: 'Processing',
    paymentStatus: 'paid',
    total: 85000,
  };

  const item1ArtistA: OrderItem = {
    id: 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    orderId: mockOrder.id,
    artistId: 'artist-uuid-A',
    quantity: 2,
    priceAtPurchase: 25000,
    artworkTitle: 'Golden Heritage',
  };

  const item2ArtistB: OrderItem = {
    id: 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    orderId: mockOrder.id,
    artistId: 'artist-uuid-B',
    quantity: 1,
    priceAtPurchase: 35000,
    artworkTitle: 'Kathakali Reverie',
  };

  const orderItems = [item1ArtistA, item2ArtistB];

  // -------------------------------------------------------------------------
  // SECTION 1: Empty & Malformed Payload Rejection (F-10)
  // -------------------------------------------------------------------------
  console.log('--- 1. Empty & Malformed Items Payload Rejection (F-10) ---');

  const r1 = validateShipmentAllocationPayload({
    order: mockOrder,
    callerArtistId: 'artist-uuid-A',
    isAdmin: false,
    orderItems,
    existingShipments: [],
    itemsPayload: null,
  });
  assert('Null items payload is rejected with error 22000', !r1.valid && r1.errorCode === '22000');

  const r2 = validateShipmentAllocationPayload({
    order: mockOrder,
    callerArtistId: 'artist-uuid-A',
    isAdmin: false,
    orderItems,
    existingShipments: [],
    itemsPayload: [],
  });
  assert('Empty items array is rejected with error 22000', !r2.valid && r2.errorCode === '22000');

  const r3 = validateShipmentAllocationPayload({
    order: mockOrder,
    callerArtistId: 'artist-uuid-A',
    isAdmin: false,
    orderItems,
    existingShipments: [],
    itemsPayload: 'invalid_string',
  });
  assert('Non-array payload is rejected with error 22000', !r3.valid && r3.errorCode === '22000');

  // -------------------------------------------------------------------------
  // SECTION 2: Deterministic Locking Order (F-12)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Deterministic Row Lock Ordering (F-12) ---');

  const payloadUnsorted = [
    { orderItemId: item2ArtistB.id, quantity: 1 },
    { orderItemId: item1ArtistA.id, quantity: 1 },
  ];
  const r4 = validateShipmentAllocationPayload({
    order: mockOrder,
    callerArtistId: 'artist-uuid-A',
    isAdmin: true, // admin can ship both
    orderItems,
    existingShipments: [],
    itemsPayload: payloadUnsorted,
  });
  assert('Unsorted input items are deterministically sorted in ascending order', 
    r4.valid && r4.sortedItemIds?.[0] === item1ArtistA.id && r4.sortedItemIds?.[1] === item2ArtistB.id
  );

  // -------------------------------------------------------------------------
  // SECTION 3: Allocation Bounding & Cancelled Accounting
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Allocation Bounding & Cancelled Shipment Accounting ---');

  // Allocate 2 out of 2
  const r5 = validateShipmentAllocationPayload({
    order: mockOrder,
    callerArtistId: 'artist-uuid-A',
    isAdmin: false,
    orderItems,
    existingShipments: [],
    itemsPayload: [{ orderItemId: item1ArtistA.id, quantity: 2 }],
  });
  assert('Allocating exact purchased quantity (2 of 2) succeeds', r5.valid);

  // Attempt to allocate 3 out of 2
  const r6 = validateShipmentAllocationPayload({
    order: mockOrder,
    callerArtistId: 'artist-uuid-A',
    isAdmin: false,
    orderItems,
    existingShipments: [],
    itemsPayload: [{ orderItemId: item1ArtistA.id, quantity: 3 }],
  });
  assert('Allocating 3 out of 2 fails with quantity overflow', !r6.valid && Boolean(r6.errorMessage?.includes('overflow')));

  // Cancelled shipment freed allocation test
  const cancelledShipment: OrderShipment = {
    id: 'ship-001',
    orderId: mockOrder.id,
    artistId: 'artist-uuid-A',
    status: 'Cancelled',
    items: [{ orderItemId: item1ArtistA.id, quantity: 2 }],
  };
  const r7 = validateShipmentAllocationPayload({
    order: mockOrder,
    callerArtistId: 'artist-uuid-A',
    isAdmin: false,
    orderItems,
    existingShipments: [cancelledShipment],
    itemsPayload: [{ orderItemId: item1ArtistA.id, quantity: 2 }],
  });
  assert('Cancelled shipment items are freed, allowing re-allocation', r7.valid);

  // -------------------------------------------------------------------------
  // SECTION 4: Cross-Tenant Artist Item Protection
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Cross-Tenant Item Allocation Rejection ---');

  const r8 = validateShipmentAllocationPayload({
    order: mockOrder,
    callerArtistId: 'artist-uuid-A',
    isAdmin: false,
    orderItems,
    existingShipments: [],
    itemsPayload: [{ orderItemId: item2ArtistB.id, quantity: 1 }], // Item owned by Artist B!
  });
  assert('Artist A attempting to ship Artist B item is rejected with 42501', !r8.valid && r8.errorCode === '42501');

  // -------------------------------------------------------------------------
  // SECTION 5: Idempotency Retry Handling (F-14)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Idempotent Retry Handling (F-14) ---');

  const existingShipment: OrderShipment = {
    id: 'ship-existing-123',
    orderId: mockOrder.id,
    artistId: 'artist-uuid-A',
    status: 'Dispatched',
    idempotencyKey: 'retry-key-abc',
    items: [{ orderItemId: item1ArtistA.id, quantity: 2 }],
  };
  const r9 = validateShipmentAllocationPayload({
    order: mockOrder,
    callerArtistId: 'artist-uuid-A',
    isAdmin: false,
    orderItems,
    existingShipments: [existingShipment],
    itemsPayload: [{ orderItemId: item1ArtistA.id, quantity: 2 }],
    idempotencyKey: 'retry-key-abc',
  });
  assert('Request with existing idempotency key returns idempotent retry without overflow error', r9.valid && r9.idempotentRetry === true);

  // -------------------------------------------------------------------------
  // SECTION 6: Order Status Rollup Logic (F-11 Remediation)
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Corrected Order Status Rollup (F-11) ---');

  // All Delivered
  const statusAllDelivered = calculateOrderRollupStatus([
    { id: 's1', orderId: mockOrder.id, artistId: 'artist-uuid-A', status: 'Delivered', items: [] },
    { id: 's2', orderId: mockOrder.id, artistId: 'artist-uuid-B', status: 'Delivered', items: [] },
  ]);
  assert("All shipments Delivered rolls up to 'Delivered'", statusAllDelivered === 'Delivered');

  // All Returned (Remediates F-11: Maps to 'Cancelled' closed state, never 'Processing')
  const statusAllReturned = calculateOrderRollupStatus([
    { id: 's1', orderId: mockOrder.id, artistId: 'artist-uuid-A', status: 'Returned', items: [] },
  ]);
  assert("All shipments Returned maps to 'Cancelled' (closed terminal state, never 'Processing')", statusAllReturned === 'Cancelled');

  // Mixed Delivered and Returned
  const statusMixedDeliveredReturned = calculateOrderRollupStatus([
    { id: 's1', orderId: mockOrder.id, artistId: 'artist-uuid-A', status: 'Delivered', items: [] },
    { id: 's2', orderId: mockOrder.id, artistId: 'artist-uuid-B', status: 'Returned', items: [] },
  ]);
  assert("Mixed Delivered and Returned rolls up to 'Delivered' (not 'Processing')", statusMixedDeliveredReturned === 'Delivered');

  // All Dispatched
  const statusAllDispatched = calculateOrderRollupStatus([
    { id: 's1', orderId: mockOrder.id, artistId: 'artist-uuid-A', status: 'Dispatched', items: [] },
    { id: 's2', orderId: mockOrder.id, artistId: 'artist-uuid-B', status: 'In Transit', items: [] },
  ]);
  assert("All shipments Dispatched / In Transit rolls up to 'Shipped'", statusAllDispatched === 'Shipped');

  // Partially Processing
  const statusPartialProcessing = calculateOrderRollupStatus([
    { id: 's1', orderId: mockOrder.id, artistId: 'artist-uuid-A', status: 'Dispatched', items: [] },
    { id: 's2', orderId: mockOrder.id, artistId: 'artist-uuid-B', status: 'Processing', items: [] },
  ]);
  assert("Partial shipment still Processing keeps order at 'Processing'", statusPartialProcessing === 'Processing');

  // -------------------------------------------------------------------------
  // SECTION 7: Scoped Artist Fulfillment Data Isolation (F-13)
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Scoped Artist Fulfillment Privacy (F-13) ---');

  const scopedDataArtistA = getScopedArtistFulfillmentData({
    order: mockOrder,
    orderItems,
    shipments: [
      { id: 's1', orderId: mockOrder.id, artistId: 'artist-uuid-A', status: 'Dispatched', items: [] },
      { id: 's2', orderId: mockOrder.id, artistId: 'artist-uuid-B', status: 'Processing', items: [] },
    ],
    artistId: 'artist-uuid-A',
  });

  assert('Artist A receives customer delivery address and phone', 
    Boolean(scopedDataArtistA?.customerAddress && scopedDataArtistA?.customerPhone)
  );
  assert('Artist A data contains only Artist A line items (length = 1)', 
    scopedDataArtistA?.items.length === 1 && scopedDataArtistA?.items[0].artworkTitle === 'Golden Heritage'
  );
  assert('Artist A data completely excludes Artist B line items', 
    !scopedDataArtistA?.items.some((it) => it.artworkTitle === 'Kathakali Reverie')
  );
  assert('Artist A data contains only Artist A shipments', 
    scopedDataArtistA?.shipments.length === 1 && scopedDataArtistA?.shipments[0].id === 's1'
  );

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(` SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log(` RESULT: ${passed === total ? 'ALL IN-MEMORY STATIC TESTS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
  console.log('===============================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runV4RemediationUnitTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
