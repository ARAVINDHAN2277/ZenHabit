
import { createClient } from '@supabase/supabase-js';

// Safe access to environment variables defined by Vite or the environment
const getEnv = (key: string): string => {
  try {
    // Check for process.env (Vite 'define' replacement)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch (e) {}
  return '';
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

// A simple check: if both exist as non-empty strings, we can attempt to connect.
const isConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Export the client. If not configured, we export null.
// The App handles the null case by falling back to localStorage.
export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const hasSupabaseConfig = isConfigured;
