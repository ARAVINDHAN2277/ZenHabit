
import { createClient } from '@supabase/supabase-js';

// Use process.env as defined in vite.config.ts
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Check if variables are properly loaded
const isConfigured = !!supabaseUrl && !!supabaseAnonKey;

if (!isConfigured) {
  console.warn(
    "Supabase configuration missing or incomplete. " +
    "Cloud sync will be disabled. Using local storage mode."
  );
}

// Export a singleton instance of the Supabase client
export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const hasSupabaseConfig = isConfigured;
