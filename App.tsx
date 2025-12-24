
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { HabitGrid } from './components/HabitGrid';
import { Dashboard } from './components/Dashboard';
import { SummaryChart } from './components/SummaryChart';
import { HabitModal } from './components/HabitModal';
import { LoginPage } from './components/LoginPage';
import { INITIAL_HABITS, MONTHS, MONTH_DAYS } from './constants';
import { AppState, Habit, HabitCategory } from './types';
import { getCoachInsights } from './services/gemini';
import { supabase, hasSupabaseConfig } from './supabaseClient';
import * as htmlToImage from 'html-to-image';
import { Session } from '@supabase/supabase-js';

const LOCAL_STORAGE_KEY = 'zenhabit_2026_data';

const App: React.FC = () => {
  const now = new Date();
  const is2026 = now.getFullYear() === 2026;
  const realWorldMonth = now.getMonth();

  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(() => {
    return localStorage.getItem('zen_guest_active') === 'true';
  });
  const [loading, setLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to parse local storage data", e);
      }
    }
    return {
      habits: INITIAL_HABITS,
      reflections: {},
      currentMonth: is2026 ? realWorldMonth : 0,
      year: 2026,
    };
  });

  const [activeTab, setActiveTab] = useState<'tracker' | 'dashboard'>('tracker');
  const [coachResponse, setCoachResponse] = useState<string | null>(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSynced, setIsSynced] = useState(true);
  
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setIsGuest(false);
        localStorage.removeItem('zen_guest_active');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchHabits(session.user.id);
    }
  }, [session]);

  const fetchHabits = async (userId: string) => {
    if (!supabase) return;
    setIsDataLoading(true);
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching habits:', error);
    } else if (data && data.length > 0) {
      setState(prev => ({ ...prev, habits: data }));
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('habits')
        .insert(state.habits.map(h => ({ ...h, id: undefined, user_id: userId })))
        .select();
      
      if (!insertError && inserted) {
        setState(prev => ({ ...prev, habits: inserted }));
      }
    }
    setIsDataLoading(false);
  };

  const handleToggle = async (habitId: string, dayIndex: number) => {
    const habitIndex = state.habits.findIndex(h => h.id === habitId);
    if (habitIndex === -1) return;

    const habit = state.habits[habitIndex];
    const newData = [...habit.data];
    const newMonthData = [...newData[state.currentMonth]];
    newMonthData[dayIndex] = !newMonthData[dayIndex];
    newData[state.currentMonth] = newMonthData;

    setIsSynced(false);
    setState(prev => ({
      ...prev,
      habits: prev.habits.map(h => h.id === habitId ? { ...h, data: newData } : h)
    }));

    if (supabase && session?.user && habit.id.length > 10) {
      const { error } = await supabase
        .from('habits')
        .update({ data: newData })
        .eq('id', habitId);
      if (error) console.error('Cloud Sync Error:', error);
    }
    setIsSynced(true);
  };

  const handleAddHabit = async (name: string, category: HabitCategory) => {
    const newHabitData: Partial<Habit> = {
      name,
      category,
      data: MONTH_DAYS.map(days => Array(days).fill(false))
    };

    if (supabase && session?.user) {
      const { data, error } = await supabase
        .from('habits')
        .insert([{ ...newHabitData, user_id: session.user.id }])
        .select();

      if (!error && data) {
        setState(prev => ({ ...prev, habits: [...prev.habits, data[0]] }));
      }
    } else {
      const localHabit = { ...newHabitData, id: Math.random().toString(36).substr(2, 9) } as Habit;
      setState(prev => ({ ...prev, habits: [...prev.habits, localHabit] }));
    }
    setIsHabitModalOpen(false);
  };

  const handleUpdateHabit = async (id: string, name: string, category: HabitCategory) => {
    setState(prev => ({
      ...prev,
      habits: prev.habits.map(h => h.id === id ? { ...h, name, category } : h)
    }));

    if (supabase && session?.user && id.length > 10) {
      await supabase.from('habits').update({ name, category }).eq('id', id);
    }
    setEditingHabit(null);
  };

  const handleDeleteHabit = async (id: string) => {
    setState(prev => ({
      ...prev,
      habits: prev.habits.filter(h => h.id !== id)
    }));

    if (supabase && session?.user && id.length > 10) {
      await supabase.from('habits').delete().eq('id', id);
    }
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsGuest(false);
    localStorage.removeItem('zen_guest_active');
  };

  const handleEnterAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('zen_guest_active', 'true');
  };

  const goToToday = () => {
    setState(prev => ({ ...prev, currentMonth: is2026 ? realWorldMonth : 0 }));
  };

  const handleReflectionChange = (field: 'wins' | 'improvements', value: string) => {
    setState(prev => ({
      ...prev,
      reflections: {
        ...prev.reflections,
        [prev.currentMonth]: {
          ...(prev.reflections[prev.currentMonth] || { wins: '', improvements: '' }),
          [field]: value
        }
      }
    }));
  };

  const currentReflection = state.reflections[state.currentMonth] || { wins: '', improvements: '' };

  const currentMonthProgress = useMemo(() => {
    if (state.habits.length === 0) return 0;
    const totalPossible = state.habits.length * MONTH_DAYS[state.currentMonth];
    const totalCompleted = state.habits.reduce((acc, h) => acc + h.data[state.currentMonth].filter(Boolean).length, 0);
    return (totalCompleted / totalPossible) * 100;
  }, [state.habits, state.currentMonth]);

  const annualProgress = useMemo(() => {
    if (state.habits.length === 0) return 0;
    let totalPossible = 0;
    let totalCompleted = 0;
    state.habits.forEach(h => {
      h.data.forEach(m => {
        totalPossible += m.length;
        totalCompleted += m.filter(Boolean).length;
      });
    });
    return (totalCompleted / totalPossible) * 100;
  }, [state.habits]);

  const changeMonth = (delta: number) => {
    setState(prev => ({
      ...prev,
      currentMonth: Math.max(0, Math.min(11, prev.currentMonth + delta))
    }));
  };

  const requestCoachInsights = async () => {
    setIsCoachLoading(true);
    try {
      const insights = await getCoachInsights(state.habits, currentMonthProgress, currentReflection, state.currentMonth);
      setCoachResponse(insights ?? null); 
    } catch (error) {
      setCoachResponse("Coach is taking a breath. Please try again in a moment.");
    } finally {
      setIsCoachLoading(false);
    }
  };

  const exportReport = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const dataUrl = await htmlToImage.toPng(reportRef.current, {
        backgroundColor: '#ffffff',
        style: { padding: '60px', width: '2400px', maxWidth: 'none' },
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `ZenHabit-Report-${MONTHS[state.currentMonth]}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading ZenHabit...</p>
        </div>
      </div>
    );
  }

  if (!session && !isGuest) {
    return <LoginPage onGuestMode={handleEnterAsGuest} />;
  }

  return (
    <div className="min-h-screen pb-10 sm:pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center justify-between md:justify-start gap-3 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <i className="fa-solid fa-leaf text-lg sm:text-xl"></i>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">ZenHabit</h1>
                  <div className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${!session ? 'bg-slate-100 text-slate-500' : isSynced ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600 animate-pulse'}`}>
                    <i className={`fa-solid ${!session ? 'fa-hard-drive' : isSynced ? 'fa-cloud-check' : 'fa-arrows-rotate'}`}></i>
                    {!session ? 'Local' : 'Synced'}
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 font-medium truncate max-w-[150px] sm:max-w-none">
                  {session?.user ? session.user.email : 'Guest Session'}
                </p>
              </div>
            </div>
            
            <div className="md:hidden flex items-center gap-2">
               <div className="text-right">
                  <span className="text-xs font-black text-emerald-600">{annualProgress.toFixed(0)}%</span>
                  <p className="text-[8px] text-slate-400 uppercase font-black">2026</p>
               </div>
               <button onClick={handleSignOut} className="p-2 text-slate-400">
                <i className="fa-solid fa-right-from-bracket"></i>
              </button>
            </div>
          </div>

          <nav className="flex items-center bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('tracker')} className={`flex-1 md:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'tracker' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Tracker</button>
            <button onClick={() => setActiveTab('dashboard')} className={`flex-1 md:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Dashboard</button>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Consistency</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-emerald-600">{annualProgress.toFixed(1)}%</span>
              </div>
            </div>
            <button onClick={handleSignOut} className="p-2.5 text-slate-400 hover:text-rose-600 transition-colors" title="Sign Out">
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8">
        {isDataLoading ? (
           <div className="flex flex-col items-center justify-center py-20 gap-4">
             <div className="w-10 h-10 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gathering habits...</p>
           </div>
        ) : (
          <>
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-800">{MONTHS[state.currentMonth]} {state.year}</h2>
                  <button onClick={() => setIsHabitModalOpen(true)} className="mt-2 sm:mt-0 text-[10px] sm:text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 px-3 py-1 bg-indigo-50 rounded-full transition-colors"><i className="fa-solid fa-plus"></i>Add Habit</button>
                </div>
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3">
                <button onClick={exportReport} disabled={isExporting} className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-black text-xs transition-all shadow-lg bg-indigo-600 hover:bg-indigo-700">
                  <i className={`fa-solid ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-export'}`}></i>
                  {isExporting ? 'Exporting...' : 'Export PNG'}
                </button>
                <div className="flex gap-1.5">
                  <button onClick={goToToday} className="px-3 bg-white border border-slate-200 rounded-xl text-[10px] sm:text-xs font-bold text-slate-500 hover:text-indigo-600 transition-all">Today</button>
                  <button disabled={state.currentMonth === 0} onClick={() => changeMonth(-1)} className="p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all disabled:opacity-20"><i className="fa-solid fa-chevron-left text-xs"></i></button>
                  <button disabled={state.currentMonth === 11} onClick={() => changeMonth(1)} className="p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all disabled:opacity-20"><i className="fa-solid fa-chevron-right text-xs"></i></button>
                </div>
              </div>
            </div>

            {activeTab === 'tracker' ? (
              <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
                <div ref={reportRef} className={`bg-white rounded-[24px] sm:rounded-[48px] overflow-hidden border border-slate-100 shadow-sm ${isExporting ? 'w-[2400px] !max-w-none' : ''}`}>
                  <div className="p-4 sm:p-12 space-y-8 sm:space-y-12 bg-white">
                    <HabitGrid 
                      habits={state.habits} 
                      currentMonth={state.currentMonth} 
                      onToggle={handleToggle}
                      onEditHabit={(h) => setEditingHabit(h)}
                      onDeleteHabit={handleDeleteHabit}
                      isExporting={isExporting}
                    />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
                      <div className="col-span-1">
                        <SummaryChart habits={state.habits} monthIndex={state.currentMonth} />
                      </div>
                      <div className="col-span-1 lg:col-span-2 space-y-4 sm:space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <div className="bg-emerald-50/50 p-6 sm:p-8 rounded-[24px] sm:rounded-[40px] border border-emerald-100">
                            <h4 className="font-black text-emerald-700 mb-2 text-[10px] sm:text-xs uppercase tracking-widest">Monthly Wins</h4>
                            <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">{currentReflection.wins || "No wins logged yet."}</p>
                          </div>
                          <div className="bg-indigo-50/50 p-6 sm:p-8 rounded-[24px] sm:rounded-[40px] border border-indigo-100">
                            <h4 className="font-black text-indigo-700 mb-2 text-[10px] sm:text-xs uppercase tracking-widest">Opportunities</h4>
                            <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">{currentReflection.improvements || "No improvements noted yet."}</p>
                          </div>
                        </div>
                        {coachResponse && (
                          <div className="bg-slate-900 p-6 sm:p-10 rounded-[24px] sm:rounded-[48px] text-indigo-50 text-xs sm:text-sm leading-relaxed border-4 border-indigo-500/20 shadow-2xl overflow-x-auto">
                            <div className="prose prose-invert prose-indigo prose-xs sm:prose-sm max-w-none">
                              {coachResponse}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 sm:pt-10 border-t border-slate-200">
                  <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <i className="fa-solid fa-feather-pointed text-indigo-500"></i>
                      Reflection Zone
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Wins</label>
                        <textarea className="w-full p-4 rounded-xl sm:rounded-2xl bg-slate-50 text-sm h-32 resize-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white outline-none border border-transparent focus:border-indigo-200 transition-all" placeholder="What were your biggest successes?" value={currentReflection.wins} onChange={(e) => handleReflectionChange('wins', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Improvements</label>
                        <textarea className="w-full p-4 rounded-xl sm:rounded-2xl bg-slate-50 text-sm h-32 resize-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white outline-none border border-transparent focus:border-indigo-200 transition-all" placeholder="What can be done better?" value={currentReflection.improvements} onChange={(e) => handleReflectionChange('improvements', e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="p-6 sm:p-8 bg-indigo-600 rounded-[24px] sm:rounded-[40px] text-white text-center flex flex-col items-center justify-center shadow-2xl shadow-indigo-200">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                      <i className="fa-solid fa-wand-magic-sparkles text-2xl sm:text-3xl"></i>
                    </div>
                    <h4 className="text-lg sm:text-xl font-bold mb-2">AI Coach</h4>
                    <p className="text-[10px] sm:text-xs text-indigo-100 mb-6 font-medium">Get a deep-dive analysis of your 2026 performance.</p>
                    <button onClick={requestCoachInsights} disabled={isCoachLoading} className="w-full py-4 bg-white text-indigo-600 font-black rounded-2xl hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50 text-sm">
                      {isCoachLoading ? 'Thinking...' : 'Analyze My Progress'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Dashboard habits={state.habits} />
            )}
          </>
        )}
      </main>

      <HabitModal isOpen={isHabitModalOpen} onClose={() => setIsHabitModalOpen(false)} onSave={handleAddHabit} />
      {editingHabit && <HabitModal isOpen={true} onClose={() => setEditingHabit(null)} onSave={(name, cat) => handleUpdateHabit(editingHabit.id, name, cat)} initialHabit={editingHabit} />}
    </div>
  );
};

export default App;
