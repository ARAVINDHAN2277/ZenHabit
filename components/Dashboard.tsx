
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
  // Aggregate data for Radar Chart (Life Balance) across the WHOLE year
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

  // Data for Habit vs Habit Bar Chart (Annual success rates)
  const habitSuccessData = useMemo(() => {
    return habits
      .map(h => {
        const totalDays = h.data.reduce((acc, m) => acc + m.length, 0);
        const totalCompleted = h.data.reduce((acc, m) => acc + m.filter(Boolean).length, 0);
        return {
          name: h.name.length > 15 ? h.name.substring(0, 12) + '...' : h.name,
          fullName: h.name,
          percentage: (totalCompleted / totalDays) * 100,
          category: h.category
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [habits]);

  // Monthly consistency trend (Jan to Dec)
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

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Radar Chart: Life Balance */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[400px]">
          <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-circle-nodes text-indigo-500"></i>
            Annual Life Balance
          </h3>
          <ResponsiveContainer width="100%" height="90%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={categoryData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="Annual %"
                dataKey="A"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.6}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Graph: Monthly Progress */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[400px]">
          <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-chart-line text-emerald-500"></i>
            Monthly Progress Trend
          </h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(val: number) => [`${val.toFixed(1)}%`, 'Completion Rate']}
              />
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 7 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Bar Chart: Habit Comparison */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[500px]">
        <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
          <i className="fa-solid fa-chart-bar text-blue-500"></i>
          Annual Habit Success Comparison
        </h3>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={habitSuccessData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              formatter={(val: number) => [`${val.toFixed(1)}%`, 'Success Rate']}
            />
            <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={20}>
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
