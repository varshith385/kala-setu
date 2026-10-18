-- ==============================================================================
-- KALA SETU — UNIFIED MARKETPLACE EVOLUTION & RECONCILIATION PROPOSAL
-- VERSION 7 PHASE 2P.2 UNIFIED (STAGING PREFLIGHT SPECIFICATION)
-- STATUS: UNEXECUTED PROPOSAL FOR ARCHITECTURAL AND STAGING REVIEW ONLY.
-- STRICT DIRECTIVE: DO NOT EXECUTE DIRECTLY WITHOUT EXPLICIT STAGING AUTHORIZATION.
-- ==============================================================================
-- File: supabase/migrations/proposed_marketplace_evolution_v7_phase_2p2_unified.sql
-- 
-- Phase 2P.2 Remediation & Integration Objectives:
-- 1. Bundles `resolve_reconciliation_order_atomic` (resolving Blocker 2P.1-01) with
--    harmonized search_path (`public, pg_catalog, pg_temp`), SECURITY DEFINER,
--    internal service_role role-guard, and least-privilege execution grants.
-- 2. Comprehensive Preflight Schema Assertions (resolving High 2P.1-01):
--    Explicitly asserts existence of every required base column across `orders`,
--    `order_items`, `artworks`, `artist_profiles`, and `profiles` before procedures install.
-- 3. Preserves all Phase 2N.3 verified checkout security remediations:
--    - Unconditional cross-user order reference rejection (lines 1045, 1202).
--    - NULL-safe multiset equality `IS NOT DISTINCT FROM` (lines 1110, 1263).
--    - Hardened top-level `service_role` role guard in `create_checkout_order_atomic`.
-- 4. Atomic single-transaction boundary (`BEGIN ... COMMIT`) for complete ACID safety.
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- 1. STRICT PRE-MIGRATION SAFETY & COMPATIBILITY ASSERTIONS
-- ==============================================================================
DO $$
DECLARE
  v_col_type text;
  v_order_count int;
  v_corrupt_count int;
  v_missing_cols text;
BEGIN
  -- 1.1 Verify base schema core tables exist
  IF to_regclass('public.orders') IS NULL OR to_regclass('public.order_items') IS NULL THEN
    RAISE EXCEPTION 'Pre-migration check failed: public.orders or public.order_items is missing.';
  END IF;

  IF to_regclass('public.artworks') IS NULL OR to_regclass('public.artist_profiles') IS NULL OR to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'Pre-migration check failed: public.artworks, public.artist_profiles, or public.profiles is missing.';
  END IF;

  -- 1.2 Verify critical base helper functions exist
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION 'Pre-migration check failed: public.is_admin() function is missing from base schema.';
  END IF;

  -- 1.3 Verify every required base table column exists before installing dependent RPCs
  SELECT string_agg(req.table_name || '.' || req.column_name, ', ')
  INTO v_missing_cols
  FROM (
    VALUES
      ('orders', 'id'),
      ('orders', 'user_id'),
      ('orders', 'order_ref'),
      ('orders', 'total'),
      ('orders', 'items'),
      ('orders', 'payment_id'),
      ('orders', 'status'),
      ('orders', 'payment_status'),
      ('orders', 'razorpay_order_id'),
      ('orders', 'razorpay_payment_id'),
      ('orders', 'customer_name'),
      ('orders', 'customer_phone'),
      ('orders', 'customer_address'),
      ('orders', 'created_at'),
      ('orders', 'updated_at'),
      ('order_items', 'id'),
      ('order_items', 'order_id'),
      ('order_items', 'artwork_id'),
      ('order_items', 'artist_id'),
      ('order_items', 'quantity'),
      ('order_items', 'price_at_purchase'),
      ('order_items', 'artwork_title'),
      ('order_items', 'artwork_image'),
      ('artworks', 'id'),
      ('artworks', 'artist_id'),
      ('artworks', 'title'),
      ('artworks', 'slug'),
      ('artworks', 'price'),
      ('artworks', 'availability'),
      ('artworks', 'status'),
      ('artist_profiles', 'user_id'),
      ('artist_profiles', 'display_name'),
      ('artist_profiles', 'verification_status'),
      ('profiles', 'id'),
      ('profiles', 'role'),
      ('profiles', 'name')
  ) AS req(table_name, column_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = req.table_name
      AND c.column_name = req.column_name
  );

  IF v_missing_cols IS NOT NULL AND length(v_missing_cols) > 0 THEN
    RAISE EXCEPTION 'Pre-migration check failed: Missing required base schema columns: %. Base migration (supabase/schema.sql) must be applied prior to evolution migration.', v_missing_cols;
  END IF;

  -- 1.4 Verify data integrity of existing orders without arbitrary row count thresholds
  SELECT count(*) INTO v_order_count FROM public.orders;
  RAISE NOTICE 'Pre-migration check: Detected % existing order(s) in public.orders.', v_order_count;

  -- Integrity Assertion: Ensure all existing orders have valid order references and non-negative totals
  SELECT count(*) INTO v_corrupt_count 
  FROM public.orders 
  WHERE order_ref IS NULL OR length(trim(order_ref)) = 0 OR total < 0;

  IF v_corrupt_count > 0 THEN
    RAISE EXCEPTION 'Pre-migration integrity failure: Found % corrupted order record(s) with missing order_ref or negative total.', v_corrupt_count;
  END IF;

  -- 1.5 Detect conflicting existing table column types across prototype entities
  -- artwork_reviews.artwork_id
  IF to_regclass('public.artwork_reviews') IS NOT NULL THEN
    SELECT data_type INTO v_col_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'artwork_reviews' AND column_name = 'artwork_id';
    IF v_col_type IS NOT NULL AND v_col_type != 'uuid' THEN
      RAISE EXCEPTION 'Incompatible existing schema: public.artwork_reviews.artwork_id is %, expected uuid.', v_col_type;
    END IF;
  END IF;

  -- collector_collection_items.artwork_id
  IF to_regclass('public.collector_collection_items') IS NOT NULL THEN
    SELECT data_type INTO v_col_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'collector_collection_items' AND column_name = 'artwork_id';
    IF v_col_type IS NOT NULL AND v_col_type != 'uuid' THEN
      RAISE EXCEPTION 'Incompatible existing schema: public.collector_collection_items.artwork_id is %, expected uuid.', v_col_type;
    END IF;
  END IF;

  -- artist_follows.artist_id
  IF to_regclass('public.artist_follows') IS NOT NULL THEN
    SELECT data_type INTO v_col_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'artist_follows' AND column_name = 'artist_id';
    IF v_col_type IS NOT NULL AND v_col_type != 'uuid' THEN
      RAISE EXCEPTION 'Incompatible existing schema: public.artist_follows.artist_id is %, expected uuid.', v_col_type;
    END IF;
  END IF;

  -- commission_requests.artist_id
  IF to_regclass('public.commission_requests') IS NOT NULL THEN
    SELECT data_type INTO v_col_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'commission_requests' AND column_name = 'artist_id';
    IF v_col_type IS NOT NULL AND v_col_type != 'uuid' THEN
      RAISE EXCEPTION 'Incompatible existing schema: public.commission_requests.artist_id is %, expected uuid.', v_col_type;
    END IF;
  END IF;
END $$;

-- ==============================================================================
-- 2. DEFENSIVE DDL FOR ENTITIES & MISSING COLUMNS
-- ==============================================================================

-- 2.1 Collector Collections
CREATE TABLE IF NOT EXISTS public.collector_collections ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY );
ALTER TABLE public.collector_collections ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.collector_collections ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.collector_collections ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.collector_collections ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT true;
ALTER TABLE public.collector_collections ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.collector_collections ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_collector_collections_user_id ON public.collector_collections(user_id);

