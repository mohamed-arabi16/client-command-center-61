CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: client_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.client_status AS ENUM (
    'active',
    'paused',
    'completed'
);


--
-- Name: content_post_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.content_post_status AS ENUM (
    'draft',
    'pending_approval',
    'revisions',
    'approved',
    'published'
);


--
-- Name: priority_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.priority_level AS ENUM (
    'high',
    'medium',
    'low'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: complete_todo_on_approval(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_todo_on_approval() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending_approval' THEN
    UPDATE public.todos
    SET completed = true, completed_at = now()
    WHERE client_id = NEW.client_id
      AND title = 'Review Content Post'
      AND completed = false
      AND due_date >= CURRENT_DATE - INTERVAL '2 days';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: create_activity_on_post_schedule(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_activity_on_post_schedule() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status IN ('pending_approval', 'approved') AND NEW.scheduled_time IS NOT NULL AND 
     (TG_OP = 'INSERT' OR OLD.status = 'draft' OR OLD.scheduled_time IS NULL) THEN
    INSERT INTO public.activities (
      client_id,
      type,
      description,
      deliverable_type,
      date,
      created_by
    ) VALUES (
      NEW.client_id,
      'Content Scheduled',
      'Content scheduled for ' || array_to_string(NEW.platforms, ', ') || ' on ' || to_char(NEW.scheduled_time, 'Mon DD, YYYY at HH:MI AM'),
      CASE 
        WHEN NEW.deliverable_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.deliverables WHERE id = NEW.deliverable_id)
        THEN (SELECT type FROM public.deliverables WHERE id = NEW.deliverable_id)
        ELSE NULL
      END,
      NEW.scheduled_time::date,
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: create_todo_for_approval(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_todo_for_approval() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'pending_approval' AND (TG_OP = 'INSERT' OR OLD.status != 'pending_approval') THEN
    INSERT INTO public.todos (
      client_id,
      title,
      description,
      due_date,
      priority,
      created_by
    ) VALUES (
      NEW.client_id,
      'Review Content Post',
      'Review and approve content scheduled for ' || to_char(NEW.scheduled_time, 'Mon DD, YYYY'),
      COALESCE(NEW.auto_approve_at::date, CURRENT_DATE + 1),
      'high',
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: generate_contract_number(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_contract_number(p_client_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: get_client_by_share_token(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_client_by_share_token(share_token text) RETURNS TABLE(id uuid, name text, logo_url text, status public.client_status, contract_type text, start_date date, total_contract_value numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.logo_url, c.status, c.contract_type, c.start_date, c.total_contract_value
  FROM public.clients c
  INNER JOIN public.shareable_links sl ON sl.client_id = c.id
  WHERE sl.token = share_token AND sl.is_active = true;
END;
$$;


--
-- Name: get_proposal_by_share_token(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_proposal_by_share_token(share_token text) RETURNS TABLE(id uuid, user_id uuid, client_id uuid, client_name text, client_contact_person text, client_email text, client_phone text, client_address text, instagram_url text, status text, proposal_type text, total_value numeric, subtotal_before_discount numeric, discount_percentage numeric, discount_amount numeric, contract_duration text, contract_start_date date, contract_end_date date, contract_number text, payment_terms jsonb, payment_schedule jsonb, notes text, created_at timestamp with time zone, sent_at timestamp with time zone, accepted_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: has_role(uuid, public.user_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(user_id uuid, check_role public.user_role) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = has_role.user_id
    AND user_roles.role = check_role
  );
END;
$$;


--
-- Name: set_content_post_auto_approve(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_content_post_auto_approve() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'pending_approval' AND NEW.auto_approve_at IS NULL THEN
    NEW.auto_approve_at := now() + interval '24 hours';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_deliverable_on_publish(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_deliverable_on_publish() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status != 'published') AND NEW.deliverable_id IS NOT NULL THEN
    UPDATE public.deliverables
    SET completed = LEAST(completed + 1, total)
    WHERE id = NEW.deliverable_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    deliverable_type text,
    date timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_time_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_time_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    month_date date NOT NULL,
    manual_hours numeric(5,2) DEFAULT 0,
    ai_assisted_hours numeric(5,2) DEFAULT 0,
    time_saved_hours numeric(5,2) DEFAULT 0,
    tasks_completed integer DEFAULT 0,
    ai_tools_used text[] DEFAULT ARRAY[]::text[],
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: approval_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    client_id uuid NOT NULL,
    feedback_by uuid NOT NULL,
    feedback_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    metric_date date NOT NULL,
    gmb_call_clicks integer DEFAULT 0,
    gmb_direction_clicks integer DEFAULT 0,
    gmb_website_clicks integer DEFAULT 0,
    booking_form_submissions integer DEFAULT 0,
    dm_appointment_requests integer DEFAULT 0,
    link_in_bio_clicks integer DEFAULT 0,
    new_reviews_count integer DEFAULT 0,
    average_star_rating numeric(2,1) DEFAULT 0,
    post_saves integer DEFAULT 0,
    post_shares integer DEFAULT 0,
    follower_count integer DEFAULT 0,
    video_views integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: client_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    logo_url text,
    status public.client_status DEFAULT 'active'::public.client_status NOT NULL,
    contract_type text NOT NULL,
    start_date date NOT NULL,
    total_contract_value numeric(10,2),
    payment_terms jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    instagram_url text,
    instagram_handle text,
    instagram_profile_pic_url text,
    instagram_bio text,
    instagram_follower_count integer,
    instagram_scraped_at timestamp with time zone,
    business_type text,
    primary_goal text,
    estimated_close_rate numeric(5,2) DEFAULT 20.00,
    average_customer_value numeric(10,2) DEFAULT 0,
    primary_lead_source text,
    instagram_access_token text,
    instagram_business_account_id text,
    facebook_page_id text
);


--
-- Name: content_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    created_by uuid NOT NULL,
    caption text NOT NULL,
    media_urls text[] DEFAULT '{}'::text[] NOT NULL,
    platforms text[] NOT NULL,
    status public.content_post_status DEFAULT 'draft'::public.content_post_status NOT NULL,
    scheduled_time timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    published_at timestamp with time zone,
    auto_approve_at timestamp with time zone,
    deliverable_id uuid
);


--
-- Name: deliverables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deliverables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    type text NOT NULL,
    total integer NOT NULL,
    completed integer DEFAULT 0 NOT NULL,
    period text DEFAULT 'monthly'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    proposal_id uuid,
    billing_period text,
    CONSTRAINT completed_not_exceed_total CHECK ((completed <= total))
);


--
-- Name: performance_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performance_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    summary jsonb,
    ai_analysis text,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pricing_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category text NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    description_ar text,
    description_en text,
    unit_price numeric(10,2) NOT NULL,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pricing_catalog_category_check CHECK ((category = ANY (ARRAY['package'::text, 'video'::text, 'design'::text, 'photo_session'::text, 'management'::text, 'ad_campaign'::text, 'other'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: proposal_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposal_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposal_id uuid NOT NULL,
    service_id uuid,
    service_name text NOT NULL,
    service_name_en text,
    description text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric NOT NULL,
    price_at_sale numeric NOT NULL,
    total_price numeric NOT NULL,
    category text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: proposal_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposal_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    total_value numeric NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_name text NOT NULL,
    client_email text,
    client_phone text,
    client_address text,
    instagram_url text,
    status text DEFAULT 'draft'::text NOT NULL,
    proposal_type text DEFAULT 'offer'::text NOT NULL,
    total_value numeric(10,2) DEFAULT 0 NOT NULL,
    contract_duration text DEFAULT 'monthly'::text NOT NULL,
    line_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    payment_terms jsonb,
    notes text,
    share_token text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    accepted_at timestamp with time zone,
    converted_to_client_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    client_id uuid,
    contract_number text,
    client_contact_person text,
    contract_start_date date,
    contract_end_date date,
    discount_percentage numeric DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    subtotal_before_discount numeric DEFAULT 0,
    payment_schedule jsonb DEFAULT '[]'::jsonb,
    package_tier text,
    explicit_boundaries jsonb DEFAULT '[]'::jsonb,
    ai_tools_used text[] DEFAULT ARRAY[]::text[],
    CONSTRAINT proposals_proposal_type_check CHECK ((proposal_type = ANY (ARRAY['offer'::text, 'contract'::text]))),
    CONSTRAINT proposals_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'accepted'::text, 'rejected'::text, 'converted'::text, 'active'::text, 'archived'::text])))
);


--
-- Name: roi_estimates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roi_estimates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    metric_id uuid,
    month_date date NOT NULL,
    total_leads integer DEFAULT 0,
    estimated_conversions integer DEFAULT 0,
    average_customer_value numeric(10,2) DEFAULT 0,
    estimated_revenue numeric(10,2) DEFAULT 0,
    package_investment numeric(10,2) DEFAULT 0,
    roi_percentage numeric(5,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: shareable_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shareable_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    token text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_accessed timestamp with time zone
);


--
-- Name: template_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    service_name text NOT NULL,
    service_name_en text,
    description text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric NOT NULL,
    category text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: todos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.todos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    due_date date NOT NULL,
    priority public.priority_level DEFAULT 'medium'::public.priority_level NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: ai_time_logs ai_time_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_time_logs
    ADD CONSTRAINT ai_time_logs_pkey PRIMARY KEY (id);


--
-- Name: approval_feedback approval_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_feedback
    ADD CONSTRAINT approval_feedback_pkey PRIMARY KEY (id);


--
-- Name: business_metrics business_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_metrics
    ADD CONSTRAINT business_metrics_pkey PRIMARY KEY (id);


--
-- Name: client_users client_users_client_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_users
    ADD CONSTRAINT client_users_client_id_user_id_key UNIQUE (client_id, user_id);


--
-- Name: client_users client_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_users
    ADD CONSTRAINT client_users_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: content_posts content_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_posts
    ADD CONSTRAINT content_posts_pkey PRIMARY KEY (id);


--
-- Name: deliverables deliverables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliverables
    ADD CONSTRAINT deliverables_pkey PRIMARY KEY (id);


--
-- Name: performance_reports performance_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_reports
    ADD CONSTRAINT performance_reports_pkey PRIMARY KEY (id);


--
-- Name: pricing_catalog pricing_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_catalog
    ADD CONSTRAINT pricing_catalog_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: proposal_items proposal_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_items
    ADD CONSTRAINT proposal_items_pkey PRIMARY KEY (id);


--
-- Name: proposal_templates proposal_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_templates
    ADD CONSTRAINT proposal_templates_pkey PRIMARY KEY (id);


--
-- Name: proposals proposals_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_contract_number_key UNIQUE (contract_number);


--
-- Name: proposals proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_pkey PRIMARY KEY (id);


--
-- Name: proposals proposals_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_share_token_key UNIQUE (share_token);


--
-- Name: roi_estimates roi_estimates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roi_estimates
    ADD CONSTRAINT roi_estimates_pkey PRIMARY KEY (id);


--
-- Name: shareable_links shareable_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shareable_links
    ADD CONSTRAINT shareable_links_pkey PRIMARY KEY (id);


--
-- Name: shareable_links shareable_links_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shareable_links
    ADD CONSTRAINT shareable_links_token_key UNIQUE (token);


--
-- Name: template_items template_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_items
    ADD CONSTRAINT template_items_pkey PRIMARY KEY (id);


--
-- Name: todos todos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_approval_feedback_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_feedback_post ON public.approval_feedback USING btree (post_id);


--
-- Name: idx_client_users_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_users_client ON public.client_users USING btree (client_id);


--
-- Name: idx_client_users_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_users_user ON public.client_users USING btree (user_id);


--
-- Name: idx_content_posts_auto_approve; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_posts_auto_approve ON public.content_posts USING btree (auto_approve_at);


--
-- Name: idx_content_posts_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_posts_client ON public.content_posts USING btree (client_id);


--
-- Name: idx_content_posts_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_posts_scheduled ON public.content_posts USING btree (scheduled_time);


--
-- Name: idx_content_posts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_posts_status ON public.content_posts USING btree (status);


--
-- Name: idx_deliverables_proposal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deliverables_proposal_id ON public.deliverables USING btree (proposal_id);


--
-- Name: idx_performance_reports_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_reports_client_id ON public.performance_reports USING btree (client_id);


--
-- Name: idx_performance_reports_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_reports_period ON public.performance_reports USING btree (period_start, period_end);


--
-- Name: idx_pricing_catalog_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_catalog_category ON public.pricing_catalog USING btree (category);


--
-- Name: idx_pricing_catalog_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_catalog_user_id ON public.pricing_catalog USING btree (user_id);


--
-- Name: idx_proposal_items_proposal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposal_items_proposal_id ON public.proposal_items USING btree (proposal_id);


--
-- Name: idx_proposal_items_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposal_items_service_id ON public.proposal_items USING btree (service_id);


--
-- Name: idx_proposal_templates_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposal_templates_user_id ON public.proposal_templates USING btree (user_id);


--
-- Name: idx_proposals_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposals_client_id ON public.proposals USING btree (client_id);


--
-- Name: idx_proposals_share_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposals_share_token ON public.proposals USING btree (share_token);


--
-- Name: idx_proposals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposals_status ON public.proposals USING btree (status);


--
-- Name: idx_proposals_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposals_user_id ON public.proposals USING btree (user_id);


--
-- Name: idx_template_items_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_items_template_id ON public.template_items USING btree (template_id);


--
-- Name: content_posts complete_todo_on_approval; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER complete_todo_on_approval AFTER UPDATE ON public.content_posts FOR EACH ROW EXECUTE FUNCTION public.complete_todo_on_approval();


--
-- Name: content_posts create_activity_on_post_schedule; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_activity_on_post_schedule AFTER INSERT OR UPDATE ON public.content_posts FOR EACH ROW EXECUTE FUNCTION public.create_activity_on_post_schedule();


--
-- Name: content_posts create_todo_for_approval; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_todo_for_approval AFTER INSERT OR UPDATE ON public.content_posts FOR EACH ROW EXECUTE FUNCTION public.create_todo_for_approval();


--
-- Name: content_posts set_auto_approve_on_pending; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_auto_approve_on_pending BEFORE INSERT OR UPDATE ON public.content_posts FOR EACH ROW EXECUTE FUNCTION public.set_content_post_auto_approve();


--
-- Name: ai_time_logs update_ai_time_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_time_logs_updated_at BEFORE UPDATE ON public.ai_time_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: business_metrics update_business_metrics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_business_metrics_updated_at BEFORE UPDATE ON public.business_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clients update_clients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: content_posts update_content_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_content_posts_updated_at BEFORE UPDATE ON public.content_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: content_posts update_deliverable_on_publish; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_deliverable_on_publish AFTER INSERT OR UPDATE ON public.content_posts FOR EACH ROW EXECUTE FUNCTION public.update_deliverable_on_publish();


--
-- Name: deliverables update_deliverables_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_deliverables_updated_at BEFORE UPDATE ON public.deliverables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pricing_catalog update_pricing_catalog_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pricing_catalog_updated_at BEFORE UPDATE ON public.pricing_catalog FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: proposals update_proposals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roi_estimates update_roi_estimates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_roi_estimates_updated_at BEFORE UPDATE ON public.roi_estimates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: todos update_todos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON public.todos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activities activities_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: activities activities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_time_logs ai_time_logs_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_time_logs
    ADD CONSTRAINT ai_time_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: approval_feedback approval_feedback_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_feedback
    ADD CONSTRAINT approval_feedback_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: approval_feedback approval_feedback_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_feedback
    ADD CONSTRAINT approval_feedback_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.content_posts(id) ON DELETE CASCADE;


--
-- Name: business_metrics business_metrics_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_metrics
    ADD CONSTRAINT business_metrics_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_users client_users_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_users
    ADD CONSTRAINT client_users_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: clients clients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: content_posts content_posts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_posts
    ADD CONSTRAINT content_posts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: content_posts content_posts_deliverable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_posts
    ADD CONSTRAINT content_posts_deliverable_id_fkey FOREIGN KEY (deliverable_id) REFERENCES public.deliverables(id) ON DELETE SET NULL;


--
-- Name: deliverables deliverables_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliverables
    ADD CONSTRAINT deliverables_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: deliverables deliverables_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliverables
    ADD CONSTRAINT deliverables_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL;


--
-- Name: performance_reports performance_reports_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_reports
    ADD CONSTRAINT performance_reports_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: pricing_catalog pricing_catalog_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_catalog
    ADD CONSTRAINT pricing_catalog_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: proposal_items proposal_items_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_items
    ADD CONSTRAINT proposal_items_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE;


--
-- Name: proposal_items proposal_items_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_items
    ADD CONSTRAINT proposal_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.pricing_catalog(id) ON DELETE SET NULL;


--
-- Name: proposal_templates proposal_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_templates
    ADD CONSTRAINT proposal_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: proposals proposals_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: proposals proposals_converted_to_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_converted_to_client_id_fkey FOREIGN KEY (converted_to_client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: proposals proposals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: roi_estimates roi_estimates_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roi_estimates
    ADD CONSTRAINT roi_estimates_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: roi_estimates roi_estimates_metric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roi_estimates
    ADD CONSTRAINT roi_estimates_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES public.business_metrics(id) ON DELETE SET NULL;


--
-- Name: shareable_links shareable_links_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shareable_links
    ADD CONSTRAINT shareable_links_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: template_items template_items_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_items
    ADD CONSTRAINT template_items_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.proposal_templates(id) ON DELETE CASCADE;


--
-- Name: todos todos_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: todos todos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: shareable_links Anyone can update last_accessed on shareable links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update last_accessed on shareable links" ON public.shareable_links FOR UPDATE TO anon USING ((is_active = true)) WITH CHECK ((is_active = true));


--
-- Name: shareable_links Anyone can view active shareable links by token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active shareable links by token" ON public.shareable_links FOR SELECT TO anon USING ((is_active = true));


--
-- Name: activities Anyone can view activities via active shareable link; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view activities via active shareable link" ON public.activities FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM public.shareable_links
  WHERE ((shareable_links.client_id = activities.client_id) AND (shareable_links.is_active = true)))));


--
-- Name: clients Anyone can view clients via active shareable link; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view clients via active shareable link" ON public.clients FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM public.shareable_links
  WHERE ((shareable_links.client_id = clients.id) AND (shareable_links.is_active = true)))));


--
-- Name: deliverables Anyone can view deliverables via active shareable link; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view deliverables via active shareable link" ON public.deliverables FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM public.shareable_links
  WHERE ((shareable_links.client_id = deliverables.client_id) AND (shareable_links.is_active = true)))));


