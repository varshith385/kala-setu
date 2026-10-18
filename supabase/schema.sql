-- PHASE 1: DATABASE MIGRATION SCRIPT
-- Kala Setu Marketplace Schema (Idempotent & Safe Preparation Revision)
-- Ensure this script executes entirely or fails cleanly without partial execution.
--
-- VERIFIED PRODUCTION PRECONDITIONS & POLICIES:
-- 1. public.profiles has no email column (email is managed in auth.users).
-- 2. profiles_role_check is upgraded from ('buyer', 'artist') to ('buyer', 'artist', 'admin').
-- 3. orders_user_id_fkey references auth.users(id).
-- 4. Missing profile for order owners (e.g. user 4e0b3e34...) is safely repaired without touching orders.
-- 5. orders.payment_id is strictly preserved; razorpay_payment_id is populated compatibly.
-- 6. orders.status and orders.payment_status are added nullable; legacy rows remain untouched.
-- 7. NOTE ON WORKFLOW COORDINATION: Removing client-side orders INSERT policy will require server-side
--    checkout order creation (app/checkout/page.tsx). Similarly, role protection trigger requires
--    server-side artist onboarding (app/signup/page.tsx).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- 0. BASE TABLE CREATION & COLUMN ADDITIONS
-- ==========================================
-- Creates base tables if they don't exist.
-- Adds columns if missing. Constraints are NOT applied here to avoid IF NOT EXISTS skipping.

CREATE TABLE IF NOT EXISTS public.profiles ( id uuid PRIMARY KEY );
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_image text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialties text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());
-- Explicit: public.profiles does NOT have an email column.

CREATE TABLE IF NOT EXISTS public.artist_profiles ( user_id uuid PRIMARY KEY );
ALTER TABLE public.artist_profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.artist_profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.artist_profiles ADD COLUMN IF NOT EXISTS profile_image text;
ALTER TABLE public.artist_profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.artist_profiles ADD COLUMN IF NOT EXISTS specialties text[];
ALTER TABLE public.artist_profiles ADD COLUMN IF NOT EXISTS experience text;
ALTER TABLE public.artist_profiles ADD COLUMN IF NOT EXISTS social_links jsonb;
ALTER TABLE public.artist_profiles ADD COLUMN IF NOT EXISTS verification_status text;
ALTER TABLE public.artist_profiles ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.artist_profiles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

CREATE TABLE IF NOT EXISTS public.artworks ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY );
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS artist_id uuid;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS price numeric;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS medium text;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS dimensions text;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS year integer;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS additional_images text[];
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS availability boolean DEFAULT true;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

CREATE TABLE IF NOT EXISTS public.wishlists ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY );
ALTER TABLE public.wishlists ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.wishlists ADD COLUMN IF NOT EXISTS artwork_id uuid;
ALTER TABLE public.wishlists ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

CREATE TABLE IF NOT EXISTS public.orders ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY );
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_ref text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items jsonb;
-- Explicitly preserve existing payment_id column from live database
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_order_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_payment_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_address text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

CREATE TABLE IF NOT EXISTS public.order_items ( id uuid DEFAULT gen_random_uuid() PRIMARY KEY );
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS order_id uuid;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS artwork_id uuid;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS artist_id uuid;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS quantity integer;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS price_at_purchase numeric;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS artwork_title text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS artwork_image text;

-- Reconcile payment_id non-destructively: copy to razorpay_payment_id ONLY if destination is NULL and source is non-NULL
UPDATE public.orders 
SET razorpay_payment_id = payment_id 
WHERE razorpay_payment_id IS NULL AND payment_id IS NOT NULL;