-- 2.2 Collector Collection Items
CREATE TABLE IF NOT EXISTS public.collector_collection_items ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY );
ALTER TABLE public.collector_collection_items ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.collector_collections(id) ON DELETE CASCADE;
ALTER TABLE public.collector_collection_items ADD COLUMN IF NOT EXISTS artwork_id uuid REFERENCES public.artworks(id) ON DELETE CASCADE;
ALTER TABLE public.collector_collection_items ADD COLUMN IF NOT EXISTS added_at timestamp with time zone DEFAULT timezone('utc'::text, now());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collector_collection_items_unique' AND conrelid = 'public.collector_collection_items'::regclass) THEN
    ALTER TABLE public.collector_collection_items ADD CONSTRAINT collector_collection_items_unique UNIQUE (collection_id, artwork_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_collector_collection_items_collection_id ON public.collector_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collector_collection_items_artwork_id ON public.collector_collection_items(artwork_id);

-- 2.3 Artist Follows
CREATE TABLE IF NOT EXISTS public.artist_follows ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY );
ALTER TABLE public.artist_follows ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.artist_follows ADD COLUMN IF NOT EXISTS artist_id uuid REFERENCES public.artist_profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.artist_follows ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artist_follows_user_artist_unique' AND conrelid = 'public.artist_follows'::regclass) THEN
    ALTER TABLE public.artist_follows ADD CONSTRAINT artist_follows_user_artist_unique UNIQUE (user_id, artist_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artist_follows_no_self_follow' AND conrelid = 'public.artist_follows'::regclass) THEN
    ALTER TABLE public.artist_follows ADD CONSTRAINT artist_follows_no_self_follow CHECK (user_id != artist_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_artist_follows_user_id ON public.artist_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_follows_artist_id ON public.artist_follows(artist_id);

-- 2.4 Saved Searches
CREATE TABLE IF NOT EXISTS public.saved_searches ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY );
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS search_params jsonb;
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS notify_on_new boolean DEFAULT false;
ALTER TABLE public.saved_searches ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);