--
-- Name: approval_feedback Client users can insert feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Client users can insert feedback" ON public.approval_feedback FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.client_users cu
  WHERE ((cu.client_id = approval_feedback.client_id) AND (cu.user_id = auth.uid())))));


--
-- Name: content_posts Client users can update post status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Client users can update post status" ON public.content_posts FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.client_users cu
  WHERE ((cu.client_id = content_posts.client_id) AND (cu.user_id = auth.uid()))))) WITH CHECK ((status = ANY (ARRAY['approved'::public.content_post_status, 'revisions'::public.content_post_status])));


--
-- Name: approval_feedback Client users can view feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Client users can view feedback" ON public.approval_feedback FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.client_users cu
  WHERE ((cu.client_id = approval_feedback.client_id) AND (cu.user_id = auth.uid())))));


--
-- Name: content_posts Client users can view posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Client users can view posts" ON public.content_posts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.client_users cu
  WHERE ((cu.client_id = content_posts.client_id) AND (cu.user_id = auth.uid())))));


--
-- Name: client_users Client users can view their own access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Client users can view their own access" ON public.client_users FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: client_users Owners can manage client users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage client users" ON public.client_users USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = client_users.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: approval_feedback Owners can manage feedback for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage feedback for their clients" ON public.approval_feedback USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = approval_feedback.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: content_posts Owners can manage posts for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage posts for their clients" ON public.content_posts USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = content_posts.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: roi_estimates Users can create ROI estimates for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create ROI estimates for their clients" ON public.roi_estimates FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = roi_estimates.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: activities Users can create activities for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create activities for their clients" ON public.activities FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = activities.client_id) AND (clients.user_id = auth.uid())))) AND (auth.uid() = created_by)));


