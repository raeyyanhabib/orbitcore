================================================================================
                    ORBITCORE - FILE ARCHITECTURE MAP
                    How files connect, what they own, and what they depend on
                    Last updated: 2026-09-18
================================================================================

LEGEND
  -->  sends data to / calls
  <--  receives data from
  <-> bidirectional
  [IPC] Electron inter-process communication
  [stdio] Python subprocess stdin/stdout pipe
  [FS]  direct filesystem read/write


================================================================================
  LAYER 1 — ENTRY & PROCESS BOOTSTRAP
================================================================================

src/main/main.js
  ROLE: Electron main process. App entry point. Owns window lifecycle,
        spawns Python subprocess, and routes all IPC between renderer and Python.
  OWNS:
    - BrowserWindow instances (dashboardWindow, orbitWindow)
    - pyProcess (child_process.spawn handle)
    - dbFilePath, logFilePath (computed from app.getPath("userData"))
    - spawnAttempts[] (crash backoff guard)
  DEPENDS ON (Node built-ins / Electron):
    - electron { app, BrowserWindow, ipcMain, shell, dialog, Menu, screen }
    - path, fs, child_process.spawn, readline
  READS FROM [FS]:
    - focusModemsgs.txt (root dir, parsed for overlay messages)
    - settings JSON file (on importSettings dialog)
  WRITES TO [FS]:
    - orbit_tracker.log (via appendFileSync fallback before Python is up)
  SPAWNS:
    - src/backend/monitor.py [stdio] (dev mode: python -u ./src/backend/monitor.py)
    - dist/orbit_monitor.exe [stdio] (production: PyInstaller bundle)
  HASH ROUTING & DUAL WINDOWS:
    - dashboardWindow: 1280x800, loads URL without hash (Dashboard View)
    - orbitWindow: 280x330 translucent widget, loads URL with #orbit hash
  SENDS [IPC] to renderer (via webContents.send):
    - "tasks-list"        after task creation, update, or deletion
    - "settings-map"      after getSettings / saveSetting
    - "monitor-update"    forwarded from Python stdout
    - "focus-started"     forwarded from Python stdout
    - "focus-stopped"     forwarded from Python stdout
    - "research-complete" forwarded from Python stdout
    - "task-time-breakdown" forwarded from Python stdout
    - "analytics-data"    forwarded from Python stdout
    - "deadline-reminder" forwarded from Python stdout
    - "heartbeat"         forwarded from Python stdout
    - "monitor-status"    on Python crash/reconnect
    - "focus-messages"    after loadFocusMessages() reads .txt file
    - "settings-imported" / "settings-exported" after file dialogs
  RECEIVES [IPC] from renderer (via ipcMain.on "task-action"):
    - changeMode       -> closes active window and opens target window (dashboard vs orbit)
    - getFocusMessages -> reads focusModemsgs.txt, sends back
    - exportSettings / importSettings -> native file dialogs + file I/O
    - toggle-orbit-hover -> toggles orbitWindow alwaysOnTop state
    - everything else  -> forwarded to Python via stdin JSON line


================================================================================
  LAYER 2 — SECURITY BRIDGE
================================================================================

src/preload/preload.js
  ROLE: Context-isolated bridge. Exposes a strict whitelist API to renderer
        as window.electronAPI without exposing raw Node runtime.
  DEPENDS ON (Electron):
    - contextBridge, ipcRenderer
  EXPOSES to renderer as window.electronAPI:
    - sendTaskAction(action, payload)
        Whitelisted actions: getAllTasks, createTask, completeTask,
        deleteTask, editTask, startFocus, stopFocus, getSettings, saveSetting,
        changeMode, getResearch, exportLogs, importSettings, exportSettings,
        getFocusMessages, getAnalytics, getTaskTimeBreakdown, toggle-orbit-hover
        -> ipcRenderer.send("task-action", { action, payload })
    - onReceiveFromMain(channel, callback)
        Whitelisted channels: monitor-update, tasks-list, research-complete,
        focus-started, focus-stopped, settings-map, setting-saved,
        settings-imported, settings-exported, focus-messages, monitor-status,
        heartbeat, analytics-data, task-time-breakdown, deadline-reminder,
        orbit-hover-status
        Removes listeners before registering to prevent memory leaks.
    - writeLogEntry(level, message) -> ipcRenderer.send("write-log", ...)
    - openLogFile() -> ipcRenderer.send("open-log-file")


================================================================================
  LAYER 3 — REACT RENDERER, THEMES & COMPONENTS
================================================================================

src/renderer/main.jsx
  ROLE: React DOM entry point. Mounts <App /> into index.html #root.

src/renderer/themes.js
  ROLE: Color Theme System configuration module.
  OWNS: 6 synchronized color palettes (3 Dark: deep-teal, dark-purple, dark-orange; 3 Light: light-teal, light-purple, light-orange).

src/renderer/hooks/useTheme.js
  ROLE: Custom React hook for dynamic theme management and localStorage persistence (`orbitcore-theme-name`).

