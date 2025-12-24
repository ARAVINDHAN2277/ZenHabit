
import React, { useMemo, useState } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, Cell, PieChart, Pie, Legend, AreaChart, Area
} from 'recharts';
import { Habit, HabitCategory } from '../types';
import { MONTHS, MONTH_DAYS, CATEGORIES } from '../constants';

interface DashboardProps {
  habits: Habit[];
}

export const Dashboard: React.FC<DashboardProps> = ({ habits }) => {
  const [viewMode, setViewMode] = useState<'overview' | 'habits'>('overview');

  // 1. Advanced Analytics Engine
  const analytics = useMemo(() => {
    let totalPossible = 0;
    let totalCompleted = 0;
    let maxStreak = 0;
    const categoryStats: Record<string, { comp: number, total: number }> = {};
    const habitPerformances: { name: string, rate: number, category: HabitCategory, currentStreak: number }[] = [];

    habits.forEach(h => {
      let currentHabitStreak = 0;
      let tempStreak = 0;
      let habitComp = 0;
      let habitTotal = 0;

      h.data.forEach((monthArr) => {
        monthArr.forEach((val) => {
          totalPossible++;
          habitTotal++;
          if (val) {
            totalCompleted++;
            habitComp++;
            tempStreak++;
            categoryStats[h.category] = categoryStats[h.category] || { comp: 0, total: 0 };
            categoryStats[h.category].comp++;
          } else {
            maxStreak = Math.max(maxStreak, tempStreak);
            tempStreak = 0;
          }
          categoryStats[h.category] = categoryStats[h.category] || { comp: 0, total: 0 };
          categoryStats[h.category].total++;
        });
      });
      maxStreak = Math.max(maxStreak, tempStreak);
      
      // Calculate active current streak
      let activeStreak = 0;
      const flatData = h.data.flat();
      for (let i = flatData.length - 1; i >= 0; i--) {
        if (flatData[i]) activeStreak++;
        else if (activeStreak > 0) break;
      }

      habitPerformances.push({ 
        name: h.name, 
        rate: (habitComp / habitTotal) * 100, 
        category: h.category,
        currentStreak: activeStreak
      });
    });

    const bestCat = Object.entries(categoryStats).reduce((a, b) => 
      (a[1].comp / a[1].total) > (b[1].comp / b[1].total) ? a : b, 
      ['None', { comp: 0, total: 1 }]
    )[0];

    return {
      avgRate: totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0,
      totalZen: totalCompleted,
      maxStreak,
      bestCat,
      leaderboard: [...habitPerformances].sort((a, b) => b.rate - a.rate)
    };
  }, [habits]);

  // 2. Weekday vs Weekend Depth Analysis
  const weekdayWeekendData = useMemo(() => {
    const data: Record<string, { weekdayComp: number, weekdayTotal: number, weekendComp: number, weekendTotal: number }> = {};
    CATEGORIES.forEach(cat => data[cat] = { weekdayComp: 0, weekdayTotal: 0, weekendComp: 0, weekendTotal: 0 });

    habits.forEach(h => {
      h.data.forEach((monthArr, mIdx) => {
        monthArr.forEach((val, dIdx) => {
          const date = new Date(2026, mIdx, dIdx + 1);
          const day = date.getDay();
          const isWeekend = day === 0 || day === 6;
          if (isWeekend) {
            data[h.category].weekendTotal++;
            if (val) data[h.category].weekendComp++;
          } else {
            data[h.category].weekdayTotal++;
            if (val) data[h.category].weekdayComp++;
          }
        });
      });
    });

    return CATEGORIES.map(cat => ({
      name: cat,
      Weekday: data[cat].weekdayTotal > 0 ? (data[cat].weekdayComp / data[cat].weekdayTotal) * 100 : 0,
      Weekend: data[cat].weekendTotal > 0 ? (data[cat].weekendComp / data[cat].weekendTotal) * 100 : 0,
    }));
  }, [habits]);

  // 3. Yearly Category Trend Lines
  const yearlyCategoryTrends = useMemo(() => {
    return MONTHS.map((name, mIdx) => {
      const entry: any = { month: name.substring(0, 3) };
      CATEGORIES.forEach(cat => {
        let catTotal = 0;
        let catComp = 0;
        habits.filter(h => h.category === cat).forEach(h => {
          catTotal += h.data[mIdx].length;
          catComp += h.data[mIdx].filter(Boolean).length;
        });
        entry[cat] = catTotal > 0 ? (catComp / catTotal) * 100 : 0;
      });
      return entry;
    });
  }, [habits]);

  // 4. Monthly Habit Completion Volume
  const monthlyVolume = useMemo(() => {
    return MONTHS.map((name, mIdx) => {
      const entry: any = { month: name.substring(0, 3) };
      CATEGORIES.forEach(cat => {
        entry[cat] = habits.filter(h => h.category === cat).reduce((acc, h) => acc + h.data[mIdx].filter(Boolean).length, 0);
      });
      return entry;
    });
  }, [habits]);

  const COLORS: Record<string, string> = {
    Health: '#10b981', // Emerald
    Mind: '#a855f7',   // Purple
    Career: '#3b82f6', // Blue
    Personal: '#f59e0b' // Amber
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Navigation & Tab Selection */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-3xl border border-slate-100 shadow-sm">
         <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs">
              <i className="fa-solid fa-chart-simple"></i>
            </div>
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">2026 Insights Engine</h2>
         </div>
         <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto">
            <button 
              onClick={() => setViewMode('overview')} 
              className={`flex-1 sm:px-8 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'overview' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
            >Yearly Performance</button>
            <button 
              onClick={() => setViewMode('habits')} 
              className={`flex-1 sm:px-8 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'habits' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
            >Habit Leaderboard</button>
         </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Annual Mastery', val: `${analytics.avgRate.toFixed(1)}%`, icon: 'fa-bullseye', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Unstoppable Peak', val: `${analytics.maxStreak} Days`, icon: 'fa-fire-flame-curved', color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Core Strength', val: analytics.bestCat, icon: 'fa-crown', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Zen Momentum', val: analytics.totalZen, icon: 'fa-leaf', color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center text-lg mb-5 shadow-inner`}>
              <i className={`fa-solid ${item.icon}`}></i>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{item.label}</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">{item.val}</p>
          </div>
        ))}
      </div>

      {viewMode === 'overview' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Multi-Category Progress Line Chart */}
            <div className="lg:col-span-2 bg-white p-8 sm:p-10 rounded-[40px] border border-slate-100 shadow-sm">
              <div className="mb-10">
                <h3 className="font-bold text-slate-800 text-xl tracking-tight">Category Evolution</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Consistency tracking across all focus areas</p>
              </div>
              <div className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yearlyCategoryTrends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={15} />
                    <YAxis hide domain={[0, 105]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '15px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 800 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }} />
                    {CATEGORIES.map(cat => (
                      <Line 
                        key={cat} 
                        type="monotone" 
                        dataKey={cat} 
                        stroke={COLORS[cat]} 
                        strokeWidth={4} 
                        dot={false}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekend Gap Bar Chart */}
            <div className="bg-white p-8 sm:p-10 rounded-[40px] border border-slate-100 shadow-sm">
               <div className="mb-10">
                 <h3 className="font-bold text-slate-800 text-xl tracking-tight">The Weekend Ritual</h3>
                 <p className="text-xs text-slate-400 font-medium mt-1">Weekday vs. Weekend success</p>
               </div>
               <div className="h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekdayWeekendData} layout="vertical" barGap={8}>
                      <XAxis type="number" hide domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 800 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 800, paddingBottom: '30px' }} />
                      <Bar dataKey="Weekday" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={14} />
                      <Bar dataKey="Weekend" fill="#f43f5e" radius={[0, 6, 6, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
             {/* Stacked Area Volume Chart */}
             <div className="bg-white p-8 sm:p-10 rounded-[40px] border border-slate-100 shadow-sm">
                <div className="mb-10">
                  <h3 className="font-bold text-slate-800 text-xl tracking-tight">Discipline Volume</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">Cumulative daily habit completions</p>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyVolume}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} />
                      <YAxis hide />
                      <Tooltip />
                      {CATEGORIES.map(cat => (
                        <Area 
                          key={cat} 
                          type="monotone" 
                          dataKey={cat} 
                          stackId="1" 
                          stroke={COLORS[cat]} 
                          fill={COLORS[cat]} 
                          fillOpacity={0.5} 
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>

             {/* Radar Balance Visualizer */}
             <div className="bg-white p-8 sm:p-10 rounded-[40px] border border-slate-100 shadow-sm">
                <div className="mb-10">
                  <h3 className="font-bold text-slate-800 text-xl tracking-tight">Equilibrium Radar</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">Visualizing your life balance pillars</p>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={weekdayWeekendData}>
                      <PolarGrid stroke="#f1f5f9" strokeWidth={2} />
                      <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 900 }} />
                      <Radar name="Discipline" dataKey="Weekday" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={4} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
          {/* Top Performers Column */}
          <div className="bg-white p-8 sm:p-12 rounded-[48px] border border-slate-100 shadow-sm">
            <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
               <i className="fa-solid fa-medal text-amber-500"></i>
               Elite Mastery
            </h3>
            <div className="space-y-5">
               {analytics.leaderboard.slice(0, 6).map((h, i) => (
                 <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-[24px] border border-slate-100 hover:scale-[1.02] transition-transform">
                    <div className="flex items-center gap-5">
                       <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${i === 0 ? 'bg-amber-400 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                         {i+1}
                       </span>
                       <div>
                          <p className="text-base font-bold text-slate-800">{h.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{h.category}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">{h.currentStreak}D Streak</span>
                          </div>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-lg font-black text-emerald-600 leading-none">{h.rate.toFixed(0)}%</p>
                       <div className="w-24 h-2 bg-slate-200 rounded-full mt-2.5 overflow-hidden">
                          <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${h.rate}%` }}></div>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Growth Opportunities Column */}
          <div className="bg-white p-8 sm:p-12 rounded-[48px] border border-slate-100 shadow-sm">
            <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
               <i className="fa-solid fa-compass text-indigo-500"></i>
               Growth Horizon
            </h3>
            <div className="space-y-5">
               {analytics.leaderboard.slice(-6).reverse().map((h, i) => (
                 <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-[24px] border border-slate-100 hover:scale-[1.02] transition-transform">
                    <div className="flex items-center gap-5">
                       <span className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center font-black text-sm">
                         #{analytics.leaderboard.length - i}
                       </span>
                       <div>
                          <p className="text-base font-bold text-slate-800">{h.name}</p>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{h.category}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-lg font-black text-rose-500 leading-none">{h.rate.toFixed(0)}%</p>
                       <div className="w-24 h-2 bg-slate-200 rounded-full mt-2.5 overflow-hidden">
                          <div className="h-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]" style={{ width: `${h.rate}%` }}></div>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
            <div className="mt-10 p-8 bg-indigo-600 rounded-[32px] text-center shadow-xl shadow-indigo-100">
               <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="fa-solid fa-lightbulb text-white text-xl"></i>
               </div>
               <p className="text-sm text-indigo-50 font-bold leading-relaxed">
                 "Resistance is where the growth happens. Focus on your bottom 3 habits this week."
               </p>
            </div>
          </div>
        </div>
      )}

      {/* Global Activity Heatmap Section */}
      <div className="bg-slate-900 p-10 sm:p-16 rounded-[56px] text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
              <div>
                <h3 className="text-3xl font-black text-white tracking-tight">Discipline Matrix</h3>
                <p className="text-sm text-slate-400 font-medium mt-1">Visualizing your 365-day habit density</p>
              </div>
              <div className="flex items-center gap-4 bg-slate-800/40 p-4 rounded-[20px] border border-slate-700/50">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Momentum</span>
                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-md bg-slate-800 shadow-inner"></div>
                  <div className="w-5 h-5 rounded-md bg-indigo-950 shadow-inner"></div>
                  <div className="w-5 h-5 rounded-md bg-indigo-700 shadow-inner"></div>
                  <div className="w-5 h-5 rounded-md bg-indigo-400 shadow-inner"></div>
                  <div className="w-5 h-5 rounded-md bg-white shadow-[0_0_15px_rgba(255,255,255,0.4)]"></div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar py-6">
               <div className="inline-grid grid-rows-7 grid-flow-col gap-2 sm:gap-3">
                  {MONTHS.map((m, mIdx) => (
                    <div key={mIdx} className="flex flex-col gap-2 sm:gap-3 pr-6 sm:pr-8 border-r border-slate-800/60">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{m.substring(0, 3)}</p>
                       <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-2.5">
                          {Array.from({ length: MONTH_DAYS[mIdx] }).map((_, dIdx) => {
                             let dailyComp = 0;
                             habits.forEach(h => { if(h.data[mIdx][dIdx]) dailyComp++; });
                             const intensity = habits.length > 0 ? dailyComp / habits.length : 0;
                             return (
                               <div 
                                 key={dIdx} 
                                 className="w-4 h-4 sm:w-6 sm:h-6 rounded-lg transition-all duration-500 hover:scale-[1.8] cursor-crosshair relative group"
                                 style={{ 
                                   backgroundColor: intensity === 0 ? '#1e293b' : 
                                                    intensity > 0.8 ? '#fff' :
                                                    `rgba(129, 140, 248, ${intensity + 0.3})`,
                                   boxShadow: intensity > 0.8 ? '0 0 20px rgba(255,255,255,0.5)' : 'none'
                                 }}
                               >
                                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-[8px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                    {(intensity * 100).toFixed(0)}%
                                  </div>
                               </div>
                             );
                          })}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
          {/* Advanced Decorative Blurs */}
          <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-150px] left-[-150px] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]"></div>
      </div>
    </div>
  );
};
