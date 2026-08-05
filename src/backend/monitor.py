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

# Global execution variables
activeTask = None
focusActive = False
monitorThread = None
soundThread = None
dbFilePath = "orbit_tracker.db"
logFilePath = "orbit_tracker.log"


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
        
        return processName, windowTitle
    except Exception as error:
        writeToLog("WARNING", f"Failed to retrieve active window: {str(error)}")
        return None, None


def performWebResearch(taskId, taskTitle, taskDescription=""):
    """
    Asynchronously queries DuckDuckGo for general advice on the task.
    Saves a formatted JSON structure (Summary, Tips, Best Practices, Mistakes) to database.
    """
    writeToLog("INFO", f"Triggering web research for task: {taskTitle}")
    
    # 1. Construct search terms
    searchQuery = f"how to study or work on {taskTitle}"
    if taskDescription:
        searchQuery += f" {taskDescription}"
        
    tipsResult = {
        "summary": f"Tips and best practices for completing '{taskTitle}'.",
        "actionableTips": [
            "Break the goal down into 15-minute sub-tasks.",
            "Minimize phone alerts and desktop distractions before starting."
        ],
        "bestPractices": [
            "Use active recall or focused coding sprints.",
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
                # Fallback to v3 syntax if older package is installed
                with DDGS() as ddgs:
                    searchResults = list(ddgs.text(searchQuery, max_results=3))
            
            if searchResults:
                writeToLog("INFO", f"DuckDuckGo search successful for: {taskTitle}")
                    # Collect summaries from top search outputs to present to user
                    lines = [result.get("body", "") for result in searchResults if result.get("body")]
                    if lines:
                        tipsResult["summary"] = f"Top research advice: {lines[0][:150]}..."
                        # Populate tips from remaining results
                        for index, line in enumerate(lines[:2]):
                            tipsResult["actionableTips"][index] = line[:80] + "..."
        except Exception as error:
            writeToLog("WARNING", f"DuckDuckGo search failed or offline: {str(error)}")

    # 3. Cache the research tips to SQLite
    try:
        connection = db.getDatabaseConnection(dbFilePath)
        db.saveWebResearch(connection, taskId, tipsResult)
        connection.close()
        
        # Send confirmation update back to React
        sendToElectron("research-complete", {"taskId": taskId, "tips": tipsResult})
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
    """
    global activeTask, focusActive, dbFilePath
    
    writeToLog("INFO", "Foreground application monitoring thread started.")
    
    # Run loop while focus mode is active and there is a target active task
    while focusActive and activeTask:
        try:
            # Establish database connection to read settings
            connection = db.getDatabaseConnection(dbFilePath)
            
            # Fetch current settings map
            settingsMap = db.getSettings(connection)
            
            # Read checkInterval from DB (default to 3 seconds)
            try:
                checkInterval = float(settingsMap.get("checkInterval", 3.0))
                # Validate interval constraints (1 to 10 seconds)
                if checkInterval < 1.0 or checkInterval > 10.0:
                    checkInterval = 3.0
            except (ValueError, TypeError):
                checkInterval = 3.0
            
            # Fetch active foreground process details
            appName, windowTitle = getActiveWindowDetails()
            
            # Process focus check if process name is retrieved successfully
            if appName:
                # Resolve approved process names as lower-cased list
                targetApps = [app.strip().lower() for app in activeTask.get("target_apps", "").split(",") if app.strip()]
                
                # Verify if active process is whitelisted (default to 1 if no target apps set)
                isOnTask = 1 if (not targetApps or appName in targetApps) else 0
                
                # Truncate window title to 60 characters to prevent sensitive data logging
                truncatedTitle = windowTitle[:60] if windowTitle else ""
                
                # Log active check result to SQLite time logs
                db.logTimeSpent(connection, activeTask["id"], int(checkInterval), isOnTask, appName, truncatedTitle)
                
                # Build status update payload to send to Electron renderer
                updatePayload = {
                    "taskId": activeTask["id"],
                    "appName": appName,
                    "windowTitle": truncatedTitle,
                    "isOnTask": isOnTask == 1,
                    "interval": int(checkInterval)
                }
                
                # Send the focus update payload via stdout stream
                sendToElectron("monitor-update", updatePayload)
            
            # Close connection cleanly
            connection.close()
            
        except Exception as error:
            # Log any exception in loop execution
            writeToLog("ERROR", f"Exception in window monitor loop: {str(error)}")
            
            # Close database connection if left open
            if 'connection' in locals() and connection:
                connection.close()
            
            # Default sleep interval on crash
            checkInterval = 3.0
            
        # Dynamic sleep throttling using checkInterval setting
        time.sleep(checkInterval)


def heartbeatThread():
    """
    Background daemon thread that emits a heartbeat event to Electron every 5 seconds.
    """
    while True:
        try:
            # Broadcast heartbeat update to signify that Python monitor is running
            sendToElectron("heartbeat", {"status": "alive"})
        except Exception:
            pass
        
        # Wait 5 seconds before emitting next heartbeat
        time.sleep(5)


def handleIncomingActions():
    """
    Continuously listens for JSON instructions on standard input (sys.stdin).
    Triggers DB transactions, starts/stops threads, and writes feedback.
    """
    global activeTask, focusActive, monitorThread, soundThread, dbFilePath, logFilePath
    
    writeToLog("INFO", "Listening for Electron instructions on stdin...")
    
    # Process commands received from Electron stdout pipe line-by-line
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
            
        try:
            # Parse command line JSON string
            message = json.loads(line)
            action = message.get("action")
            payload = message.get("payload", {})
            
            writeToLog("INFO", f"Received action: {action}")
            connection = db.getDatabaseConnection(dbFilePath)
            
            if action == "setPaths":
                # Initialize path variables sent from Electron AppData directories
                dbFilePath = payload.get("dbPath", dbFilePath)
                logFilePath = payload.get("logPath", logFilePath)
                
                # Initialize database schema
                db.createTables(connection)
                
                # Parse retention settings for pruning old time logs
                settingsMap = db.getSettings(connection)
                try:
                    retentionDays = int(settingsMap.get("retentionDays", 90))
                except (ValueError, TypeError):
                    retentionDays = 90
                
                # Delete logs exceeding threshold
                db.pruneOldLogs(connection, retentionDays)
                
                writeToLog("INFO", f"Paths initialized. DB: {dbFilePath}")
                sendToElectron("paths-initialized", {"status": "success"})
                
            elif action == "getAllTasks":
                # Fetch all tasks and send to frontend
                tasksList = db.getAllTasks(connection)
                sendToElectron("tasks-list", tasksList)
                
            elif action == "createTask":
                # Create a task
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
                
                # Send updated task list
                tasksList = db.getAllTasks(connection)
                sendToElectron("tasks-list", tasksList)
                
                # Fetch app settings map to check research state
                settingsMap = db.getSettings(connection)
                researchEnabled = settingsMap.get("researchEnabled", "true").lower() == "true"
                
                # Trigger async web research thread only if enabled
                if researchEnabled:
                    researchThread = threading.Thread(
                        target=performWebResearch,
                        args=(taskId, payload.get("title"), payload.get("description", "")),
                        daemon=True
                    )
                    researchThread.start()
                
            elif action == "completeTask":
                # Mark task completed in SQLite
                taskId = int(payload.get("taskId"))
                completedAt = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                
                db.updateTask(connection, taskId, is_completed=1, completed_at=completedAt)
                
                # If completing the active focus task, stop focus mode
                if activeTask and activeTask["id"] == taskId:
                    focusActive = False
                    activeTask = None
                    
                tasksList = db.getAllTasks(connection)
                sendToElectron("tasks-list", tasksList)
                
            elif action == "deleteTask":
                # Delete task
                taskId = int(payload.get("taskId"))
                db.deleteTask(connection, taskId)
                
                if activeTask and activeTask["id"] == taskId:
                    focusActive = False
                    activeTask = None
                    
                tasksList = db.getAllTasks(connection)
                sendToElectron("tasks-list", tasksList)
                
            elif action == "startFocus":
                # Start focus monitoring for a task
                taskId = int(payload.get("taskId"))
                
                # Locate task details from database
                tasks = db.getAllTasks(connection)
                targetTask = next((t for t in tasks if t["id"] == taskId), None)
                
                if targetTask:
                    # Deactivate previous loops if running
                    focusActive = False
                    time.sleep(0.5)
                    
                    activeTask = targetTask
                    focusActive = True
                    
                    # Spawn window tracking thread
                    monitorThread = threading.Thread(target=monitorFocusLoop, daemon=True)
                    monitorThread.start()
                    
                    # Spawn reminder beeps thread
                    soundThread = threading.Thread(target=playAccountabilityBeeps, daemon=True)
                    soundThread.start()
                    
                    sendToElectron("focus-started", {"taskId": taskId})
                    writeToLog("INFO", f"Focus session activated for task: {taskId}")
                else:
                    writeToLog("WARNING", f"Focus requested for non-existent task: {taskId}")
                    
            elif action == "stopFocus":
                # Stop active tracking loops
                focusActive = False
                activeTask = None
                sendToElectron("focus-stopped", {"status": "success"})
                writeToLog("INFO", "Focus session stopped by user command.")
                
            elif action == "saveSetting":
                # Save settings key-value pair to database
                db.saveSetting(connection, payload.get("key"), payload.get("value"))
                
                # Broadcast updated settings map back to Electron renderer to sync state
                settingsMap = db.getSettings(connection)
                sendToElectron("settings-map", settingsMap)
                
            elif action == "getSettings":
                # Fetch settings Map
                settingsMap = db.getSettings(connection)
                sendToElectron("settings-map", settingsMap)

            elif action == "getResearch":
                # Fetch cached research guidelines for a task from database
                taskId = int(payload.get("taskId"))
                tips = db.getWebResearch(connection, taskId)
                
                # Emit research-complete payload if cache exists
                if tips:
                    sendToElectron("research-complete", {"taskId": taskId, "tips": tips})
                    
            elif action == "exportLogs":
                # Export time logging statistics to CSV
                desktopPath = os.path.join(os.path.expanduser("~"), "Desktop")
                csvFilePath = os.path.join(desktopPath, "orbit_focus_logs.csv")
                
                try:
                    # Write all time logs to the desktop CSV file path
                    db.exportLogsToCSV(connection, csvFilePath)
                    writeToLog("INFO", f"Logs successfully exported to {csvFilePath}")
                except Exception as error:
                    writeToLog("ERROR", f"Failed to export focus logs to CSV: {str(error)}")
                    
            elif action == "exportSettingsFile":
                # Save settings JSON configuration to selected file path
                filePath = payload.get("filePath")
                settingsMap = db.getSettings(connection)
                
                try:
                    # Write settings dictionary as JSON file
                    with open(filePath, "w", encoding="utf-8") as f:
                        json.dump(settingsMap, f, indent=2)
                    writeToLog("INFO", f"Settings successfully exported to {filePath}")
                    sendToElectron("settings-exported", {"success": True})
                except Exception as error:
                    writeToLog("ERROR", f"Failed to export settings file: {str(error)}")
                    sendToElectron("settings-exported", {"success": False, "error": str(error)})
                    
            elif action == "logEntry":
                # Centralized single-writer log entry delegation
                level = payload.get("level", "INFO")
                message = payload.get("message", "")
                
                # Append Electron log message directly to file to prevent file locks
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


if __name__ == "__main__":
    writeToLog("INFO", "Orbit monitor subprocess initialized.")
    
    # Spawn heartbeat daemon thread to send status check updates
    hThread = threading.Thread(target=heartbeatThread, daemon=True)
    hThread.start()
    
    try:
        # Enter loop processing stdin commands from Electron
        handleIncomingActions()
    except KeyboardInterrupt:
        writeToLog("INFO", "Subprocess terminated by system interrupt.")
        sys.exit(0)
