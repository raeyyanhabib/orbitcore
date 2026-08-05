import React, { useState, useEffect } from 'react';

export default function SettingsView({ settings }) {
  const [localSettings, setLocalSettings] = useState(settings || {});
  
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const updateSetting = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    window.electronAPI.sendTaskAction("saveSetting", { key, value });
  };

  const handleExport = () => {
    window.electronAPI.sendTaskAction("exportSettings");
  };

  const handleImport = () => {
    window.electronAPI.sendTaskAction("importSettings");
  };

  return (
    <div className="w-full h-full pb-8">
      {/* Title */}
      <h2 className="text-headline-lg font-headline-lg font-bold text-on-surface mb-2 mt-4 tracking-tight">Configuration</h2>
      <p className="text-body-md font-body-md text-on-surface-variant mb-section-gap">Tune your orbit mechanics and system preferences.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter max-w-7xl">
        
        {/* Display panel */}
        <div className="bg-surface-container rounded-2xl border border-white/5 p-card-padding flex flex-col gap-6 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
          
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">desktop_windows</span>
            <h3 className="text-headline-md font-headline-md font-semibold text-on-surface">Display</h3>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-body-lg font-label-md font-semibold text-on-surface">Theme Preference</h4>
                <p className="text-label-sm font-label-sm text-on-surface-variant">Switch between deep space and nebula light.</p>
              </div>
              <div className="bg-surface p-1 rounded-lg flex items-center border border-white/5">
                <button className="px-4 py-1.5 rounded-md text-label-md font-label-md transition-colors bg-primary-container text-on-primary-container">Dark</button>
                <button className="px-4 py-1.5 rounded-md text-label-md font-label-md transition-colors text-on-surface-variant hover:text-on-surface">Light</button>
              </div>
            </div>
            
            <div className="h-px bg-white/5 w-full my-2"></div>
            
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-body-lg font-label-md font-semibold text-on-surface">Animations</h4>
                <p className="text-label-sm font-label-sm text-on-surface-variant">Enable planetary floating and orbiting effects.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={localSettings.animations !== "false"} onChange={(e) => updateSetting("animations", e.target.checked ? "true" : "false")} />
                <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Monitoring panel */}
        <div className="bg-surface-container rounded-2xl border border-white/5 p-card-padding flex flex-col gap-6 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/5 rounded-full blur-2xl group-hover:bg-secondary/10 transition-colors"></div>
          
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary">track_changes</span>
            <h3 className="text-headline-md font-headline-md font-semibold text-on-surface">Monitoring</h3>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-body-lg font-label-md font-semibold text-on-surface">Polling Interval</h4>
                <p className="text-label-sm font-label-sm text-on-surface-variant">How often the system checks active window (seconds).</p>
              </div>
              <select 
                value={localSettings.checkInterval || "3"} 
                onChange={(e) => updateSetting("checkInterval", e.target.value)}
                className="bg-surface border border-white/10 text-on-surface text-label-md rounded-lg p-2 focus:border-primary focus:outline-none transition-colors"
              >
                <option value="1">1s (Aggressive)</option>
                <option value="3">3s (Balanced)</option>
                <option value="5">5s (Battery Saver)</option>
              </select>
            </div>
            
            <div className="h-px bg-white/5 w-full my-2"></div>
            
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-body-lg font-label-md font-semibold text-on-surface">DuckDuckGo Research</h4>
                <p className="text-label-sm font-label-sm text-on-surface-variant">Automatically fetch tips for new tasks.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={localSettings.researchEnabled !== "false"} onChange={(e) => updateSetting("researchEnabled", e.target.checked ? "true" : "false")} />
                <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Behavioral panel */}
        <div className="bg-surface-container rounded-2xl border border-white/5 p-card-padding flex flex-col gap-6 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-tertiary/5 rounded-full blur-2xl group-hover:bg-tertiary/10 transition-colors"></div>
          
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-tertiary">psychology</span>
            <h3 className="text-headline-md font-headline-md font-semibold text-on-surface">Behavioral</h3>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-body-lg font-label-md font-semibold text-on-surface">Focus Reminders</h4>
                <p className="text-label-sm font-label-sm text-on-surface-variant">Play gentle beeps during focus mode if distracted.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={localSettings.audioBeeps !== "false"} onChange={(e) => updateSetting("audioBeeps", e.target.checked ? "true" : "false")} />
                <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tertiary"></div>
              </label>
            </div>
            
            <div className="h-px bg-white/5 w-full my-2"></div>
            
            <div className="flex justify-between items-start">
              <div className="flex-1 mr-4">
                <h4 className="text-body-lg font-label-md font-semibold text-on-surface">Edit Focus Quotes</h4>
                <p className="text-label-sm font-label-sm text-on-surface-variant">Modify the motivational quotes shown when drifting off-task. (Requires editing focusModemsgs.txt in root folder)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data panel */}
        <div className="bg-surface-container rounded-2xl border border-white/5 p-card-padding flex flex-col gap-6 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-error/5 rounded-full blur-2xl group-hover:bg-error/10 transition-colors"></div>
          
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-error">database</span>
            <h3 className="text-headline-md font-headline-md font-semibold text-on-surface">Data Management</h3>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-body-lg font-label-md font-semibold text-on-surface">Settings Backup</h4>
                <p className="text-label-sm font-label-sm text-on-surface-variant">Export or import your configurations.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleImport} className="text-on-surface-variant hover:text-on-surface p-2 rounded-lg bg-surface hover:bg-surface-variant border border-white/5 transition-all">
                  <span className="material-symbols-outlined text-[20px]">upload</span>
                </button>
                <button onClick={handleExport} className="text-on-surface-variant hover:text-on-surface p-2 rounded-lg bg-surface hover:bg-surface-variant border border-white/5 transition-all">
                  <span className="material-symbols-outlined text-[20px]">download</span>
                </button>
              </div>
            </div>
            
            <div className="h-px bg-white/5 w-full my-2"></div>
            
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-body-lg font-label-md font-semibold text-on-surface">Time Log Retention</h4>
                <p className="text-label-sm font-label-sm text-on-surface-variant">Days to keep raw focus monitoring data.</p>
              </div>
              <select 
                value={localSettings.retentionDays || "90"} 
                onChange={(e) => updateSetting("retentionDays", e.target.value)}
                className="bg-surface border border-white/10 text-on-surface text-label-md rounded-lg p-2 focus:border-error focus:outline-none transition-colors"
              >
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
                <option value="365">1 Year</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
