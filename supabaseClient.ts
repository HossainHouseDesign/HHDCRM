
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtfooxylfnzyrgdkslms.supabase.co';
const supabaseKey = 'sb_publishable_VeOlP0mvDUwCzT-Kyls9EA_bfV42SKO';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * ARCHLEAD PRO - MASTER DATABASE REPAIR SCRIPT (V17)
 * 
 * -- 1. ADD FOLLOW UP TRACKING TO LEADS
 * ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_date DATE;
 * CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date ON public.leads(follow_up_date);
 * 
 * -- 2. REPAIR CONSTRUCTION TABLE CORE
 * CREATE TABLE IF NOT EXISTS public.construction_projects (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   title TEXT NOT NULL DEFAULT 'Untitled Site',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 3. ADD MISSING COLUMNS INDIVIDUALLY
 * ALTER TABLE public.construction_projects ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
 * ALTER TABLE public.construction_projects ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'Initial Site Works';
 * ALTER TABLE public.construction_projects ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
 * ALTER TABLE public.construction_projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
 * ALTER TABLE public.construction_projects ADD COLUMN IF NOT EXISTS last_site_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW();
 * ALTER TABLE public.construction_projects ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;
 * ALTER TABLE public.construction_projects ADD COLUMN IF NOT EXISTS office_id UUID;
 * ALTER TABLE public.construction_projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);
 * ALTER TABLE public.construction_projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
 * ALTER TABLE public.construction_projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
 * 
 * -- 4. SITE LOGS (TIMELINE)
 * CREATE TABLE IF NOT EXISTS public.construction_logs (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   construction_project_id UUID REFERENCES public.construction_projects(id) ON DELETE CASCADE,
 *   log_notes TEXT NOT NULL,
 *   stage_recorded TEXT,
 *   progress_recorded INTEGER,
 *   created_by UUID REFERENCES public.profiles(id),
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 */
