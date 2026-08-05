// src/renderer/App.jsx
// Core React component. Coordinates global state, window IPC interfaces, and sub-view renders.

import React, { useState, useEffect } from "react";
import DashboardView from "./components/DashboardView.jsx";
import OrbitView from "./components/OrbitView.jsx";
import AnalyticsView from "./components/AnalyticsView.jsx";
import SettingsView from "./components/SettingsView.jsx";

export default function App() {
  const [currentMode, setCurrentMode] = useState("dashboard"); // 'dashboard' | 'orbit'
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

  const triggerToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast({ show: false, type: "success", message: "" });
    }, 4000);
  };

  useEffect(() => {
    window.electronAPI.onReceiveFromMain("tasks-list", (tasks) => {
      setTaskList(tasks);
      if (activeTask) {
        const refreshed = tasks.find(t => t.id === activeTask.id);
        if (refreshed && refreshed.is_completed) {
          setActiveTask(null);
          setIsFocusActive(false);
        } else if (refreshed) {
          setActiveTask(refreshed);
        }
      }
    });

    window.electronAPI.onReceiveFromMain("settings-map", (settingsMap) => {
      setSettings(settingsMap);
    });

    window.electronAPI.onReceiveFromMain("monitor-update", (update) => {
      setMonitorUpdate(update);
      if (update.isOnTask) {
        setTodayFocusSeconds(prev => prev + (update.interval || 3));
      }
    });

    window.electronAPI.onReceiveFromMain("focus-started", (data) => {
      setIsFocusActive(true);
      const task = taskList.find(t => t.id === data.taskId);
      if (task) {
        setActiveTask(task);
      }
    });

    window.electronAPI.onReceiveFromMain("focus-stopped", () => {
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

    window.electronAPI.sendTaskAction("getAllTasks");
    window.electronAPI.sendTaskAction("getSettings");
    window.electronAPI.sendTaskAction("getFocusMessages");
  }, [taskList, activeTask]);

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
          activeTask={activeTask}
          monitorUpdate={monitorUpdate}
          isFocusActive={isFocusActive}
          focusMessages={focusMessages}
          onBackToDashboard={() => handleModeTransition("dashboard")}
        />
        {toast.show && (
          <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-xs font-semibold border backdrop-blur-md animate-fade-in ${
            toast.type === "success" 
              ? "bg-primary-container text-on-primary-container border-primary" 
              : "bg-error-container text-on-error-container border-error"
          }`}>
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container flex">
      {/* SideNavBar */}
      <nav className={`fixed left-0 top-0 h-full z-40 flex flex-col p-4 bg-surface-container docked left-0 w-64 border-r border-white/5 shadow-2xl transition-transform duration-300 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex items-center gap-4 mb-8 px-2">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
          </div>
          <div className="flex-col flex overflow-hidden">
            <span className="text-headline-md font-headline-md font-bold text-primary truncate">Orbit Tracker</span>
            <span className="text-label-sm font-label-sm text-on-surface-variant truncate">Productivity in Motion</span>
          </div>
        </div>
        <ul className="flex flex-col gap-2 flex-grow">
          <li>
            <button onClick={() => { setActiveTab("tasks"); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 rounded-xl p-3 transition-all group ${activeTab === 'tasks' ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(107,216,203,0.3)] translate-x-1' : 'text-on-surface-variant hover:bg-surface-variant hover:scale-105 duration-200'}`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'tasks' ? "'FILL' 1" : "'FILL' 0" }}>dashboard</span>
              <span className="text-label-md font-label-md">Dashboard</span>
            </button>
          </li>
          <li>
            <button onClick={() => handleModeTransition("orbit")} className="w-full flex items-center gap-3 text-on-surface-variant p-3 hover:bg-surface-variant rounded-xl transition-all hover:scale-105 duration-200 group">
              <span className="material-symbols-outlined">rocket_launch</span>
              <span className="text-label-md font-label-md">Orbit Mode</span>
            </button>
          </li>
          <li>
            <button onClick={() => { setActiveTab("analytics"); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 rounded-xl p-3 transition-all group ${activeTab === 'analytics' ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(107,216,203,0.3)] translate-x-1' : 'text-on-surface-variant hover:bg-surface-variant hover:scale-105 duration-200'}`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'analytics' ? "'FILL' 1" : "'FILL' 0" }}>insights</span>
              <span className="text-label-md font-label-md">Analytics</span>
            </button>
          </li>
          <li>
            <button onClick={() => { setActiveTab("settings"); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 rounded-xl p-3 transition-all group ${activeTab === 'settings' ? 'bg-primary-container text-on-primary-container shadow-[0_0_15px_rgba(107,216,203,0.3)] translate-x-1' : 'text-on-surface-variant hover:bg-surface-variant hover:scale-105 duration-200'}`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'settings' ? "'FILL' 1" : "'FILL' 0" }}>settings</span>
              <span className="text-label-md font-label-md">Settings</span>
            </button>
          </li>
        </ul>
        {/* Mobile close button */}
        <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden mt-auto mb-4 w-full bg-surface-variant text-on-surface rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-label-md text-label-md transition-all duration-200">
          Close Menu
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 relative min-h-screen flex flex-col w-full">
        
        {/* TopNavBar */}
        <header className="fixed top-0 w-full z-30 flex justify-between items-center px-gutter py-4 max-w-7xl mx-auto md:w-[calc(100%-16rem)] bg-surface/80 backdrop-blur-md shadow-sm border-b border-white/10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-on-surface-variant p-2 hover:bg-white/5 rounded-full transition-all">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="text-headline-md font-headline-md font-extrabold text-primary tracking-tight capitalize">
              {activeTab}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-4">
               {activeTask && (
                 <span className="text-label-sm font-label-sm text-on-surface-variant flex items-center gap-1">
                   <span className="material-symbols-outlined text-[14px]">track_changes</span> 
                   {activeTask.title}
                 </span>
               )}
               <div className="flex items-center gap-2 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${monitorStatus === "connected" ? "bg-tertiary animate-pulse" : monitorStatus === "reconnecting" ? "bg-secondary animate-pulse" : "bg-error"}`}></span>
                  <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider">
                    {monitorStatus}
                  </span>
               </div>
            </div>
            <button className="text-on-surface-variant hover:text-primary transition-colors hover:bg-white/5 p-2 rounded-full scale-95 active:scale-90 duration-200 relative">
              <span className="material-symbols-outlined">notifications</span>
              {isFocusActive && <span className="absolute top-1 right-2 w-2 h-2 bg-secondary-container rounded-full animate-pulse"></span>}
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="mt-24 px-4 sm:px-gutter lg:px-section-gap pb-24 max-w-[1600px] w-full mx-auto flex-1 flex flex-col">
          {activeTab === "tasks" && (
            <DashboardView 
              taskList={taskList}
              activeTask={activeTask}
              isFocusActive={isFocusActive}
              monitorUpdate={monitorUpdate}
              focusMessages={focusMessages}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsView 
              taskList={taskList}
              todayFocusSeconds={todayFocusSeconds}
              triggerToast={triggerToast}
            />
          )}

          {activeTab === "settings" && (
            <SettingsView 
              settings={settings}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="mt-auto bg-surface-container-lowest border-t border-white/5 px-gutter py-4 text-xs z-20 flex justify-between items-center w-full max-w-7xl mx-auto">
          <p className="text-on-surface-variant">© 2024 Orbit Task Tracker. All systems go.</p>
          <div className="flex gap-4">
            <span className="text-secondary font-bold transition-colors">
              Focus Mode: {isFocusActive ? "Active" : "Inactive"}
            </span>
          </div>
        </footer>

        {toast.show && (
          <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-xs font-semibold border backdrop-blur-md animate-fade-in ${
            toast.type === "success" 
              ? "bg-primary-container text-on-primary-container border-primary" 
              : "bg-error-container text-on-error-container border-error"
          }`}>
            {toast.message}
          </div>
        )}
      </main>
    </div>
  );
}
