// src/renderer/App.jsx
// Core React component. Coordinates global state, window IPC interfaces, and sub-view renders.

import React, { useState, useEffect } from "react";
import DashboardView from "./components/DashboardView.jsx";
import OrbitView from "./components/OrbitView.jsx";
import AnalyticsView from "./components/AnalyticsView.jsx";
import SettingsView from "./components/SettingsView.jsx";
import FirstRunModal from "./components/FirstRunModal.jsx";
import RemindersOverlay from "./components/RemindersOverlay.jsx";
import { useTheme } from "./hooks/useTheme";
import THEMES from "./themes";

export default function App() {
  const initialMode = window.location.hash === "#orbit" ? "orbit" : "dashboard";
  const [currentMode, setCurrentMode] = useState(initialMode); // 'dashboard' | 'orbit'
  const [activeTab, setActiveTab] = useState("tasks"); // 'tasks' | 'analytics' | 'settings'
  const [taskList, setTaskList] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [settings, setSettings] = useState({});
  const [focusMessages, setFocusMessages] = useState([]);
  const [isFocusActive, setIsFocusActive] = useState(false);
  const [monitorUpdate, setMonitorUpdate] = useState(null);
  const [todayFocusSeconds, setTodayFocusSeconds] = useState(0);
  const [monitorStatus, setMonitorStatus] = useState("connected");
  const [toast, setToast] = useState({ show: false, type: "success", message: "" });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [showFirstRunModal, setShowFirstRunModal] = useState(false);

  // Theme Hook Integration
  const [themeName, setThemeName] = useState("dark-teal");
  const { applyTheme } = useTheme(themeName, setThemeName);
  const currentTheme = THEMES[themeName] || THEMES["dark-teal"];

  const toggleThemeMode = () => {
    if (currentTheme.mode === "dark") {
      const target = themeName.replace("dark-", "light-");
      applyTheme(THEMES[target] ? target : "light-teal");
    } else {
      const target = themeName.replace("light-", "dark-");
      applyTheme(THEMES[target] ? target : "dark-teal");
    }
  };

  const triggerToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast({ show: false, type: "success", message: "" });
    }, 4000);
  };

  useEffect(() => {
    window.electronAPI.onReceiveFromMain("tasks-list", (tasks) => {
      console.log("📥 Received tasks-list:", tasks);
      setTaskList(tasks);
      
      setActiveTask(prev => {
        if (!prev) return null;
        const updated = tasks.find(t => t.id === prev.id);
        if (updated && updated.is_completed) {
          return null;
        }
        return updated || null;
      });
    });

    window.electronAPI.onReceiveFromMain("settings-map", (settingsMap) => {
      console.log("⚙️ Received settings-map:", settingsMap);
      setSettings(settingsMap);
      if (!settingsMap.firstRunComplete || settingsMap.firstRunComplete === "false") {
        setShowFirstRunModal(true);
      }
    });

    window.electronAPI.onReceiveFromMain("monitor-update", (update) => {
      console.log("📊 Monitor update:", update);
      setMonitorUpdate(update);
      
      if (update.isOnTask) {
        setTodayFocusSeconds(prev => prev + (update.interval || 3));
      }
    });

    window.electronAPI.onReceiveFromMain("focus-started", (data) => {
      console.log("✅ Focus started:", data);
      setIsFocusActive(true);
      setActiveTask(prev => data.task || prev);
    });

    window.electronAPI.onReceiveFromMain("focus-stopped", () => {
      console.log("⏹️ Focus stopped");
      setIsFocusActive(false);
      setActiveTask(null);
      setMonitorUpdate(null);
    });

    window.electronAPI.onReceiveFromMain("focus-messages", (msgs) => {
      if (msgs && msgs.length > 0) {
        setFocusMessages(msgs);
      }
    });

    window.electronAPI.onReceiveFromMain("monitor-status", (data) => {
      setMonitorStatus(data.status);
    });

    window.electronAPI.onReceiveFromMain("settings-imported", (data) => {
      if (data.success) {
        window.electronAPI.sendTaskAction("getSettings");
        triggerToast("success", "Settings successfully imported!");
      } else {
        triggerToast("error", `Import failed: ${data.error}`);
      }
    });

    window.electronAPI.onReceiveFromMain("settings-exported", (data) => {
      if (data.success) {
        triggerToast("success", "Settings successfully exported!");
      } else {
        triggerToast("error", `Export failed: ${data.error}`);
      }
    });

    window.electronAPI.onReceiveFromMain("analytics-data", (data) => {
      setAnalyticsData(data);
    });

    window.electronAPI.onReceiveFromMain("deadline-reminder", (data) => {
      if (data.isRandomNudge) {
        triggerToast("success", `💡 ${data.nudgeMessage}`);
      } else if (data.isOverdue) {
        triggerToast("error", `🔴 Task Overdue: "${data.title}" was due!`);
      } else {
        triggerToast("error", `⏰ Deadline Warning: "${data.title}" due in ${data.minutesLeft}m!`);
      }
    });

    window.electronAPI.sendTaskAction("getAllTasks");
    window.electronAPI.sendTaskAction("getSettings");
    window.electronAPI.sendTaskAction("getFocusMessages");
    window.electronAPI.sendTaskAction("getAnalytics", { dayRange: 7 });
  }, []);

  useEffect(() => {
    let heartbeatTimeout;
    window.electronAPI.onReceiveFromMain("heartbeat", () => {
      setMonitorStatus("connected");
      clearTimeout(heartbeatTimeout);
      heartbeatTimeout = setTimeout(() => {
        setMonitorStatus("offline");
      }, 12000);
    });
    return () => {
      clearTimeout(heartbeatTimeout);
    };
  }, []);

  const handleModeTransition = (targetMode) => {
    setCurrentMode(targetMode);
    window.electronAPI.sendTaskAction("changeMode", { mode: targetMode });
  };

  if (currentMode === "orbit") {
    return (
      <div className="relative w-screen h-screen bg-transparent overflow-hidden">
        <OrbitView 
          taskList={taskList}
          onBackToDashboard={() => handleModeTransition("dashboard")}
        />
        {toast.show && (
          <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-xs font-semibold backdrop-blur-md animate-fade-in ${
            toast.type === "success" 
              ? "bg-primary-container text-on-primary-container" 
              : "bg-error-container text-on-error-container"
          }`}>
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen overflow-x-hidden flex">
      {/* SideNavBar — Theme Matched */}
      <nav 
        className={`fixed left-0 top-0 h-full z-40 flex flex-col w-[220px] transition-transform duration-300 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`} 
        style={{ 
          background: currentTheme.mode === 'light' ? "var(--surface-container-low)" : "var(--surface-container)",
          borderRight: `1px solid var(--outline-variant)`
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 pulse-glow"
            style={{ background: "var(--primary-container)" }}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>
              rocket_launch
            </span>
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-tight leading-none" style={{ color: "var(--primary)" }}>OrbitCore</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--on-surface-variant)" }}>Focus Engine</p>
          </div>
        </div>

        {/* Nav Items */}
        <ul className="flex flex-col gap-1 px-3 py-4 flex-grow">
          {[
            { tab: "tasks",     icon: "grid_view",     label: "Dashboard" },
            { tab: "analytics", icon: "insights",      label: "Analytics" },
            { tab: "settings",  icon: "settings",      label: "Settings"  },
          ].map(({ tab, icon, label }) => (
            <li key={tab}>
              <button
                onClick={() => { setActiveTab(tab); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === tab
                    ? "text-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30"
                }`}
                style={activeTab === tab ? {
                  background: "var(--primary-container)",
                  color: "var(--primary)",
                } : {}}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: activeTab === tab ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {icon}
                </span>
                {label}
              </button>
            </li>
          ))}

          {/* Orbit Mode — special CTA */}
          <li className="mt-3">
            <button
              onClick={() => handleModeTransition("orbit")}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all cursor-pointer group"
              style={{
                background: "var(--primary-container)",
                color: "var(--primary)",
              }}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>orbit</span>
              Orbit Mode
              <span className="ml-auto text-[9px] font-black uppercase tracking-widest opacity-80">3D</span>
            </button>
          </li>
        </ul>

        {/* Bottom: Monitor status + theme toggle */}
        <div className="px-4 pb-5 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-1.5 h-1.5 rounded-full ${monitorStatus === 'connected' ? 'bg-tertiary' : 'bg-error'}`} />
            <span className="text-[10px] font-mono text-on-surface-variant opacity-80">
              {monitorStatus === 'connected' ? 'Monitor Active' : 'Monitor Offline'}
            </span>
          </div>

          <button
            onClick={toggleThemeMode}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all hover:bg-surface-variant/40 cursor-pointer text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[16px]">
              {currentTheme.mode === "dark" ? "light_mode" : "dark_mode"}
            </span>
            {currentTheme.mode === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
        </div>

        {/* Mobile close */}
        <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden mx-4 mb-4 bg-surface-variant text-on-surface rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-semibold transition-all">
          Close
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[220px] relative h-screen overflow-y-auto custom-scrollbar flex flex-col w-full">

        {/* Dashboard Content */}
        <div className="pt-6 px-5 sm:px-8 pb-24 max-w-[1500px] w-full mx-auto flex-1 flex flex-col">
          {/* Mobile menu trigger */}
          <div className="md:hidden flex items-center justify-between mb-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-on-surface-variant hover:text-primary p-2 bg-surface-container rounded-xl transition-all flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined">menu</span> Menu
            </button>
            <h1 className="text-sm font-bold text-primary capitalize">{activeTab}</h1>
          </div>

          {activeTab === "tasks" && (
            <DashboardView 
              taskList={taskList}
              activeTask={activeTask}
              isFocusActive={isFocusActive}
              monitorUpdate={monitorUpdate}
              focusMessages={focusMessages}
              analyticsData={analyticsData}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsView 
              taskList={taskList}
              todayFocusSeconds={todayFocusSeconds}
              analyticsData={analyticsData}
              triggerToast={triggerToast}
            />
          )}

          {activeTab === "settings" && (
            <SettingsView 
              settings={settings}
              theme={currentTheme.mode}
              themeName={themeName}
              onThemeChange={applyTheme}
              allThemes={THEMES}
              toggleTheme={toggleThemeMode}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="mt-auto px-8 py-3 text-[11px] z-20 flex justify-between items-center w-full text-on-surface-variant opacity-70">
          <span>OrbitCore · Focus Engine</span>
          <span className={`font-bold ${isFocusActive ? "text-tertiary" : "text-on-surface-variant"}`}>
            {isFocusActive ? "⬤ Focus Active" : "○ Standby"}
          </span>
        </footer>

        {toast.show && (
          <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-xs font-semibold backdrop-blur-md animate-fade-in ${
            toast.type === "success" 
              ? "bg-primary-container text-on-primary-container" 
              : "bg-error-container text-on-error-container"
          }`}>
            {toast.message}
          </div>
        )}

        {showFirstRunModal && (
          <FirstRunModal onComplete={() => setShowFirstRunModal(false)} />
        )}

        {/* Motivational Reminders Overlay */}
        <RemindersOverlay />
      </main>
    </div>
  );
}
