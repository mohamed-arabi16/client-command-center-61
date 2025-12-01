-- Migration: Fix Security Vulnerabilities
-- Date: 2025-12-01
-- Description:
--   1. Add SET search_path to SECURITY DEFINER functions (prevents search_path attacks)
--   2. Add expiration to shareable_links
--   3. Restrict content_posts updates by client users to status field only

-- ============================================================================
-- PART 1: Fix SECURITY DEFINER functions with mutable search paths
-- ============================================================================

-- Drop and recreate functions with proper search_path

-- 1. generate_contract_number
DROP FUNCTION IF EXISTS public.generate_contract_number(uuid);
CREATE FUNCTION public.generate_contract_number(p_client_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_client_name TEXT;
  v_count INTEGER;
  v_contract_number TEXT;
BEGIN
  -- Get client name (sanitize and limit length)
  SELECT UPPER(REGEXP_REPLACE(SUBSTRING(name FROM 1 FOR 10), '[^A-Za-z0-9]', '', 'g'))
  INTO v_client_name
  FROM public.clients
  WHERE id = p_client_id;

  IF v_client_name IS NULL OR v_client_name = '' THEN
    v_client_name := 'CLIENT';
  END IF;

  -- Get count of existing proposals for this client
  SELECT COUNT(*) INTO v_count
  FROM public.proposals
  WHERE client_id = p_client_id;

  -- Generate contract number
  v_contract_number := v_client_name || '-' || LPAD((v_count + 1)::TEXT, 3, '0');

  RETURN v_contract_number;
END;
$$;

-- 2. get_client_by_share_token
DROP FUNCTION IF EXISTS public.get_client_by_share_token(text);
CREATE FUNCTION public.get_client_by_share_token(share_token text)
RETURNS TABLE(
  id uuid,
  name text,
  logo_url text,
  status public.client_status,
  contract_type text,
  start_date date,
  total_contract_value numeric
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.logo_url, c.status, c.contract_type, c.start_date, c.total_contract_value
  FROM public.clients c
  INNER JOIN public.shareable_links sl ON sl.client_id = c.id
  WHERE sl.token = share_token
    AND sl.is_active = true
    AND (sl.expires_at IS NULL OR sl.expires_at > now());
END;
$$;

-- 3. get_proposal_by_share_token
DROP FUNCTION IF EXISTS public.get_proposal_by_share_token(text);
CREATE FUNCTION public.get_proposal_by_share_token(share_token text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  client_id uuid,
  client_name text,
  client_contact_person text,
  client_email text,
  client_phone text,
  client_address text,
  instagram_url text,
  status text,
  proposal_type text,
  total_value numeric,
  subtotal_before_discount numeric,
  discount_percentage numeric,
  discount_amount numeric,
  contract_duration text,
  contract_start_date date,
  contract_end_date date,
  contract_number text,
  payment_terms jsonb,
  payment_schedule jsonb,
  notes text,
  created_at timestamp with time zone,
  sent_at timestamp with time zone,
  accepted_at timestamp with time zone
)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.client_id,
    p.client_name,
    p.client_contact_person,
    p.client_email,
    p.client_phone,
    p.client_address,
    p.instagram_url,
    p.status,
    p.proposal_type,
    p.total_value,
    p.subtotal_before_discount,
    p.discount_percentage,
    p.discount_amount,
    p.contract_duration,
    p.contract_start_date,
    p.contract_end_date,
    p.contract_number,
    p.payment_terms,
    p.payment_schedule,
    p.notes,
    p.created_at,
    p.sent_at,
    p.accepted_at
  FROM public.proposals p
  WHERE p.share_token = get_proposal_by_share_token.share_token;
END;
$$;

-- 4. handle_new_user
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

-- 5. has_role
DROP FUNCTION IF EXISTS public.has_role(uuid, public.user_role);
CREATE FUNCTION public.has_role(user_id uuid, check_role public.user_role) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = has_role.user_id
    AND user_roles.role = check_role
  );
END;
$$;

-- ============================================================================
-- PART 2: Add expiration support to shareable_links
-- ============================================================================

-- Add expires_at column to shareable_links table
ALTER TABLE public.shareable_links
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- Create index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_shareable_links_expires_at
ON public.shareable_links USING btree (expires_at);

-- Create function to automatically set default expiration (30 days from creation)
CREATE OR REPLACE FUNCTION public.set_shareable_link_expiration() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + interval '30 days';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to set expiration on insert
DROP TRIGGER IF EXISTS set_shareable_link_expiration_trigger ON public.shareable_links;
CREATE TRIGGER set_shareable_link_expiration_trigger
  BEFORE INSERT ON public.shareable_links
  FOR EACH ROW
  EXECUTE FUNCTION public.set_shareable_link_expiration();

-- Update existing RLS policies to check expiration
DROP POLICY IF EXISTS "Anyone can view active shareable links by token" ON public.shareable_links;
CREATE POLICY "Anyone can view active shareable links by token"
  ON public.shareable_links
  FOR SELECT
  TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS "Anyone can update last_accessed on shareable links" ON public.shareable_links;
CREATE POLICY "Anyone can update last_accessed on shareable links"
  ON public.shareable_links
  FOR UPDATE
  TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()))
  WITH CHECK (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Update client viewing policy to check expiration
DROP POLICY IF EXISTS "Anyone can view clients via active shareable link" ON public.clients;
CREATE POLICY "Anyone can view clients via active shareable link"
  ON public.clients
  FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1
    FROM public.shareable_links
    WHERE shareable_links.client_id = clients.id
      AND shareable_links.is_active = true
      AND (shareable_links.expires_at IS NULL OR shareable_links.expires_at > now())
  ));