-- ==========================================
-- 1. EXPLICIT CONSTRAINT VALIDATION & ENFORCEMENT
-- ==========================================
-- This DO block strictly validates existing data BEFORE applying any NOT NULL, CHECK, UNIQUE, or FKEY.
-- It avoids "ADD COLUMN IF NOT EXISTS" constraint hiding, replaces outdated definitions deliberately,
-- and cleanly aborts on violating data without partial schema corruption.
DO $$
BEGIN
  -- ---------------------------------------------------------
  -- PROFILES
  -- ---------------------------------------------------------
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)) THEN
    RAISE EXCEPTION 'profiles: Orphaned id values not in auth.users.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey' AND conrelid = 'public.profiles'::regclass) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE role IS NOT NULL AND role NOT IN ('buyer', 'artist', 'admin')) THEN
    RAISE EXCEPTION 'profiles: Invalid role values. Manual fix required.';
  END IF;
  -- Deliberately drop existing 2-role check constraint to replace with 3-role check
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check' AND conrelid = 'public.profiles'::regclass) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('buyer', 'artist', 'admin'));
  ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'buyer';

  IF EXISTS (SELECT 1 FROM public.profiles WHERE role IS NULL) THEN
    RAISE EXCEPTION 'profiles: NULL role found. Manual review or backfill required before enforcing NOT NULL.';
  END IF;
  ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;

  -- ---------------------------------------------------------
  -- ARTIST_PROFILES
  -- ---------------------------------------------------------
  IF EXISTS (SELECT 1 FROM public.artist_profiles WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'artist_profiles: NULL user_id found. Manual fix required.';
  END IF;
  ALTER TABLE public.artist_profiles ALTER COLUMN user_id SET NOT NULL;

  IF EXISTS (SELECT 1 FROM public.artist_profiles ap WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ap.user_id)) THEN
    RAISE EXCEPTION 'artist_profiles: Orphaned user_id not in profiles. Manual fix required.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artist_profiles_user_id_fkey' AND conrelid = 'public.artist_profiles'::regclass) THEN
    ALTER TABLE public.artist_profiles ADD CONSTRAINT artist_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM public.artist_profiles WHERE verification_status IS NOT NULL AND verification_status NOT IN ('pending', 'verified', 'rejected')) THEN
    RAISE EXCEPTION 'artist_profiles: Invalid verification_status values. Manual fix required.';
  END IF;
  -- Deliberately drop and replace verification_status check
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artist_profiles_verification_status_check' AND conrelid = 'public.artist_profiles'::regclass) THEN
    ALTER TABLE public.artist_profiles DROP CONSTRAINT artist_profiles_verification_status_check;
  END IF;
  ALTER TABLE public.artist_profiles ADD CONSTRAINT artist_profiles_verification_status_check CHECK (verification_status IN ('pending', 'verified', 'rejected'));
  ALTER TABLE public.artist_profiles ALTER COLUMN verification_status SET DEFAULT 'pending';

  IF EXISTS (SELECT 1 FROM public.artist_profiles WHERE display_name IS NULL) THEN
    RAISE EXCEPTION 'artist_profiles: NULL display_name found. Manual backfill required.';
  END IF;
  ALTER TABLE public.artist_profiles ALTER COLUMN display_name SET DEFAULT 'Artist';
  ALTER TABLE public.artist_profiles ALTER COLUMN display_name SET NOT NULL;

  -- ---------------------------------------------------------
  -- ARTWORKS
  -- ---------------------------------------------------------
  IF EXISTS (SELECT 1 FROM public.artworks WHERE artist_id IS NULL) THEN
    RAISE EXCEPTION 'artworks: NULL artist_id values found. Manual backfill required.';
  END IF;
  ALTER TABLE public.artworks ALTER COLUMN artist_id SET NOT NULL;

  IF EXISTS (SELECT 1 FROM public.artworks a WHERE NOT EXISTS (SELECT 1 FROM public.artist_profiles ap WHERE ap.user_id = a.artist_id)) THEN
    RAISE EXCEPTION 'artworks: Orphaned artist_id not in artist_profiles. Manual fix required.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artworks_artist_id_fkey' AND conrelid = 'public.artworks'::regclass) THEN
    ALTER TABLE public.artworks ADD CONSTRAINT artworks_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artist_profiles(user_id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM public.artworks WHERE title IS NULL) THEN
    RAISE EXCEPTION 'artworks: NULL title values found. Manual backfill required.';
  END IF;
  ALTER TABLE public.artworks ALTER COLUMN title SET NOT NULL;

  IF EXISTS (SELECT 1 FROM public.artworks WHERE slug IS NULL) THEN
    RAISE EXCEPTION 'artworks: NULL slug values found. Manual backfill required.';
  END IF;
  ALTER TABLE public.artworks ALTER COLUMN slug SET NOT NULL;

  IF EXISTS (SELECT slug FROM public.artworks GROUP BY slug HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'artworks: Duplicate slug values found. Cannot add UNIQUE constraint.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artworks_slug_key' AND conrelid = 'public.artworks'::regclass) THEN
    ALTER TABLE public.artworks ADD CONSTRAINT artworks_slug_key UNIQUE (slug);
  END IF;

  IF EXISTS (SELECT 1 FROM public.artworks WHERE price IS NULL) THEN
    RAISE EXCEPTION 'artworks: NULL price values found. Manual backfill required.';
  END IF;
  ALTER TABLE public.artworks ALTER COLUMN price SET DEFAULT 0;
  ALTER TABLE public.artworks ALTER COLUMN price SET NOT NULL;

  IF EXISTS (SELECT 1 FROM public.artworks WHERE image_url IS NULL) THEN
    RAISE EXCEPTION 'artworks: NULL image_url values found. Manual backfill required.';
  END IF;
  ALTER TABLE public.artworks ALTER COLUMN image_url SET NOT NULL;

  IF EXISTS (SELECT 1 FROM public.artworks WHERE status IS NOT NULL AND status NOT IN ('draft', 'published', 'archived')) THEN
    RAISE EXCEPTION 'artworks: Invalid status values. Manual fix required.';
  END IF;
  -- Deliberately drop and replace artworks_status_check
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artworks_status_check' AND conrelid = 'public.artworks'::regclass) THEN
    ALTER TABLE public.artworks DROP CONSTRAINT artworks_status_check;
  END IF;
  ALTER TABLE public.artworks ADD CONSTRAINT artworks_status_check CHECK (status IN ('draft', 'published', 'archived'));
  ALTER TABLE public.artworks ALTER COLUMN status SET DEFAULT 'draft';

  -- ---------------------------------------------------------
  -- WISHLISTS
  -- ---------------------------------------------------------
  IF EXISTS (SELECT 1 FROM public.wishlists WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'wishlists: NULL user_id values found. Manual backfill required.';
  END IF;
  ALTER TABLE public.wishlists ALTER COLUMN user_id SET NOT NULL;

  IF EXISTS (SELECT 1 FROM public.wishlists w WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = w.user_id)) THEN
    RAISE EXCEPTION 'wishlists: Orphaned user_id not in profiles. Manual fix required.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wishlists_user_id_fkey' AND conrelid = 'public.wishlists'::regclass) THEN
    ALTER TABLE public.wishlists ADD CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM public.wishlists WHERE artwork_id IS NULL) THEN
    RAISE EXCEPTION 'wishlists: NULL artwork_id values found. Manual backfill required.';
  END IF;
  ALTER TABLE public.wishlists ALTER COLUMN artwork_id SET NOT NULL;

  IF EXISTS (SELECT 1 FROM public.wishlists w WHERE NOT EXISTS (SELECT 1 FROM public.artworks a WHERE a.id = w.artwork_id)) THEN
    RAISE EXCEPTION 'wishlists: Orphaned artwork_id not in artworks. Manual fix required.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wishlists_artwork_id_fkey' AND conrelid = 'public.wishlists'::regclass) THEN
    ALTER TABLE public.wishlists ADD CONSTRAINT wishlists_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES public.artworks(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT user_id, artwork_id FROM public.wishlists GROUP BY user_id, artwork_id HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'wishlists: Duplicate user_id/artwork_id combinations found.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wishlists_user_artwork_unique' AND conrelid = 'public.wishlists'::regclass) THEN
    ALTER TABLE public.wishlists ADD CONSTRAINT wishlists_user_artwork_unique UNIQUE (user_id, artwork_id);
  END IF;

  -- ---------------------------------------------------------
  -- ORDERS
  -- ---------------------------------------------------------
  -- 1. Validate foreign key integrity against auth.users(id)
  IF EXISTS (SELECT 1 FROM public.orders o WHERE o.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = o.user_id)) THEN
    RAISE EXCEPTION 'orders: Orphaned user_id not found in auth.users.';
  END IF;

  -- 2. Preserve or create orders_user_id_fkey referencing auth.users(id)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_user_id_fkey' AND conrelid = 'public.orders'::regclass) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- 3. Explicit profile-integrity check & safe repair:
  -- Ensure any Auth user with existing orders has a matching profile in public.profiles.
  -- This safely repairs user 4e0b3e34-a76a-4690-995d-30add9413a09 without modifying, reassigning, or deleting any orders.
  INSERT INTO public.profiles (id, role)
  SELECT DISTINCT o.user_id, 'buyer'
  FROM public.orders o
  JOIN auth.users u ON u.id = o.user_id
  LEFT JOIN public.profiles p ON p.id = o.user_id
  WHERE o.user_id IS NOT NULL AND p.id IS NULL
  ON CONFLICT (id) DO NOTHING;

  -- Verify all orders with user_id now have a corresponding profile
  IF EXISTS (SELECT 1 FROM public.orders o WHERE o.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = o.user_id)) THEN
    RAISE EXCEPTION 'orders: Order owner could not be linked to public.profiles.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.orders WHERE order_ref IS NULL) THEN
    RAISE EXCEPTION 'orders: NULL order_ref found. Manual backfill required.';
  END IF;
  ALTER TABLE public.orders ALTER COLUMN order_ref SET DEFAULT gen_random_uuid()::text;
  ALTER TABLE public.orders ALTER COLUMN order_ref SET NOT NULL;

  IF EXISTS (SELECT order_ref FROM public.orders GROUP BY order_ref HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'orders: Duplicate order_ref values found. Cannot add UNIQUE constraint.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_ref_key' AND conrelid = 'public.orders'::regclass) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_order_ref_key UNIQUE (order_ref);
  END IF;

  IF EXISTS (SELECT 1 FROM public.orders WHERE total IS NULL) THEN
    RAISE EXCEPTION 'orders: NULL total found. Manual backfill required.';
  END IF;
  ALTER TABLE public.orders ALTER COLUMN total SET DEFAULT 0;
  ALTER TABLE public.orders ALTER COLUMN total SET NOT NULL;

  -- Validate existing non-null status values
  IF EXISTS (SELECT 1 FROM public.orders WHERE status IS NOT NULL AND status NOT IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')) THEN
    RAISE EXCEPTION 'orders: Invalid status values. Manual fix required.';
  END IF;
  -- Deliberately replace orders_status_check; explicitly allows NULL for legacy rows
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check' AND conrelid = 'public.orders'::regclass) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
  END IF;
  ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IS NULL OR status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'));
  -- Default for future rows only; legacy rows remain nullable/unfabricated
  ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'Pending';

  -- Validate existing non-null payment_status values
  IF EXISTS (SELECT 1 FROM public.orders WHERE payment_status IS NOT NULL AND payment_status NOT IN ('pending', 'paid', 'failed', 'refunded')) THEN
    RAISE EXCEPTION 'orders: Invalid payment_status values. Manual fix required.';
  END IF;
  -- Deliberately replace orders_payment_status_check; explicitly allows NULL for legacy rows
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check' AND conrelid = 'public.orders'::regclass) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_payment_status_check;
  END IF;
  ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IS NULL OR payment_status IN ('pending', 'paid', 'failed', 'refunded'));
  -- Default for future rows only; legacy rows remain nullable/unfabricated
  ALTER TABLE public.orders ALTER COLUMN payment_status SET DEFAULT 'pending';

  -- Idempotency protection: enforce unique payment_id and razorpay_payment_id for non-null values
  -- This prevents duplicate order insertion on payment retries or network replays.
  IF EXISTS (SELECT payment_id FROM public.orders WHERE payment_id IS NOT NULL GROUP BY payment_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'orders: Duplicate payment_id values found in existing records. Manual deduplication required.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'orders_payment_id_unique_idx' AND tablename = 'orders' AND schemaname = 'public') THEN
    CREATE UNIQUE INDEX orders_payment_id_unique_idx ON public.orders (payment_id) WHERE payment_id IS NOT NULL;
  END IF;

  IF EXISTS (SELECT razorpay_payment_id FROM public.orders WHERE razorpay_payment_id IS NOT NULL GROUP BY razorpay_payment_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'orders: Duplicate razorpay_payment_id values found in existing records. Manual deduplication required.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'orders_razorpay_payment_id_unique_idx' AND tablename = 'orders' AND schemaname = 'public') THEN
    CREATE UNIQUE INDEX orders_razorpay_payment_id_unique_idx ON public.orders (razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
  END IF;

  -- ---------------------------------------------------------
  -- ORDER_ITEMS
  -- ---------------------------------------------------------
  IF EXISTS (SELECT 1 FROM public.order_items WHERE order_id IS NULL) THEN
    RAISE EXCEPTION 'order_items: NULL order_id found. Manual backfill required.';
  END IF;
  ALTER TABLE public.order_items ALTER COLUMN order_id SET NOT NULL;

  IF EXISTS (SELECT 1 FROM public.order_items oi WHERE NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = oi.order_id)) THEN
    RAISE EXCEPTION 'order_items: Orphaned order_id not in orders. Manual fix required.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_order_id_fkey' AND conrelid = 'public.order_items'::regclass) THEN
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.artwork_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.artworks a WHERE a.id = oi.artwork_id)) THEN
    RAISE EXCEPTION 'order_items: Orphaned artwork_id not in artworks. Manual fix required.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_artwork_id_fkey' AND conrelid = 'public.order_items'::regclass) THEN
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES public.artworks(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.artist_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.artist_profiles ap WHERE ap.user_id = oi.artist_id)) THEN
    RAISE EXCEPTION 'order_items: Orphaned artist_id not in artist_profiles. Manual fix required.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_artist_id_fkey' AND conrelid = 'public.order_items'::regclass) THEN
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artist_profiles(user_id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.order_items WHERE quantity IS NULL) THEN
    RAISE EXCEPTION 'order_items: NULL quantity found. Manual backfill required.';
  END IF;
  ALTER TABLE public.order_items ALTER COLUMN quantity SET DEFAULT 1;
  ALTER TABLE public.order_items ALTER COLUMN quantity SET NOT NULL;

  IF EXISTS (SELECT 1 FROM public.order_items WHERE price_at_purchase IS NULL) THEN
    RAISE EXCEPTION 'order_items: NULL price_at_purchase found. Manual backfill required.';
  END IF;
  ALTER TABLE public.order_items ALTER COLUMN price_at_purchase SET DEFAULT 0;
  ALTER TABLE public.order_items ALTER COLUMN price_at_purchase SET NOT NULL;

