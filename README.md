# Orbit Core - Task Tracker 🌌

**Orbit Task Tracker** is a desktop productivity application that combines intelligent task management with an engaging visual interface. By converting tasks into a dynamic, visual solar system, Orbit Task Tracker makes productivity visible and engaging while maintaining a minimal system footprint. 

The app operates in two distinct modes:
1. **Dashboard Mode**: A comprehensive interface for deep task management and configuration.
2. **Orbit Mode**: A minimalist, always-on visual representation of your tasks as an interactive solar system.

## 📋 Executive Summary
The app monitors your active applications in real-time to track whether you're working on-task or getting distracted, providing intelligent reminders and detailed time analytics.

**Target Market:** Students, professionals, and productivity-focused individuals who want a visually engaging, data-driven task management experience with intelligent app monitoring.
**Primary Success Metric:** Achieve 30% improvement in on-task time and 25% task completion rate increase for beta users within 8 weeks of adoption.

## 🎯 Product Vision & Goals

**Vision Statement**
"Make productivity visible, engaging, and automatic—turning your task list into a living, breathing universe that keeps you accountable while staying beautifully out of the way."

**Strategic Goals**
- **Engagement:** Create a productivity app that users want to look at, not one they avoid
- **Accountability:** Provide real-time, data-driven insights into where time is actually being spent
- **Simplicity:** Remove friction from task creation and management through intelligent automation
- **Integration:** Seamlessly blend desktop-level app monitoring with personalized task workflows
- **Performance:** Maintain minimal system resource usage even in always-on Orbit Mode

## ✨ Core Features
- **Task Management System:** Manage One-Time, Daily, and Recurring tasks.
- **Intelligent Focus Mode:** App monitoring to ensure you stay on track and get notified if you switch to distracting applications.
- **Web Research Tips:** Automatically fetches advice and best practices for your tasks using DuckDuckGo.
- **Solar System Visualization:** Tasks orbit a central sun, representing priority by distance and engagement level by speed.
- **Time Analytics:** Detailed time tracking with productivity heatmaps and app usage statistics.
- **Data Privacy:** Local-first SQLite database. No data leaves your machine.

## 🚀 Quick Setup

### Prerequisites
- Node.js (v16 or higher)
- Python (v3.10 or higher) with `pip`

### Launching the Application
Orbit Core includes a handy automation script that will automatically download the correct dependencies and launch the application.

1. Double-click **`run.bat`** in the project root.
2. The script will automatically check for and install required Node.js and Python dependencies.
3. Select an Execution Mode:
   - **`1`** - Run in Development Mode (Vite Dev Server + Electron CLI)
   - **`2`** - Build Production Python Binary & Run Packaged Front-end
   - **`3`** - Exit

### Manual Setup
If you prefer not to use `run.bat`, you can set up the environment manually:
```bash
# 1. Install Node.js dependencies
npm install

# 2. Install Python dependencies
pip install pywin32 psutil duckduckgo_search pyinstaller

# 3. Start the application in dev mode
npm run dev
# In a separate terminal:
npm start
```

## 🏗️ Technology Stack
- **Frontend**: Electron, React 18, Three.js, Tailwind CSS v3
- **Backend**: Python 3.10+, psutil (OS monitoring), duckduckgo-search (web research)
- **Database**: SQLite 3
- **Build Tools**: Vite, PyInstaller

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/raeyyanhabib/orbitcore/issues).

## 📄 License
This project is licensed under the ISC License.
