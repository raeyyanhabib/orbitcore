import React, { useState } from 'react';
import CollapsiblePanel from './CollapsiblePanel';
import AppSelectionModal from './AppSelectionModal.jsx';

export default function DashboardView({ taskList, tasksLoading, activeTask, isFocusActive, monitorUpdate, focusMessages, analyticsData, triggerToast }) {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState("One-Time");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskTags, setTaskTags] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [sortBy, setSortBy] = useState("created");
  const [selectedTask, setSelectedTask] = useState(null); // For Task Details view
  const [researchTips, setResearchTips] = useState(null);
  const [taskTimeBreakdown, setTaskTimeBreakdown] = useState(null);
  
  const [editingTargetApps, setEditingTargetApps] = useState(false);
  const [editTargetAppsValue, setEditTargetAppsValue] = useState("");

  const [showAppModal, setShowAppModal] = useState(false);
  const [pendingFocusTaskId, setPendingFocusTaskId] = useState(null);

  // Power-User Features: Multi-selection & Custom Desktop Context Menu
  const titleInputRef = React.useRef(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null);

  // Keyboard Navigation: Ctrl+N focuses task input, Escape dismisses menus
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (titleInputRef.current) {
          titleInputRef.current.focus();
        }
      }
      if (e.key === 'Escape') {
        if (contextMenu) setContextMenu(null);
        if (selectedTaskIds.size > 0) setSelectedTaskIds(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contextMenu, selectedTaskIds]);

  // Dismiss context menu on click outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) setContextMenu(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  const toggleSelectTask = (taskId, e) => {
    e.stopPropagation();
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.size === filteredTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const handleBatchComplete = () => {
    if (selectedTaskIds.size === 0) return;
    const ids = Array.from(selectedTaskIds);
    window.electronAPI.sendTaskAction("batchCompleteTasks", { taskIds: ids });
    triggerToast("success", `Completed ${ids.length} mission(s)`);
    setSelectedTaskIds(new Set());
  };

  const handleBatchDelete = () => {
    if (selectedTaskIds.size === 0) return;
    const ids = Array.from(selectedTaskIds);
    window.electronAPI.sendTaskAction("batchDeleteTasks", { taskIds: ids });
    triggerToast("success", `Deleted ${ids.length} mission(s)`);
    setSelectedTaskIds(new Set());
  };

  const handleTaskContextMenu = (e, task) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 240),
      task
    });
  };

  const handleStartFocusWithApps = (taskId) => {
    setPendingFocusTaskId(taskId);
    setShowAppModal(true);
  };

  const handleAppSelectionConfirm = ({ filterMode, allowedApps }) => {
    const appString = allowedApps.join(',');
    window.electronAPI.sendTaskAction("editTask", {
      taskId: pendingFocusTaskId,
      updates: { target_apps: appString }
    });
    
    setTimeout(() => {
      window.electronAPI.sendTaskAction("startFocus", { taskId: pendingFocusTaskId });
      setShowAppModal(false);
      setPendingFocusTaskId(null);
    }, 300);
  };

  const handleSaveTargetApps = () => {
    window.electronAPI.sendTaskAction("editTask", { 
      taskId: selectedTask.id, 
      updates: { target_apps: editTargetAppsValue } 
    });
    setEditingTargetApps(false);
  };

  React.useEffect(() => {
    window.electronAPI.onReceiveFromMain("research-complete", (data) => {
      if (selectedTask && data.taskId === selectedTask.id) {
        setResearchTips(data.tips);
      }
    });

    window.electronAPI.onReceiveFromMain("task-time-breakdown", (data) => {
      if (selectedTask && data.taskId === selectedTask.id) {
        setTaskTimeBreakdown(data);
      }
    });
  }, [selectedTask]);

  const handleCreateTask = (e) => {
    e.preventDefault();
    
    if (!taskTitle.trim()) {
      return;
    }

    let color = "#f0a36e";
    if (taskPriority === "High") color = "#ff6464";
    else if (taskPriority === "Low") color = "#6bd8cb";

    const parsedTags = taskTags ? JSON.stringify(taskTags.split(',').map(t => t.trim()).filter(Boolean)) : "[]";

    const payload = {
      title: taskTitle.trim(),
      description: "",
      priority: taskPriority,
      taskType: taskType,
      targetApps: "",
      color: color,
      intervalDays: 1,
      tags: parsedTags,
      notes: "",
      deadline: taskDeadline || null
    };

    if (window.electronAPI && window.electronAPI.sendTaskAction) {
      try {
        window.electronAPI.sendTaskAction("createTask", payload);
      } catch (error) {
        console.error("Failed to send createTask IPC:", error);
      }
    }

    setTaskTitle("");
    setTaskPriority("Medium");
    setTaskType("One-Time");
    setTaskDeadline("");
    setTaskTags("");
  };

  const handleCompleteTask = (taskId) => {
    window.electronAPI.sendTaskAction("completeTask", { taskId });
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(null);
    }
  };

  const handleDeleteTask = (taskId) => {
    window.electronAPI.sendTaskAction("deleteTask", { taskId });
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(null);
    }
  };

  const startFocus = (taskId) => {
    window.electronAPI.sendTaskAction("startFocus", { taskId });
  };

  const stopFocus = () => {
    window.electronAPI.sendTaskAction("stopFocus");
  };

  const openTaskDetails = (task) => {
    setSelectedTask(task);
    setResearchTips(null);
    setTaskTimeBreakdown(null);
    window.electronAPI.sendTaskAction("getResearch", { taskId: task.id });
    window.electronAPI.sendTaskAction("getTaskTimeBreakdown", { taskId: task.id });
  };

  // If a task is selected, show the Task Details view
  if (selectedTask) {
    const isThisTaskActive = activeTask && activeTask.id === selectedTask.id;
    return (
      <div className="w-full h-full pb-8 animate-fade-in relative">
        <button onClick={() => setSelectedTask(null)} className="mb-4 text-on-surface-variant hover:text-primary flex items-center gap-2 transition-colors cursor-pointer active:scale-95">
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="font-label-md font-semibold">Back to Dashboard</span>
        </button>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-headline-lg font-headline-lg font-bold text-on-surface tracking-tight">{selectedTask.title}</h2>
            <div className="flex gap-2 mt-2">
              <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded text-xs font-bold uppercase">{selectedTask.priority}</span>
              <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded text-xs font-bold uppercase">{selectedTask.type}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {!selectedTask.is_completed && (
              <button onClick={() => handleCompleteTask(selectedTask.id)} className="bg-tertiary-container hover:bg-tertiary text-on-tertiary-fixed px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-2 font-label-md cursor-pointer active:scale-95">
                <span className="material-symbols-outlined text-[20px]">check</span> Complete
              </button>
            )}
            <button onClick={() => handleDeleteTask(selectedTask.id)} className="bg-error-container hover:bg-error text-on-error-container px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-2 font-label-md cursor-pointer active:scale-95">
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          <div className="lg:col-span-2 flex flex-col gap-gutter">
            <div className="bg-surface-container rounded-2xl border border-outline/20 p-card-padding">
              <h3 className="text-headline-md font-headline-md font-semibold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">target</span> Focus Session
              </h3>
              
              {isThisTaskActive ? (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background/0 to-background/0 pulse-glow pointer-events-none"></div>
                  
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 z-10 animate-bounce">
                    <span className="material-symbols-outlined text-primary text-3xl">track_changes</span>
                  </div>
                  <h4 className="text-headline-md font-bold text-primary z-10">Focus Active</h4>
                  <p className="text-body-md text-on-surface-variant mb-6 text-center max-w-md z-10 mt-2">
                    Tracking active window focus. Stay focused on your target applications.
                  </p>
                  
                  {monitorUpdate && (
                    <div className="w-full bg-surface-variant/50 rounded-lg p-3 text-center z-10 mb-6 font-mono text-sm border border-outline/20">
                      <span className="text-on-surface-variant">Active Window: </span>
                      <span className={monitorUpdate.isOnTask ? "text-tertiary font-bold" : "text-error font-bold"}>
                        {monitorUpdate.appName} {monitorUpdate.isOnTask ? "(Focused)" : "(Distracted)"}
                      </span>
                    </div>
                  )}

                  <button onClick={stopFocus} className="bg-surface text-on-surface border border-outline/20 hover:bg-error hover:text-on-error hover:border-error px-6 py-2.5 rounded-xl transition-all font-label-md z-10 shadow-lg cursor-pointer active:scale-95">
                    Stop Focus
                  </button>
                </div>
              ) : (
                <div className="bg-surface border border-outline/20 rounded-xl p-6 flex flex-col items-center justify-center">
                  <p className="text-body-md text-on-surface-variant mb-6 text-center max-w-md">
                    Start a focus session to track your time and monitor distractions for this task.
                  </p>
                  <button onClick={() => startFocus(selectedTask.id)} className="bg-primary hover:bg-primary-fixed text-on-primary font-bold px-8 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95">
                    <span className="material-symbols-outlined">rocket_launch</span> Start Focus
                  </button>
                </div>
              )}
            </div>

            {/* Research Panel */}
            <div className="bg-surface-container rounded-2xl border border-outline/20 p-card-padding">
              <h3 className="text-headline-md font-headline-md font-semibold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">travel_explore</span> Research & Tips
              </h3>
              
              {researchTips ? (
                <div className="space-y-4">
                  <p className="text-body-md text-on-surface-variant">{researchTips.summary}</p>
                  {researchTips.actionableTips && (
                    <div className="bg-surface p-4 rounded-xl border border-outline/20">
                      <h4 className="text-label-md font-bold text-secondary mb-2 uppercase tracking-wider">Top Tips</h4>
                      <ul className="list-disc list-inside text-body-md text-on-surface-variant space-y-1">
                        {researchTips.actionableTips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {researchTips.bestPractices && (
                    <div className="bg-surface p-4 rounded-xl border border-outline/20">
                      <h4 className="text-label-md font-bold text-tertiary mb-2 uppercase tracking-wider">Best Practices</h4>
                      <ul className="list-disc list-inside text-body-md text-on-surface-variant space-y-1">
                        {researchTips.bestPractices.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center p-8 bg-surface rounded-xl border border-outline/20">
                  <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant animate-spin">sync</span>
                    <span className="text-on-surface-variant text-label-md">Gathering task tips...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-gutter">
            <div className="bg-surface-container rounded-2xl border border-outline/20 p-card-padding">
              <h3 className="text-headline-md font-headline-md font-semibold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant">tune</span> Task Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Priority</label>
                  <div className="bg-surface p-2 rounded-lg text-body-md text-on-surface border border-outline/20">{selectedTask.priority}</div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-label-sm font-label-sm text-on-surface-variant block">Target Applications</label>
                    {!editingTargetApps ? (
                      <button 
                        onClick={() => {
                          setEditTargetAppsValue(selectedTask.target_apps || "");
                          setEditingTargetApps(true);
                        }}
                        className="text-[10px] text-primary hover:text-primary-fixed uppercase font-bold tracking-wider cursor-pointer"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button 
                          onClick={handleSaveTargetApps}
                          className="text-[10px] text-tertiary hover:text-tertiary-fixed uppercase font-bold tracking-wider cursor-pointer"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setEditingTargetApps(false)}
                          className="text-[10px] text-on-surface-variant hover:text-on-surface uppercase font-bold tracking-wider cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {!editingTargetApps ? (
                    <div className="bg-surface p-2 rounded-lg text-body-md text-on-surface border border-outline/20 min-h-[40px]">
                      {selectedTask.target_apps || "Any (All activity tracked)"}
                    </div>
                  ) : (
                    <input 
                      type="text"
                      className="w-full bg-surface border border-primary text-on-surface font-body-md rounded-lg px-2 py-2 focus:outline-none"
                      value={editTargetAppsValue}
                      onChange={(e) => setEditTargetAppsValue(e.target.value)}
                      placeholder="e.g. code.exe,chrome.exe"
                      autoFocus
                    />
                  )}
                </div>

                <div>
                  <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1">Time Tracked</label>
                  {taskTimeBreakdown ? (
                    <div className="bg-surface p-3 rounded-lg border border-outline/20 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-tertiary font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-tertiary"></span> Focused:
                        </span>
                        <span className="font-mono text-on-surface font-semibold">
                          {Math.floor(taskTimeBreakdown.onTaskSeconds / 60)}m {taskTimeBreakdown.onTaskSeconds % 60}s
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-error font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-error"></span> Off-Task:
                        </span>
                        <span className="font-mono text-on-surface font-semibold">
                          {Math.floor(taskTimeBreakdown.offTaskSeconds / 60)}m {taskTimeBreakdown.offTaskSeconds % 60}s
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-surface p-3 rounded-lg border border-outline/20 text-xs text-on-surface-variant italic">
                      Fetching focus metrics...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper function for deadline badges
  const renderDeadlineBadge = (deadlineStr) => {
    if (!deadlineStr) return null;
    try {
      const dl = new Date(deadlineStr);
      const now = new Date();
      const diffMs = dl - now;
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      
      if (diffMs < 0) {
        return <span className="text-[10px] bg-error/20 text-error px-2 py-0.5 rounded font-bold uppercase">Overdue!</span>;
      }
      if (diffHours < 24) {
        return <span className="text-[10px] bg-secondary/20 text-secondary px-2 py-0.5 rounded font-bold uppercase">Due in {diffHours}h</span>;
      }
      const diffDays = Math.round(diffHours / 24);
      return <span className="text-[10px] bg-tertiary/20 text-tertiary px-2 py-0.5 rounded font-bold uppercase">Due in {diffDays}d</span>;
    } catch (e) {
      return null;
    }
  };

  const renderTags = (tagsStr) => {
    if (!tagsStr) return null;
    try {
      const arr = JSON.parse(tagsStr);
      if (!Array.isArray(arr) || arr.length === 0) return null;
      return arr.map((tag, idx) => (
        <span key={idx} className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
          #{tag}
        </span>
      ));
    } catch (e) {
      return null;
    }
  };

  const filteredTasks = taskList
    .filter(t => !t.is_completed)
    .filter(t => searchTerm === "" || t.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(t => filterPriority === "" || t.priority === filterPriority)
    .sort((a, b) => {
      if (sortBy === "priority") {
        const pMap = { High: 3, Medium: 2, Low: 1 };
        return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
      }
      if (sortBy === "dueDate") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      }
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

  // Dashboard View Main
  return (
    <div className="w-full h-full pb-8">
      {/* Header */}
      <div className="mb-8 mt-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-6 rounded-full" style={{ background: "var(--primary)" }} />
          <h2 className="text-2xl font-extrabold tracking-tight text-on-surface" style={{ letterSpacing: "-0.03em" }}>Dashboard</h2>
        </div>
        <p className="text-sm pl-4 text-on-surface-variant">Manage and track your active missions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter auto-rows-max max-w-7xl">
        <div className="lg:col-span-2 flex flex-col gap-gutter">
          
          {/* Create Task Form Panel */}
          <CollapsiblePanel title="Create Task" icon="add_circle">
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <input
                  ref={titleInputRef}
                  type="text"
                  placeholder="What are you working on? (Press Ctrl+N anywhere to focus)"
                  className="input-premium"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 items-center">
                <input
                  type="datetime-local"
                  title="Deadline"
                  className="input-premium text-xs col-span-1"
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Tags (coding, study...)"
                  className="input-premium text-xs"
                  value={taskTags}
                  onChange={(e) => setTaskTags(e.target.value)}
                />
                <select
                  className="input-premium text-xs cursor-pointer"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                >
                  <option value="High">🔴 High Priority</option>
                  <option value="Medium">🟠 Medium Priority</option>
                  <option value="Low">🟢 Low Priority</option>
                </select>
                <select
                  className="input-premium text-xs cursor-pointer"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                >
                  <option value="One-Time">One-Time</option>
                  <option value="Daily">Daily</option>
                  <option value="Recurring">Recurring</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn-primary w-full justify-center text-sm py-2.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Add Mission
              </button>
            </form>
          </CollapsiblePanel>

          {/* Task List Panel */}
          <CollapsiblePanel title="Active Tasks" icon="task_alt" badge={taskList.filter(t => !t.is_completed).length}>
            <div className="flex flex-col sm:flex-row items-center gap-2.5 mb-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs px-2.5 py-2 rounded-lg border border-outline/20 bg-surface hover:bg-surface-variant/30 text-on-surface-variant flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  title="Toggle select all tasks"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {selectedTaskIds.size > 0 && selectedTaskIds.size === filteredTasks.length
                      ? "check_box"
                      : selectedTaskIds.size > 0
                      ? "indeterminate_check_box"
                      : "check_box_outline_blank"}
                  </span>
                  <span className="hidden sm:inline">Select All</span>
                </button>
                <input
                  type="text"
                  placeholder="Filter missions..."
                  className="input-premium text-xs flex-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 w-full sm:w-auto ml-auto">
                <select
                  className="input-premium text-xs cursor-pointer"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                >
                  <option value="">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <select
                  className="input-premium text-xs cursor-pointer"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="created">Most Recent</option>
                  <option value="priority">By Priority</option>
                  <option value="dueDate">By Due Date</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[450px]">
              {tasksLoading ? (
                <div className="space-y-3 flex-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-surface rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant p-8">
                  <span className="material-symbols-outlined text-4xl mb-3 opacity-50">done_all</span>
                  <p className="text-body-md text-center">No matching tasks found.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {filteredTasks.map((task) => {
                    const isActive = activeTask && activeTask.id === task.id;
                    const isSelected = selectedTaskIds.has(task.id);
                    const PRIORITY_BADGE = {
                      High: {
                        color: "var(--error)",
                        icon: "error",
                        label: "HIGH",
                        bg: "bg-error/10 text-error"
                      },
                      Medium: {
                        color: "var(--secondary)",
                        icon: "warning",
                        label: "MED",
                        bg: "bg-secondary/10 text-secondary"
                      },
                      Low: {
                        color: "var(--primary)",
                        icon: "check_circle",
                        label: "LOW",
                        bg: "bg-primary/10 text-primary"
                      },
                    };
                    const badge = PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.Medium;

                    return (
                      <div
                        key={task.id}
                        onClick={() => openTaskDetails(task)}
                        onContextMenu={(e) => handleTaskContextMenu(e, task)}
                        className={`group cursor-pointer active:scale-[0.995] transition-all rounded-xl px-3 py-2.5 flex items-center justify-between border ${
                          isActive
                            ? "border-primary"
                            : isSelected
                            ? "border-primary/50 bg-primary/5"
                            : "border-outline/10 hover:border-outline/30 hover:bg-surface-variant/20"
                        }`}
                        style={{
                          background: isActive
                            ? "var(--primary-container)"
                            : isSelected
                            ? "var(--surface-container-high)"
                            : "var(--surface)",
                        }}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                          {/* Selection Checkbox */}
                          <div 
                            onClick={(e) => toggleSelectTask(task.id, e)} 
                            className="p-1 rounded hover:bg-surface-variant/50 transition-colors text-on-surface-variant flex items-center justify-center cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isSelected ? "check_box" : "check_box_outline_blank"}
                            </span>
                          </div>

                          {/* WCAG 2.1 AA Accessible Priority Badge */}
                          <div
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badge.bg}`}
                            title={`Priority: ${task.priority}`}
                          >
                            <span className="material-symbols-outlined text-[12px]">{badge.icon}</span>
                            <span>{badge.label}</span>
                          </div>

                          <div className="flex flex-col min-w-0 flex-1 ml-1">
                            <span className={`text-xs font-semibold truncate ${
                              isActive ? "text-primary font-bold" : "text-on-surface"
                            }`}>
                              {task.title}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[9px] text-on-surface-variant uppercase tracking-wider">{task.type}</span>
                              {renderDeadlineBadge(task.deadline)}
                              {renderTags(task.tags)}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {isActive ? (
                            <>
                              <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded uppercase font-bold tracking-widest animate-pulse hidden sm:inline-block">Live</span>
                              <button
                                onClick={stopFocus}
                                title="Stop Focus"
                                className="bg-error-container text-on-error-container p-1 rounded-lg transition-all cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">stop</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleStartFocusWithApps(task.id)}
                              title="Start Focus"
                              className="bg-primary-container text-primary hover:bg-primary hover:text-on-primary p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleCompleteTask(task.id)}
                            title="Complete Task"
                            className="bg-tertiary-container text-tertiary hover:bg-tertiary hover:text-on-tertiary p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CollapsiblePanel>
        </div>

        {/* Daily Insights Panel */}
        <div className="flex flex-col gap-gutter">
          <CollapsiblePanel title="Daily Insights" icon="lightbulb">
            <div className="flex flex-col gap-3">
              <div className="bg-surface p-3.5 rounded-xl border border-outline/10 flex gap-3">
                <span className="material-symbols-outlined text-secondary mt-0.5 text-lg">trending_up</span>
                <div>
                  <p className="text-label-md font-bold text-on-surface text-xs">Peak Focus Time</p>
                  <p className="text-body-sm text-on-surface-variant mt-0.5 text-xs">
                    {analyticsData?.insights?.peakHour != null 
                      ? `You are most productive around ${analyticsData.insights.peakHour}:00. Schedule complex missions then.` 
                      : 'Not enough data to determine peak focus time.'}
                  </p>
                </div>
              </div>
              
              <div className="bg-surface p-3.5 rounded-xl border border-outline/10 flex gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5 text-lg">info</span>
                <div>
                  <p className="text-label-md font-bold text-on-surface text-xs">Top Mission</p>
                  <p className="text-body-sm text-on-surface-variant mt-0.5 text-xs">
                    {analyticsData?.insights?.topTask && analyticsData.insights.topTask !== 'None'
                      ? `You've spent the most time on "${analyticsData.insights.topTask}" today.`
                      : `No missions focused on yet today.`}
                  </p>
                </div>
              </div>

              <div className="bg-surface p-3.5 rounded-xl border border-outline/10 flex gap-3">
                <span className="material-symbols-outlined text-error mt-0.5 text-lg">warning</span>
                <div>
                  <p className="text-label-md font-bold text-on-surface text-xs">Distractions</p>
                  <p className="text-body-sm text-on-surface-variant mt-0.5 text-xs">
                    {analyticsData?.insights?.distractionCount != null
                      ? `You've drifted off-task ${analyticsData.insights.distractionCount} times today.`
                      : `No distractions detected yet.`}
                  </p>
                </div>
              </div>
            </div>
          </CollapsiblePanel>
        </div>
      </div>

      {/* Floating Batch Action Toolbar */}
      {selectedTaskIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface-container-high border border-outline/30 px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in">
          <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
            <span className="px-2 py-0.5 rounded-full bg-primary-container text-primary font-mono text-[11px]">
              {selectedTaskIds.size}
            </span>
            <span>selected</span>
          </div>
          <div className="h-4 w-px bg-outline/20" />
          <button
            onClick={handleBatchComplete}
            className="flex items-center gap-1 text-xs font-bold text-tertiary hover:bg-tertiary/10 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Complete All
          </button>
          <button
            onClick={handleBatchDelete}
            className="flex items-center gap-1 text-xs font-bold text-error hover:bg-error/10 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            Delete All
          </button>
          <button
            onClick={() => setSelectedTaskIds(new Set())}
            className="text-xs text-on-surface-variant hover:text-on-surface px-2 py-1 transition-all cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* Desktop Right-Click Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-xl py-1.5 shadow-2xl border text-xs min-w-[190px] animate-fade-in backdrop-blur-md"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            background: "var(--surface-container-high)",
            borderColor: "var(--outline-variant)"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 font-bold truncate text-[11px] text-on-surface-variant border-b border-outline-variant/30 mb-1">
            {contextMenu.task.title}
          </div>
          <button
            onClick={() => {
              handleStartFocusWithApps(contextMenu.task.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-surface-variant/40 text-on-surface cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-primary">rocket_launch</span>
            Start Focus
          </button>
          <button
            onClick={() => {
              openTaskDetails(contextMenu.task);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-surface-variant/40 text-on-surface cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-secondary">tune</span>
            View Details
          </button>
          <button
            onClick={() => {
              handleCompleteTask(contextMenu.task.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-surface-variant/40 text-on-surface cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-tertiary">check_circle</span>
            Mark Complete
          </button>
          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(contextMenu.task.title);
                triggerToast("success", "Task title copied to clipboard");
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-surface-variant/40 text-on-surface cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-on-surface-variant">content_copy</span>
            Copy Title
          </button>
          <div className="border-t border-outline-variant/30 my-1" />
          <button
            onClick={() => {
              handleDeleteTask(contextMenu.task.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-error-container text-error cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            Delete Task
          </button>
        </div>
      )}

      {showAppModal && (
        <AppSelectionModal
          taskId={pendingFocusTaskId}
          onConfirm={handleAppSelectionConfirm}
          onCancel={() => { setShowAppModal(false); setPendingFocusTaskId(null); }}
        />
      )}
    </div>
  );
}
