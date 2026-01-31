
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtfooxylfnzyrgdkslms.supabase.co';
const supabaseKey = 'sb_publishable_VeOlP0mvDUwCzT-Kyls9EA_bfV42SKO';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * HHD CRM - MASTER DATABASE SETUP (V30 - THE PERMANENT FIX)
 * 
 * 1. Open Supabase Dashboard -> SQL Editor
 * 2. Create bucket 'HHDCRM' in Storage and set it to PUBLIC.
 * 3. Paste and Run the following script:
 * 
 * -- ==========================================
 * -- 1. STORAGE ACCESS (BRANDING FIX)
 * -- ==========================================
 * DROP POLICY IF EXISTS "HHDCRM_Public_Override" ON storage.objects;
 * CREATE POLICY "HHDCRM_Public_Override" 
 * ON storage.objects FOR ALL 
 * TO public 
 * USING (bucket_id = 'HHDCRM') 
 * WITH CHECK (bucket_id = 'HHDCRM');
 * 
 * -- ==========================================
 * -- 2. CORE TABLES & UNIVERSAL RLS
 * -- ==========================================
 * -- [Tables: settings, profiles, leads, projects, project_assignments, 
 * -- site_visits, site_visit_assignments, construction_projects, construction_logs]
 * 
 * -- This loop handles RLS for all existing tables in the 'public' schema
 * DO $$ 
 * DECLARE 
 *   t text;
 * BEGIN
 *   FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
 *   LOOP
 *     EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
 *     EXECUTE format('DROP POLICY IF EXISTS "Public_CRM_Access" ON public.%I', t);
 *     EXECUTE format('CREATE POLICY "Public_CRM_Access" ON public.%I FOR ALL TO public USING (true) WITH CHECK (true)', t);
 *   END LOOP;
 * END $$;
 * 
 * -- ==========================================
 * -- 3. SHADOW LOGIN SECURITY
 * -- ==========================================
 * CREATE OR REPLACE FUNCTION check_staff_login(p_email TEXT, p_password TEXT)
 * RETURNS SETOF public.profiles AS $$
 * BEGIN
 *     RETURN QUERY
 *     SELECT * FROM public.profiles
 *     WHERE LOWER(email) = LOWER(p_email)
 *       AND login_password = p_password
 *       AND status = 'active'
 *       AND deleted_at IS NULL;
 * END;
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 */
