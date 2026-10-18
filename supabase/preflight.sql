-- ============================================================================
-- KALA SETU MARKETPLACE - PHASE 1 DATABASE PREFLIGHT DIAGNOSTIC
-- ============================================================================
-- File: supabase/preflight.sql
-- Mode: READ-ONLY (No DDL, DML, or permission changes on permanent objects)
-- Compatibility: Runs safely on fresh databases, partially-migrated databases,
--                and existing production databases.
--
-- Instructions:
-- 1. Open the Supabase Dashboard -> SQL Editor.
-- 2. Paste this entire script and click "Run".
-- 3. Review the diagnostic table returned in the "Results" tab.
-- 4. Check for any rows where status is 'FAIL' or 'WARN'.
-- 5. Resolve flagged data issues before executing supabase/schema.sql.
-- ============================================================================

DROP FUNCTION IF EXISTS pg_temp.run_kala_setu_preflight();

CREATE OR REPLACE FUNCTION pg_temp.run_kala_setu_preflight()
RETURNS TABLE (
  category text,
  check_name text,
  status text,
  details text,
  action_needed text
) AS $func$
DECLARE
  v_table_exists boolean;
  v_col_exists boolean;
  v_target_col_exists boolean;
  v_target_tbl_exists boolean;
  v_row_count bigint;
  v_violation_count bigint;
  v_detail_str text;
  v_public boolean;
  v_policy_count int;
  v_rls_enabled boolean;
  v_constraint_def text;
  
  -- Record cursor helpers
  r record;
