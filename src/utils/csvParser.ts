/**
 * CSV Parser for bulk client import
 */

export interface ClientCSVRow {
  name: string;
  instagram_url?: string;
  instagram_handle?: string;
  instagram_profile_pic_url?: string;
  instagram_bio?: string;
  instagram_follower_count?: string;
  contract_type: string;
  start_date: string;
  status?: string;
  total_contract_value?: string;
  payment_terms?: string;
  business_type?: string;
  primary_goal?: string;
  estimated_close_rate?: string;
  average_customer_value?: string;
  primary_lead_source?: string;
}

export interface ParseResult {
  success: boolean;
  data?: ClientCSVRow[];
  errors?: string[];
  warnings?: string[];
}

const REQUIRED_FIELDS = ['name', 'contract_type', 'start_date'];

const VALID_CONTRACT_TYPES = [
  'Monthly Retainer',
  '3-Month Retainer',
  '6-Month Retainer',
  'Project-Based',
];

const VALID_STATUSES = ['active', 'paused', 'completed'];

const VALID_BUSINESS_TYPES = [
  'car_rental',
  'beauty_salon',
  'restaurant',
  'retail',
  'service_provider',
  'other',
];

const VALID_GOALS = ['leads', 'bookings', 'foot_traffic', 'brand_awareness'];

const VALID_LEAD_SOURCES = ['gmb', 'instagram', 'website', 'facebook', 'referrals'];

/**
 * Parse CSV content into client data
 */
export function parseCSV(csvContent: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: ClientCSVRow[] = [];

  try {
    const lines = csvContent.trim().split('\n');

    if (lines.length === 0) {
      return {
        success: false,
        errors: ['CSV file is empty'],
      };
    }

    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);

    // Validate required headers
    const missingHeaders = REQUIRED_FIELDS.filter(
      (field) => !headers.includes(field)
    );

    if (missingHeaders.length > 0) {
      return {
        success: false,
        errors: [`Missing required columns: ${missingHeaders.join(', ')}`],
      };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const values = parseCSVLine(line);

      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
        continue;
      }

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      // Validate row
      const rowErrors = validateRow(row, i + 1);
      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }

      data.push(row as ClientCSVRow);
    }

    if (data.length === 0 && errors.length > 0) {
      return {
        success: false,
        errors,
      };
    }

    return {
      success: true,
      data,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * Parse a CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/**
 * Validate a single row
 */
function validateRow(row: any, rowNumber: number): string[] {
  const errors: string[] = [];

  // Check required fields
  REQUIRED_FIELDS.forEach((field) => {
    if (!row[field] || row[field].trim() === '') {
      errors.push(`Row ${rowNumber}: Missing required field '${field}'`);
    }
  });

  // Validate contract type
  if (row.contract_type && !VALID_CONTRACT_TYPES.includes(row.contract_type)) {
    errors.push(
      `Row ${rowNumber}: Invalid contract_type '${row.contract_type}'. Must be one of: ${VALID_CONTRACT_TYPES.join(', ')}`
    );
  }

  // Validate status
  if (row.status && !VALID_STATUSES.includes(row.status.toLowerCase())) {
    errors.push(
      `Row ${rowNumber}: Invalid status '${row.status}'. Must be one of: ${VALID_STATUSES.join(', ')}`
    );
  }

  // Validate date format
  if (row.start_date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(row.start_date)) {
      errors.push(
        `Row ${rowNumber}: Invalid start_date format '${row.start_date}'. Must be YYYY-MM-DD`
      );
    }
  }

  // Validate numeric fields
  if (row.total_contract_value && row.total_contract_value !== '') {
    const value = parseFloat(row.total_contract_value);
    if (isNaN(value)) {
      errors.push(
        `Row ${rowNumber}: Invalid total_contract_value '${row.total_contract_value}'. Must be a number`
      );
    }
  }

  if (row.instagram_follower_count && row.instagram_follower_count !== '') {
    const value = parseInt(row.instagram_follower_count);
    if (isNaN(value)) {
      errors.push(
        `Row ${rowNumber}: Invalid instagram_follower_count '${row.instagram_follower_count}'. Must be an integer`
      );
    }
  }

  if (row.estimated_close_rate && row.estimated_close_rate !== '') {
    const value = parseFloat(row.estimated_close_rate);
    if (isNaN(value) || value < 0 || value > 100) {
      errors.push(
        `Row ${rowNumber}: Invalid estimated_close_rate '${row.estimated_close_rate}'. Must be a number between 0 and 100`
      );
    }
  }

  if (row.average_customer_value && row.average_customer_value !== '') {
    const value = parseFloat(row.average_customer_value);
    if (isNaN(value)) {
      errors.push(
        `Row ${rowNumber}: Invalid average_customer_value '${row.average_customer_value}'. Must be a number`
      );
    }
  }

  // Validate business_type
  if (row.business_type && !VALID_BUSINESS_TYPES.includes(row.business_type)) {
    errors.push(
      `Row ${rowNumber}: Invalid business_type '${row.business_type}'. Must be one of: ${VALID_BUSINESS_TYPES.join(', ')}`
    );
  }

  // Validate primary_goal
  if (row.primary_goal && !VALID_GOALS.includes(row.primary_goal)) {
    errors.push(
      `Row ${rowNumber}: Invalid primary_goal '${row.primary_goal}'. Must be one of: ${VALID_GOALS.join(', ')}`
    );
  }

  // Validate primary_lead_source
  if (row.primary_lead_source && !VALID_LEAD_SOURCES.includes(row.primary_lead_source)) {
    errors.push(
      `Row ${rowNumber}: Invalid primary_lead_source '${row.primary_lead_source}'. Must be one of: ${VALID_LEAD_SOURCES.join(', ')}`
    );
  }

  return errors;
}

/**
 * Generate a sample CSV template
 */
export function generateCSVTemplate(): string {
  const headers = [
    'name',
    'instagram_url',
    'instagram_handle',
    'instagram_profile_pic_url',
    'instagram_bio',
    'instagram_follower_count',
    'contract_type',
    'start_date',
    'status',
    'total_contract_value',
    'payment_terms',
    'business_type',
    'primary_goal',
    'estimated_close_rate',
    'average_customer_value',
    'primary_lead_source',
  ];

  const sampleRow = [
    'Acme Corp',
    'https://instagram.com/acmecorp',
    'acmecorp',
    'https://example.com/profile.jpg',
    'We make amazing products',
    '10000',
    'Monthly Retainer',
    '2025-01-01',
    'active',
    '5000.00',
    'Net 30',
    'retail',
    'leads',
    '20',
    '500.00',
    'instagram',
  ];

  return headers.join(',') + '\n' + sampleRow.join(',');
}