-- 2.5 Multi-Vendor Order Shipments
CREATE TABLE IF NOT EXISTS public.order_shipments ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY );
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS artist_id uuid REFERENCES public.artist_profiles(user_id) ON DELETE RESTRICT;
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS courier_name text;
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS tracking_url text;
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS status text DEFAULT 'Processing';
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS dispatched_at timestamp with time zone;
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS request_hash text;
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.order_shipments ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_shipments_status_check' AND conrelid = 'public.order_shipments'::regclass) THEN
    ALTER TABLE public.order_shipments ADD CONSTRAINT order_shipments_status_check CHECK (
      status IN ('Processing', 'Dispatched', 'In Transit', 'Out for Delivery', 'Delivered', 'Returned', 'Cancelled')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_shipments_idempotency_unique' AND conrelid = 'public.order_shipments'::regclass) THEN
    ALTER TABLE public.order_shipments ADD CONSTRAINT order_shipments_idempotency_unique UNIQUE (order_id, artist_id, idempotency_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_shipments_order_id ON public.order_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_shipments_artist_id ON public.order_shipments(artist_id);
CREATE INDEX IF NOT EXISTS idx_order_shipments_status ON public.order_shipments(status);

-- 2.6 Order Shipment Items
CREATE TABLE IF NOT EXISTS public.order_shipment_items ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY );
ALTER TABLE public.order_shipment_items ADD COLUMN IF NOT EXISTS shipment_id uuid REFERENCES public.order_shipments(id) ON DELETE CASCADE;
ALTER TABLE public.order_shipment_items ADD COLUMN IF NOT EXISTS order_item_id uuid REFERENCES public.order_items(id) ON DELETE CASCADE;
ALTER TABLE public.order_shipment_items ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_shipment_items_qty_check' AND conrelid = 'public.order_shipment_items'::regclass) THEN
    ALTER TABLE public.order_shipment_items ADD CONSTRAINT order_shipment_items_qty_check CHECK (quantity > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_shipment_items_unique' AND conrelid = 'public.order_shipment_items'::regclass) THEN
    ALTER TABLE public.order_shipment_items ADD CONSTRAINT order_shipment_items_unique UNIQUE (shipment_id, order_item_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_shipment_items_shipment_id ON public.order_shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_order_shipment_items_order_item_id ON public.order_shipment_items(order_item_id);

-- 2.7 Verified Artwork Reviews
CREATE TABLE IF NOT EXISTS public.artwork_reviews ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY );
ALTER TABLE public.artwork_reviews ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.artwork_reviews ADD COLUMN IF NOT EXISTS artwork_id uuid REFERENCES public.artworks(id) ON DELETE CASCADE;
ALTER TABLE public.artwork_reviews ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.artwork_reviews ADD COLUMN IF NOT EXISTS reviewer_name text;
ALTER TABLE public.artwork_reviews ADD COLUMN IF NOT EXISTS rating integer;
ALTER TABLE public.artwork_reviews ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.artwork_reviews ADD COLUMN IF NOT EXISTS comment text;
ALTER TABLE public.artwork_reviews ADD COLUMN IF NOT EXISTS verified_purchase boolean DEFAULT true;
ALTER TABLE public.artwork_reviews ADD COLUMN IF NOT EXISTS status text DEFAULT 'published';
ALTER TABLE public.artwork_reviews ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.artwork_reviews ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artwork_reviews_rating_check' AND conrelid = 'public.artwork_reviews'::regclass) THEN
    ALTER TABLE public.artwork_reviews ADD CONSTRAINT artwork_reviews_rating_check CHECK (rating >= 1 AND rating <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artwork_reviews_status_check' AND conrelid = 'public.artwork_reviews'::regclass) THEN
    ALTER TABLE public.artwork_reviews ADD CONSTRAINT artwork_reviews_status_check CHECK (status IN ('pending', 'published', 'flagged', 'hidden'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artwork_reviews_order_artwork_unique' AND conrelid = 'public.artwork_reviews'::regclass) THEN
    ALTER TABLE public.artwork_reviews ADD CONSTRAINT artwork_reviews_order_artwork_unique UNIQUE (order_id, artwork_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_artwork_reviews_artwork_id ON public.artwork_reviews(artwork_id);
CREATE INDEX IF NOT EXISTS idx_artwork_reviews_order_id ON public.artwork_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_artwork_reviews_user_id ON public.artwork_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_artwork_reviews_status ON public.artwork_reviews(status);

-- 2.8 Commission Enquiries & Workflow
CREATE TABLE IF NOT EXISTS public.commission_requests ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY );
ALTER TABLE public.commission_requests ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.commission_requests ADD COLUMN IF NOT EXISTS artist_id uuid REFERENCES public.artist_profiles(user_id) ON DELETE RESTRICT;
ALTER TABLE public.commission_requests ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.commission_requests ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE public.commission_requests ADD COLUMN IF NOT EXISTS client_phone text;
ALTER TABLE public.commission_requests ADD COLUMN IF NOT EXISTS preferred_medium text;
ALTER TABLE public.commission_requests ADD COLUMN IF NOT EXISTS desired_size text;
ALTER TABLE public.commission_requests ADD COLUMN IF NOT EXISTS budget_range text;
ALTER TABLE public.commission_requests ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.commission_requests ADD COLUMN IF NOT EXISTS status text DEFAULT 'submitted';
ALTER TABLE public.commission_requests ADD COLUMN IF NOT EXISTS artist_notes text;
ALTER TABLE public.commission_requests ADD COLUMN IF NOT EXISTS quoted_price numeric;
ALTER TABLE public.commission_requests ADD COLUMN IF NOT EXISTS estimated_completion_date date;
ALTER TABLE public.commission_requests ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.commission_requests ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commission_requests_status_check' AND conrelid = 'public.commission_requests'::regclass) THEN
    ALTER TABLE public.commission_requests ADD CONSTRAINT commission_requests_status_check CHECK (
      status IN ('submitted', 'under_review', 'accepted', 'in_progress', 'completed', 'declined')
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_commission_requests_artist_id ON public.commission_requests(artist_id);
CREATE INDEX IF NOT EXISTS idx_commission_requests_user_id ON public.commission_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_requests_status ON public.commission_requests(status);

-- ==============================================================================
-- 3. AUTHORITATIVE SECURITY DEFINER RPCS & STATE TRANSITIONS
-- ==============================================================================

-- 3.1 Concurrency-Safe Order Status Rollup RPC
CREATE OR REPLACE FUNCTION public.rollup_order_status_atomic(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_order_current_status TEXT;
  v_total_purchased_qty INT := 0;
  v_delivered_qty INT := 0;
  v_returned_qty INT := 0;
  v_in_transit_qty INT := 0;
  v_processing_qty INT := 0;
  v_active_allocated_qty INT := 0;
  v_unallocated_qty INT := 0;
BEGIN
  -- 1. Pessimistic lock on parent order (Tier 1 of global lock hierarchy)
  SELECT status INTO v_order_current_status
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 2. Aggregate total purchased quantity from relational order items
  SELECT COALESCE(SUM(quantity), 0) INTO v_total_purchased_qty
  FROM public.order_items
  WHERE order_id = p_order_id;

  -- 3. Aggregate item allocations across active (non-cancelled) shipments
  SELECT 
    COALESCE(SUM(osi.quantity) FILTER (WHERE os.status = 'Delivered'), 0),
    COALESCE(SUM(osi.quantity) FILTER (WHERE os.status = 'Returned'), 0),
    COALESCE(SUM(osi.quantity) FILTER (WHERE os.status IN ('Dispatched', 'In Transit', 'Out for Delivery')), 0),
    COALESCE(SUM(osi.quantity) FILTER (WHERE os.status = 'Processing'), 0)
  INTO v_delivered_qty, v_returned_qty, v_in_transit_qty, v_processing_qty
  FROM public.order_shipment_items osi
  JOIN public.order_shipments os ON os.id = osi.shipment_id
  WHERE os.order_id = p_order_id AND os.status != 'Cancelled';

  v_active_allocated_qty := v_delivered_qty + v_returned_qty + v_in_transit_qty + v_processing_qty;
  v_unallocated_qty := v_total_purchased_qty - v_active_allocated_qty;

  -- 4. Authoritative Rollup Calculation
  IF v_total_purchased_qty > 0 THEN
    IF v_returned_qty = v_total_purchased_qty THEN
      UPDATE public.orders SET status = 'Cancelled', updated_at = NOW() WHERE id = p_order_id;
    ELSIF v_active_allocated_qty = v_total_purchased_qty 
          AND (v_delivered_qty + v_returned_qty) = v_total_purchased_qty 
          AND v_delivered_qty > 0 THEN
      UPDATE public.orders SET status = 'Delivered', updated_at = NOW() WHERE id = p_order_id;
    ELSIF v_active_allocated_qty = v_total_purchased_qty 
          AND (v_in_transit_qty + v_delivered_qty + v_returned_qty) = v_total_purchased_qty 
          AND (v_in_transit_qty > 0 OR v_delivered_qty > 0) THEN
      UPDATE public.orders SET status = 'Shipped', updated_at = NOW() WHERE id = p_order_id;
    ELSE
      UPDATE public.orders SET status = 'Processing', updated_at = NOW() WHERE id = p_order_id;
    END IF;
  ELSE
    SELECT 
      COUNT(*) FILTER (WHERE status = 'Delivered'),
      COUNT(*) FILTER (WHERE status = 'Returned'),
      COUNT(*) FILTER (WHERE status IN ('Dispatched', 'In Transit', 'Out for Delivery')),
      COUNT(*) FILTER (WHERE status != 'Cancelled')
    INTO v_delivered_qty, v_returned_qty, v_in_transit_qty, v_active_allocated_qty
    FROM public.order_shipments
    WHERE order_id = p_order_id;

    IF v_active_allocated_qty > 0 THEN
      IF v_returned_qty = v_active_allocated_qty THEN
        UPDATE public.orders SET status = 'Cancelled', updated_at = NOW() WHERE id = p_order_id;
      ELSIF v_delivered_qty = v_active_allocated_qty THEN
        UPDATE public.orders SET status = 'Delivered', updated_at = NOW() WHERE id = p_order_id;
      ELSIF (v_in_transit_qty + v_delivered_qty) = v_active_allocated_qty THEN
        UPDATE public.orders SET status = 'Shipped', updated_at = NOW() WHERE id = p_order_id;
      ELSE
        UPDATE public.orders SET status = 'Processing', updated_at = NOW() WHERE id = p_order_id;
      END IF;
    END IF;
  END IF;
END;
$$;

-- 3.2 Atomic Shipment Creation with Global Lock Hierarchy & Deterministic Idempotency
CREATE OR REPLACE FUNCTION public.create_order_shipment_atomic(
  p_order_id UUID,
  p_artist_id UUID,
  p_courier_name TEXT,
  p_tracking_number TEXT,
  p_tracking_url TEXT,
  p_notes TEXT,
  p_items JSONB,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_shipment_id UUID;
  v_item RECORD;
  v_order_item RECORD;
  v_order RECORD;
  v_allocated_qty INT;
  v_req_qty INT;
  v_item_count INT;
  v_idempotency_key TEXT;
  v_request_hash TEXT;
  v_canonical_items TEXT;
  v_existing_shipment RECORD;
BEGIN
  -- 1. Caller Authorization: Assigned artist or platform admin only
  IF NOT public.is_admin() AND (auth.uid() IS NULL OR auth.uid() != p_artist_id) THEN
    RAISE EXCEPTION 'Unauthorized: Caller cannot create shipments for this artist' USING ERRCODE = '42501';
  END IF;

  -- 2. Payload Validation
  IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' THEN
    RAISE EXCEPTION 'Shipment items must be a non-null JSON array' USING ERRCODE = '22000';
  END IF;

  v_item_count := jsonb_array_length(p_items);
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Cannot create shipment with empty items array' USING ERRCODE = '22000';
  END IF;

  -- 3. Dispatch metadata validation
  IF p_courier_name IS NULL OR length(trim(p_courier_name)) < 2 THEN
    RAISE EXCEPTION 'Courier name must be at least 2 characters' USING ERRCODE = '22000';
  END IF;
  IF p_tracking_number IS NULL OR length(trim(p_tracking_number)) < 4 THEN
    RAISE EXCEPTION 'Tracking number must be at least 4 characters' USING ERRCODE = '22000';
  END IF;

  v_idempotency_key := nullif(trim(p_idempotency_key), '');

  -- 4. Canonical Native SHA-256 Request Hash Generation
  IF v_idempotency_key IS NOT NULL THEN
    SELECT string_agg(
      x.order_item_id::text || ':' || x.quantity::text,
      ',' ORDER BY x.order_item_id ASC
    )
    INTO v_canonical_items
    FROM jsonb_to_recordset(p_items) AS x(order_item_id UUID, quantity INT);

    v_request_hash := pg_catalog.encode(pg_catalog.sha256((
      p_order_id::text || '|' || 
      p_artist_id::text || '|' || 
      trim(p_courier_name) || '|' || 
      trim(p_tracking_number) || '|' || 
      COALESCE(trim(p_tracking_url), '') || '|' || 
      COALESCE(trim(p_notes), '') || '|' || 
      COALESCE(v_canonical_items, '')
    )::bytea), 'hex');

    SELECT id, status, request_hash INTO v_existing_shipment
    FROM public.order_shipments
    WHERE order_id = p_order_id AND artist_id = p_artist_id AND idempotency_key = v_idempotency_key;

    IF FOUND THEN
      IF v_existing_shipment.request_hash IS DISTINCT FROM v_request_hash THEN
        RAISE EXCEPTION 'Idempotency conflict: Key % was previously submitted with a different request payload', v_idempotency_key
          USING ERRCODE = '42P10';
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'shipment_id', v_existing_shipment.id,
        'status', v_existing_shipment.status,
        'idempotent_retry', true
      );
    END IF;
  END IF;

  -- 5. Tier 1 Lock: Parent order row-level lock
  SELECT id, status, payment_status INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order record not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_order.payment_status != 'paid' THEN
    RAISE EXCEPTION 'Cannot ship order: Payment status is % (expected paid)', v_order.payment_status USING ERRCODE = '22000';
  END IF;

  -- 6. Insert new shipment record in 'Dispatched' status (Tier 3)
  BEGIN
    INSERT INTO public.order_shipments (
      order_id, artist_id, courier_name, tracking_number, tracking_url, notes, status, dispatched_at, idempotency_key, request_hash
    ) VALUES (
      p_order_id, p_artist_id, trim(p_courier_name), trim(p_tracking_number), p_tracking_url, p_notes, 'Dispatched', NOW(), v_idempotency_key, v_request_hash
    ) RETURNING id INTO v_shipment_id;
  EXCEPTION WHEN unique_violation THEN
    IF v_idempotency_key IS NOT NULL THEN
      SELECT id, status, request_hash INTO v_existing_shipment
      FROM public.order_shipments
      WHERE order_id = p_order_id AND artist_id = p_artist_id AND idempotency_key = v_idempotency_key;

      IF FOUND THEN
        IF v_existing_shipment.request_hash IS DISTINCT FROM v_request_hash THEN
          RAISE EXCEPTION 'Idempotency conflict: Key % was concurrently inserted with a different request payload', v_idempotency_key
            USING ERRCODE = '42P10';
        END IF;

        RETURN jsonb_build_object(
          'success', true,
          'shipment_id', v_existing_shipment.id,
          'status', v_existing_shipment.status,
          'idempotent_retry', true
        );
      END IF;
    END IF;
    RAISE;
  END;

  -- 7. Tier 2 Lock: Order items in DETERMINISTIC ASCENDING ORDER
  FOR v_item IN 
    SELECT * 
    FROM jsonb_to_recordset(p_items) AS x(order_item_id UUID, quantity INT)
    ORDER BY order_item_id ASC
  LOOP
    v_req_qty := v_item.quantity;
    IF v_req_qty IS NULL OR v_req_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid shipment allocation quantity: must be a positive integer' USING ERRCODE = '22000';
    END IF;

    SELECT id, order_id, artist_id, quantity 
    INTO v_order_item
    FROM public.order_items
    WHERE id = v_item.order_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Order item % not found', v_item.order_item_id USING ERRCODE = 'P0002';
    END IF;

    IF v_order_item.order_id != p_order_id THEN
      RAISE EXCEPTION 'Order item % does not belong to order %', v_item.order_item_id, p_order_id USING ERRCODE = '22000';
    END IF;

    IF (v_order_item.artist_id IS DISTINCT FROM p_artist_id) AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Artist cannot ship unassigned legacy order item or item owned by another artist' USING ERRCODE = '42501';
    END IF;

    SELECT COALESCE(SUM(osi.quantity), 0) INTO v_allocated_qty
    FROM public.order_shipment_items osi
    JOIN public.order_shipments os ON os.id = osi.shipment_id
    WHERE osi.order_item_id = v_item.order_item_id AND os.status != 'Cancelled';

    IF (v_allocated_qty + v_req_qty) > v_order_item.quantity THEN
      RAISE EXCEPTION 'Quantity allocation overflow for item %: purchased %, already allocated %, requested %',
        v_item.order_item_id, v_order_item.quantity, v_allocated_qty, v_req_qty USING ERRCODE = '22000';
    END IF;

    INSERT INTO public.order_shipment_items (shipment_id, order_item_id, quantity)
    VALUES (v_shipment_id, v_item.order_item_id, v_req_qty);
  END LOOP;

  -- 8. Trigger serialized order status rollup
  PERFORM public.rollup_order_status_atomic(p_order_id);

  RETURN jsonb_build_object(
    'success', true,
    'shipment_id', v_shipment_id,
    'status', 'Dispatched'
  );
END;
$$;

-- 3.3 Atomic Shipment State Transitions Following Global Lock Hierarchy
CREATE OR REPLACE FUNCTION public.transition_shipment_status(
  p_shipment_id UUID,
  p_new_status TEXT,
  p_courier_name TEXT DEFAULT NULL,
  p_tracking_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_shipment RECORD;
  v_order_id UUID;
  v_artist_id UUID;
BEGIN
  -- 1. Read target shipment order association without row lock
  SELECT order_id, artist_id INTO v_order_id, v_artist_id
  FROM public.order_shipments
  WHERE id = p_shipment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shipment record not found' USING ERRCODE = 'P0002';
  END IF;

  -- 2. Authorization check: Assigned artist or platform admin only
  IF NOT public.is_admin() AND (auth.uid() IS NULL OR auth.uid() != v_artist_id) THEN
    RAISE EXCEPTION 'Unauthorized: Caller cannot modify this shipment' USING ERRCODE = '42501';
  END IF;

  -- 3. Global Lock Hierarchy Enforcement (Tier 1 -> Tier 3)
  PERFORM 1 FROM public.orders WHERE id = v_order_id FOR UPDATE;

  -- 4. Tier 3 Lock: Row-level lock on target shipment
  SELECT id, order_id, artist_id, status, courier_name, tracking_number
  INTO v_shipment
  FROM public.order_shipments
  WHERE id = p_shipment_id
  FOR UPDATE;

  -- 5. Idempotent no-op
  IF v_shipment.status = p_new_status THEN
    RETURN jsonb_build_object('success', true, 'status', v_shipment.status, 'idempotent_noop', true);
  END IF;

  -- 6. Terminal state immutability
  IF v_shipment.status IN ('Delivered', 'Returned', 'Cancelled') THEN
    RAISE EXCEPTION 'Cannot transition from terminal shipment state %', v_shipment.status USING ERRCODE = '22000';
  END IF;

  -- 7. Strict state machine transitions
  IF v_shipment.status = 'Processing' THEN
    IF p_new_status = 'Dispatched' THEN
      IF (COALESCE(p_courier_name, v_shipment.courier_name) IS NULL OR length(trim(COALESCE(p_courier_name, v_shipment.courier_name))) < 2) OR
         (COALESCE(p_tracking_number, v_shipment.tracking_number) IS NULL OR length(trim(COALESCE(p_tracking_number, v_shipment.tracking_number))) < 4) THEN
        RAISE EXCEPTION 'Dispatch requires valid courier name and tracking number' USING ERRCODE = '22000';
      END IF;
    ELSIF p_new_status = 'Cancelled' THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Illegal transition from Processing to %', p_new_status USING ERRCODE = '22000';
    END IF;
  ELSIF v_shipment.status = 'Dispatched' THEN
    IF p_new_status NOT IN ('In Transit', 'Returned') THEN
      RAISE EXCEPTION 'Illegal transition from Dispatched to %', p_new_status USING ERRCODE = '22000';
    END IF;
  ELSIF v_shipment.status = 'In Transit' THEN
    IF p_new_status NOT IN ('Out for Delivery', 'Returned') THEN
      RAISE EXCEPTION 'Illegal transition from In Transit to %', p_new_status USING ERRCODE = '22000';
    END IF;
  ELSIF v_shipment.status = 'Out for Delivery' THEN
    IF p_new_status NOT IN ('Delivered', 'Returned') THEN
      RAISE EXCEPTION 'Illegal transition from Out for Delivery to %', p_new_status USING ERRCODE = '22000';
    END IF;
  END IF;

  -- 8. Apply transition
  UPDATE public.order_shipments
  SET status = p_new_status,
      courier_name = COALESCE(trim(p_courier_name), courier_name),
      tracking_number = COALESCE(trim(p_tracking_number), tracking_number),
      dispatched_at = CASE WHEN p_new_status = 'Dispatched' AND dispatched_at IS NULL THEN NOW() ELSE dispatched_at END,
      delivered_at = CASE WHEN p_new_status = 'Delivered' THEN NOW() ELSE delivered_at END,
      updated_at = NOW()
  WHERE id = p_shipment_id;

  -- 9. Trigger order status rollup
  PERFORM public.rollup_order_status_atomic(v_order_id);

  RETURN jsonb_build_object(
    'success', true,
    'shipment_id', p_shipment_id,
    'status', p_new_status
  );
END;
$$;

-- 3.4 Authoritative Verified Artwork Review RPC
CREATE OR REPLACE FUNCTION public.submit_verified_review_atomic(
  p_order_id UUID,
  p_artwork_id UUID,
  p_rating INT,
  p_comment TEXT,
  p_title TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_order_item_id UUID;
  v_reviewer_name TEXT;
  v_is_delivered BOOLEAN := false;
  v_review_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to submit an artwork review' USING ERRCODE = '42501';
  END IF;

  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be an integer between 1 and 5' USING ERRCODE = '22000';
  END IF;

  IF p_comment IS NULL OR length(trim(p_comment)) = 0 THEN
    RAISE EXCEPTION 'Review comment cannot be empty' USING ERRCODE = '22000';
  END IF;

  IF length(p_comment) > 2000 THEN
    RAISE EXCEPTION 'Review comment cannot exceed 2000 characters' USING ERRCODE = '22000';
  END IF;

  IF p_title IS NOT NULL AND length(p_title) > 120 THEN
    RAISE EXCEPTION 'Review title cannot exceed 120 characters' USING ERRCODE = '22000';
  END IF;

  SELECT id, user_id, payment_status, status, customer_name
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order record not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_order.user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot submit a review for an order owned by another user' USING ERRCODE = '42501';
  END IF;

  IF v_order.payment_status != 'paid' THEN
    RAISE EXCEPTION 'Cannot review an order that has not been confirmed as paid' USING ERRCODE = '22000';
  END IF;

  SELECT id INTO v_order_item_id
  FROM public.order_items
  WHERE order_id = p_order_id AND artwork_id = p_artwork_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Artwork does not belong to the specified order' USING ERRCODE = '22000';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.order_shipment_items osi
    JOIN public.order_shipments os ON os.id = osi.shipment_id
    WHERE osi.order_item_id = v_order_item_id AND os.status = 'Delivered'
  ) OR (v_order.status = 'Delivered')
  INTO v_is_delivered;

  IF NOT v_is_delivered THEN
    RAISE EXCEPTION 'Review eligibility requires the purchased artwork to be delivered' USING ERRCODE = '22000';
  END IF;

  IF EXISTS (SELECT 1 FROM public.artwork_reviews WHERE order_id = p_order_id AND artwork_id = p_artwork_id) THEN
    RAISE EXCEPTION 'Duplicate review: You have already reviewed this artwork for this order' USING ERRCODE = '23505';
  END IF;

  SELECT name INTO v_reviewer_name FROM public.profiles WHERE id = auth.uid();
  IF v_reviewer_name IS NULL OR length(trim(v_reviewer_name)) = 0 THEN
    v_reviewer_name := COALESCE(nullif(trim(v_order.customer_name), ''), 'Verified Collector');
  END IF;

  INSERT INTO public.artwork_reviews (
    order_id, artwork_id, user_id, reviewer_name, rating, title, comment, verified_purchase, status
  ) VALUES (
    p_order_id, p_artwork_id, auth.uid(), trim(v_reviewer_name), p_rating, nullif(trim(p_title), ''), trim(p_comment), true, 'published'
  ) RETURNING id INTO v_review_id;

  RETURN jsonb_build_object(
    'success', true,
    'review_id', v_review_id,
    'status', 'published'
  );
END;
$$;

-- 3.5 Dedicated Narrow Commission Status Updater
CREATE OR REPLACE FUNCTION public.update_commission_status(
  p_request_id UUID,
  p_new_status TEXT,
  p_artist_notes TEXT DEFAULT NULL,
  p_quoted_price NUMERIC DEFAULT NULL,
  p_estimated_completion_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_commission RECORD;
BEGIN
  SELECT id, artist_id, status 
  INTO v_commission
  FROM public.commission_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission request not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_admin() AND (auth.uid() IS NULL OR auth.uid() != v_commission.artist_id) THEN
    RAISE EXCEPTION 'Unauthorized: Caller cannot modify this commission' USING ERRCODE = '42501';
  END IF;

  IF p_new_status NOT IN ('under_review', 'accepted', 'in_progress', 'completed', 'declined') THEN
    RAISE EXCEPTION 'Invalid commission status %', p_new_status USING ERRCODE = '22000';
  END IF;

  IF v_commission.status IN ('completed', 'declined') THEN
    RAISE EXCEPTION 'Cannot modify commission in terminal status %', v_commission.status USING ERRCODE = '22000';
  END IF;

  UPDATE public.commission_requests
  SET status = p_new_status,
      artist_notes = COALESCE(p_artist_notes, artist_notes),
      quoted_price = COALESCE(p_quoted_price, quoted_price),
      estimated_completion_date = COALESCE(p_estimated_completion_date, estimated_completion_date),
      updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'status', p_new_status
  );
END;
$$;

-- 3.6 Scoped Artist Fulfillment Query RPC (Vendor Data Isolation)
CREATE OR REPLACE FUNCTION public.get_artist_fulfillment_orders(p_order_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_artist_id UUID;
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_artist_id := auth.uid();

  SELECT jsonb_agg(
    jsonb_build_object(
      'order_id', o.id,
      'order_ref', o.order_ref,
      'order_created_at', o.created_at,
      'order_status', o.status,
      'customer_name', o.customer_name,
      'customer_phone', o.customer_phone,
      'customer_address', o.customer_address,
      'artist_items', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'order_item_id', oi.id,
            'artwork_id', oi.artwork_id,
            'artwork_title', oi.artwork_title,
            'artwork_image', oi.artwork_image,
            'quantity', oi.quantity,
            'price_at_purchase', oi.price_at_purchase
          )
        )
        FROM public.order_items oi
        WHERE oi.order_id = o.id AND (oi.artist_id = v_artist_id OR public.is_admin())
      ),
      'artist_shipments', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'shipment_id', os.id,
            'status', os.status,
            'courier_name', os.courier_name,
            'tracking_number', os.tracking_number,
            'tracking_url', os.tracking_url,
            'dispatched_at', os.dispatched_at,
            'delivered_at', os.delivered_at,
            'items', (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'order_item_id', osi.order_item_id,
                  'quantity', osi.quantity
                )
              )
              FROM public.order_shipment_items osi
              WHERE osi.shipment_id = os.id
            )
          )
        )
        FROM public.order_shipments os
        WHERE os.order_id = o.id AND (os.artist_id = v_artist_id OR public.is_admin())
      )
    )
  ) INTO v_result
  FROM public.orders o
  WHERE 
    (p_order_id IS NULL OR o.id = p_order_id)
    AND o.payment_status = 'paid'
    AND (
      public.is_admin() OR 
      EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id AND oi.artist_id = v_artist_id)
    );

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 3.7 Atomic Checkout Order & Line-Item Persistence RPC (Remediating Phase 2N.3)
CREATE OR REPLACE FUNCTION public.create_checkout_order_atomic(
  p_user_id UUID,
  p_order_ref TEXT,
  p_total NUMERIC,
  p_items_json JSONB,
  p_payment_id TEXT,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_address TEXT,
  p_order_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_order_id UUID;
  v_existing_order RECORD;
  v_item RECORD;
  v_existing_items_count INT;
BEGIN
  -- 1. Authorization: Only service_role or database superuser may execute
  IF NOT (
    coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), '') = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: create_checkout_order_atomic is restricted to service_role'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Input Boundary Validation
  IF p_order_ref IS NULL OR length(trim(p_order_ref)) = 0 THEN
    RAISE EXCEPTION 'Order reference is required' USING ERRCODE = '22000';
  END IF;

  IF p_total IS NULL OR p_total <= 0 THEN
    RAISE EXCEPTION 'Order total must be positive' USING ERRCODE = '22000';
  END IF;

  IF p_payment_id IS NULL OR length(trim(p_payment_id)) = 0 THEN
    RAISE EXCEPTION 'Payment ID is required' USING ERRCODE = '22000';
  END IF;

  IF p_order_items IS NULL OR jsonb_typeof(p_order_items) != 'array' OR jsonb_array_length(p_order_items) = 0 THEN
    RAISE EXCEPTION 'Order items must be a non-empty JSON array' USING ERRCODE = '22000';
  END IF;

  -- 3. Idempotency Check
  SELECT id, order_ref, total, payment_id, user_id INTO v_existing_order
  FROM public.orders
  WHERE (payment_id = p_payment_id OR razorpay_payment_id = p_razorpay_payment_id OR order_ref = p_order_ref)
  LIMIT 1;

  IF FOUND THEN
    -- Verify ownership: Unconditional failure across user boundaries
    IF v_existing_order.user_id IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'Access denied: payment reference is associated with another account' USING ERRCODE = '42501';
    END IF;

    -- Ensure order_items exist for the existing order
    SELECT count(*) INTO v_existing_items_count
    FROM public.order_items
    WHERE order_id = v_existing_order.id;

    IF v_existing_items_count = 0 THEN
      FOR v_item IN SELECT * FROM jsonb_to_recordset(p_order_items) AS x(
        artwork_id UUID,
        artist_id UUID,
        quantity INT,
        price_at_purchase NUMERIC,
        artwork_title TEXT,
        artwork_image TEXT
      )
      LOOP
        INSERT INTO public.order_items (
          order_id, artwork_id, artist_id, quantity, price_at_purchase, artwork_title, artwork_image
        ) VALUES (
          v_existing_order.id,
          v_item.artwork_id,
          v_item.artist_id,
          COALESCE(v_item.quantity, 1),
          COALESCE(v_item.price_at_purchase, 0),
          v_item.artwork_title,
          v_item.artwork_image
        );
      END LOOP;
    ELSE
      -- Verify complete multiset line-item equality using NULL-safe comparisons
      IF EXISTS (
        SELECT 1
        FROM (
          SELECT
            artwork_id,
            artwork_title,
            quantity,
            price_at_purchase,
            count(*) AS item_count
          FROM jsonb_to_recordset(p_order_items) AS exp(
            artwork_id UUID,
            quantity INT,
            price_at_purchase NUMERIC,
            artwork_title TEXT
          )
          GROUP BY artwork_id, artwork_title, quantity, price_at_purchase
        ) exp
        FULL OUTER JOIN (
          SELECT
            artwork_id,
            artwork_title,
            quantity,
            price_at_purchase,
            count(*) AS item_count
          FROM public.order_items
          WHERE order_id = v_existing_order.id
          GROUP BY artwork_id, artwork_title, quantity, price_at_purchase
        ) act
        ON (exp.artwork_id IS NOT DISTINCT FROM act.artwork_id)
          AND (exp.artwork_title IS NOT DISTINCT FROM act.artwork_title)
          AND exp.quantity = act.quantity
          AND exp.price_at_purchase = act.price_at_purchase
        WHERE exp.item_count IS DISTINCT FROM act.item_count
      ) THEN
        RAISE EXCEPTION 'Order line item conflict: existing order items do not match verified payment cart'
          USING ERRCODE = '22000';
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_existing_order.id,
      'order_ref', v_existing_order.order_ref,
      'total', v_existing_order.total,
      'payment_id', v_existing_order.payment_id,
      'already_processed', true
    );
  END IF;

  -- 4. Atomic Insertion of Order & Order Items
  BEGIN
    INSERT INTO public.orders (
      user_id,
      order_ref,
      total,
      items,
      payment_id,
      razorpay_order_id,
      razorpay_payment_id,
      status,
      payment_status,
      customer_name,
      customer_phone,
      customer_address
    ) VALUES (
      p_user_id,
      trim(p_order_ref),
      p_total,
      p_items_json,
      trim(p_payment_id),
      nullif(trim(p_razorpay_order_id), ''),
      trim(p_razorpay_payment_id),
      'Pending',
      'paid',
      trim(p_customer_name),
      trim(p_customer_phone),
      trim(p_customer_address)
    ) RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_order_items) AS x(
      artwork_id UUID,
      artist_id UUID,
      quantity INT,
      price_at_purchase NUMERIC,
      artwork_title TEXT,
      artwork_image TEXT
    )
    LOOP
      IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
        RAISE EXCEPTION 'Line item quantity must be positive' USING ERRCODE = '22000';
      END IF;

      INSERT INTO public.order_items (
        order_id,
        artwork_id,
        artist_id,
        quantity,
        price_at_purchase,
        artwork_title,
        artwork_image
      ) VALUES (
        v_order_id,
        v_item.artwork_id,
        v_item.artist_id,
        v_item.quantity,
        COALESCE(v_item.price_at_purchase, 0),
        v_item.artwork_title,
        v_item.artwork_image
      );
    END LOOP;

  EXCEPTION WHEN unique_violation THEN
    SELECT id, order_ref, total, payment_id, user_id INTO v_existing_order
    FROM public.orders
    WHERE payment_id = p_payment_id OR razorpay_payment_id = p_razorpay_payment_id OR order_ref = p_order_ref
    LIMIT 1;

    IF FOUND THEN
      IF v_existing_order.user_id IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'Access denied: payment reference is associated with another account' USING ERRCODE = '42501';
      END IF;

      SELECT count(*) INTO v_existing_items_count
      FROM public.order_items
      WHERE order_id = v_existing_order.id;

      IF v_existing_items_count = 0 THEN
        FOR v_item IN SELECT * FROM jsonb_to_recordset(p_order_items) AS x(
          artwork_id UUID,
          artist_id UUID,
          quantity INT,
          price_at_purchase NUMERIC,
          artwork_title TEXT,
          artwork_image TEXT
        )
        LOOP
          INSERT INTO public.order_items (
            order_id, artwork_id, artist_id, quantity, price_at_purchase, artwork_title, artwork_image
          ) VALUES (
            v_existing_order.id,
            v_item.artwork_id,
            v_item.artist_id,
            COALESCE(v_item.quantity, 1),
            COALESCE(v_item.price_at_purchase, 0),
            v_item.artwork_title,
            v_item.artwork_image
          );
        END LOOP;
      ELSE
        IF EXISTS (
          SELECT 1
          FROM (
            SELECT
              artwork_id,
              artwork_title,
              quantity,
              price_at_purchase,
              count(*) AS item_count
            FROM jsonb_to_recordset(p_order_items) AS exp(
              artwork_id UUID,
              quantity INT,
              price_at_purchase NUMERIC,
              artwork_title TEXT
            )
            GROUP BY artwork_id, artwork_title, quantity, price_at_purchase
          ) exp
          FULL OUTER JOIN (
            SELECT
              artwork_id,
              artwork_title,
              quantity,
              price_at_purchase,
              count(*) AS item_count
            FROM public.order_items
            WHERE order_id = v_existing_order.id
            GROUP BY artwork_id, artwork_title, quantity, price_at_purchase
          ) act
          ON (exp.artwork_id IS NOT DISTINCT FROM act.artwork_id)
            AND (exp.artwork_title IS NOT DISTINCT FROM act.artwork_title)
            AND exp.quantity = act.quantity
            AND exp.price_at_purchase = act.price_at_purchase
          WHERE exp.item_count IS DISTINCT FROM act.item_count
        ) THEN
          RAISE EXCEPTION 'Order line item conflict: concurrent order items do not match verified payment cart'
            USING ERRCODE = '22000';
        END IF;
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'order_id', v_existing_order.id,
        'order_ref', v_existing_order.order_ref,
        'total', v_existing_order.total,
        'payment_id', v_existing_order.payment_id,
        'already_processed', true
      );
    END IF;
    RAISE;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_ref', trim(p_order_ref),
    'total', p_total,
    'payment_id', trim(p_payment_id),
    'already_processed', false
  );
