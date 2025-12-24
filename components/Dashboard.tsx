
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
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly');

  // 1. Core Analytics & KPIs
  const analytics = useMemo(() => {
    let totalPossible = 0;
    let totalCompleted = 0;
    let maxStreak = 0;
    const categoryStats: Record<string, { comp: number, total: number }> = {};
    const habitPerformances: { name: string, rate: number, category: HabitCategory }[] = [];

    habits.forEach(h => {
      let currentHabitStreak = 0;
      let habitComp = 0;
      let habitTotal = 0;

      h.data.forEach((monthArr) => {
        monthArr.forEach((val) => {
          totalPossible++;
          habitTotal++;
          if (val) {
            totalCompleted++;
            habitComp++;
            currentHabitStreak++;
            categoryStats[h.category] = categoryStats[h.category] || { comp: 0, total: 0 };
            categoryStats[h.category].comp++;
          } else {
            maxStreak = Math.max(maxStreak, currentHabitStreak);
            currentHabitStreak = 0;
          }
          categoryStats[h.category] = categoryStats[h.category] || { comp: 0, total: 0 };
          categoryStats[h.category].total++;
        });
      });
      maxStreak = Math.max(maxStreak, currentHabitStreak);
      habitPerformances.push({ name: h.name, rate: (habitComp / habitTotal) * 100, category: h.category });
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

  // 2. Weekday vs Weekend Categorized
  const weekendInsightData = useMemo(() => {
    const data: Record<string, { weekdayComp: number, weekdayTotal: number, weekendComp: number, weekendTotal: number }> = {};
    CATEGORIES.forEach(cat => data[cat] = { weekdayComp: 0, weekdayTotal: 0, weekendComp: 0, weekendTotal: 0 });

    habits.forEach(h => {
      h.data.forEach((monthArr, mIdx) => {
        monthArr.forEach((val, dIdx) => {
          const date = new Date(2026, mIdx, dIdx + 1);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
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

  // 3. Multi-Category Monthly Trend (Complex Line Chart)
  const categoryTrends = useMemo(() => {
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

  // 4. Activity Volume Over Time (Stacked Area)
  const volumeData = useMemo(() => {
    return MONTHS.map((name, mIdx) => {
      const entry: any = { month: name.substring(0, 3) };
      CATEGORIES.forEach(cat => {
        entry[cat] = habits.filter(h => h.category === cat).reduce((acc, h) => acc + h.data[mIdx].filter(Boolean).length, 0);
      });
      return entry;
    });
  }, [habits]);

  const COLORS: Record<string, string> = {
    Health: '#10b981',
    Mind: '#a855f7',
    Career: '#3b82f6',
    Personal: '#f59e0b'
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      {/* Dynamic Navigation Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
         <div className="flex items-center gap-2 px-4">
            <i className="fa-solid fa-chart-pie text-indigo-500"></i>
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Analytics Dashboard</h2>
         </div>
         <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button 
              onClick={() => setViewMode('yearly')} 
              className={`flex-1 sm:px-6 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'yearly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >Yearly Overview</button>
            <button 
              onClick={() => setViewMode('monthly')} 
              className={`flex-1 sm:px-6 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >Top Habits</button>
         </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Annual Goal', val: `${analytics.avgRate.toFixed(1)}%`, icon: 'fa-bullseye', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Unstoppable Streak', val: `${analytics.maxStreak} Days`, icon: 'fa-bolt-lightning', color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Core Strength', val: analytics.bestCat, icon: 'fa-gem', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Completions', val: analytics.totalZen, icon: 'fa-check-double', color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 ${item.bg} ${item.color} rounded-xl flex items-center justify-center text-sm mb-4`}>
              <i className={`fa-solid ${item.icon}`}></i>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
            <p className="text-xl font-black text-slate-800">{item.val}</p>
          </div>
        ))}
      </div>

      {viewMode === 'yearly' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Multi-Category Evolution */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Category Evolution</h3>
                  <p className="text-xs text-slate-400 font-medium">Tracking growth across all life pillars</p>
                </div>
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={categoryTrends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} dy={15} />
                    <YAxis hide domain={[0, 105]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }} />
                    {CATEGORIES.map(cat => (
                      <Line 
                        key={cat} 
                        type="monotone" 
                        dataKey={cat} 
                        stroke={COLORS[cat]} 
                        strokeWidth={3} 
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekend vs Weekday Categorized */}
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
               <h3 className="font-bold text-slate-800 text-lg mb-2">The Weekend Gap</h3>
               <p className="text-xs text-slate-400 font-medium mb-8">Weekday vs. Weekend success rates</p>
               <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekendInsightData} layout="vertical" barGap={8}>
                      <XAxis type="number" hide domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} width={70} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, paddingBottom: '20px' }} />
                      <Bar dataKey="Weekday" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} />
                      <Bar dataKey="Weekend" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Effort Volume (Stacked Area) */}
             <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 text-lg mb-2">Monthly Activity Volume</h3>
                <p className="text-xs text-slate-400 font-medium mb-8">Total habits completed per month</p>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={volumeData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} />
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
                          fillOpacity={0.4} 
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>

             {/* Radar Balance Detail */}
             <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 text-lg mb-2">Zen Life Balance</h3>
                <p className="text-xs text-slate-400 font-medium mb-8">Visualization of your annual focus</p>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={weekendInsightData}>
                      <PolarGrid stroke="#f1f5f9" />
                      <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
                      <Radar name="Consistency" dataKey="Weekday" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={3} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Performers */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
               <i className="fa-solid fa-crown text-amber-500"></i>
               Elite Habits
            </h3>
            <div className="space-y-4">
               {analytics.leaderboard.slice(0, 5).map((h, i) => (
                 <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-4">
                       <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs">#{i+1}</span>
                       <div>
                          <p className="text-sm font-bold text-slate-800">{h.name}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{h.category}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-black text-emerald-600">{h.rate.toFixed(0)}%</p>
                       <div className="w-20 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${h.rate}%` }}></div>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Struggling Habits */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
               <i className="fa-solid fa-seedling text-indigo-500"></i>
               Growth Opportunities
            </h3>
            <div className="space-y-4">
               {analytics.leaderboard.slice(-5).reverse().map((h, i) => (
                 <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-4">
                       <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-black text-xs">#{analytics.leaderboard.length - i}</span>
                       <div>
                          <p className="text-sm font-bold text-slate-800">{h.name}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{h.category}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-black text-rose-500">{h.rate.toFixed(0)}%</p>
                       <div className="w-20 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-rose-400" style={{ width: `${h.rate}%` }}></div>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
            <div className="mt-8 p-6 bg-indigo-50 rounded-3xl border border-indigo-100 text-center">
               <p className="text-xs text-indigo-700 font-medium italic">"Low completion rates are not failures, they are data points for your next evolution."</p>
            </div>
          </div>
        </div>
      )}

      {/* Modern Heatmap Visualization */}
      <div className="bg-slate-900 p-8 sm:p-12 rounded-[48px] text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-2xl font-black text-white">Momentum Heatmap</h3>
                <p className="text-sm text-slate-400 font-medium">Visualizing discipline density across 365 days</p>
              </div>
              <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Intensity</span>
                <div className="flex gap-1.5">
                  <div className="w-4 h-4 rounded bg-slate-800"></div>
                  <div className="w-4 h-4 rounded bg-indigo-900"></div>
                  <div className="w-4 h-4 rounded bg-indigo-600"></div>
                  <div className="w-4 h-4 rounded bg-indigo-400"></div>
                  <div className="w-4 h-4 rounded bg-white"></div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar py-4">
               <div className="inline-grid grid-rows-7 grid-flow-col gap-1.5 sm:gap-2">
                  {MONTHS.map((m, mIdx) => (
                    <div key={mIdx} className="flex flex-col gap-1.5 sm:gap-2 pr-4 sm:pr-6 border-r border-slate-800/50">
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 sticky left-0">{m.substring(0, 3)}</p>
                       <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-2">
                          {Array.from({ length: MONTH_DAYS[mIdx] }).map((_, dIdx) => {
                             let dailyComp = 0;
                             habits.forEach(h => { if(h.data[mIdx][dIdx]) dailyComp++; });
                             const intensity = habits.length > 0 ? dailyComp / habits.length : 0;
                             return (
                               <div 
                                 key={dIdx} 
                                 className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-md transition-all duration-300 hover:scale-150 cursor-pointer"
                                 style={{ 
                                   backgroundColor: intensity === 0 ? '#1e293b' : 
                                                    intensity > 0.8 ? '#fff' :
                                                    `rgba(129, 140, 248, ${intensity + 0.2})`,
                                   boxShadow: intensity > 0.8 ? '0 0 15px rgba(255,255,255,0.4)' : 'none'
                                 }}
                                 title={`${(intensity * 100).toFixed(0)}% completion on Day ${dIdx + 1}`}
                               ></div>
                             );
                          })}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
          {/* Decorative Gradient Blurs */}
          <div className="absolute top-[-50px] right-[-50px] w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-100px] left-[-100px] w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]"></div>
      </div>
    </div>
  );
};
