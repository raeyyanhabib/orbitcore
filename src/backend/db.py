# src/backend/db.py
# SQLite Database Wrapper for Orbit Task Tracker
# Coordinates connection setup, schema creations, and SQL CRUD operations.

import os
import sqlite3
import json
from datetime import datetime


def getDatabaseConnection(dbPath="orbit_tracker.db"):
    """
    Initializes and returns a SQLite database connection with Write-Ahead Logging (WAL) enabled.
    WAL mode allows concurrent reads and writes, avoiding locks between monitor logs and UI reads.
    """
    
    # 1. Ensure the parent directory of the database file exists
    dbDir = os.path.dirname(os.path.abspath(dbPath))
    if dbDir and not os.path.exists(dbDir):
        os.makedirs(dbDir, exist_ok=True)

    # 2. Establish connection to the SQLite database file
    connection = sqlite3.connect(dbPath)
    
    # Enable WAL mode for asynchronous lock protection
    connection.execute("PRAGMA journal_mode=WAL;")
    
    # Enforce foreign key constraints
    connection.execute("PRAGMA foreign_keys=ON;")
    
    # Configure row factory to return rows as dictionaries for easy JSON mapping
    connection.row_factory = sqlite3.Row
    
    return connection


def createTables(connection):
    """
    Initializes standard database tables, sets up indexes for focus tracking queries,
    and sets initial schema versioning.
    """
    # Create database cursor to execute SQL operations
    cursor = connection.cursor()

    # 1. Create Tasks table storing details of student/freelance goals.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            notes TEXT,
            priority TEXT CHECK(priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
            tags TEXT,                     -- JSON-formatted string: '["coding", "study"]'
            type TEXT CHECK(type IN ('One-Time', 'Daily', 'Recurring')) DEFAULT 'One-Time',
            interval_days INTEGER DEFAULT 1, -- Cycles for recurring tasks
            target_apps TEXT,              -- Comma-separated process names: "code.exe,chrome.exe"
            color TEXT,                    -- Hex code representation: "#FF0000"
            is_completed INTEGER DEFAULT 0, -- 0 = active, 1 = completed
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME
        );
    """)

    # 2. Create Time Logs table storing 3-second active foreground window focus metrics.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS time_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            duration_seconds INTEGER NOT NULL,
            is_on_task INTEGER CHECK(is_on_task IN (0, 1)),
            app_name TEXT,                 -- e.g., "code.exe"
            window_title TEXT,             -- e.g., "App.jsx - orbitcore"
            FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );
    """)

    # 3. Create Web Research Cache table caching DuckDuckGo response payloads.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS web_research (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER UNIQUE,
            tips TEXT,                     -- JSON string representing study tips
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );
    """)

    # 4. Create App Settings table storing key-value pairs of user configs.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    """)

    # 5. Create database indexes on task_id and timestamp to optimize focus log lookups and chart speeds.
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_time_logs_task_id ON time_logs(task_id);")
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_time_logs_timestamp ON time_logs(timestamp);")

    # 6. Schema migrations initialization: Set SQLite user_version to 1 for structured future upgrade tracking.
    cursor.execute("PRAGMA user_version;")
    
    # Fetch user version from single-tuple output of PRAGMA query
    currentVersion = cursor.fetchone()[0]
    
    if currentVersion < 1:
        # Update user_version parameter in database file to version 1
        cursor.execute("PRAGMA user_version = 1;")
        
        connection.commit()

    # Commit all table creation changes to disk
    connection.commit()


def pruneOldLogs(connection, retentionDays=90):
    """
    Deletes focus tracking time_logs rows that exceed the configured data retention limit.
    """
    # Create cursor for transaction
    cursor = connection.cursor()

    # Build SQL to delete logs older than negative retention period days.
    # We use parameterized query to safely pass negative string interval.
    cursor.execute(
        "DELETE FROM time_logs WHERE timestamp < datetime('now', ?)",
        (f"-{retentionDays} days",)
    )

    # Commit deletion changes to save storage
    connection.commit()


def exportLogsToCSV(connection, csvFilePath):
    """
    Queries all recorded focus tracking logs and writes them to a spreadsheet-compatible CSV file.
    """
    # Create cursor to perform join query
    cursor = connection.cursor()

    # Query time_logs joined with tasks to include task titles alongside processes.
    cursor.execute("""
        SELECT l.id, l.timestamp, l.duration_seconds, l.is_on_task, l.app_name, l.window_title, t.title AS task_title
        FROM time_logs l
        LEFT JOIN tasks t ON l.task_id = t.id
        ORDER BY l.timestamp DESC
    """)

    # Retrieve all matched records
    rows = cursor.fetchall()

    # Import standard CSV module for clean output serialization
    import csv

    # Open target file path in write mode with UTF-8 encoding
    with open(csvFilePath, "w", newline="", encoding="utf-8") as csvFile:
        # Create CSV writer instance
        writer = csv.writer(csvFile)
        
        # Write column headings first
        writer.writerow(["Log ID", "Timestamp", "Duration (Seconds)", "Is On Task", "App Name", "Window Title", "Task Title"])
        
        # Iterate and write each database row into the CSV file
        for row in rows:
            writer.writerow([
                row["id"],
                row["timestamp"],
                row["duration_seconds"],
                row["is_on_task"],
                row["app_name"],
                row["window_title"],
                row["task_title"]
            ])


