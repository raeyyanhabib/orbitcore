# Production Engineering Guide - Orbit Task Tracker

Welcome to the engineering handbook for **Orbit Task Tracker**. This guide summarizes our standards and best practices for building a secure, performant, and reliable desktop productivity application.

Unlike generic server/cloud-first SaaS architectures, Orbit is a **local-first desktop app** built on **Electron + React (Vite, Tailwind) + Python + SQLite**. All engineering decisions must prioritize minimal local resource footprints, clean inter-process boundaries, user privacy, and readable, educational codebase formatting.

---

## Table of Contents

1. [Security Architecture (Local-First)](#1-security-architecture-local-first)
2. [Scalability & Performance (Desktop-Optimized)](#2-scalability--performance-desktop-optimized)
3. [Packaging & Distribution (Subprocess Bundling)](#3-packaging--distribution-subprocess-bundling)
4. [Code Quality & Readability Style](#4-code-quality--readability-style)
5. [Monitoring & Diagnostic Observability](#5-monitoring--diagnostic-observability)
6. [Data Compliance & Privacy rights](#6-data-compliance--privacy-rights)
7. [Testing Strategy (Isolated Mocking)](#7-testing-strategy-isolated-mocking)

---

## 1. Security Architecture (Local-First)

For a detailed review, see the full [Security Architecture Guide](file:///d:/Personal/orbitcore/MDs/01_SECURITY_ARCHITECTURE.md).

- **No Remote Database Auth**: Store user profiles locally. No Clerk/Auth0 hooks are required.
- **SQL Parameter Injection Defense**: Standard parameter placeholders (`?`) must be used for all inputs parsed into Python's `sqlite3` execution calls.
- **Electron Boundaries**: Maintain strict separation. `contextIsolation` must be set to `true`, `nodeIntegration` set to `false`, and only whitelisted commands exposed to the UI via the preload script bridge.
- **Stdio Validation**: Electron and Python validate JSON payload schemas before parsing inputs to prevent process control injection.

---

## 2. Scalability & Performance (Desktop-Optimized)

For a detailed review, see the full [Scalability & Performance Guide](file:///d:/Personal/orbitcore/MDs/02_SCALABILITY_PERFORMANCE.md).

- **SQLite WAL Mode**: Enable Write-Ahead Logging to prevent lock errors between Python writes and Electron UI chart reads.
- **SQLite Indexes**: Create indexes on `time_logs.task_id` and `time_logs.timestamp` to keep dashboard charts rendering in under 100ms.
- **Three.js Frame Rate Capping**: Limit rendering loops to 30 FPS using delta time guards to conserve laptop battery and reduce GPU load.
- **Throttled Polling**: Cap active window checks at a 3-second (3000ms) interval, allowing the Python thread to sleep and yield CPU cycles.

---

## 3. Packaging & Distribution (Subprocess Bundling)

For a detailed review, see the full [Packaging & Distribution Guide](file:///d:/Personal/orbitcore/MDs/03_DEPLOYMENT_INFRASTRUCTURE.md).

- **Executable Packaging**: Use `electron-builder` to package React assets, main/preload process scripts, and local focus assets into a standard Windows installer (`.exe`).
- **Python Freezing**: Use `PyInstaller` to freeze the Python monitoring script into a standalone binary inside the Electron package resources, eliminating user-side Python setup requirements.
- **AppData Convention**: Databases, logs, and custom user settings files reside strictly in the operating system's native folder (`%APPDATA%/orbitcore/` on Windows).

---

## 4. Code Quality & Readability Style

For a detailed review, see the full [Code Quality & Version Control Guide](file:///d:/Personal/orbitcore/MDs/04_CODE_QUALITY_VERSION_CONTROL.md).

- **Camel Case Naming**: Use camelCase for variables, function names, and cross-process API boundaries (e.g. `startFocusSession`, `createNewTask`).
- **Blank Lines spacing**: Include blank lines between logical stages of functions to keep logic blocks clear and readable.
- **Explanatory Comments**: Write clear comments describing the purpose of inter-process commands (JS stdio, Python process hooks) and database transactions.
- **Branch Layout**: Write code in feature branches (`feature/`) before merging into staging/main, following conventional commit syntax.

---

## 5. Monitoring & Diagnostic Observability

For a detailed review, see the full [Monitoring & Observability Guide](file:///d:/Personal/orbitcore/MDs/05_MONITORING_OBSERVABILITY.md).

- **Local Log File**: Write all startup configurations, SQLite logs, and unexpected exceptions to the local file `%APPDATA%/orbitcore/orbit_tracker.log`.
- **UI Error Boundaries**: Wrap the React component tree in standard React Error Boundary structures, logging layout or WebGL canvas exceptions via Electron's logging pipeline.
- **Subprocess Supervision**: Electron monitors Python’s stderr stream and tries to restart the process on crash up to 3 times.

---

## 6. Data Compliance & Privacy Rights

For a detailed review, see the full [Privacy & Compliance Guide](file:///d:/Personal/orbitcore/MDs/06_COMPLIANCE_LEGAL.md).

- **Data Ownership**: Maintain a complete local-only footprint. Users own their data entirely.
- **GDPR Rights Locally**: Implement "Export All Data" to JSON files (Portability) and "Purge Database" scripts (Right to be Forgotten).
- **Opt-in Tracking**: Window monitoring is strictly opt-in and operates only during an active Focus Mode session.

---

## 7. Testing Strategy (Isolated Mocking)

For a detailed review, see the full [Testing Strategy Guide](file:///d:/Personal/orbitcore/MDs/07_TESTING_STRATEGY.md).

- **SQLite Mocking**: Unit tests for Python database modules use SQLite `":memory:"` database connections.
- **Vitest & RTL**: Verify React layout modifications, task insertions, and analytics charts using mocked IPC channels.
- **Mock Stdio**: Electron main parser tests run assertions by passing fake JSON strings through simulated stdin streams.
