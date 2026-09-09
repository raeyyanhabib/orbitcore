import React, { useState } from 'react';

export default function CollapsiblePanel({ title, icon, children, defaultOpen = true, badge = null }) {
  const storageKey = `orbit_panel_${title.toLowerCase().replace(/\s+/g, '_')}`;
  
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved !== null ? JSON.parse(saved) : defaultOpen;
  });

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="bg-surface-container rounded-2xl border border-outline-variant/30 overflow-hidden transition-all duration-300 shadow-lg mb-6">
      {/* Panel Header */}
      <button
        onClick={toggleOpen}
        type="button"
        className="w-full px-6 py-4 flex items-center justify-between bg-surface-container-high/40 hover:bg-surface-container-high/70 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center space-x-3">
          {icon && (
            <span className="material-symbols-outlined text-primary text-xl">
              {icon}
            </span>
          )}
          <h2 className="font-space font-bold text-lg text-on-surface">
            {title}
          </h2>
          {badge !== null && badge !== undefined && (
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
              {badge}
            </span>
          )}
        </div>

        <span
          className={`material-symbols-outlined text-on-surface-variant transition-transform duration-300 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Panel Body */}
      {isOpen && (
        <div className="p-6 transition-all duration-300">
          {children}
        </div>
      )}
    </div>
  );
}
