# Orbit Task Tracker — Engineering & Best Practices Guide

This is the engineering companion to `themainMDfile.md` (product vision), `roadMaptocode.md` (build steps), and `thePRD.md` (requirements). Those documents say *what* to build. This one says *how to build it safely and sustainably*, scoped to what Orbit Task Tracker actually is:

> A single-user, **offline-first desktop app** — Electron + React + Three.js on the frontend, a Python subprocess for OS-level monitoring, and a local SQLite file for storage. No server, no accounts, no multi-tenancy, no cloud.

A generic "production engineering" checklist is mostly written for multi-tenant web SaaS — auth providers, Kubernetes, WAFs, GDPR data-processing agreements. Almost none of that applies here, and pretending it does would add complexity the project doesn't need. This guide keeps the *spirit* of that checklist (don't trust input, don't lose data, don't let errors go silent) but re-grounds every section in the files that already exist in this repo — `db.py`, `monitor.py`, `main.js`, `preload.js`, `App.jsx`, `OrbitView.jsx`. Where I noticed the current code already does the right thing, I've called that out explicitly. Where I noticed a gap between what the PRD promises and what the code currently does, I've flagged it as an actionable item rather than a hypothetical.

---

## Table of Contents

1. [Security & Process Isolation](#1-security--process-isolation)
2. [Performance & Resource Management](#2-performance--resource-management)
3. [Packaging, Build & Distribution](#3-packaging-build--distribution)
4. [Code Quality & Version Control](#4-code-quality--version-control)
5. [Logging & Observability (Local-Only)](#5-logging--observability-local-only)
6. [Privacy, Data Handling & Accessibility](#6-privacy-data-handling--accessibility)
7. [Error Handling Patterns](#7-error-handling-patterns)
8. [Testing Strategy](#8-testing-strategy)
9. [Development Workflow](#9-development-workflow)
10. [Pre-Release Checklist](#10-pre-release-checklist)

---

## 1. Security & Process Isolation

There's no login system here, and there shouldn't be — auth providers like Clerk/Auth0, RBAC, JWT rotation, all of that exists to answer "is this request allowed to see *this user's* data on a shared server." Orbit Task Tracker has exactly one user and one local file. The real security boundary is between three things that *do* run with different trust levels on the same machine: the Electron main process, the React renderer (which loads remote-feeling content like web research results), and the Python subprocess (which has real OS access — `win32gui`, `psutil`).

**What's already correct, keep it that way:**
- `createDashboardWindow()` and `createOrbitWindow()` in `main.js` both set `contextIsolation: true` and `nodeIntegration: false`. This is the single most important Electron security setting — it's what stops a compromised or malicious bit of rendered content from reaching `require()` and Node APIs directly.
- `preload.js` exposes a *whitelist*, not a passthrough: `sendTaskAction` checks `action` against `allowedActions` before forwarding to IPC, and `onReceiveFromMain` checks `channel` against `allowedChannels`. This is the correct shape for a `contextBridge` API — the renderer can never invoke an arbitrary IPC channel.
- `db.py` uses parameterized queries everywhere (`cursor.execute("... WHERE id = ?", (taskId,))`). Even though this is a local single-user DB with no remote attacker, keep doing this — it's also what prevents a task title containing a stray `'` from breaking a query.
- `spawnPythonSubprocess()` calls `spawn("python", [...])` with an argument array, not a shell string — no `shell: true`. Never change this to a string-concatenated shell command, even for a "quick" feature.

**Gaps to close:**
- `preload.js`'s `allowedActions` array does **not** include `"getResearch"` or `"exportLogs"` — but `DashboardView.jsx` calls `window.electronAPI.sendTaskAction("getResearch", { taskId: task.id })` and `AnalyticsView.jsx` calls `sendTaskAction("exportLogs")`. Both calls are silently dropped today (`console.warn` only) because the whitelist doesn't recognize them, and `monitor.py`'s `handleIncomingActions()` has no `elif action == "getResearch"` or `"exportLogs"` branch either. This means the "DuckDuckGo Web Research Tips" panel and the CSV export button are currently non-functional end to end. Fix both ends together — see [Section 9](#9-development-workflow) for why this exact class of bug keeps happening.
- Add a `<meta http-equiv="Content-Security-Policy">` to `index.html` restricting `script-src`/`connect-src` to `'self'`. The renderer never needs to load remote scripts, and DuckDuckGo research results are untrusted text rendered into the DOM — a strict CSP is a free safety net even though React already escapes JSX by default.
- Add a `webContents.on("will-navigate")` guard in `main.js` that blocks navigation away from the app's own `localhost:5173` / `dist/index.html` origin. Without it, a stray `<a href>` somewhere in rendered research content could navigate the whole window to an external site.
- `createNewTask()` in `db.py` has no server-side validation — `title` could be saved as an empty string if a future caller skips the HTML `required` attribute on the form. The PRD (§1.1 Validation Rules) says title is mandatory; enforce it in `db.py` itself, not just in `DashboardView.jsx`'s form, since `db.py` is the actual trust boundary (the React form is just one possible caller).
- Settings **import** (PRD §8.3, "Manual Import") reads an arbitrary JSON file the user points at. Validate its shape before calling `saveSetting` in a loop — a malformed or hand-edited file shouldn't be able to inject unexpected keys or oversized values into the `settings` table.

---

## 2. Performance & Resource Management

This app has two performance budgets that actually matter, both explicit in the PRD: **<150MB RAM in Orbit Mode** and **30 FPS** rendering. Neither is a "scale to a million users" problem — it's a "don't make a background desktop widget feel heavy" problem.

**SQLite & the `time_logs` table:**
`monitorFocusLoop()` in `monitor.py` writes one row to `time_logs` every 3 seconds *for the entire duration of every focus session*. That's ~1,200 rows/hour of continuous tracking. `createTables()` in `db.py` doesn't currently define any indexes beyond the implicit primary key, but `AnalyticsView.jsx` and any future "time spent per task" query will filter/aggregate by `task_id` and `timestamp`. Add:
```python
cursor.execute("CREATE INDEX IF NOT EXISTS idx_time_logs_task_id ON time_logs(task_id);")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_time_logs_timestamp ON time_logs(timestamp);")
```
The PRD (§8.2) also promises a configurable **data retention period (7–365 days, default 90)** — there's currently no code anywhere that prunes old rows, so the table grows forever as long as the app is used. Add a `pruneOldLogs(connection, retentionDays)` function to `db.py` and call it once on startup (in `setPaths` handling, right after `createTables`):
```python
def pruneOldLogs(connection, retentionDays=90):
    cursor = connection.cursor()
    cursor.execute(
        "DELETE FROM time_logs WHERE timestamp < datetime('now', ?)",
        (f"-{retentionDays} days",)
    )
    connection.commit()
```

**Three.js / Orbit Mode:**
The 30 FPS cap in `OrbitView.jsx`'s `renderLoop` (timestamp-delta throttling against `fpsInterval`) is the right pattern — keep it as the template for any future animation loop in this codebase. The scene-setup `useEffect` correctly depends on `[taskList]` only, while the sun's color update is a *separate*, cheaper `useEffect` keyed on `[isFocusActive, monitorUpdate]` — meaning a monitor tick every 3 seconds just recolors one material, it does **not** tear down and rebuild the whole WebGL scene. That separation is worth preserving deliberately as the codebase grows; it would be easy for a future change to accidentally merge those two effects and turn every monitor update into a full scene rebuild.
The existing cleanup function (disposing geometries/materials, removing the canvas, canceling the animation frame) on unmount is correct and should be copied verbatim for any new Three.js component.

**Mode-switching cost:**
`changeMode` handling in `main.js` is currently asymmetric: switching to Orbit Mode just `hide()`s the dashboard window, but switching back to Dashboard calls `orbitWindow.close()` and sets it to `null` — meaning the entire WebGL context, scene graph, and all planet meshes get torn down and rebuilt from scratch every single time the user toggles modes. For a feature explicitly pitched as "switch anytime" (themainMDfile.md), prefer `hide()` for both windows and only truly `close()` them on app shutdown. Rebuilding a WebGL context repeatedly over a long session is exactly the kind of thing that produces the "gets heavier over time" complaints users associate with Electron apps.

**Monitoring interval isn't actually configurable yet:**
The Settings UI in `App.jsx` already has a "Check Interval (Seconds)" input that calls `saveSetting("checkInterval", ...)`, and the PRD (§8.2) specifies it should be tunable 1–10 seconds. But `monitorFocusLoop()` in `monitor.py` hardcodes `time.sleep(3.0)` — it never reads the `checkInterval` setting back from the `settings` table. Right now changing that input does nothing. Wire it up: have `startFocus` read `getSettings(connection).get("checkInterval", 3)` and pass it into the loop.

---

## 3. Packaging, Build & Distribution

There's no server fleet to deploy to, so "Deployment & Infrastructure" becomes "how do we get a signed `.exe` onto a beta tester's machine." The roadmap already gets the dev/prod split right — keep extending that pattern rather than introducing Docker/Kubernetes concepts that don't apply.

- **Dev vs. packaged, already correct:** `main.js` branches on `app.isPackaged` in both `spawnPythonSubprocess()` (raw `python` interpreter vs. PyInstaller binary) and the window loaders (`localhost:5173` vs. `dist/index.html`). This *is* the project's environment-tiering system — there's no need for a third "staging" tier the way a web service would have, because there's no shared infrastructure to stage against. Two tiers, dev and packaged, are correct for this architecture.
- **Bundle Python, don't require it on the user's machine.** `thePRD.md`'s Dependencies section still lists "Python 3.10+ must be installed on system **or** bundled" — for an MVP shipped to non-developer beta testers (students, freelancers per the personas), bundling via PyInstaller is the only realistic option. `main.js` already expects a compiled binary at `process.resourcesPath/src/backend/dist/orbit_monitor/orbit_monitor.exe` in production — make sure the PyInstaller build step (`pyinstaller --onedir src/backend/monitor.py`) runs *before* `electron-builder` packages the app, and explicitly test that `win32gui`, `win32process`, `psutil`, and `winsound` all survive the freeze (pywin32 hidden imports are a classic PyInstaller gotcha — they often need `--hidden-import` flags or a hook file).
- **Code-sign both executables.** Sign the Electron `.exe` *and* the PyInstaller `orbit_monitor.exe` separately. An unsigned background process that reads the title of whatever window is currently focused is, behaviorally, indistinguishable from a keylogger to most antivirus heuristics — Windows Defender / SmartScreen flagging an unsigned spawned subprocess is a near-certain outcome otherwise, and it will look like a crash report from confused beta testers rather than what it actually is.
- **CI without a deploy step.** A GitHub Actions Windows runner can: install Node + Python deps → run `pytest` against `db.py`/`monitor.py` → run the JS test suite against the React components → run `electron-builder` to produce an installer artifact → attach it to a GitHub Release. There is no "deploy to production" step because there is no production server — the artifact *is* the release.

---

## 4. Code Quality & Version Control

The original guide's Git branching model (`feature/*`, `bugfix/*`, `refactor/*`, `docs/*`, `hotfix/*`) is language-agnostic and works fine here unchanged — keep it, but drop the "2 approvals required" framing, which assumes an engineering team larger than a solo/student project.

What *does* need to change is tooling, because this is genuinely a two-language codebase, not a single-stack one:

- **JS side:** ESLint + Prettier on `src/renderer/**` and `src/main/**`, as the original guide already recommends.
- **Python side (missing from the generic guide entirely):** `black` for formatting and `ruff` (or `flake8`) for linting on `db.py`/`monitor.py`. These two files are the actual OS-access and data-integrity layer of the app — they deserve the same linting rigor as the frontend, not less.
- **The highest-risk seam in this codebase is the IPC contract itself**, not either language individually. Three places have to agree with each other and currently don't, formally:
  1. `preload.js`'s `allowedActions` / `allowedChannels` arrays
  2. `monitor.py`'s `elif action == "..."` chain in `handleIncomingActions()`
  3. Every `window.electronAPI.sendTaskAction(...)` call scattered across `DashboardView.jsx`, `OrbitView.jsx`, `AnalyticsView.jsx`
  The `getResearch`/`exportLogs` mismatch in [Section 1](#1-security--process-isolation) exists *because* nothing checks these three lists against each other. Consider either (a) a single shared JSON file listing valid action names + expected payload keys, imported by both the JS whitelist and a Python validator, or (b) migrating the renderer to TypeScript so IPC payload shapes are at least checked at compile time on the JS side. Either is cheaper than the bug class it prevents.

---

## 5. Logging & Observability (Local-Only)

No Sentry, no DataDog, no centralized log aggregation — that infrastructure exists to answer "what's happening across our fleet of servers," and there is no fleet. What this app needs is a **reliable local log file** and a **subprocess that doesn't die silently**.

- **Already implemented, on both sides:** `monitor.py`'s `writeToLog()` and `main.js`'s `writeLog()` both append timestamped lines to a log file. Good instinct, but right now they're writing to the *same path* (`logFilePath`, set via the `setPaths` IPC action) from *two separate OS processes*. Concurrent `fs.appendFileSync` (Node) and `open(..., "a")` (Python) writes to one file aren't guaranteed atomic together on every filesystem, and Windows file locking can occasionally make one writer fail outright. Since the architecture already centralizes all DB writes in Python (a deliberate decision called out in `roadMaptocode.md`'s schema section, "to prevent write lock conflicts"), apply the same principle to logging: have Electron forward its log lines to Python over the existing stdin protocol (a new `"action": "logEntry"` message) instead of writing the file directly, so there's one writer.
- **Subprocess crash recovery is documented as a risk but not implemented.** `thePRD.md`'s risk table explicitly lists "Python subprocess crashes" → mitigation "Auto-restart mechanism." Today, `pyProcess.on("close", (code) => { writeLog(...) })` in `main.js` only *logs* the crash — it never respawns. Add a small backoff-restart wrapper: retry `spawnPythonSubprocess()` up to, say, 3 times within 60 seconds, and if it keeps dying, surface a persistent "Monitoring is offline" banner in `DashboardView.jsx` rather than retrying forever in silence.
- **The "Process Monitor Connected" indicator in `App.jsx` is currently decorative.** It's a hardcoded `<span className="bg-emerald-500 animate-pulse">` — always green, regardless of whether Python is actually alive. A cheap fix: have `monitor.py` emit a periodic `{"channel": "heartbeat"}` message (piggybacking on the existing `sendToElectron` helper), and have `App.jsx` flip that dot to gray/red if no heartbeat has arrived in, say, 10 seconds. This is this app's equivalent of an HTTP health check — no endpoint needed, just a heartbeat over the channel that already exists.

---

## 6. Privacy, Data Handling & Accessibility

Most of GDPR/CCPA simply doesn't apply here, and that's worth stating plainly rather than padding the doc with irrelevant legal boilerplate: there is no data controller/processor relationship, because there's no server collecting anyone's data. `thePRD.md`'s own design principles already commit to "Local-First" and "Privacy-First" — this section is about actually delivering on that commitment in the code, and being honest about the one place it leaks.

- **The features that *would* be "GDPR rights" on a SaaS product are, here, just normal product features the user benefits from directly:** Backup/Restore (export the whole DB to an encrypted JSON file), CSV export of time logs, "Clear Data while preserving settings" — all already specified in `thePRD.md` §8.4. Build them because they're useful, not because a regulator requires them; the user already owns the only copy of their data.
- **Window titles can contain sensitive text**, and they're logged every 3 seconds during a focus session. `monitorFocusLoop()` truncates the title to 60 characters *for the IPC broadcast* (`windowTitle[:60]`) — but the **full, untruncated** title is what actually gets written to SQLite via `db.logTimeSpent(connection, activeTask["id"], 3, isOnTask, appName, windowTitle)`, *before* that truncation happens. So the on-disk log retains more than what the UI ever shows. Decide deliberately whether that's intended (it's useful for accurate analytics) or whether it should be redacted/truncated before persistence too — right now the inconsistency between "displayed" and "stored" is accidental, not a chosen tradeoff.
- **The one real network call in an otherwise offline app:** `performWebResearch()` sends the task's title (and description, if provided) to DuckDuckGo as a search query. If a user names a task something personal, that string leaves the machine — the rest of the app never talks to the network at all. The PRD's "Research Toggle" setting (§8.2) is exactly the right mitigation; just make sure it's genuinely wired through to skip the `DDGS()` call entirely when off (not just hide the UI panel), and that the default state is explained during first-run rather than discovered later.
- **Accessibility (WCAG 2.1 AA) is explicitly in scope** per `thePRD.md`'s Constraints section, and the existing markup already gets the basics right — `DashboardView.jsx` uses real `<button>`, `<select>`, and `<input>` elements rather than clickable `<div>`s, which is the single most common accessibility mistake to avoid. One gap worth closing: priority and focus-status are currently communicated through color alone in places — the planet glow classes (`glow-green`/`glow-red`/`glow-yellow`/`glow-grey` in `index.css`) have no text or icon equivalent in `OrbitView.jsx`'s rendering, which fails WCAG's "don't rely on color alone" guidance for colorblind users. The Dashboard's task list already pairs color with a text priority label — extend that same pairing into Orbit Mode's tooltips.

---

## 7. Error Handling Patterns

There's no central API server catching every request in one place, so errors surface in three different processes, and each needs its own handling story.

- **Python (`monitor.py`, `db.py`):** Already wraps most logic in `try/except`, logs via `writeToLog("ERROR", ...)`, and prints tracebacks to `stderr` — which `main.js` then captures via `pyProcess.stderr.on("data", ...)` and writes into the same log. This chain works; keep using it for any new action handler.
- **Electron main (`main.js`):** The `JSON.parse(line)` call inside `outputReader.on("line", ...)` is already wrapped in `try/catch`, which matters — without it, one malformed line from Python would crash the entire main process. Apply the same defensiveness to `fs.mkdirSync` in `getStoragePaths()` and to the `sendActionToPython` write path, neither of which currently has error handling.
- **React renderer:** There is currently **no Error Boundary** anywhere in `App.jsx` or `main.jsx`. A single unhandled exception in `DashboardView.jsx`'s render (say, a task object missing an expected field) will blank the entire window with no recovery path short of force-quitting and relaunching. Wrap `<App />` in a top-level boundary:
```jsx
class AppErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) {
    window.electronAPI.writeLogEntry("ERROR", `Render crash: ${error.message}`);
  }
  render() {
    if (this.state.hasError) {
      return <div className="p-8 text-center text-gray-400">Something went wrong. Check the log file from Settings, or restart Orbit.</div>;
    }
    return this.props.children;
  }
}
```
- **Drop `alert()` for user-facing feedback.** `AnalyticsView.jsx`'s export handler calls `alert("Logs exported successfully...")` — this blocks the renderer thread and visually clashes with the rest of the glassmorphic UI (`FocusModeOverlay.jsx` already establishes the right pattern: a styled, non-blocking panel). Replace it with a small toast component once `exportLogs` is actually wired up end-to-end (see [Section 1](#1-security--process-isolation)).
- **No schema migrations exist.** `createTables()` only ever runs `CREATE TABLE IF NOT EXISTS` — there's no `ALTER TABLE` story. Any future column added to `tasks` or `time_logs` will silently never appear in an existing beta tester's already-created `orbit_tracker.db`, because `IF NOT EXISTS` means the table is never touched again once it exists once. Even a minimal versioned migration (`PRAGMA user_version` checked on startup, with a list of `ALTER TABLE` statements to run in order) will save real debugging time once the schema needs its first change post-launch.

---

## 8. Testing Strategy

The testing pyramid concept holds, but the layers map onto this app's two languages and the IPC seam between them, not onto "unit / integration / E2E for one HTTP API."

- **Python unit tests (`pytest`):** Turn the `if __name__ == "__main__":` self-test block at the bottom of `db.py` into real fixtures — it already exercises `createTables` → `createNewTask` → `getAllTasks` against a throwaway file and cleans up after itself, which is most of a pytest fixture already. Also worth a dedicated test: the on-task matching logic in `monitorFocusLoop()` (`appName in targetApps`, case-insensitive comma-split) — it's small, pure, and easy to get subtly wrong (e.g. trailing spaces, `.exe` casing) without a test catching it.
- **Watch for drift between the two Focus Mode message lists.** `FocusModeOverlay.jsx` hardcodes its own 14-entry `messageTemplates` array, while `thePRD.md` Appendix C describes a canonical 15-message library meant to live in `config/focus_messages.txt`, editable by the user. Right now these are two independent lists that happen to mostly overlap — if `focus_messages.txt` is ever implemented as the PRD describes, the React component needs to read from it rather than maintaining its own copy, or the two will quietly diverge every time one is edited and the other isn't.
- **JS component tests (Vitest / React Testing Library):** form validation in `DashboardView.jsx`, the raycaster-click → `selectedTask` mapping in `OrbitView.jsx` (mock `THREE.Raycaster.intersectObjects` rather than spinning up real WebGL in a test runner), and the chart-data shaping functions in `AnalyticsView.jsx`.
- **The IPC boundary itself is the highest-value integration test target.** Launch the real `monitor.py` as a subprocess inside a test, write scripted JSON lines to its `stdin`, and assert the JSON it writes back to `stdout` matches the expected shape for each action (`createTask` → `tasks-list` then later `research-complete`; `startFocus` → `focus-started` then repeated `monitor-update`). This is exactly the seam where the `getResearch`/`exportLogs` gap from [Section 1](#1-security--process-isolation) would have been caught immediately by a failing test, rather than by manual inspection.
- **E2E:** Playwright has official Electron support — launch the packaged app, create a task, start a focus session, and assert the Orbit Mode sun mesh's material color reaches green. This covers the PRD's actual Workflow 1–3 scenarios end-to-end across both windows, which is the level that matters most for a UI this visual.
- **The PRD's own stated risk** — "performance degradation with many tasks (100+)" — gives a concrete load test: seed the local DB with 200+ synthetic tasks via `db.py` directly, then confirm Orbit Mode still holds 30 FPS and the Dashboard's task list doesn't render all 200 DOM rows unvirtualized at once.

---

## 9. Development Workflow

This mirrors `roadMaptocode.md`'s actual instructions, not a generic `docker-compose up` flow, because there's no database container or backend server to bring up separately — Python *is* the backend, and it's spawned by Electron itself.

```powershell
# Terminal 1 — frontend dev server
npm run dev

# Terminal 2 — Electron, which auto-spawns the Python monitor subprocess
npm start
```

- **No `.env` file is needed**, which is unusual enough to call out: there are no API keys (DuckDuckGo's search package needs none), no database URL (the SQLite path is computed at runtime via `app.getPath("userData")`, not configured), and no JWT secret (nothing issues tokens). The only "environment" concern is dev-vs-packaged, which is already solved by the `app.isPackaged` branches in `main.js` — don't introduce a `.env` file just to mirror the generic guide; there's genuinely nothing to put in it yet.
- **PR checklist, trimmed to what's actually checkable here:**
  - [ ] If this touches an IPC action or channel, were `preload.js`'s whitelist arrays, `monitor.py`'s handler chain, *and* every renderer call site updated together?
  - [ ] If this adds/renames a SQLite column, is there a migration path, or will it silently no-op for already-created databases (see [Section 7](#7-error-handling-patterns))?
  - [ ] If this changes Orbit Mode rendering, does it still respect the 30 FPS cap and dispose its geometries/materials on cleanup?
  - [ ] If this changes the Dashboard UI, does it look correct in both the dark theme that exists today and the light theme the PRD promises (§8.1) but isn't implemented yet?
- **Keep the four project docs pointing at each other.** New contributors (or future-you, six weeks from now) benefit from knowing which doc answers which question: *what should this feature do* → `themainMDfile.md`; *what order do I build things in* → `roadMaptocode.md`; *why does this work this way, what's the exact spec* → `thePRD.md`; *how do I make a change without breaking something* → this guide.

---

## 10. Pre-Release Checklist

`thePRD.md` already has a real beta plan — 20–30 testers (10 students, 10 developers, 5–10 others), 4 weeks, weekly surveys, a Discord server (§"Beta Testing Plan"). This checklist supports *that* launch, not a cloud rollout — there's no staging environment to deploy to first, no traffic to ramp with canary/blue-green, and no fleet to roll back; there is one installer, and it either works on a clean machine or it doesn't.

**Before sending the installer to beta testers:**
- [ ] Build and sign the installer, then test it on a **clean** Windows 10 and Windows 11 VM with no dev tools installed — this is the only reliable way to catch a missing PyInstaller hidden import (`pywin32` hooks are the classic failure mode) before a tester hits it.
- [ ] Confirm `orbit_tracker.db` is created correctly under `%APPDATA%` on first launch, with no leftover dev-machine paths hardcoded anywhere.
- [ ] Confirm `orbit_tracker.log` doesn't grow unbounded — this app runs for weeks as a background widget; add a basic size cap or rotation now rather than after a tester's disk fills up.
- [ ] Manually verify the Settings export → import round-trip actually restores state, not just that it doesn't error.
- [ ] Manually verify "Privacy Mode" (PRD §8.5) actually halts monitoring — confirm by checking that no new `time_logs` rows are written while it's on, don't just trust the toggle's label.
- [ ] Confirm the `getResearch` / `exportLogs` IPC gap from [Section 1](#1-security--process-isolation) is closed — both are core demo paths beta testers will hit in their first five minutes.

**During the 4-week beta:**
- [ ] Watch GitHub Issues / Discord manually for crash reports — by design there's no telemetry pipeline (consistent with the privacy-first principle), so this is a deliberate tradeoff to communicate to testers up front, not a gap to apologize for.
- [ ] Track the PRD's actual success metrics (§"Success Metrics & KPIs"): 30-day retention, on-task percentage improvement, feature adoption across the three display modes.

**Public launch (per `thePRD.md`'s Launch Communication plan):**
- [ ] Product Hunt / Hacker News / r/productivity / r/studentlounge — a single dated release, not a phased traffic rollout.
- [ ] Have the "How We Built a Productivity App That Makes Task Management Visual" writeup ready, since that's the stated launch content angle.

---

## Summary

For a project this shape, engineering discipline means:

1. **Trust boundaries**, not auth — there's no login, but Electron's process isolation (`contextIsolation`, the `preload.js` whitelist) is exactly as important as auth would be elsewhere.
2. **The IPC contract is the seam that breaks first** — every concrete bug found while writing this guide (`getResearch`, `exportLogs`, the unread `checkInterval` setting) lived at the boundary between Python, Electron, and React agreeing on what a message means.
3. **Local reliability over cloud observability** — a log file that one process owns and a subprocess that restarts itself beats any dashboard, because there is no fleet to put a dashboard in front of.
4. **Privacy-by-architecture, with one honest exception** — this app is offline-first by design, and the one network call (DuckDuckGo research) deserves to be exactly as visible and toggle-able as the PRD already promises.
5. **Ship a `.exe`, not a deploy** — the release unit is a signed installer tested on a clean VM, not a staged rollout across servers that don't exist.

This is a living document the same way `thePRD.md` is — update it as the actual gaps above get closed, and as new ones get found the same way: by reading the code against what the product docs promise.
