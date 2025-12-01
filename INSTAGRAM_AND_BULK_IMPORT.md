# Instagram Auto-Fetch & Bulk Import Features

This document explains the Instagram auto-fetch functionality and the new bulk client import feature.

## Instagram Auto-Fetch

### Overview
The Instagram auto-fetch feature allows you to automatically fetch Instagram profile data (profile picture, bio, follower count) when adding or editing clients.

### Current Status: Not Configured ⚠️

The Instagram auto-fetch feature requires a RapidAPI key to function. Without this configuration, you'll receive an error message when trying to fetch Instagram data.

### How to Configure

1. **Sign up for RapidAPI**
   - Go to https://rapidapi.com and create an account
   - Navigate to the API Hub

2. **Subscribe to Instagram Scraper API**
   - Search for "Instagram Scraper API" (instagram-scraper-api2.p.rapidapi.com)
   - Subscribe to a plan (free tier available)
   - Copy your RapidAPI key

3. **Configure Supabase Edge Function**
   - Go to your Supabase project dashboard
   - Navigate to Edge Functions → Functions → scrape-instagram
   - Add the following environment variable:
     - Key: `RAPIDAPI_KEY`
     - Value: Your RapidAPI key from step 2
   - Save the configuration

4. **Test the Feature**
   - Try adding or editing a client
   - Enter an Instagram username or URL
   - Click "Fetch Profile" or "Refresh"
   - The profile data should now load automatically

### Fallback: Manual Entry

If you don't want to configure the API or if auto-fetch fails, you can manually enter Instagram data:
- Profile Picture URL
- Bio
- Follower Count

This data will be stored and displayed just like auto-fetched data.

---

## Bulk Import Feature

### Overview
The bulk import feature allows you to add multiple clients at once by uploading a CSV file. This is perfect for:
- Migrating from another system
- Adding multiple clients quickly
- Batch updates with Instagram data

### How to Use

1. **Download the CSV Template**
   - Click the "Bulk Import" button on the dashboard
   - Click "Download Template" in the dialog
   - This will give you a CSV file with all the correct columns and a sample row

2. **Fill in Your Data**
   - Open the CSV file in Excel, Google Sheets, or any spreadsheet software
   - Fill in your client data following the template format
   - Required fields: `name`, `contract_type`, `start_date`
   - Optional fields: All Instagram fields, contract details, business intelligence settings

3. **Upload the CSV**
   - Click "Bulk Import" on the dashboard
   - Click the upload area or drag and drop your CSV file
   - Click "Parse CSV File" to validate the data
   - Review the preview and any errors
   - Click "Import X Clients" to complete the import

4. **Review Results**
   - The system will show progress as clients are imported
   - After completion, you'll see a summary of successful and failed imports
   - Any errors will be displayed with specific row numbers

### CSV Format Requirements

#### Required Fields
- `name`: Client name (text)
- `contract_type`: One of:
  - Monthly Retainer
  - 3-Month Retainer
  - 6-Month Retainer
  - Project-Based
- `start_date`: Date in YYYY-MM-DD format (e.g., 2025-01-01)

#### Optional Fields

**Contract Information:**
- `status`: active, paused, or completed (defaults to active)
- `total_contract_value`: Number (e.g., 5000.00)
- `payment_terms`: Text (e.g., "Net 30")

**Instagram Data:**
- `instagram_url`: Full URL or username
- `instagram_handle`: Instagram handle (without @)
- `instagram_profile_pic_url`: Direct URL to profile picture
- `instagram_bio`: Bio text
- `instagram_follower_count`: Integer (e.g., 10000)

**Business Intelligence:**
- `business_type`: car_rental, beauty_salon, restaurant, retail, service_provider, or other
- `primary_goal`: leads, bookings, foot_traffic, or brand_awareness
- `estimated_close_rate`: Percentage 0-100 (e.g., 20)
- `average_customer_value`: Dollar amount (e.g., 500.00)
- `primary_lead_source`: gmb, instagram, website, facebook, or referrals

### Tips for Successful Import

1. **Use the Template**: Always start with the downloaded template to ensure correct formatting
2. **Date Format**: Dates must be YYYY-MM-DD (not MM/DD/YYYY or DD/MM/YYYY)
3. **Text with Commas**: If your text contains commas, wrap it in double quotes
4. **Empty Fields**: Leave optional fields blank if you don't have the data
5. **Validate First**: The parser will show you errors before you import
6. **Small Batches**: For large imports, consider breaking them into smaller batches

### Example CSV Row

```csv
name,instagram_url,instagram_handle,instagram_profile_pic_url,instagram_bio,instagram_follower_count,contract_type,start_date,status,total_contract_value,payment_terms,business_type,primary_goal,estimated_close_rate,average_customer_value,primary_lead_source
Acme Corp,https://instagram.com/acmecorp,acmecorp,https://example.com/profile.jpg,"We make amazing products, quality guaranteed",10000,Monthly Retainer,2025-01-01,active,5000.00,Net 30,retail,leads,20,500.00,instagram
```

### Error Handling

If errors occur during import:
- **Validation Errors**: Fixed before import (shown in red)
- **Import Errors**: Specific rows that failed (shown after import)
- **Partial Success**: Successfully imported clients are saved even if some fail

---

## Troubleshooting

### Instagram Auto-Fetch Issues

**Problem**: "Instagram auto-fetch is not configured" error
- **Solution**: Follow the configuration steps above to add RAPIDAPI_KEY

**Problem**: API returns an error
- **Solution**: Check that your RapidAPI subscription is active and has remaining quota

**Problem**: Profile data is incorrect
- **Solution**: Use manual entry fields to override or correct the data

### Bulk Import Issues

**Problem**: "Missing required columns" error
- **Solution**: Ensure your CSV has headers for name, contract_type, and start_date

**Problem**: "Invalid date format" error
- **Solution**: Change dates to YYYY-MM-DD format (e.g., 2025-01-01)

**Problem**: "Invalid contract_type" error
- **Solution**: Use exactly one of: Monthly Retainer, 3-Month Retainer, 6-Month Retainer, Project-Based

**Problem**: Some rows import but others fail
- **Solution**: Check the error messages for specific issues with failed rows

---

## Support

For issues or questions:
1. Check this documentation first
2. Review the in-app error messages
3. Verify your data format matches the template
4. Check the browser console for detailed error logs

---

## Future Enhancements

Planned improvements:
- Auto-refresh Instagram data on schedule
- Direct export to CSV from client list
- Instagram data validation and deduplication
- Bulk update existing clients via CSV
