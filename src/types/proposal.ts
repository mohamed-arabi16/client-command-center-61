export interface ProposalLineItem {
  service_name: string;
  service_name_en?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category: string;
}

export interface PaymentScheduleItem {
  installment: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
}

export interface Proposal {
  id: string;
  user_id: string;
  client_id?: string;
  client_name: string;
  client_contact_person?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  instagram_url?: string;
  status: 'draft' | 'sent' | 'active' | 'archived' | 'accepted' | 'rejected' | 'converted';
  proposal_type: 'offer' | 'contract';
  total_value: number;
  subtotal_before_discount: number;
  discount_percentage: number;
  discount_amount: number;
  contract_duration: string;
  contract_start_date?: string;
  contract_end_date?: string;
  contract_number?: string;
  line_items: ProposalLineItem[];
  payment_terms?: any;
  payment_schedule?: PaymentScheduleItem[];
  notes?: string;
  share_token?: string;
  created_at: string;
  sent_at?: string;
  accepted_at?: string;
  converted_to_client_id?: string;
  updated_at: string;
}

export interface PricingCatalogItem {
  id: string;
  user_id: string;
  category: 'package' | 'video' | 'design' | 'photo_session' | 'management' | 'ad_campaign' | 'other';
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  unit_price: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
