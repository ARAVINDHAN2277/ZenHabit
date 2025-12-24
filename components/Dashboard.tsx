
import React, { useMemo } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, Cell, PieChart, Pie
} from 'recharts';
import { Habit, HabitCategory } from '../types';
import { MONTHS, MONTH_DAYS } from '../constants';

interface DashboardProps {
  habits: Habit[];
}

export const Dashboard: React.FC<DashboardProps> = ({ habits }) => {
  // 1. KPI Calculations
  const stats = useMemo(() => {
    let totalPossible = 0;
    let totalCompleted = 0;
    let maxStreak = 0;
    const categoryScores: Record<string, { comp: number, total: number }> = {};

    habits.forEach(h => {
      let currentHabitStreak = 0;
      h.data.forEach((monthArr, mIdx) => {
        monthArr.forEach((val, dIdx) => {
          totalPossible++;
          if (val) {
            totalCompleted++;
            currentHabitStreak++;
            categoryScores[h.category] = categoryScores[h.category] || { comp: 0, total: 0 };
            categoryScores[h.category].comp++;
          } else {
            maxStreak = Math.max(maxStreak, currentHabitStreak);
            currentHabitStreak = 0;
          }
          categoryScores[h.category] = categoryScores[h.category] || { comp: 0, total: 0 };
          categoryScores[h.category].total++;
        });
      });
      maxStreak = Math.max(maxStreak, currentHabitStreak);
    });

    const bestCat = Object.entries(categoryScores).reduce((a, b) => 
      (a[1].comp / a[1].total) > (b[1].comp / b[1].total) ? a : b, 
      ['None', { comp: 0, total: 1 }]
    )[0];

    return {
      avgRate: totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0,
      totalZen: totalCompleted,
      maxStreak,
      bestCat
    };
  }, [habits]);

  // 2. Weekday vs Weekend Analysis
  const dayPerformance = useMemo(() => {
    const counts: Record<number, { completed: number, total: number }> = {};
    // 0 = Sunday, 1 = Monday...
    for (let i = 0; i < 7; i++) counts[i] = { completed: 0, total: 0 };

    habits.forEach(h => {
      h.data.forEach((monthArr, mIdx) => {
        monthArr.forEach((val, dIdx) => {
          const date = new Date(2026, mIdx, dIdx + 1);
          const day = date.getDay();
          counts[day].total++;
          if (val) counts[day].completed++;
        });
      });
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames.map((name, i) => ({
      name,
      rate: counts[i].total > 0 ? (counts[i].completed / counts[i].total) * 100 : 0,
      type: (i === 0 || i === 6) ? 'Weekend' : 'Weekday'
    }));
  }, [habits]);

  // 3. Category Data (Radar & Pie)
  const categoryChartData = useMemo(() => {
    const counts: Record<string, { total: number, completed: number }> = {
      Health: { total: 0, completed: 0 },
      Mind: { total: 0, completed: 0 },
      Career: { total: 0, completed: 0 },
      Personal: { total: 0, completed: 0 },
    };
    habits.forEach(h => {
      h.data.forEach(monthArr => {
        counts[h.category].total += monthArr.length;
        counts[h.category].completed += monthArr.filter(Boolean).length;
      });
    });
    return Object.entries(counts).map(([name, val]) => ({
      name,
      value: val.completed,
      percentage: val.total > 0 ? (val.completed / val.total) * 100 : 0,
    }));
  }, [habits]);

  const monthlyTrendData = useMemo(() => {
    return MONTHS.map((name, mIdx) => {
      let monthTotal = 0;
      let monthCompleted = 0;
      habits.forEach(h => {
        monthTotal += h.data[mIdx].length;
        monthCompleted += h.data[mIdx].filter(Boolean).length;
      });
      return {
        month: name.substring(0, 3),
        rate: monthTotal > 0 ? (monthCompleted / monthTotal) * 100 : 0
      };
    });
  }, [habits]);

  // 4. Heatmap Data (Year Grid)
  const yearHeatmap = useMemo(() => {
    return Array.from({ length: 12 }, (_, mIdx) => {
      return Array.from({ length: 31 }, (_, dIdx) => {
        if (dIdx >= MONTH_DAYS[mIdx]) return null;
        let activeCount = 0;
        habits.forEach(h => {
          if (h.data[mIdx][dIdx]) activeCount++;
        });
        return habits.length > 0 ? activeCount / habits.length : 0;
      });
    });
  }, [habits]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];

  return (
    <div className="space-y-8 pb-10">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg consistency', val: `${stats.avgRate.toFixed(1)}%`, icon: 'fa-gauge-high', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Longest Streak', val: `${stats.maxStreak} Days`, icon: 'fa-fire', color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Best Category', val: stats.bestCat, icon: 'fa-trophy', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Zen Moments', val: stats.totalZen, icon: 'fa-leaf', color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 ${item.bg} ${item.color} rounded-xl flex items-center justify-center text-sm`}>
              <i className={`fa-solid ${item.icon}`}></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
              <p className="text-lg font-black text-slate-800 leading-none">{item.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-chart-line text-indigo-500"></i>
              Monthly Consistency Trend
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yearly Activity</span>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  formatter={(val: number) => [`${val.toFixed(1)}%`, 'Rate']}
                />
                <Line type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={4} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Life Balance (Radar) */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-circle-nodes text-purple-500"></i>
            Balance Matrix
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={categoryChartData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} />
                <Radar name="Success" dataKey="percentage" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} strokeWidth={3} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekday Performance */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-calendar-day text-emerald-500"></i>
            Performance by Weekday
          </h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayPerformance}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="rate" radius={[6, 6, 0, 0]} barSize={30}>
                  {dayPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.type === 'Weekend' ? '#f43f5e' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-center text-slate-400 font-medium mt-4 italic">
            Weekend discipline is often the key to long-term habit mastery.
          </p>
        </div>

        {/* Category Success (Donut) */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <i className="fa-solid fa-pie-chart text-orange-500"></i>
            Effort Allocation
          </h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {categoryChartData.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Yearly Activity Heatmap */}
      <div className="bg-slate-900 p-8 rounded-[40px] text-white overflow-hidden relative">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black flex items-center gap-2">
              <i className="fa-solid fa-fire-glow text-orange-400"></i>
              Yearly Momentum Map
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400">Low</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-slate-800"></div>
                <div className="w-3 h-3 rounded-sm bg-indigo-900"></div>
                <div className="w-3 h-3 rounded-sm bg-indigo-600"></div>
                <div className="w-3 h-3 rounded-sm bg-indigo-400"></div>
              </div>
              <span className="text-[10px] font-bold text-slate-400">High</span>
            </div>
          </div>
          
          <div className="overflow-x-auto no-scrollbar">
            <div className="inline-grid grid-rows-7 grid-flow-col gap-1.5">
              {/* Note: Simplified heatmap for mobile performance */}
              <div className="grid grid-cols-12 gap-4 min-w-[600px]">
                {yearHeatmap.map((month, mIdx) => (
                  <div key={mIdx} className="space-y-1">
                    <p className="text-[8px] font-black uppercase text-slate-500 mb-1">{MONTHS[mIdx].substring(0, 3)}</p>
                    <div className="grid grid-cols-4 gap-1">
                      {month.map((intensity, dIdx) => {
                        if (intensity === null) return null;
                        return (
                          <div 
                            key={dIdx} 
                            className="w-3 h-3 rounded-sm transition-all duration-500 hover:scale-125"
                            style={{ 
                              backgroundColor: intensity === 0 ? '#1e293b' : `rgba(129, 140, 248, ${Math.max(0.2, intensity)})`,
                              boxShadow: intensity > 0.8 ? '0 0 8px rgba(129, 140, 248, 0.4)' : 'none'
                            }}
                            title={`${intensity * 100}% consistency on this day`}
                          ></div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px]"></div>
      </div>
    </div>
  );
};
