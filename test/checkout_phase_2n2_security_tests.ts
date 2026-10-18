/**
 * KALA SETU — PHASE 2N.2 CRITICAL CHECKOUT SECURITY REGRESSION TESTS
 * 
 * STRICT DIRECTIVE:
 * - Pure In-Memory Static Logic Verification (Zero Remote DB, Zero Network).
 * - Clearly Labeled: This test suite simulates the PostgreSQL PL/pgSQL algorithms
 *   and Next.js route controllers in TypeScript; it does NOT substitute for
 *   live PostgreSQL RLS, engine concurrency execution, or live payment gateways.
 * 
 * Test Groups:
 * 1. Direct Authenticated RPC Invocation & Role Contract (Fix Finding-01)
 * 2. Anonymous & Cross-User Rejection Boundaries (Fix Finding-01)
 * 3. Trusted Service-Role & Superuser Execution (Fix Finding-01)
 * 4. SQL Multiset Line-Item Integrity & Price Discrepancies (Fix Finding-02)
 * 5. Duplicate Cart Lines Multiset 1-to-1 Matching (Fix Finding-02)
 * 6. Concurrent Duplicate-Key Race Conflict Validation (Fix Finding-02)
 * 7. Ambiguous Post-Commit Route Recovery Multiset Validation (Fix Finding-03)
 */

import * as crypto from 'crypto';

// =============================================================================
// 1. IN-MEMORY SIMULATOR FOR PHASE 2N.2 SQL ALGORITHM
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

export interface RpcOrderItemInput {
  artwork_id: string | null;
  artist_id: string | null;
  quantity: number;
  price_at_purchase: number;
  artwork_title: string;
  artwork_image: string | null;
}

export class Phase2N2DatabaseSimulator {
  orders: MockOrder[] = [];
  orderItems: MockOrderItem[] = [];

  reset() {
    this.orders = [];
    this.orderItems = [];
  }

  /**
   * Helper simulating PostgreSQL grouped multiset equality check:
   * FULL OUTER JOIN ON (artwork_id IS NOT DISTINCT FROM, title, quantity, price)
   * WHERE exp.item_count IS DISTINCT FROM act.item_count
   */
  hasLineItemMultisetConflict(
    existingOrderId: string,
    expectedItems: RpcOrderItemInput[]
  ): boolean {
    const existing = this.orderItems.filter((oi) => oi.order_id === existingOrderId);

    // Group expected items
    const expMap = new Map<string, number>();
    for (const it of expectedItems) {
      const key = `${it.artwork_id || 'null'}|${it.artwork_title}|${it.quantity}|${it.price_at_purchase}`;
      expMap.set(key, (expMap.get(key) || 0) + 1);
    }

    // Group actual persisted items
    const actMap = new Map<string, number>();
    for (const it of existing) {
      const key = `${it.artwork_id || 'null'}|${it.artwork_title}|${it.quantity}|${it.price_at_purchase}`;
      actMap.set(key, (actMap.get(key) || 0) + 1);
    }

    // Full outer join comparison
    const allKeys = new Set([...expMap.keys(), ...actMap.keys()]);
    for (const key of allKeys) {
      const expCount = expMap.get(key) || 0;
      const actCount = actMap.get(key) || 0;
      if (expCount !== actCount) {
        return true; // Conflict found!
      }
    }

    return false;
  }

