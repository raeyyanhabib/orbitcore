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
      "completeTask",
      "deleteTask",
      "startFocus",
      "stopFocus",
      "getSettings",
      "saveSetting",
      "changeMode",
      "getResearch",
      "exportLogs",
      "importSettings",
      "exportSettings",
      "getFocusMessages"
    ];

    // Check if the requested action is present in the whitelisted allowedActions array.
    if (allowedActions.includes(action)) {
      // Forward the safe action and its payload to the Electron main process via IPC.
      ipcRenderer.send("task-action", { action, payload });
    } else {
      // Print warning message for blocked unauthorized attempts.
      console.warn(`Blocked unauthorized IPC action attempt: ${action}`);
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
      "heartbeat"
    ];

    // Verify if the channel is whitelisted.
    if (allowedChannels.includes(channel)) {
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
  }

});
