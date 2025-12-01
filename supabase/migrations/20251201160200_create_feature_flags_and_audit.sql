-- Migration: Feature Flags & Audit Trail System
-- Date: 2025-12-01
-- Phase: 1 & 2 - White-Label Foundation & Observability
-- Description:
--   1. Feature flags for controlling features per organization
--   2. Comprehensive audit trail for tracking sensitive operations
--   3. System activity logging for compliance and debugging

-- ============================================================================
-- PART 1: Feature Flags System
-- ============================================================================

-- Define feature types
CREATE TYPE public.feature_type AS ENUM (
  'instagram_integration',
  'ai_tools',
  'advanced_analytics',
  'white_label_branding',
  'api_access',
  'custom_domains',
  'sso',
  'bulk_operations',
  'email_notifications',
  'webhooks',
  'export_data',
  'advanced_reporting',
  'multi_language',
  'custom_workflows'
);

-- Global feature flags (system-wide)
CREATE TABLE public.feature_flags (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  feature_key public.feature_type NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_enabled_globally boolean DEFAULT false NOT NULL,

  -- Plan requirements
  minimum_plan public.subscription_plan DEFAULT 'free',

  -- Metadata
  rollout_percentage integer DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Organization-specific feature overrides
CREATE TABLE public.organization_features (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_key public.feature_type NOT NULL,
  is_enabled boolean NOT NULL,

  -- Limits per feature (e.g., API rate limits, storage limits)
  limit_value integer,

  -- Metadata
  enabled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  enabled_at timestamp with time zone DEFAULT now() NOT NULL,
  notes text,

  CONSTRAINT organization_features_unique UNIQUE (organization_id, feature_key)
);

-- Indexes
CREATE INDEX idx_feature_flags_enabled ON public.feature_flags USING btree (is_enabled_globally);
CREATE INDEX idx_feature_flags_minimum_plan ON public.feature_flags USING btree (minimum_plan);
CREATE INDEX idx_organization_features_org ON public.organization_features USING btree (organization_id);
CREATE INDEX idx_organization_features_feature ON public.organization_features USING btree (feature_key);

-- Update trigger
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if feature is enabled for organization
CREATE OR REPLACE FUNCTION public.is_feature_enabled(
  p_organization_id uuid,
  p_feature_key public.feature_type
) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_org_override boolean;
  v_global_enabled boolean;
  v_minimum_plan public.subscription_plan;
  v_org_plan public.subscription_plan;
  v_plan_rank integer;
  v_min_rank integer;
BEGIN
  -- Check if organization has specific override
  SELECT is_enabled INTO v_org_override
  FROM public.organization_features
  WHERE organization_id = p_organization_id
    AND feature_key = p_feature_key;

  -- If override exists, use it
  IF v_org_override IS NOT NULL THEN
    RETURN v_org_override;
  END IF;

  -- Otherwise, check global flag and plan requirements
  SELECT is_enabled_globally, minimum_plan INTO v_global_enabled, v_minimum_plan
  FROM public.feature_flags
  WHERE feature_key = p_feature_key;

  -- If feature is not globally enabled, return false
  IF NOT COALESCE(v_global_enabled, false) THEN
    RETURN false;
  END IF;

  -- Check organization's plan
  SELECT subscription_plan INTO v_org_plan
  FROM public.organizations
  WHERE id = p_organization_id;

  -- Compare plan ranks
  v_plan_rank := CASE v_org_plan
    WHEN 'enterprise' THEN 4
    WHEN 'pro' THEN 3
    WHEN 'basic' THEN 2
    WHEN 'free' THEN 1
    ELSE 0
  END;

  v_min_rank := CASE v_minimum_plan
    WHEN 'enterprise' THEN 4
    WHEN 'pro' THEN 3
    WHEN 'basic' THEN 2
    WHEN 'free' THEN 1
    ELSE 0
  END;

  RETURN v_plan_rank >= v_min_rank;
END;
$$;

-- Insert default feature flags
INSERT INTO public.feature_flags (feature_key, name, description, is_enabled_globally, minimum_plan)
VALUES
  ('instagram_integration', 'Instagram Integration', 'Connect and publish to Instagram Business accounts', true, 'basic'),
  ('ai_tools', 'AI Tools', 'Access AI-powered content generation and analysis', true, 'pro'),
  ('advanced_analytics', 'Advanced Analytics', 'Access detailed analytics and reporting', true, 'pro'),
  ('white_label_branding', 'White-Label Branding', 'Customize branding and remove powered-by badge', true, 'enterprise'),
  ('api_access', 'API Access', 'Programmatic access via REST API', false, 'pro'),
  ('custom_domains', 'Custom Domains', 'Use custom domain for white-label deployment', true, 'enterprise'),
  ('sso', 'Single Sign-On', 'SSO integration (SAML, OAuth)', false, 'enterprise'),
  ('bulk_operations', 'Bulk Operations', 'Bulk import/export and batch operations', true, 'basic'),
  ('email_notifications', 'Email Notifications', 'Automated email notifications', true, 'free'),
  ('webhooks', 'Webhooks', 'Real-time webhooks for events', false, 'pro'),
  ('export_data', 'Data Export', 'Export data to CSV/PDF formats', true, 'free'),
  ('advanced_reporting', 'Advanced Reporting', 'Custom reports and scheduled delivery', true, 'pro'),
  ('multi_language', 'Multi-Language Support', 'Support for multiple languages', false, 'enterprise'),
  ('custom_workflows', 'Custom Workflows', 'Create custom approval workflows', false, 'enterprise')
ON CONFLICT (feature_key) DO NOTHING;

-- ============================================================================
-- PART 2: Audit Trail System
-- ============================================================================

-- Define action types for audit logging
CREATE TYPE public.audit_action AS ENUM (
  -- User actions
  'user.login',
  'user.logout',
  'user.signup',
  'user.password_change',
  'user.profile_update',

  -- Organization actions
  'organization.create',
  'organization.update',
  'organization.delete',
  'organization.member_invite',
  'organization.member_remove',
  'organization.role_change',

  -- Client actions
  'client.create',
  'client.update',
  'client.delete',
  'client.status_change',

  -- Proposal actions
  'proposal.create',
  'proposal.update',
  'proposal.delete',
  'proposal.send',
  'proposal.accept',
  'proposal.reject',

  -- Content actions
  'content.create',
  'content.update',
  'content.delete',
  'content.approve',
  'content.publish',

  -- Security actions
  'security.access_denied',
  'security.permission_change',
  'security.api_key_create',
  'security.api_key_revoke',

  -- Billing actions
  'billing.plan_change',
  'billing.payment_success',
  'billing.payment_failed',

  -- Settings actions
  'settings.update',
  'settings.feature_toggle',

  -- Data actions
  'data.export',
  'data.import',
  'data.bulk_delete'
);

-- Audit logs table
CREATE TABLE public.audit_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,

  -- Who
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- What
  action public.audit_action NOT NULL,
  resource_type text, -- e.g., 'client', 'proposal', 'user'
  resource_id uuid,

  -- Details
  description text NOT NULL,
  changes jsonb, -- Before/after values for updates
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Where/How
  ip_address inet,
  user_agent text,

  -- When
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);
CREATE INDEX idx_audit_logs_org ON public.audit_logs USING btree (organization_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs USING btree (resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action public.audit_action,
  p_resource_type text,
  p_resource_id uuid,
  p_description text,
  p_changes jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_log_id uuid;
  v_org_id uuid;
BEGIN
  -- Get user's organization
  SELECT get_user_organization_id() INTO v_org_id;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    organization_id,
    action,
    resource_type,
    resource_id,
    description,
    changes,
    metadata
  ) VALUES (
    auth.uid(),
    v_org_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_description,
    p_changes,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ============================================================================
-- PART 3: Automatic audit triggers for key tables
-- ============================================================================

-- Function to audit client changes
CREATE OR REPLACE FUNCTION public.audit_client_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_action public.audit_action;
  v_description text;
  v_changes jsonb;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action := 'client.create';
    v_description := 'Created client: ' || NEW.name;
    v_changes := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'client.update';
    v_description := 'Updated client: ' || NEW.name;
    v_changes := jsonb_build_object(
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    );

    -- Special case: status change
    IF OLD.status != NEW.status THEN
      v_action := 'client.status_change';
      v_description := 'Changed client status: ' || NEW.name || ' from ' || OLD.status || ' to ' || NEW.status;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'client.delete';
    v_description := 'Deleted client: ' || OLD.name;
    v_changes := to_jsonb(OLD);
  END IF;

  -- Create audit log
  INSERT INTO public.audit_logs (
    user_id,
    organization_id,
    action,
    resource_type,
    resource_id,
    description,
    changes
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.organization_id, OLD.organization_id),
    v_action,
    'client',
    COALESCE(NEW.id, OLD.id),
    v_description,
    v_changes
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Function to audit proposal changes
CREATE OR REPLACE FUNCTION public.audit_proposal_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_action public.audit_action;
  v_description text;
  v_changes jsonb;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action := 'proposal.create';
    v_description := 'Created proposal for: ' || NEW.client_name;
    v_changes := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'proposal.update';
    v_description := 'Updated proposal for: ' || NEW.client_name;
    v_changes := jsonb_build_object(
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    );

    -- Special cases for status changes
    IF OLD.status != NEW.status THEN
      CASE NEW.status
        WHEN 'sent' THEN
          v_action := 'proposal.send';
          v_description := 'Sent proposal to: ' || NEW.client_name;
        WHEN 'accepted' THEN
          v_action := 'proposal.accept';
          v_description := 'Proposal accepted by: ' || NEW.client_name;
        WHEN 'rejected' THEN
          v_action := 'proposal.reject';
          v_description := 'Proposal rejected by: ' || NEW.client_name;
        ELSE
          v_description := 'Changed proposal status for: ' || NEW.client_name;
      END CASE;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'proposal.delete';
    v_description := 'Deleted proposal for: ' || OLD.client_name;
    v_changes := to_jsonb(OLD);
  END IF;

  -- Create audit log
  INSERT INTO public.audit_logs (
    user_id,
    organization_id,
    action,
    resource_type,
    resource_id,
    description,
    changes
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.organization_id, OLD.organization_id),
    v_action,
    'proposal',
    COALESCE(NEW.id, OLD.id),
    v_description,
    v_changes
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Function to audit content post changes
CREATE OR REPLACE FUNCTION public.audit_content_post_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_action public.audit_action;
  v_description text;
  v_changes jsonb;
  v_client_name text;
BEGIN
  -- Get client name
  SELECT name INTO v_client_name
  FROM public.clients
  WHERE id = COALESCE(NEW.client_id, OLD.client_id);

  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action := 'content.create';
    v_description := 'Created content post for: ' || v_client_name;
    v_changes := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'content.update';
    v_description := 'Updated content post for: ' || v_client_name;
    v_changes := jsonb_build_object(
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    );

    -- Special cases for status changes
    IF OLD.status != NEW.status THEN
      CASE NEW.status
        WHEN 'approved' THEN
          v_action := 'content.approve';
          v_description := 'Approved content post for: ' || v_client_name;
        WHEN 'published' THEN
          v_action := 'content.publish';
          v_description := 'Published content post for: ' || v_client_name;
        ELSE
          v_description := 'Changed content status for: ' || v_client_name;
      END CASE;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'content.delete';
    v_description := 'Deleted content post for: ' || v_client_name;
    v_changes := to_jsonb(OLD);
  END IF;

  -- Create audit log
  INSERT INTO public.audit_logs (
    user_id,
    organization_id,
    action,
    resource_type,
    resource_id,
    description,
    changes
  ) VALUES (
    auth.uid(),
    (SELECT organization_id FROM public.clients WHERE id = COALESCE(NEW.client_id, OLD.client_id)),
    v_action,
    'content_post',
    COALESCE(NEW.id, OLD.id),
    v_description,
    v_changes
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create audit triggers
CREATE TRIGGER audit_client_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_client_changes();

CREATE TRIGGER audit_proposal_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_proposal_changes();

CREATE TRIGGER audit_content_post_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.content_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_content_post_changes();

-- ============================================================================
-- PART 4: RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Feature flags policies (admin/system access only)
CREATE POLICY "Only system admins can view feature flags"
  ON public.feature_flags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "Only system admins can manage feature flags"
  ON public.feature_flags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Organization features policies
CREATE POLICY "Organization members can view their org features"
  ON public.organization_features
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_features.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization owners can manage features"
  ON public.organization_features
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_features.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );

-- Audit logs policies
CREATE POLICY "Users can view audit logs for their organization"
  ON public.audit_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- No insert/update/delete policies for audit_logs - only via functions

-- ============================================================================
-- PART 5: Cleanup function for old audit logs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(
  p_retention_days integer DEFAULT 365
) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < now() - (p_retention_days || ' days')::interval;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_audit_logs IS
  'Deletes audit logs older than specified retention period (default 365 days). Run via cron job.';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Summary:
-- ✅ Created feature flags system with organization-level overrides
-- ✅ Defined 14 default features with plan requirements
-- ✅ Created audit trail system with 30+ action types
-- ✅ Added automatic audit triggers for clients, proposals, and content
-- ✅ Created helper functions for feature checks and audit logging
-- ✅ Implemented RLS policies for security
-- ✅ Added cleanup function for audit log retention
