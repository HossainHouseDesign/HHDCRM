
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtfooxylfnzyrgdkslms.supabase.co';
const supabaseKey = 'sb_publishable_VeOlP0mvDUwCzT-Kyls9EA_bfV42SKO';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * ARCHLEAD PRO - COMPLETE DATABASE SETUP
 * 
 * -- RUN THESE IN SUPABASE SQL EDITOR --
 * 
 * -- 1. ENABLE EXTENSIONS
 * CREATE EXTENSION IF NOT EXISTS "pgcrypto";
 * 
 * -- 2. FULL LEADS TABLE SETUP
 * CREATE TABLE IF NOT EXISTS leads (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   client_name TEXT NOT NULL,
 *   phone TEXT NOT NULL,
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
 * -- 3. PROFILES TABLE (TEAM MANAGEMENT)
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
 * -- 4. PROJECTS TABLE
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
 * -- 5. PROJECT ASSIGNMENTS
 * CREATE TABLE IF NOT EXISTS project_assignments (
 *   project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
 *   profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
 *   PRIMARY KEY (project_id, profile_id)
 * );
 * 
 * -- 6. SETTINGS TABLE
 * CREATE TABLE IF NOT EXISTS settings (
 *   key TEXT PRIMARY KEY,
 *   value JSONB NOT NULL,
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 7. ROW LEVEL SECURITY (RLS)
 * ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
 * 
 * CREATE POLICY "Public Access Leads" ON leads FOR ALL USING (true) WITH CHECK (true);
 * CREATE POLICY "Public Access Profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
 * CREATE POLICY "Public Access Projects" ON projects FOR ALL USING (true) WITH CHECK (true);
 * CREATE POLICY "Public Access Assignments" ON project_assignments FOR ALL USING (true) WITH CHECK (true);
 * 
 * -- 8. SEED INITIAL CONFIGURATION
 * INSERT INTO settings (key, value)
 * VALUES ('lead_form_config', '[
 *   {"id":"1","label":"Full Name","db_key":"client_name","type":"text","section":"Identity","required":true,"visible":true,"placeholder":"e.g. Sarah Khan"},
 *   {"id":"2","label":"Phone Number","db_key":"phone","type":"text","section":"Identity","required":true,"visible":true,"placeholder":"01XXXXXXXXX"},
 *   {"id":"11","label":"Current Location (Country)","db_key":"current_location","type":"text","section":"Identity","required":false,"visible":true,"placeholder":"e.g. Bangladesh"},
 *   {"id":"14","label":"Land Area","db_key":"land_area","type":"text","section":"Architecture","required":false,"visible":true,"placeholder":"e.g. 5 Katha"},
 *   {"id":"foundation_idx","label":"Foundation","db_key":"foundation","type":"select","section":"Architecture","required":false,"visible":true,"options":["1 Store","2 Store","3 Store","4 Store","5 Store","6 Store","7 Store","8 Store","9 Store","10 Store"]},
 *   {"id":"5","label":"Units Per floor","db_key":"unit_count","type":"select","section":"Architecture","required":false,"visible":true,"options":["1 Unit","2 Units","3 Units","4 Units"]},
 *   {"id":"12","label":"Stair Case","db_key":"stair_details","type":"select","section":"Architecture","required":false,"visible":true,"options":["Single Flight","Double Flight","Spiral","U-Shaped"]},
 *   {"id":"3","label":"District","db_key":"address","type":"text","section":"Logistics","required":true,"visible":true,"placeholder":"e.g. Pabna"},
 *   {"id":"13","label":"Upazila","db_key":"upazila","type":"text","section":"Logistics","required":false,"visible":true,"placeholder":"e.g. Ishwardi"},
 *   {"id":"union_idx","label":"Union Name","db_key":"union_name","type":"text","section":"Logistics","required":false,"visible":true,"placeholder":"e.g. Pakuria"},
 *   {"id":"village_idx","label":"Village / Area","db_key":"village_name","type":"text","section":"Logistics","required":false,"visible":true,"placeholder":"e.g. Master Para"}
 * ]')
 * ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
 */
