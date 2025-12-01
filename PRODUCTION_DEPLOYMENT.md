# Production Deployment Guide

This guide covers everything you need to deploy Session Zen Pro to production safely and securely.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Security Setup](#security-setup)
4. [Database Setup](#database-setup)
5. [Deployment Platforms](#deployment-platforms)
6. [Post-Deployment Steps](#post-deployment-steps)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-Deployment Checklist

Before deploying to production, ensure you've completed these critical steps:

### ✅ Security
- [ ] Rotate all Supabase API keys (the ones in git have been exposed)
- [ ] Set up Sentry account and obtain DSN
- [ ] Review and update Privacy Policy with your company details
- [ ] Review and update Terms of Service with your company details
- [ ] Update contact emails in legal pages (privacy@, legal@)
- [ ] Enable Row Level Security (RLS) on all Supabase tables
- [ ] Test authentication flows (sign up, sign in, password reset)

### ✅ Environment Variables
- [ ] All environment variables configured in hosting platform
- [ ] No `.env` file committed to git
- [ ] Sentry configuration (DSN, org, project, auth token)
- [ ] Supabase credentials (URL, anon key, service role key if needed)

### ✅ Testing
- [ ] All tests passing (`npm test`)
- [ ] Manual testing of critical user flows
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness verification
- [ ] Error boundary testing (trigger intentional errors)

### ✅ Performance
- [ ] Build optimized for production (`npm run build`)
- [ ] Bundle size acceptable (check with `npm run build`)
- [ ] Images optimized (consider using image CDN)
- [ ] Lazy loading implemented (already done for routes)

---

## Environment Configuration

### Required Environment Variables

Create these in your hosting platform's environment settings:

```bash
# Supabase Configuration (REQUIRED)
VITE_SUPABASE_PROJECT_ID="your_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="your_anon_public_key"
VITE_SUPABASE_URL="https://your_project_id.supabase.co"

# Error Tracking (RECOMMENDED)
VITE_SENTRY_DSN="https://your_sentry_dsn@sentry.io/project_id"

# Build-time Sentry Source Maps (Optional - for production builds only)
SENTRY_ORG="your_sentry_organization"
SENTRY_PROJECT="your_sentry_project_name"
SENTRY_AUTH_TOKEN="your_sentry_auth_token"

# Analytics (Optional)
VITE_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

### Obtaining API Keys

**Supabase:**
1. Go to https://app.supabase.com
2. Select your project → Settings → API
3. Copy the Project URL and anon/public key
4. **IMPORTANT:** Click "Reset API keys" to rotate keys after git exposure

**Sentry:**
1. Create account at https://sentry.io
2. Create new project → Select React
3. Copy the DSN from project settings
4. For source maps: Settings → Auth Tokens → Create New Token

---

## Security Setup

### 1. Content Security Policy

The CSP headers in `vercel.json` and `netlify.toml` need to be updated with your actual domain:

```json
"Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://YOUR_DOMAIN.supabase.co https://*.sentry.io; ..."
```

**Action Required:**
- Replace `https://hcrmjbmfsagujhsvaeya.supabase.co` with your Supabase project URL
- Add any additional domains you integrate (analytics, CDNs, etc.)

### 2. Rotate Exposed Credentials

**CRITICAL:** The Supabase credentials in the git history are exposed. You MUST:

1. Go to Supabase Dashboard → Settings → API
2. Click "Reset API Keys"
3. Update all environment variables with new keys
4. Update CSP headers with new project ID

### 3. Enable HTTPS

Both Vercel and Netlify provide automatic HTTPS. Ensure:
- Automatic HTTPS is enabled
- Force HTTPS redirect is on
- HSTS headers are set (already configured in headers files)

---

## Database Setup

### 1. Verify RLS Policies

All tables should have Row Level Security enabled:

```sql
-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### 2. Database Backups

**Supabase Pro/Team:**
- Automatic daily backups included
- Point-in-time recovery available

**Free Tier:**
- Manual backups recommended
- Use `pg_dump` for backups:
  ```bash
  supabase db dump > backup_$(date +%Y%m%d).sql
  ```

### 3. Database Indexes

Verify indexes are in place for performance:
```sql
-- Check existing indexes
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public';
```

---

## Deployment Platforms

### Option 1: Vercel (Recommended)

**Pros:** Zero config, automatic HTTPS, edge functions, preview deployments

**Steps:**
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project directory
3. Link to Vercel project
4. Configure environment variables in Vercel dashboard
5. Deploy: `vercel --prod`

**Environment Variables:**
- Go to Settings → Environment Variables
- Add all variables from `.env.example`
- Set for Production, Preview, and Development

**Custom Domain:**
- Domains → Add Domain
- Follow DNS configuration instructions
- Automatic SSL certificate provisioning

### Option 2: Netlify

**Pros:** Great for static sites, easy CI/CD, form handling

**Steps:**
1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run `netlify init`
3. Link to Netlify site
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables in Netlify dashboard
6. Deploy: `netlify deploy --prod`

### Option 3: Self-Hosted (Advanced)

Use Docker for self-hosting:

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Post-Deployment Steps

### 1. Verify Deployment

- [ ] Visit production URL
- [ ] Sign up for a new account
- [ ] Create a test client
- [ ] Create a test proposal
- [ ] Check mobile responsiveness
- [ ] Test error boundary (trigger an error)
- [ ] Verify cookie consent banner appears

### 2. Set Up Monitoring

**Sentry:**
- Verify errors are being captured
- Set up alert rules for critical errors
- Configure issue assignment

**Uptime Monitoring:**
- Use UptimeRobot (free) or similar
- Monitor main endpoints every 5 minutes
- Set up email/SMS alerts

### 3. Performance Testing

**Lighthouse Audit:**
```bash
npm install -g lighthouse
lighthouse https://your-domain.com --view
```

**Target Scores:**
- Performance: > 90
- Accessibility: > 90
- Best Practices: 100
- SEO: > 90

### 4. Update Legal Pages

Replace placeholder content in:
- `/privacy` - Add your company name, contact email
- `/terms` - Add your company name, governing law jurisdiction
- Update `privacy@sessionzenpro.com` to your actual email
- Update `legal@sessionzenpro.com` to your actual email

---

## Monitoring & Maintenance

### Daily Checks

- [ ] Check Sentry for new errors
- [ ] Monitor Supabase usage (API calls, database size)
- [ ] Review uptime monitor status

### Weekly Tasks

- [ ] Review analytics (user growth, feature usage)
- [ ] Check for dependency updates: `npm outdated`
- [ ] Review and respond to user feedback

### Monthly Tasks

- [ ] Security dependency updates: `npm audit fix`
- [ ] Database backup verification
- [ ] Review and optimize slow queries
- [ ] Check Lighthouse scores
- [ ] Review CSP violations (if using report-uri)

### Quarterly Tasks

- [ ] Major dependency updates
- [ ] Security audit
- [ ] Review and update legal pages
- [ ] Disaster recovery test
- [ ] Performance optimization review

---

## Common Issues & Solutions

### Issue: 403 Errors from Supabase

**Cause:** Exposed API keys or RLS policies blocking access

**Solution:**
1. Rotate API keys in Supabase dashboard
2. Check RLS policies are correctly configured
3. Verify user authentication is working

### Issue: Build Fails on Deployment

**Cause:** Environment variables not set or TypeScript errors

**Solution:**
1. Verify all env vars are set in hosting platform
2. Run `npm run build` locally to check for errors
3. Check build logs for specific error messages

### Issue: Sentry Not Capturing Errors

**Cause:** DSN not set or incorrect

**Solution:**
1. Verify `VITE_SENTRY_DSN` is set
2. Check Sentry project is active
3. Test with intentional error: `throw new Error('Test')`

### Issue: Cookie Consent Not Appearing

**Cause:** LocalStorage already set or JavaScript disabled

**Solution:**
1. Clear browser localStorage
2. Check browser console for errors
3. Verify component is imported in App.tsx

---

## Performance Optimization Tips

### 1. Image Optimization

Consider using an image CDN:
- **Cloudinary** (free tier available)
- **Imgix**
- **Cloudflare Images**

### 2. Bundle Size Reduction

```bash
# Analyze bundle
npm run build
npx vite-bundle-visualizer
```

Look for:
- Duplicate dependencies
- Unused imports
- Large libraries that could be code-split

### 3. Caching Strategy

Already implemented:
- React Query for API caching
- Lazy route loading
- Suspense for code splitting

Consider adding:
- Service Worker for offline support
- Asset versioning/fingerprinting (Vite does this)

---

## Support & Resources

### Documentation
- [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)
- [Supabase Docs](https://supabase.com/docs)
- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)

### Community
- [Supabase Discord](https://discord.supabase.com/)
- [Sentry Discord](https://discord.gg/sentry)

### Need Help?

1. Check error logs in Sentry
2. Review Supabase logs
3. Check deployment platform logs
4. Search Stack Overflow
5. Ask in project Discord/Slack

---

## Checklist: Production Go-Live

Final checklist before announcing to users:

- [ ] All security items completed
- [ ] Monitoring set up (Sentry, uptime)
- [ ] Legal pages reviewed and updated
- [ ] Performance tested (Lighthouse > 90)
- [ ] Backups configured
- [ ] Error tracking verified
- [ ] Mobile tested on real devices
- [ ] Cross-browser tested
- [ ] SSL/HTTPS verified
- [ ] Custom domain configured (if applicable)
- [ ] Email notifications working (if implemented)
- [ ] Rate limiting tested
- [ ] Security headers verified

---

**Last Updated:** {date}

**Version:** 1.0.0
