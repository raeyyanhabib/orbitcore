import React, { useState, useEffect } from 'react';

export default function SettingsView({ settings, theme, themeName, onThemeChange, allThemes, toggleTheme }) {
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

  const handleOpacityChange = (val) => {
    updateSetting("orbitOpacity", val);
    window.electronAPI.sendTaskAction("set-orbit-opacity", { opacity: val });
  };

  const darkThemes = Object.entries(allThemes || {}).filter(([_, t]) => t.mode === 'dark');
  const lightThemes = Object.entries(allThemes || {}).filter(([_, t]) => t.mode === 'light');
  const themesForCurrentMode = theme === 'light' ? lightThemes : darkThemes;

  return (
    <div className="w-full h-full pb-12 overflow-y-auto max-h-[calc(100vh-100px)] custom-scrollbar pr-2">
      {/* Header */}
      <div className="mb-8 mt-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-6 rounded-full" style={{ background: "var(--primary)" }} />
          <h2 className="text-2xl font-extrabold tracking-tight text-on-surface">Settings</h2>
        </div>
        <p className="text-sm pl-4 text-on-surface-variant">Customize your tracking and app preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl">
        
        {/* THEMES SELECTOR */}
        <div className="lg:col-span-2 bg-surface-container rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">palette</span>
              <div>
                <h3 className="text-lg font-bold text-on-surface">Color Themes</h3>
                <p className="text-xs text-on-surface-variant">Select a palette for the active {theme === 'light' ? 'Light' : 'Dark'} Mode.</p>
              </div>
            </div>
            
            <div className="bg-surface p-1 rounded-lg flex items-center">
              <button 
                onClick={() => theme !== "dark" && toggleTheme && toggleTheme()}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${theme === 'dark' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Dark
              </button>
              <button 
                onClick={() => theme !== "light" && toggleTheme && toggleTheme()}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${theme === 'light' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Light
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themesForCurrentMode.map(([key, themeData]) => (
              <button
                key={key}
                onClick={() => onThemeChange && onThemeChange(key)}
                className={`p-4 rounded-xl transition-all cursor-pointer text-left relative ${
                  themeName === key
                    ? 'ring-2 ring-primary shadow-lg'
                    : 'hover:bg-surface-variant/20'
                }`}
                style={{
                  background: 'var(--surface-container-high)',
                  color: 'var(--on-surface)'
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-1.5">
                    <div 
                      className="w-3.5 h-3.5 rounded-full" 
                      style={{ background: themeData.colors.primary }}
                    />
                    <div 
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ background: themeData.colors.secondary }}
                    />
                    <div 
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ background: themeData.colors.tertiary }}
                    />
                  </div>
                  {themeName === key && (
                    <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                  )}
                </div>
                <h4 className="font-bold text-sm mb-0.5">{themeData.name}</h4>
                <p className="text-xs text-on-surface-variant">{themeData.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Orbit Mode Preferences */}
        <div className="lg:col-span-2 bg-surface-container rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">public</span>
            <h3 className="text-lg font-bold text-on-surface">Orbit Mode Preferences</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex justify-between items-center bg-surface p-4 rounded-xl">
              <div>
                <h4 className="text-sm font-semibold text-on-surface">Sun Size</h4>
                <p className="text-xs text-on-surface-variant">Core scale ({localSettings.orbitSunSize || 100}%).</p>
              </div>
              <input 
                type="range"
                min="50"
                max="200"
                step="10"
                className="w-24 accent-primary cursor-pointer"
                value={localSettings.orbitSunSize || 100}
                onChange={(e) => updateSetting("orbitSunSize", e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center bg-surface p-4 rounded-xl">
              <div>
                <h4 className="text-sm font-semibold text-on-surface">Planet Scale</h4>
                <p className="text-xs text-on-surface-variant">Task planets ({localSettings.orbitPlanetSize || 1}x).</p>
              </div>
              <input 
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                className="w-24 accent-primary cursor-pointer"
                value={localSettings.orbitPlanetSize || 1}
                onChange={(e) => updateSetting("orbitPlanetSize", e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center bg-surface p-4 rounded-xl">
              <div>
                <h4 className="text-sm font-semibold text-on-surface">Widget Opacity</h4>
                <p className="text-xs text-on-surface-variant">Translucency ({Math.round((localSettings.orbitOpacity || 0.75) * 100)}%).</p>
              </div>
              <input 
                type="range"
                min="0.3"
                max="1.0"
                step="0.05"
                className="w-24 accent-primary cursor-pointer"
                value={localSettings.orbitOpacity || 0.75}
                onChange={(e) => handleOpacityChange(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="flex justify-between items-center bg-surface p-4 rounded-xl">
              <div>
                <h4 className="text-sm font-semibold text-on-surface">Display Mode</h4>
                <p className="text-xs text-on-surface-variant">Window positioning style in Orbit Mode.</p>
              </div>
              <select 
                value={localSettings.orbitDisplayMode || "overlay"}
                onChange={(e) => updateSetting("orbitDisplayMode", e.target.value)}
                className="bg-surface-container text-on-surface text-xs rounded-lg p-2 focus:outline-none cursor-pointer"
              >
                <option value="overlay">Transparent Overlay (Always on Top)</option>
                <option value="floating">Floating Window (Resizable)</option>
                <option value="pinned">Desktop Pinned (Behind Windows)</option>
              </select>
            </div>

            <div className="flex justify-between items-center bg-surface p-4 rounded-xl">
              <div>
                <h4 className="text-sm font-semibold text-on-surface">Always On Top</h4>
                <p className="text-xs text-on-surface-variant">Keep Orbit widget floating over active apps.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={localSettings.orbitHoverDefault !== "false"} 
                  onChange={(e) => updateSetting("orbitHoverDefault", e.target.checked ? "true" : "false")} 
                />
                <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>
        
        {/* User Profile panel */}
        <div className="bg-surface-container rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">person</span>
            <h3 className="text-lg font-bold text-on-surface">User Profile</h3>
          </div>
          
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1">Name</label>
              <input 
                type="text"
                className="w-full bg-surface text-on-surface text-sm rounded-xl px-3 py-2 focus:outline-none"
                value={localSettings.userName || ""}
                onChange={(e) => updateSetting("userName", e.target.value)}
                placeholder="e.g. Raeyyan"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1">Age</label>
                <input 
                  type="number"
                  className="w-full bg-surface text-on-surface text-sm rounded-xl px-3 py-2 focus:outline-none"
                  value={localSettings.userAge || ""}
                  onChange={(e) => updateSetting("userAge", e.target.value)}
                  placeholder="e.g. 20"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1">Occupation</label>
                <select 
                  className="w-full bg-surface text-on-surface text-sm rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                  value={localSettings.userOccupation || "Student"}
                  onChange={(e) => updateSetting("userOccupation", e.target.value)}
                >
                  <option value="Student">Student</option>
                  <option value="Professional">Professional</option>
                  <option value="Freelancer">Freelancer</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Display panel */}
        <div className="bg-surface-container rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">desktop_windows</span>
            <h3 className="text-lg font-bold text-on-surface">Display & Visuals</h3>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <div>
              <h4 className="text-sm font-semibold text-on-surface">Animations</h4>
              <p className="text-xs text-on-surface-variant">Enable floating and orbit visual effects.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={localSettings.animations !== "false"} onChange={(e) => updateSetting("animations", e.target.checked ? "true" : "false")} />
              <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        {/* Monitoring panel */}
        <div className="bg-surface-container rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary">track_changes</span>
            <h3 className="text-lg font-bold text-on-surface">Monitoring</h3>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-semibold text-on-surface">Polling Interval</h4>
              <p className="text-xs text-on-surface-variant">Frequency of window checking.</p>
            </div>
            <select 
              value={localSettings.checkInterval || "3"} 
              onChange={(e) => updateSetting("checkInterval", e.target.value)}
              className="bg-surface text-on-surface text-xs rounded-lg p-2 focus:outline-none cursor-pointer"
            >
              <option value="1">1s (Aggressive)</option>
              <option value="3">3s (Balanced)</option>
              <option value="5">5s (Battery Saver)</option>
            </select>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-semibold text-on-surface">DuckDuckGo Research</h4>
              <p className="text-xs text-on-surface-variant">Auto-fetch tips for new tasks.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={localSettings.researchEnabled !== "false"} onChange={(e) => updateSetting("researchEnabled", e.target.checked ? "true" : "false")} />
              <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
            </label>
          </div>
        </div>

        {/* Data panel */}
        <div className="bg-surface-container rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-error">database</span>
            <h3 className="text-lg font-bold text-on-surface">Data Management</h3>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-semibold text-on-surface">Backup & Export</h4>
              <p className="text-xs text-on-surface-variant">Configurations and time logs.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleImport} title="Import Settings" className="text-on-surface p-2 rounded-lg bg-surface hover:bg-surface-variant transition-all cursor-pointer flex items-center gap-1 text-xs">
                <span className="material-symbols-outlined text-sm">upload</span> Import
              </button>
              <button onClick={handleExport} title="Export Settings" className="text-on-surface p-2 rounded-lg bg-surface hover:bg-surface-variant transition-all cursor-pointer flex items-center gap-1 text-xs">
                <span className="material-symbols-outlined text-sm">download</span> Export
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-semibold text-on-surface">Log Retention</h4>
              <p className="text-xs text-on-surface-variant">Focus monitoring history duration.</p>
            </div>
            <select 
              value={localSettings.retentionDays || "90"} 
              onChange={(e) => updateSetting("retentionDays", e.target.value)}
              className="bg-surface text-on-surface text-xs rounded-lg p-2 focus:outline-none cursor-pointer"
            >
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
              <option value="365">1 Year</option>
            </select>
          </div>
        </div>

      </div>
    </div>
  );
}