src/renderer/App.jsx
  ROLE: Root component. Owns global state, hash routing mode initialization,
        theme management hook, and tab navigation.
  STATE OWNED:
    - currentMode        "dashboard" | "orbit" (initialized via window.location.hash === "#orbit")
    - activeTab          "tasks" | "analytics" | "settings"
    - themeName          "dark-teal" | "dark-purple" | "dark-orange" | "light-teal" | "light-purple" | "light-orange"
    - taskList[]         all tasks from SQLite
    - activeTask         currently focused task object
    - settings{}         key-value map from DB settings table
    - focusMessages[]    parsed focusModemsgs.txt strings
    - isFocusActive      bool
    - monitorUpdate      last Python monitor-update payload
    - todayFocusSeconds  accumulated from monitor-update isOnTask ticks
    - analyticsData      heatmap, top tasks, streak, and focus ratio from DB
  COMPONENTS RENDERED:
    - DashboardView.jsx   (Tasks tab & detail panel)
    - OrbitView.jsx       (Ultra-minimalist 30 FPS Three.js desktop widget)
    - AnalyticsView.jsx   (30-day productivity heatmap & focus distribution)
    - SettingsView.jsx    (Theme selector, Preferences, Orbit sliders, CSV/JSON export)
    - RemindersOverlay.jsx (Side-notification motivational system)
    - FirstRunModal.jsx   (Onboarding modal on initial launch)

src/renderer/components/CollapsiblePanel.jsx
  ROLE: Reusable collapsible panel card wrapper using theme-aware surface CSS variables.

src/renderer/components/DashboardView.jsx
  ROLE: Task management view.
  FEATURES:
    - Collapsible Create Task panel (Title, Due Date, Tags, Priority, Type)
    - Active Tasks panel with search, priority filter, sort options (created, priority, dueDate)
    - Task items render deadline badges (Overdue, Due in Xh) and tag chips (#tag)
    - Task Details view: DuckDuckGo research tips and task focus time breakdown (On-Task vs Off-Task)
    - Daily Insights panel

src/renderer/components/OrbitView.jsx
  ROLE: Ultra-minimalist 30 FPS Three.js solar system desktop widget.
  FEATURES:
    - 3D Sun with multi-layer glowing aura corona shader.
    - High-priority tasks render as planets with Saturn-like planetary rings.
    - Raycasted hover tooltips displaying task title and priority badge.
    - Throttled 30 FPS render loop for minimal CPU/GPU utilization.
    - Transparent top bar with high-visibility `[← Exit Orbit]` button (`-webkit-app-region: no-drag`).

src/renderer/components/AnalyticsView.jsx
  ROLE: Productivity metrics and visual reports.
  FEATURES:
    - Focus Time Today, Completion Rate %, Current Streak KPI cards.
    - 30-Day Productivity Heatmap grid with daily focus hour tooltips.
    - Top Tasks focus time breakdown.
    - On-Task vs Off-Task Focus Time Ratio visual bar.
    - Export Logs CSV button.

src/renderer/components/SettingsView.jsx
  ROLE: System preferences, color theme selection, and Orbit widget configuration.
  FEATURES:
    - Interactive Color Themes grid with swatch previews (3 dark + 3 light palettes).
    - Orbit Sun Size, Planet Scale, and Widget Opacity sliders.
    - Hover Mode default toggle.
    - User Profile occupation setting (customizes DuckDuckGo research).
    - Export CSV focus logs button.
    - Export Settings / Import Settings JSON file dialog triggers.

src/renderer/components/RemindersOverlay.jsx
  ROLE: Motivational reminders system.
  FEATURES:
    - Reads 25 text files from `public/reminders/1.txt` ... `25.txt`.
    - Schedules notifications at random intervals (5 to 17.75 minutes) using INT8 ticks (0–255).
    - Displays WhatsApp/Windows-style alert sliding in from right side.
    - Auto-dismisses after 4 seconds with animated shrinking progress bar, or manual close.

src/renderer/components/FocusModeOverlay.jsx
  ROLE: Playful distraction alert popup when user opens unapproved applications in Focus Mode.


================================================================================
  LAYER 4 — PYTHON BACKEND & SQLITE DATABASE
================================================================================

src/backend/monitor.py
  ROLE: Background monitor subprocess.
  THREADS:
    - Main Thread: Listens to stdin for JSON actions from Electron, handles DB CRUD operations.
    - monitorFocusLoop: Runs active window check every X seconds, logs to `time_logs`, broadcasts `monitor-update`.
    - playAccountabilityBeeps: Triggers random friendly Windows beeps during focus mode.
    - deadlineReminderThread: Checks upcoming task deadlines every 45s and sends notifications/nudges.
    - performWebResearch: Asynchronous DuckDuckGo search thread.

src/backend/db.py
  ROLE: SQLite Database Wrapper with Write-Ahead Logging (WAL) enabled.
  TABLES:
    - tasks (id, title, description, priority, tags, type, interval_days, target_apps, color, deadline, is_completed, created_at)
    - time_logs (id, task_id, timestamp, duration_seconds, is_on_task, app_name, window_title)
    - web_research (id, task_id, tips, updated_at)
    - settings (key, value)
  KEY FUNCTIONS:
    - getAnalytics(connection, dayRange): Returns 30-day heatmap list, streak, task time breakdown, and on/off task totals.
    - getTaskTimeBreakdown(connection, taskId): Returns total on-task and off-task seconds for a specific task.
    - exportLogsToCSV(connection, csvFilePath): Exports full log history to CSV.