END $$;

-- ==========================================
-- 2. SECURITY DEFINER HELPERS & RPCS
-- ==========================================

-- Assumes this function is created by the `postgres` role (standard in Supabase SQL Editor / Migrations).
-- Because `postgres` is a superuser with BYPASSRLS, this safely avoids infinite recursion when querying the profiles table.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  v_role text;
  v_jwt_role text;
BEGIN
  -- 1. Direct superuser / migration / SQL Editor session
  -- session_user is the role that initiated the connection (unaffected by SECURITY DEFINER).
  -- In PostgREST, session_user is 'authenticator', so web/API callers NEVER match this branch.
  IF session_user IN ('postgres', 'supabase_admin') THEN
    v_jwt_role := coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), '');
    IF v_jwt_role = '' OR v_jwt_role = 'service_role' THEN
      RETURN true;
    END IF;
  END IF;

  -- 2. Service role execution context from Supabase server SDK / API
  -- Authenticated and set by PostgREST via verified service-role JWT.
  IF coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), '') = 'service_role' THEN
    RETURN true;
  END IF;

  -- 3. Authenticated end-user: inspect confirmed profile role
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    RETURN coalesce(v_role = 'admin', false);
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke default public execution to prevent general abuse.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
-- Grant explicitly to `anon` (required for RLS evaluation during public requests), `authenticated`, and `service_role`.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.admin_set_user_role(target_user_id uuid, new_role text)
RETURNS void AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to perform this action';
  END IF;
  IF new_role NOT IN ('buyer', 'artist', 'admin') THEN
    RAISE EXCEPTION 'Invalid role specified';
  END IF;
  UPDATE public.profiles SET role = new_role WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Strictly isolated to authenticated and service_role. Anonymous users CANNOT call admin RPCs.
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.admin_set_verification_status(target_artist_id uuid, new_status text)
RETURNS void AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to perform this action';
  END IF;
  IF new_status NOT IN ('pending', 'verified', 'rejected') THEN
    RAISE EXCEPTION 'Invalid verification status specified';
  END IF;
  UPDATE public.artist_profiles SET verification_status = new_status WHERE user_id = target_artist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Strictly isolated to authenticated and service_role. Anonymous users CANNOT call admin RPCs.
