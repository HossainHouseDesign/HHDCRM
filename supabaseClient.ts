
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtfooxylfnzyrgdkslms.supabase.co';
const supabaseKey = 'sb_publishable_VeOlP0mvDUwCzT-Kyls9EA_bfV42SKO';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * ARCHLEAD PRO - MASTER DATABASE SCHEMA
 * 
 * -- RUN THESE IN SUPABASE SQL EDITOR --
 * 
 * -- 1. EXTENSIONS
 * CREATE EXTENSION IF NOT EXISTS "pgcrypto";
 * 
 * -- 2. LEADS & CLIENTS MASTER TABLE
 * CREATE TABLE IF NOT EXISTS leads (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   client_name TEXT NOT NULL,
 *   phone TEXT NOT NULL,
 *   email TEXT,
 *   status TEXT DEFAULT 'Discovery',
 *   is_client BOOLEAN DEFAULT FALSE,
 *   metadata JSONB DEFAULT '{}'::jsonb,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
 *   converted_at TIMESTAMP WITH TIME ZONE,
 *   foundation TEXT,
 *   unit_count TEXT,
 *   bedroom_count TEXT,
 *   bathroom_count TEXT,
 *   stair_details TEXT,
 *   deleted_at TIMESTAMP WITH TIME ZONE
 * );
 * 
 * -- 3. PROFILES (TEAM)
 * CREATE TABLE IF NOT EXISTS profiles (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   full_name TEXT NOT NULL,
 *   email TEXT UNIQUE NOT NULL,
 *   role TEXT DEFAULT 'Staff',
 *   phone TEXT,
 *   designation TEXT,
 *   status TEXT DEFAULT 'active',
 *   avatar_url TEXT,
 *   deleted_at TIMESTAMP WITH TIME ZONE,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 4. PROJECTS
 * CREATE TABLE IF NOT EXISTS projects (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   client_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
 *   name TEXT NOT NULL,
 *   description TEXT,
 *   status TEXT DEFAULT 'Upcoming',
 *   budget NUMERIC DEFAULT 0,
 *   start_date DATE DEFAULT CURRENT_DATE,
 *   end_date DATE,
 *   deleted_at TIMESTAMP WITH TIME ZONE,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 5. ASSIGNMENTS
 * CREATE TABLE IF NOT EXISTS project_assignments (
 *   project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
 *   profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
 *   PRIMARY KEY (project_id, profile_id)
 * );
 * 
 * -- 6. SETTINGS
 * CREATE TABLE IF NOT EXISTS settings (
 *   key TEXT PRIMARY KEY,
 *   value JSONB NOT NULL,
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 */
