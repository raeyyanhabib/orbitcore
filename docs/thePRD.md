# Orbit Task Tracker - Product Requirements Document

**Version:** 1.0  
**Date:** May 2026  
**Author:** Product Team  
**Status:** Active Development

---

## 📋 Executive Summary

**Orbit Task Tracker** is a desktop productivity application that combines intelligent task management with an engaging visual interface. The app operates in two distinct modes: a comprehensive **Dashboard Mode** for deep task management and configuration, and a minimalist **Orbit Mode** that transforms your desktop into an interactive solar system visualization where tasks are represented as orbiting planets.

**Key Innovation:** By converting tasks into a dynamic, visual solar system, Orbit Task Tracker makes productivity visible and engaging while maintaining minimal system footprint. The app monitors your active applications in real-time to track whether you're working on-task or getting distracted, providing intelligent reminders and detailed time analytics.

**Target Market:** Students, professionals, and productivity-focused individuals who want a visually engaging, data-driven task management experience with intelligent app monitoring.

**Primary Success Metric:** Achieve 30% improvement in on-task time and 25% task completion rate increase for beta users within 8 weeks of adoption.

---

## 🎯 Product Vision & Goals

### Vision Statement
*"Make productivity visible, engaging, and automatic—turning your task list into a living, breathing universe that keeps you accountable while staying beautifully out of the way."*

### Strategic Goals
1. **Engagement**: Create a productivity app that users *want* to look at, not one they avoid
2. **Accountability**: Provide real-time, data-driven insights into where time is actually being spent
3. **Simplicity**: Remove friction from task creation and management through intelligent automation
4. **Integration**: Seamlessly blend desktop-level app monitoring with personalized task workflows
5. **Performance**: Maintain minimal system resource usage even in always-on Orbit Mode

---

## 👥 User Personas

### Persona 1: Sarah (The Student)
- **Age:** 21 | **Occupation:** University Student (CS Major)
- **Goals:** Pass exams, complete assignments on time, reduce procrastination
- **Pain Points:** Multiple subjects, distracting apps (social media), unclear time allocation per subject
- **Tech Savviness:** High
- **Usage Pattern:** Uses daily/recurring tasks heavily (study sessions, assignments with due dates)
- **Key Need:** Visual understanding of study time distribution across subjects; accountability for procrastination

### Persona 2: James (The Remote Professional)
- **Age:** 32 | **Occupation:** Software Developer
- **Goals:** Ship features on time, maintain focus during work hours, avoid burnout
- **Pain Points:** Context switching between projects, unclear metrics on project time allocation
- **Tech Savviness:** Very High
- **Usage Pattern:** Recurring tasks (daily standups, sprint work), integration with development tools
- **Key Need:** Detailed analytics on coding time; app-level filtering (detect VS Code, Chrome, Slack separately)

### Persona 3: Marcus (The Goal-Oriented Freelancer)
- **Age:** 27 | **Occupation:** Freelance Designer
- **Goals:** Complete client projects efficiently, track billable hours, improve efficiency
- **Pain Points:** Multiple clients, context switching, difficulty justifying time spent
- **Tech Savviness:** Medium-High
- **Usage Pattern:** Project-based tasks, time tracking for billing, recurring client check-ins
- **Key Need:** Ability to export time logs for invoicing; client-specific task organization

---

## 📱 Product Overview

### Two-Mode Architecture

#### Dashboard Mode
The full-featured interface for task management and configuration. Users access this when they want to:
- Create new tasks and define their properties
- Review detailed analytics and time tracking data
- Configure application settings and preferences
- Review web research and tips for their tasks
- Manually adjust task status or properties

**Key Characteristics:**
- Clean, minimalist dark/light mode UI
- Responsive layout supporting 1366x768 and above
- Customizable color schemes and themes
- Fast startup and responsive interaction
- Task list with filtering and sorting capabilities

#### Orbit Mode
A lightweight, always-on visual representation of your tasks as a solar system. Users interact with it to:
- Visualize current task status at a glance
- Click planets to review task details quickly
- Monitor on-task/off-task status via glow colors
- Keep a beautiful, non-intrusive desktop widget

**Key Characteristics:**
- Three display options: Desktop-Pinned (behind windows), Floating Minibar, Translucent Overlay
- 30fps canvas rendering for minimal CPU impact
- Seamless transition to/from Dashboard Mode
- Clickable planets with tooltips and detail popups
- Color-coded status indicators

---

## ✨ Core Features

### 1. Task Management System

#### 1.1 Task Creation
**Feature:** Create, edit, and delete tasks with full customization

**Specifications:**
- **Input Fields (Everything except title is optional):**
  - Task Title (required, max 100 characters)
  - Description (optional, max 500 characters; if provided, included in web research query)
  - Notes (optional, freeform)
  - Priority Level (High/Medium/Low dropdown; **default: Medium if not selected**)
  - Task Type (One-Time / Daily / Recurring; **default: One-Time if not selected**)
  - Associated Applications (optional multi-select from detected apps on system)
  - Tags (optional, comma-separated or tag picker)
  - Due Date (optional date picker)
  - Custom Color (optional color picker with hex code input or color spectrum dial)