--
-- Name: deliverables Users can create deliverables for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create deliverables for their clients" ON public.deliverables FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = deliverables.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: business_metrics Users can create metrics for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create metrics for their clients" ON public.business_metrics FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = business_metrics.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: proposal_items Users can create proposal items for their proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create proposal items for their proposals" ON public.proposal_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.proposals
  WHERE ((proposals.id = proposal_items.proposal_id) AND (proposals.user_id = auth.uid())))));


--
-- Name: performance_reports Users can create reports for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reports for their clients" ON public.performance_reports FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = performance_reports.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: shareable_links Users can create shareable links for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create shareable links for their clients" ON public.shareable_links FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = shareable_links.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: template_items Users can create template items for their templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create template items for their templates" ON public.template_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.proposal_templates
  WHERE ((proposal_templates.id = template_items.template_id) AND (proposal_templates.user_id = auth.uid())))));


--
-- Name: clients Users can create their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own clients" ON public.clients FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: pricing_catalog Users can create their own pricing items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own pricing items" ON public.pricing_catalog FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: proposals Users can create their own proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own proposals" ON public.proposals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: proposal_templates Users can create their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own templates" ON public.proposal_templates FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_time_logs Users can create time logs for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create time logs for their clients" ON public.ai_time_logs FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = ai_time_logs.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: todos Users can create todos for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create todos for their clients" ON public.todos FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = todos.client_id) AND (clients.user_id = auth.uid())))) AND (auth.uid() = created_by)));


