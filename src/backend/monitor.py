# src/backend/monitor.py
# Core subprocess monitor for Orbit Task Tracker
# Coordinates active window checking, DDG web research, audio beeps, and stdio communication.

import os
import sys

# Ensure the backend directory is in the python path to allow importing local modules like 'db'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import json
import time
import random
import threading
import traceback
from datetime import datetime

# Import database module from parent directory relative path
# pyrefly: ignore [missing-import]
import db

# Fallback declarations for Windows API components in case libraries aren't installed yet
win32Installed = False
try:
    import win32gui
    import win32process
    import psutil
    import winsound
    win32Installed = True
except ImportError:
    pass

# Try importing DuckDuckGo search with standard fallback if offline
ddgInstalled = False
try:
    from duckduckgo_search import DDGS
    ddgInstalled = True
except ImportError:
    pass

# Global execution and cached settings variables
activeTask = None
focusActive = False
monitorThread = None
soundThread = None
dbFilePath = "orbit_tracker.db"
logFilePath = "orbit_tracker.log"

# Cached settings to avoid disk I/O on every monitoring tick
cachedCheckInterval = 3.0
cachedFocusModeType = "advisory"  # "advisory" (soft alert) or "hard_block" (active focus lock)
cachedResearchEnabled = True


def sanitizeWindowTitle(title):
    """
    Sanitizes active window titles:
    - Strips non-printable / control characters.
    - Removes web query strings (?q=, ?v=) to safeguard user privacy.
    - Safely truncates to 60 characters before logging or database persistence.
    """
    if not title:
        return ""
    # Filter printable characters
    cleaned = "".join(ch for ch in title if ch.isprintable())
    # Strip URL parameters
    if "?" in cleaned:
        cleaned = cleaned.split("?")[0]
    return cleaned.strip()[:60]