- **Default Color Assignments (applied automatically unless overridden):**
  - **High Priority:** Red (#FF0000)
  - **Medium Priority:** Orange (#FFA500)
  - **Low Priority:** Yellow (#FFFF00)
  - **User-Chosen Colors:** Any hex code or custom color via spectrum dial

- **Behavior:**
  - Automatically trigger web research when task is created
  - Include task description in search query if provided
  - Display a loading indicator while research is fetched
  - Allow manual refresh of research results
  - Populate research tips in a dedicated panel
  - Save to SQLite database with timestamp
  - **Focus Mode Integration:** When Focus Mode is activated for a task, the app displays playful, lighthearted messages when user opens apps not in the task's approved apps list (see Section 9.1 for message library)

- **Validation Rules:**
  - Title is mandatory
  - Due date cannot be in the past (if provided)
  - Recurring interval must be 1-365 days (if recurring task selected)

- **Philosophy:** User is fully in control—all fields are editable and moveable; the app comes with sensible defaults so users don't spend their first hour configuring everything

#### 1.2 Task Types

**One-Time Tasks**
- Standard to-do items
- Completed when user marks them done or auto-completes after deadline
- Don't recycle after completion
- Disappear from Orbit Mode when completed

**Daily Tasks**
- Automatically refresh every 24 hours at a configurable time (default: midnight)
- Perfect for habits: "Exercise," "Review notes," "Check email"
- User creates once; appears daily without manual re-adding
- Reset at configured time regardless of completion status
- Show daily completion streak

**Recurring Tasks**
- Repeat after a configurable interval (e.g., every 7 days, every 30 days)
- Independent of completion—reappear on schedule regardless of whether previous cycle was done
- Useful for: weekly reports, monthly reviews, recurring meetings
- Display cycle progress visually

#### 1.3 Task Organization
- **Filtering:** By priority, type, tag, due date, completion status
- **Sorting:** By due date, priority, creation date, time spent
- **Search:** Real-time search across title and description
- **Bulk Actions:** Complete multiple, archive, delete, reassign apps

#### 1.4 Task Details Panel
When clicking an orbiting planet or task in Dashboard:
- Full task information display
- Time tracking breakdown (total on-task vs off-task)
- Web research results and tips
- Completion history and streaks
- Edit and delete options
- "Start Focus Session" quick action button

---

### 2. App Monitoring & Time Tracking

#### 2.1 Active Window Detection
**Feature:** Optional real-time monitoring of which application the user is actively using (only active during Focus Mode)

**Specifications:**
- **Activation:** Monitoring is **optional and only enabled when user starts a Focus Mode session** for a specific task
- **Monitoring Interval (when active):** Every 3 seconds (configurable: 1-10 seconds)
- **Detection Method:**
  - Windows: `win32gui` and `psutil` for process detection
  - macOS: Quartz for window detection
  - Linux: Xlib/Wayland support
- **Data Captured:**
  - Process name (e.g., "code.exe", "chrome.exe")
  - Window title (e.g., "App.jsx - Visual Studio Code")
  - Timestamp of detection
  - On-task vs off-task status (determined by matching against task's target_apps)

- **Background Thread:** Python subprocess runs monitoring independently of UI, preventing lag (only spawned during Focus Mode)

#### 2.2 Time Logging
**Feature:** Detailed recording of time spent per task and application

**Specifications:**
- **Log Entry Structure:**
  - Task ID (which task was active)
  - Duration (seconds elapsed in this state)
  - Timestamp
  - App name and window title
  - On-task flag (0 = off-task / distracted, 1 = on approved app)

- **Granularity:** Logs recorded every 3 seconds; aggregated into longer durations in display
- **Database:** All logs stored in SQLite for historical analysis
- **Data Retention:** Configurable retention period (default: 90 days)

#### 2.3 Visual Status Indicators

**Glow Colors (In Orbit Mode):**
- **Green Glow:** Currently using an approved application (on-task)
- **Red Glow:** Currently using an unapproved application (off-task / distracted)
- **Yellow/Orange Glow:** Warning state (off-task for >15 minutes)
- **Gray Glow:** Task is paused, archived, or inactive

**Status Tooltip (On Hover):**
Shows current app name, time in session, and on-task percentage

#### 2.4 On-Task Calculation
- **Definition:** User is on-task if the currently active window's process name matches any of the task's target_apps
- **Flexibility:** Users can set multiple apps per task (e.g., "code.exe, chrome.exe" for web dev work)
- **Reporting:** Dashboard shows on-task percentage per task (e.g., "67% on-task, 33% distracted")

---

### 3. Intelligent Web Research

#### 3.1 Automatic Research on Task Creation
**Feature:** When a user creates a new task, the system automatically searches the web for relevant tips and advice

**Specifications:**
- **Trigger:** When task title is saved, Python backend spawns async web research
- **Search Query:** Uses task title + description (if provided) for more targeted results
- **Search Tool:** DuckDuckGo (privacy-respecting, no API key required)
- **Content Structure (Fixed Format):**
  - **One-liner Summary:** Quick 1-2 sentence overview of the topic
  - **2-3 Actionable Tips:** Practical, immediately-usable advice
  - **2 Best Practices:** Proven methods used by experts
  - **1 Common Mistake to Avoid:** Pitfall that derails most people

- **Display:** Research results shown in Dashboard's task detail panel
- **Caching:** Results cached in SQLite; manual refresh available
- **Privacy Control:** Toggle to disable web research if user prefers offline operation

---

#### 3.2 Audio Reminders & Notifications
**Feature:** Customizable audio alerts and notification popups to remind user about tasks

**Specifications:**
- **Audio Options (User Choice):**
  - **5 Default Sounds:** Select from pre-built beep/chime options (e.g., gentle bell, upbeat beep, notification sound)
  - **Custom Audio File:** Upload user's own audio file (mp3, wav, ogg)
  - **No Sound:** Disable audio entirely; receive only visual notifications

- **Visual Notification (If Sound Disabled or as Supplement):**
  - Colorful popup notification similar to WhatsApp chat notifications or Windows Firewall warnings
  - Vibrant colors (customizable gradient background)
  - Task title and brief message ("Time check! Still on task?")
  - Click to dismiss or take action

- **Reminder Schedule:**
  - **Interval:** Random beep every 12-30 minutes (configurable range)
  - **Behavior:** Only active when a task is ongoing
  - **Pause During Focus Mode:** Notifications can be paused if needed
  - **Notification Icon:** Appears in system tray with task name

#### 3.3 Deadline and Status Notifications
- **Trigger:** When due date is 24 hours away, then 1 hour before deadline
- **Content:** "Task 'X' is due in Y hours"
- **Action:** Click to open task details

#### 3.4 Off-Task Warnings (During Focus Mode)
- **Trigger:** When user has been off-task for >15 minutes (configurable)
- **Content:** "You've been off-task for 15 minutes. Current task: X. Return to [approved app]?"
- **Action:** Click to switch focus or snooze warning
- **Style:** Playful, lighthearted tone

#### 3.5 Daily Task Refresh Notifications
- **Trigger:** When daily tasks reset at configured time
- **Content:** "Good morning! 3 daily tasks are ready for today"
- **Action:** Click to open Dashboard

---

### 5. Orbit Mode - Solar System Visualization

#### 5.1 Three.js 3D Scene Setup
**Feature:** Render an interactive solar system where tasks orbit a central sun

**Specifications:**
- **Scene Components:**
  - Central Sun: Represents overall focus state; glows green (on-task), red (off-task), yellow (warning)
  - Planets: Each task is a planet in orbit
  - Background: Space environment with stars
  - Trails: Optional particle trails behind orbiting planets
  - Lighting: Dynamic lighting for depth and visual appeal

#### 5.2 Orbital Mechanics

**Orbit Parameters:**
- **Orbit Distance:** Represents task priority
  - High Priority: Close orbit (e.g., 100 pixels from sun)
  - Medium Priority: Medium orbit (e.g., 200 pixels)
  - Low Priority: Distant orbit (e.g., 300 pixels)

- **Orbit Speed:** Represents engagement level
  - High Priority: Faster rotation (complete orbit in 10 seconds)
  - Medium Priority: Medium speed (20 seconds per orbit)
  - Low Priority: Slow rotation (40 seconds per orbit)

- **Planet Size:** Represents time investment
  - Larger: More time already spent on this task
  - Smaller: New or just-created tasks

- **Planet Color Customization (User has full control):**
  - **Hex Code Input:** Manually enter any hex color code (#RRGGBB)
  - **Color Spectrum Dial:** Interactive dial/slider to select any shade in the color spectrum
  - **Default Color Assignment:** Auto-assigned based on priority if user doesn't customize
    - High Priority: Red (#FF0000)
    - Medium Priority: Orange (#FFA500)
    - Low Priority: Yellow (#FFFF00)

#### 5.3 Completed Task Animation
- **Fade Out:** When task is marked complete, planet gradually fades out over 2 seconds
- **Sparkle Effect:** Particle explosion effect when planet disappears (always enabled, not optional)
- **Removal:** Planet removed from scene after animation completes

#### 5.4 Interactive Features

**Click to View Details:**
- Raycaster detects click on planet
- Opens modal overlay showing:
  - Task title and description
  - Total time spent (on-task and off-task)
  - Current activity status
  - Web research tips
  - Edit button
  - Complete button

**Hover Effects:**
- Planet highlights on hover
- Tooltip appears showing: task title, time spent today, on-task percentage

**Drag to Reorder Priority (Optional):**
- User can drag planets closer/further from sun to adjust priority
- Saves updated priority to database
- Smooth animation to new orbit position

#### 5.5 Performance Optimization
- **Frame Rate:** Limited to 30 FPS to reduce CPU usage
- **Geometry Simplification:** Planets use low-poly meshes
- **Level of Detail (LOD):** Complex effects disabled on integrated graphics
- **Rendering:** WebGL canvas rendering; no DOM elements during Orbit Mode
- **Memory:** Clean up off-screen geometries; limit particle count

---

### 6. Display Modes

#### 6.1 Desktop-Pinned Mode (Default)
**Behavior:** Orbit window sticks to desktop wallpaper behind all active application windows

**Technical Implementation:**
- Windows: Uses `SetParent()` to reparent window to shell container (WorkerW/Progman)
- Alternative: Lowest z-order using Win32 API; user can toggle always-on-top
- Visibility: Visible when user minimizes apps or moves windows aside
- Non-intrusive: Never pops to foreground

**User Experience:**
- Subtle presence in background
- No Alt+Tab coverage (not in window switcher)
- Always accessible by minimizing everything
- **App can always be minimized** to system tray or Dashboard Mode
- All other features and options remain available (settings, reports, notifications)
- Best for: Always-on ambient awareness

#### 6.2 Floating Minibar Mode
**Behavior:** Compact horizontal or vertical bar floats above other windows

**Specifications:**
- **Size Options:**
  - Horizontal: 500px × 80px
  - Vertical: 100px × 400px
- **Position Configurable:**
  - Top-left, top-center, top-right
  - Bottom-left, bottom-center, bottom-right
  - Left or right edge (docked)
- **Content:** Displays:
  - Current task name
  - On-task status indicator
  - Time spent today
  - Focus Mode toggle button
  - Minimize to Dashboard button
- **Auto-Hide:** Optional auto-hide when inactive (e.g., reappears after 30 seconds of mouse movement)
- **Snap to Edge:** Automatically snaps to screen edges with configurable margin

**User Experience:**
- Always accessible without minimizing windows
- Quick information at a glance
- Can be moved/resized by user
- Best for: Active monitoring during work

#### 6.3 Translucent Overlay Mode
**Behavior:** Full orbit visualization hovers translucently above other windows

**Specifications:**
- **Opacity:** Configurable 20%-80% (default: 50%)
- **Always-on-Top:** Stays above all other windows
- **Interaction:** Can click through translucency to planets; right-click for context menu
- **Minimize Option:** Quick button to hide or minimize to minibar
- **Visibility:** Planets remain visible even with translucency
- **Click-Through:** Option to make non-interactive (read-only view)

**User Experience:**
- Visible at all times without switching windows
- Engaging visual presence
- Some screen real estate used
- Best for: Visual engagement and quick task switching

#### 6.4 Mode Switching
- **Hot-Key:** Configurable keyboard shortcut (default: Ctrl+Shift+O) to cycle through modes
- **Menu:** Right-click context menu with mode options
- **Settings:** Change default mode in Settings panel
- **Smooth Transition:** 300ms animation when switching between modes

---

### 7. Analytics & Insights

#### 7.1 Productivity Dashboard
**Feature:** Comprehensive visual analytics about task completion and time usage

**Metrics Displayed:**
- **Summary Cards:**
  - Tasks completed (today/this week/this month)
  - Total focus time (tracked)
  - On-task percentage (average)
  - Current focus streak (consecutive on-task days)

- **Charts:**
  - Productivity Heatmap: GitHub-style contribution graph showing work intensity by day/hour
  - On-Task vs Off-Task Pie Chart: Visual breakdown of time distribution
  - Time Spent by Task: Horizontal bar chart showing hours per task
  - Task Completion Trend: Line chart showing completion rate over time

- **Time Range Filters:** View data for Today, This Week, This Month, Custom Range

#### 7.2 Task-Level Analytics
For each task, display:
- **Time Invested:** Total hours:minutes spent (on-task + off-task)
- **On-Task Ratio:** Percentage of time spent in approved apps
- **Distractions:** Most common off-task apps when this task was active
- **Best Focus Times:** Hour of day when user is most focused on this task
- **Completion Rate:** For recurring/daily tasks, percentage of cycles completed

#### 7.3 Application Usage Report
- **Total Screentime Display:** Shows cumulative screen time for the current session
  - **Resets Daily:** Resets to 0 at midnight (or when app is first opened after a new date)
  - **Continues if Same Day:** If app was closed and reopened on the same date, timer continues adding on
  - **Visual Indicator:** Prominent display in Dashboard showing hours:minutes for today
- **Most Used Apps:** Ranked list of apps user spends time in
- **Time per App:** Hours:minutes breakdown per application
- **Correlation:** Which apps are used for which tasks
- **Distraction Trigger:** Identify which apps most commonly pull focus away from tasks

#### 7.4 Report Generation & Export (User-Initiated Only)
**Feature:** Generate and export detailed productivity reports on-demand; reports are never auto-generated

**Specifications:**
- **User-Initiated:** Reports are only generated when user explicitly clicks "Generate Report" button
- **No Auto-Generation:** App does not automatically create or send reports
  - Weekly summary (completed tasks, focus time, insights)
  - Monthly summary (trends, achievements, areas for improvement)
  - Custom range selection
- **Export Format Options:**
  - **PDF:** Professional PDF document with charts and formatted tables
  - **DOCX:** Editable Word document for further customization
- **User Controls:** User specifies where to save the file on their system
- **Export Data:** CSV export of time logs for external analysis or invoicing
- **Local-First Design:** All reports are generated and saved locally; no cloud storage or sharing links (consistent with app's privacy-first philosophy)

---

### 8. Settings & Configuration

#### 8.1 Display Settings
- **Default Mode:** Choose Dashboard, Desktop-Pinned, Minibar, or Translucent as startup default
- **Theme:** Dark mode, light mode, or auto (follows system preference)
- **Color Scheme:** Pre-built palettes (default, cyberpunk, minimalist, warm, cool)
- **Custom Colors:** Color picker for custom theme
- **Transparency:** 0-100% opacity slider for Orbit Mode
- **Minibar Position:** Select from 8 positions around screen
- **Font Size:** 80%-120% scaling for accessibility
- **Animation Speed:** Slower/Normal/Faster toggle for orbit animations

#### 8.2 Monitoring Settings
- **Check Interval:** Frequency of active window checks (1-10 seconds; default: 3)
- **Off-Task Warning Threshold:** Minutes before warning triggers (default: 15)
- **Beep Interval Range:** Min-max minutes between random beeps (default: 12-30)
- **Beep Sound:** Select system sound or upload custom audio file
- **Research Toggle:** Enable/disable automatic web research on task creation
- **Data Retention:** How long to keep time logs (7-365 days; default: 90)

#### 8.3 Behavioral Settings
- **Startup Behavior:**
  - **Launch with Windows/Mac startup:** Optional checkbox (default: ON, user can deselect)
  - Launch minimized (to system tray or Orbit Mode)
  - Auto-start monitoring in background (only during Focus Mode)
- **Focus Mode Configuration:**
  - **Focus Mode Strictness:** User can choose between:
    - **Advisory Mode:** Display playful reminders when off-task apps are opened, but allow access
    - **Hard Block Mode:** Prevent switching to off-task apps during Focus Session; show warnings
  - Both modes optional; user selects which they prefer
- **Notification Preferences:**
  - Desktop notifications on/off
  - Sound notifications on/off
  - Notification timeout duration
- **Auto-Complete:**
  - Option to auto-complete tasks past their due date
  - Grace period before auto-complete
- **Settings Backup & Export:**
  - **Auto-Backup:** Settings automatically backed up to accessible local file
  - **Manual Export:** User can export all settings and task configuration to JSON file (user selects save location)
  - **Manual Import:** User can import previously exported settings from any location on their system
  - **File Accessibility:** Settings file always accessible to user for manual editing or migration if they uninstall and reinstall app

#### 8.4 Data Management
- **Backup:** One-click export of all tasks and settings to encrypted JSON file (user specifies location)
- **Restore:** Import backup file to restore previous state (user selects file location)
- **Clear Data:** Reset all tasks or all analytics while preserving settings
- **Export All:** Export all tasks to CSV (for migrating to other tools)
- **Import:** Import tasks from CSV format (user specifies file location)

#### 8.5 Advanced Options
- **Debug Mode:** Enable detailed logging for troubleshooting
- **Database Maintenance:** Vacuum/optimize SQLite database
- **API/Integration Settings:** Placeholders for future Google Calendar, Slack, etc.
- **Keyboard Shortcuts:** Customizable shortcuts for all major actions
- **Privacy Mode:** Option to disable all monitoring and data collection

---

### 9. Focus Mode

#### 9.1 Start Focus Session
**Feature:** Dedicated focused work session with app monitoring and playful accountability messages

**Specifications:**
- **Trigger:** "Start Focus Session" button on task detail or in Dashboard
- **Duration:** User selects (15 min, 25 min, 45 min, 60 min, custom)
- **Monitoring Activation:** When Focus Session starts:
  - Active window monitoring turns on (only during focus session)
  - Background Python process begins tracking which apps user opens
  - Time tracking against task's approved apps begins
  
- **Off-Task Notifications (Invasive Mode):**
  - **Trigger:** When user opens an app NOT in the task's target_apps list
  - **Display:** Colorful, playful popup message appears (can't be ignored, must dismiss)
  - **Message Content:** Randomly selected from curated list of ~15 lighthearted, non-judgmental messages
  - **Examples:** "Psst! Still working on [task]?", "The task is calling... 👀", "Quick check: You meant to focus right? 😉"
  - **Message Library:** Complete list of pre-written messages in separate `FOCUS_MODE_MESSAGES.txt` file (see Appendices)
  - **User Control:** Can customize strictness (Advisory vs Hard Block):
    - **Advisory:** Show message but allow access to off-task app
    - **Hard Block:** Show message and prevent switching to off-task app (user must close message or close window)

- **App Blocking (Hard Block Mode Optional):**
  - List of apps to block during session
  - Toggle apps on/off (e.g., block Slack, Twitter, YouTube)
  - Hard block: Close/disable apps or prevent launch (if user selects this mode)
  - Soft block: Show warning popup but allow use (if user selects advisory mode)

- **Pomodoro Integration (Optional):**
  - Pre-set 25-min work + 5-min break cycles
  - Visual timer on minibar
  - Break notifications

- **Exit Policy:**
  - Auto-complete task when timer ends (optional)
  - Option to extend session
  - Option to cancel early (logs incomplete)
  - Summary popup showing time spent on-task vs off-task

---

### 10. Additional Features

#### 10.1 Task Templates
- **Pre-built Templates:** Common tasks (e.g., "Daily Standup," "Code Review," "Workout")
- **Custom Templates:** Save current task as template for future reuse
- **Template Library:** Browse and apply templates with one click

#### 10.2 Tags & Categorization
- **Tag System:** Add multiple tags per task
- **Tag Autocomplete:** Suggest previously used tags
- **Filter by Tag:** View only tasks with specific tag
- **Tag-based Colors:** Assign colors to tags; tasks inherit tag colors

#### 10.3 Due Dates & Calendar View
- **Due Date Picker:** Calendar UI for selecting task deadline
- **Calendar View (Optional):** Month/week calendar showing task deadlines
- **Overdue Highlighting:** Visual indication of overdue tasks
- **Calendar Sync (Future):** Export to Google Calendar, Outlook

#### 10.4 Notes & Documentation
- **Task Notes:** Freeform text field for additional task context
- **Markdown Support:** Optional markdown rendering for rich text
- **Research Integration:** Research findings can be appended to notes

---

## 🎮 User Workflows

### Workflow 1: Student Managing Multiple Subjects
1. **Create Daily Tasks:** Student adds 5 daily subjects to review (Math, CS, Chemistry, History, English)
2. **Set Target Apps:** Each subject task targets Chrome (for lecture videos) and VS Code (for coding assignments)
3. **Monitor Time:** Throughout the day, app tracks time spent in Chrome/VS Code; red glows indicate off-task web browsing
4. **Review Analytics:** At week's end, student reviews heatmap showing which subject got least focus
5. **Adjust:** Based on analytics, student reprioritizes underperforming subjects higher next week

### Workflow 2: Developer Tracking Sprint Work
1. **Create Recurring Sprint Task:** Developer adds "Sprint Development" recurring every 2 weeks
2. **Assign Apps:** Links to VS Code, GitHub, Slack, Chrome (for documentation)
3. **Start Focus Session:** Developer starts a 2-hour focus session; Slack notifications disabled
4. **Real-Time Monitoring:** App monitors active window; red glow when switching to email/social media
5. **Generate Report:** At sprint end, export time logs showing exact hours spent coding vs in meetings
6. **Iterate:** Use data to negotiate realistic sprint planning next cycle

### Workflow 3: Freelancer Billing Clients
1. **Create Project Tasks:** Freelancer creates tasks for each client project
2. **Monitor Time:** Throughout work day, each task accumulates time logs
3. **Review Before Billing:** Review time logs to verify accuracy (excluding off-task time)
4. **Export Invoice:** Generate CSV with on-task hours per project for invoice
5. **Deliver Report:** Optional: share productivity report with client as transparency

---

## 🏗️ Technical Architecture

### System Architecture Overview
```
┌─────────────────────────────────────────────────────────┐
│ Electron Main Process                                   │
│ ├── Window Management (Dashboard + Orbit windows)       │
│ ├── IPC Bridge (to React and Python)                    │
│ ├── Subprocess Manager (Python monitor process)         │
│ └── Tray Integration                                    │
└─────────────────────────────────────────────────────────┘
         ↓ IPC                           ↓ Stdio JSON
┌──────────────────────┐        ┌─────────────────────────┐
│ React + Three.js     │        │ Python Background       │
│ ├── Dashboard Mode   │        │ ├── Window Monitoring   │
│ ├── Orbit Mode       │        │ ├── Web Research        │
│ └── Visualizations   │        │ ├── Audio Alerts        │
└──────────────────────┘        │ └── DB Operations       │
         ↓                             ↓
┌──────────────────────────────────────────┐
│ SQLite Database (orbit_tracker.db)       │
│ ├── tasks table                          │
│ ├── time_logs table                      │
│ ├── web_research table                   │
│ └── settings table                       │
└──────────────────────────────────────────┘
```

### Technology Stack
- **Frontend:** Electron, React 18, Three.js, Tailwind CSS v3
- **Backend:** Python 3.10+, psutil (OS monitoring), duckduckgo-search (web research), winsound (audio)
- **Database:** SQLite 3
- **Build Tools:** Vite, Webpack/Electron Builder
- **State Management:** React Context API or Zustand
- **Charts:** Chart.js or Recharts

### Database Schema
Detailed in technical documentation; includes tables for:
- **tasks:** Task definitions with metadata
- **time_logs:** Detailed time tracking entries
- **web_research:** Cached research results
- **settings:** User configuration (key-value store)

---

## 📈 Success Metrics & KPIs

### Primary Metrics (MVP)
1. **User Retention:** >60% 30-day retention rate for beta users
2. **Task Completion Rate:** Users complete 25% more tasks by week 4 of usage
3. **On-Task Time:** Average on-task percentage increases from baseline 65% to 80%
4. **App Engagement:** Users switch to Dashboard/Orbit Mode >5 times daily on average

### Secondary Metrics
5. **Performance:** App uses <100MB RAM in Orbit Mode; 30 FPS maintained
6. **Crash Rate:** <0.1% crash rate during normal usage
7. **Feature Adoption:** 70%+ of users enable at least 3 display modes
8. **User Satisfaction:** >4.2/5.0 average rating from beta feedback

### Leading Indicators
- Task creation rate (target: 5+ tasks per active user per week)
- Web research usage (target: 60%+ of tasks have research viewed)
- Daily active users (DAU / monthly active users ratio >40%)
- Average session duration (target: 15+ minutes per day)

---

## 🎯 Scope & Constraints

### In Scope (MVP)
- ✅ Dual-mode interface (Dashboard + Orbit)
- ✅ Task CRUD with type variations (one-time, daily, recurring)
- ✅ Active window monitoring and time tracking
- ✅ Web research integration (DuckDuckGo)
- ✅ Random reminder beeps
- ✅ Basic analytics (heatmap, time per task)
- ✅ Settings panel and customization
- ✅ Desktop-pinned Orbit Mode
- ✅ Windows platform support

### Out of Scope (Post-MVP)
- ❌ Mobile companion app
- ❌ Cloud sync across devices
- ❌ Calendar integrations
- ❌ Browser extension for website tracking
- ❌ AI-powered features (smart suggestions, burnout detection)
- ❌ Gamification (badges, leaderboards)
- ❌ macOS/Linux support (Phase 2)
- ❌ Voice commands
- ❌ Focus mode app blocking (advisory only in MVP)

### Constraints
- **Platform:** Windows 10+ initially (macOS/Linux in future)
- **Performance:** Must maintain <150MB RAM usage in Orbit Mode
- **Dependencies:** Minimize external API dependencies (local research only, no cloud)
- **Privacy:** No data sent to external servers; all processing local
- **Accessibility:** WCAG 2.1 AA compliance for UI components

---

## 🛣️ Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2) - MVP Core
**Focus:** Get basic functionality working end-to-end

**Deliverables:**
- [ ] Electron + React boilerplate with Vite
- [ ] SQLite database schema and initialization
- [ ] Python background monitor (basic window detection)
- [ ] Stdio JSON IPC bridge between Electron and Python
- [ ] Basic task CRUD (add, view, edit, delete)
- [ ] Simple list view of tasks
- [ ] Active app detection working
- [ ] Time log recording to database

**Tests:** Manual testing of task creation and app monitoring

---

### Phase 2: Core Features (Weeks 3-4)
**Focus:** Implement dashboard UI, analytics, and task types

**Deliverables:**
- [ ] Dashboard Mode UI (full featured)
- [ ] Task type variations (one-time, daily, recurring)
- [ ] Web research integration (DuckDuckGo search)
- [ ] Time tracking analytics (basic charts)
- [ ] Dark/light mode themes
- [ ] Settings panel
- [ ] Random reminder beeps
- [ ] Task filtering and sorting

**Tests:** Unit tests for task logic; integration tests for DB

---

### Phase 3: Orbit Visualization (Weeks 5-6)
**Focus:** Three.js solar system and Orbit Mode implementation

**Deliverables:**
- [ ] Three.js scene setup with sun and planets
- [ ] Orbital mechanics (distance, speed, size based on task properties)
- [ ] Raycaster click detection for planets
- [ ] Planet glow colors (green/red/yellow for status)
- [ ] Fade-out animation for completed tasks
- [ ] Desktop-pinned mode (SetParent or z-order)
- [ ] Smooth transitions between Dashboard and Orbit Mode
- [ ] 30 FPS optimization and rendering

**Tests:** Visual regression tests; performance benchmarks

---

### Phase 4: Polish & Optimization (Week 7)
**Focus:** Performance, bug fixes, and user experience refinement

**Deliverables:**
- [ ] Bug fixes from Phase 1-3 testing
- [ ] Performance optimization (memory, CPU)
- [ ] Floating minibar mode implementation
- [ ] Translucent overlay mode implementation
- [ ] Data export to CSV
- [ ] Backup/restore functionality
- [ ] Keyboard shortcut customization
- [ ] Accessibility audit and fixes
- [ ] User documentation
- [ ] Beta testing with 20-30 users

**Tests:** Full user acceptance testing (UAT); accessibility testing

---

### Phase 5: Launch & Iteration (Week 8+)
**Focus:** Release MVP to early adopters and iterate based on feedback

**Deliverables:**
- [ ] Installer/executable distribution (Windows)
- [ ] In-app feedback collection
- [ ] Analytics pipeline (anonymous usage tracking)
- [ ] Community channels (Discord/Reddit)
- [ ] Public launch announcement
- [ ] Monitor KPIs and user feedback

**Next Priorities (Post-MVP):**
- [ ] macOS support
- [ ] Enhanced app filtering (detect websites, not just Chrome)
- [ ] Calendar integration
- [ ] AI-powered suggestions
- [ ] Mobile companion app
- [ ] Cloud sync

---

## 📋 Assumptions & Dependencies

### Assumptions
1. **User Behavior:** Users will engage with visual feedback and want detailed time analytics
2. **Market Demand:** CS students and remote developers actively seek better productivity tools
3. **Technical Feasibility:** Win32 API window detection is reliable and performant enough for continuous monitoring
4. **User Privacy:** Users prefer local-only processing over cloud-based alternatives

### Dependencies
- **Python 3.10+:** Must be installed on system or bundled with Electron app
- **Win32 Libraries:** Windows-specific libraries (win32gui, win32process) available
- **Node.js + npm:** For Electron development and dependency management
- **Three.js:** For 3D rendering (npm dependency)

### External Services (MVP)
- **DuckDuckGo API:** Free web search (no authentication required)
- **System Audio:** Windows winsound module for beeps
- **SQLite:** No external dependencies; bundled with Python

---

## 🎨 Design Principles

1. **Minimalism:** Keep UI clean and non-distracting; let data speak
2. **Visual Engagement:** Use color, animation, and visual metaphors to make productivity fun
3. **Transparency:** Show users exactly what the app is monitoring and why
4. **Privacy-First:** All processing local; no data collection or external servers
5. **Performance:** Never sacrifice responsiveness for features
6. **Accessibility:** Support keyboard navigation, high contrast, text scaling
7. **Customization:** Give users control over appearance and behavior; sensible defaults
8. **Intuitiveness:** Users should understand core features in <5 minutes

---

## 📞 Stakeholder Communication

### Beta Testing Plan
- **Target Beta Users:** 20-30 early adopters
  - 10 university students (CS majors)
  - 10 remote developers
  - 5-10 other productivity-focused individuals
- **Duration:** 4 weeks of active testing
- **Feedback Channels:**
  - Weekly surveys (Likert scale + open-ended)
  - Discord server for discussion
  - Feature request voting
- **Success Criteria:** 70%+ would recommend to others; >4.0 overall rating

### Launch Communication
- **Announcement:** Product Hunt, Hacker News, relevant subreddits (r/productivity, r/studentlounge)
- **Content:** "How We Built a Productivity App That Makes Task Management Visual"
- **Channels:** Twitter/X, dev blogs, CS student forums

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| Win32 API unreliable on all Windows versions | High | Medium | Extensive testing on Win 10/11; fallback to simple process detection |
| Performance degradation with many tasks (100+) | Medium | Low | Database indexing; lazy loading; test with 200+ tasks |
| Python subprocess crashes | High | Low | Auto-restart mechanism; fallback to simple mode without monitoring |
| User finds privacy implications concerning | Medium | Medium | Clear documentation; in-app explanation; full offline-only operation |
| Three.js performance on older GPUs | Medium | Medium | LOD system; disable particle effects on integrated graphics; 30 FPS cap |
| Competitors release similar product | High | Medium | Focus on superior UX and unique visual design; rapid iteration |

---

## 📚 Appendices

### A. Glossary
- **Dashboard Mode:** Full-featured task management interface
- **Orbit Mode:** Minimized solar system visualization on desktop
- **On-Task:** User is actively using an approved application for the current task
- **Off-Task:** User is using an unapproved application or distracted
- **Time Log:** Individual record of time spent on a task at a specific time
- **Recurring Task:** Task that repeats at configurable intervals (e.g., every 7 days)
- **Daily Task:** Task that resets and reappears every 24 hours

### B. Related Documents
- Technical Specification Document (separate)
- Database Schema Reference
- UI/UX Design Wireframes
- API Reference (for future integrations)
- FOCUS_MODE_MESSAGES.txt (See section C below)

### C. Focus Mode Messages Library
**Description:** Curated list of playful, lighthearted messages displayed when user opens non-approved apps during Focus Mode. Messages randomly selected from this list to keep notifications fresh and non-judgmental.

**Message Categories & Examples:**

*Gentle Reminders:*
1. "Psst! Still working on [TASK_NAME]?"
2. "[APP_NAME]? Really? I thought you were focused 👀"
3. "Hey, you've got [TASK_NAME] to do!"
4. "The task is calling... 📞"
5. "Plot twist: You were supposed to be doing [TASK_NAME]"

*Playful Nudges:*
6. "Quick check: Was [APP_NAME] on your approved list? 🤔"
7. "[TASK_NAME] is waiting for you ⏰"
8. "I see what you did there... [APP_NAME] instead of [TASK_NAME] 😏"
9. "Task focus energy: **ON** | [APP_NAME] browsing: **DETECTED**"
10. "Your task didn't distract itself! 👋"

*Lighthearted Humor:*
11. "Plot twist: You're now distracted"
12. "[APP_NAME]'s music is nice, but [TASK_NAME] is waiting!"
13. "Alternate universe where you're doing [TASK_NAME]... 👽"
14. "POV: You meant to do [TASK_NAME]"
15. "Error 404: Focus not found... jk, let's get back to [TASK_NAME]! 💪"

**Implementation Notes:**
- `[TASK_NAME]` and `[APP_NAME]` are dynamic placeholders replaced at runtime
- Messages randomly shuffled on each appearance (no immediate repeats when possible)
- User can customize this file to add their own messages
- File location: `config/focus_messages.txt` (accessible and editable by user)

### D. Contact & Ownership
- **Product Manager:** [Your Name]
- **Engineering Lead:** [Name]
- **Design Lead:** [Name]
- **Last Updated:** May 27, 2026

---

**Document Status:** ✅ Ready for Development  
**Next Review Date:** After Phase 1 completion