REVOKE EXECUTE ON FUNCTION public.admin_set_verification_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_verification_status(uuid, text) TO authenticated, service_role;


-- ==========================================
-- 3. TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_requested_role text;
  v_final_role text;
BEGIN
  -- Whitelist user-requested role from metadata: only 'artist' or 'buyer' permitted, NEVER 'admin'
  v_requested_role := coalesce(new.raw_user_meta_data->>'role', 'buyer');
  IF v_requested_role = 'artist' THEN
    v_final_role := 'artist';
  ELSE
    v_final_role := 'buyer';
  END IF;

  -- Insert only into confirmed columns: (id, role).
  -- Do not reference email as public.profiles does not have an email column.
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, v_final_role)
  ON CONFLICT (id) DO NOTHING;

  -- If registered as an artist, automatically provision initial pending artist_profile
  IF v_final_role = 'artist' THEN
    INSERT INTO public.artist_profiles (user_id, display_name, verification_status)
    VALUES (
      new.id,
      coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'Artist'),
      'pending'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Internal trigger function, public access not required
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
-- Granted to postgres (owner) and service roles that handle auth inserts
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role, postgres;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New profiles can only be 'buyer' or 'artist'. Self-assigning 'admin' is strictly forbidden.
    IF NEW.role NOT IN ('buyer', 'artist') THEN
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Not authorized to set profile role. New profiles cannot self-assign administrative roles.';
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Not authorized to change profile role. Use administrative mechanisms.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.protect_profile_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_profile_role() TO authenticated, service_role, postgres;