  /**
   * Simulates public.create_checkout_order_atomic in proposed_marketplace_evolution_v7_phase_2n2_remediated.sql
   */
  createCheckoutOrderAtomic(params: {
    jwtRole: 'service_role' | 'authenticated' | 'anon' | '';
    sessionUser: 'postgres' | 'supabase_admin' | 'authenticator';
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
    orderItems: RpcOrderItemInput[];
  }): {
    success: boolean;
    orderId?: string;
    orderRef?: string;
    total?: number;
    paymentId?: string;
    alreadyProcessed?: boolean;
    error?: string;
    code?: string;
  } {
    // 1. Phase 2N.2 Hardened Authorization:
    // IF NOT (request.jwt.claim.role = 'service_role' OR session_user IN ('postgres', 'supabase_admin'))
    const isServiceRole = params.jwtRole === 'service_role';
    const isSuperuserSession = params.sessionUser === 'postgres' || params.sessionUser === 'supabase_admin';

    if (!isServiceRole && !isSuperuserSession) {
      return {
        success: false,
        error: 'Access denied: create_checkout_order_atomic is restricted to service_role',
        code: '42501',
      };
    }

    // 2. Input Boundary Validation
    if (!params.orderRef || params.orderRef.trim().length === 0) {
      return { success: false, error: 'Order reference is required', code: '22000' };
    }
    if (params.total <= 0) {
      return { success: false, error: 'Order total must be positive', code: '22000' };
    }
    if (!params.paymentId || params.paymentId.trim().length === 0) {
      return { success: false, error: 'Payment ID is required', code: '22000' };
    }
    if (!params.orderItems || params.orderItems.length === 0) {
      return { success: false, error: 'Order items must be a non-empty array', code: '22000' };
    }

    // 3. Idempotency Check: Existing order with payment_id or razorpay_payment_id
    const existing = this.orders.find(
      (o) =>
        o.payment_id === params.paymentId ||
        o.razorpay_payment_id === params.razorpayPaymentId ||
        o.order_ref === params.orderRef
    );

    if (existing) {
      // Verify ownership
      if (existing.user_id !== params.userId && !isSuperuserSession) {
        return {
          success: false,
          error: 'Access denied: payment reference is associated with another account',
          code: '42501',
        };
      }

      const existingItems = this.orderItems.filter((oi) => oi.order_id === existing.id);

      if (existingItems.length === 0) {
        // Backfill line items atomically
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
      } else {
        // Phase 2N.2 Multiset Equality Check (including prices and duplicate cart lines)
        const hasConflict = this.hasLineItemMultisetConflict(existing.id, params.orderItems);
        if (hasConflict) {
          return {
            success: false,
            error: 'Order line item conflict: existing order items do not match verified payment cart',
            code: '22000',
          };
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

    // 4. Atomic Insertion of Order & Order Items
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
      if (item.quantity <= 0) {
        return { success: false, error: 'Line item quantity must be positive', code: '22000' };
      }

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

  /**
   * Simulates the unique_violation exception handler in create_checkout_order_atomic
   */
  handleUniqueViolationRace(params: {
    userId: string;
    paymentId: string;
    expectedItems: RpcOrderItemInput[];
  }): {
    success: boolean;
    alreadyProcessed?: boolean;
    error?: string;
    code?: string;
  } {
    const existing = this.orders.find((o) => o.payment_id === params.paymentId);
    if (!existing) {
      return { success: false, error: 'unique_violation occurred but order not found', code: '23505' };
    }

    if (existing.user_id !== params.userId) {
      return { success: false, error: 'Access denied: payment reference is associated with another account', code: '42501' };
    }

    const existingItems = this.orderItems.filter((oi) => oi.order_id === existing.id);

    if (existingItems.length === 0) {
      // Backfill atomically
      for (const item of params.expectedItems) {
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
    } else {
      // Phase 2N.2 Symmetrical Multiset Check in unique_violation handler
      const hasConflict = this.hasLineItemMultisetConflict(existing.id, params.expectedItems);
      if (hasConflict) {
        return {
          success: false,
          error: 'Order line item conflict: concurrent order items do not match verified payment cart',
          code: '22000',
        };
      }
    }

    return { success: true, alreadyProcessed: true };
  }
}

// =============================================================================
// 2. IN-MEMORY SIMULATOR FOR REMEDIATED APPLICATION HANDLER
// =============================================================================

export interface NormalizedItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

export class Phase2N2RouteSimulator {
  db: Phase2N2DatabaseSimulator;
  simulateNetworkDrop = false;
  simulateDbQueryError = false;
  simulateCorruptCommittedItems = false;

  constructor(db: Phase2N2DatabaseSimulator) {
    this.db = db;
  }

  validateLineItemMultiset(
    existingItems: Array<{
      artwork_id?: string | null;
      artwork_title?: string | null;
      quantity?: number | null;
      price_at_purchase?: number | string | null;
    }>,
    expectedItems: NormalizedItem[]
  ): boolean {
    if (existingItems.length !== expectedItems.length) {
      return false;
    }

    const availableIndices = new Set(existingItems.keys());

    for (const exp of expectedItems) {
      let matchedIndex: number | null = null;

      for (const idx of availableIndices) {
        const act = existingItems[idx];
        const titleMatches = act.artwork_title === exp.title;
        const qtyMatches = act.quantity === exp.quantity;
        const priceMatches = Number(act.price_at_purchase) === exp.price;

        const isExpectedUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exp.id);
        const idMatches = isExpectedUuid ? act.artwork_id === exp.id : true;

        if (titleMatches && qtyMatches && priceMatches && idMatches) {
          matchedIndex = idx;
          break;
        }
      }

      if (matchedIndex === null) {
        return false;
      }

      availableIndices.delete(matchedIndex);
    }

    return availableIndices.size === 0;
  }

  async handleVerifyPayment(params: {
    authenticatedUserId: string;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    normalizedItems: NormalizedItem[];
    customer: { name: string; phone: string; address: string };
  }): Promise<{ status: number; body: Record<string, unknown> }> {
    const calculatedTotal = params.normalizedItems.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0
    );

    // Step 12: Existing Order Idempotency Check
    const existingOrder = this.db.orders.find(
      (o) => o.payment_id === params.razorpayPaymentId || o.razorpay_payment_id === params.razorpayPaymentId
    );

    if (existingOrder) {
      if (existingOrder.user_id !== params.authenticatedUserId) {
        return {
          status: 403,
          body: { error: 'Access denied: payment reference is associated with another account' },
        };
      }

      const existingItems = this.db.orderItems.filter((oi) => oi.order_id === existingOrder.id);

      if (existingItems.length > 0) {
        const isMatch = this.validateLineItemMultiset(existingItems, params.normalizedItems);

        if (!isMatch) {
          return {
            status: 409,
            body: {
              error: 'Existing order has conflicting or incomplete line items. Manual reconciliation required.',
              paymentId: params.razorpayPaymentId,
              requiresSupport: true,
            },
          };
        }

        return {
          status: 200,
          body: {
            success: true,
            orderId: existingOrder.order_ref,
            total: existingOrder.total,
            paymentId: params.razorpayPaymentId,
            alreadyProcessed: true,
          },
        };
      }
    }

    // Step 13: Service-Role Atomic RPC Call
    const orderRef = `KS${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
    const rpcOrderItems: RpcOrderItemInput[] = params.normalizedItems.map((it) => ({
      artwork_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(it.id) ? it.id : null,
      artist_id: null,
      quantity: it.quantity,
      price_at_purchase: it.price,
      artwork_title: it.title,
      artwork_image: it.image,
    }));

    const rpcResult = this.db.createCheckoutOrderAtomic({
      jwtRole: 'service_role',
      sessionUser: 'authenticator',
      userId: params.authenticatedUserId,
      orderRef,
      total: calculatedTotal,
      paymentId: params.razorpayPaymentId,
      razorpayOrderId: params.razorpayOrderId,
      razorpayPaymentId: params.razorpayPaymentId,
      customerName: params.customer.name,
      customerPhone: params.customer.phone,
      customerAddress: params.customer.address,
      itemsJson: params.normalizedItems,
      orderItems: rpcOrderItems,
    });

    if (this.simulateNetworkDrop) {
      if (this.simulateDbQueryError) {
        return {
          status: 500,
          body: {
            success: false,
            error: `Your payment was completed (Reference ID: ${params.razorpayPaymentId}), but database recovery query failed.`,
            paymentId: params.razorpayPaymentId,
            requiresSupport: true,
          },
        };
      }

      if (this.simulateCorruptCommittedItems) {
        const ord = this.db.orders.find((o) => o.payment_id === params.razorpayPaymentId);
        if (ord) {
          const oi = this.db.orderItems.find((it) => it.order_id === ord.id);
          if (oi) {
            oi.artwork_title = 'Corrupted In-Flight Title in DB';
          }
        }
      }

      // Recovery path checks committed state and validates line-item multiset
      const committedOrder = this.db.orders.find((o) => o.payment_id === params.razorpayPaymentId);
      if (committedOrder) {
        if (committedOrder.user_id !== params.authenticatedUserId) {
          return {
            status: 403,
            body: { error: 'Access denied: payment reference is associated with another account' },
          };
        }

        const commItems = this.db.orderItems.filter((oi) => oi.order_id === committedOrder.id);
        const isMatch = this.validateLineItemMultiset(commItems, params.normalizedItems);

        if (isMatch) {
          return {
            status: 200,
            body: {
              success: true,
              orderId: committedOrder.order_ref,
              total: committedOrder.total,
              paymentId: params.razorpayPaymentId,
              alreadyProcessed: true,
            },
          };
        } else {
          return {
            status: 409,
            body: {
              error: 'Your payment was processed, but the saved order items conflict with your cart. Support assistance is required.',
              paymentId: params.razorpayPaymentId,
              requiresSupport: true,
            },
          };
        }
      }

      return {
        status: 500,
        body: {
          success: false,
          error: `Your payment was completed, but database persistence could not be confirmed.`,
          paymentId: params.razorpayPaymentId,
          requiresSupport: true,
        },
      };
    }

    if (!rpcResult.success) {
      return {
        status: rpcResult.code === '42501' ? 403 : rpcResult.code === '22000' ? 409 : 500,
        body: { error: rpcResult.error, requiresSupport: true },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        orderId: rpcResult.orderRef,
        total: calculatedTotal,
        paymentId: params.razorpayPaymentId,
        alreadyProcessed: Boolean(rpcResult.alreadyProcessed),
      },
    };
  }
}

// =============================================================================
// 3. TEST RUNNER
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

export async function runAllPhase2N2Tests() {
  console.log('================================================================');
  console.log('KALA SETU PHASE 2N.2 — CRITICAL CHECKOUT SECURITY REGRESSION TESTS');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // TEST GROUP 1: Direct Authenticated RPC Invocation & Role Contract (Fix Finding-01)
  // ---------------------------------------------------------------------------
  console.log('Test Group 1: Direct Authenticated RPC Rejection (Fix Finding-01)');
  {
    const db = new Phase2N2DatabaseSimulator();

    // Case 1A: Ordinary authenticated buyer attempts direct RPC execution with matching userId
    // Under Phase 2N.2: jwtRole is 'authenticated', not 'service_role' -> MUST BE REJECTED!
    const buyerDirectCall = db.createCheckoutOrderAtomic({
      jwtRole: 'authenticated',
      sessionUser: 'authenticator',
      userId: 'user_attacker_buyer',
      orderRef: 'KS_FRAUD_001',
      total: 50000,
      paymentId: 'pay_fraud_001',
      razorpayOrderId: 'order_fraud_001',
      razorpayPaymentId: 'pay_fraud_001',
      customerName: 'Attacker',
      customerPhone: '+91 99999 11111',
      customerAddress: 'Direct PostgREST Caller',
      itemsJson: [],
      orderItems: [
        {
          artwork_id: null,
          artist_id: null,
          quantity: 1,
          price_at_purchase: 50000,
          artwork_title: 'Golden Heritage',
          artwork_image: null,
        },
      ],
    });

    assert(!buyerDirectCall.success, 'Direct authenticated user execution is strictly REJECTED (Finding-01 resolved)');
    assert(buyerDirectCall.code === '42501', 'Direct authenticated user receives 42501 Access Denied exception');
    assert(
      Boolean(buyerDirectCall.error?.includes('restricted to service_role')),
      'Exception explicitly communicates service_role restriction'
    );
    assert(db.orders.length === 0, 'Zero fraudulent orders created in database');
    assert(db.orderItems.length === 0, 'Zero fraudulent order items created in database');
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 2: Anonymous & Cross-User Rejection Boundaries
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 2: Anonymous & Cross-User Invocation Rejection');
  {
    const db = new Phase2N2DatabaseSimulator();

    // Case 2A: Anonymous caller
    const anonCall = db.createCheckoutOrderAtomic({
      jwtRole: 'anon',
      sessionUser: 'authenticator',
      userId: 'user_victim_1',
      orderRef: 'KS_ANON_001',
      total: 10000,
      paymentId: 'pay_anon_001',
      razorpayOrderId: 'order_anon_001',
      razorpayPaymentId: 'pay_anon_001',
      customerName: 'Anon',
      customerPhone: '+91 99999 00000',
      customerAddress: 'Nowhere',
      itemsJson: [],
      orderItems: [
        {
          artwork_id: null,
          artist_id: null,
          quantity: 1,
          price_at_purchase: 10000,
          artwork_title: 'Warli Art',
          artwork_image: null,
        },
      ],
    });

    assert(!anonCall.success, 'Anonymous caller is strictly REJECTED');
    assert(anonCall.code === '42501', 'Anonymous caller receives 42501');

    // Case 2B: Empty role string
    const emptyRoleCall = db.createCheckoutOrderAtomic({
      jwtRole: '',
      sessionUser: 'authenticator',
      userId: 'user_victim_1',
      orderRef: 'KS_EMPTY_001',
      total: 10000,
      paymentId: 'pay_empty_001',
      razorpayOrderId: 'order_empty_001',
      razorpayPaymentId: 'pay_empty_001',
      customerName: 'Empty',
      customerPhone: '+91 99999 00000',
      customerAddress: 'Nowhere',
      itemsJson: [],
      orderItems: [
        {
          artwork_id: null,
          artist_id: null,
          quantity: 1,
          price_at_purchase: 10000,
          artwork_title: 'Warli Art',
          artwork_image: null,
        },
      ],
    });

    assert(!emptyRoleCall.success, 'Empty role caller is strictly REJECTED');
    assert(emptyRoleCall.code === '42501', 'Empty role caller receives 42501');
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 3: Trusted Service-Role & Superuser Invocations
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 3: Trusted Service-Role & Superuser Execution');
  {
    const db = new Phase2N2DatabaseSimulator();

    // Case 3A: Next.js backend service-role invocation (SUPABASE_SERVICE_ROLE_KEY)
    const serviceRoleCall = db.createCheckoutOrderAtomic({
      jwtRole: 'service_role',
      sessionUser: 'authenticator',
      userId: 'user_legit_buyer_1',
      orderRef: 'KS_SR_LEGIT_001',
      total: 25000,
      paymentId: 'pay_sr_legit_001',
      razorpayOrderId: 'order_sr_legit_001',
      razorpayPaymentId: 'pay_sr_legit_001',
      customerName: 'Meera Sharma',
      customerPhone: '+91 98765 11111',
      customerAddress: 'Jaipur, India',
      itemsJson: [],
      orderItems: [
        {
          artwork_id: null,
          artist_id: null,
          quantity: 1,
          price_at_purchase: 25000,
          artwork_title: 'Pichwai Cow Study',
          artwork_image: null,
        },
      ],
    });

    assert(serviceRoleCall.success, 'Trusted service-role call from backend payment verifier SUCCEEDS');
    assert(serviceRoleCall.alreadyProcessed === false, 'Fresh order marked as alreadyProcessed: false');
    assert(db.orders.length === 1, 'Legitimate order row persisted');
    assert(db.orderItems.length === 1, 'Legitimate order item row persisted');

    // Case 3B: Superuser session (psql / migration / postgres)
    const superuserCall = db.createCheckoutOrderAtomic({
      jwtRole: '',
      sessionUser: 'postgres',
      userId: 'user_legit_buyer_2',
      orderRef: 'KS_PG_002',
      total: 18000,
      paymentId: 'pay_pg_002',
      razorpayOrderId: 'order_pg_002',
      razorpayPaymentId: 'pay_pg_002',
      customerName: 'Dev Caller',
      customerPhone: '+91 98765 22222',
      customerAddress: 'Admin Studio',
      itemsJson: [],
      orderItems: [
        {
          artwork_id: null,
          artist_id: null,
          quantity: 1,
          price_at_purchase: 18000,
          artwork_title: 'Tanjore Painting',
          artwork_image: null,
        },
      ],
    });

    assert(superuserCall.success, 'Superuser session (postgres) SUCCEEDS');
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 4: SQL Multiset Line-Item Integrity & Price Discrepancies (Fix Finding-02)
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 4: SQL Multiset Line-Item Integrity & Price Mismatch Detection');
  {
    const db = new Phase2N2DatabaseSimulator();

    // Create an initial order with price 15,000
    const initialCall = db.createCheckoutOrderAtomic({
      jwtRole: 'service_role',
      sessionUser: 'authenticator',
      userId: 'user_buyer_price_test',
      orderRef: 'KS_PRICE_001',
      total: 15000,
      paymentId: 'pay_price_001',
      razorpayOrderId: 'order_price_001',
      razorpayPaymentId: 'pay_price_001',
      customerName: 'Buyer',
      customerPhone: '+91 98765 33333',
      customerAddress: 'Bengaluru',
      itemsJson: [],
      orderItems: [
        {
          artwork_id: '11111111-1111-4111-8111-111111111111',
          artist_id: null,
          quantity: 1,
          price_at_purchase: 15000,
          artwork_title: 'Gond Wilderness',
          artwork_image: null,
        },
      ],
    });
    assert(initialCall.success, 'Initial order persists successfully');

    // Case 4A: Exact matching retry -> SUCCEEDS
    const exactRetry = db.createCheckoutOrderAtomic({
      jwtRole: 'service_role',
      sessionUser: 'authenticator',
      userId: 'user_buyer_price_test',
      orderRef: 'KS_PRICE_001',
      total: 15000,
      paymentId: 'pay_price_001',
      razorpayOrderId: 'order_price_001',
      razorpayPaymentId: 'pay_price_001',
      customerName: 'Buyer',
      customerPhone: '+91 98765 33333',
      customerAddress: 'Bengaluru',
      itemsJson: [],
      orderItems: [
        {
          artwork_id: '11111111-1111-4111-8111-111111111111',
          artist_id: null,
          quantity: 1,
          price_at_purchase: 15000,
          artwork_title: 'Gond Wilderness',
          artwork_image: null,
        },
      ],
    });
    assert(exactRetry.success, 'Exact matching retry returns success');
    assert(exactRetry.alreadyProcessed === true, 'Retry marked as alreadyProcessed: true');

    // Case 4B: Price discrepancy retry (e.g. price altered to 100) -> MUST BE REJECTED!
    const priceTamperedRetry = db.createCheckoutOrderAtomic({
      jwtRole: 'service_role',
      sessionUser: 'authenticator',
      userId: 'user_buyer_price_test',
      orderRef: 'KS_PRICE_001',
      total: 15000,
      paymentId: 'pay_price_001',
      razorpayOrderId: 'order_price_001',
      razorpayPaymentId: 'pay_price_001',
      customerName: 'Buyer',
      customerPhone: '+91 98765 33333',
      customerAddress: 'Bengaluru',
      itemsJson: [],
      orderItems: [
        {
          artwork_id: '11111111-1111-4111-8111-111111111111',
          artist_id: null,
          quantity: 1,
          price_at_purchase: 100, // Discrepancy!
          artwork_title: 'Gond Wilderness',
          artwork_image: null,
        },
      ],
    });
    assert(!priceTamperedRetry.success, 'Retry with price discrepancy is strictly REJECTED (Finding-02 resolved)');
    assert(priceTamperedRetry.code === '22000', 'Price discrepancy raises PostgreSQL 22000 exception');
    assert(
      Boolean(priceTamperedRetry.error?.includes('Order line item conflict')),
      'Error message communicates line item conflict'
    );
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 5: Duplicate Cart Lines Multiset 1-to-1 Matching (Fix Finding-02)
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 5: Duplicate Cart Lines Multiset 1-to-1 Matching');
  {
    const db = new Phase2N2DatabaseSimulator();
    const app = new Phase2N2RouteSimulator(db);

    // Persist an order with [ItemA, ItemB]
    const initialOrder: MockOrder = {
      id: 'ord_multiset_1',
      order_ref: 'KS_MULTI_001',
      user_id: 'user_collector_multi',
      total: 30000,
      payment_id: 'pay_multi_001',
      razorpay_order_id: 'order_multi_001',
      razorpay_payment_id: 'pay_multi_001',
      status: 'Pending',
      payment_status: 'paid',
      customer_name: 'Collector',
      customer_phone: '+91 98765 44444',
      customer_address: 'Delhi',
      items: [],
    };
    db.orders.push(initialOrder);

    db.orderItems.push({
      id: 'oi_1',
      order_id: initialOrder.id,
      artwork_id: '11111111-1111-4111-8111-111111111111',
      artist_id: null,
      quantity: 1,
      price_at_purchase: 15000,
      artwork_title: 'Madhubani Peacocks',
      artwork_image: null,
    });
    db.orderItems.push({
      id: 'oi_2',
      order_id: initialOrder.id,
      artwork_id: '22222222-2222-4222-8222-222222222222',
      artist_id: null,
      quantity: 1,
      price_at_purchase: 15000,
      artwork_title: 'Warli Village Dance',
      artwork_image: null,
    });

    // Case 5A: Client retries with [ItemA, ItemA] (two peacocks, total length = 2)
    // Under naive .find(), ItemA matches twice and falsely passes!
    // Under Phase 2N.2 multiset tracking, ItemB is missing -> MUST BE REJECTED!
    const duplicateCartRetry = await app.handleVerifyPayment({
      authenticatedUserId: 'user_collector_multi',
      razorpayPaymentId: 'pay_multi_001',
      razorpayOrderId: 'order_multi_001',
      normalizedItems: [
        { id: '11111111-1111-4111-8111-111111111111', title: 'Madhubani Peacocks', price: 15000, quantity: 1, image: '' },
        { id: '11111111-1111-4111-8111-111111111111', title: 'Madhubani Peacocks', price: 15000, quantity: 1, image: '' },
      ],
      customer: { name: 'Collector', phone: '+91 98765 44444', address: 'Delhi' },
    });

    assert(duplicateCartRetry.status === 409, 'Duplicate cart line mismatch is REJECTED with HTTP 409 Conflict');
    assert(duplicateCartRetry.body.requiresSupport === true, 'Requires support flag is set on multiset mismatch');

    // Case 5B: Client retries with exact matching [ItemA, ItemB] -> SUCCEEDS
    const exactMultisetRetry = await app.handleVerifyPayment({
      authenticatedUserId: 'user_collector_multi',
      razorpayPaymentId: 'pay_multi_001',
      razorpayOrderId: 'order_multi_001',
      normalizedItems: [
        { id: '11111111-1111-4111-8111-111111111111', title: 'Madhubani Peacocks', price: 15000, quantity: 1, image: '' },
        { id: '22222222-2222-4222-8222-222222222222', title: 'Warli Village Dance', price: 15000, quantity: 1, image: '' },
      ],
      customer: { name: 'Collector', phone: '+91 98765 44444', address: 'Delhi' },
    });

    assert(exactMultisetRetry.status === 200, 'Exact 1-to-1 multiset retry returns HTTP 200');
    assert(exactMultisetRetry.body.alreadyProcessed === true, 'Exact multiset retry marked as alreadyProcessed');
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 6: Concurrent Duplicate-Key Race Conflict Validation (Fix Finding-02)
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 6: Concurrent Duplicate-Key Race Conflict Validation');
  {
    const db = new Phase2N2DatabaseSimulator();

    // Thread 1 successfully creates an order
    const t1Call = db.createCheckoutOrderAtomic({
      jwtRole: 'service_role',
      sessionUser: 'authenticator',
      userId: 'user_race_1',
      orderRef: 'KS_RACE_001',
      total: 40000,
      paymentId: 'pay_race_001',
      razorpayOrderId: 'order_race_001',
      razorpayPaymentId: 'pay_race_001',
      customerName: 'Racer',
      customerPhone: '+91 98765 55555',
      customerAddress: 'Mumbai',
      itemsJson: [],
      orderItems: [
        {
          artwork_id: '33333333-3333-4333-8333-333333333333',
          artist_id: null,
          quantity: 1,
          price_at_purchase: 40000,
          artwork_title: 'Tanjore Balaji',
          artwork_image: null,
        },
      ],
    });
    assert(t1Call.success, 'Thread 1 order creation succeeds');

    // Thread 2 encounters unique_violation with IDENTICAL payload -> SUCCEEDS
    const t2Identical = db.handleUniqueViolationRace({
      userId: 'user_race_1',
      paymentId: 'pay_race_001',
      expectedItems: [
        {
          artwork_id: '33333333-3333-4333-8333-333333333333',
          artist_id: null,
          quantity: 1,
          price_at_purchase: 40000,
          artwork_title: 'Tanjore Balaji',
          artwork_image: null,
        },
      ],
    });
    assert(t2Identical.success, 'Thread 2 with identical payload caught in unique_violation SUCCEEDS');
    assert(t2Identical.alreadyProcessed === true, 'Thread 2 returns alreadyProcessed: true');

    // Thread 3 encounters unique_violation with CONFLICTING price (e.g. 10000 instead of 40000)
    // Under Phase 2N.2: MUST BE REJECTED with 22000!
    const t3Conflicting = db.handleUniqueViolationRace({
      userId: 'user_race_1',
      paymentId: 'pay_race_001',
      expectedItems: [
        {
          artwork_id: '33333333-3333-4333-8333-333333333333',
          artist_id: null,
          quantity: 1,
          price_at_purchase: 10000, // Conflict!
          artwork_title: 'Tanjore Balaji',
          artwork_image: null,
        },
      ],
    });
    assert(!t3Conflicting.success, 'Thread 3 with conflicting payload caught in unique_violation is REJECTED');
    assert(t3Conflicting.code === '22000', 'Conflicting concurrent payload raises 22000 exception');
    assert(
      Boolean(t3Conflicting.error?.includes('concurrent order items do not match')),
      'Error message clarifies concurrent order conflict'
    );
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 7: Ambiguous Post-Commit Route Recovery Multiset Validation (Fix Finding-03)
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 7: Ambiguous Post-Commit Route Recovery Multiset Validation');
  {
    const db = new Phase2N2DatabaseSimulator();
    const app = new Phase2N2RouteSimulator(db);

    // Case 7A: RPC network drop, but DB committed exact order -> Recovered to HTTP 200
    app.simulateNetworkDrop = true;
    app.simulateDbQueryError = false;

    const recoveredOk = await app.handleVerifyPayment({
      authenticatedUserId: 'user_net_ok',
      razorpayPaymentId: 'pay_net_ok_001',
      razorpayOrderId: 'order_net_ok_001',
      normalizedItems: [
        { id: 'art_net_1', title: 'Pattachitra Scroll', price: 20000, quantity: 1, image: '' },
      ],
      customer: { name: 'Net Buyer', phone: '+91 98765 66666', address: 'Bhubaneswar' },
    });

    assert(recoveredOk.status === 200, 'Ambiguous post-commit recovery with exact multiset resolves to HTTP 200');
    assert(recoveredOk.body.alreadyProcessed === true, 'Recovered order marked alreadyProcessed: true');

    // Case 7B: RPC network drop, but DB committed order with CONFLICTING items (e.g. wrong artwork in DB)
    app.simulateNetworkDrop = true;
    app.simulateDbQueryError = false;
    app.simulateCorruptCommittedItems = true;

    const recoveryConflict = await app.handleVerifyPayment({
      authenticatedUserId: 'user_net_conf',
      razorpayPaymentId: 'pay_net_conf_001',
      razorpayOrderId: 'order_net_conf_001',
      normalizedItems: [
        { id: 'art_expected_1', title: 'Expected Artwork Title', price: 20000, quantity: 1, image: '' },
      ],
      customer: { name: 'Conf Buyer', phone: '+91 98765 77777', address: 'Kolkata' },
    });

    assert(recoveryConflict.status === 409, 'Ambiguous post-commit recovery with conflicting items returns HTTP 409 Conflict');
    assert(recoveryConflict.body.requiresSupport === true, 'Conflict recovery flags requiresSupport: true');
    assert(
      Boolean((recoveryConflict.body.error as string)?.includes('conflict with your cart')),
      'Error message clarifies line-item conflict on recovery'
    );

    // Case 7C: Recovery when DB query errors out -> returns HTTP 500
    app.simulateDbQueryError = true;
    const recoveryDbError = await app.handleVerifyPayment({
      authenticatedUserId: 'user_net_err',
      razorpayPaymentId: 'pay_net_err_001',
      razorpayOrderId: 'order_net_err_001',
      normalizedItems: [
        { id: 'art_err_1', title: 'Any Title', price: 10000, quantity: 1, image: '' },
      ],
      customer: { name: 'Err Buyer', phone: '+91 98765 88888', address: 'Chennai' },
    });

    assert(recoveryDbError.status === 500, 'Recovery query failure returns HTTP 500');
    assert(recoveryDbError.body.requiresSupport === true, 'Database failure flags requiresSupport: true');
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PHASE 2N.2 TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllPhase2N2Tests();
