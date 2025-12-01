# Enterprise Upgrade Guide

This document outlines all the enterprise-grade features and security improvements that have been implemented to transform the application into a production-ready white-label SaaS platform.

## 📋 Table of Contents

1. [Security Fixes](#security-fixes)
2. [Multi-Tenancy & Organizations](#multi-tenancy--organizations)
3. [Feature Flags System](#feature-flags-system)
4. [Audit Trail & Compliance](#audit-trail--compliance)
5. [Observability](#observability)
6. [Email Notifications](#email-notifications)
7. [Deployment Guide](#deployment-guide)
8. [Migration Instructions](#migration-instructions)

---

## 🔒 Security Fixes

### Issues Resolved

#### 1. **SECURITY DEFINER Functions with Mutable Search Paths**

**Problem:** 5 database functions had `SECURITY DEFINER` without `SET search_path`, making them vulnerable to search_path attacks.

**Fixed Functions:**
- `generate_contract_number(uuid)`
- `get_client_by_share_token(text)`
- `get_proposal_by_share_token(text)`
- `handle_new_user()`
- `has_role(uuid, user_role)`

**Solution:** Added `SET search_path TO 'public'` to all SECURITY DEFINER functions.

```sql
-- Example fix
CREATE FUNCTION public.generate_contract_number(p_client_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'  -- ✅ Added this line
    AS $$
    -- function body
$$;
```

#### 2. **Shareable Links Without Expiration**

**Problem:** Shareable links could remain active indefinitely, posing a security risk.

**Solution:**
- Added `expires_at` column to `shareable_links` table
- Default expiration: 30 days from creation
- Updated all RLS policies to check expiration
- Created `deactivate_expired_shareable_links()` maintenance function

```sql
-- Usage
SELECT public.deactivate_expired_shareable_links();
-- Returns: number of links deactivated
```

#### 3. **Unrestricted Content Updates by Client Users**

**Problem:** Client users could update any field on content posts (caption, media_urls, etc.), not just the status.

**Solution:** Replaced the UPDATE policy with a secure function that only allows status updates:

```typescript
// Frontend usage
await supabase.rpc('update_content_post_status', {
  p_post_id: postId,
  p_new_status: 'approved' // or 'revisions'
});
```

**Migration File:** `20251201160000_fix_security_vulnerabilities.sql`

---

## 🏢 Multi-Tenancy & Organizations

### Overview

The application now supports full multi-tenancy with organization-level data isolation, enabling white-label deployment for multiple agency customers.

### Key Features

#### Organizations Table

```typescript
interface Organization {
  id: uuid;
  name: string;
  slug: string; // Unique identifier for URLs

  // Subscription & Billing
  subscription_plan: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  trial_ends_at?: timestamp;
  subscription_ends_at?: timestamp;

  // Branding
  logo_url?: string;
  primary_color: string; // Default: #6366f1
  secondary_color: string;
  accent_color: string;
  font_family: string; // Default: Inter
  custom_domain?: string;
  favicon_url?: string;

  // White-label settings
  powered_by_visible: boolean;
  custom_login_background_url?: string;
  company_name?: string;
  support_email?: string;
  support_phone?: string;

  // Limits
  max_users: number; // Default: 5
  max_clients: number; // Default: 10
  max_storage_gb: number; // Default: 5.00

  // Metadata
  settings: jsonb;
  created_at: timestamp;
  updated_at: timestamp;
}
```

#### Organization Roles

- **Owner**: Full control, billing access
- **Admin**: Can manage users and settings
- **Member**: Regular user access

#### Automatic Organization Creation

When a new user signs up, an organization is automatically created with:
- Organization name: `<user name>'s Organization`
- Unique slug: Generated from email
- Status: `trial` (14-day trial)
- User role: `owner`

### Database Changes

The following tables now have `organization_id`:
- `clients`
- `proposals`
- `pricing_catalog`
- `proposal_templates`

### Helper Functions

```typescript
// Get user's current organization
SELECT public.get_user_organization_id();

// Check if user has specific role
SELECT public.has_organization_role(user_id, org_id, 'admin');

// Check if user has minimum role (hierarchy: owner > admin > member)
SELECT public.has_min_organization_role(user_id, org_id, 'admin');
```

### Data Migration

To migrate existing user data to organizations:

```sql
SELECT public.migrate_existing_data_to_organizations();
```

**Migration File:** `20251201160100_create_organizations_system.sql`

---

## 🎛️ Feature Flags System

### Overview

Control feature availability per organization based on subscription plans.

### Available Features

| Feature | Minimum Plan | Description |
|---------|-------------|-------------|
| `instagram_integration` | Basic | Connect and publish to Instagram |
| `ai_tools` | Pro | AI-powered content generation |
| `advanced_analytics` | Pro | Detailed analytics and reporting |
| `white_label_branding` | Enterprise | Custom branding, remove powered-by |
| `api_access` | Pro | REST API access |
| `custom_domains` | Enterprise | Custom domain deployment |
| `sso` | Enterprise | Single Sign-On (SAML, OAuth) |
| `bulk_operations` | Basic | Bulk import/export |
| `email_notifications` | Free | Automated email notifications |
| `webhooks` | Pro | Real-time webhooks |
| `export_data` | Free | Export to CSV/PDF |
| `advanced_reporting` | Pro | Custom reports, scheduled delivery |
| `multi_language` | Enterprise | Multi-language support |
| `custom_workflows` | Enterprise | Custom approval workflows |

### Usage

```typescript
// Check if feature is enabled for organization
const isEnabled = await supabase.rpc('is_feature_enabled', {
  p_organization_id: orgId,
  p_feature_key: 'ai_tools'
});

// Frontend feature gating
if (isEnabled) {
  // Show AI tools UI
}
```

### Organization-Specific Overrides

Enable/disable features for specific organizations regardless of plan:

```sql
-- Enable API access for a specific organization
INSERT INTO public.organization_features (organization_id, feature_key, is_enabled)
VALUES ('org-uuid', 'api_access', true);

-- Disable a feature
UPDATE public.organization_features
SET is_enabled = false
WHERE organization_id = 'org-uuid' AND feature_key = 'api_access';
```

**Migration File:** `20251201160200_create_feature_flags_and_audit.sql`

---

## 📝 Audit Trail & Compliance

### Overview

Comprehensive audit logging for tracking sensitive operations, user actions, and security events.

### Audit Action Types

**User Actions:**
- `user.login`, `user.logout`, `user.signup`, `user.password_change`, `user.profile_update`

**Organization Actions:**
- `organization.create`, `organization.update`, `organization.delete`
- `organization.member_invite`, `organization.member_remove`, `organization.role_change`

**Client Actions:**
- `client.create`, `client.update`, `client.delete`, `client.status_change`

**Proposal Actions:**
- `proposal.create`, `proposal.update`, `proposal.delete`
- `proposal.send`, `proposal.accept`, `proposal.reject`

**Content Actions:**
- `content.create`, `content.update`, `content.delete`
- `content.approve`, `content.publish`

**Security Actions:**
- `security.access_denied`, `security.permission_change`
- `security.api_key_create`, `security.api_key_revoke`

**Billing Actions:**
- `billing.plan_change`, `billing.payment_success`, `billing.payment_failed`

**Settings Actions:**
- `settings.update`, `settings.feature_toggle`

**Data Actions:**
- `data.export`, `data.import`, `data.bulk_delete`

### Automatic Audit Triggers

The following tables automatically create audit logs:
- `clients` (create, update, delete, status changes)
- `proposals` (create, update, delete, send, accept, reject)
- `content_posts` (create, update, delete, approve, publish)

### Manual Audit Logging

```typescript
// Create a custom audit log entry
await supabase.rpc('create_audit_log', {
  p_action: 'settings.update',
  p_resource_type: 'organization',
  p_resource_id: orgId,
  p_description: 'Updated organization branding',
  p_changes: { before: oldData, after: newData },
  p_metadata: { updatedBy: userId }
});
```

### Audit Log Structure

```typescript
interface AuditLog {
  id: uuid;
  user_id?: uuid;
  organization_id?: uuid;
  action: audit_action;
  resource_type?: string; // 'client', 'proposal', 'user'
  resource_id?: uuid;
  description: string;
  changes?: jsonb; // Before/after values
  metadata?: jsonb;
  ip_address?: inet;
  user_agent?: string;
  created_at: timestamp;
}
```

### Querying Audit Logs

```typescript
// Get all audit logs for organization
const { data } = await supabase
  .from('audit_logs')
  .select('*')
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false })
  .limit(100);

// Get audit logs for specific resource
const { data } = await supabase
  .from('audit_logs')
  .select('*')
  .eq('resource_type', 'client')
  .eq('resource_id', clientId);
```

### Retention Policy

```sql
-- Clean up logs older than 365 days
SELECT public.cleanup_old_audit_logs(365);
```

**Migration File:** `20251201160200_create_feature_flags_and_audit.sql`

---

## 📊 Observability

### Health Check Endpoint

Monitor application health and service status.

**Endpoint:** `POST /health-check`

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-12-01T16:00:00.000Z",
  "uptime": 1234567,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "pass",
      "message": "Database connection healthy",
      "responseTime": 45
    },
    "auth": {
      "status": "pass",
      "message": "Auth service healthy",
      "responseTime": 23
    },
    "storage": {
      "status": "pass",
      "message": "Storage service healthy",
      "responseTime": 67,
      "details": {
        "bucketsCount": 3
      }
    },
    "edgeFunctions": {
      "status": "pass",
      "message": "Edge functions operational",
      "responseTime": 12
    }
  },
  "metrics": {
    "responseTime": 150
  }
}
```

**Status Codes:**
- `200`: Healthy or degraded
- `503`: Unhealthy

### Structured Logging

Send structured logs to centralized logging service.

**Endpoint:** `POST /structured-logging`

**Request:**

```json
{
  "logs": [
    {
      "level": "info",
      "message": "User logged in",
      "userId": "user-123",
      "organizationId": "org-456",
      "metadata": {
        "loginMethod": "email",
        "ipAddress": "192.168.1.1"
      },
      "context": {
        "service": "auth",
        "function": "login"
      }
    }
  ]
}
```

**Log Levels:**
- `debug`: Detailed debugging information
- `info`: General informational messages
- `warn`: Warning messages
- `error`: Error messages
- `fatal`: Critical failures

**Response:**

```json
{
  "success": true,
  "logsProcessed": 1,
  "correlationIds": ["uuid-123"]
}
```

### Integration with Frontend

```typescript
// logging.ts
export class Logger {
  private supabase: SupabaseClient;

  async log(level: 'info' | 'warn' | 'error', message: string, metadata?: any) {
    await this.supabase.functions.invoke('structured-logging', {
      body: {
        logs: {
          level,
          message,
          userId: this.getUserId(),
          organizationId: this.getOrganizationId(),
          metadata,
          context: {
            service: 'frontend',
            version: '1.0.0'
          }
        }
      }
    });
  }
}

// Usage
const logger = new Logger(supabase);
await logger.log('info', 'User viewed dashboard', { route: '/dashboard' });
```

**Edge Functions:**
- `structured-logging/index.ts`
- `health-check/index.ts`

---

## 📧 Email Notifications

### Overview

Transactional email system with customizable templates and organization branding.

**Endpoint:** `POST /send-email`

### Available Templates

1. **proposal_sent** - New proposal notification
2. **proposal_accepted** - Proposal acceptance confirmation
3. **content_approval_request** - Content ready for review
4. **content_approved** - Content approval confirmation
5. **content_published** - Content publication notification
6. **weekly_summary** - Weekly activity summary
7. **member_invited** - Team invitation
8. **password_reset** - Password reset request
9. **welcome** - Welcome new user

### Usage

```typescript
// Send proposal email
await supabase.functions.invoke('send-email', {
  body: {
    to: 'client@example.com',
    template: 'proposal_sent',
    data: {
      clientName: 'John Doe',
      companyName: 'Agency Inc',
      proposalTitle: 'Social Media Management',
      totalValue: '$5,000',
      proposalUrl: 'https://app.example.com/proposal/token'
    },
    organizationId: 'org-uuid' // For branded emails
  }
});

// Send content approval request
await supabase.functions.invoke('send-email', {
  body: {
    to: 'team@agency.com',
    template: 'content_approval_request',
    data: {
      clientName: 'Client Co',
      platforms: 'Instagram, Facebook',
      scheduledTime: 'Dec 15, 2025 at 10:00 AM',
      caption: 'Post caption preview...',
      approvalUrl: 'https://app.example.com/content/123'
    },
    organizationId: 'org-uuid'
  }
});
```

### Email Provider Setup

The system uses **Resend** for email delivery. Set the following environment variables:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
```

### Branding

Emails automatically include organization branding:
- Logo
- Primary color for buttons
- Company name
- Support email

### Testing

For development without a configured email provider, emails are logged to console:

```json
{
  "success": true,
  "message": "Email logged (no provider configured)",
  "preview": {
    "to": "user@example.com",
    "subject": "Welcome to Agency Inc!",
    "template": "welcome"
  }
}
```

**Edge Function:** `send-email/index.ts`

---

## 🚀 Deployment Guide

### Prerequisites

1. **Supabase Project**
   - Create project at https://supabase.com
   - Note your project URL and anon key

2. **Resend Account** (for emails)
   - Sign up at https://resend.com
   - Get API key
   - Verify sending domain

3. **Environment Variables**

```bash
# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Supabase Edge Function Secrets
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
ENVIRONMENT=production
APP_VERSION=1.0.0
```

### Step 1: Run Database Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations in order
supabase db push
```

Or manually run migrations in Supabase SQL Editor:

1. `20251201160000_fix_security_vulnerabilities.sql`
2. `20251201160100_create_organizations_system.sql`
3. `20251201160200_create_feature_flags_and_audit.sql`

### Step 2: Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy structured-logging
supabase functions deploy health-check
supabase functions deploy send-email

# Set secrets
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
supabase secrets set FROM_EMAIL=noreply@yourdomain.com
supabase secrets set ENVIRONMENT=production
```

### Step 3: Migrate Existing Data

```sql
-- Run in Supabase SQL Editor
SELECT public.migrate_existing_data_to_organizations();
```

This will:
- Create organizations for existing users
- Migrate all user data to their organizations
- Set users as owners of their organizations

### Step 4: Deploy Frontend

```bash
# Build application
npm run build

# Deploy to Vercel
vercel deploy --prod

# Or deploy to Netlify
netlify deploy --prod
```

### Step 5: Configure DNS (for white-label)

For each white-label customer:

1. Add CNAME record: `customer.yourdomain.com` → `your-app.vercel.app`
2. Update organization:

```sql
UPDATE organizations
SET custom_domain = 'customer.yourdomain.com'
WHERE id = 'org-uuid';
```

### Step 6: Health Check Monitoring

Set up monitoring with your preferred service:

```bash
# UptimeRobot, Pingdom, etc.
https://your-project.supabase.co/functions/v1/health-check
```

Expected response: `200` with `"status": "healthy"`

---

## 📦 Migration Instructions

### For Existing Installations

#### 1. Backup Database

```bash
# Create backup before migration
supabase db dump -f backup.sql
```

#### 2. Run Migrations

```bash
# Run migrations sequentially
supabase migration up
```

Or manually execute each migration file in order.

#### 3. Verify Migrations

```sql
-- Check organizations were created
SELECT COUNT(*) FROM organizations;

-- Check feature flags exist
SELECT COUNT(*) FROM feature_flags;

-- Verify users have organizations
SELECT u.email, o.name as organization
FROM auth.users u
JOIN organization_members om ON om.user_id = u.id
JOIN organizations o ON o.id = om.organization_id
LIMIT 10;
```

#### 4. Update Frontend Code

**Add Organization Context:**

```typescript
// contexts/OrganizationContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  logo_url?: string;
  primary_color: string;
}

const OrganizationContext = createContext<{
  organization: Organization | null;
  loading: boolean;
}>({ organization: null, loading: true });

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrganization(null);
      setLoading(false);
      return;
    }

    async function loadOrganization() {
      const { data } = await supabase
        .from('organization_members')
        .select('organization:organizations(*)')
        .eq('user_id', user.id)
        .single();

      if (data?.organization) {
        setOrganization(data.organization);
      }

      setLoading(false);
    }

    loadOrganization();
  }, [user]);

  return (
    <OrganizationContext.Provider value={{ organization, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export const useOrganization = () => useContext(OrganizationContext);
```

**Update App.tsx:**

```typescript
import { OrganizationProvider } from './contexts/OrganizationContext';

function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        {/* Your routes */}
      </OrganizationProvider>
    </AuthProvider>
  );
}
```

**Use Organization in Components:**

```typescript
import { useOrganization } from '@/contexts/OrganizationContext';

function Dashboard() {
  const { organization } = useOrganization();

  return (
    <div style={{ '--primary-color': organization?.primary_color }}>
      <h1>{organization?.name}</h1>
      {/* Dashboard content */}
    </div>
  );
}
```

#### 5. Test Everything

- [ ] User signup creates organization
- [ ] Organization data isolation works
- [ ] Feature flags respect subscription plans
- [ ] Audit logs are created for actions
- [ ] Email notifications send successfully
- [ ] Health check endpoint responds correctly
- [ ] Shareable links expire after 30 days
- [ ] Content status updates work securely

---

## 📊 Monitoring & Maintenance

### Regular Tasks

#### Daily
- Monitor health check endpoint
- Review error logs in Sentry
- Check email delivery rates

#### Weekly
- Review audit logs for suspicious activity
- Check expired shareable links: `SELECT public.deactivate_expired_shareable_links();`

#### Monthly
- Review and optimize database performance
- Clean up old audit logs: `SELECT public.cleanup_old_audit_logs(365);`
- Review feature flag usage by organization

### Performance Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM clients WHERE organization_id = 'org-uuid';

-- Vacuum and analyze
VACUUM ANALYZE;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

---

## 🎯 Next Steps

### Phase 3: Additional Features

1. **Super Admin Dashboard**
   - Create admin-only routes
   - Organization management UI
   - Feature flag management
   - System health dashboard

2. **Billing Integration**
   - Stripe integration
   - Subscription management
   - Usage-based billing

3. **API Layer**
   - REST API with rate limiting
   - API key management
   - Webhooks system

4. **Advanced Reporting**
   - Custom report builder
   - Scheduled report delivery
   - Data export enhancements

5. **Testing**
   - Unit tests for utilities
   - Integration tests for critical flows
   - E2E tests for user journeys

---

## 💡 Support

For issues or questions about the enterprise upgrade:

1. Check the documentation in this file
2. Review the migration SQL files for details
3. Test in development before deploying to production
4. Create backups before running migrations

---

## 📝 Changelog

### Version 2.0.0 (2025-12-01)

**Security:**
- ✅ Fixed 5 SECURITY DEFINER functions with mutable search paths
- ✅ Added expiration to shareable links (30-day default)
- ✅ Restricted content post updates to status field only

**Features:**
- ✅ Multi-tenancy with organizations
- ✅ Feature flags system (14 features defined)
- ✅ Comprehensive audit trail (30+ action types)
- ✅ Structured logging edge function
- ✅ Health check monitoring
- ✅ Email notification system (9 templates)
- ✅ Organization-level branding
- ✅ Subscription plans (free, basic, pro, enterprise)

**Database:**
- ✅ Added 3 new tables: `organizations`, `organization_members`, `organization_features`
- ✅ Added 2 new tables: `feature_flags`, `audit_logs`
- ✅ Added `organization_id` to 4 existing tables
- ✅ Created 15+ new helper functions
- ✅ Updated 20+ RLS policies

**Infrastructure:**
- ✅ 3 new Supabase Edge Functions
- ✅ Email delivery via Resend
- ✅ Automatic organization creation on signup
- ✅ Data migration script for existing users

---

**End of Documentation**
