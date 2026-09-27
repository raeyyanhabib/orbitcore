import React, { useState, useEffect } from 'react';

export default function AppSelectionModal({ onConfirm, onCancel, taskId }) {
  const [runningApps, setRunningApps] = useState([]);
  const [selectedApps, setSelectedApps] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState("whitelist");

  useEffect(() => {
    window.electronAPI.sendTaskAction("getRunningApps", { taskId });
    
    window.electronAPI.onReceiveFromMain("running-apps", (apps) => {
      setRunningApps(apps);
      setLoading(false);
    });
  }, [taskId]);

  const handleToggleApp = (appName) => {
    const newSelected = new Set(selectedApps);
    if (newSelected.has(appName)) {
      newSelected.delete(appName);
    } else {
      newSelected.add(appName);
    }
    setSelectedApps(newSelected);
  };

  const handleConfirm = () => {
    onConfirm({
      filterMode,
      allowedApps: Array.from(selectedApps)
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-xl">
      <div className="relative z-10 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="bg-surface-container rounded-3xl border border-white/10 p-8">
          
          <h2 className="text-2xl font-bold text-on-surface mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined">security</span>
            Focus App Filter
          </h2>
          <p className="text-on-surface-variant text-sm mb-6">
            Define which apps count as "on-task" during this focus session.
          </p>

          <div className="flex gap-2 mb-6 bg-surface rounded-lg p-1 w-fit">
            <button
              onClick={() => { setFilterMode("whitelist"); setSelectedApps(new Set()); }}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                filterMode === "whitelist"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Whitelist (Only these count)
            </button>
            <button
              onClick={() => { setFilterMode("blacklist"); setSelectedApps(new Set()); }}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                filterMode === "blacklist"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Blacklist (Block these)
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin mr-2">sync</span>
              Scanning running processes...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mb-6 max-h-96 overflow-y-auto">
              {runningApps.map((app) => (
                <label
                  key={app.name}
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl cursor-pointer hover:bg-surface-variant/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedApps.has(app.name)}
                    onChange={() => handleToggleApp(app.name)}
                    className="w-4 h-4 cursor-pointer accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">
                      {app.displayName || app.name}
                    </p>
                    <p className="text-xs text-on-surface-variant truncate">
                      {app.name}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 bg-surface hover:bg-surface-variant text-on-surface rounded-xl transition-all font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedApps.size === 0}
              className="px-6 py-2.5 bg-primary hover:bg-primary-fixed text-on-primary rounded-xl transition-all font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined">check</span>
              Confirm & Start Focus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
