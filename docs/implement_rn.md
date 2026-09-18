# Orbit Task Tracker - Implementation & Bug Fix Roadmap

**Last Updated:** August 13, 2026  
**Status:** Pre-Alpha (Critical bugs blocking core functionality)  
**Priority:** Fix critical DB race condition first — this unblocks everything else.

---

## Table of Contents

1. [Critical Bugs (BLOCKING)](#critical-bugs-blocking)
2. [Medium Priority Issues](#medium-priority-issues)
3. [Minor Issues](#minor-issues)
4. [Implementation Order](#implementation-order)
5. [Testing Checklist](#testing-checklist)

---

## Critical Bugs (BLOCKING)

### Bug #1: Database Race Condition — Tasks Never Persist

**Status:** BLOCKING  
**Severity:** Critical  
**Impact:** All data writes go to wrong database file; UI never sees data.

#### Root Cause

```
Timeline of events:
1. main.js app.whenReady() → spawnPythonSubprocess()
2. Python monitor.py starts, dbFilePath = "orbit_tracker.db" (working dir default)
3. main.js sends setPaths after 500ms setTimeout
4. BUT: Vite loads React in ~200-300ms
5. App.jsx mounts and fires getAllTasks BEFORE setPaths is processed
6. Python reads/writes to ./orbit_tracker.db (wrong location)
7. All CRUD operations succeed silently but hit the wrong database
8. UI receives empty taskList because the persistent AppData DB is untouched
```

#### Files Affected

- `src/main/main.js` (lines 348-351)
- `src/backend/monitor.py` (lines 46-53, handleIncomingActions)
- `src/renderer/App.jsx` (lines 93-98, useEffect on mount)

#### Solution: Option A (Quick) — Queue Commands Until Initialized

**Implementation Time:** ~30 minutes  
**Complexity:** Low  
**Risk:** Low

**Changes to `src/backend/monitor.py`:**

```python
# At module level (after line 53)
commandQueue = []
pathsInitialized = False

# In handleIncomingActions(), wrap the main loop:
def handleIncomingActions():
    global activeTask, focusActive, monitorThread, soundThread, dbFilePath, logFilePath, pathsInitialized, commandQueue
    
    writeToLog("INFO", "Listening for Electron instructions on stdin...")
    
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
            
        try:
            message = json.loads(line)
            action = message.get("action")
            payload = message.get("payload", {})
            
            # If paths not initialized yet, queue all commands except setPaths
            if not pathsInitialized and action != "setPaths":
                writeToLog("INFO", f"Queueing action {action} until paths initialized")
                commandQueue.append((action, payload))
                continue
            
            # Process setPaths first
            if action == "setPaths":
                dbFilePath = payload.get("dbPath", dbFilePath)
                logFilePath = payload.get("logPath", logFilePath)
                
                connection = db.getDatabaseConnection(dbFilePath)
                db.createTables(connection)
                
                settingsMap = db.getSettings(connection)
                try:
                    retentionDays = int(settingsMap.get("retentionDays", 90))
                except (ValueError, TypeError):
                    retentionDays = 90
                
                db.pruneOldLogs(connection, retentionDays)
                connection.close()
                
                pathsInitialized = True
                writeToLog("INFO", f"Paths initialized. DB: {dbFilePath}")
                sendToElectron("paths-initialized", {"status": "success"})
                
                # Drain the queue now that paths are set
                for queued_action, queued_payload in commandQueue:
                    writeToLog("INFO", f"Processing queued action: {queued_action}")
                    # Re-route to the handler logic below
                    _processAction(queued_action, queued_payload)
                
                commandQueue.clear()
                continue
            
            # Normal processing
            _processAction(action, payload)
            
        except Exception as error:
            writeToLog("ERROR", f"Exception handling stdin message: {str(error)}")
            traceback.print_exc(file=sys.stderr)

def _processAction(action, payload):
    """Extracted action handler logic."""
    global activeTask, focusActive, monitorThread, soundThread, dbFilePath
    
    try:
        connection = db.getDatabaseConnection(dbFilePath)
        
        if action == "getAllTasks":
            tasksList = db.getAllTasks(connection)
            sendToElectron("tasks-list", tasksList)
            
        elif action == "createTask":
            taskId = db.createNewTask(
                connection,
                title=payload.get("title"),
                description=payload.get("description", ""),
                notes=payload.get("notes", ""),
                priority=payload.get("priority", "Medium"),
                tags=payload.get("tags", "[]"),
                taskType=payload.get("taskType", "One-Time"),
                intervalDays=int(payload.get("intervalDays", 1)),
                targetApps=payload.get("targetApps", ""),
                color=payload.get("color")
            )
            
            tasksList = db.getAllTasks(connection)
            sendToElectron("tasks-list", tasksList)
            
            settingsMap = db.getSettings(connection)
            researchEnabled = settingsMap.get("researchEnabled", "true").lower() == "true"
            
            if researchEnabled:
                researchThread = threading.Thread(
                    target=performWebResearch,
                    args=(taskId, payload.get("title"), payload.get("description", "")),
                    daemon=True
                )
                researchThread.start()
        
        # ... rest of action handlers (completeTask, deleteTask, etc.)
        # Copy entire elif/else block from handleIncomingActions here
        
        connection.close()
        
    except Exception as error:
        writeToLog("ERROR", f"Exception in _processAction: {str(error)}")
        if 'connection' in locals() and connection:
            connection.close()
```

#### Solution: Option B (Cleaner) — Window Creation Gating

**Implementation Time:** ~20 minutes  
**Complexity:** Very Low  
**Risk:** Very Low  
**Recommended:** Use this approach.

**Changes to `src/main/main.js`:**

```javascript
// In app.whenReady() block (replace lines 335-351):

app.whenReady().then(() => {
  // Resolve AppData paths
  getStoragePaths();
  writeLog("INFO", "Electron app ready. Initializing...");

  // Launch background Python process
  spawnPythonSubprocess();

  // **CHANGE:** Wait for paths-initialized before showing dashboard
  ipcMain.once("paths-initialized-from-python", () => {
    writeLog("INFO", "Python backend initialized. Creating dashboard window.");
    createDashboardWindow();
  });

  // Send paths to Python (this triggers the initialization)
  setTimeout(() => {
    sendActionToPython("setPaths", { dbPath: dbFilePath, logPath: logFilePath });
  }, 200); // Reduced from 500ms - Python should be ready by now
});
```

**Also update Python to send confirmation:**

In `src/backend/monitor.py`, after `pathsInitialized = True`:

```python
sendToElectron("paths-initialized-from-python", {"status": "success"})
```

**Why Option B is better:**
- Single point of synchronization (wait for `paths-initialized` IPC event)
- No queue management needed
- Guarantees DB is initialized before any React mounts
- Clear in intent: "Don't show UI until backend is ready"

---

### Bug #2: Planets Never Render

**Status:** BLOCKING (consequence of Bug #1)  
**Severity:** Critical  
**Root Cause:** `taskList` is always `[]` on startup because `getAllTasks` reads from the wrong (empty) database.

**Fix:** Implement Bug #1 solution. Once database path is correctly set before React mounts, `getAllTasks` will return real tasks and `OrbitView.jsx` will render planets automatically.

**No additional code needed** — this is a symptom, not a separate issue.

---

### Bug #3: IPC Listener Memory Leak

**Status:** BLOCKING (non-critical but causes state chaos)  
**Severity:** High  
**Impact:** Listeners pile up; duplicate reads on every state change; expensive re-renders.

#### Root Cause

In `src/renderer/App.jsx` lines 100-104:

```javascript
// WRONG - taskList and activeTask in dependency array
useEffect(() => {
    window.electronAPI.onReceiveFromMain("tasks-list", (tasks) => { ... });
    // ... more listeners ...
}, [taskList, activeTask]); // ← These cause infinite re-registration
```

Every time `taskList` changes, the effect re-runs and re-registers ALL listeners. This causes:
1. Multiple listeners for same event
2. Callback stacking (first update fires 1 callback, second update fires 2, etc.)
3. Duplicate `getAllTasks` calls
4. State loops

#### Solution

**File:** `src/renderer/App.jsx`

**Change (lines 67-140):**

```javascript
// ===== MOUNT-ONLY LISTENERS =====
// Register all IPC listeners exactly once when component mounts
useEffect(() => {
  
  window.electronAPI.onReceiveFromMain("tasks-list", (tasks) => {
    setTaskList(tasks);
    
    // Keep active task updated if still in list
    setActiveTask(prev => {
      if (!prev) return null;
      const updated = tasks.find(t => t.id === prev.id);
      
      if (updated && updated.is_completed) {
        // Task was completed elsewhere, clear it
        return null;
      }
      return updated || null;
    });
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
    setActiveTask(prev => {
      // Get current task from component state without reading taskList
      // This is a limitation, but taskList isn't available in closure here
      // WORKAROUND: emit full task object from Python
      return data.task || prev;
    });
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

  // ===== INITIAL DATA LOAD =====
  window.electronAPI.sendTaskAction("getAllTasks");
  window.electronAPI.sendTaskAction("getSettings");
  window.electronAPI.sendTaskAction("getFocusMessages");

  // Cleanup: no listeners to remove (Electron will manage this)
  return () => {
    // Electron's removeAllListeners already happens in onReceiveFromMain
  };

}, []); // ← EMPTY dependency array: runs ONCE on mount only


// ===== SEPARATE EFFECT FOR HEARTBEAT =====
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
```

**Key Changes:**
- All listeners registered in a `useEffect([])` that runs once only
- Removed `taskList` and `activeTask` from dependency arrays
- Initial data loads happen inside the effect, not repeated
- State setters use functional form (`setActiveTask(prev => ...)`) to avoid stale closures
- Heartbeat logic isolated to its own effect

---

### Bug #4: FocusModeOverlay Message Renders as Literal Text

**Status:** BLOCKING (feature is broken)  
**Severity:** Medium  
**Impact:** User sees `{activeMessage}` instead of actual message text.

#### Root Cause

**File:** `src/renderer/components/FocusModeOverlay.jsx` line 78

```javascript
// WRONG
<p className="text-sm text-gray-300 italic px-4 leading-relaxed">
  "{activeMessage}"
</p>
```

The variable is inside a JavaScript string literal (quotes), so it prints literally.

#### Solution

```javascript
// CORRECT
<p className="text-sm text-gray-300 italic px-4 leading-relaxed">
  {`"${activeMessage}"`}
</p>
```

Or simpler:

```javascript
<p className="text-sm text-gray-300 italic px-4 leading-relaxed">
  "{activeMessage}"
</p>
```

Wait, that's the same. The issue is the JSX syntax. In JSX, string literals inside braces are `{variableName}`, not `{"variableName"}`.

**Correct version:**

```javascript
<p className="text-sm text-gray-300 italic px-4 leading-relaxed">
  "{activeMessage}"
</p>
```

Should be:

```javascript
<p className="text-sm text-gray-300 italic px-4 leading-relaxed">
  "{activeMessage}"
</p>
```

Actually, looking at the JSX:
```javascript
"{activeMessage}"  // This is a string literal containing the text "{activeMessage}"
```

The fix is:

```javascript
`"${activeMessage}"`  // Template literal that interpolates the variable
```

Or in JSX:

```jsx
<p className="...">
  {`"${activeMessage}"`}
</p>
```

---

## Medium Priority Issues

### Bug #5: Theme Toggle Is Purely Cosmetic

**Status:** Medium  
**Severity:** Low  
**Files:** `src/renderer/components/App.jsx` settings panel, `src/renderer/index.css`

**Root Cause:** Clicking dark/light mode doesn't toggle any class on the root element.

**Solution (40 minutes):**

1. Add theme state to `App.jsx`:

```javascript
const [theme, setTheme] = useState("dark");

useEffect(() => {
  // Load saved theme on mount
  const savedTheme = localStorage.getItem("orbitcore-theme") || "dark";
  setTheme(savedTheme);
  applyTheme(savedTheme);
}, []);

const applyTheme = (themeValue) => {
  document.documentElement.setAttribute("data-theme", themeValue);
  localStorage.setItem("orbitcore-theme", themeValue);
};

const toggleTheme = () => {
  const newTheme = theme === "dark" ? "light" : "dark";
  setTheme(newTheme);
  applyTheme(newTheme);
};
```

2. In settings panel, replace theme selector with:

```jsx
<div className="flex items-center justify-between border-t border-gray-800/50 pt-4">
  <div>
    <div className="font-semibold">Theme</div>
    <div className="text-xs text-gray-500">Dark mode or light mode</div>
  </div>
  <button 
    onClick={toggleTheme}
    className={`px-4 py-2 rounded-lg font-semibold text-xs transition ${
      theme === "dark" 
        ? "bg-indigo-600 text-white" 
        : "bg-yellow-500 text-gray-900"
    }`}
  >
    {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
  </button>
</div>
```

3. Add light mode CSS to `src/renderer/index.css`:

```css
@layer base {
  :root[data-theme="dark"] {
    --bg-primary: #05050A;
    --bg-secondary: #161925;
    --bg-tertiary: #1a1e2e;
    --text-primary: #F3F4F6;
    --text-secondary: #9CA3AF;
  }

  :root[data-theme="light"] {
    --bg-primary: #F9FAFB;
    --bg-secondary: #F3F4F6;
    --bg-tertiary: #E5E7EB;
    --text-primary: #111827;
    --text-secondary: #6B7280;
  }

  html, body {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }
}
```

Then update dark color references to use CSS variables.

---

### Bug #6: All Analytics Data Is Fake/Hardcoded

**Status:** Medium  
**Severity:** Medium  
**Files:** `src/renderer/components/AnalyticsView.jsx`

**Root Cause:** Chart data is generated from `Math.random()` or hardcoded values, not from SQLite time_logs.

**Real data comes from:** `time_logs` table (created in `src/backend/db.py`)

**Solution (90 minutes):**

1. Add new Python function in `src/backend/db.py`:

```python
def getAnalytics(connection, dayRange=7):
    """
    Aggregates time_logs data for analytics dashboard.
    Returns structured data for charts: heatmap, app usage, on-task ratio, etc.
    """
    cursor = connection.cursor()
    
    # 1. Get on-task vs off-task ratio for pie chart
    cursor.execute("""
        SELECT 
            SUM(CASE WHEN is_on_task = 1 THEN duration_seconds ELSE 0 END) as on_task_seconds,
            SUM(CASE WHEN is_on_task = 0 THEN duration_seconds ELSE 0 END) as off_task_seconds
        FROM time_logs
        WHERE timestamp > datetime('now', ?)
    """, (f"-{dayRange} days",))
    
    ratioRow = cursor.fetchone()
    onTaskSeconds = ratioRow["on_task_seconds"] or 0
    offTaskSeconds = ratioRow["off_task_seconds"] or 0
    
    # 2. Get time per task (bar chart)
    cursor.execute("""
        SELECT 
            t.title,
            SUM(l.duration_seconds) as total_seconds
        FROM time_logs l
        JOIN tasks t ON l.task_id = t.id
        WHERE l.timestamp > datetime('now', ?)
        GROUP BY l.task_id
        ORDER BY total_seconds DESC
        LIMIT 5
    """, (f"-{dayRange} days",))
    
    taskTimeRows = cursor.fetchall()
    taskTimeData = [
        {
            "title": row["title"][:20],
            "hours": round(row["total_seconds"] / 3600, 1)
        }
        for row in taskTimeRows
    ]
    
    # 3. Get productivity streak (consecutive days with >1 hour focus)
    cursor.execute("""
        SELECT DISTINCT DATE(timestamp) as work_date
        FROM time_logs
        WHERE is_on_task = 1
        GROUP BY DATE(timestamp)
        HAVING SUM(duration_seconds) > 3600
        ORDER BY work_date DESC
    """)
    
    productiveDays = [row["work_date"] for row in cursor.fetchall()]
    streak = 0
    if productiveDays:
        from datetime import datetime as dt, timedelta
        today = dt.now().date()
        for i, day_str in enumerate(productiveDays):
            day_date = dt.strptime(day_str, "%Y-%m-%d").date()
            expected_date = today - timedelta(days=i)
            if day_date == expected_date:
                streak += 1
            else:
                break
    
    # 4. Get heatmap data (hours worked per day of week)
    cursor.execute("""
        SELECT 
            CAST(strftime('%w', timestamp) AS INTEGER) as day_of_week,
            SUM(duration_seconds) / 3600.0 as hours_worked
        FROM time_logs
        WHERE is_on_task = 1
        GROUP BY day_of_week
    """)
    
    heatmapRows = cursor.fetchall()
    dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    heatmapData = {dayNames[row["day_of_week"]]: row["hours_worked"] for row in heatmapRows}
    
    return {
        "onTaskSeconds": onTaskSeconds,
        "offTaskSeconds": offTaskSeconds,
        "taskTimeData": taskTimeData,
        "streak": streak,
        "heatmapData": heatmapData
    }
```

2. Expose this via IPC in `src/backend/monitor.py`:

```python
elif action == "getAnalytics":
    dayRange = int(payload.get("dayRange", 7))
    analytics = db.getAnalytics(connection, dayRange)
    sendToElectron("analytics-data", analytics)
```

3. Update `src/renderer/App.jsx` to request analytics:

```javascript
window.electronAPI.onReceiveFromMain("analytics-data", (data) => {
  setAnalyticsData(data); // Add new state for this
});

// On mount:
window.electronAPI.sendTaskAction("getAnalytics", { dayRange: 7 });
```

4. Rewrite `src/renderer/components/AnalyticsView.jsx` to use real data:

```javascript
export default function AnalyticsView({ taskList, analyticsData, todayFocusSeconds, triggerToast }) {
  
  const onTaskMinutes = analyticsData ? Math.floor(analyticsData.onTaskSeconds / 60) : 0;
  const offTaskMinutes = analyticsData ? Math.floor(analyticsData.offTaskSeconds / 60) : 0;
  const streak = analyticsData?.streak || 0;
  
  const pieChartData = {
    labels: ["Focused", "Distracted"],
    datasets: [{
      data: [onTaskMinutes, offTaskMinutes],
      backgroundColor: [
        "rgba(16, 185, 129, 0.75)",
        "rgba(239, 68, 68, 0.75)"
      ],
      // ... rest of config
    }]
  };
  
  const barChartLabels = analyticsData?.taskTimeData.map(t => t.title) || [];
  const barChartValues = analyticsData?.taskTimeData.map(t => t.hours) || [];
  
  // ... use real data in render
}
```

---

### Bug #7: Daily Insights Widget Is Hardcoded

**Status:** Medium  
**Severity:** Low  
**Files:** `src/renderer/components/DashboardView.jsx` (if it exists; otherwise part of AnalyticsView)

**Root Cause:** Widget shows static text like "Peak Focus Time 10:00-12:30" regardless of actual data.

**Solution:** Use same analytics data from Bug #6. Compute:
- Peak focus hour: query `time_logs` group by `HOUR(timestamp)`, sort by sum duration
- Distractions count: count of time_logs where `is_on_task = 0`
- Most worked-on task: task with highest total seconds in last 24 hours

Example:

```python
def getDailyInsights(connection):
    cursor = connection.cursor()
    
    # Peak focus hour
    cursor.execute("""
        SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour
        FROM time_logs
        WHERE is_on_task = 1 AND DATE(timestamp) = DATE('now')
        GROUP BY hour
        ORDER BY COUNT(*) DESC
        LIMIT 1
    """)
    peakHourRow = cursor.fetchone()
    peakHour = peakHourRow["hour"] if peakHourRow else None
    
    # Top task today
    cursor.execute("""
        SELECT t.title, SUM(l.duration_seconds) as total_seconds
        FROM time_logs l
        JOIN tasks t ON l.task_id = t.id
        WHERE DATE(l.timestamp) = DATE('now')
        GROUP BY l.task_id
        ORDER BY total_seconds DESC
        LIMIT 1
    """)
    topTaskRow = cursor.fetchone()
    topTask = topTaskRow["title"] if topTaskRow else "None"
    
    # Distraction count
    cursor.execute("""
        SELECT COUNT(*) as distraction_count
        FROM time_logs
        WHERE is_on_task = 0 AND DATE(timestamp) = DATE('now')
    """)
    distractionRow = cursor.fetchone()
    distractionCount = distractionRow["distraction_count"] or 0
    
    return {
        "peakHour": peakHour,
        "topTask": topTask,
        "distractionCount": distractionCount
    }
```

---

## Minor Issues

### Bug #8: getSettings() Called Every 3s Monitor Tick

**Status:** Minor  
**Severity:** Low  
**Files:** `src/backend/monitor.py` lines ~180-190

**Root Cause:** `monitorFocusLoop()` calls `db.getSettings(connection)` on every iteration (every 3 seconds), opening a new DB connection each time. Wasteful.

**Solution (15 minutes):**

Read settings once at focus start, update only when `saveSetting` is called:

```python
# Global settings cache
focusSessionSettings = {}

def startFocus(taskId, taskDetails, settings):
    """Captures settings at focus start, uses cached copy in loop."""
    global focusSessionSettings
    focusSessionSettings = settings  # Cache the settings
    # ... rest of focus start logic

def monitorFocusLoop():
    """Uses cached settings instead of reading DB every tick."""
    global activeTask, focusActive, focusSessionSettings
    
    while focusActive and activeTask:
        try:
            # Use cached settings, not DB read
            checkInterval = float(focusSessionSettings.get("checkInterval", 3.0))
            if checkInterval < 1.0 or checkInterval > 10.0:
                checkInterval = 3.0
            
            # Rest of loop logic
            appName, windowTitle = getActiveWindowDetails()
            # ...
            
            time.sleep(checkInterval)
        except Exception as error:
            # ...
            pass
```

In `handleIncomingActions()` when processing `startFocus`:

```python
elif action == "startFocus":
    taskId = int(payload.get("taskId"))
    tasks = db.getAllTasks(connection)
    targetTask = next((t for t in tasks if t["id"] == taskId), None)
    
    if targetTask:
        focusActive = False
        time.sleep(0.5)
        
        activeTask = targetTask
        focusActive = True
        
        # Read settings once and pass to focus start
        settings = db.getSettings(connection)
        
        monitorThread = threading.Thread(
            target=monitorFocusLoop, 
            daemon=True
        )
        monitorThread.start()
        
        # ... rest
```

---

### Bug #9: Mode Switching Hides Windows Instead of Closing Them

**Status:** Minor  
**Severity:** Medium (affects perceived performance)  
**Files:** `src/main/main.js` lines 375-405 (`handleModeTransition`)

**Root Cause:** `.hide()` keeps renderer process alive; RAM doesn't drop when switching to Orbit Mode.

**Solution (30 minutes):**

Close the old window instead of hiding it:

```javascript
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
        orbitWindow.maximize(); // Use full screen
      } else {
        orbitWindow.show();
      }
      
    } else if (targetMode === "dashboard") {
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
  }
  // ... rest of handlers
});
```

Also update window sizes:

```javascript
function createDashboardWindow() {
  dashboardWindow = new BrowserWindow({
    width: 1280,  // Changed from 1100
    height: 800,  // Changed from 750
    minWidth: 900,
    minHeight: 600,
    title: "Orbit Task Tracker",
    // ... rest
  });
}

function createOrbitWindow() {
  orbitWindow = new BrowserWindow({
    // No explicit width/height - will maximize
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      // ...
    }
  });
  
  // Add this after loadURL/loadFile:
  orbitWindow.maximize();
}
```

---

### Bug #10: External Stardust Texture Fails Offline

**Status:** Minor  
**Severity:** Low  
**Files:** `src/renderer/components/OrbitView.jsx` (implied; stardust texture setup)

**Root Cause:** Space background loads texture from external CDN (transparenttextures.com); fails without internet.

**Solution (45 minutes):**

Replace external texture with Three.js procedural stars:

```javascript
// In OrbitView.jsx useEffect, replace texture loader with:

// Create stars procedurally instead of loading external texture
const createStarfield = (scene) => {
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xFFFFFF,
    size: 0.15,
    sizeAttenuation: true
  });

  const starsVertices = [];
  for (let i = 0; i < 2000; i++) {
    const x = (Math.random() - 0.5) * 200;
    const y = (Math.random() - 0.5) * 200;
    const z = (Math.random() - 0.5) * 200;
    starsVertices.push(x, y, z);
  }

  starsGeometry.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array(starsVertices), 3
  ));

  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);
  return stars;
};

// In the setup block (after scene creation):
createStarfield(scene);
```

No external dependency, works offline, looks better.

---

## Implementation Order

### Phase 1: Fix Critical Blocking Issues (Day 1)

**Estimated Time:** 3-4 hours

1. **Fix Bug #1 (Database Race Condition) — Option B** [20 min]
   - Gate window creation on `paths-initialized` event
   - Test: Run app, verify tasks persist and load on startup
   
2. **Fix Bug #3 (IPC Listener Leak)** [30 min]
   - Refactor App.jsx useEffect, remove dependency array items
   - Test: Check browser DevTools, verify no duplicate listeners pile up
   
3. **Fix Bug #4 (Message Render Bug)** [5 min]
   - Fix JSX interpolation in FocusModeOverlay.jsx
   - Test: Trigger focus mode, see actual message
   
4. **Verify Bug #2 is Fixed** [5 min]
   - Planets should now render
   - Test: Create 3-5 tasks in dashboard, switch to Orbit Mode, see planets

**Verification Checklist:**
- [ ] Create task → it persists after app restart
- [ ] Orbit Mode shows planets matching task count
- [ ] No listener warnings in console
- [ ] Focus mode shows readable message (not literal `{activeMessage}`)

---

### Phase 2: Fix Medium Priority Issues (Day 2)

**Estimated Time:** 3-4 hours

5. **Implement Real Analytics (Bug #6)** [90 min]
   - Add `getAnalytics()` to db.py
   - Wire IPC and update AnalyticsView.jsx
   - Test: Create tasks, log time, verify charts show real data
   
6. **Add Theme Toggle (Bug #5)** [40 min]
   - Add theme state and CSS variables
   - Test: Toggle dark/light, styles update
   
7. **Window Sizing & Closing (Bug #9)** [30 min]
   - Update window sizes, close instead of hide
   - Test: Switch modes, observe RAM drop in Task Manager

**Verification Checklist:**
- [ ] Analytics page shows real on-task/off-task ratio
- [ ] Theme toggle works both ways
- [ ] RAM drops ~100-150MB when switching from Dashboard to Orbit
- [ ] Window positions/sizes feel intentional

---

### Phase 3: Fix Minor Issues (Day 3)

**Estimated Time:** 2-3 hours

8. **Optimize Monitor Loop (Bug #8)** [15 min]
   - Cache settings at focus start
   - Test: Monitor no longer opens DB connection per tick
   
9. **Replace External Stardust (Bug #10)** [45 min]
   - Add procedural starfield
   - Test: Orbit Mode works offline
   
10. **Add Daily Insights (Bug #7)** [30 min]
    - Query peak hour, top task, distraction count
    - Display in appropriate UI component

**Verification Checklist:**
- [ ] App works offline (no external CDN calls)
- [ ] Daily insights widget shows real data
- [ ] Python monitor uses less CPU (fewer DB opens)

---

### Phase 4: Polish (Day 4)

11. **Implement Task Editing** [60 min]
    - Add edit button to task detail popup
    - Allow title, priority, target apps, color updates
    
12. **Implement Data Export** [45 min]
    - CSV export works and shows real time_logs
    - Settings export/import tested
    
13. **Performance Testing** [30 min]
    - Profile with DevTools
    - Monitor.py CPU usage over 1 hour
    - Memory stability check

14. **Production Build** [45 min]
    - PyInstaller binary for monitor.py
    - Electron Builder .exe installer
    - Test installer on clean Windows VM

---

## Testing Checklist

### Functional Testing

- [ ] **Task CRUD**
  - Create one-time, daily, recurring tasks
  - Edit task details (title, priority, color)
  - Complete/delete tasks
  - Tasks persist after app restart

- [ ] **Database**
  - Tasks stored in AppData/orbitcore/orbit_tracker.db
  - No empty database files in working directory
  - Data loads correctly on app start

- [ ] **Orbit Mode**
  - Planets render for each active task
  - Planet color matches task color
  - Clicking planet shows task details
  - Planet animation is smooth (30 FPS)
  - Offline functionality works (no external assets loaded)

- [ ] **Focus Mode**
  - Start focus session shows alert overlay when off-task
  - Message is readable (not literal `{activeMessage}`)
  - Approved apps list respected
  - Stop focus ends monitoring

- [ ] **Analytics**
  - Charts display real data from time_logs
  - On-task / off-task ratio accurate
  - Task time breakdown correct
  - Productivity streak calculated correctly

- [ ] **Settings**
  - Dark/light theme toggle works
  - Settings persist after restart
  - Export/import JSON works
  - CSV export shows real time logs

- [ ] **Mode Switching**
  - Dashboard ↔ Orbit transitions are smooth
  - Window sizes feel intentional and distinct
  - RAM drops when switching from Dashboard to Orbit
  - Window positions persist across restarts

### Performance Testing

- [ ] **Memory Usage**
  - Dashboard idle: <150 MB
  - Orbit Mode idle: <100 MB
  - No growth over 1 hour (no leaks)

- [ ] **CPU Usage**
  - Monitor.py idle: <1% CPU
  - Orbit rendering: <5% CPU
  - Focus loop: <2% CPU

- [ ] **Responsiveness**
  - UI reacts to input <100ms
  - Task creation <500ms
  - Mode switching <1s

### Edge Cases

- [ ] No tasks → Orbit Mode shows empty sun only
- [ ] Many tasks (100+) → Still smooth at 30 FPS
- [ ] Long task titles → Truncate in UI, full text in detail view
- [ ] Special characters in task titles → Escaped properly in JSON
- [ ] Focus mode on task with no approved apps → Treat as advisory (warn but allow all)
- [ ] App killed/crashed → Restart gracefully, no corruption

---

## File-by-File Implementation Summary

| File | Issue | Fix | Time |
|------|-------|-----|------|
| `src/main/main.js` | Race condition, mode switching | Gate window creation, close windows | 30 min |
| `src/backend/monitor.py` | Race condition, excessive DB reads | Queue commands, cache settings | 25 min |
| `src/renderer/App.jsx` | Listener leak, stale closures | Refactor useEffect, fix deps | 30 min |
| `src/renderer/components/FocusModeOverlay.jsx` | Message render bug | Fix JSX interpolation | 5 min |
| `src/backend/db.py` | No analytics data | Add getAnalytics() function | 45 min |
| `src/renderer/components/AnalyticsView.jsx` | Hardcoded fake data | Wire real data, update charts | 45 min |
| `src/renderer/index.css` | No theme switching | Add CSS variables, light mode | 30 min |
| `src/renderer/components/OrbitView.jsx` | External texture fails offline | Procedural starfield | 45 min |

**Total Estimated Time:** 14-16 hours (2 days solid work, or 4 days at 4 hours/day)

---

## Notes for Raeyyan

- **Priority is clear:** Bug #1 blocks everything. Fix that first, then #3, then #4. Once those three are done, the app becomes actually usable.
- **Option B for the race condition is the cleaner approach.** It's ~5 lines of code and makes the intent explicit: "Don't show UI until backend is ready."
- **The listener leak in App.jsx is subtle but important.** It's not breaking things yet, but as the app grows, it will cause memory leaks and weird state bugs. Fix it now while you're refactoring.
- **Analytics data should come from actual time_logs queries.** Don't ever hardcode this again. Write the SQL queries once and you're done.
- **No AI on the next refactor.** You have the architecture, the issues, and the solutions mapped out. You should be able to implement most of this yourself using these guides. The code snippets are templates — adjust them to match your actual implementation details.

