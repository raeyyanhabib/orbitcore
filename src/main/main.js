// src/main/main.js
// Core Electron main process.
// Spawns Python backend, pipes standard streams, and manages window lifecycles.

const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
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
 * Resolves local OS AppData paths for SQLite database and log file.
 * Creates parent directory recursively if missing.
 */
function getStoragePaths() {
  // Compute directory path under the OS-specific user data directory
  const storageDir = path.join(app.getPath("userData"), "orbitcore");

  // Create storage directory if it does not already exist
  if (!fs.existsSync(storageDir)) {
    try {
      fs.mkdirSync(storageDir, { recursive: true });
    } catch (err) {
      console.error("Failed to create storage directory:", err);
    }
  }

  // Set database file and main log paths
  dbFilePath = path.join(storageDir, "orbit_tracker.db");
  logFilePath = path.join(storageDir, "orbit_tracker.log");
}


/**
 * Writes or delegates a diagnostic log entry with timestamp and severity level.
 * Delegates writes to the Python subprocess if running, to preserve the single-writer pattern.
 */
function writeLog(level, message) {
  // Format current ISO timestamp
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  
  // Format log entry line with Electron tags
  const logLine = `[${timestamp}] [${level}] [Electron.Main] ${message}\n`;

  // Delegate writing to Python monitor if running and stdin stream is writable
  if (pyProcess && !pyProcess.killed && pyProcess.stdin.writable) {
    sendActionToPython("logEntry", { level, message: `[Electron.Main] ${message}` });
  } else {
    // Fall back to direct file write if Python backend is not active yet
    try {
      fs.appendFileSync(logFilePath, logLine, "utf8");
    } catch (err) {
      console.error("Log file write failed:", err);
    }
  }
}


/**
 * Launches the background Python monitor subprocess.
 * Implements a backoff auto-restart logic (max 3 launches within 60 seconds).
 */