--
-- Name: roi_estimates Users can delete ROI estimates for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete ROI estimates for their clients" ON public.roi_estimates FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = roi_estimates.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: activities Users can delete activities for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete activities for their clients" ON public.activities FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = activities.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: deliverables Users can delete deliverables for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete deliverables for their clients" ON public.deliverables FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = deliverables.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: business_metrics Users can delete metrics for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete metrics for their clients" ON public.business_metrics FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = business_metrics.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: proposal_items Users can delete proposal items for their proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete proposal items for their proposals" ON public.proposal_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.proposals
  WHERE ((proposals.id = proposal_items.proposal_id) AND (proposals.user_id = auth.uid())))));


--
-- Name: performance_reports Users can delete reports for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete reports for their clients" ON public.performance_reports FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = performance_reports.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: shareable_links Users can delete shareable links for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete shareable links for their clients" ON public.shareable_links FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = shareable_links.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: template_items Users can delete template items for their templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete template items for their templates" ON public.template_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.proposal_templates
  WHERE ((proposal_templates.id = template_items.template_id) AND (proposal_templates.user_id = auth.uid())))));


--
-- Name: clients Users can delete their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: pricing_catalog Users can delete their own pricing items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own pricing items" ON public.pricing_catalog FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: proposals Users can delete their own proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own proposals" ON public.proposals FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: proposal_templates Users can delete their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own templates" ON public.proposal_templates FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ai_time_logs Users can delete time logs for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete time logs for their clients" ON public.ai_time_logs FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = ai_time_logs.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: todos Users can delete todos for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete todos for their clients" ON public.todos FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = todos.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: roi_estimates Users can update ROI estimates for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update ROI estimates for their clients" ON public.roi_estimates FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = roi_estimates.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: activities Users can update activities for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update activities for their clients" ON public.activities FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = activities.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: deliverables Users can update deliverables for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update deliverables for their clients" ON public.deliverables FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = deliverables.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: business_metrics Users can update metrics for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update metrics for their clients" ON public.business_metrics FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = business_metrics.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: proposal_items Users can update proposal items for their proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update proposal items for their proposals" ON public.proposal_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.proposals
  WHERE ((proposals.id = proposal_items.proposal_id) AND (proposals.user_id = auth.uid())))));


