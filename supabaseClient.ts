import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtfooxylfnzyrgdkslms.supabase.co';
const supabaseKey = 'sb_publishable_VeOlP0mvDUwCzT-Kyls9EA_bfV42SKO';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * HHD CRM - MASTER DATABASE SCHEMA & REPAIR SCRIPT (V106 - GRANULAR FINANCE PERMISSIONS)
 * 
 * INSTRUCTIONS:
 * 1. Open Supabase Dashboard -> SQL Editor -> "+ New Query".
 * 2. Paste the script below.
 * 3. Click "Run".
 * 
 * -- START SQL --
 * 
 * -- 1. ENSURE MASTER TABLES EXIST
 * CREATE TABLE IF NOT EXISTS public.finance_cashbooks (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     name TEXT NOT NULL,
 *     description TEXT, 
 *     initial_balance NUMERIC DEFAULT 0,
 *     project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
 *     office_id UUID,
 *     created_by UUID REFERENCES public.profiles(id),
 *     created_at TIMESTAMPTZ DEFAULT NOW(),
 *     updated_at TIMESTAMPTZ DEFAULT NOW(),
 *     deleted_at TIMESTAMPTZ
 * );
 * 
 * CREATE TABLE IF NOT EXISTS public.finance_transactions (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     type TEXT CHECK (type IN ('Income', 'Expense')), 
 *     amount NUMERIC NOT NULL,
 *     category TEXT DEFAULT 'General',
 *     description TEXT,
 *     date DATE DEFAULT CURRENT_DATE,
 *     office_id UUID,
 *     created_by UUID REFERENCES public.profiles(id),
 *     created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 2. SURGICAL SCHEMA REPAIR
 * DO $$ 
 * BEGIN 
 *   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='finance_transactions' AND column_name='cashbook_id') THEN
 *     ALTER TABLE public.finance_transactions ADD COLUMN cashbook_id UUID REFERENCES public.finance_cashbooks(id) ON DELETE CASCADE;
 *   END IF;
 *   
 *   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='finance_transactions' AND column_name='project_id') THEN
 *     ALTER TABLE public.finance_transactions ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
 *   END IF;
 * 
 *   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='finance_transactions' AND column_name='lead_id') THEN
 *     ALTER TABLE public.finance_transactions ADD COLUMN lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;
 *   END IF;
 * END $$;
 * 
 * -- 3. FINANCE PERMISSIONS TABLE (Access Control with Granular Rights)
 * CREATE TABLE IF NOT EXISTS public.finance_cashbook_permissions (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     cashbook_id UUID REFERENCES public.finance_cashbooks(id) ON DELETE CASCADE,
 *     profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
 *     can_input BOOLEAN DEFAULT TRUE,
 *     can_edit BOOLEAN DEFAULT TRUE,
 *     can_delete BOOLEAN DEFAULT TRUE,
 *     can_archive BOOLEAN DEFAULT TRUE,
 *     created_at TIMESTAMPTZ DEFAULT NOW(),
 *     UNIQUE(cashbook_id, profile_id)
 * );
 * 
 * -- 4. REFRESH SECURITY POLICIES
 * ALTER TABLE public.finance_cashbooks ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.finance_cashbook_permissions ENABLE ROW LEVEL SECURITY;
 * 
 * DROP POLICY IF EXISTS "Public_CRM_Access" ON public.finance_cashbooks;
 * CREATE POLICY "Public_CRM_Access" ON public.finance_cashbooks FOR ALL TO public USING (true) WITH CHECK (true);
 * 
 * DROP POLICY IF EXISTS "Public_CRM_Access" ON public.finance_transactions;
 * CREATE POLICY "Public_CRM_Access" ON public.finance_transactions FOR ALL TO public USING (true) WITH CHECK (true);
 * 
 * DROP POLICY IF EXISTS "Public_CRM_Access" ON public.finance_cashbook_permissions;
 * CREATE POLICY "Public_CRM_Access" ON public.finance_cashbook_permissions FOR ALL TO public USING (true) WITH CHECK (true);
 * 
 * -- 5. CRITICAL: RELOAD POSTGREST CACHE
 * NOTIFY pgrst, 'reload schema';
 * 
 * -- END SQL --
 */