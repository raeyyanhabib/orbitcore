import React, { useState, useEffect } from 'react';

export default function AnalyticsView({ taskList, todayFocusSeconds, triggerToast }) {
  const [exporting, setExporting] = useState(false);

  // Compute stats
  const totalTasks = taskList.length;
  const completedTasks = taskList.filter(t => t.is_completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const activeHours = (todayFocusSeconds / 3600).toFixed(1);

  const handleExportCSV = () => {
    setExporting(true);
    window.electronAPI.sendTaskAction("exportLogs");
    setTimeout(() => {
      setExporting(false);
      triggerToast("success", "Analytics data exported to CSV");
    }, 1000);
  };

  // Mock data for heatmap based on orbitscreens.txt design
  const heatMapDays = Array.from({ length: 30 }).map((_, i) => ({
    date: i + 1,
    intensity: Math.floor(Math.random() * 4) // 0-3
  }));

  const getHeatMapColor = (intensity) => {
    switch(intensity) {
      case 3: return 'bg-tertiary';
      case 2: return 'bg-primary';
      case 1: return 'bg-secondary';
      default: return 'bg-surface-variant';
    }
  };

  return (
    <div className="w-full h-full pb-8">
      {/* Title */}
      <div className="flex justify-between items-center mb-section-gap mt-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg font-bold text-on-surface tracking-tight">Analytics</h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">Review your orbit trajectories and focus metrics.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          disabled={exporting}
          className="flex items-center gap-2 bg-surface hover:bg-surface-variant border border-white/10 text-on-surface px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">{exporting ? 'hourglass_empty' : 'download'}</span>
          <span className="font-label-md font-medium">{exporting ? 'Exporting...' : 'Export CSV'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter max-w-7xl">
        
        {/* KPI Cards */}
        <div className="bg-surface-container rounded-2xl border border-white/5 p-card-padding flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full group-hover:bg-primary/10 transition-colors"></div>
          <div>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary">schedule</span>
            </div>
            <h3 className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Screentime Today</h3>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-display-lg font-display-lg font-extrabold text-on-surface tracking-tighter">{activeHours}</span>
            <span className="text-body-lg font-body-lg text-primary font-medium">hrs</span>
          </div>
        </div>

        <div className="bg-surface-container rounded-2xl border border-white/5 p-card-padding flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/5 rounded-bl-full group-hover:bg-tertiary/10 transition-colors"></div>
          <div>
            <div className="w-10 h-10 rounded-full bg-tertiary/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-tertiary">check_circle</span>
            </div>
            <h3 className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Task Completion</h3>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-display-lg font-display-lg font-extrabold text-on-surface tracking-tighter">{completionRate}</span>
            <span className="text-body-lg font-body-lg text-tertiary font-medium">%</span>
          </div>
        </div>

        <div className="bg-surface-container rounded-2xl border border-white/5 p-card-padding flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full group-hover:bg-secondary/10 transition-colors"></div>
          <div>
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-secondary">local_fire_department</span>
            </div>
            <h3 className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Current Streak</h3>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-display-lg font-display-lg font-extrabold text-on-surface tracking-tighter">5</span>
            <span className="text-body-lg font-body-lg text-secondary font-medium">days</span>
          </div>
        </div>

        {/* Heatmap Panel */}
        <div className="lg:col-span-2 bg-surface-container rounded-2xl border border-white/5 p-card-padding flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-headline-md font-headline-md font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">calendar_month</span>
              Productivity Heatmap
            </h3>
            <span className="text-label-sm font-label-sm bg-surface px-3 py-1 rounded-full text-on-surface-variant border border-white/5">Last 30 Days</span>
          </div>
          
          <div className="flex-1 flex items-center justify-center py-4">
            <div className="grid grid-cols-10 gap-2 w-full max-w-2xl">
              {heatMapDays.map((day, idx) => (
                <div 
                  key={idx} 
                  className={`aspect-square rounded-md ${getHeatMapColor(day.intensity)} transition-all hover:scale-110 hover:shadow-lg cursor-pointer group relative`}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-surface text-on-surface text-[10px] px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    Day {day.date}: {day.intensity * 2} hrs
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* App Usage Panel */}
        <div className="bg-surface-container rounded-2xl border border-white/5 p-card-padding flex flex-col">
          <h3 className="text-headline-md font-headline-md font-semibold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary">pie_chart</span>
            App Usage
          </h3>
          
          <div className="flex flex-col gap-4 flex-1 justify-center">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-label-sm font-label-sm">
                <span className="text-on-surface">VS Code</span>
                <span className="text-tertiary font-bold">45%</span>
              </div>
              <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-white/5">
                <div className="bg-tertiary h-full rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-label-sm font-label-sm">
                <span className="text-on-surface">Chrome</span>
                <span className="text-primary font-bold">30%</span>
              </div>
              <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-white/5">
                <div className="bg-primary h-full rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-label-sm font-label-sm">
                <span className="text-on-surface">Figma</span>
                <span className="text-secondary font-bold">15%</span>
              </div>
              <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-white/5">
                <div className="bg-secondary h-full rounded-full" style={{ width: '15%' }}></div>
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-label-sm font-label-sm">
                <span className="text-on-surface">Other</span>
                <span className="text-on-surface-variant font-bold">10%</span>
              </div>
              <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-white/5">
                <div className="bg-surface-variant h-full rounded-full" style={{ width: '10%' }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