--
-- Name: shareable_links Users can update shareable links for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update shareable links for their clients" ON public.shareable_links FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = shareable_links.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: template_items Users can update template items for their templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update template items for their templates" ON public.template_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.proposal_templates
  WHERE ((proposal_templates.id = template_items.template_id) AND (proposal_templates.user_id = auth.uid())))));


--
-- Name: clients Users can update their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: pricing_catalog Users can update their own pricing items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own pricing items" ON public.pricing_catalog FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: proposals Users can update their own proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own proposals" ON public.proposals FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: proposal_templates Users can update their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own templates" ON public.proposal_templates FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ai_time_logs Users can update time logs for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update time logs for their clients" ON public.ai_time_logs FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = ai_time_logs.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: todos Users can update todos for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update todos for their clients" ON public.todos FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = todos.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: roi_estimates Users can view ROI estimates for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view ROI estimates for their clients" ON public.roi_estimates FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = roi_estimates.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: activities Users can view activities for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view activities for their clients" ON public.activities FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = activities.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: deliverables Users can view deliverables for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view deliverables for their clients" ON public.deliverables FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = deliverables.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: business_metrics Users can view metrics for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view metrics for their clients" ON public.business_metrics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = business_metrics.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: proposal_items Users can view proposal items for their proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view proposal items for their proposals" ON public.proposal_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.proposals
  WHERE ((proposals.id = proposal_items.proposal_id) AND (proposals.user_id = auth.uid())))));


