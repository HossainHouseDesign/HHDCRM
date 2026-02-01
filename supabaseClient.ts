import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtfooxylfnzyrgdkslms.supabase.co';
const supabaseKey = 'sb_publishable_VeOlP0mvDUwCzT-Kyls9EA_bfV42SKO';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * HHD CRM - MASTER DATABASE REPAIR SCRIPT (V72)
 * 
 * INSTRUCTIONS:
 * 1. Log in to your Supabase Dashboard.
 * 2. Navigate to "SQL Editor" -> "+ New Query".
 * 3. Copy and Paste the ENTIRE block below.
 * 4. Click "Run".
 * 
 * This script fixes:
 * - Missing 'project_id' in finance_cashbooks
 * - Missing 'deleted_at' for archiving logic
 * - Missing 'finance_cashbook_permissions' for team management
 * - PostgREST Schema Cache refresh
 */

/*
-- START SQL --

-- 1. Repair finance_cashbooks table
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='finance_cashbooks' AND column_name='project_id') THEN
    ALTER TABLE public.finance_cashbooks ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='finance_cashbooks' AND column_name='deleted_at') THEN
    ALTER TABLE public.finance_cashbooks ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Create permissions table for granular cashbook access
CREATE TABLE IF NOT EXISTS public.finance_cashbook_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashbook_id UUID REFERENCES public.finance_cashbooks(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cashbook_id, profile_id)
);

-- 3. Ensure the 'finance_transactions' table and its columns exist
CREATE TABLE IF NOT EXISTS public.finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashbook_id UUID REFERENCES public.finance_cashbooks(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('Income', 'Expense')), 
    amount NUMERIC NOT NULL,
    category TEXT DEFAULT 'General',
    description TEXT,
    date DATE DEFAULT CURRENT_DATE,
    office_id UUID,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL
);

-- 4. Repair transactions if missing specific link columns
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='finance_transactions' AND column_name='project_id') THEN
    ALTER TABLE public.finance_transactions ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='finance_transactions' AND column_name='lead_id') THEN
    ALTER TABLE public.finance_transactions ADD COLUMN lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. CRITICAL: RELOAD SCHEMA CACHE
-- This command fixes the error "Could not find the column in the schema cache"
NOTIFY pgrst, 'reload schema';

-- END SQL --
*/