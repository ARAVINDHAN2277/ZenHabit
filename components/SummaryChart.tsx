
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { Habit } from '../types';

interface SummaryChartProps {
  habits: Habit[];
  monthIndex: number;
}

export const SummaryChart: React.FC<SummaryChartProps> = ({ habits, monthIndex }) => {
  const data = habits.map(h => {
    const monthData = h.data[monthIndex];
    const completed = monthData.filter(Boolean).length;
    const total = monthData.length;
    return {
      name: h.name.length > 12 ? h.name.substring(0, 10) + '...' : h.name,
      percentage: (completed / total) * 100,
      category: h.category
    };
  }).sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
          <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={12} isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={
                  entry.category === 'Health' ? '#10b981' :
                  entry.category === 'Mind' ? '#a855f7' :
                  entry.category === 'Career' ? '#3b82f6' : '#f59e0b'
                } 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
