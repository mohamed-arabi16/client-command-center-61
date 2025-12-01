-- Migration: Multi-Tenancy & Organizations System
-- Date: 2025-12-01
-- Phase: 1 - White-Label Foundation
-- Description:
--   Implements multi-tenancy with organizations, enabling white-label deployment
--   for multiple agency customers with data isolation and branding customization.

-- ============================================================================
-- PART 1: Create subscription_plan enum and organizations table
-- ============================================================================

-- Define subscription tiers for organizations
CREATE TYPE public.subscription_plan AS ENUM (
  'free',
  'basic',
  'pro',
  'enterprise'
);

-- Define organization status
CREATE TYPE public.organization_status AS ENUM (
  'active',
  'suspended',
  'trial',
  'cancelled'
);

-- Main organizations table
CREATE TABLE public.organizations (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,

  -- Subscription & Billing
  subscription_plan public.subscription_plan DEFAULT 'free'::public.subscription_plan NOT NULL,
  status public.organization_status DEFAULT 'trial'::public.organization_status NOT NULL,
  trial_ends_at timestamp with time zone,
  subscription_ends_at timestamp with time zone,

  -- Branding
  logo_url text,
  primary_color text DEFAULT '#6366f1', -- Indigo-500
  secondary_color text DEFAULT '#8b5cf6', -- Violet-500
  accent_color text DEFAULT '#ec4899', -- Pink-500
  font_family text DEFAULT 'Inter',
  custom_domain text,
  favicon_url text,

  -- White-label settings
  powered_by_visible boolean DEFAULT true NOT NULL,
  custom_login_background_url text,
  company_name text, -- For emails and documents
  support_email text,
  support_phone text,

  -- Limits (based on subscription plan)
  max_users integer DEFAULT 5,
  max_clients integer DEFAULT 10,
  max_storage_gb numeric(10,2) DEFAULT 5.00,

  -- Metadata
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_organizations_slug ON public.organizations USING btree (slug);
CREATE INDEX idx_organizations_status ON public.organizations USING btree (status);
CREATE INDEX idx_organizations_subscription_plan ON public.organizations USING btree (subscription_plan);
CREATE INDEX idx_organizations_custom_domain ON public.organizations USING btree (custom_domain);

-- Add update trigger
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PART 2: Organization members and roles
-- ============================================================================

-- Define organization roles
CREATE TYPE public.organization_role AS ENUM (
  'owner',      -- Full control, billing access
  'admin',      -- Can manage users and settings
  'member'      -- Regular user access
);

-- Organization members junction table
CREATE TABLE public.organization_members (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.organization_role DEFAULT 'member'::public.organization_role NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamp with time zone DEFAULT now() NOT NULL,
  joined_at timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT organization_members_unique UNIQUE (organization_id, user_id)
);

-- Create indexes
CREATE INDEX idx_organization_members_org ON public.organization_members USING btree (organization_id);
CREATE INDEX idx_organization_members_user ON public.organization_members USING btree (user_id);
CREATE INDEX idx_organization_members_role ON public.organization_members USING btree (role);

-- ============================================================================
-- PART 3: Add organization_id to existing tables
-- ============================================================================

-- Add organization_id to clients table
ALTER TABLE public.clients
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to proposals table
ALTER TABLE public.proposals
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to pricing_catalog table
ALTER TABLE public.pricing_catalog
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to proposal_templates table
ALTER TABLE public.proposal_templates
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create indexes for new foreign keys
CREATE INDEX idx_clients_organization ON public.clients USING btree (organization_id);
CREATE INDEX idx_proposals_organization ON public.proposals USING btree (organization_id);
CREATE INDEX idx_pricing_catalog_organization ON public.pricing_catalog USING btree (organization_id);
CREATE INDEX idx_proposal_templates_organization ON public.proposal_templates USING btree (organization_id);

-- ============================================================================
-- PART 4: Helper functions
-- ============================================================================

-- Function to get user's current organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Get the first active organization the user is a member of
  SELECT om.organization_id INTO v_org_id
  FROM public.organization_members om
  INNER JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = auth.uid()
    AND o.status = 'active'
  ORDER BY om.joined_at ASC
  LIMIT 1;

  RETURN v_org_id;
END;
$$;

-- Function to check if user has role in organization
CREATE OR REPLACE FUNCTION public.has_organization_role(
  p_user_id uuid,
  p_organization_id uuid,
  p_role public.organization_role
) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id
      AND role = p_role
  );
END;
$$;

-- Function to check if user is at least a certain role (role hierarchy)
CREATE OR REPLACE FUNCTION public.has_min_organization_role(
  p_user_id uuid,
  p_organization_id uuid,
  p_min_role public.organization_role
) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_role public.organization_role;
  v_role_rank integer;
  v_min_rank integer;
BEGIN
  -- Get user's role
  SELECT role INTO v_user_role
  FROM public.organization_members
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id;

  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Define role hierarchy (higher number = more permissions)
  v_user_role := COALESCE(v_user_role, 'member');
  v_role_rank := CASE v_user_role
    WHEN 'owner' THEN 3
    WHEN 'admin' THEN 2
    WHEN 'member' THEN 1
    ELSE 0
  END;

  v_min_rank := CASE p_min_role
    WHEN 'owner' THEN 3
    WHEN 'admin' THEN 2
    WHEN 'member' THEN 1
    ELSE 0
  END;

  RETURN v_role_rank >= v_min_rank;
END;
$$;

