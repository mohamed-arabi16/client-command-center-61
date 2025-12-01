# Seed Client Data

After signing up, run these SQL queries in your backend Database tab to add the two clients from your PDFs.

## 1. Auris Rent a Car

```sql
-- Insert Auris client
INSERT INTO clients (name, status, contract_type, start_date, total_contract_value, payment_terms, user_id)
VALUES (
  'Auris Rent a Car',
  'active',
  '3-Month Retainer (Nov 2024 - Jan 2025)',
  '2024-11-01',
  2000.00,
  '{"structure": "2 payments", "payment1": {"amount": 1000, "due": "on_signing"}, "payment2": {"amount": 1000, "due": "mid_contract"}}'::jsonb,
  (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE')
);

-- Get the Auris client_id and insert deliverables
INSERT INTO deliverables (client_id, type, total, completed, period)
SELECT 
  id,
  unnest(ARRAY['Videos', 'Designs', 'Photo Sessions', 'Posts Published']),
  unnest(ARRAY[60, 30, 6, 90]),
  0,
  'total'
FROM clients 
WHERE name = 'Auris Rent a Car' AND user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE');
```

**Auris Details:**
- 20 videos/month × 3 months = 60 total
- 10 designs/month × 3 months = 30 total  
- 2 photo sessions/month × 3 months = 6 total
- 30 posts/month × 3 months = 90 total

## 2. Ms. Shaden Tenawi

```sql
-- Insert Shaden client
INSERT INTO clients (name, status, contract_type, start_date, total_contract_value, payment_terms, user_id)
VALUES (
  'Ms. Shaden Tenawi',
  'active',
  'Monthly Retainer',
  '2024-11-01',
  450.00,
  '{"structure": "2 monthly payments", "payment1": {"amount": 200, "due": "on_signing"}, "payment2": {"amount": 250, "due": "mid_month"}}'::jsonb,
  (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE')
);

-- Get the Shaden client_id and insert deliverables
INSERT INTO deliverables (client_id, type, total, completed, period)
SELECT 
  id,
  unnest(ARRAY['Posts', 'Videos', 'Photo Sessions']),
  unnest(ARRAY[15, 15, 2]),
  0,
  'monthly'
FROM clients 
WHERE name = 'Ms. Shaden Tenawi' AND user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE');
```

**Shaden Details:**
- 15 posts/month
- 15 videos/month
- 2 photo sessions/month

## Instructions

1. Sign up for a new account in Mission Control
2. Open the Backend tab in Lovable (Cloud → Database)
3. Replace `YOUR_EMAIL_HERE` with the email you used to sign up
4. Run each SQL block separately in the database query tool
5. Refresh your dashboard to see both clients

The clients will appear with their deliverable progress trackers ready to use!