DROP TRIGGER IF EXISTS ensure_profile_role_protected ON public.profiles;
CREATE TRIGGER ensure_profile_role_protected
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_profile_role();


CREATE OR REPLACE FUNCTION public.protect_artist_profile()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.verification_status IS DISTINCT FROM 'pending' THEN
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Not authorized to set verification status. Initial status must be pending.';
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Cannot change user_id of an existing artist profile';
    END IF;
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Not authorized to change verification status. Use administrative mechanisms.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.protect_artist_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_artist_profile() TO authenticated, service_role, postgres;

DROP TRIGGER IF EXISTS ensure_artist_profile_protected ON public.artist_profiles;
CREATE TRIGGER ensure_artist_profile_protected
  BEFORE INSERT OR UPDATE ON public.artist_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_artist_profile();


-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- All policies DROP IF EXISTS to ensure idempotence.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (
  auth.uid() = id AND 
  (role IS NULL OR role = 'buyer')
);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin());


ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view verified artist profiles" ON public.artist_profiles;
DROP POLICY IF EXISTS "Artists can view own profile" ON public.artist_profiles;
DROP POLICY IF EXISTS "Artists can insert their own profile" ON public.artist_profiles;
DROP POLICY IF EXISTS "Artists can update their own profile" ON public.artist_profiles;
DROP POLICY IF EXISTS "Admins can manage artist profiles" ON public.artist_profiles;