-- Update activities viewing policy to check expiration
DROP POLICY IF EXISTS "Anyone can view activities via active shareable link" ON public.activities;
CREATE POLICY "Anyone can view activities via active shareable link"
  ON public.activities
  FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1
    FROM public.shareable_links
    WHERE shareable_links.client_id = activities.client_id
      AND shareable_links.is_active = true
      AND (shareable_links.expires_at IS NULL OR shareable_links.expires_at > now())
  ));

-- Update deliverables viewing policy to check expiration
DROP POLICY IF EXISTS "Anyone can view deliverables via active shareable link" ON public.deliverables;
CREATE POLICY "Anyone can view deliverables via active shareable link"
  ON public.deliverables
  FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1
    FROM public.shareable_links
    WHERE shareable_links.client_id = deliverables.client_id
      AND shareable_links.is_active = true
      AND (shareable_links.expires_at IS NULL OR shareable_links.expires_at > now())
  ));

-- ============================================================================
-- PART 3: Restrict content_posts updates by client users
-- ============================================================================

-- Drop the existing unrestricted update policy
DROP POLICY IF EXISTS "Client users can update post status" ON public.content_posts;

-- Create a secure function that only allows status updates
CREATE OR REPLACE FUNCTION public.update_content_post_status(
  p_post_id uuid,
  p_new_status public.content_post_status
) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Verify the user has access to this post's client
  IF NOT EXISTS (
    SELECT 1
    FROM public.content_posts cp
    INNER JOIN public.client_users cu ON cu.client_id = cp.client_id
    WHERE cp.id = p_post_id
      AND cu.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: You do not have permission to update this post';
  END IF;

  -- Only allow client users to set status to 'approved' or 'revisions'
  IF p_new_status NOT IN ('approved', 'revisions') THEN
    RAISE EXCEPTION 'Invalid status: Client users can only set status to approved or revisions';
  END IF;

  -- Update only the status field
  UPDATE public.content_posts
  SET
    status = p_new_status,
    approved_at = CASE WHEN p_new_status = 'approved' THEN now() ELSE approved_at END,
    updated_at = now()
  WHERE id = p_post_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_content_post_status(uuid, public.content_post_status) TO authenticated;

-- Add comment explaining the security measure
COMMENT ON FUNCTION public.update_content_post_status IS
  'Securely updates content post status for client users. Only allows status changes to approved/revisions and prevents modification of other fields.';

-- ============================================================================
-- PART 4: Create helper function to clean up expired links (optional maintenance)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deactivate_expired_shareable_links() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.shareable_links
  SET is_active = false
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.deactivate_expired_shareable_links IS
  'Maintenance function to deactivate expired shareable links. Can be called via cron job or edge function.';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Summary of changes:
-- ✅ Fixed 5 SECURITY DEFINER functions with mutable search paths
-- ✅ Added expires_at column to shareable_links with 30-day default
-- ✅ Updated all RLS policies to check link expiration
-- ✅ Replaced unrestricted content_posts update policy with secure function
-- ✅ Added maintenance function for expired links
