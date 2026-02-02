
export type LeadStatus = 'Discovery' | 'Follow_Up' | 'Quotation' | 'Completed' | 'Rejected';
export type UserRole = 'super_admin' | 'office_admin' | 'staff' | 'admin';
export type ProjectStatus = 'Upcoming' | 'Running' | 'Complete';
export type PaymentStatus = 'Pre-paid' | 'Post-paid' | 'Free';
export type VisitStatus = 'Upcoming' | 'Done' | 'Hold';

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  see_contact?: boolean;
}

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
  created_at: string;
  login_password?: string;
  office_id?: string;
  permissions?: {
    leads?: ModulePermissions;
    quotations?: ModulePermissions;
    clients?: ModulePermissions;
    projects?: ModulePermissions;
    construction?: ModulePermissions;
    team?: ModulePermissions;
    settings?: { access: boolean };
    site_visits?: ModulePermissions;
    finance?: ModulePermissions;
  };
}

export interface SiteVisit {
  id: string;
  project_id?: string;
  lead_id?: string;
  location: string;
  visit_date: string;
  notes?: string;
  status: VisitStatus;
  scheduled_by: string;
  office_id?: string;
  payment_status: PaymentStatus;
  created_at: string;
  deleted_at?: string;
  project?: Project;
  lead?: Lead;
  creator?: Profile;
  assignments?: { profile: Profile }[];
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
  address?: string; 
  upazila?: string;
  union_name?: string;
  police_station?: string;
  village_name?: string;
  package?: string;
  asking_fee?: number;
  budget?: string;
  social_media?: string;
  next_calling_date?: string;
  follow_up_date?: string;
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
  created_by?: string;
  office_id?: string;
  creator?: {
    full_name: string;
  };
}

export interface LeadAIAnalysis {
  summary: string;
  feasibility_score: number;
  brief: string;
  priority_score: number;
  proposal_text: string;
}

export interface Project {
  id: string;
  name: string;
  client_id: string;
  status: ProjectStatus;
  budget: number;
  start_date: string;
  description?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  client?: Lead;
  assignments?: any[];
  created_by?: string;
  creator?: {
    full_name: string;
  };
}
