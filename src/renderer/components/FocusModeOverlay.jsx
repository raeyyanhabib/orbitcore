// src/renderer/components/FocusModeOverlay.jsx
// Renders the playful distraction alert modal when the user accesses non-approved apps in Focus Mode.

import React, { useState, useEffect } from "react";


export default function FocusModeOverlay({ activeTask, monitorUpdate, onDismiss, onPauseFocus, focusMessages }) {
  
  // 1. Curated fallback list of playful distraction reminders matching focusModemsgs.txt
  const fallbackTemplates = [
    "Psst! Still working on [TASK_NAME]?",
    "[APP_NAME]? Really? I thought you were focused 👀",
    "Hey, you've got [TASK_NAME] to do!",
    "The task is calling... 📞",
    "Plot twist: You were supposed to be doing [TASK_NAME]",
    "Quick check: Was [APP_NAME] on your approved list? 🤔",
    "[TASK_NAME] is waiting for you ⏰",
    "I see what you did there... [APP_NAME] instead of [TASK_NAME] 😏",
    "Task focus energy: ON | [APP_NAME] browsing: DETECTED",
    "Your task didn't distract itself! 👋",
    "POV: You meant to do [TASK_NAME]",
    "Error 404: Focus not found... let's get back to [TASK_NAME]! 💪",
    "[APP_NAME] is fun, but [TASK_NAME] completion is funner",
    "Is this the end of your [TASK_NAME] journey? Not yet!"
  ];

  const [activeMessage, setActiveMessage] = useState("");

  // 2. Select a random template and resolve placeholders [TASK_NAME] and [APP_NAME]
  useEffect(() => {
    if (!monitorUpdate) return;

    // Use custom focus messages from focusModemsgs.txt if loaded, otherwise fall back to templates
    const templatesToUse = focusMessages && focusMessages.length > 0 ? focusMessages : fallbackTemplates;
    
    // Choose a random index from the templates array
    const randomIndex = Math.floor(Math.random() * templatesToUse.length);
    const selectedTemplate = templatesToUse[randomIndex];

    const taskName = activeTask ? activeTask.title : "your task";
    const appName = monitorUpdate.appName || "another app";

    // Replace template parameters
    const formatted = selectedTemplate
      .replace("[TASK_NAME]", taskName)
      .replace("[APP_NAME]", appName);

    // Update active message state to render
    setActiveMessage(formatted);

  }, [monitorUpdate, focusMessages]);


  if (!monitorUpdate || monitorUpdate.isOnTask) {
    return null;
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-space-900/90 backdrop-blur-md p-4 animate-fade-in">
      
      {/* Alert glassmorphic panel console */}
      <div className="w-full max-w-md glass-panel p-6 rounded-2xl shadow-2xl border-t border-rose-500/30 text-center space-y-6">
        
        {/* Warning graphic indicator */}
        <div className="mx-auto w-16 h-16 rounded-full bg-rose-600/10 border border-rose-500 flex items-center justify-center text-2xl animate-pulse text-rose-500">
          ⚠️
        </div>

        {/* Message container */}
        <div className="space-y-2">
          
          <h3 className="text-lg font-bold text-rose-400 font-space tracking-wider">
            FOCUS DETOUR DETECTED
          </h3>
          
          <p className="text-sm text-gray-300 italic px-4 leading-relaxed">
            "{activeMessage}"
          </p>

        </div>

        {/* Informative details */}
        <div className="bg-space-900/60 rounded-xl p-3 border border-gray-800 text-xs text-left space-y-1 font-mono">
          <div className="flex justify-between">
            <span className="text-gray-500">Running Task:</span>
            <span className="text-indigo-400 font-semibold">{activeTask?.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Active Windows:</span>
            <span className="text-rose-400 font-semibold">{monitorUpdate.appName}</span>
          </div>
        </div>

        {/* Action button toggles */}
        <div className="flex flex-col space-y-2">
          
          <button 
            onClick={onDismiss}
            className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white rounded-lg text-sm font-semibold transition"
          >
            🎯 Back to Focus
          </button>
          
          <button 
            onClick={onPauseFocus}
            className="w-full py-2 text-gray-400 hover:text-white text-xs transition"
          >
            Pause tracking session
          </button>

        </div>

      </div>

    </div>
  );
}