def createNewTask(connection, title, description="", notes="", priority="Medium", tags="[]", taskType="One-Time", intervalDays=1, targetApps="", color=None):
    """
    Performs server-side title validation and inserts a new task row into SQLite.
    """
    # Ensure task title contains non-whitespace text before persisting.
    if not title or not title.strip():
        # Raise value error to prevent invalid empty task insertions.
        raise ValueError("Task title is required and cannot be empty.")

    # Create cursor for task insertion transaction
    cursor = connection.cursor()
    
    # Resolve default color values based on priorities if not specified
    if not color:
        if priority == "High":
            color = "#FF0000" # Red
        elif priority == "Medium":
            color = "#FFA500" # Orange
        else:
            color = "#FFFF00" # Yellow

    # Execute parameterized INSERT statement to prevent SQL injection.
    cursor.execute("""
        INSERT INTO tasks (
            title, description, notes, priority, tags, type, interval_days, target_apps, color, is_completed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (title, description, notes, priority, tags, taskType, intervalDays, targetApps, color))
    
    # Commit insertion changes to SQLite
    connection.commit()
    
    # Return auto-incremented primary key value of the new task row
    return cursor.lastrowid


def getAllTasks(connection):
    """
    Queries and returns all active and completed tasks in the database.
    """
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM tasks ORDER BY is_completed ASC, created_at DESC")
    
    # Map raw Row objects into clean lists of dictionaries
    rows = cursor.fetchall()
    taskList = []
    
    for row in rows:
        taskList.append(dict(row))
        
    return taskList


def updateTask(connection, taskId, **fields):
    """
    Dynamically updates task parameters in SQLite based on keyword arguments passed.
    """
    if not fields:
        return
        
    cursor = connection.cursor()
    
    # Build dynamic SQL set statement securely
    setClause = ", ".join([f"{key} = ?" for key in fields.keys()])
    values = list(fields.values())
    values.append(taskId)
    
    cursor.execute(f"UPDATE tasks SET {setClause} WHERE id = ?", values)
    connection.commit()


def deleteTask(connection, taskId):
    """
    Deletes a task by ID. Cascades automatically delete related logs and research cache.
    """
    cursor = connection.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ?", (taskId,))
    connection.commit()


def logTimeSpent(connection, taskId, durationSeconds, isOnTask, appName, windowTitle):
    """
    Logs active app window checking statistics to the time_logs database.
    """
    cursor = connection.cursor()
    cursor.execute("""
        INSERT INTO time_logs (task_id, duration_seconds, is_on_task, app_name, window_title)
        VALUES (?, ?, ?, ?, ?)
    """, (taskId, durationSeconds, isOnTask, appName, windowTitle))
    connection.commit()
    return cursor.lastrowid


def saveWebResearch(connection, taskId, tips):
    """
    Saves or replaces DuckDuckGo search queries in the cache database.
    """
    cursor = connection.cursor()
    
    # Convert tips list/dictionary into JSON string
    tipsJson = json.dumps(tips)
    
    cursor.execute("""
        INSERT OR REPLACE INTO web_research (task_id, tips, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
    """, (taskId, tipsJson))
    connection.commit()


def getWebResearch(connection, taskId):
    """
    Retrieves web research tips for a specific task. Returns None if cache is empty.
    """
    cursor = connection.cursor()
    cursor.execute("SELECT tips FROM web_research WHERE task_id = ?", (taskId,))
    row = cursor.fetchone()
    
    if row:
        return json.loads(row["tips"])
    return None


def getSettings(connection):
    """
    Fetches all application configurations as a clean dictionary.
    """
    cursor = connection.cursor()
    cursor.execute("SELECT key, value FROM settings")
    rows = cursor.fetchall()
    
    settingsMap = {}
    for row in rows:
        settingsMap[row["key"]] = row["value"]
        
    return settingsMap


def saveSetting(connection, key, value):
    """
    Saves or updates a settings key-value pair.
    """
    cursor = connection.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO settings (key, value)
        VALUES (?, ?)
    """, (key, str(value)))
    connection.commit()


# Self-test block to verify table creation and DB connections when run standalone
if __name__ == "__main__":
    print("Testing Orbit Database initialization...")
    testConn = getDatabaseConnection("orbit_test.db")
    createTables(testConn)
    
    taskId = createNewTask(testConn, "Sample Task", "For testing purposes", priority="High")
    print(f"Created task with ID: {taskId}")
    
    tasks = getAllTasks(testConn)
    print("Tasks in DB:", tasks)
    
    testConn.close()
    
    # Clean up test file
    if os.path.exists("orbit_test.db"):
        os.remove("orbit_test.db")
    if os.path.exists("orbit_test.db-shm"):
        os.remove("orbit_test.db-shm")
    if os.path.exists("orbit_test.db-wal"):
        os.remove("orbit_test.db-wal")
        
    print("Database test passed cleanly.")