END;
$$;

-- 3.8 Authoritative Atomic Order Reconciliation RPC (Resolving Blocker 2P.1-01)
CREATE OR REPLACE FUNCTION public.resolve_reconciliation_order_atomic(
  p_order_id UUID,
  p_expected_payment_id TEXT,
  p_expected_razorpay_order_id TEXT,
  p_expected_total NUMERIC,
  p_sanitized_items JSONB,
  p_order_items_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_item JSONB;
BEGIN
  -- 1. Authorization: Only service_role or database superuser may execute
  IF NOT (
    coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), '') = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: resolve_reconciliation_order_atomic is restricted to service_role'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Acquire pessimistic row-level lock on the target order
  SELECT id, status, payment_status, total, payment_id, razorpay_order_id, razorpay_payment_id
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order record not found' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Expected status verification (Prevents duplicate or concurrent reconciliation)
  IF v_order.status != 'Pending' THEN
    RAISE EXCEPTION 'Order reconciliation conflict: Order is in status %, expected Pending' 
      USING ERRCODE = '23505';
  END IF;

  -- 4. Payment confirmation verification
  IF v_order.payment_status != 'paid' THEN
    RAISE EXCEPTION 'Cannot resolve unpaid order: Payment status is %' 
      USING ERRCODE = '22000';
  END IF;

  -- 5. Payment identifier identity check
  IF COALESCE(v_order.razorpay_payment_id, v_order.payment_id) != p_expected_payment_id THEN
    RAISE EXCEPTION 'Payment identifier mismatch: Persisted payment ID does not match resolution parameter' 
      USING ERRCODE = '22000';
  END IF;

  -- 6. Razorpay order association check (if supplied and persisted)
  IF p_expected_razorpay_order_id IS NOT NULL 
     AND v_order.razorpay_order_id IS NOT NULL 
     AND v_order.razorpay_order_id != p_expected_razorpay_order_id THEN
    RAISE EXCEPTION 'Razorpay order ID mismatch: Persisted % does not match resolution parameter %',
      v_order.razorpay_order_id, p_expected_razorpay_order_id
      USING ERRCODE = '22000';
  END IF;

  -- 7. Authoritative financial balance check
  IF v_order.total != p_expected_total THEN
    RAISE EXCEPTION 'Financial mismatch: Persisted order total % does not match resolved item sum %',
      v_order.total, p_expected_total
      USING ERRCODE = '22000';
  END IF;

  -- 8. Atomic order status transition (Strictly 'Processing'; never 'Shipped' or 'Delivered')
  UPDATE public.orders
  SET status = 'Processing',
      items = p_sanitized_items,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- 9. Atomic replacement of relational order_items for this specific order
  DELETE FROM public.order_items WHERE order_id = p_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items_payload)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      artwork_id,
      artist_id,
      quantity,
      price_at_purchase,
      artwork_title,
      artwork_image
    ) VALUES (
      p_order_id,
      CASE 
        WHEN (v_item->>'artwork_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' 
        THEN (v_item->>'artwork_id')::UUID 
        ELSE NULL 
      END,
      CASE 
        WHEN (v_item->>'artist_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' 
        THEN (v_item->>'artist_id')::UUID 
        ELSE NULL 
      END,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price_at_purchase')::NUMERIC,
      v_item->>'artwork_title',
      v_item->>'artwork_image'
    );
  END LOOP;

  -- 10. Return success payload
  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'Processing'
  );
END;
$$;

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES & EXPLICIT TABLE GRANTS
-- ==============================================================================

ALTER TABLE public.collector_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collector_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artwork_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_requests ENABLE ROW LEVEL SECURITY;

-- 4.1 Collector Collections
DROP POLICY IF EXISTS "Collections viewable by owner or public if shared" ON public.collector_collections;
CREATE POLICY "Collections viewable by owner or public if shared" ON public.collector_collections
  FOR SELECT USING (auth.uid() = user_id OR is_private = false OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own collections" ON public.collector_collections;
CREATE POLICY "Users can insert own collections" ON public.collector_collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own collections" ON public.collector_collections;
CREATE POLICY "Users can update own collections" ON public.collector_collections
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own collections" ON public.collector_collections;
CREATE POLICY "Users can delete own collections" ON public.collector_collections
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.collector_collections TO authenticated;
GRANT SELECT ON TABLE public.collector_collections TO anon;

-- 4.2 Collector Collection Items
DROP POLICY IF EXISTS "Collection items viewable with collection" ON public.collector_collection_items;
CREATE POLICY "Collection items viewable with collection" ON public.collector_collection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collector_collections c 
      WHERE c.id = collection_id AND (c.user_id = auth.uid() OR c.is_private = false OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Users can insert items to own collection" ON public.collector_collection_items;
CREATE POLICY "Users can insert items to own collection" ON public.collector_collection_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collector_collections c 
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete items from own collection" ON public.collector_collection_items;
CREATE POLICY "Users can delete items from own collection" ON public.collector_collection_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.collector_collections c 
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, DELETE ON TABLE public.collector_collection_items TO authenticated;
GRANT SELECT ON TABLE public.collector_collection_items TO anon;

-- 4.3 Artist Follows
DROP POLICY IF EXISTS "Follows viewable by parties or admin" ON public.artist_follows;
CREATE POLICY "Follows viewable by parties or admin" ON public.artist_follows
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = artist_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can manage own follows" ON public.artist_follows;
CREATE POLICY "Users can manage own follows" ON public.artist_follows
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() != artist_id);

DROP POLICY IF EXISTS "Users can delete own follows" ON public.artist_follows;
CREATE POLICY "Users can delete own follows" ON public.artist_follows
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON TABLE public.artist_follows TO authenticated;

-- 4.4 Saved Searches
DROP POLICY IF EXISTS "Users can manage own saved searches" ON public.saved_searches;
CREATE POLICY "Users can manage own saved searches" ON public.saved_searches
  FOR ALL USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_searches TO authenticated;

-- 4.5 Order Shipments & Items: Read-Only via RLS. Direct writes strictly revoked!
DROP POLICY IF EXISTS "Shipments viewable by buyer artist or admin" ON public.order_shipments;
CREATE POLICY "Shipments viewable by buyer artist or admin" ON public.order_shipments
  FOR SELECT USING (
    auth.uid() = artist_id 
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Shipment items viewable with shipment" ON public.order_shipment_items;
CREATE POLICY "Shipment items viewable with shipment" ON public.order_shipment_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.order_shipments s 
      WHERE s.id = shipment_id AND (
        s.artist_id = auth.uid() 
        OR public.is_admin()
        OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = s.order_id AND o.user_id = auth.uid())
      )
    )
  );

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.order_shipments FROM anon, authenticated, public;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.order_shipment_items FROM anon, authenticated, public;
GRANT SELECT ON TABLE public.order_shipments TO authenticated;
GRANT SELECT ON TABLE public.order_shipment_items TO authenticated;

