export interface Client {
  id: string;
  name: string;
  logo_url?: string;
  status: 'active' | 'paused' | 'completed';
  contract_type: string;
  start_date: string;
  total_contract_value?: number;
  payment_terms?: any;
  user_id: string;
  created_at: string;
  updated_at: string;
  
  // Instagram fields
  instagram_url?: string;
  instagram_handle?: string;
  instagram_profile_pic_url?: string;
  instagram_bio?: string;
  instagram_follower_count?: number;
  instagram_scraped_at?: string;
  
  // Business Intelligence fields
  business_type?: string;
  primary_goal?: string;
  estimated_close_rate?: number;
  average_customer_value?: number;
  primary_lead_source?: string;
}

export interface Deliverable {
  id: string;
  type: string;
  total: number;
  completed: number;
  period: string;
  billing_period?: string;
  proposal_id?: string;
  client_id: string;
  created_at: string;
  updated_at: string;
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  completed_at?: string;
  client_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  date: string;
  deliverable_type?: string;
  client_id: string;
  created_by: string;
  created_at: string;
}
