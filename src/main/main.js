// src/main/main.js
// Core Electron main process.
// Spawns Python backend, pipes standard streams, and manages window lifecycles.

const { app, BrowserWindow, ipcMain, shell, dialog, Menu, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn, execSync } = require("child_process");
const readline = require("readline");

// Global window and process references
let dashboardWindow = null;
let orbitWindow = null;
let pyProcess = null;

// Track python subprocess spawn attempts inside the last 60 seconds to prevent endless crash loops
let spawnAttempts = [];

// Paths resolved after app.getPath("userData") is available
let dbFilePath = "";
let logFilePath = "";

// Track if the application is currently in shutdown sequence
app.isQuitting = false;


/**
 * Reads installer or custom configuration from config.json.
 * Searches in executable directory, user data directory, or app root.
 */
function getInstallerConfig() {
  const possiblePaths = [
    path.join(path.dirname(process.execPath), "config.json"),
    path.join(app.getPath("userData"), "config.json"),
    path.join(__dirname, "../../config.json")
  ];

  for (const configPath of possiblePaths) {
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, "utf8");
        const parsed = JSON.parse(raw);
        writeLog("INFO", `Found installer configuration at: ${configPath}`);
        return parsed;
      } catch (err) {
        writeLog("WARNING", `Failed to parse config at ${configPath}: ${err.message}`);
      }
    }
  }
  return null;
}


/**
 * Resolves local OS AppData or custom data directory paths for SQLite database and log file.
 * Creates parent directory recursively if missing.
 */
function getStoragePaths() {
  const config = getInstallerConfig();
  let storageDir = "";

  if (config && (config.dataDir || config.storageDir)) {
    storageDir = config.dataDir || config.storageDir;
    writeLog("INFO", `Using custom data directory: ${storageDir}`);
  } else {
    storageDir = path.join(app.getPath("userData"), "orbitcore");
  }

  if (!fs.existsSync(storageDir)) {
    try {
      fs.mkdirSync(storageDir, { recursive: true });
    } catch (err) {
      console.error("Failed to create storage directory, falling back to default:", err);
      storageDir = path.join(app.getPath("userData"), "orbitcore");
      try {
        fs.mkdirSync(storageDir, { recursive: true });
      } catch (e) {
        console.error("Failed to create fallback storage directory:", e);
      }
    }
  }

  dbFilePath = path.join(storageDir, "orbit_tracker.db");
  logFilePath = path.join(storageDir, "orbit_tracker.log");
}


/**
 * Writes or delegates a diagnostic log entry with timestamp and severity level.
 */
function writeLog(level, message) {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  const logLine = `[${timestamp}] [${level}] [Electron.Main] ${message}\n`;

  if (logFilePath) {
    try {
      fs.appendFileSync(logFilePath, logLine, "utf8");
    } catch (err) {
      console.error("Log file write failed:", err);
    }
  }
}


/**
 * Sends a structured command and payload to Python via standard input.
 */
function sendActionToPython(action, payload = {}) {
  if (pyProcess && !pyProcess.killed && pyProcess.stdin.writable) {
    if (action !== "logEntry") {
      writeLog("INFO", `Transmitting action '${action}' to Python backend via stdin.`);
    }
    const message = JSON.stringify({ action, payload }) + "\n";
    pyProcess.stdin.write(message);
  } else if (action !== "logEntry") {
    writeLog("ERROR", `sendActionToPython blocked for '${action}' — process not running or stdin closed.`);
  }
}


/**
 * Helper to pin Orbit window to desktop (behind all others)
 */
