
import React, { useState } from 'react';
import { Habit, HabitCategory } from '../types';
import { Sparkline } from './Sparkline';
import { MONTH_DAYS } from '../constants';

interface HabitGridProps {
  habits: Habit[];
  currentMonth: number;
  onToggle: (habitId: string, dayIndex: number) => void;
  onEditHabit?: (habit: Habit) => void;
  onDeleteHabit?: (id: string) => void;
  isExporting?: boolean;
}

export const HabitGrid: React.FC<HabitGridProps> = ({ 
  habits, 
  currentMonth, 
  onToggle, 
  onEditHabit, 
  onDeleteHabit,
  isExporting = false
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const numDays = MONTH_DAYS[currentMonth];
  const days = Array.from({ length: numDays }, (_, i) => i + 1);

  const now = new Date();
  const is2026 = now.getFullYear() === 2026;
  const realWorldMonth = now.getMonth();
  const realWorldDay = now.getDate();

  const getIsWeekend = (day: number) => {
    const date = new Date(2026, currentMonth, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const calculateCurrentStreak = (habit: Habit) => {
    let streak = 0;
    let stop = false;
    for (let m = currentMonth; m >= 0; m--) {
      const monthData = habit.data[m];
      for (let d = monthData.length - 1; d >= 0; d--) {
        if (monthData[d]) {
          streak++;
        } else {
          if (streak > 0) {
            stop = true;
            break;
          }
        }
      }
      if (stop) break;
    }
    return streak;
  };

  const checkTwoDayRule = (data: boolean[], dayIdx: number) => {
    if (dayIdx < 1) return false;
    return !data[dayIdx] && !data[dayIdx - 1];
  };

  const tableContent = (
    <table className={`w-full text-xs sm:text-sm text-left border-collapse ${isExporting ? 'table-auto' : ''}`}>
      <thead>
        <tr className="bg-slate-50/50 border-b border-slate-200">
          <th className={`p-3 sm:p-5 border-r border-slate-200 min-w-[140px] sm:min-w-[220px] font-bold text-slate-800 ${isExporting ? '' : 'sticky left-0 z-30 bg-slate-50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]'}`}>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-calendar-check text-indigo-500 hidden sm:inline"></i>
              Habit
            </div>
          </th>
          <th className="hidden md:table-cell p-5 font-bold text-slate-700 min-w-[100px] bg-slate-50/50">Category</th>
          {days.map(day => {
            const isToday = is2026 && currentMonth === realWorldMonth && day === realWorldDay;
            const isWeekend = getIsWeekend(day);
            return (
              <th 
                key={day} 
                className={`p-1.5 sm:p-2 text-center font-bold min-w-[34px] sm:min-w-[42px] border-r border-slate-100 text-[9px] sm:text-[10px] uppercase tracking-tighter transition-colors 
                  ${isToday ? 'bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-200 z-10 relative' : 
                    isWeekend ? 'bg-slate-100 text-slate-500' : 'text-slate-400'}`}
              >
                {day}
              </th>
            );
          })}
          <th className="p-3 sm:p-5 font-bold text-slate-700 min-w-[80px] sm:min-w-[110px] text-center border-l border-slate-200 bg-slate-100/30">Rate</th>
          <th className="hidden sm:table-cell p-5 font-bold text-slate-700 min-w-[90px] text-center bg-slate-100/30">Streak</th>
          <th className="hidden lg:table-cell p-5 font-bold text-slate-700 min-w-[150px] text-center bg-slate-100/30">Trend</th>
          {!isExporting && onEditHabit && <th className="p-2 sm:p-5 font-bold text-slate-700 w-12 sm:w-20 text-center bg-slate-100/30"></th>}
        </tr>
      </thead>
      <tbody>
        {habits.map((habit) => {
          const monthData = habit.data[currentMonth];
          const completedCount = monthData.filter(Boolean).length;
          const progressPct = (completedCount / numDays) * 100;
          const streak = calculateCurrentStreak(habit);
          const isConfirming = confirmDeleteId === habit.id;

          return (
            <tr 
              key={habit.id} 
              className={`transition-colors border-b border-slate-100 group ${
                isConfirming ? 'bg-rose-50/50' : 'hover:bg-slate-50/50'
              }`}
            >
              <td className={`transition-colors p-3 sm:p-5 border-r border-slate-200 font-semibold text-slate-700 whitespace-nowrap ${
                isConfirming ? 'bg-rose-50' : isExporting ? 'bg-white' : 'bg-white sticky left-0 z-20 group-hover:bg-slate-50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]'
              }`}>
                <div className="flex items-center justify-between group/name">
                  <span className={`truncate max-w-[100px] sm:max-w-none ${isConfirming ? 'text-rose-700 font-bold' : ''}`}>
                    {habit.name}
                  </span>
                  {!isExporting && onEditHabit && (
                    <div className={`flex items-center gap-1 transition-all duration-200 ${isConfirming ? 'opacity-100 translate-x-0' : 'opacity-0 md:group-hover/name:opacity-100'}`}>
                      {isConfirming ? (
                        <button onClick={() => { onDeleteHabit?.(habit.id); setConfirmDeleteId(null); }} className="px-2 py-1 bg-rose-600 text-white text-[8px] font-black uppercase rounded shadow-lg">Confirm</button>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(habit.id)} className="p-1.5 text-slate-300 hover:text-rose-600 sm:hidden">
                           <i className="fa-solid fa-trash text-[10px]"></i>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </td>
              <td className="hidden md:table-cell p-5">
                <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                  habit.category === 'Health' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  habit.category === 'Mind' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                  habit.category === 'Career' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                  'bg-orange-50 text-orange-700 border-orange-100'
                }`}>
                  {habit.category}
                </span>
              </td>
              {monthData.map((checked, dayIdx) => {
                const day = dayIdx + 1;
                const isToday = is2026 && currentMonth === realWorldMonth && day === realWorldDay;
                const isTwoDayAlert = checkTwoDayRule(monthData, dayIdx);
                const isWeekend = getIsWeekend(day);
                
                return (
                  <td 
                    key={dayIdx} 
                    className={`p-1 border-r border-slate-50 text-center transition-all 
                      ${isToday ? 'bg-indigo-50/40' : isWeekend ? 'bg-slate-100/40' : ''}`}
                  >
                    <button
                      disabled={isExporting}
                      onClick={() => onToggle(habit.id, dayIdx)}
                      className={`
                        group/btn w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-200 
                        relative mx-auto
                        ${checked 
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200/50' 
                          : isTwoDayAlert 
                            ? 'bg-amber-50 border border-amber-200 text-amber-500' 
                            : 'bg-white border border-slate-200 text-slate-300'
                        }
                        ${isToday && !checked && !isExporting ? 'border-indigo-400 border-2' : ''}
                        active:scale-75
                      `}
                    >
                      {checked ? (
                        <i className="fa-solid fa-check text-[10px] sm:text-xs"></i>
                      ) : isTwoDayAlert ? (
                        <div className="w-1 h-1 bg-amber-400 rounded-full animate-pulse"></div>
                      ) : (
                        <div className={`w-0.5 h-0.5 rounded-full ${isToday ? 'bg-indigo-400' : 'bg-slate-200'}`}></div>
                      )}
                    </button>
                  </td>
                );
              })}
              <td className="p-2 sm:p-5 text-center border-l border-slate-200 font-black text-slate-700 bg-slate-100/10">
                <span className={`text-[10px] sm:text-xs ${progressPct >= 80 ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {progressPct.toFixed(0)}%
                </span>
              </td>
              <td className="hidden sm:table-cell p-5 text-center bg-slate-100/10">
                <div className="flex flex-col items-center">
                  <span className={`inline-flex items-center gap-1 font-black text-sm ${streak > 0 ? 'text-orange-500' : 'text-slate-300'}`}>
                    {streak}
                  </span>
                </div>
              </td>
              <td className="hidden lg:table-cell p-5 text-center bg-slate-100/10">
                <div className="flex justify-center">
                  <Sparkline data={monthData} />
                </div>
              </td>
              {!isExporting && onEditHabit && (
                <td className="p-2 sm:p-5 text-center">
                   <button onClick={() => onEditHabit(habit)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-all rounded-lg">
                      <i className="fa-solid fa-pencil text-[10px] sm:text-[11px]"></i>
                   </button>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className={`bg-white rounded-xl sm:rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-200 ${isExporting ? '' : 'overflow-hidden'}`}>
      <div className={`${isExporting ? '' : 'overflow-x-auto custom-scrollbar no-scrollbar'}`}>
        {tableContent}
      </div>
    </div>
  );
};