function spawnPythonSubprocess() {
  const now = Date.now();
  
  // Clean up attempts older than 60 seconds
  spawnAttempts = spawnAttempts.filter(attemptTime => now - attemptTime < 60000);

  // If 3 crashes occurred within 60 seconds, halt restarts and alert frontend
  if (spawnAttempts.length >= 3) {
    writeLog("ERROR", "Python subprocess crashed 3 times in 60s. Disabling auto-restart.");
    
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      // Notify the frontend that the monitoring backend is offline
      dashboardWindow.webContents.send("monitor-status", { status: "offline" });
    }
    return;
  }

  // Log the current spawn attempt timestamp
  spawnAttempts.push(now);
  const isDev = !app.isPackaged;
  writeLog("INFO", `Spawning Python backend (DevMode: ${isDev}, Attempt: ${spawnAttempts.length})`);

  // Spawn backend process based on environment
  if (isDev) {
    // Development mode: spawn using system Python interpreter with unbuffered stdio (-u)
    pyProcess = spawn("python", ["-u", "./src/backend/monitor.py"], {
      env: { ...process.env, PYTHONUNBUFFERED: "1" }
    });
  } else {
    // Production mode: spawn the compiled PyInstaller executable
    const binaryPath = path.join(
      process.resourcesPath,
      "src/backend/dist/orbit_monitor/orbit_monitor.exe"
    );
    pyProcess = spawn(binaryPath, [], {
      env: { ...process.env, PYTHONUNBUFFERED: "1" }
    });
  }

  // 1. Create a line-by-line readline interface on Python stdout stream
  const outputReader = readline.createInterface({
    input: pyProcess.stdout,
    terminal: false
  });

  // Handle standard JSON messages received from Python stdout
  outputReader.on("line", (line) => {
    try {
      const message = JSON.parse(line);
      const { channel, data } = message;

      if (channel === "paths-initialized-from-python") {
        ipcMain.emit("paths-initialized-from-python");
      }

      // Broadcast parsed message channels to open renderer windows
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

  // 2. Capture stderr lines and write them to diagnostic log
  pyProcess.stderr.on("data", (data) => {
    writeLog("ERROR", `Python stderr: ${data.toString().trim()}`);
  });

  // 3. Handle Python process exit events and schedule auto-restarts
  pyProcess.on("close", (code) => {
    writeLog("WARNING", `Python subprocess exited with code: ${code}`);
    pyProcess = null;

    // Skip restart sequence if application is actively shutting down
    if (app.isQuitting) return;

    // Wait 2 seconds before attempting subprocess restart
    setTimeout(() => {
      // Determine next status state based on attempts list length
      const nextStatus = spawnAttempts.length >= 3 ? "offline" : "reconnecting";
      
      if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        // Broadcast the status update to frontend components
        dashboardWindow.webContents.send("monitor-status", { status: nextStatus });
      }

      // Re-trigger process launch
      spawnPythonSubprocess();
    }, 2000);
  });
}


/**
 * Sends a structured command and payload to Python via standard input.
 * Ensures stdout/stdin IPC channels remain unbuffered and flushed across Electron subprocesses.
 */
function sendActionToPython(action, payload = {}) {
  if (pyProcess && !pyProcess.killed && pyProcess.stdin.writable) {
    writeLog("INFO", `Transmitting action '${action}' to Python backend via stdin.`);
    const message = JSON.stringify({ action, payload }) + "\n";
    pyProcess.stdin.write(message);
  } else {
    writeLog("ERROR", `sendActionToPython blocked for '${action}' — process not running or stdin closed.`);
  }
}


/**
 * Parses settings objects to validate their formats and bounds before saving.
 */
function validateSettings(data) {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const validated = {};

  // Check and validate checkInterval bounds (1 to 10 seconds)
  if (data.hasOwnProperty("checkInterval")) {
    const val = parseInt(data.checkInterval, 10);
    if (!isNaN(val) && val >= 1 && val <= 10) {
      validated.checkInterval = String(val);
    }
  }

  // Check and validate retentionDays bounds (7 to 365 days)
  if (data.hasOwnProperty("retentionDays")) {
    const val = parseInt(data.retentionDays, 10);
    if (!isNaN(val) && val >= 7 && val <= 365) {
      validated.retentionDays = String(val);
    }
  }

  // Check and validate researchEnabled toggle string
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
  
  // Compute configuration file path in root directory of execution
  const msgPath = isDev 
    ? path.join(__dirname, "../../focusModemsgs.txt")
    : path.join(path.dirname(process.execPath), "focusModemsgs.txt");

  if (fs.existsSync(msgPath)) {
    try {
      const content = fs.readFileSync(msgPath, "utf8");
      const matches = [];
      const lines = content.split(/\r?\n/);
      
      // Parse entries formatted like: NUMBER. "Message Text"
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
    // Block URL changes that do not target dev server port or local file protocols
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
  dashboardWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Orbit Task Tracker",
    autoHideMenuBar: true,
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

  // Attach navigation guard to block external link navigation inside renderer context
  attachNavigationGuard(dashboardWindow);

  dashboardWindow.on("closed", () => {
    dashboardWindow = null;
  });
}


/**
 * Creates the transparent, frameless Orbit Solar overlay window.
 */
function createOrbitWindow() {
  orbitWindow = new BrowserWindow({
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

  const isDev = !app.isPackaged;

  if (isDev) {
    orbitWindow.loadURL("http://localhost:5173");
  } else {
    orbitWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  orbitWindow.maximize();

  // Attach navigation guard to Orbit window
  attachNavigationGuard(orbitWindow);

  orbitWindow.on("closed", () => {
    orbitWindow = null;
  });
}


// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Disable global window menu bar
  Menu.setApplicationMenu(null);

  // Resolve AppData paths
  getStoragePaths();
  writeLog("INFO", "Electron app ready. Initializing...");

  // Launch background Python process
  spawnPythonSubprocess();

  // Wait for paths-initialized before showing dashboard
  ipcMain.once("paths-initialized-from-python", () => {
    writeLog("INFO", "Python backend initialized. Creating dashboard window.");
    createDashboardWindow();
  });

  // Transmit storage paths to Python with small delay to let streams start up
  setTimeout(() => {
    sendActionToPython("setPaths", { dbPath: dbFilePath, logPath: logFilePath });
  }, 200);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createDashboardWindow();
    }
  });
});


// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.on("task-action", (event, { action, payload }) => {
  if (action === "changeMode") {
    const targetMode = payload.mode;
    writeLog("INFO", `Mode transition requested: ${targetMode}`);

    if (targetMode === "orbit") {
      // CLOSE dashboard (don't hide)
      if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.close();
        dashboardWindow = null;
      }
      
      // Launch Orbit window if not exists
      if (!orbitWindow) {
        createOrbitWindow();
      } else {
        orbitWindow.show();
      }
      
    } else {
      // CLOSE orbit window
      if (orbitWindow && !orbitWindow.isDestroyed()) {
        orbitWindow.close();
        orbitWindow = null;
      }
      
      // Relaunch dashboard
      if (!dashboardWindow) {
        createDashboardWindow();
      } else {
        dashboardWindow.show();
      }
    }

  } else if (action === "getFocusMessages") {
    // Read local customizable reminders list
    const msgs = loadFocusMessages();
    event.sender.send("focus-messages", msgs);

  } else if (action === "exportSettings") {
    const parentWin = dashboardWindow || orbitWindow;
    
    // Display native OS save dialog for exporting configuration files
    const filePath = dialog.showSaveDialogSync(parentWin, {
      title: "Export Settings",
      defaultPath: path.join(app.getPath("documents"), "orbit_settings.json"),
      filters: [{ name: "JSON files", extensions: ["json"] }]
    });

    if (filePath) {
      // Direct Python monitor to save settings mapping to target JSON file path
      sendActionToPython("exportSettingsFile", { filePath });
    }

  } else if (action === "importSettings") {
    const parentWin = dashboardWindow || orbitWindow;

    // Display native OS open dialog to select setting backup JSON file
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
          // Iterate and send each validated setting to Python database handler
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

  } else {
    // Forward standard actions directly to Python stdin
    sendActionToPython(action, payload);
  }
});


// Handles direct write log messages received from renderer context
ipcMain.on("write-log", (event, { level, message }) => {
  writeLog(level, message);
});


// Opens the application log file in user standard notepad/text viewer
ipcMain.on("open-log-file", () => {
  if (fs.existsSync(logFilePath)) {
    shell.openPath(logFilePath);
  } else {
    writeLog("WARNING", "Log file does not exist yet.");
  }
});


// ─── Shutdown ─────────────────────────────────────────────────────────────────

// Triggers when Electron app begins closing sequences
app.on("before-quit", () => {
  app.isQuitting = true;
  
  // Cleanly kill the background Python monitoring subprocess
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