def writeToLog(level, message):
    """
    Appends trace events to the local application log file.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logLine = f"[{timestamp}] [{level}] [Python.Monitor] {message}\n"
    
    try:
        with open(logFilePath, "a", encoding="utf-8") as logFile:
            logFile.write(logLine)
    except Exception:
        pass


def sendToElectron(channel, data):
    """
    Writes structured JSON messages directly to standard output (sys.stdout).
    We flush output immediately to prevent stream buffering delays in Electron.
    """
    payload = {
        "channel": channel,
        "data": data
    }
    
    sys.stdout.write(json.dumps(payload) + "\n")
    sys.stdout.flush()


def getActiveWindowDetails():
    """
    Resolves the process name and window title of the foreground application on Windows.
    Returns (None, None) if APIs are missing or focus is lost.
    """
    if not win32Installed:
        return "mock_app.exe", "Mock Window Title"
        
    try:
        # 1. Fetch handle of the active foreground window
        windowHandle = win32gui.GetForegroundWindow()
        if not windowHandle:
            return None, None
            
        # 2. Resolve the Process ID (PID) from the window thread
        _, processId = win32process.GetWindowThreadProcessId(windowHandle)
        
        # 3. Fetch process metadata using psutil
        process = psutil.Process(processId)
        processName = process.name().lower()
        windowTitle = win32gui.GetWindowText(windowHandle)
        
        return processName, sanitizeWindowTitle(windowTitle)
    except Exception as error:
        writeToLog("WARNING", f"Failed to retrieve active window: {str(error)}")
        return None, None


def performWebResearch(taskId, taskTitle, taskDescription=""):
    """
    Asynchronously queries DuckDuckGo for general advice on the task.
    Enhances search queries using user profile context (occupation) from SQLite settings.
    Saves a formatted JSON structure (summary, actionableTips[], bestPractices[], commonMistake) to database.
    """
    writeToLog("INFO", f"Triggering web research for task: '{taskTitle}'")
    
    # 1. Construct search terms with user occupation context if available
    userOccupation = ""
    try:
        conn = db.getDatabaseConnection(dbFilePath)
        settingsMap = db.getSettings(conn)
        conn.close()
        userOccupation = settingsMap.get("userOccupation", "")
    except Exception as e:
        writeToLog("WARNING", f"Could not read userOccupation for research: {str(e)}")

    searchQuery = f"how to {taskTitle}"
    if userOccupation:
        occLower = userOccupation.lower().strip()
        if occLower == "student":
            searchQuery += " study tips for students"
        elif occLower == "professional":
            searchQuery += " best practices for professionals"
        elif occLower == "freelancer":
            searchQuery += " workflow for freelancers"
        else:
            searchQuery += f" for {userOccupation}"

    if taskDescription:
        searchQuery += f" {taskDescription}"

    # Default fallback tips structure
    tipsResult = {
        "summary": f"Tips and best practices for completing '{taskTitle}'.",
        "actionableTips": [
            "Break the goal down into 15-minute sub-tasks.",
            "Minimize phone alerts and desktop distractions before starting.",
            "Set a clear definition of done for this session."
        ],
        "bestPractices": [
            "Use active recall or focused coding/work sprints.",
            "Take 5-minute physical breaks between deep focus blocks."
        ],
        "commonMistake": "Overestimating progress during the first hour and losing momentum."
    }

    # 2. Try fetching from DuckDuckGo if network and package are available
    if ddgInstalled:
        try:
            searchResults = []
            try:
                # DuckDuckGo Search v4+ syntax (no context manager)
                ddgs = DDGS()
                searchResults = list(ddgs.text(searchQuery, max_results=3))
            except Exception:
                try:
                    # Fallback to v3 syntax if older package is installed
                    with DDGS() as ddgs:
                        searchResults = list(ddgs.text(searchQuery, max_results=3))
                except Exception as innerErr:
                    writeToLog("WARNING", f"DuckDuckGo search execution error: {str(innerErr)}")
            
            if searchResults:
                writeToLog("INFO", f"DuckDuckGo search successful for: '{taskTitle}' ({len(searchResults)} results)")
                snippets = [r.get("body", "").strip() for r in searchResults if r.get("body")]
                titles = [r.get("title", "").strip() for r in searchResults if r.get("title")]

                if snippets:
                    tipsResult["summary"] = f"DuckDuckGo Insights: {snippets[0][:180]}..."
                    
                    actionable = []
                    for snip in snippets[:3]:
                        clean_snip = snip.replace("\n", " ")
                        if len(clean_snip) > 120:
                            clean_snip = clean_snip[:117] + "..."
                        actionable.append(clean_snip)
                    
                    if actionable:
                        tipsResult["actionableTips"] = actionable

                    if len(snippets) > 1:
                        tipsResult["bestPractices"] = [
                            f"Key focus: {titles[1]}" if len(titles) > 1 else snippets[1][:100],
                            snippets[1][:110] + "..."
                        ]
                    if len(snippets) > 2:
                        tipsResult["commonMistake"] = f"Watch out for: {snippets[2][:130]}..."
        except Exception as error:
            writeToLog("WARNING", f"DuckDuckGo search failed or offline: {str(error)}")
    else:
        writeToLog("INFO", "duckduckgo_search library not installed. Using fallback research tips.")

    # 3. Cache the research tips to SQLite & broadcast
    try:
        connection = db.getDatabaseConnection(dbFilePath)
        db.saveWebResearch(connection, taskId, tipsResult)
        connection.close()
        
        # Send confirmation update back to React
        sendToElectron("research-complete", {"taskId": taskId, "tips": tipsResult})
        writeToLog("INFO", f"Research complete and broadcast for taskId: {taskId}")
    except Exception as error:
        writeToLog("ERROR", f"Failed to save research results to SQLite: {str(error)}")


def playAccountabilityBeeps():
    """
    Background loop that triggers random, friendly warning beeps on Windows.
    Beeps occur at random intervals between 12 and 30 minutes during focus mode.
    """
    global focusActive
    
    writeToLog("INFO", "Accountability beep loop started.")
    
    while focusActive:
        # Sleep for a random interval between 12 and 30 minutes (720 to 1800 seconds)
        sleepSeconds = random.randint(720, 1800)
        
        # Break sleep into short ticks to check if focus session got deactivated
        for _ in range(sleepSeconds):
            if not focusActive:
                return
            time.sleep(1)
            
        if focusActive and win32Installed:
            try:
                writeToLog("INFO", "Triggering random accountability reminder beep.")
                # Play a short, gentle beep (800Hz for 200ms)
                winsound.Beep(800, 200)
            except Exception as error:
                writeToLog("WARNING", f"Beep playback failed: {str(error)}")


def monitorFocusLoop():
    """
    Evaluates foreground application process name and window title at intervals.
    Logs focus sessions, checks target apps lists, and sends updates to Electron.
    Uses in-memory cached settings and batched explicit SQLite transactions to minimize disk I/O.
    """
    global activeTask, focusActive, dbFilePath, cachedCheckInterval, cachedFocusModeType
    
    writeToLog("INFO", "Foreground application monitoring thread started.")
    
    batchLogs = []
    lastBatchTime = time.time()
    batchInterval = 15.0
    
    # Run loop while focus mode is active and there is a target active task
    while focusActive and activeTask:
        try:
            # Use dynamically updated cached interval (clamped safely between 1.0 and 10.0s)
            checkInterval = max(1.0, min(10.0, float(cachedCheckInterval)))
            
            # Fetch active foreground process details
            appName, windowTitle = getActiveWindowDetails()
            
            # Process focus check if process name is retrieved successfully
            if appName:
                # Resolve approved process names as lower-cased list
                targetApps = [app.strip().lower() for app in activeTask.get("target_apps", "").split(",") if app.strip()]
                
                # Verify if active process is whitelisted (default to 1 if no target apps set)
                isOnTask = 1 if (not targetApps or appName in targetApps) else 0
                
                # Append to batch
                batchLogs.append({
                    "task_id": activeTask["id"],
                    "duration_seconds": int(checkInterval),
                    "is_on_task": isOnTask,
                    "app_name": appName,
                    "window_title": windowTitle
                })
                
                currentTime = time.time()
                # Batch write when either 5 entries are reached or batchInterval has elapsed
                if len(batchLogs) >= 5 or (currentTime - lastBatchTime >= batchInterval):
                    try:
                        conn = db.getDatabaseConnection(dbFilePath)
                        db.logTimeSpentBatch(conn, batchLogs)
                        conn.close()
                        batchLogs.clear()
                        lastBatchTime = currentTime
                    except Exception as dbErr:
                        writeToLog("ERROR", f"Error in batch logging transaction: {str(dbErr)}")

                # Check for Hard Block Mode vs Advisory Mode when off-task
                if isOnTask == 0:
                    sendToElectron("focus-intervention", {
                        "mode": cachedFocusModeType,
                        "appName": appName,
                        "windowTitle": windowTitle,
                        "taskId": activeTask["id"],
                        "taskTitle": activeTask.get("title", "")
                    })
                
                # Build status update payload to send to Electron renderer
                updatePayload = {
                    "taskId": activeTask["id"],
                    "appName": appName,
                    "windowTitle": windowTitle,
                    "isOnTask": isOnTask == 1,
                    "interval": int(checkInterval),
                    "focusModeType": cachedFocusModeType
                }
                
                # Send the focus update payload via stdout stream
                sendToElectron("monitor-update", updatePayload)
            
        except Exception as error:
            writeToLog("ERROR", f"Exception in window monitor loop: {str(error)}")
            checkInterval = 3.0
            
        # Dynamic sleep throttling using checkInterval setting
        time.sleep(checkInterval)

    # When focus mode ends, flush any remaining logs
    if batchLogs:
        try:
            conn = db.getDatabaseConnection(dbFilePath)
            db.logTimeSpentBatch(conn, batchLogs)
            conn.close()
            batchLogs.clear()
        except Exception as error:
            writeToLog("ERROR", f"Exception flushing batch logs: {str(error)}")


def heartbeatThread():
    """
    Background daemon thread that emits a heartbeat event to Electron every 5 seconds.
    Transmits health metrics, active focus status, and cached intervals.
    """
    while True:
        try:
            sendToElectron("heartbeat", {
                "status": "alive",
                "timestamp": time.time(),
                "focusActive": focusActive,
                "activeTaskId": activeTask["id"] if activeTask else None,
                "checkInterval": cachedCheckInterval,
                "focusModeType": cachedFocusModeType
            })
        except Exception:
            pass
        time.sleep(5)


# Whitelist of acceptable action commands from Electron
ALLOWED_ACTIONS = {
    "setPaths", "getAllTasks", "createTask", "editTask", "completeTask", "deleteTask",
    "batchCompleteTasks", "batchDeleteTasks", "startFocus", "stopFocus", "saveSetting",
    "getSettings", "getAnalytics", "getResearch", "getTaskTimeBreakdown", "exportLogs",
    "exportSettingsFile", "logEntry"
}


def handleIncomingActions():
    """
    Continuously listens for JSON instructions on standard input (sys.stdin).
    Enforces strict schema validation on incoming commands and coordinates DB transactions.
    """
    global activeTask, focusActive, monitorThread, soundThread, dbFilePath, logFilePath
    global cachedCheckInterval, cachedFocusModeType, cachedResearchEnabled
    
    # Reconfigure streams to unbuffered UTF-8 to prevent Windows IPC buffering locks
    if hasattr(sys.stdin, 'reconfigure'):
        sys.stdin.reconfigure(encoding='utf-8')
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    writeToLog("INFO", "Listening for Electron instructions on stdin...")
    
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
            
        try:
            # Parse command line JSON string
            message = json.loads(line)
            
            # 1. Schema Validation
            if not isinstance(message, dict):
                writeToLog("WARNING", "Dropped malformed non-object JSON payload.")
                continue
                
            action = message.get("action")
            payload = message.get("payload", {})
            
            if not isinstance(action, str) or action not in ALLOWED_ACTIONS:
                writeToLog("WARNING", f"Blocked unauthorized or unknown action: {action}")
                continue
                
            if not isinstance(payload, dict):
                writeToLog("WARNING", f"Malformed payload for action '{action}'; resetting to empty dict.")
                payload = {}
            
            writeToLog("INFO", f"Received validated action: {action}")
            
            if action == "setPaths":
                dbFilePath = payload.get("dbPath", dbFilePath)
                logFilePath = payload.get("logPath", logFilePath)
                writeToLog("INFO", f"Paths updated — DB: {dbFilePath}, Log: {logFilePath}")
            
            # Open database connection
            connection = db.getDatabaseConnection(dbFilePath)
            
            if action == "setPaths":
                try:
                    db.createTables(connection)
                    
                    # Read initial settings to prime in-memory cached variables
                    settingsMap = db.getSettings(connection)
                    try:
                        retentionDays = int(settingsMap.get("retentionDays", 90))
                    except (ValueError, TypeError):
                        retentionDays = 90
                        
                    try:
                        cachedCheckInterval = float(settingsMap.get("checkInterval", 3.0))
                    except (ValueError, TypeError):
                        cachedCheckInterval = 3.0
                        
                    cachedFocusModeType = settingsMap.get("focusModeType", "advisory")
                    cachedResearchEnabled = settingsMap.get("researchEnabled", "true").lower() == "true"
                    
                    # Delete logs exceeding threshold
                    db.pruneOldLogs(connection, retentionDays)
                    
                    writeToLog("INFO", f"Database initialized. Retention: {retentionDays}d, Interval: {cachedCheckInterval}s")
                    sendToElectron("paths-initialized", {"status": "success"})
                    sendToElectron("paths-initialized-from-python", {"status": "success"})
                except Exception as error:
                    writeToLog("ERROR", f"Failed to initialize database: {str(error)}")
                    sendToElectron("paths-initialized", {"status": "error", "error": str(error)})
                
            elif action == "getAllTasks":
                tasksList = db.getAllTasks(connection)
                sendToElectron("tasks-list", tasksList)
                
            elif action == "createTask":
                try:
                    rawTitle = payload.get("title", "")
                    if not rawTitle or not rawTitle.strip():
                        writeToLog("WARNING", "createTask rejected: empty title.")
                        continue
                        
                    writeToLog("INFO", f"Creating task: {rawTitle.strip()}")
                    taskId = db.createNewTask(
                        connection,
                        title=rawTitle.strip(),
                        description=payload.get("description", ""),
                        notes=payload.get("notes", ""),
                        priority=payload.get("priority", "Medium"),
                        tags=payload.get("tags", "[]"),
                        taskType=payload.get("taskType", "One-Time"),
                        intervalDays=int(payload.get("intervalDays", 1)),
                        targetApps=payload.get("targetApps", ""),
                        color=payload.get("color"),
                        deadline=payload.get("deadline")
                    )
                    
                    # Send updated task list
                    tasksList = db.getAllTasks(connection)
                    sendToElectron("tasks-list", tasksList)
                    
                    # Trigger async web research thread only if enabled
                    if cachedResearchEnabled:
                        researchThread = threading.Thread(
                            target=performWebResearch,
                            args=(taskId, rawTitle.strip(), payload.get("description", "")),
                            daemon=True
                        )
                        researchThread.start()
                except Exception as createError:
                    writeToLog("ERROR", f"Failed to create task: {str(createError)}")
                
            elif action == "completeTask":
                taskId = int(payload.get("taskId"))
                completedAt = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                db.updateTask(connection, taskId, is_completed=1, completed_at=completedAt)
                
                if activeTask and activeTask["id"] == taskId:
                    focusActive = False
                    activeTask = None
                    sendToElectron("focus-stopped", {"status": "success"})
                    
                tasksList = db.getAllTasks(connection)
                sendToElectron("tasks-list", tasksList)
                
            elif action == "batchCompleteTasks":
                taskIds = payload.get("taskIds", [])
                if taskIds:
                    db.batchCompleteTasks(connection, taskIds)
                    if activeTask and activeTask["id"] in [int(tid) for tid in taskIds]:
                        focusActive = False
                        activeTask = None
                        sendToElectron("focus-stopped", {"status": "success"})
                    tasksList = db.getAllTasks(connection)
                    sendToElectron("tasks-list", tasksList)
                    
            elif action == "batchDeleteTasks":
                taskIds = payload.get("taskIds", [])
                if taskIds:
                    db.batchDeleteTasks(connection, taskIds)
                    if activeTask and activeTask["id"] in [int(tid) for tid in taskIds]:
                        focusActive = False
                        activeTask = None
                        sendToElectron("focus-stopped", {"status": "success"})
                    tasksList = db.getAllTasks(connection)
                    sendToElectron("tasks-list", tasksList)

            elif action == "editTask":
                taskId = int(payload.get("taskId"))
                updates = payload.get("updates", {})
                if updates:
                    db.updateTask(connection, taskId, **updates)
                    
                if activeTask and activeTask["id"] == taskId:
                    tasks = db.getAllTasks(connection)
                    activeTask = next((t for t in tasks if t["id"] == taskId), None)
                    
                tasksList = db.getAllTasks(connection)
                sendToElectron("tasks-list", tasksList)
                
            elif action == "deleteTask":
                taskId = int(payload.get("taskId"))
                db.deleteTask(connection, taskId)
                
                if activeTask and activeTask["id"] == taskId:
                    focusActive = False
                    activeTask = None
                    sendToElectron("focus-stopped", {"status": "success"})
                    
                tasksList = db.getAllTasks(connection)
                sendToElectron("tasks-list", tasksList)
                
            elif action == "startFocus":
                taskId = int(payload.get("taskId"))
                tasks = db.getAllTasks(connection)
                targetTask = next((t for t in tasks if t["id"] == taskId), None)
                
                if targetTask:
                    focusActive = False
                    time.sleep(0.3)
                    
                    activeTask = targetTask
                    focusActive = True
                    
                    # Spawn window tracking thread
                    monitorThread = threading.Thread(target=monitorFocusLoop, daemon=True)
                    monitorThread.start()
                    
                    # Spawn reminder beeps thread
                    soundThread = threading.Thread(target=playAccountabilityBeeps, daemon=True)
                    soundThread.start()
                    
                    sendToElectron("focus-started", {"taskId": taskId, "task": targetTask})
                    writeToLog("INFO", f"Focus session activated for task: {taskId}")
                else:
                    writeToLog("WARNING", f"Focus requested for non-existent task: {taskId}")
                    
            elif action == "stopFocus":
                focusActive = False
                activeTask = None
                sendToElectron("focus-stopped", {"status": "success"})
                writeToLog("INFO", "Focus session stopped by user command.")
                
            elif action == "saveSetting":
                key = str(payload.get("key"))
                val = str(payload.get("value"))
                db.saveSetting(connection, key, val)
                
                # Update in-memory cached variables immediately for dynamic responsiveness
                if key == "checkInterval":
                    try:
                        cachedCheckInterval = max(1.0, min(10.0, float(val)))
                    except (ValueError, TypeError):
                        pass
                elif key == "focusModeType":
                    cachedFocusModeType = val
                elif key == "researchEnabled":
                    cachedResearchEnabled = val.lower() == "true"
                    
                settingsMap = db.getSettings(connection)
                sendToElectron("settings-map", settingsMap)
                
            elif action == "getSettings":
                settingsMap = db.getSettings(connection)
                sendToElectron("settings-map", settingsMap)

            elif action == "getAnalytics":
                dayRange = int(payload.get("dayRange", 7))
                analytics = db.getAnalytics(connection, dayRange)
                insights = db.getDailyInsights(connection)
                analytics["insights"] = insights
                sendToElectron("analytics-data", analytics)

            elif action == "getResearch":
                taskId = int(payload.get("taskId"))
                tips = db.getWebResearch(connection, taskId)
                if tips:
                    sendToElectron("research-complete", {"taskId": taskId, "tips": tips})

            elif action == "getTaskTimeBreakdown":
                taskId = int(payload.get("taskId"))
                breakdown = db.getTaskTimeBreakdown(connection, taskId)
                sendToElectron("task-time-breakdown", breakdown)
                    
            elif action == "exportLogs":
                desktopPath = os.path.join(os.path.expanduser("~"), "Desktop")
                csvFilePath = os.path.join(desktopPath, "orbit_focus_logs.csv")
                try:
                    db.exportLogsToCSV(connection, csvFilePath)
                    writeToLog("INFO", f"Logs successfully exported to {csvFilePath}")
                except Exception as error:
                    writeToLog("ERROR", f"Failed to export focus logs to CSV: {str(error)}")
                    
            elif action == "exportSettingsFile":
                filePath = payload.get("filePath")
                settingsMap = db.getSettings(connection)
                try:
                    with open(filePath, "w", encoding="utf-8") as f:
                        json.dump(settingsMap, f, indent=2)
                    writeToLog("INFO", f"Settings successfully exported to {filePath}")
                    sendToElectron("settings-exported", {"success": True})
                except Exception as error:
                    writeToLog("ERROR", f"Failed to export settings file: {str(error)}")
                    sendToElectron("settings-exported", {"success": False, "error": str(error)})
                    
            elif action == "logEntry":
                level = payload.get("level", "INFO")
                message = payload.get("message", "")
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                logLine = f"[{timestamp}] [{level}] {message}\n"
                try:
                    with open(logFilePath, "a", encoding="utf-8") as logFile:
                        logFile.write(logLine)
                except Exception:
                    pass
                
            connection.close()
            
        except Exception as error:
            writeToLog("ERROR", f"Exception handling stdin message: {str(error)}")
            traceback.print_exc(file=sys.stderr)


def deadlineReminderThread():
    """
    Background daemon thread checking upcoming task deadlines and sending TickTick-style random reminders.
    """
    writeToLog("INFO", "Deadline & random reminder thread started.")
    lastRandomNudge = time.time()
    
    nextNudgeInterval = random.randint(1200, 2400)
    
    while True:
        try:
            if dbFilePath and os.path.exists(dbFilePath):
                conn = db.getDatabaseConnection(dbFilePath)
                upcoming = db.getUpcomingDeadlines(conn, minutesAhead=60)
                
                now = datetime.now()
                for t in upcoming:
                    dl_str = t.get("deadline")
                    if dl_str:
                        try:
                            # Clean ISO format if needed
                            clean_dl = dl_str.replace("Z", "")
                            dl_dt = datetime.fromisoformat(clean_dl)
                            diff_mins = int((dl_dt - now).total_seconds() / 60)
                            if diff_mins <= 60:
                                sendToElectron("deadline-reminder", {
                                    "taskId": t["id"],
                                    "title": t["title"],
                                    "deadline": dl_str,
                                    "minutesLeft": diff_mins,
                                    "isOverdue": diff_mins < 0
                                })
                        except Exception:
                            pass
                conn.close()
                
            # Random motivational nudge every 20-40 minutes if focus is active
            now_time = time.time()
            if focusActive and activeTask and (now_time - lastRandomNudge > nextNudgeInterval):
                lastRandomNudge = now_time
                nextNudgeInterval = random.randint(1200, 2400)
                sendToElectron("deadline-reminder", {
                    "taskId": activeTask["id"],
                    "title": activeTask["title"],
                    "deadline": None,
                    "minutesLeft": None,
                    "isRandomNudge": True,
                    "nudgeMessage": f"Keep going! Focus session on '{activeTask['title']}' is active."
                })
                if win32Installed:
                    try:
                        winsound.Beep(900, 150)
                    except Exception:
                        pass
        except Exception as err:
            writeToLog("WARNING", f"Deadline thread error: {str(err)}")
            
        time.sleep(45)


if __name__ == "__main__":
    writeToLog("INFO", "Orbit monitor subprocess initialized.")
    
    # Spawn heartbeat daemon thread to send status check updates
    hThread = threading.Thread(target=heartbeatThread, daemon=True)
    hThread.start()

    # Spawn deadline reminder thread
    dThread = threading.Thread(target=deadlineReminderThread, daemon=True)
    dThread.start()
    
    try:
        # Enter loop processing stdin commands from Electron
        handleIncomingActions()
    except KeyboardInterrupt:
        writeToLog("INFO", "Subprocess terminated by system interrupt.")
        sys.exit(0)
