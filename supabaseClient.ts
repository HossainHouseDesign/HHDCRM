import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtfooxylfnzyrgdkslms.supabase.co';
const supabaseKey = 'sb_publishable_VeOlP0mvDUwCzT-Kyls9EA_bfV42SKO';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * ARCHLEAD PRO - MASTER DATABASE REPAIR SCRIPT
 * 
 * RUN THE FOLLOWING IN YOUR SUPABASE SQL EDITOR:
 * 
 * -- 1. SECURITY DEFINER FUNCTION (Prevents Recursion)
 * CREATE OR REPLACE FUNCTION public.get_user_office_id()
 * RETURNS uuid AS $$
 *   SELECT office_id FROM public.profiles WHERE id = auth.uid();
 * $$ LANGUAGE sql STABLE SECURITY DEFINER;
 * 
 * -- 2. CORE TABLES SETUP
 * CREATE TABLE IF NOT EXISTS public.offices (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   name TEXT NOT NULL,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 3. PROFILES TABLE SCHEMA
 * -- Ensure all columns exist, especially 'deleted_at' and 'role'
 * DO $$ 
 * BEGIN
 *   IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
 *     CREATE TABLE public.profiles (
 *       id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 *       full_name TEXT NOT NULL,
 *       email TEXT UNIQUE NOT NULL,
 *       role TEXT NOT NULL DEFAULT 'staff',
 *       office_id UUID REFERENCES public.offices(id),
 *       designation TEXT,
 *       phone TEXT,
 *       status TEXT DEFAULT 'active',
 *       deleted_at TIMESTAMP WITH TIME ZONE,
 *       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *       updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 *     );
 *   ELSE
 *     ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES public.offices(id);
 *     ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff';
 *     ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
 *     ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS designation TEXT;
 *     ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
 *   END IF;
 * END $$;
 * 
 * -- 4. RLS POLICIES (OFFICE PARTITIONING)
 * ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
 * 
 * DROP POLICY IF EXISTS "Profiles access" ON public.profiles;
 * CREATE POLICY "Profiles access" ON public.profiles 
 * FOR ALL TO authenticated USING (office_id = public.get_user_office_id() OR id = auth.uid());
 * 
 * DROP POLICY IF EXISTS "Leads access" ON public.leads;
 * CREATE POLICY "Leads access" ON public.leads 
 * FOR ALL TO authenticated USING (office_id = public.get_user_office_id());
 * 
 * DROP POLICY IF EXISTS "Projects access" ON public.projects;
 * CREATE POLICY "Projects access" ON public.projects 
 * FOR ALL TO authenticated USING (office_id = public.get_user_office_id());
 */
