# Orbit Core - Task Tracker 🌌

**Orbit Task Tracker** is a desktop productivity application that combines intelligent task management with an engaging visual solar system interface and automatic application activity monitoring.

The app operates in two distinct modes:
1. **Dashboard Mode**: A comprehensive 1280x800 desktop console for task creation, deadline management, research tips, analytics, and settings.
2. **Orbit Mode**: An ultra-minimalist, 30 FPS translucent desktop widget where active tasks orbit a central sun as colorful planets.

---

## ✨ Key Features

- 🚀 **Dual Window Architecture**: Switch seamlessly between standard Dashboard mode and a translucent Orbit widget docked to your desktop.
- 🪐 **Interactive 3D Solar System**: Tasks rendered as orbiting planets with size and speed scaled by priority.
- 🎯 **Intelligent Focus Monitoring**: Real-time foreground app tracking with playful distraction alerts (`FocusModeOverlay`) when accessing unapproved applications.
- ⏰ **Deadline & Reminders System**:
  - Task due-date picker with urgency badges (`Overdue!`, `Due in 3h`).
  - Side notification system (`RemindersOverlay`) delivering motivational reminders based on INT8 timer ticks.
- 📊 **30-Day Productivity Heatmap & Analytics**: Real-time focus logging with daily heatmap tooltips, top tasks breakdown, and On-Task vs. Off-Task ratio bars.
- 🔍 **Automated Web Research**: Queries DuckDuckGo for best practices tailored to your task and user profile.
- 🔒 **Data Privacy**: Local-first SQLite database with Write-Ahead Logging (WAL). Export logs to CSV or backup settings to JSON anytime.

---

## 🛠️ Step-by-Step Setup & Developer Guide

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v16.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **Python**: `v3.10` or higher with `pip` ([Download Python](https://www.python.org/))
- **Git**: ([Download Git](https://git-scm.com/))

---

### Option 1: Automated Launcher (Recommended for Windows)

Orbit Core includes an automated launcher script `orbiting.bat` or `run.bat` that automatically checks for missing dependencies, installs Node & Python packages, and launches the app.

1. Double-click **`orbiting.bat`** (or `run.bat`) in the project root folder.
2. Select your desired mode:
   - **`1`** - Run in **Development Mode** (Vite Dev Server + Electron CLI)
   - **`2`** - Build Production Python Binary & Run Packaged App
   - **`3`** - Exit

---

### Option 2: Manual Setup & Launch

If you prefer setting up manually via command line:

#### 1. Clone the Repository
```bash
git clone https://github.com/raeyyanhabib/orbitcore.git
cd orbitcore
```

#### 2. Install Node.js Dependencies
```bash
npm install
```

#### 3. Install Python Dependencies
```bash
pip install pywin32 psutil duckduckgo_search pyinstaller
```

#### 4. Run in Development Mode
Start the Vite dev server and Electron app:
```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Launch Electron main process
npm start
```

#### 5. Build for Production
To test production bundling:
```bash
# Compile front-end bundle
npm run build
```

---

## 🏗️ Technology Stack

- **Frontend**: Electron, React 18, Three.js (3D graphics), Tailwind CSS v3
- **Backend Subprocess**: Python 3.10+, `psutil` (Active window detection), `win32gui`, `duckduckgo_search`
- **Database**: SQLite 3 (WAL mode)
- **Build Tools**: Vite 8, PyInstaller

---

## 📁 Project Structure

```
orbitcore/
├── public/
│   └── reminders/          # Motivational text phrase files (1.txt - 25.txt)
├── src/
│   ├── backend/
│   │   ├── monitor.py      # Python subprocess monitoring thread & IPC stdio listener
│   │   └── db.py           # SQLite database schema, CRUD, & analytics queries
│   ├── main/
│   │   └── main.js         # Electron main process, window management, & IPC routing
│   ├── preload/
│   │   └── preload.js      # Context-isolated whitelist IPC bridge
│   └── renderer/
│       ├── App.jsx         # Global state & hash-routing mode manager
│       ├── components/
│       │   ├── DashboardView.jsx     # Task CRUD, filters, & task detail panel
│       │   ├── OrbitView.jsx         # 3D Three.js solar system desktop widget
│       │   ├── AnalyticsView.jsx     # Heatmap, KPI cards, & focus ratio bar
│       │   ├── SettingsView.jsx      # Widget sliders, CSV export, & settings JSON import/export
│       │   ├── RemindersOverlay.jsx  # Side notification overlay
│       │   └── FocusModeOverlay.jsx  # Playful distraction alerts
│       └── index.css                 # Design system tokens & Tailwind CSS utilities
├── focusModemsgs.txt        # Customizable focus distraction messages
├── package.json
└── vite.config.js
```

---

## 📄 License

This project is licensed under the **ISC License**.