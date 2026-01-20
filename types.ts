
export type LeadStatus = 'Discovery' | 'Follow_Up' | 'Quotation' | 'Completed' | 'Rejected';
export type UserRole = 'Admin' | 'Staff' | 'Client';
export type ProjectStatus = 'Upcoming' | 'Running' | 'Complete';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone?: string;
  designation?: string;
  status: 'active' | 'inactive';
  avatar_url?: string;
  deleted_at?: string;
}

export type FieldType = 'text' | 'number' | 'select' | 'date' | 'textarea' | 'checkbox';

export interface FormFieldConfig {
  id: string;
  label: string;
  db_key: string;
  type: FieldType;
  section: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  visible: boolean;
}

export interface Lead {
  id: string;
  client_name: string;
  phone: string;
  email?: string; 
  current_location?: string;
  land_area?: string;
  address?: string; // District
  upazila?: string;
  union_name?: string;
  police_station?: string;
  village_name?: string;
  package?: string;
  asking_fee?: number;
  budget?: string;
  social_media?: string;
  next_calling_date?: string;
  notes?: string;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
  is_client: boolean;
  converted_at?: string;
  foundation?: string;
  unit_count?: string;
  bedroom_count?: string;
  bathroom_count?: string;
  stair_details?: string;
  interest_construction?: boolean;
  interest_interior?: boolean;
  metadata?: Record<string, any>; 
  deleted_at?: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  budget: number;
  start_date: string;
  end_date?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  // Join fields
  client?: Lead;
  assignments?: { profile: Profile }[];
}

export interface LeadAIAnalysis {
  summary: string;
  feasibility_score: number;
  brief: string;
  priority_score: number;
  proposal_text: string;
}
