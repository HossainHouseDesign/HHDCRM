import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtfooxylfnzyrgdkslms.supabase.co';
const supabaseKey = 'sb_publishable_VeOlP0mvDUwCzT-Kyls9EA_bfV42SKO';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * HHD CRM - MASTER DATABASE SETUP INSTRUCTIONS
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
 * -- 3. UPDATED ROW LEVEL SECURITY (RLS) - FOR SHADOW LOGIN SUPPORT
 * -- Run these if your staff get "Security Protocol Violation" errors.
 * 
 * ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.site_visit_assignments ENABLE ROW LEVEL SECURITY;
 * 
 * DROP POLICY IF EXISTS "enable_all_for_site_visits" ON public.site_visits;
 * CREATE POLICY "enable_all_for_site_visits" ON public.site_visits 
 * FOR ALL TO public USING (true) WITH CHECK (true);
 * 
 * DROP POLICY IF EXISTS "enable_all_for_assignments" ON public.site_visit_assignments;
 * CREATE POLICY "enable_all_for_assignments" ON public.site_visit_assignments 
 * FOR ALL TO public USING (true) WITH CHECK (true);
 * 
 * -- 4. PERFORMANCE INDEXES
 * CREATE INDEX IF NOT EXISTS idx_site_visits_date ON public.site_visits(visit_date);
 */