# Orbit Core — Focus Engine & Task Tracker 🌌

**Orbit Core** is a modern desktop productivity application combining intelligent task management, active application focus monitoring, and an interactive 3D solar system interface.

The application operates in two distinct modes:
1. **Dashboard Mode**: A comprehensive 1280x800 desktop console for task creation, deadline tracking, DuckDuckGo research tips, analytics, color themes, and system settings.
2. **Orbit Mode**: An ultra-minimalist, 30 FPS translucent desktop widget where active tasks orbit a central sun as colorful 3D planets.

---

## ✨ Key Features

- 🚀 **Dual Window Architecture**: Switch seamlessly between standard Dashboard mode and a translucent Orbit widget docked to your desktop.
- 🪐 **Interactive 3D Solar System**:
  - Tasks rendered as orbiting planets with size and speed scaled by priority.
  - Multi-layered glowing Sun aura corona shader.
  - High-priority tasks feature Saturn-style planetary rings and metallic materials.
  - 2,000-particle starfield backdrop with raycasted hover tooltips.
- 🎨 **6-Variant Synchronized Theme System**:
  - **3 Dark Palettes**: Deep Teal (default), Midnight Purple, Warm Sunset.
  - **3 Light Palettes**: Light Teal, Light Lavender, Light Warm.
  - Instant theme switching in Settings with 25+ synchronized CSS tokens and `localStorage` persistence.
- 🎯 **Intelligent Focus Monitoring**: Real-time foreground app tracking on Windows (`win32gui` / `psutil`) with playful distraction alerts (`FocusModeOverlay`) when accessing unapproved applications.
- ⏰ **Deadline & Reminders System**:
  - Task due-date picker with urgency badges (`Overdue!`, `Due in 3h`).
  - Side notification overlay (`RemindersOverlay`) delivering motivational reminders based on INT8 timer ticks.
- 📊 **30-Day Productivity Heatmap & Analytics**: Real-time focus logging with daily heatmap tooltips, top tasks breakdown, and On-Task vs. Off-Task ratio bars.
- 🔍 **Automated Web Research**: Queries DuckDuckGo for best practices tailored to your task title and user profile.
- 🔒 **Local Data Privacy**: Local-first SQLite database with Write-Ahead Logging (WAL). Export logs to CSV or backup settings to JSON anytime.

---

## 🛠️ Step-by-Step Setup & Developer Guide

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v16.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **Python**: `v3.10` or higher with `pip` ([Download Python](https://www.python.org/))
- **Git**: ([Download Git](https://git-scm.com/))

---

### Option 1: Automated Launcher (Recommended for Windows)

Orbit Core includes an automated launcher script `orbiting.bat` that automatically checks for missing dependencies, installs Node & Python packages, and launches the app.

1. Double-click **`orbiting.bat`** in the project root folder.
2. Select your desired mode:
   - **`1`** — Run in **Development Mode** (Vite Dev Server + Electron CLI)
   - **`2`** — Build Production Python Binary & Run Packaged App
   - **`3`** — Exit

---

### Option 2: Manual Setup & Launch

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

#### 5. Build Production Frontend Bundle
```bash
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
├── docs/                     # Project documentation (Architecture, Status, PRD, Guides)
│   ├── ARCHITECTURE.md
│   ├── STATUS.md
│   ├── implement_rn.md
│   ├── orbitscreens.txt
│   ├── theEngineer.md
│   ├── theEngineerGuide.md
│   └── thePRD.md
├── public/
│   └── reminders/            # Motivational text phrase files (1.txt - 25.txt)
├── src/
│   ├── backend/
│   │   ├── monitor.py        # Python subprocess monitoring thread & IPC stdio listener
│   │   └── db.py             # SQLite database schema, CRUD, & analytics queries
│   ├── main/
│   │   └── main.js           # Electron main process, window management, & IPC routing
│   ├── preload/
│   │   └── preload.js        # Context-isolated whitelist IPC bridge
│   └── renderer/
│       ├── App.jsx           # Global state, theme hook, & hash-routing mode manager
│       ├── themes.js         # 6 synchronized color palettes (Dark & Light variants)
│       ├── hooks/
│       │   └── useTheme.js   # Dynamic theme hook & localStorage persistence
│       ├── components/
│       │   ├── DashboardView.jsx     # Task CRUD, filters, & task detail panel
│       │   ├── OrbitView.jsx         # 3D Three.js solar system desktop widget
│       │   ├── AnalyticsView.jsx     # Heatmap, KPI cards, & focus ratio bar
│       │   ├── SettingsView.jsx      # Theme selector grid, sliders, & data export
│       │   ├── RemindersOverlay.jsx  # Side notification overlay
│       │   └── FocusModeOverlay.jsx  # Playful distraction alerts
│       └── index.css                 # Design system tokens & Tailwind CSS utilities
├── focusModemsgs.txt          # Customizable focus distraction messages
├── package.json
└── vite.config.js
```

---

## 📄 License

This project is licensed under the **ISC License**.