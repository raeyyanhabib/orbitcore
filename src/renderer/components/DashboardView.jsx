import React, { useState } from 'react';

export default function DashboardView({ taskList, activeTask, isFocusActive, monitorUpdate, focusMessages, analyticsData }) {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState("One-Time");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [selectedTask, setSelectedTask] = useState(null); // For Task Details view
  const [researchTips, setResearchTips] = useState(null);
  
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
  }, [selectedTask]);

  const handleCreateTask = (e) => {
    e.preventDefault();
    console.log("🎯 handleCreateTask called");
    console.log("Task title:", taskTitle);
    
    if (!taskTitle.trim()) {
      console.warn("❌ Title is empty, aborting");
      return;
    }

    let color = "#FFA500";
    if (taskPriority === "High") color = "#FF0000";
    else if (taskPriority === "Low") color = "#FFFF00";

    const payload = {
      title: taskTitle.trim(),
      description: "",
      priority: taskPriority,
      taskType: taskType,
      targetApps: "",
      color: color,
      intervalDays: 1,
      tags: "[]",
      notes: ""
    };

    console.log("📤 About to send to IPC:", payload);

    if (!window.electronAPI) {
      console.error("❌ window.electronAPI is UNDEFINED");
      return;
    }
    
    if (!window.electronAPI.sendTaskAction) {
      console.error("❌ sendTaskAction method is UNDEFINED");
      return;
    }

    try {
      window.electronAPI.sendTaskAction("createTask", payload);
      console.log("✅ sendTaskAction executed successfully");
    } catch (error) {
      console.error("❌ Exception in sendTaskAction:", error);
    }

    setTaskTitle("");
    setTaskPriority("Medium");
    setTaskType("One-Time");
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
    window.electronAPI.sendTaskAction("getResearch", { taskId: task.id });
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
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View Main
  return (
    <div className="w-full h-full pb-8">
      {/* Title */}
      <div className="mb-section-gap mt-4">
        <h2 className="text-headline-lg font-headline-lg font-bold text-on-surface tracking-tight">Dashboard</h2>
        <p className="text-body-md font-body-md text-on-surface-variant mt-1">Manage and track your active tasks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter auto-rows-max max-w-7xl">
        <div className="lg:col-span-2 flex flex-col gap-gutter">
          
          {/* Create Task Form */}
          <div className="bg-surface-container rounded-2xl border border-outline/20 p-card-padding relative overflow-hidden group focus-within:border-primary/50 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full group-focus-within:bg-primary/10 transition-colors pointer-events-none"></div>
            
            <form onSubmit={(e) => { console.log("Submit button clicked"); handleCreateTask(e); }} className="relative z-10 flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input 
                  type="text" 
                  placeholder="What are you working on?..." 
                  className="w-full bg-surface border border-outline/20 text-on-surface font-body-md rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
                  value={taskTitle}
                  onChange={(e) => {
                    console.log("Title input:", e.target.value);
                    setTaskTitle(e.target.value);
                  }}
                  required
                />
              </div>
              <div className="flex gap-2">
                <select 
                  className="bg-surface border border-outline/20 text-on-surface font-label-md rounded-xl px-3 py-3 focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <select 
                  className="bg-surface border border-outline/20 text-on-surface font-label-md rounded-xl px-3 py-3 focus:outline-none focus:border-primary transition-colors cursor-pointer hidden sm:block"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                >
                  <option value="One-Time">One-Time</option>
                  <option value="Daily">Daily</option>
                  <option value="Recurring">Recurring</option>
                </select>
                <button 
                  type="submit" 
                  className="bg-primary hover:bg-primary-fixed text-on-primary rounded-xl px-5 py-3 font-label-md font-bold transition-all cursor-pointer active:scale-95 shadow-md flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  <span className="hidden sm:inline">Add Task</span>
                </button>
              </div>
            </form>
          </div>

          {/* Task List */}
          <div className="bg-surface-container rounded-2xl border border-outline/20 overflow-hidden flex flex-col max-h-[500px]">
            <div className="p-4 border-b border-outline/20 flex justify-between items-center bg-surface-container/50">
              <h3 className="text-label-md font-bold text-on-surface uppercase tracking-wider">Active Tasks</h3>
              <span className="text-label-sm bg-surface px-2 py-1 rounded-md text-on-surface-variant border border-outline/20">{taskList.filter(t => !t.is_completed).length} Tasks</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {taskList.filter(t => !t.is_completed).length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant p-8">
                  <span className="material-symbols-outlined text-4xl mb-4 opacity-50">done_all</span>
                  <p className="text-body-md text-center">No active tasks. Add a task above to start tracking.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {taskList.filter(t => !t.is_completed).map((task) => {
                    const isActive = activeTask && activeTask.id === task.id;
                    return (
                      <div 
                        key={task.id} 
                        onClick={() => openTaskDetails(task)}
                        className={`group bg-surface hover:bg-surface-variant border border-outline/20 rounded-xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all hover:scale-[1.01] ${isActive ? 'ring-1 ring-primary shadow-[0_0_15px_rgba(107,216,203,0.15)]' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-primary animate-pulse shadow-[0_0_10px_rgba(107,216,203,0.8)]' : 'bg-surface-variant border border-outline/20 group-hover:bg-primary/50'}`}></div>
                          <div className="flex flex-col">
                            <span className={`text-body-md font-semibold transition-colors ${isActive ? 'text-primary' : 'text-on-surface group-hover:text-primary-fixed-dim'}`}>{task.title}</span>
                            <div className="flex gap-2 mt-1">
                              <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">{task.priority}</span>
                              <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-on-surface-variant/40"></span> {task.type}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isActive && <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded-md uppercase font-bold tracking-widest animate-pulse">Tracking</span>}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }}
                            className="text-on-surface-variant hover:text-tertiary p-2 rounded-lg hover:bg-tertiary/10 transition-colors cursor-pointer active:scale-90"
                          >
                            <span className="material-symbols-outlined">check_circle</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daily Insights Widget */}
        <div className="flex flex-col gap-gutter">
          <div className="bg-surface-container rounded-2xl border border-white/5 p-card-padding flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full group-hover:bg-secondary/10 transition-colors pointer-events-none"></div>
            
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-headline-md font-headline-md font-semibold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">lightbulb</span> Daily Insights
                </h3>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="bg-surface p-4 rounded-xl border border-white/5 flex gap-3">
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
                
                <div className="bg-surface p-4 rounded-xl border border-white/5 flex gap-3">
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

                <div className="bg-surface p-4 rounded-xl border border-white/5 flex gap-3">
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
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/5 flex justify-center">
              {/* Decorative SVG */}
              <svg width="120" height="40" viewBox="0 0 120 40" className="opacity-30">
                <path d="M0,20 Q15,5 30,20 T60,20 T90,20 T120,20" fill="none" stroke="#ec6a06" strokeWidth="2" strokeDasharray="4 2" />
                <circle cx="30" cy="20" r="3" fill="#ec6a06" />
                <circle cx="60" cy="20" r="4" fill="#ec6a06" className="animate-pulse" />
                <circle cx="90" cy="20" r="3" fill="#ec6a06" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