-- Function to create default organization for new user
CREATE OR REPLACE FUNCTION public.create_default_organization_for_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_org_slug text;
BEGIN
  -- Generate organization name from user email
  v_org_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  ) || '''s Organization';

  -- Generate unique slug
  v_org_slug := lower(regexp_replace(
    split_part(NEW.email, '@', 1),
    '[^a-z0-9]+',
    '-',
    'g'
  )) || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Create organization
  INSERT INTO public.organizations (name, slug, status, trial_ends_at)
  VALUES (
    v_org_name,
    v_org_slug,
    'trial',
    now() + interval '14 days'
  )
  RETURNING id INTO v_org_id;

  -- Add user as owner
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- Update handle_new_user to create default organization
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_org_id uuid;
  v_org_name text;
  v_org_slug text;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  -- Create user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Generate organization name from user email
  v_org_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  ) || '''s Organization';

  -- Generate unique slug
  v_org_slug := lower(regexp_replace(
    split_part(NEW.email, '@', 1),
    '[^a-z0-9]+',
    '-',
    'g'
  )) || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Create default organization
  INSERT INTO public.organizations (name, slug, status, trial_ends_at)
  VALUES (
    v_org_name,
    v_org_slug,
    'trial',
    now() + interval '14 days'
  )
  RETURNING id INTO v_org_id;

  -- Add user as owner
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 5: Row Level Security (RLS) policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their organizations"
  ON public.organizations
  FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
  ));

CREATE POLICY "Organization owners can update their organization"
  ON public.organizations
  FOR UPDATE
  USING (EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  ));

CREATE POLICY "Organization owners can delete their organization"
  ON public.organizations
  FOR DELETE
  USING (EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
  ));

-- Organization members policies
CREATE POLICY "Users can view members of their organizations"
  ON public.organization_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage members"
  ON public.organization_members
  FOR ALL
  USING (EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  ));

-- Update existing RLS policies to include organization_id checks
-- Note: For backward compatibility, we'll allow access if organization_id is NULL (legacy data)
-- or if user is a member of the organization

-- Update clients policies
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
CREATE POLICY "Users can create clients in their organization"
  ON public.clients
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      organization_id IS NULL  -- Legacy support
      OR EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = clients.organization_id
          AND om.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
CREATE POLICY "Users can view clients in their organization"
  ON public.clients
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = clients.organization_id
          AND om.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
CREATE POLICY "Users can update clients in their organization"
  ON public.clients
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = clients.organization_id
          AND om.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
CREATE POLICY "Users can delete clients in their organization"
  ON public.clients
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = clients.organization_id
          AND om.user_id = auth.uid()
      )
    )
  );

-- Similar updates for proposals (simplified - same pattern)
DROP POLICY IF EXISTS "Users can create their own proposals" ON public.proposals;
CREATE POLICY "Users can create proposals in their organization"
  ON public.proposals
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      organization_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = proposals.organization_id
          AND om.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can view their own proposals" ON public.proposals;
CREATE POLICY "Users can view proposals in their organization"
  ON public.proposals
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = proposals.organization_id
          AND om.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update their own proposals" ON public.proposals;
CREATE POLICY "Users can update proposals in their organization"
  ON public.proposals
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = proposals.organization_id
          AND om.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete their own proposals" ON public.proposals;
CREATE POLICY "Users can delete proposals in their organization"
  ON public.proposals
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = proposals.organization_id
          AND om.user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- PART 6: Data migration for existing records
-- ============================================================================

-- Create a function to migrate existing user data to their organizations
CREATE OR REPLACE FUNCTION public.migrate_existing_data_to_organizations() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user record;
  v_org_id uuid;
BEGIN
  -- For each user that doesn't have an organization yet
  FOR v_user IN
    SELECT DISTINCT u.id, u.email, p.full_name
    FROM auth.users u
    INNER JOIN public.profiles p ON p.id = u.id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = u.id
    )
  LOOP
    -- Get or create organization for this user
    SELECT om.organization_id INTO v_org_id
    FROM public.organization_members om
    WHERE om.user_id = v_user.id
    LIMIT 1;

    IF v_org_id IS NULL THEN
      -- Create organization for user
      INSERT INTO public.organizations (
        name,
        slug,
        status,
        subscription_plan
      ) VALUES (
        COALESCE(v_user.full_name, split_part(v_user.email, '@', 1)) || '''s Organization',
        lower(regexp_replace(split_part(v_user.email, '@', 1), '[^a-z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8),
        'active',
        'free'
      )
      RETURNING id INTO v_org_id;

      -- Add user as owner
      INSERT INTO public.organization_members (organization_id, user_id, role)
      VALUES (v_org_id, v_user.id, 'owner');
    END IF;

    -- Migrate user's clients
    UPDATE public.clients
    SET organization_id = v_org_id
    WHERE user_id = v_user.id
      AND organization_id IS NULL;

    -- Migrate user's proposals
    UPDATE public.proposals
    SET organization_id = v_org_id
    WHERE user_id = v_user.id
      AND organization_id IS NULL;

    -- Migrate user's pricing catalog
    UPDATE public.pricing_catalog
    SET organization_id = v_org_id
    WHERE user_id = v_user.id
      AND organization_id IS NULL;

    -- Migrate user's proposal templates
    UPDATE public.proposal_templates
    SET organization_id = v_org_id
    WHERE user_id = v_user.id
      AND organization_id IS NULL;
  END LOOP;
END;
$$;

-- Run the migration (comment out if running incrementally)
-- SELECT public.migrate_existing_data_to_organizations();

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Summary:
-- ✅ Created organizations table with branding and subscription fields
-- ✅ Created organization_members for multi-user support
-- ✅ Added organization_id to key tables (clients, proposals, pricing, templates)
-- ✅ Created helper functions for organization management
-- ✅ Updated RLS policies to respect organization boundaries
-- ✅ Created data migration function for existing users
-- ✅ Integrated organization creation into user signup flow
