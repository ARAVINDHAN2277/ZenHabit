
import { createClient } from '@supabase/supabase-js';

// Use import.meta.env for Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if variables are properly loaded
const isConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Debugging for Vercel
console.log('Supabase Config Check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 8) : 'missing',
  mode: import.meta.env.MODE
});

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
