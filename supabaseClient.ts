import { createClient } from '@supabase/supabase-js';

// Vite exposes environment variables through import.meta.env
// Variables must be prefixed with VITE_ to be accessible in the browser
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if variables are properly loaded from the environment
const isConfigured = !!supabaseUrl && !!supabaseAnonKey;

if (!isConfigured) {
  console.error(
    "Supabase configuration missing! " +
    "Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file or Vercel dashboard."
  );
}

// Export a singleton instance of the Supabase client
export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const hasSupabaseConfig = isConfigured;