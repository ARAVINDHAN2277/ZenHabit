
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl shadow-indigo-100 border border-slate-100 p-10 space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 mx-auto mb-6">
            <i className="fa-solid fa-leaf text-3xl"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {hasSupabaseConfig ? (isSignUp ? 'Join ZenHabit' : 'Welcome to ZenHabit') : 'ZenHabit 2026'}
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            {hasSupabaseConfig 
              ? (isSignUp ? 'Start your journey to better habits today.' : 'Your 2026 growth continues here.')
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
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500 transition-all text-sm outline-none"
                placeholder="name@example.com"
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-4 pt-2">
              <div className="flex gap-4">
                {isSignUp ? (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 text-sm"
                  >
                    {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Create Account'}
                  </button>
                ) : (
                  <>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 text-sm"
                    >
                      {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Sign In'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className="flex-1 py-4 bg-white text-indigo-600 border-2 border-indigo-600 font-black rounded-2xl hover:bg-indigo-50 transition-all active:scale-95 text-sm"
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </div>
              
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
              Cloud Sync is currently unavailable. Your data will be stored safely in this browser's Local Storage.
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
