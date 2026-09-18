import React, { useState } from 'react';
import CollapsiblePanel from './CollapsiblePanel';

export default function DashboardView({ taskList, activeTask, isFocusActive, monitorUpdate, focusMessages, analyticsData }) {
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
                  type="text"
                  placeholder="What are you working on?"
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
                className="btn-primary w-full justify-center text-sm py-2.5"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Add Mission
              </button>
            </form>
          </CollapsiblePanel>

          {/* Task List Panel */}
          <CollapsiblePanel title="Active Tasks" icon="task_alt" badge={taskList.filter(t => !t.is_completed).length}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
              <input
                type="text"
                placeholder="Search missions..."
                className="input-premium text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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

            <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[450px]">
              {filteredTasks.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant p-8">
                  <span className="material-symbols-outlined text-4xl mb-3 opacity-50">done_all</span>
                  <p className="text-body-md text-center">No matching tasks found.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredTasks.map((task) => {
                    const isActive = activeTask && activeTask.id === task.id;
                    const PRIORITY_DOT = {
                      High: "var(--error)",
                      Medium: "var(--secondary)",
                      Low: "var(--primary)",
                    };
                    return (
                      <div
                        key={task.id}
                        onClick={() => openTaskDetails(task)}
                        className={`group cursor-pointer active:scale-[0.99] transition-all rounded-xl p-3.5 flex items-center justify-between border ${
                          isActive
                            ? "border-primary"
                            : "border-transparent hover:border-outline/20"
                        }`}
                        style={{
                          background: isActive
                            ? "var(--primary-container)"
                            : "var(--surface)",
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                          {/* Priority dot */}
                          <div
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? "animate-pulse" : ""}`}
                            style={{
                              background: PRIORITY_DOT[task.priority] || "var(--secondary)",
                            }}
                          />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className={`text-sm font-semibold truncate ${
                              isActive ? "text-primary font-bold" : "text-on-surface"
                            }`}>
                              {task.title}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: PRIORITY_DOT[task.priority] || "var(--secondary)" }}>{task.priority}</span>
                              <span className="text-[10px] text-on-surface-variant">·</span>
                              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">{task.type}</span>
                              {renderDeadlineBadge(task.deadline)}
                              {renderTags(task.tags)}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {isActive ? (
                            <>
                              <span className="text-[9px] bg-primary/20 text-primary px-2 py-1 rounded-md uppercase font-bold tracking-widest animate-pulse hidden sm:inline-block">Live</span>
                              <button
                                onClick={stopFocus}
                                title="Stop Focus"
                                className="bg-error-container text-on-error-container p-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">stop</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startFocus(task.id)}
                              title="Start Focus"
                              className="bg-primary-container text-primary hover:bg-primary hover:text-on-primary p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleCompleteTask(task.id)}
                            title="Complete"
                            className="bg-tertiary-container text-tertiary hover:bg-tertiary hover:text-on-tertiary p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
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
            <div className="flex flex-col gap-4">
              <div className="bg-surface p-4 rounded-xl border border-outline/10 flex gap-3">
                <span className="material-symbols-outlined text-secondary mt-0.5">trending_up</span>
                <div>
                  <p className="text-label-md font-bold text-on-surface">Peak Focus Time</p>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    {analyticsData?.insights?.peakHour != null 
                      ? `You are most productive around ${analyticsData.insights.peakHour}:00. Schedule complex missions then.` 
                      : 'Not enough data to determine peak focus time.'}
                  </p>
                </div>
              </div>
              
              <div className="bg-surface p-4 rounded-xl border border-outline/10 flex gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">info</span>
                <div>
                  <p className="text-label-md font-bold text-on-surface">Top Mission</p>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    {analyticsData?.insights?.topTask && analyticsData.insights.topTask !== 'None'
                      ? `You've spent the most time on "${analyticsData.insights.topTask}" today.`
                      : `No missions focused on yet today.`}
                  </p>
                </div>
              </div>

              <div className="bg-surface p-4 rounded-xl border border-outline/10 flex gap-3">
                <span className="material-symbols-outlined text-error mt-0.5">warning</span>
                <div>
                  <p className="text-label-md font-bold text-on-surface">Distractions</p>
                  <p className="text-body-sm text-on-surface-variant mt-1">
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
    </div>
  );
}
