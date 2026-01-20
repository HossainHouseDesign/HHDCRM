import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtfooxylfnzyrgdkslms.supabase.co';
const supabaseKey = 'sb_publishable_VeOlP0mvDUwCzT-Kyls9EA_bfV42SKO';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * ARCHLEAD PRO - MASTER DATABASE SCHEMA & REPAIR SCRIPT
 * 
 * Instructions:
 * 1. Open your Supabase Dashboard.
 * 2. Go to the SQL Editor.
 * 3. Paste the script below and run it.
 * 
 * --- START SCRIPT ---
 * 
 * -- Enable UUID engine
 * CREATE EXTENSION IF NOT EXISTS "pgcrypto";
 * 
 * -- 1. PROFILES (Staff Management)
 * CREATE TABLE IF NOT EXISTS public.profiles (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   full_name TEXT NOT NULL,
 *   email TEXT UNIQUE NOT NULL,
 *   phone TEXT,
 *   designation TEXT,
 *   role TEXT DEFAULT 'Staff' CHECK (role IN ('Admin', 'Staff')),
 *   status TEXT DEFAULT 'active',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   deleted_at TIMESTAMP WITH TIME ZONE
 * );
 * 
 * -- IMPORTANT: Remove auth dependency to prevent fkey errors during staff onboarding
 * ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
 * 
 * -- 2. LEADS (Project Discovery & Clients)
 * CREATE TABLE IF NOT EXISTS public.leads (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   client_name TEXT NOT NULL,
 *   phone TEXT NOT NULL,
 *   email TEXT,
 *   current_location TEXT,
 *   land_area TEXT,
 *   address TEXT, -- District
 *   upazila TEXT,
 *   union_name TEXT,
 *   police_station TEXT,
 *   village_name TEXT,
 *   package TEXT,
 *   asking_fee NUMERIC DEFAULT 0,
 *   budget TEXT,
 *   social_media TEXT,
 *   next_calling_date DATE,
 *   notes TEXT,
 *   status TEXT DEFAULT 'Discovery',
 *   is_client BOOLEAN DEFAULT FALSE,
 *   converted_at TIMESTAMP WITH TIME ZONE,
 *   foundation TEXT,
 *   unit_count TEXT,
 *   bedroom_count TEXT,
 *   bathroom_count TEXT,
 *   stair_details TEXT,
 *   interest_construction BOOLEAN DEFAULT FALSE,
 *   interest_interior BOOLEAN DEFAULT FALSE,
 *   metadata JSONB DEFAULT '{}'::jsonb,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   deleted_at TIMESTAMP WITH TIME ZONE
 * );
 * 
 * -- 3. PROJECTS (Active Execution)
 * CREATE TABLE IF NOT EXISTS public.projects (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   client_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
 *   name TEXT NOT NULL,
 *   description TEXT,
 *   status TEXT DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Running', 'Complete')),
 *   budget NUMERIC DEFAULT 0,
 *   start_date DATE DEFAULT CURRENT_DATE,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   deleted_at TIMESTAMP WITH TIME ZONE
 * );
 * 
 * -- 4. PROJECT ASSIGNMENTS (Staff to Project)
 * CREATE TABLE IF NOT EXISTS public.project_assignments (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
 *   profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 5. SETTINGS (Dynamic Forms)
 * CREATE TABLE IF NOT EXISTS public.settings (
 *   key TEXT PRIMARY KEY,
 *   value JSONB NOT NULL,
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * NOTIFY pgrst, 'reload schema';
 * 
 * --- END SCRIPT ---
 */
