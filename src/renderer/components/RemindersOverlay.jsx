import React, { useState, useEffect, useRef } from 'react';

export default function RemindersOverlay() {
  const [currentReminder, setCurrentReminder] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef(null);
  const dismissTimerRef = useRef(null);

  // Load all reminder files on mount
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    const loadReminders = async () => {
      try {
        // Fetch all reminder files from public/reminders/
        const reminderPromises = [];
        for (let i = 1; i <= 30; i++) {
          reminderPromises.push(
            fetch(`./reminders/${i}.txt`)
              .then(r => (r.ok ? r.text() : null))
              .catch(() => null) // Silently skip if file doesn't exist
          );
        }

        const loadedReminders = await Promise.all(reminderPromises);
        const validReminders = loadedReminders
          .filter(r => r !== null)
          .map(r => r.trim())
          .filter(r => r.length > 0 && !r.startsWith("<!DOCTYPE"));
        
        console.log(`✅ Loaded ${validReminders.length} reminders`);
        setReminders(validReminders);
      } catch (error) {
        console.error("Failed to load reminders:", error);
      }
    };

    loadReminders();
  }, []);

  // Start reminder timer when reminders are loaded
  useEffect(() => {
    if (reminders.length === 0) return;

    const scheduleNextReminder = () => {
      // Random interval between 5-15 minutes (in milliseconds)
      // INT8 means random tick from 0-255, multiply by some factor
      const int8Ticks = Math.floor(Math.random() * 256); // 0-255
      const intervalSeconds = 300 + (int8Ticks * 3); // 5 min + (0-765 sec) = 5-17.75 min
      const intervalMs = intervalSeconds * 1000;

      console.log(`📋 Next reminder in ${(intervalMs / 1000 / 60).toFixed(1)} minutes (${int8Ticks} ticks)`);

      timerRef.current = setTimeout(() => {
        // Pick random reminder
        const randomIndex = Math.floor(Math.random() * reminders.length);
        const selectedReminder = reminders[randomIndex];
        
        console.log(`🚀 Showing reminder: "${selectedReminder}"`);
        setCurrentReminder(selectedReminder);
        setIsVisible(true);

        // Auto-dismiss after 4 seconds
        dismissTimerRef.current = setTimeout(() => {
          setIsVisible(false);
          // Schedule next reminder after dismiss
          scheduleNextReminder();
        }, 4000);
      }, intervalMs);
    };

    scheduleNextReminder();

    // Cleanup
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(dismissTimerRef.current);
    };
  }, [reminders]);

  const handleDismiss = () => {
    setIsVisible(false);
    clearTimeout(dismissTimerRef.current);
  };

  if (!isVisible || !currentReminder) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-in-right">
      {/* Reminder Notification - styled like WhatsApp/Windows alert */}
      <div className="w-80 bg-surface-container border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
        
        {/* Header bar */}
        <div className="flex items-center justify-between h-12 bg-primary/20 px-4 border-b border-primary/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">lightbulb</span>
            <span className="text-label-sm font-bold text-primary uppercase tracking-wider">Reminder</span>
          </div>
          <button 
            onClick={handleDismiss}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-body-md font-semibold text-on-surface leading-relaxed">
            {currentReminder}
          </p>
        </div>

        {/* Progress bar (shows auto-dismiss timing) */}
        <div className="h-1 bg-primary/20">
          <div 
            className="h-full bg-primary"
            style={{
              animation: 'shrink 4s linear forwards'
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          0% { width: 100%; }
          100% { width: 0%; }
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in-right {
          animation: slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}