-- 4.6 Verified Artwork Reviews
DROP POLICY IF EXISTS "Reviews viewable by public if published" ON public.artwork_reviews;
CREATE POLICY "Reviews viewable by public if published" ON public.artwork_reviews
  FOR SELECT USING (status = 'published' OR auth.uid() = user_id OR public.is_admin());

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.artwork_reviews FROM anon, authenticated, public;
GRANT SELECT ON TABLE public.artwork_reviews TO anon, authenticated;

-- 4.7 Commission Requests
DROP POLICY IF EXISTS "Commissions viewable by client artist or admin" ON public.commission_requests;
CREATE POLICY "Commissions viewable by client artist or admin" ON public.commission_requests
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = artist_id OR public.is_admin());

DROP POLICY IF EXISTS "Clients can submit commission requests" ON public.commission_requests;
CREATE POLICY "Clients can submit commission requests" ON public.commission_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.commission_requests FROM anon, authenticated, public;
GRANT SELECT, INSERT ON TABLE public.commission_requests TO authenticated;
GRANT INSERT ON TABLE public.commission_requests TO anon;

-- ==============================================================================
-- 5. RPC EXECUTION GRANTS (LEAST PRIVILEGE)
-- ==============================================================================

REVOKE EXECUTE ON FUNCTION public.create_order_shipment_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_shipment_atomic TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.transition_shipment_status FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_shipment_status TO authenticated, service_role;