CREATE POLICY "Public can view verified artist profiles" ON public.artist_profiles FOR SELECT USING (verification_status = 'verified');
CREATE POLICY "Artists can view own profile" ON public.artist_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Artists can insert their own profile" ON public.artist_profiles FOR INSERT WITH CHECK (
  auth.uid() = user_id AND 
  (verification_status IS NULL OR verification_status = 'pending') AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'artist')
);
CREATE POLICY "Artists can update their own profile" ON public.artist_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage artist profiles" ON public.artist_profiles FOR ALL USING (public.is_admin());


ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view published artworks by verified artists" ON public.artworks;
DROP POLICY IF EXISTS "Artists can view their own artworks" ON public.artworks;
DROP POLICY IF EXISTS "Artists can insert their own artworks" ON public.artworks;
DROP POLICY IF EXISTS "Artists can update their own artworks" ON public.artworks;
DROP POLICY IF EXISTS "Artists can delete their own artworks" ON public.artworks;

CREATE POLICY "Public can view published artworks by verified artists" ON public.artworks FOR SELECT USING (
  status = 'published' AND
  EXISTS (SELECT 1 FROM public.artist_profiles WHERE user_id = artworks.artist_id AND verification_status = 'verified')
);
CREATE POLICY "Artists can view their own artworks" ON public.artworks FOR SELECT USING (auth.uid() = artist_id);
CREATE POLICY "Artists can insert their own artworks" ON public.artworks FOR INSERT WITH CHECK (
  auth.uid() = artist_id AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'artist')
);
CREATE POLICY "Artists can update their own artworks" ON public.artworks FOR UPDATE USING (auth.uid() = artist_id);
CREATE POLICY "Artists can delete their own artworks" ON public.artworks FOR DELETE USING (auth.uid() = artist_id);


ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own wishlist" ON public.wishlists;
DROP POLICY IF EXISTS "Users can insert into their own wishlist" ON public.wishlists;
DROP POLICY IF EXISTS "Users can delete from their own wishlist" ON public.wishlists;

