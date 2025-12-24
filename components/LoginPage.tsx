
import React, { useState } from 'react';
import { supabase, hasSupabaseConfig } from '../supabaseClient';

interface LoginPageProps {
  onGuestMode: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onGuestMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) setError(loginError.message);
    setLoading(false);
  };

  const handleSignUp = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
    } else {
      alert('Sign up successful! Please check your email for a confirmation link, then you can sign in.');
      setIsSignUp(false);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl shadow-indigo-100 border border-slate-100 p-10 space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 mx-auto mb-6">
            <i className="fa-solid fa-leaf text-3xl"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {hasSupabaseConfig ? (isSignUp ? 'Create Account' : 'ZenHabit Login') : 'ZenHabit 2026'}
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            {hasSupabaseConfig 
              ? (isSignUp ? 'Start your high-performance year today.' : 'Welcome back to your productivity sanctuary.')
              : 'The ultimate habit tracking experience.'
            }
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
            <i className="fa-solid fa-circle-exclamation"></i>
            {error}
          </div>
        )}

        {hasSupabaseConfig ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 transition-all text-sm outline-none"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <input
                type="password"
                required
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 transition-all text-sm outline-none"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-4 pt-2">
              {isSignUp ? (
                <button
                  type="button"
                  onClick={handleSignUp}
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 text-sm"
                >
                  {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Create Account'}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 text-sm"
                >
                  {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Sign In'}
                </button>
              )}
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest">or</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <button
                type="button"
                onClick={onGuestMode}
                className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all text-xs"
              >
                Continue as Guest (Local Only)
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-[10px] leading-relaxed text-amber-700 font-medium">
              <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
              Cloud Sync is unavailable because SUPABASE_URL and SUPABASE_ANON_KEY are missing. Your data will be stored locally.
            </div>
            <button
              onClick={onGuestMode}
              className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
            >
              Enter Tracker
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        )}

        {hasSupabaseConfig && (
          <div className="pt-4 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Join us"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