-- Strictly revoke rollup execution from authenticated users to prevent row-lock denial-of-service
REVOKE EXECUTE ON FUNCTION public.rollup_order_status_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rollup_order_status_atomic TO service_role;

REVOKE EXECUTE ON FUNCTION public.submit_verified_review_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_verified_review_atomic TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.update_commission_status FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_commission_status TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_artist_fulfillment_orders FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_artist_fulfillment_orders TO authenticated, service_role;

-- Strictly revoke checkout order creation from authenticated users to prevent client-side payment bypass
REVOKE EXECUTE ON FUNCTION public.create_checkout_order_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order_atomic TO service_role;

-- Strictly revoke reconciliation resolution from authenticated users (service_role only)
REVOKE EXECUTE ON FUNCTION public.resolve_reconciliation_order_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_reconciliation_order_atomic TO service_role;

-- ==============================================================================
-- 6. SECURE STORAGE BUCKETS & COMMISSION ATTACHMENT ISOLATION
-- Path Standard: commissions/{commission_id}/{filename}
-- ==============================================================================
DO $$
DECLARE
  v_has_mime_col boolean := false;
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL AND to_regclass('storage.buckets') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'allowed_mime_types'
    ) INTO v_has_mime_col;

    IF v_has_mime_col THEN
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('commissions', 'commissions', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
      ON CONFLICT (id) DO NOTHING;
    ELSE
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('avatars', 'avatars', true)
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO storage.buckets (id, name, public)
      VALUES ('commissions', 'commissions', false)
      ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Avatars Policies
    DROP POLICY IF EXISTS "Avatars publicly viewable" ON storage.objects;
    CREATE POLICY "Avatars publicly viewable" ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');

    DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
    CREATE POLICY "Users can upload own avatar" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND 
        auth.role() = 'authenticated' AND 
        array_length(storage.foldername(name), 1) = 1 AND
        (storage.foldername(name))[1] = auth.uid()::text
      );

    -- Commissions Policies
    DROP POLICY IF EXISTS "Commissions viewable by client artist or admin" ON storage.objects;
    CREATE POLICY "Commissions viewable by client artist or admin" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'commissions' AND (
          public.is_admin()
          OR (
            auth.role() = 'authenticated' AND (
              (
                array_length(storage.foldername(name), 1) = 1 AND
                EXISTS (
                  SELECT 1 FROM public.commission_requests cr 
                  WHERE cr.id::text = (storage.foldername(name))[1]
                    AND (cr.user_id = auth.uid() OR cr.artist_id = auth.uid())
                )
              )
              OR
              (
                array_length(storage.foldername(name), 1) = 2 AND
                (storage.foldername(name))[1] = 'commissions' AND
                EXISTS (
                  SELECT 1 FROM public.commission_requests cr 
                  WHERE cr.id::text = (storage.foldername(name))[2]
                    AND (cr.user_id = auth.uid() OR cr.artist_id = auth.uid())
                )
              )
            )
          )
        )
      );

    DROP POLICY IF EXISTS "Users can upload commission references" ON storage.objects;
    CREATE POLICY "Users can upload commission references" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'commissions' AND (
          public.is_admin()
          OR (
            auth.role() = 'authenticated' AND (
              (
                array_length(storage.foldername(name), 1) = 1 AND
                EXISTS (
                  SELECT 1 FROM public.commission_requests cr 
                  WHERE cr.id::text = (storage.foldername(name))[1]
                    AND cr.user_id = auth.uid()
                )
              )
              OR
              (
                array_length(storage.foldername(name), 1) = 2 AND
                (storage.foldername(name))[1] = 'commissions' AND
                EXISTS (
                  SELECT 1 FROM public.commission_requests cr 
                  WHERE cr.id::text = (storage.foldername(name))[2]
                    AND cr.user_id = auth.uid()
                )
              )
            )
          )
        )
      );

    DROP POLICY IF EXISTS "Users can update own commission references" ON storage.objects;
    CREATE POLICY "Users can update own commission references" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'commissions' AND (
          public.is_admin()
          OR (
            auth.role() = 'authenticated' AND (
              (
                array_length(storage.foldername(name), 1) = 1 AND
                EXISTS (
                  SELECT 1 FROM public.commission_requests cr 
                  WHERE cr.id::text = (storage.foldername(name))[1]
                    AND cr.user_id = auth.uid()
                )
              )
              OR
              (
                array_length(storage.foldername(name), 1) = 2 AND
                (storage.foldername(name))[1] = 'commissions' AND
                EXISTS (
                  SELECT 1 FROM public.commission_requests cr 
                  WHERE cr.id::text = (storage.foldername(name))[2]
                    AND cr.user_id = auth.uid()
                )
              )
            )
          )
        )
      )
      WITH CHECK (
        bucket_id = 'commissions' AND (
          public.is_admin()
          OR (
            auth.role() = 'authenticated' AND (
              (
                array_length(storage.foldername(name), 1) = 1 AND
                EXISTS (
                  SELECT 1 FROM public.commission_requests cr 
                  WHERE cr.id::text = (storage.foldername(name))[1]
                    AND cr.user_id = auth.uid()
                )
              )
              OR
              (
                array_length(storage.foldername(name), 1) = 2 AND
                (storage.foldername(name))[1] = 'commissions' AND
                EXISTS (
                  SELECT 1 FROM public.commission_requests cr 
                  WHERE cr.id::text = (storage.foldername(name))[2]
                    AND cr.user_id = auth.uid()
                )
              )
            )
          )
        )
      );

    DROP POLICY IF EXISTS "Users can delete own commission references" ON storage.objects;
    CREATE POLICY "Users can delete own commission references" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'commissions' AND (
          public.is_admin()
          OR (
            auth.role() = 'authenticated' AND (
              (
                array_length(storage.foldername(name), 1) = 1 AND
                EXISTS (
                  SELECT 1 FROM public.commission_requests cr 
                  WHERE cr.id::text = (storage.foldername(name))[1]
                    AND cr.user_id = auth.uid()
                )
              )
              OR
              (
                array_length(storage.foldername(name), 1) = 2 AND
                (storage.foldername(name))[1] = 'commissions' AND
                EXISTS (
                  SELECT 1 FROM public.commission_requests cr 
                  WHERE cr.id::text = (storage.foldername(name))[2]
                    AND cr.user_id = auth.uid()
                )
              )
            )
          )
        )
      );
  ELSE
    RAISE NOTICE 'Supabase storage schema not present. Storage bucket configuration skipped.';
  END IF;
END $$;

-- ==============================================================================
-- 7. DEFENSE-IN-DEPTH: RE-VERIFY ORDERS WRITE HARDENING
-- ==============================================================================
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.orders FROM anon, authenticated, public;
GRANT SELECT ON TABLE public.orders TO authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.order_items FROM anon, authenticated, public;
GRANT SELECT ON TABLE public.order_items TO authenticated;

COMMIT;