--
-- Name: performance_reports Users can view reports for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view reports for their clients" ON public.performance_reports FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = performance_reports.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: shareable_links Users can view shareable links for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view shareable links for their clients" ON public.shareable_links FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = shareable_links.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: template_items Users can view template items for their templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view template items for their templates" ON public.template_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.proposal_templates
  WHERE ((proposal_templates.id = template_items.template_id) AND (proposal_templates.user_id = auth.uid())))));


--
-- Name: clients Users can view their own clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: pricing_catalog Users can view their own pricing catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own pricing catalog" ON public.pricing_catalog FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: proposals Users can view their own proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own proposals" ON public.proposals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: proposal_templates Users can view their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own templates" ON public.proposal_templates FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_time_logs Users can view time logs for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view time logs for their clients" ON public.ai_time_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = ai_time_logs.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: todos Users can view todos for their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view todos for their clients" ON public.todos FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = todos.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_time_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_time_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: approval_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.approval_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: business_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: client_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: content_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: deliverables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

--
-- Name: performance_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.performance_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: proposal_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

--
-- Name: proposal_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: proposals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

--
-- Name: roi_estimates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roi_estimates ENABLE ROW LEVEL SECURITY;

--
-- Name: shareable_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shareable_links ENABLE ROW LEVEL SECURITY;

--
-- Name: template_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;

--
-- Name: todos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


