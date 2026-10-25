// src/preload/preload.js
// Preload script exposing a secure, whitelisted IPC bridge to the React renderer window context.
// Ensures that react views cannot directly execute Node.js shell commands or access filesystem.

const { contextBridge, ipcRenderer } = require("electron");

// Expose safe APIs to the 'window.electronAPI' global object
contextBridge.exposeInMainWorld("electronAPI", {
  
  // 1. Send actions from React renderer to Electron main process
  sendTaskAction: (action, payload) => {
    // Whitelisted actions that the React frontend is permitted to send to the Electron main process.
    const allowedActions = [
      "getAllTasks",
      "createTask",
      "editTask",
      "completeTask",
      "deleteTask",
      "batchCompleteTasks",
      "batchDeleteTasks",
      "startFocus",
      "stopFocus",
      "getSettings",
      "saveSetting",
      "changeMode",
      "getResearch",
      "getAnalytics",
      "exportLogs",
      "importSettings",
      "exportSettings",
      "getFocusMessages",
      "toggle-orbit-hover",
      "set-orbit-opacity",
      "set-orbit-display-mode",
      "getRunningApps",
      "getDataDirectory",
      "getTaskTimeBreakdown"
    ];

    // Schema Validation: Ensure action is string and payload is object or undefined
    if (typeof action === "string" && allowedActions.includes(action)) {
      const sanitizedPayload = typeof payload === "object" && payload !== null ? payload : {};
      ipcRenderer.send("task-action", { action, payload: sanitizedPayload });
    } else {
      console.warn(`Blocked unauthorized or malformed IPC action attempt: ${action}`);
    }

  },

  // 2. Register callbacks to receive stdout broadcasts from the Python monitor
  onReceiveFromMain: (channel, callback) => {
    // Whitelisted IPC channels that the React frontend is permitted to listen to.
    const allowedChannels = [
      "monitor-update",
      "tasks-list",
      "research-complete",
      "focus-started",
      "focus-stopped",
      "settings-map",
      "setting-saved",
      "settings-imported",
      "settings-exported",
      "focus-messages",
      "monitor-status",
      "heartbeat",
      "analytics-data",
      "deadline-reminder",
      "running-apps",
      "data-directory",
      "task-time-breakdown",
      "focus-intervention"
    ];

    // Verify if the channel is whitelisted.
    if (typeof channel === "string" && allowedChannels.includes(channel) && typeof callback === "function") {
      // Clear previous event listeners for this channel to prevent callback duplication and memory leaks.
      ipcRenderer.removeAllListeners(channel);

      // Listen for the IPC channel event and execute the provided callback with the received data payload.
      ipcRenderer.on(channel, (event, data) => callback(data));
    }

  },

  // 3. Write diagnostic logs to the local log file
  writeLogEntry: (level, message) => {
    ipcRenderer.send("write-log", { level, message });
  },

  // 4. Open the local log file in the operating system's default text editor
  openLogFile: () => {
    ipcRenderer.send("open-log-file");
  },

  // 5. Get current active data directory
  getDataDirectory: () => {
    return ipcRenderer.invoke("get-data-directory");
  }

});