BEGIN

  -- ==========================================================================
  -- 1. TABLE CATALOG CHECKS
  -- ==========================================================================
  FOR r IN (
    SELECT * FROM (VALUES
      ('public', 'profiles', true),
      ('public', 'artist_profiles', true),
      ('public', 'artworks', true),
      ('public', 'wishlists', true),
      ('public', 'orders', true),
      ('public', 'order_items', true),
      ('auth', 'users', true),
      ('storage', 'buckets', true),
      ('storage', 'objects', true)
    ) AS t(schem, tbl, is_required)
  ) LOOP
    -- Check if table exists in PostgreSQL system catalog (pg_class + pg_namespace)
    SELECT EXISTS (
      SELECT 1 
      FROM pg_class c 
      JOIN pg_namespace n ON n.oid = c.relnamespace 
      WHERE n.nspname = r.schem AND c.relname = r.tbl
    ) INTO v_table_exists;

    IF v_table_exists THEN
      IF has_table_privilege(current_user, quote_ident(r.schem) || '.' || quote_ident(r.tbl), 'SELECT') THEN
        EXECUTE format('SELECT count(*) FROM %I.%I', r.schem, r.tbl) INTO v_row_count;
        category := '1. TABLE_CATALOG';
        check_name := format('%I.%I exists', r.schem, r.tbl);
        status := 'PASS';
        details := format('Table exists with %s existing row(s).', v_row_count);
        action_needed := 'None.';
        RETURN NEXT;
      ELSE
        category := '1. TABLE_CATALOG';
        check_name := format('%I.%I exists', r.schem, r.tbl);
        status := 'WARN';
        details := format('Table %I.%I exists in catalog, but role %I lacks SELECT privilege.', r.schem, r.tbl, current_user);
        action_needed := format('Ensure role %I has SELECT permission on %I.%I.', current_user, r.schem, r.tbl);
        RETURN NEXT;
      END IF;
    ELSE
      category := '1. TABLE_CATALOG';
      check_name := format('%I.%I exists', r.schem, r.tbl);
      IF r.schem = 'public' THEN
        status := 'INFO';
        details := 'Table does not exist yet. schema.sql will create it cleanly.';
        action_needed := 'None (fresh installation expected).';
      ELSIF r.schem = 'storage' THEN
        IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
          status := 'FAIL';
          details := format('Schema "storage" exists, but table %I.%I is absent from pg_class. Supabase Storage service has not initialized its tables.', r.schem, r.tbl);
          action_needed := 'Open the Supabase Dashboard -> Storage tab and create a bucket (or click New Bucket) to trigger Storage schema provisioning.';
        ELSE
          status := 'FAIL';
          details := format('Schema "storage" does not exist in this database.', r.schem, r.tbl);
          action_needed := 'Enable Supabase Storage in your project settings before running migration.';
        END IF;
      ELSE
        status := 'FAIL';
        details := format('Core Supabase table %I.%I is missing.', r.schem, r.tbl);
        action_needed := 'Ensure Supabase Auth and Storage extensions/schemas are enabled.';
      END IF;
      RETURN NEXT;
    END IF;
  END LOOP;


  -- ==========================================================================
  -- 2. COLUMN CATALOG CHECKS (Existing Tables)
  -- ==========================================================================
  FOR r IN (
    SELECT * FROM (VALUES
      -- PROFILES
      ('public', 'profiles', 'id', 'uuid', true),
      ('public', 'profiles', 'role', 'text', true),
      ('public', 'profiles', 'name', 'text', false),
      ('public', 'profiles', 'bio', 'text', false),
      ('public', 'profiles', 'profile_image', 'text', false),
      ('public', 'profiles', 'location', 'text', false),
      ('public', 'profiles', 'experience', 'text', false),
      ('public', 'profiles', 'specialties', 'ARRAY', false),
      ('public', 'profiles', 'phone', 'text', false),
      ('public', 'profiles', 'instagram', 'text', false),
      ('public', 'profiles', 'website', 'text', false),
      ('public', 'profiles', 'verified', 'boolean', false),
      ('public', 'profiles', 'created_at', 'timestamp with time zone', false),
      ('public', 'profiles', 'updated_at', 'timestamp with time zone', false),

      -- ARTIST_PROFILES
      ('public', 'artist_profiles', 'user_id', 'uuid', true),
      ('public', 'artist_profiles', 'display_name', 'text', true),
      ('public', 'artist_profiles', 'bio', 'text', false),
      ('public', 'artist_profiles', 'profile_image', 'text', false),
      ('public', 'artist_profiles', 'location', 'text', false),
      ('public', 'artist_profiles', 'specialties', 'ARRAY', false),
      ('public', 'artist_profiles', 'experience', 'text', false),
      ('public', 'artist_profiles', 'social_links', 'jsonb', false),
      ('public', 'artist_profiles', 'verification_status', 'text', true),
      ('public', 'artist_profiles', 'created_at', 'timestamp with time zone', false),
      ('public', 'artist_profiles', 'updated_at', 'timestamp with time zone', false),

      -- ARTWORKS
      ('public', 'artworks', 'id', 'uuid', true),
      ('public', 'artworks', 'artist_id', 'uuid', true),
      ('public', 'artworks', 'title', 'text', true),
      ('public', 'artworks', 'slug', 'text', true),
      ('public', 'artworks', 'description', 'text', false),
      ('public', 'artworks', 'price', 'numeric', true),
      ('public', 'artworks', 'category', 'text', false),
      ('public', 'artworks', 'medium', 'text', false),
      ('public', 'artworks', 'dimensions', 'text', false),
      ('public', 'artworks', 'year', 'integer', false),
      ('public', 'artworks', 'image_url', 'text', true),
      ('public', 'artworks', 'additional_images', 'ARRAY', false),
      ('public', 'artworks', 'availability', 'boolean', false),
      ('public', 'artworks', 'status', 'text', true),
      ('public', 'artworks', 'created_at', 'timestamp with time zone', false),
      ('public', 'artworks', 'updated_at', 'timestamp with time zone', false),

      -- WISHLISTS
      ('public', 'wishlists', 'id', 'uuid', true),
      ('public', 'wishlists', 'user_id', 'uuid', true),
      ('public', 'wishlists', 'artwork_id', 'uuid', true),
      ('public', 'wishlists', 'created_at', 'timestamp with time zone', false),

      -- ORDERS
      ('public', 'orders', 'id', 'uuid', true),
      ('public', 'orders', 'user_id', 'uuid', false),
      ('public', 'orders', 'order_ref', 'text', true),
      ('public', 'orders', 'total', 'numeric', true),
      ('public', 'orders', 'items', 'jsonb', false),
      ('public', 'orders', 'payment_id', 'text', false),
      ('public', 'orders', 'status', 'text', false),
      ('public', 'orders', 'payment_status', 'text', false),
      ('public', 'orders', 'razorpay_order_id', 'text', false),
      ('public', 'orders', 'razorpay_payment_id', 'text', false),
      ('public', 'orders', 'customer_name', 'text', false),
      ('public', 'orders', 'customer_phone', 'text', false),
      ('public', 'orders', 'customer_address', 'text', false),
      ('public', 'orders', 'created_at', 'timestamp with time zone', false),
      ('public', 'orders', 'updated_at', 'timestamp with time zone', false),

      -- ORDER_ITEMS
      ('public', 'order_items', 'id', 'uuid', true),
      ('public', 'order_items', 'order_id', 'uuid', true),
      ('public', 'order_items', 'artwork_id', 'uuid', false),
      ('public', 'order_items', 'artist_id', 'uuid', false),
      ('public', 'order_items', 'quantity', 'integer', true),
      ('public', 'order_items', 'price_at_purchase', 'numeric', true),
      ('public', 'order_items', 'artwork_title', 'text', false),
      ('public', 'order_items', 'artwork_image', 'text', false)
    ) AS c(schem, tbl, col, expected_type, is_mandatory)
  ) LOOP
    v_table_exists := (to_regclass(quote_ident(r.schem) || '.' || quote_ident(r.tbl)) IS NOT NULL);

    category := '2. COLUMN_CATALOG';
    check_name := format('%I.%I.%I', r.schem, r.tbl, r.col);

    IF NOT v_table_exists THEN
      status := 'SKIPPED';
      details := format('Table %I.%I does not exist yet.', r.schem, r.tbl);
      action_needed := 'None.';
      RETURN NEXT;
    ELSE
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = r.schem AND table_name = r.tbl AND column_name = r.col
      ) INTO v_col_exists;

      IF v_col_exists THEN
        status := 'PASS';
        details := 'Column exists in database.';
        action_needed := 'None.';
        RETURN NEXT;
      ELSE
        -- Check if table has rows
        EXECUTE format('SELECT count(*) FROM %I.%I', r.schem, r.tbl) INTO v_row_count;
        IF v_row_count = 0 THEN
          status := 'INFO';
          details := format('Column missing, but table is empty (0 rows). schema.sql will add it safely.', v_row_count);
          action_needed := 'None.';
          RETURN NEXT;
        ELSE
          IF r.is_mandatory THEN
            status := 'WARN';
            details := format('Mandatory column missing on populated table (%s rows). When schema.sql runs, ADD COLUMN IF NOT EXISTS will add it as NULL, triggering Section 1 validation halt.', v_row_count);
            action_needed := format('Plan manual backfill for %I.%I.%I if running migration on populated table.', r.schem, r.tbl, r.col);
            RETURN NEXT;
          ELSE
            status := 'INFO';
            details := format('Optional or nullable column missing on populated table (%s rows). schema.sql will add it safely without data corruption.', v_row_count);
            action_needed := 'None.';
            RETURN NEXT;
          END IF;
        END IF;
      END IF;
    END IF;
  END LOOP;


  -- ==========================================================================
  -- 3. NOT NULL CHECKS (Columns intended to be NOT NULL)
  -- ==========================================================================
  FOR r IN (
    SELECT * FROM (VALUES
      ('public', 'profiles', 'id'),
      ('public', 'profiles', 'role'),
      ('public', 'artist_profiles', 'user_id'),
      ('public', 'artist_profiles', 'display_name'),
      ('public', 'artist_profiles', 'verification_status'),
      ('public', 'artworks', 'id'),
      ('public', 'artworks', 'artist_id'),
      ('public', 'artworks', 'title'),
      ('public', 'artworks', 'slug'),
      ('public', 'artworks', 'price'),
      ('public', 'artworks', 'image_url'),
      ('public', 'artworks', 'status'),
      ('public', 'wishlists', 'id'),
      ('public', 'wishlists', 'user_id'),
      ('public', 'wishlists', 'artwork_id'),
      ('public', 'orders', 'id'),
      ('public', 'orders', 'order_ref'),
      ('public', 'orders', 'total'),
      ('public', 'order_items', 'id'),
      ('public', 'order_items', 'order_id'),
      ('public', 'order_items', 'quantity'),
      ('public', 'order_items', 'price_at_purchase')
    ) AS n(schem, tbl, col)
  ) LOOP
    category := '3. NOT_NULL_CHECKS';
    check_name := format('NULL check on %I.%I.%I', r.schem, r.tbl, r.col);

    v_table_exists := (to_regclass(quote_ident(r.schem) || '.' || quote_ident(r.tbl)) IS NOT NULL);
    IF NOT v_table_exists THEN
      status := 'SKIPPED';
      details := format('Table %I.%I absent.', r.schem, r.tbl);
      action_needed := 'None.';
      RETURN NEXT;
    ELSE
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = r.schem AND table_name = r.tbl AND column_name = r.col
      ) INTO v_col_exists;

      IF NOT v_col_exists THEN
        status := 'SKIPPED';
        details := format('Column %I does not exist in %I.%I yet.', r.col, r.schem, r.tbl);
        action_needed := 'None.';
        RETURN NEXT;
      ELSE
        EXECUTE format('SELECT count(*) FROM %I.%I WHERE %I IS NULL', r.schem, r.tbl, r.col) INTO v_violation_count;
        IF v_violation_count = 0 THEN
          status := 'PASS';
          details := '0 NULL values found.';
          action_needed := 'None.';
          RETURN NEXT;
        ELSE
          status := 'FAIL';
          details := format('Found %s row(s) with NULL in column %I.', v_violation_count, r.col);
          action_needed := format('Update or backfill NULL %I values in %I.%I before running schema.sql.', r.col, r.schem, r.tbl);
          RETURN NEXT;
        END IF;
      END IF;
    END IF;
  END LOOP;


  -- ==========================================================================
  -- 4. FOREIGN KEY INTEGRITY CHECKS (Orphaned Records)
  -- ==========================================================================
  FOR r IN (
    SELECT * FROM (VALUES
      ('public', 'profiles', 'id', 'auth', 'users', 'id', 'profiles_id_fkey', false),
      ('public', 'artist_profiles', 'user_id', 'public', 'profiles', 'id', 'artist_profiles_user_id_fkey', false),
      ('public', 'artworks', 'artist_id', 'public', 'artist_profiles', 'user_id', 'artworks_artist_id_fkey', true),
      ('public', 'wishlists', 'user_id', 'public', 'profiles', 'id', 'wishlists_user_id_fkey', false),
      ('public', 'wishlists', 'artwork_id', 'public', 'artworks', 'id', 'wishlists_artwork_id_fkey', false),
      ('public', 'orders', 'user_id', 'auth', 'users', 'id', 'orders_user_id_fkey', true),
      ('public', 'order_items', 'order_id', 'public', 'orders', 'id', 'order_items_order_id_fkey', false),
      ('public', 'order_items', 'artwork_id', 'public', 'artworks', 'id', 'order_items_artwork_id_fkey', true),
      ('public', 'order_items', 'artist_id', 'public', 'artist_profiles', 'user_id', 'order_items_artist_id_fkey', true)
    ) AS fk(src_schem, src_tbl, src_col, tgt_schem, tgt_tbl, tgt_col, fk_name, is_nullable)
  ) LOOP
    category := '4. FOREIGN_KEY_INTEGRITY';
    check_name := format('FK %I (%I.%I.%I -> %I.%I.%I)', r.fk_name, r.src_schem, r.src_tbl, r.src_col, r.tgt_schem, r.tgt_tbl, r.tgt_col);

    v_table_exists := (to_regclass(quote_ident(r.src_schem) || '.' || quote_ident(r.src_tbl)) IS NOT NULL);
    v_target_tbl_exists := (to_regclass(quote_ident(r.tgt_schem) || '.' || quote_ident(r.tgt_tbl)) IS NOT NULL);

    IF NOT (v_table_exists AND v_target_tbl_exists) THEN
      status := 'SKIPPED';
      details := format('Source (%I.%I) or Target (%I.%I) table absent.', r.src_schem, r.src_tbl, r.tgt_schem, r.tgt_tbl);
      action_needed := 'None.';
      RETURN NEXT;
    ELSE
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = r.src_schem AND table_name = r.src_tbl AND column_name = r.src_col
      ) INTO v_col_exists;

      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = r.tgt_schem AND table_name = r.tgt_tbl AND column_name = r.tgt_col
      ) INTO v_target_col_exists;

      IF NOT (v_col_exists AND v_target_col_exists) THEN
        status := 'SKIPPED';
        details := 'Required key column missing in source or target table.';
        action_needed := 'None.';
        RETURN NEXT;
      ELSE
        IF r.is_nullable THEN
          EXECUTE format(
            'SELECT count(*) FROM %I.%I s WHERE s.%I IS NOT NULL AND NOT EXISTS (SELECT 1 FROM %I.%I t WHERE t.%I = s.%I)',
            r.src_schem, r.src_tbl, r.src_col, r.tgt_schem, r.tgt_tbl, r.tgt_col, r.src_col
          ) INTO v_violation_count;
        ELSE
          EXECUTE format(
            'SELECT count(*) FROM %I.%I s WHERE NOT EXISTS (SELECT 1 FROM %I.%I t WHERE t.%I = s.%I)',
            r.src_schem, r.src_tbl, r.tgt_schem, r.tgt_tbl, r.tgt_col, r.src_col
          ) INTO v_violation_count;
        END IF;

        IF v_violation_count = 0 THEN
          status := 'PASS';
          details := '0 orphaned foreign-key references found.';
          action_needed := 'None.';
          RETURN NEXT;
        ELSE
          status := 'FAIL';
          details := format('Found %s orphaned record(s) where %I does not exist in %I.%I.', v_violation_count, r.src_col, r.tgt_schem, r.tgt_tbl);
          IF r.src_tbl = 'orders' THEN
            action_needed := 'Investigate order user_id. Do NOT delete or reassign orders.';
          ELSE
            action_needed := format('Investigate orphaned rows in %I.%I before running migration.', r.src_schem, r.src_tbl);
          END IF;
          RETURN NEXT;
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- 4.2 Explicit Order Owner Profile Coverage Check
  category := '4. FOREIGN_KEY_INTEGRITY';
  check_name := 'orders.user_id profile link';
  IF to_regclass('public.orders') IS NOT NULL AND to_regclass('public.profiles') IS NOT NULL AND to_regclass('auth.users') IS NOT NULL THEN
    SELECT count(*) INTO v_violation_count 
    FROM public.orders o
    WHERE o.user_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = o.user_id);

    IF v_violation_count = 0 THEN
      status := 'PASS';
      details := 'All order owners have a matching public.profiles record.';
      action_needed := 'None.';
    ELSE
      -- Check if they exist in auth.users
      SELECT count(*) INTO v_row_count
      FROM public.orders o
      JOIN auth.users u ON u.id = o.user_id
      WHERE o.user_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = o.user_id);

      IF v_row_count = v_violation_count THEN
        status := 'INFO';
        details := format('Found %s order(s) belonging to valid auth.users who do not have a public.profiles row yet (e.g. user 4e0b3e34...). schema.sql will safely insert their profile.', v_violation_count);
        action_needed := 'None. schema.sql creates the profile automatically; no orders need deletion or reassignment.';
      ELSE
        status := 'FAIL';
        details := format('Found %s order(s) where user_id does not exist in auth.users.', (v_violation_count - v_row_count));
        action_needed := 'Investigate dangling order user_id. Do not delete without administrative review.';
      END IF;
    END IF;
    RETURN NEXT;
  END IF;


  -- ==========================================================================
  -- 5. VALUE & ENUM CONSTRAINTS (CHECK Constraints)
  -- ==========================================================================
  -- 5.1 profiles.role
  category := '5. VALUE_CONSTRAINTS';
  check_name := 'profiles.role IN (buyer, artist, admin)';
  IF to_regclass('public.profiles') IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    SELECT count(*) INTO v_violation_count FROM public.profiles 
    WHERE role IS NOT NULL AND role NOT IN ('buyer', 'artist', 'admin');
    IF v_violation_count = 0 THEN
      status := 'PASS';
      details := 'All non-null role values are valid.';
      action_needed := 'None.';
    ELSE
      status := 'FAIL';
      details := format('Found %s profile(s) with invalid role values.', v_violation_count);
      action_needed := 'Update invalid roles to buyer, artist, or admin.';
    END IF;
  ELSE
    status := 'SKIPPED';
    details := 'Table profiles or column role absent.';
    action_needed := 'None.';
  END IF;
  RETURN NEXT;

  -- 5.2 artist_profiles.verification_status
  category := '5. VALUE_CONSTRAINTS';
  check_name := 'artist_profiles.verification_status IN (pending, verified, rejected)';
  IF to_regclass('public.artist_profiles') IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'artist_profiles' AND column_name = 'verification_status'
  ) THEN
    SELECT count(*) INTO v_violation_count FROM public.artist_profiles 
    WHERE verification_status IS NOT NULL AND verification_status NOT IN ('pending', 'verified', 'rejected');
    IF v_violation_count = 0 THEN
      status := 'PASS';
      details := 'All non-null verification_status values are valid.';
      action_needed := 'None.';
    ELSE
      status := 'FAIL';
      details := format('Found %s artist profile(s) with invalid verification_status.', v_violation_count);
      action_needed := 'Update invalid status to pending, verified, or rejected.';
    END IF;
  ELSE
    status := 'SKIPPED';
    details := 'Table artist_profiles or column verification_status absent.';
    action_needed := 'None.';
  END IF;
  RETURN NEXT;

  -- 5.3 artworks.status
  category := '5. VALUE_CONSTRAINTS';
  check_name := 'artworks.status IN (draft, published, archived)';
  IF to_regclass('public.artworks') IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'artworks' AND column_name = 'status'
  ) THEN
    SELECT count(*) INTO v_violation_count FROM public.artworks 
    WHERE status IS NOT NULL AND status NOT IN ('draft', 'published', 'archived');
    IF v_violation_count = 0 THEN
      status := 'PASS';
      details := 'All non-null artwork status values are valid.';
      action_needed := 'None.';
    ELSE
      status := 'FAIL';
      details := format('Found %s artwork(s) with invalid status.', v_violation_count);
      action_needed := 'Update status to draft, published, or archived.';
    END IF;
  ELSE
    status := 'SKIPPED';
    details := 'Table artworks or column status absent.';
    action_needed := 'None.';
  END IF;
  RETURN NEXT;

  -- 5.4 orders.status
  category := '5. VALUE_CONSTRAINTS';
  check_name := 'orders.status IN (Pending, Processing, Shipped, Delivered, Cancelled)';
  IF to_regclass('public.orders') IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'status'
  ) THEN
    SELECT count(*) INTO v_violation_count FROM public.orders 
    WHERE status IS NOT NULL AND status NOT IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled');
    IF v_violation_count = 0 THEN
      status := 'PASS';
      details := 'All non-null order status values are valid (legacy NULLs permitted).';
      action_needed := 'None.';
    ELSE
      status := 'FAIL';
      details := format('Found %s order(s) with invalid status.', v_violation_count);
      action_needed := 'Update status to Pending, Processing, Shipped, Delivered, or Cancelled.';
    END IF;
  ELSE
    status := 'SKIPPED';
    details := 'Table orders or column status absent.';
    action_needed := 'None.';
  END IF;
  RETURN NEXT;

  -- 5.5 orders.payment_status
  category := '5. VALUE_CONSTRAINTS';
  check_name := 'orders.payment_status IN (pending, paid, failed, refunded)';
  IF to_regclass('public.orders') IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    SELECT count(*) INTO v_violation_count FROM public.orders 
    WHERE payment_status IS NOT NULL AND payment_status NOT IN ('pending', 'paid', 'failed', 'refunded');
    IF v_violation_count = 0 THEN
      status := 'PASS';
      details := 'All non-null payment_status values are valid (legacy NULLs permitted).';
      action_needed := 'None.';
    ELSE
      status := 'FAIL';
      details := format('Found %s order(s) with invalid payment_status.', v_violation_count);
      action_needed := 'Update payment_status to pending, paid, failed, or refunded.';
    END IF;
  ELSE
    status := 'SKIPPED';
    details := 'Table orders or column payment_status absent.';
    action_needed := 'None.';
  END IF;
  RETURN NEXT;

  -- 5.6 Non-negative numeric sanity checks
  -- artworks.price
  category := '5. VALUE_CONSTRAINTS';
  check_name := 'artworks.price >= 0';
  IF to_regclass('public.artworks') IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'artworks' AND column_name = 'price'
  ) THEN
    SELECT count(*) INTO v_violation_count FROM public.artworks WHERE price IS NOT NULL AND price < 0;
    IF v_violation_count = 0 THEN
      status := 'PASS';
      details := 'No negative prices found.';
      action_needed := 'None.';
    ELSE
      status := 'WARN';
      details := format('Found %s artwork(s) with negative price.', v_violation_count);
      action_needed := 'Correct negative artwork prices.';
    END IF;
  ELSE
    status := 'SKIPPED';
    details := 'Table artworks or column price absent.';
    action_needed := 'None.';
  END IF;
  RETURN NEXT;

  -- orders.total
  category := '5. VALUE_CONSTRAINTS';
  check_name := 'orders.total >= 0';
  IF to_regclass('public.orders') IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total'
  ) THEN
    SELECT count(*) INTO v_violation_count FROM public.orders WHERE total IS NOT NULL AND total < 0;
    IF v_violation_count = 0 THEN
      status := 'PASS';
      details := 'No negative order totals found.';
      action_needed := 'None.';
    ELSE
      status := 'WARN';
      details := format('Found %s order(s) with negative total.', v_violation_count);
      action_needed := 'Correct negative order totals.';
    END IF;
  ELSE
    status := 'SKIPPED';
    details := 'Table orders or column total absent.';
    action_needed := 'None.';
  END IF;
  RETURN NEXT;


  -- ==========================================================================
  -- 6. UNIQUE CONSTRAINTS (Duplicate Key Checks)
  -- ==========================================================================
  -- 6.1 artworks.slug
  category := '6. UNIQUE_CONSTRAINTS';
  check_name := 'Unique artworks.slug';
  IF to_regclass('public.artworks') IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'artworks' AND column_name = 'slug'
  ) THEN
    SELECT count(*) INTO v_violation_count FROM (
      SELECT slug FROM public.artworks WHERE slug IS NOT NULL GROUP BY slug HAVING count(*) > 1
    ) t;
    IF v_violation_count = 0 THEN
      status := 'PASS';
      details := 'No duplicate slug values found.';
      action_needed := 'None.';
    ELSE
      status := 'FAIL';
      details := format('Found %s duplicate slug group(s).', v_violation_count);
      action_needed := 'Deduplicate artwork slugs before running schema.sql.';
    END IF;
  ELSE
    status := 'SKIPPED';
    details := 'Table artworks or column slug absent.';
    action_needed := 'None.';
  END IF;
  RETURN NEXT;

  -- 6.2 orders.order_ref
  category := '6. UNIQUE_CONSTRAINTS';
  check_name := 'Unique orders.order_ref';
  IF to_regclass('public.orders') IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'order_ref'
  ) THEN
    SELECT count(*) INTO v_violation_count FROM (
      SELECT order_ref FROM public.orders WHERE order_ref IS NOT NULL GROUP BY order_ref HAVING count(*) > 1
    ) t;
    IF v_violation_count = 0 THEN
      status := 'PASS';
      details := 'No duplicate order_ref values found.';
      action_needed := 'None.';
    ELSE
      status := 'FAIL';
      details := format('Found %s duplicate order_ref group(s).', v_violation_count);
      action_needed := 'Deduplicate order_ref values before running schema.sql.';
    END IF;
  ELSE
    status := 'SKIPPED';
    details := 'Table orders or column order_ref absent.';
    action_needed := 'None.';
  END IF;
  RETURN NEXT;

  -- 6.3 orders.payment_id (Payment Idempotency)
  category := '6. UNIQUE_CONSTRAINTS';
  check_name := 'Unique orders.payment_id';
  IF to_regclass('public.orders') IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_id'
  ) THEN
    SELECT count(*) INTO v_violation_count FROM (
      SELECT payment_id FROM public.orders WHERE payment_id IS NOT NULL GROUP BY payment_id HAVING count(*) > 1
    ) t;
    IF v_violation_count = 0 THEN
      status := 'PASS';
      details := 'No duplicate payment_id values found. Database idempotency index safe to apply.';
      action_needed := 'None.';
    ELSE
      status := 'FAIL';
      details := format('Found %s duplicate payment_id group(s).', v_violation_count);
      action_needed := 'Deduplicate orders.payment_id before applying unique idempotency index.';
    END IF;
  ELSE
    status := 'SKIPPED';
    details := 'Table orders or column payment_id absent.';
    action_needed := 'None.';
  END IF;
  RETURN NEXT;

  -- 6.4 orders.razorpay_payment_id (Payment Idempotency)
  category := '6. UNIQUE_CONSTRAINTS';
  check_name := 'Unique orders.razorpay_payment_id';
  IF to_regclass('public.orders') IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'razorpay_payment_id'
  ) THEN
    SELECT count(*) INTO v_violation_count FROM (
      SELECT razorpay_payment_id FROM public.orders WHERE razorpay_payment_id IS NOT NULL GROUP BY razorpay_payment_id HAVING count(*) > 1
    ) t;
    IF v_violation_count = 0 THEN
      status := 'PASS';
      details := 'No duplicate razorpay_payment_id values found. Database idempotency index safe to apply.';
      action_needed := 'None.';
    ELSE
      status := 'FAIL';
      details := format('Found %s duplicate razorpay_payment_id group(s).', v_violation_count);
      action_needed := 'Deduplicate orders.razorpay_payment_id before applying unique idempotency index.';
    END IF;
  ELSE
    status := 'SKIPPED';
    details := 'Table orders or column razorpay_payment_id absent.';
    action_needed := 'None.';
  END IF;
  RETURN NEXT;

  -- 6.5 wishlists(user_id, artwork_id)
  category := '6. UNIQUE_CONSTRAINTS';
  check_name := 'Unique wishlists(user_id, artwork_id)';
  IF to_regclass('public.wishlists') IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'user_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wishlists' AND column_name = 'artwork_id'
  ) THEN
    SELECT count(*) INTO v_violation_count FROM (
      SELECT user_id, artwork_id FROM public.wishlists 
      WHERE user_id IS NOT NULL AND artwork_id IS NOT NULL 
      GROUP BY user_id, artwork_id HAVING count(*) > 1
    ) t;
    IF v_violation_count = 0 THEN
      status := 'PASS';
      details := 'No duplicate (user_id, artwork_id) pairs found.';
      action_needed := 'None.';
    ELSE
      status := 'FAIL';
      details := format('Found %s duplicate wishlist pair(s).', v_violation_count);
      action_needed := 'Delete duplicate wishlist entries before running schema.sql.';
    END IF;
  ELSE
    status := 'SKIPPED';
    details := 'Table wishlists or columns absent.';
    action_needed := 'None.';
  END IF;
  RETURN NEXT;


  -- ==========================================================================
  -- 7. CONSTRAINT CATALOG CHECKS (pg_constraint)
  -- ==========================================================================
  FOR r IN (
    SELECT * FROM (VALUES
      ('public', 'profiles', 'profiles_id_fkey', 'f', 'FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('public', 'profiles', 'profiles_role_check', 'c', 'CHECK (role = ANY (ARRAY[''buyer''::text, ''artist''::text, ''admin''::text]))'),
      ('public', 'artist_profiles', 'artist_profiles_user_id_fkey', 'f', 'FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE'),
      ('public', 'artist_profiles', 'artist_profiles_verification_status_check', 'c', 'CHECK (verification_status = ANY (ARRAY[''pending''::text, ''verified''::text, ''rejected''::text]))'),
      ('public', 'artworks', 'artworks_artist_id_fkey', 'f', 'FOREIGN KEY (artist_id) REFERENCES artist_profiles(user_id) ON DELETE CASCADE'),
      ('public', 'artworks', 'artworks_slug_key', 'u', 'UNIQUE (slug)'),
      ('public', 'artworks', 'artworks_status_check', 'c', 'CHECK (status = ANY (ARRAY[''draft''::text, ''published''::text, ''archived''::text]))'),
      ('public', 'wishlists', 'wishlists_user_id_fkey', 'f', 'FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE'),
      ('public', 'wishlists', 'wishlists_artwork_id_fkey', 'f', 'FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE'),
      ('public', 'wishlists', 'wishlists_user_artwork_unique', 'u', 'UNIQUE (user_id, artwork_id)'),
      ('public', 'orders', 'orders_user_id_fkey', 'f', 'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'),
      ('public', 'orders', 'orders_order_ref_key', 'u', 'UNIQUE (order_ref)'),
      ('public', 'orders', 'orders_status_check', 'c', 'CHECK (status = ANY (ARRAY[''Pending''::text, ''Processing''::text, ''Shipped''::text, ''Delivered''::text, ''Cancelled''::text]))'),
      ('public', 'orders', 'orders_payment_status_check', 'c', 'CHECK (payment_status = ANY (ARRAY[''pending''::text, ''paid''::text, ''failed''::text, ''refunded''::text]))'),
      ('public', 'order_items', 'order_items_order_id_fkey', 'f', 'FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE'),
      ('public', 'order_items', 'order_items_artwork_id_fkey', 'f', 'FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE SET NULL'),
      ('public', 'order_items', 'order_items_artist_id_fkey', 'f', 'FOREIGN KEY (artist_id) REFERENCES artist_profiles(user_id) ON DELETE SET NULL')
    ) AS cn(schem, tbl, con_name, con_type, expected_def)
  ) LOOP
    category := '7. CONSTRAINT_CATALOG';
    check_name := format('%I.%I -> %s', r.schem, r.tbl, r.con_name);
    v_constraint_def := NULL;

    v_table_exists := (to_regclass(quote_ident(r.schem) || '.' || quote_ident(r.tbl)) IS NOT NULL);
    IF NOT v_table_exists THEN
      status := 'SKIPPED';
      details := format('Table %I.%I does not exist yet.', r.schem, r.tbl);
      action_needed := 'None (schema.sql will create table and constraint).';
      RETURN NEXT;
    ELSE
      SELECT pg_get_constraintdef(c.oid) INTO v_constraint_def
      FROM pg_constraint c
      WHERE c.conname = r.con_name AND c.conrelid = (quote_ident(r.schem) || '.' || quote_ident(r.tbl))::regclass;

      IF v_constraint_def IS NOT NULL THEN
        IF r.con_name = 'profiles_role_check' AND v_constraint_def NOT LIKE '%admin%' THEN
          status := 'WARN';
          details := format('Constraint exists with legacy 2-role definition: %s. schema.sql will replace it with 3-role check.', v_constraint_def);
          action_needed := 'schema.sql will upgrade this constraint.';
        ELSE
          status := 'PASS';
          details := format('Constraint already exists: %s', v_constraint_def);
          action_needed := 'None (schema.sql will safely preserve or replace it).';
        END IF;
        RETURN NEXT;
      ELSE
        status := 'INFO';
        details := format('Constraint not yet applied on %I.%I. schema.sql will add it.', r.schem, r.tbl);
        action_needed := 'None.';
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;


  -- ==========================================================================
  -- 8. STORAGE CONFIGURATION CHECKS
  -- ==========================================================================
  category := '8. STORAGE_CONFIG';
  check_name := 'Bucket artworks privacy status';

  -- Tier 1: Check if storage schema exists in pg_namespace
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    status := 'FAIL';
    details := 'Schema "storage" does not exist in pg_namespace. Storage service is disabled or uninstalled.';
    action_needed := 'Enable the Supabase Storage service in your project settings.';
    RETURN NEXT;
  -- Tier 2: Check if storage.buckets table exists in pg_class
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE n.nspname = 'storage' AND c.relname = 'buckets'
  ) THEN
    status := 'FAIL';
    details := 'Schema "storage" exists, but table "storage.buckets" is absent from pg_class. Storage tables have not been provisioned yet.';
    action_needed := 'Open the Supabase Dashboard -> Storage tab and create a bucket (or click New Bucket) to trigger Storage schema provisioning.';
    RETURN NEXT;
  -- Tier 3: Check if current user has SELECT privilege on storage.buckets
  ELSIF NOT has_table_privilege(current_user, 'storage.buckets', 'SELECT') THEN
    status := 'WARN';
    details := format('Table storage.buckets exists, but role %I lacks SELECT privilege.', current_user);
    action_needed := 'Grant SELECT on storage.buckets to the current SQL execution role.';
    RETURN NEXT;
  -- Tier 4: Query bucket artworks directly
  ELSE
    SELECT public INTO v_public FROM storage.buckets WHERE id = 'artworks';
    IF v_public IS NULL THEN
      status := 'INFO';
      details := 'Bucket "artworks" does not exist yet. schema.sql will create it as public.';
      action_needed := 'None (schema.sql creates it).';
    ELSIF v_public = true THEN
      status := 'PASS';
      details := 'Bucket "artworks" exists and is PUBLIC. Marketplace preview images remain accessible.';
      action_needed := 'None.';
    ELSE
      status := 'INFO';
      details := 'Bucket "artworks" exists and is PRIVATE. schema.sql will set public = true for Phase 2 image compatibility.';
      action_needed := 'None (schema.sql sets public = true).';
    END IF;
    RETURN NEXT;
  END IF;

  -- 8.2 Storage objects directory structure
  category := '8. STORAGE_CONFIG';
  check_name := 'Artwork files folder isolation';
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE n.nspname = 'storage' AND c.relname = 'objects'
  ) AND has_table_privilege(current_user, 'storage.objects', 'SELECT') THEN
    -- Check if any files are stored in the root of the artworks bucket or outside artist UUID directories
    SELECT count(*) INTO v_violation_count 
    FROM storage.objects 
    WHERE bucket_id = 'artworks' AND (
      name NOT LIKE '%/%'
      OR split_part(name, '/', 1) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    );

    IF v_violation_count = 0 THEN
      SELECT count(*) INTO v_row_count FROM storage.objects WHERE bucket_id = 'artworks';
      status := 'PASS';
      details := format('All files in artworks bucket (%s total) are correctly organized under artist UUID directory folders.', v_row_count);
      action_needed := 'None.';
    ELSE
      status := 'INFO';
      details := format('Found %s file(s) in artworks bucket without artist user_id directory prefix. Public access allows these to be served in Phase 2.', v_violation_count);
      action_needed := 'Recommended: organize future uploads under <artist_user_id>/... paths.';
    END IF;
  ELSE
    status := 'SKIPPED';
    details := 'storage.objects table is either absent or not accessible by current role.';
    action_needed := 'None if Storage is uninitialized.';
  END IF;
  RETURN NEXT;

  -- 8.3 Public artwork storage policy check
  category := '8. STORAGE_CONFIG';
  check_name := 'Public artwork storage policy';
  SELECT count(*) INTO v_policy_count FROM pg_policies 
  WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Artwork images are publicly accessible';
  IF v_policy_count > 0 THEN
    status := 'PASS';
    details := 'Policy "Artwork images are publicly accessible" is present, ensuring public access to artwork preview images.';
    action_needed := 'None.';
  ELSE
    status := 'INFO';
    details := 'Policy "Artwork images are publicly accessible" is not yet present. schema.sql will create it.';
    action_needed := 'None (schema.sql creates it).';
  END IF;
  RETURN NEXT;


  -- ==========================================================================
  -- 9. ROW LEVEL SECURITY & POLICY CONFLICTS
  -- ==========================================================================
  FOR r IN (
    SELECT * FROM (VALUES
      ('public', 'profiles'),
      ('public', 'artist_profiles'),
      ('public', 'artworks'),
      ('public', 'wishlists'),
      ('public', 'orders'),
      ('public', 'order_items')
    ) AS p(schem, tbl)
  ) LOOP
    category := '9. RLS_AND_POLICIES';
    check_name := format('RLS enabled on %I.%I', r.schem, r.tbl);

    v_table_exists := (to_regclass(quote_ident(r.schem) || '.' || quote_ident(r.tbl)) IS NOT NULL);
    IF NOT v_table_exists THEN
      status := 'SKIPPED';
      details := format('Table %I.%I does not exist yet.', r.schem, r.tbl);
      action_needed := 'None (schema.sql will enable RLS upon creation).';
      RETURN NEXT;
    ELSE
      SELECT rowsecurity INTO v_rls_enabled FROM pg_tables WHERE schemaname = r.schem AND tablename = r.tbl;
      IF v_rls_enabled THEN
        status := 'PASS';
        details := 'Row Level Security is currently ENABLED.';
        action_needed := 'None.';
      ELSE
        status := 'WARN';
        details := 'Row Level Security is currently DISABLED. schema.sql will enable it.';
        action_needed := 'None (schema.sql enables RLS).';
      END IF;
      RETURN NEXT;
    END IF;
  END LOOP;

  -- 9.2 Client write policy on orders (Security lockdown check)
  category := '9. RLS_AND_POLICIES';
  check_name := 'Lockdown on orders client INSERT/UPDATE';
  IF to_regclass('public.orders') IS NOT NULL THEN
    SELECT count(*) INTO v_policy_count FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'orders' 
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND ('anon' = ANY(roles) OR 'authenticated' = ANY(roles) OR 'public' = ANY(roles));
    IF v_policy_count > 0 THEN
      status := 'WARN';
      details := format('Found %s existing policy allowing client writes on orders. schema.sql replaces these with read-only client access.', v_policy_count);
      action_needed := 'Be aware that client-side orders.insert() in app/checkout/page.tsx will stop working; server-side checkout handler required.';
    ELSE
      status := 'PASS';
      details := 'No direct client write policies on orders.';
      action_needed := 'None.';
    END IF;
  ELSE
    status := 'SKIPPED';
    details := 'Table orders does not exist yet.';
    action_needed := 'None.';
  END IF;
  RETURN NEXT;

  -- 9.3 Triggers check
  category := '9. RLS_AND_POLICIES';
  check_name := 'Existing auth & security triggers';
  SELECT count(*) INTO v_violation_count FROM information_schema.triggers 
  WHERE trigger_name IN ('on_auth_user_created', 'ensure_profile_role_protected', 'ensure_artist_profile_protected');
  status := 'INFO';
  details := format('%s of 3 target triggers currently present in database. schema.sql will replace them idempotently.', v_violation_count);
  action_needed := 'None.';
  RETURN NEXT;

END;
$func$ LANGUAGE plpgsql;

-- Execute the preflight diagnostic and display the results table
SELECT 
  category,
  check_name,
  status,
  details,
  action_needed
FROM pg_temp.run_kala_setu_preflight()
ORDER BY category, check_name;
