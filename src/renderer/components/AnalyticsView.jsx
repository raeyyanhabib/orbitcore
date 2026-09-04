import React, { useState } from 'react';

export default function AnalyticsView({ taskList, todayFocusSeconds, analyticsData, triggerToast }) {
  const [exporting, setExporting] = useState(false);

  // Compute real stats
  const totalTasks = taskList.length;
  const completedTasks = taskList.filter(t => t.is_completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const activeHours = (todayFocusSeconds / 3600).toFixed(1);
  const streak = analyticsData?.streak || 0;
  const topTasks = analyticsData?.taskTimeData || [];
  
  // Real heatmap data or empty 0-intensity array (no fake random numbers)
  const heatMapDays = analyticsData?.heatMap || Array.from({ length: 30 }).map((_, i) => ({
    date: i + 1,
    intensity: 0
  }));

  const hasHeatMapData = heatMapDays.some(d => d.intensity > 0);

  const handleExportCSV = () => {
    setExporting(true);
    window.electronAPI.sendTaskAction("exportLogs");
    setTimeout(() => {
      setExporting(false);
      triggerToast("success", "Analytics data exported to CSV");
    }, 1000);
  };

  const getHeatMapColor = (intensity) => {
    switch(intensity) {
      case 3: return 'bg-tertiary';
      case 2: return 'bg-primary';
      case 1: return 'bg-secondary';
      default: return 'bg-surface-variant/40';
    }
  };

  return (
    <div className="w-full h-full pb-8">
      {/* Title */}
      <div className="flex justify-between items-center mb-section-gap mt-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg font-bold text-on-surface tracking-tight">Analytics</h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">Review your focus metrics and activity history.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          disabled={exporting}
          className="flex items-center gap-2 bg-surface hover:bg-surface-variant border border-outline/20 text-on-surface px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">{exporting ? 'hourglass_empty' : 'download'}</span>
          <span className="font-label-md font-medium">{exporting ? 'Exporting...' : 'Export CSV'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter max-w-7xl">
        
        {/* KPI Cards */}
        <div className="bg-surface-container rounded-2xl border border-outline/20 p-card-padding flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full group-hover:bg-primary/10 transition-colors"></div>
          <div>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary">schedule</span>
            </div>
            <h3 className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Focus Time Today</h3>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-display-lg font-display-lg font-extrabold text-on-surface tracking-tighter">{activeHours}</span>
            <span className="text-body-lg font-body-lg text-primary font-medium">hrs</span>
          </div>
        </div>

        <div className="bg-surface-container rounded-2xl border border-outline/20 p-card-padding flex flex-col justify-between relative overflow-hidden group">
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

        <div className="bg-surface-container rounded-2xl border border-outline/20 p-card-padding flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full group-hover:bg-secondary/10 transition-colors"></div>
          <div>
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-secondary">local_fire_department</span>
            </div>
            <h3 className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Current Streak</h3>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-display-lg font-display-lg font-extrabold text-on-surface tracking-tighter">{streak}</span>
            <span className="text-body-lg font-body-lg text-secondary font-medium">days</span>
          </div>
        </div>

        {/* Heatmap Panel */}
        <div className="lg:col-span-2 bg-surface-container rounded-2xl border border-outline/20 p-card-padding flex flex-col min-h-[220px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-headline-md font-headline-md font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">calendar_month</span>
              Productivity Heatmap
            </h3>
            <span className="text-label-sm font-label-sm bg-surface px-3 py-1 rounded-full text-on-surface-variant border border-outline/20">Last 30 Days</span>
          </div>
          
          {!hasHeatMapData ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-on-surface-variant">
              <span className="material-symbols-outlined text-3xl mb-2 opacity-40">date_range</span>
              <p className="text-body-sm text-center">No focus activity recorded in the past 30 days.</p>
              <p className="text-label-sm text-on-surface-variant/60 text-center mt-1">Start a focus session to build your heatmap.</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-4">
              <div className="grid grid-cols-10 gap-2 w-full max-w-2xl">
                {heatMapDays.map((day, idx) => (
                  <div 
                    key={idx} 
                    className={`aspect-square rounded-md ${getHeatMapColor(day.intensity)} transition-all hover:scale-110 hover:shadow-lg cursor-pointer group relative`}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-surface text-on-surface text-[10px] px-2 py-1 rounded border border-outline/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      Day {day.date}: {day.intensity * 2} hrs
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Tasks Panel */}
        <div className="bg-surface-container rounded-2xl border border-outline/20 p-card-padding flex flex-col min-h-[220px]">
          <h3 className="text-headline-md font-headline-md font-semibold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary">list_alt</span>
            Top Tasks
          </h3>
          
          <div className="flex flex-col gap-4 flex-1 justify-center">
            {topTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-on-surface-variant">
                <span className="material-symbols-outlined text-3xl mb-2 opacity-40">assignment_turned_in</span>
                <p className="text-body-sm text-center">No task time recorded yet.</p>
              </div>
            ) : (
              topTasks.map((task, idx) => {
                const totalHours = topTasks.reduce((sum, t) => sum + t.hours, 0);
                const pct = totalHours > 0 ? Math.round((task.hours / totalHours) * 100) : 0;
                const colors = ['bg-tertiary', 'bg-primary', 'bg-secondary', 'bg-surface-variant', 'bg-white'];
                const color = colors[idx % colors.length];
                const textColors = ['text-tertiary', 'text-primary', 'text-secondary', 'text-on-surface-variant', 'text-on-surface'];
                const textColor = textColors[idx % textColors.length];
                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex justify-between text-label-sm font-label-sm">
                      <span className="text-on-surface">{task.title}</span>
                      <span className={`${textColor} font-bold`}>{task.hours} hrs</span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-outline/20">
                      <div className={`${color} h-full rounded-full`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