CREATE POLICY "Users can view their own wishlist" ON public.wishlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert into their own wishlist" ON public.wishlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete from their own wishlist" ON public.wishlists FOR DELETE USING (auth.uid() = user_id);


ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
-- INTENTIONAL SECURITY RESTRICTION: No INSERT/UPDATE/DELETE policies for orders. Server-side service key required.
-- WARNING: Frontend app/checkout/page.tsx directly performs browser-side orders.insert().
-- Browser-side inserts will be blocked by this policy until server-side order creation is deployed in Phase 2.


ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Artists can view their sold items" ON public.order_items;

CREATE POLICY "Users can view their own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Artists can view their sold items" ON public.order_items FOR SELECT USING (auth.uid() = artist_id);
-- INTENTIONAL SECURITY RESTRICTION: No INSERT/UPDATE/DELETE policies for order_items. Server-side service key required.


-- ==========================================
-- 5. STORAGE BUCKETS (PUBLIC IN PHASE 2)
-- ==========================================
-- In Phase 2, the 'artworks' bucket remains PUBLIC to preserve public access
-- to artwork listing previews while the frontend relies on public URLs.
-- Artist upload/edit/delete operations remain strictly isolated to the authenticated
-- artist's own user_id directory.

DO $$
BEGIN
  -- 5.1 Storage Buckets Provisioning
  IF EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE n.nspname = 'storage' AND c.relname = 'buckets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('artworks', 'artworks', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
  ELSE
    RAISE NOTICE 'storage.buckets table does not exist. Skipping bucket creation. Initialize Storage in Supabase Dashboard if artwork storage is required.';
  END IF;

  -- 5.2 Storage Objects Policies
  IF EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE n.nspname = 'storage' AND c.relname = 'objects'
  ) THEN
    -- Clean out existing storage policies
    EXECUTE 'DROP POLICY IF EXISTS "Artwork images are publicly accessible" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Artists can view their own artwork images" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Artists can upload their own artwork images" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Artists can update their own artwork images" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Artists can delete their own artwork images" ON storage.objects';

    -- 1. Public Read Access: Preserves existing marketplace preview images without requiring signed URLs
    EXECUTE 'CREATE POLICY "Artwork images are publicly accessible" ON storage.objects
      FOR SELECT USING (bucket_id = ''artworks'')';

    -- 2. Scoped Artist Write/Update/Delete: Artists can only upload and modify within their own user_id folder
    EXECUTE 'CREATE POLICY "Artists can upload their own artwork images" ON storage.objects FOR INSERT WITH CHECK (
      bucket_id = ''artworks'' AND
      (storage.foldername(name))[1] = auth.uid()::text AND
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''artist'')
    )';

    EXECUTE 'CREATE POLICY "Artists can update their own artwork images" ON storage.objects FOR UPDATE USING (
      bucket_id = ''artworks'' AND
      (storage.foldername(name))[1] = auth.uid()::text AND
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''artist'')
    )';

    EXECUTE 'CREATE POLICY "Artists can delete their own artwork images" ON storage.objects FOR DELETE USING (
      bucket_id = ''artworks'' AND
      (storage.foldername(name))[1] = auth.uid()::text AND
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''artist'')
    )';
  ELSE
    RAISE NOTICE 'storage.objects table does not exist. Skipping storage policies. Initialize Storage in Supabase Dashboard if artwork storage is required.';
  END IF;
END $$;

COMMIT;
