import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtfooxylfnzyrgdkslms.supabase.co';
const supabaseKey = 'sb_publishable_VeOlP0mvDUwCzT-Kyls9EA_bfV42SKO';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * ARCHLEAD PRO - MASTER DATABASE SETUP INSTRUCTIONS
 * 
 * RUN THE FOLLOWING SQL IN YOUR SUPABASE SQL EDITOR TO ACTIVATE SITE VISITS:
 * 
 * -- 1. SITE VISITS CORE TABLE
 * CREATE TABLE IF NOT EXISTS public.site_visits (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
 *   lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
 *   location TEXT NOT NULL,
 *   visit_date DATE NOT NULL,
 *   notes TEXT,
 *   scheduled_by UUID REFERENCES public.profiles(id),
 *   office_id UUID,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   deleted_at TIMESTAMP WITH TIME ZONE
 * );
 * 
 * -- 2. TEAM ASSIGNMENTS JOIN TABLE
 * CREATE TABLE IF NOT EXISTS public.site_visit_assignments (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   site_visit_id UUID REFERENCES public.site_visits(id) ON DELETE CASCADE,
 *   profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 3. PERFORMANCE INDEXES
 * CREATE INDEX IF NOT EXISTS idx_site_visits_date ON public.site_visits(visit_date);
 * CREATE INDEX IF NOT EXISTS idx_site_visits_project ON public.site_visits(project_id);
 * CREATE INDEX IF NOT EXISTS idx_site_visits_lead ON public.site_visits(lead_id);
 */