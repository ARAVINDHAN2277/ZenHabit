
import React, { useMemo, useState, useRef } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, Cell, Legend, AreaChart, Area
} from 'recharts';
import { Habit, HabitCategory } from '../types';
import { MONTHS, MONTH_DAYS, CATEGORIES } from '../constants';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

interface DashboardProps {
  habits: Habit[];
  userName?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ habits, userName = "Zen User" }) => {
  const [viewMode, setViewMode] = useState<'overview' | 'habits'>('overview');
  const [isExporting, setIsExporting] = useState(false);
  
  // Section Refs for PDF Generation
  const evolutionRef = useRef<HTMLDivElement>(null);
  const weekendRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const radarRef = useRef<HTMLDivElement>(null);
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const kpiRef = useRef<HTMLDivElement>(null);

  // 1. Advanced Analytics Engine
  const analytics = useMemo(() => {
    let totalPossible = 0;
    let totalCompleted = 0;
    let maxStreak = 0;
    const categoryStats: Record<string, { comp: number, total: number }> = {};
    const habitPerformances: { name: string, rate: number, category: HabitCategory, currentStreak: number }[] = [];

    habits.forEach(h => {
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
    Health: '#10b981',
    Mind: '#a855f7',
    Career: '#3b82f6',
    Personal: '#f59e0b'
  };

  const downloadPDF = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pdfWidth - (margin * 2);
      let currentY = 10;

      // --- Helper for capturing and adding sections ---
      const addSectionToPDF = async (ref: React.RefObject<HTMLDivElement>, title?: string) => {
        if (!ref.current) return;
        const dataUrl = await htmlToImage.toPng(ref.current, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
        });
        const imgProps = pdf.getImageProperties(dataUrl);
        const imgHeight = (imgProps.height * contentWidth) / imgProps.width;

        // Check if we need a new page
        if (currentY + imgHeight + (title ? 15 : 5) > 280) {
          pdf.addPage();
          currentY = 20;
        }

        if (title) {
          pdf.setFontSize(10);
          pdf.setTextColor(148, 163, 184); // slate-400
          pdf.setFont('helvetica', 'bold');
          pdf.text(title.toUpperCase(), margin, currentY);
          currentY += 8;
        }

        pdf.addImage(dataUrl, 'PNG', margin, currentY, contentWidth, imgHeight);
        currentY += imgHeight + 15;
      };

      // --- PAGE 1: COVER & EXECUTIVE SUMMARY ---
      pdf.setFillColor(99, 102, 241); // Indigo-600
      pdf.rect(0, 0, pdfWidth, 60, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(26);
      pdf.setFont('helvetica', 'bold');
      pdf.text("ZenHabit 2026", margin, 25);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text("PERFORMANCE AUDIT & ANALYTICS REPORT", margin, 35);

      pdf.setFontSize(12);
      pdf.text(`USER ID: ${userName}`, pdfWidth - margin, 25, { align: 'right' });
      pdf.setFontSize(8);
      pdf.text(`GENERATED: ${new Date().toLocaleDateString()}`, pdfWidth - margin, 35, { align: 'right' });

      currentY = 75;

      // Executive Summary Text
      pdf.setTextColor(30, 41, 59); // slate-800
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text("Executive Summary", margin, currentY);
      currentY += 10;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`This report provides a multi-dimensional analysis of habit consistency across the year 2026. 
Current annual mastery index is ${analytics.avgRate.toFixed(1)}%, with a primary focus in ${analytics.bestCat}.`, margin, currentY, { maxWidth: contentWidth });
      currentY += 20;

      // Add KPI Cards
      await addSectionToPDF(kpiRef, "Core Performance Metrics");

      // --- PAGE 2: TRENDS & VOLUME ---
      if (currentY > 150) { pdf.addPage(); currentY = 20; }
      await addSectionToPDF(evolutionRef, "Categorical Progress Over Time");
      await addSectionToPDF(volumeRef, "Cumulative Completion Volume");

      // --- PAGE 3: BEHAVIORAL ANALYSIS ---
      pdf.addPage(); currentY = 20;
      await addSectionToPDF(weekendRef, "Weekend vs. Weekday Resilience Gap");
      await addSectionToPDF(radarRef, "Life Pillars Balance Matrix");

      // --- PAGE 4: DETAILED PERFORMANCE ---
      pdf.addPage(); currentY = 20;
      await addSectionToPDF(leaderboardRef, "Elite Habit Leaderboard (Top Performance)");
      await addSectionToPDF(heatmapRef, "Annual Consistency Matrix (Heatmap)");

      // Final Footer
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text("ZenHabit 2026 AI Report - Confidential Discipline Analytics", pdfWidth / 2, 290, { align: 'center' });

      pdf.save(`ZenHabit_Report_2026_${userName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Navigation & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-3xl border border-slate-100 shadow-sm">
         <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs">
              <i className="fa-solid fa-chart-simple"></i>
            </div>
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Analytics Dashboard</h2>
         </div>
         <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl flex-1 sm:flex-none">
                <button 
                  onClick={() => setViewMode('overview')} 
                  className={`flex-1 sm:px-8 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'overview' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                >Overview</button>
                <button 
                  onClick={() => setViewMode('habits')} 
                  className={`flex-1 sm:px-8 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'habits' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                >Leaderboard</button>
            </div>
            <button 
              onClick={downloadPDF}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              <i className={`fa-solid ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
              {isExporting ? 'Exporting Report...' : 'Download Report PDF'}
            </button>
         </div>
      </div>

      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-8 sm:p-12 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                  <h1 className="text-3xl sm:text-5xl font-black tracking-tighter mb-4 leading-tight">2026 Growth Roadmap</h1>
                  <p className="text-indigo-200 font-medium text-sm sm:text-lg flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                    Live analysis for <span className="text-white font-black">{userName}</span>
                  </p>
                </div>
                <div className="flex items-center gap-6 bg-white/5 p-6 rounded-[32px] backdrop-blur-xl border border-white/10 shadow-2xl">
                   <div className="text-right">
                      <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Total Efficiency</p>
                      <p className="text-4xl font-black tabular-nums">{analytics.avgRate.toFixed(1)}%</p>
                   </div>
                   <div className="w-16 h-16 bg-white text-indigo-600 rounded-[20px] flex items-center justify-center text-2xl shadow-xl shadow-indigo-500/20">
                      <i className="fa-solid fa-gauge-high"></i>
                   </div>
                </div>
            </div>
            <div className="absolute top-[-100px] left-[-100px] w-80 h-80 bg-indigo-500/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-100px] right-[-100px] w-80 h-80 bg-purple-500/10 rounded-full blur-[120px]"></div>
        </div>

        {/* Primary KPI Grid (Refed for PDF) */}
        <div ref={kpiRef} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 bg-white/50 p-4 rounded-[40px]">
          {[
            { label: 'Mastery Score', val: `${analytics.avgRate.toFixed(1)}%`, icon: 'fa-bullseye', color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Unstoppable Peak', val: `${analytics.maxStreak} Days`, icon: 'fa-fire-flame-curved', color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Focus Category', val: analytics.bestCat, icon: 'fa-star', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Zen Actions', val: analytics.totalZen, icon: 'fa-leaf', color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((item, i) => (
            <div key={i} className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center text-xl mb-6 shadow-inner`}>
                <i className={`fa-solid ${item.icon}`}></i>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
              <p className="text-2xl font-black text-slate-800 tracking-tight leading-none">{item.val}</p>
            </div>
          ))}
        </div>

        {viewMode === 'overview' ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Category Evolution Ref */}
              <div ref={evolutionRef} className="lg:col-span-2 bg-white p-8 sm:p-12 rounded-[48px] border border-slate-100 shadow-sm">
                <div className="mb-12">
                  <h3 className="font-bold text-slate-800 text-2xl tracking-tight">Consistency Evolution</h3>
                  <p className="text-sm text-slate-400 font-medium mt-1">Multi-axis tracking across life pillars</p>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yearlyCategoryTrends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} dy={15} />
                      <YAxis hide domain={[0, 105]} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '20px' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 800 }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '40px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }} />
                      {CATEGORIES.map(cat => (
                        <Line key={cat} type="monotone" dataKey={cat} stroke={COLORS[cat]} strokeWidth={5} dot={false} activeDot={{ r: 10, strokeWidth: 0 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Weekend Ritual Ref */}
              <div ref={weekendRef} className="bg-white p-8 sm:p-12 rounded-[48px] border border-slate-100 shadow-sm">
                 <div className="mb-12">
                   <h3 className="font-bold text-slate-800 text-2xl tracking-tight">Weekend Ritual</h3>
                   <p className="text-sm text-slate-400 font-medium mt-1">The discipline delta analysis</p>
                 </div>
                 <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekdayWeekendData} layout="vertical" barGap={10}>
                        <XAxis type="number" hide domain={[0, 100]} />
                        <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 900 }} axisLine={false} tickLine={false} width={80} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 900, paddingBottom: '30px' }} />
                        <Bar dataKey="Weekday" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={18} />
                        <Bar dataKey="Weekend" fill="#f43f5e" radius={[0, 8, 8, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Discipline Volume Ref */}
               <div ref={volumeRef} className="bg-white p-8 sm:p-12 rounded-[48px] border border-slate-100 shadow-sm">
                  <div className="mb-12">
                    <h3 className="font-bold text-slate-800 text-2xl tracking-tight">Discipline Volume</h3>
                    <p className="text-sm text-slate-400 font-medium mt-1">Total habits checked month-over-month</p>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyVolume}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} axisLine={false} />
                        <YAxis hide />
                        <Tooltip />
                        {CATEGORIES.map(cat => (
                          <Area key={cat} type="monotone" dataKey={cat} stackId="1" stroke={COLORS[cat]} fill={COLORS[cat]} fillOpacity={0.6} />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               {/* Radar Ref */}
               <div ref={radarRef} className="bg-white p-8 sm:p-12 rounded-[48px] border border-slate-100 shadow-sm">
                  <div className="mb-12">
                    <h3 className="font-bold text-slate-800 text-2xl tracking-tight">Balance Radar</h3>
                    <p className="text-sm text-slate-400 font-medium mt-1">Life balance and focus equilibrium</p>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={weekdayWeekendData}>
                        <PolarGrid stroke="#f1f5f9" strokeWidth={2} />
                        <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 900 }} />
                        <Radar name="Momentum" dataKey="Weekday" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={5} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>
          </>
        ) : (
          <div ref={leaderboardRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
            <div className="bg-white p-10 sm:p-16 rounded-[56px] border border-slate-100 shadow-sm">
              <h3 className="text-3xl font-black text-slate-800 mb-10 flex items-center gap-4">
                 <i className="fa-solid fa-crown text-amber-500"></i>
                 Elite Performance
              </h3>
              <div className="space-y-6">
                 {analytics.leaderboard.slice(0, 6).map((h, i) => (
                   <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-[28px] border border-slate-100">
                      <div className="flex items-center gap-6">
                         <span className={`w-12 h-12 rounded-[18px] flex items-center justify-center font-black text-lg shadow-sm ${i === 0 ? 'bg-amber-400 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                           {i+1}
                         </span>
                         <div>
                            <p className="text-lg font-bold text-slate-800 tracking-tight">{h.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{h.category}</span>
                              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                              <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{h.currentStreak}D STREAK</span>
                            </div>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-xl font-black text-emerald-600 leading-none">{h.rate.toFixed(0)}%</p>
                         <div className="w-28 h-2.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${h.rate}%` }}></div>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
            </div>

            <div className="bg-white p-10 sm:p-16 rounded-[56px] border border-slate-100 shadow-sm">
              <h3 className="text-3xl font-black text-slate-800 mb-10 flex items-center gap-4">
                 <i className="fa-solid fa-compass text-indigo-500"></i>
                 Horizon Insights
              </h3>
              <div className="space-y-6">
                 {analytics.leaderboard.slice(-6).reverse().map((h, i) => (
                   <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-[28px] border border-slate-100">
                      <div className="flex items-center gap-6">
                         <span className="w-12 h-12 rounded-[18px] bg-white border border-slate-200 text-slate-400 flex items-center justify-center font-black text-lg">
                           #{analytics.leaderboard.length - i}
                         </span>
                         <div>
                            <p className="text-lg font-bold text-slate-800 tracking-tight">{h.name}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{h.category}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-xl font-black text-rose-500 leading-none">{h.rate.toFixed(0)}%</p>
                         <div className="w-28 h-2.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]" style={{ width: `${h.rate}%` }}></div>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
              <div className="mt-12 p-10 bg-indigo-600 rounded-[40px] text-center shadow-2xl shadow-indigo-200">
                 <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <i className="fa-solid fa-lightbulb text-white text-2xl"></i>
                 </div>
                 <p className="text-base text-indigo-50 font-medium leading-relaxed">
                   "Your low completion rates are not failures; they are the specific areas where your greatest personal growth is currently waiting."
                 </p>
              </div>
            </div>
          </div>
        )}

        {/* Heatmap Section Ref */}
        <div ref={heatmapRef} className="bg-slate-900 p-12 sm:p-20 rounded-[64px] text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-16">
                <div>
                  <h3 className="text-4xl font-black text-white tracking-tighter">Consistency Matrix</h3>
                  <p className="text-base text-slate-400 font-medium mt-2">Annual habit density across 365 days</p>
                </div>
                <div className="flex items-center gap-6 bg-slate-800/40 p-6 rounded-[28px] border border-slate-700/50">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Efficiency</span>
                  <div className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-slate-800"></div>
                    <div className="w-6 h-6 rounded-lg bg-indigo-900"></div>
                    <div className="w-6 h-6 rounded-lg bg-indigo-600"></div>
                    <div className="w-6 h-6 rounded-lg bg-white"></div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto no-scrollbar py-8">
                 <div className="inline-grid grid-rows-7 grid-flow-col gap-3 sm:gap-4">
                    {MONTHS.map((m, mIdx) => (
                      <div key={mIdx} className="flex flex-col gap-3 sm:gap-4 pr-10 border-r border-slate-800/60">
                         <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">{m.substring(0, 3)}</p>
                         <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                            {Array.from({ length: MONTH_DAYS[mIdx] }).map((_, dIdx) => {
                               let dailyComp = 0;
                               habits.forEach(h => { if(h.data[mIdx][dIdx]) dailyComp++; });
                               const intensity = habits.length > 0 ? dailyComp / habits.length : 0;
                               return (
                                 <div 
                                   key={dIdx} 
                                   className="w-5 h-5 sm:w-7 sm:h-7 rounded-xl transition-all duration-700"
                                   style={{ 
                                     backgroundColor: intensity === 0 ? '#1e293b' : 
                                                      intensity > 0.8 ? '#fff' :
                                                      `rgba(129, 140, 248, ${intensity + 0.3})`,
                                     boxShadow: intensity > 0.8 ? '0 0 25px rgba(255,255,255,0.6)' : 'none'
                                   }}
                                 ></div>
                               );
                            })}
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
            <div className="absolute top-[-100px] right-[-100px] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px]"></div>
        </div>
      </div>
    </div>
  );
};
