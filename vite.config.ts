
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Helper to get variable from loadEnv or system process.env
  const getEnvVar = (key: string) => env[key] || process.env[key] || '';

  return {
    plugins: [react()],
    define: {
      // Use fallback to empty string to avoid "undefined" string literal in build
      'process.env.API_KEY': JSON.stringify(getEnvVar('API_KEY')),
      'process.env.SUPABASE_URL': JSON.stringify(getEnvVar('SUPABASE_URL')),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(getEnvVar('SUPABASE_ANON_KEY')),
    }
  };
});