function pinOrbitToDesktop() {
  if (!orbitWindow || orbitWindow.isDestroyed()) return;
  
  try {
    const hwnd = orbitWindow.getNativeWindowHandle().readUInt32LE(0);
    
    const psCmd = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Win32 {
        [DllImport("user32.dll")]
        public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, 
          int X, int Y, int cx, int cy, uint uFlags);
        public static readonly IntPtr HWND_BOTTOM = new IntPtr(1);
        public const uint SWP_NOSIZE = 1;
        public const uint SWP_NOMOVE = 2;
      }
"@
      [Win32]::SetWindowPos([IntPtr]${hwnd}, [Win32]::HWND_BOTTOM, 0, 0, 0, 0, 
        ([Win32]::SWP_NOSIZE -bor [Win32]::SWP_NOMOVE))
    `;
    
    execSync(`powershell -Command "${psCmd.replace(/\n/g, ' ')}"`, { stdio: 'ignore' });
    writeLog("INFO", "Orbit window pinned to desktop (behind all windows)");
  } catch (err) {
    writeLog("WARNING", `Failed to pin orbit window: ${err.message}`);
  }
}


/**
 * Launches the background Python monitor subprocess.
 * Implements a backoff auto-restart logic (max 3 launches within 60 seconds).
 */
function spawnPythonSubprocess() {
  const now = Date.now();
  
  spawnAttempts = spawnAttempts.filter(attemptTime => now - attemptTime < 60000);

  if (spawnAttempts.length >= 3) {
    writeLog("ERROR", "Python subprocess crashed 3 times in 60s. Disabling auto-restart.");
    
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.webContents.send("monitor-status", { status: "offline" });
    }
    return;
  }

  spawnAttempts.push(now);
  const isDev = !app.isPackaged;
  writeLog("INFO", `Spawning Python backend (DevMode: ${isDev}, Attempt: ${spawnAttempts.length})`);

  if (isDev) {
    pyProcess = spawn("python", ["-u", "./src/backend/monitor.py"], {
      env: { ...process.env, PYTHONUNBUFFERED: "1" }
    });
  } else {
    const binaryPath = path.join(
      process.resourcesPath,
      "src/backend/dist/orbit_monitor/orbit_monitor.exe"
    );
    pyProcess = spawn(binaryPath, [], {
      env: { ...process.env, PYTHONUNBUFFERED: "1" }
    });
  }

  const outputReader = readline.createInterface({
    input: pyProcess.stdout,
    terminal: false
  });

  outputReader.on("line", (line) => {
    try {
      const message = JSON.parse(line);
      const { channel, data } = message;

      if (channel === "paths-initialized-from-python") {
        ipcMain.emit("paths-initialized-from-python");
      }

      if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.webContents.send(channel, data);
      }
      if (orbitWindow && !orbitWindow.isDestroyed()) {
        orbitWindow.webContents.send(channel, data);
      }
    } catch (err) {
      writeLog("WARNING", `Malformed Python stdout line: ${line}`);
    }
  });

  pyProcess.stderr.on("data", (data) => {
    writeLog("ERROR", `Python stderr: ${data.toString().trim()}`);
  });

  pyProcess.on("close", (code) => {
    writeLog("WARNING", `Python subprocess exited with code: ${code}`);
    pyProcess = null;

    if (app.isQuitting) return;

    setTimeout(() => {
      const nextStatus = spawnAttempts.length >= 3 ? "offline" : "reconnecting";
      
      if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.webContents.send("monitor-status", { status: nextStatus });
      }

      spawnPythonSubprocess();
    }, 2000);
  });
}


/**
 * Parses settings objects to validate their formats and bounds before saving.
 */
function validateSettings(data) {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const validated = {};

  if (data.hasOwnProperty("checkInterval")) {
    const val = parseInt(data.checkInterval, 10);
    if (!isNaN(val) && val >= 1 && val <= 10) {
      validated.checkInterval = String(val);
    }
  }

  if (data.hasOwnProperty("retentionDays")) {
    const val = parseInt(data.retentionDays, 10);
    if (!isNaN(val) && val >= 7 && val <= 365) {
      validated.retentionDays = String(val);
    }
  }

  if (data.hasOwnProperty("researchEnabled")) {
    const val = String(data.researchEnabled).toLowerCase();
    if (val === "true" || val === "false") {
      validated.researchEnabled = val;
    }
  }

  return Object.keys(validated).length > 0 ? validated : null;
}


/**
 * Reads and parses user custom reminders from the focusModemsgs.txt file.
 */
function loadFocusMessages() {
  const isDev = !app.isPackaged;
  
  const msgPath = isDev 
    ? path.join(__dirname, "../../focusModemsgs.txt")
    : path.join(path.dirname(process.execPath), "focusModemsgs.txt");

  if (fs.existsSync(msgPath)) {
    try {
      const content = fs.readFileSync(msgPath, "utf8");
      const matches = [];
      const lines = content.split(/\r?\n/);
      
      for (const line of lines) {
        const match = line.match(/^\d+\.\s+"(.*)"$/);
        if (match) {
          matches.push(match[1]);
        }
      }

      if (matches.length > 0) {
        return matches;
      }
    } catch (e) {
      writeLog("WARNING", `Failed to read focusModemsgs.txt: ${e.message}`);
    }
  }
  return null;
}


/**
 * Restricts Electron windows from navigating away from the local app origin.
 */
function attachNavigationGuard(windowRef) {
  windowRef.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("http://localhost:5173") && !url.startsWith("file://")) {
      event.preventDefault();
      writeLog("WARNING", `Navigation attempt blocked to: ${url}`);
    }
  });
}


/**
 * Creates the dashboard window framed console.
 */
function createDashboardWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: workWidth, height: workHeight, x: workX, y: workY } = primaryDisplay.workArea;

  const windowWidth = 1280;
  const windowHeight = 800;
  const x = Math.max(workX, workX + Math.round((workWidth - windowWidth) / 2));
  const y = Math.max(workY, workY + Math.round((workHeight - windowHeight) / 2));

  dashboardWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: x,
    y: y,
    minWidth: 900,
    minHeight: 600,
    title: "Orbit Task Tracker",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  dashboardWindow.setMenuBarVisibility(false);

  const isDev = !app.isPackaged;

  if (isDev) {
    dashboardWindow.loadURL("http://localhost:5173");
  } else {
    dashboardWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  dashboardWindow.once("ready-to-show", () => {
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.show();
    }
  });

  attachNavigationGuard(dashboardWindow);

  dashboardWindow.on("closed", () => {
    dashboardWindow = null;
  });
}


/**
 * Creates the transparent, frameless Orbit Solar mini-widget window.
 */
function createOrbitWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: workWidth, height: workHeight, x: workX, y: workY } = primaryDisplay.workArea;

  const widgetWidth = 280;
  const widgetHeight = 330;

  orbitWindow = new BrowserWindow({
    width: widgetWidth,
    height: widgetHeight,
    x: workX + workWidth - widgetWidth - 24,
    y: workY + workHeight - widgetHeight - 24,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  orbitWindow.setOpacity(0.75);

  const isDev = !app.isPackaged;

  if (isDev) {
    orbitWindow.loadURL("http://localhost:5173#orbit");
  } else {
    orbitWindow.loadFile(path.join(__dirname, "../../dist/index.html"), { hash: "orbit" });
  }

  attachNavigationGuard(orbitWindow);

  orbitWindow.on("closed", () => {
    orbitWindow = null;
  });
}


// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  getStoragePaths();
  writeLog("INFO", "Electron app ready. Initializing...");

  // Create dashboard immediately
  createDashboardWindow();
  
  // Launch Python backend in background
  spawnPythonSubprocess();

  // Set paths when ready (non-blocking)
  setTimeout(() => {
    sendActionToPython("setPaths", { dbPath: dbFilePath, logPath: logFilePath });
  }, 100);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createDashboardWindow();
    }
  });
});


// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.on("task-action", (event, { action, payload }) => {
  writeLog("INFO", `Received task-action: ${action}`);

  if (action === "changeMode") {
    const targetMode = payload.mode;
    writeLog("INFO", `Mode transition requested: ${targetMode}`);

    if (targetMode === "orbit") {
      if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.close();
        dashboardWindow = null;
      }
      
      if (!orbitWindow) {
        createOrbitWindow();
      } else {
        orbitWindow.show();
      }
      
    } else {
      if (orbitWindow && !orbitWindow.isDestroyed()) {
        orbitWindow.close();
        orbitWindow = null;
      }
      
      if (!dashboardWindow) {
        createDashboardWindow();
      } else {
        dashboardWindow.show();
      }
    }

  } else if (action === "getFocusMessages") {
    const msgs = loadFocusMessages();
    event.sender.send("focus-messages", msgs);

  } else if (action === "exportSettings") {
    const parentWin = dashboardWindow || orbitWindow;
    
    const filePath = dialog.showSaveDialogSync(parentWin, {
      title: "Export Settings",
      defaultPath: path.join(app.getPath("documents"), "orbit_settings.json"),
      filters: [{ name: "JSON files", extensions: ["json"] }]
    });

    if (filePath) {
      sendActionToPython("exportSettingsFile", { filePath });
    }

  } else if (action === "importSettings") {
    const parentWin = dashboardWindow || orbitWindow;

    const filePaths = dialog.showOpenDialogSync(parentWin, {
      title: "Import Settings",
      defaultPath: app.getPath("documents"),
      filters: [{ name: "JSON files", extensions: ["json"] }],
      properties: ["openFile"]
    });

    if (filePaths && filePaths.length > 0) {
      const filePath = filePaths[0];
      try {
        const content = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(content);
        const validated = validateSettings(parsed);

        if (validated) {
          for (const [key, value] of Object.entries(validated)) {
            sendActionToPython("saveSetting", { key, value });
          }
          
          writeLog("INFO", "Settings successfully imported.");
          event.sender.send("settings-imported", { success: true });
        } else {
          writeLog("WARNING", "Import failed: Invalid settings format.");
          event.sender.send("settings-imported", { success: false, error: "Invalid settings format" });
        }
      } catch (e) {
        writeLog("ERROR", `Failed to import settings: ${e.message}`);
        event.sender.send("settings-imported", { success: false, error: e.message });
      }
    }

  } else if (action === "toggle-orbit-hover") {
    if (orbitWindow && !orbitWindow.isDestroyed()) {
      const currentState = orbitWindow.isAlwaysOnTop();
      const nextState = !currentState;
      orbitWindow.setAlwaysOnTop(nextState);
      writeLog("INFO", `Toggled orbit window hover state to: ${nextState}`);
      if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.webContents.send("orbit-hover-status", { alwaysOnTop: nextState });
      }
      if (orbitWindow && !orbitWindow.isDestroyed()) {
        orbitWindow.webContents.send("orbit-hover-status", { alwaysOnTop: nextState });
      }
    }

  } else if (action === "set-orbit-opacity") {
    if (orbitWindow && !orbitWindow.isDestroyed()) {
      const opacity = parseFloat(payload.opacity) || 0.75;
      orbitWindow.setOpacity(opacity);
      writeLog("INFO", `Set orbit window opacity to: ${opacity}`);
    }

  } else if (action === "set-orbit-display-mode") {
    const mode = payload.displayMode;
    
    if (orbitWindow && !orbitWindow.isDestroyed()) {
      if (mode === "pinned") {
        pinOrbitToDesktop();
        orbitWindow.setAlwaysOnTop(false);
        writeLog("INFO", "Orbit set to desktop-pinned mode");
      } else if (mode === "overlay") {
        orbitWindow.setAlwaysOnTop(true);
        writeLog("INFO", "Orbit set to overlay mode");
      } else if (mode === "floating") {
        orbitWindow.setAlwaysOnTop(false);
        writeLog("INFO", "Orbit set to floating mode");
      }
    }

  } else if (action === "getRunningApps") {
    try {
      const apps = [];
      
      execSync('tasklist /fo csv /nh', (error, stdout) => {
        if (!error) {
          const lines = stdout.trim().split('\n');
          lines.slice(0, 50).forEach(line => {
            const name = line.replace(/"/g, '').trim();
            if (name && !name.includes('System') && !name.includes('svchost')) {
              apps.push({
                name: name.toLowerCase(),
                displayName: name.replace('.exe', '')
              });
            }
          });
        }
      });

      // Fallback async command execution
      const { exec } = require("child_process");
      exec('tasklist /fo csv /nh', (error, stdout) => {
        if (!error && stdout) {
          const lines = stdout.trim().split(/\r?\n/);
          const uniqueApps = new Map();
          lines.forEach(line => {
            const parts = line.split(',');
            if (parts.length > 0) {
              const name = parts[0].replace(/"/g, '').trim();
              if (name && !name.toLowerCase().includes('system') && !name.toLowerCase().includes('svchost') && name.endsWith('.exe')) {
                uniqueApps.set(name.toLowerCase(), {
                  name: name.toLowerCase(),
                  displayName: name.replace(/\.exe$/i, '')
                });
              }
            }
          });
          event.sender.send('running-apps', Array.from(uniqueApps.values()).slice(0, 40));
        } else {
          event.sender.send('running-apps', []);
        }
      });
    } catch (err) {
      writeLog("ERROR", `Failed to get running apps: ${err.message}`);
      event.sender.send('running-apps', []);
    }

  } else if (action === "getDataDirectory") {
    event.sender.send("data-directory", path.dirname(dbFilePath));

  } else {
    sendActionToPython(action, payload);
  }
});


ipcMain.on("write-log", (event, { level, message }) => {
  writeLog(level, message);
});


ipcMain.on("open-log-file", () => {
  if (fs.existsSync(logFilePath)) {
    shell.openPath(logFilePath);
  } else {
    writeLog("WARNING", "Log file does not exist yet.");
  }
});


ipcMain.handle("get-data-directory", () => {
  return path.dirname(dbFilePath);
});


// ─── Shutdown ─────────────────────────────────────────────────────────────────

app.on("before-quit", () => {
  app.isQuitting = true;
  
  if (pyProcess) {
    pyProcess.kill();
    pyProcess = null;
  }
});

app.on("window-all-closed", () => {
  writeLog("INFO", "All windows closed. Shutting down.");

  if (process.platform !== "darwin") {
    app.quit();
  }
});
