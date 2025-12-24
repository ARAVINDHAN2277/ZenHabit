
import React, { useMemo } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell
} from 'recharts';
import { Habit, HabitCategory } from '../types';
import { MONTHS } from '../constants';

interface DashboardProps {
  habits: Habit[];
}

export const Dashboard: React.FC<DashboardProps> = ({ habits }) => {
  const categoryData = useMemo(() => {
    const counts: Record<HabitCategory, { total: number, completed: number }> = {
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
      subject: name,
      A: val.total > 0 ? (val.completed / val.total) * 100 : 0,
      fullMark: 100,
    }));
  }, [habits]);

  const habitSuccessData = useMemo(() => {
    return habits
      .map(h => {
        const totalDays = h.data.reduce((acc, m) => acc + m.length, 0);
        const totalCompleted = h.data.reduce((acc, m) => acc + m.filter(Boolean).length, 0);
        return {
          name: h.name.length > 10 ? h.name.substring(0, 8) + '...' : h.name,
          percentage: (totalCompleted / totalDays) * 100,
          category: h.category
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10); // Show top 10 on dashboard for cleaner mobile view
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
        month: name.substring(0, 1),
        rate: monthTotal > 0 ? (monthCompleted / monthTotal) * 100 : 0
      };
    });
  }, [habits]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 h-[320px] sm:h-[400px]">
          <h3 className="text-sm sm:text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-circle-nodes text-indigo-500"></i>
            Life Balance
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={categoryData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
              <Radar name="Annual %" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 h-[320px] sm:h-[400px]">
          <h3 className="text-sm sm:text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-chart-line text-emerald-500"></i>
            Progress Trend
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 9 }} />
              <YAxis domain={[0, 100]} hide />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px' }}
                formatter={(val: number) => [`${val.toFixed(1)}%`, 'Rate']}
              />
              <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 h-[400px] sm:h-[500px]">
        <h3 className="text-sm sm:text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
          <i className="fa-solid fa-chart-bar text-blue-500"></i>
          Top Habits Comparison
        </h3>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={habitSuccessData} layout="vertical">
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={16}>
              {habitSuccessData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={
                    entry.category === 'Health' ? '#22c55e' :
                    entry.category === 'Mind' ? '#a855f7' :
                    entry.category === 'Career' ? '#3b82f6' : '#f97316'
                  } 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
