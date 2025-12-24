
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { HabitGrid } from './components/HabitGrid';
import { Dashboard } from './components/Dashboard';
import { SummaryChart } from './components/SummaryChart';
import { HabitModal } from './components/HabitModal';
import { INITIAL_HABITS, MONTHS, MONTH_DAYS } from './constants';
import { AppState, Habit, HabitCategory } from './types';
import { getCoachInsights } from './services/gemini';
import * as htmlToImage from 'html-to-image';

const STORAGE_KEY = 'zenhabit_2026_persistence_v1';

const App: React.FC = () => {
  const now = new Date();
  const is2026 = now.getFullYear() === 2026;
  const realWorldMonth = now.getMonth();
  const realWorldDay = now.getDate();

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load saved data", e);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsSynced(false);
    const timeout = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setIsSynced(true);
    }, 500);
    return () => clearTimeout(timeout);
  }, [state]);

  const handleToggle = (habitId: string, dayIndex: number) => {
    setState(prev => ({
      ...prev,
      habits: prev.habits.map(h => {
        if (h.id === habitId) {
          const newData = [...h.data];
          const newMonthData = [...newData[prev.currentMonth]];
          newMonthData[dayIndex] = !newMonthData[dayIndex];
          newData[prev.currentMonth] = newMonthData;
          return { ...h, data: newData };
        }
        return h;
      })
    }));
  };

  const handleAddHabit = (name: string, category: HabitCategory) => {
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name,
      category,
      data: MONTH_DAYS.map(days => Array(days).fill(false))
    };
    setState(prev => ({ ...prev, habits: [...prev.habits, newHabit] }));
    setIsHabitModalOpen(false);
  };

  const handleUpdateHabit = (id: string, name: string, category: HabitCategory) => {
    setState(prev => ({
      ...prev,
      habits: prev.habits.map(h => h.id === id ? { ...h, name, category } : h)
    }));
    setEditingHabit(null);
  };

  const handleDeleteHabit = (id: string) => {
    setState(prev => ({
      ...prev,
      habits: prev.habits.filter(h => h.id !== id)
    }));
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `zenhabit-backup-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedState = JSON.parse(content);
        if (importedState.habits && Array.isArray(importedState.habits)) {
          if (confirm("Restore from backup? This will overwrite your current data.")) {
            setState(importedState);
          }
        } else {
          alert("Invalid backup file format.");
        }
      } catch (err) { alert("Failed to parse the backup file."); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleResetData = () => {
    if (confirm("Are you sure? This will delete all your progress and restore the default habits.")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
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
    const totalPossible = state.habits.length * state.habits[0].data[state.currentMonth].length;
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
      // FIX: Use nullish coalescing (??) to ensure we never pass 'undefined' to setCoachResponse
      setCoachResponse(insights ?? null); 
    } catch (error) {
      console.error("AI Coach failed:", error);
      setCoachResponse("Coach is currently unavailable. Please check your connection.");
    } finally {
      setIsCoachLoading(false);
    }
  };

  const exportReport = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    // Allow React to re-render with isExporting=true to expand the table
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const dataUrl = await htmlToImage.toPng(reportRef.current, {
        backgroundColor: '#ffffff',
        style: { 
          padding: '60px', 
          borderRadius: '0px',
          width: '2400px', // Force high resolution width for full grid
          maxWidth: 'none'
        },
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `ZenHabit-Master-Report-${MONTHS[state.currentMonth]}-2026.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('High-fidelity export failed. Try again or check browser permissions.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <i className="fa-solid fa-leaf text-xl"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">ZenHabit 2026</h1>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${isSynced ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600 animate-pulse'}`}>
                  <i className={`fa-solid ${isSynced ? 'fa-cloud-check' : 'fa-arrows-rotate'}`}></i>
                  {isSynced ? 'Saved' : 'Saving'}
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium">Positive Growth Tracker</p>
            </div>
          </div>

          <nav className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('tracker')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'tracker' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tracker</button>
            <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Annual Dashboard</button>
          </nav>

          <div className="hidden lg:flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Yearly Progress</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-emerald-600">{annualProgress.toFixed(1)}%</span>
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${annualProgress}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-slate-800">{MONTHS[state.currentMonth]} {state.year}</h2>
              {is2026 && state.currentMonth === realWorldMonth && <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-md border border-indigo-100">Current Month</span>}
            </div>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-slate-500 font-medium flex items-center gap-2"><i className="fa-solid fa-circle text-[6px] text-indigo-400"></i>Building momentum, one day at a time.</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsHabitModalOpen(true)} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 px-3 py-1 bg-indigo-50 rounded-full transition-colors"><i className="fa-solid fa-plus"></i>Add Habit</button>
                <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>
                <div className="flex items-center bg-slate-100 rounded-full p-0.5">
                  <button onClick={handleExportData} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors" title="Backup"><i className="fa-solid fa-download text-[10px]"></i></button>
                  <button onClick={handleImportClick} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors" title="Restore"><i className="fa-solid fa-upload text-[10px]"></i></button>
                  <button onClick={handleResetData} className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors" title="Reset"><i className="fa-solid fa-trash-arrow-up text-[10px]"></i></button>
                  <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".json" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportReport} 
              disabled={isExporting} 
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-white font-black text-sm transition-all shadow-xl ${isExporting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
            >
              <i className={`fa-solid ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-export'}`}></i>
              {isExporting ? 'Generating Report...' : 'Export High-Fidelity Master Report'}
            </button>
            <div className="flex gap-2">
              <button onClick={goToToday} className="px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm flex items-center gap-1">Today</button>
              <button disabled={state.currentMonth === 0} onClick={() => changeMonth(-1)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all disabled:opacity-20 shadow-sm"><i className="fa-solid fa-chevron-left"></i></button>
              <button disabled={state.currentMonth === 11} onClick={() => changeMonth(1)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all disabled:opacity-20 shadow-sm"><i className="fa-solid fa-chevron-right"></i></button>
            </div>
          </div>
        </div>

        {activeTab === 'tracker' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* THIS IS THE CAPTURE AREA */}
            <div ref={reportRef} className={`bg-white rounded-[48px] overflow-hidden border border-slate-100 shadow-sm ${isExporting ? 'w-[2400px] !max-w-none' : ''}`}>
              <div className="p-12 space-y-12 bg-white">
                <div className="flex items-start justify-between gap-8 border-b border-slate-100 pb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-200">
                      <i className="fa-solid fa-leaf text-3xl"></i>
                    </div>
                    <div>
                      <h3 className="text-4xl font-black text-slate-900 tracking-tight">Performance Summary Report</h3>
                      <p className="text-slate-400 font-black uppercase text-sm tracking-[0.3em]">{MONTHS[state.currentMonth]} 2026 Journey</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center px-10 py-5 bg-indigo-50/50 rounded-[32px] border border-indigo-100/50">
                      <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest mb-1">Consistency Score</p>
                      <span className="text-6xl font-black text-indigo-600">{currentMonthProgress.toFixed(0)}<span className="text-2xl text-indigo-300">%</span></span>
                    </div>
                  </div>
                </div>

                <div className="space-y-10">
                  <div>
                    <h4 className="font-black text-slate-400 mb-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] ml-2">
                      <i className="fa-solid fa-table text-indigo-500"></i>
                      Full Habit Completion Grid
                    </h4>
                    <HabitGrid 
                      habits={state.habits} 
                      currentMonth={state.currentMonth} 
                      onToggle={handleToggle}
                      onEditHabit={(h) => setEditingHabit(h)}
                      onDeleteHabit={handleDeleteHabit}
                      isExporting={isExporting}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-10">
                    <div className="col-span-1 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col">
                      <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-xs uppercase tracking-widest">
                        <i className="fa-solid fa-chart-pie text-indigo-500"></i>
                        Distribution Analysis
                      </h4>
                      <div className="flex-1 min-h-[300px]">
                        <SummaryChart habits={state.habits} monthIndex={state.currentMonth} />
                      </div>
                    </div>

                    <div className="col-span-2 space-y-8">
                      <div className="grid grid-cols-2 gap-8">
                        <div className="bg-emerald-50/50 p-10 rounded-[40px] border border-emerald-100">
                          <h4 className="font-black text-emerald-700 mb-4 flex items-center gap-2 text-xs uppercase tracking-widest">
                            <i className="fa-solid fa-trophy"></i> Major Wins & Breakthroughs
                          </h4>
                          <p className="text-base text-slate-700 leading-relaxed italic">
                            {currentReflection.wins || "No wins documented for this cycle."}
                          </p>
                        </div>
                        <div className="bg-indigo-50/50 p-10 rounded-[40px] border border-indigo-100">
                          <h4 className="font-black text-indigo-700 mb-4 flex items-center gap-2 text-xs uppercase tracking-widest">
                            <i className="fa-solid fa-rocket"></i> Optimization Strategy
                          </h4>
                          <p className="text-base text-slate-700 leading-relaxed italic">
                            {currentReflection.improvements || "Next level goals not yet defined."}
                          </p>
                        </div>
                      </div>

                      {coachResponse && (
                        <div className="bg-slate-900 p-12 rounded-[48px] shadow-2xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-10 opacity-10">
                            <i className="fa-solid fa-robot text-8xl"></i>
                          </div>
                          <h4 className="text-indigo-400 font-black mb-8 text-[10px] uppercase tracking-[0.4em]">Expert AI Performance Evaluation</h4>
                          <div className="text-sm text-indigo-50 leading-loose whitespace-pre-wrap">
                            {coachResponse}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-12 border-t border-slate-100 flex items-center justify-between">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.5em]">ZenHabit System 2026</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Generated on {new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-10 border-t border-slate-200">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><i className="fa-solid fa-feather-pointed text-indigo-500"></i>Log Your Reflections</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Wins & Achievements</label>
                      <textarea className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all text-sm h-32 resize-none" placeholder="What are you proud of?" value={currentReflection.wins} onChange={(e) => handleReflectionChange('wins', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Areas to Improve</label>
                      <textarea className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all text-sm h-32 resize-none" placeholder="What's the next goal?" value={currentReflection.improvements} onChange={(e) => handleReflectionChange('improvements', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-8 bg-indigo-600 rounded-[40px] shadow-2xl shadow-indigo-200 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-20 rotate-12"><i className="fa-solid fa-robot text-8xl"></i></div>
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 mx-auto backdrop-blur-sm"><i className="fa-solid fa-wand-magic-sparkles text-2xl"></i></div>
                  <h4 className="text-xl font-bold mb-2">Smart Analysis</h4>
                  <p className="text-indigo-100 text-sm mb-8 px-4">Let Gemini analyze your {MONTHS[state.currentMonth]} data for actionable coaching.</p>
                  <button onClick={requestCoachInsights} disabled={isCoachLoading} className="w-full py-4 bg-white text-indigo-600 font-black rounded-2xl hover:bg-indigo-50 shadow-xl transition-all active:scale-95 disabled:opacity-50 text-sm">{isCoachLoading ? 'Generating...' : 'Consult AI Coach'}</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500"><Dashboard habits={state.habits} /></div>
        )}
      </main>

      <HabitModal isOpen={isHabitModalOpen} onClose={() => setIsHabitModalOpen(false)} onSave={handleAddHabit} />
      {editingHabit && <HabitModal isOpen={true} onClose={() => setEditingHabit(null)} onSave={(name, cat) => handleUpdateHabit(editingHabit.id, name, cat)} initialHabit={editingHabit} />}
      <footer className="mt-20 border-t border-slate-200 py-16 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-4 text-slate-300"><i className="fa-solid fa-seedling"></i><div className="w-12 h-[1px] bg-slate-200"></div><i className="fa-solid fa-leaf"></i><div className="w-12 h-[1px] bg-slate-200"></div><i className="fa-solid fa-tree"></i></div>
        <p className="text-sm text-slate-400 font-medium">ZenHabit &copy; 2026 • Your Progress is Your Power.</p>
      </footer>
    </div>
  );
};

export default App;
