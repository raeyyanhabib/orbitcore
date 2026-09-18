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
    <div className="overflow-hidden transition-all duration-300 mb-5 rounded-2xl bg-surface-container text-on-surface">
      {/* Panel Header */}
      <button
        onClick={toggleOpen}
        type="button"
        className="w-full px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer select-none"
        style={{
          background: isOpen ? "var(--surface-container-high)" : "transparent",
        }}
      >
        <div className="flex items-center gap-2.5">
          {icon && (
            <span
              className="material-symbols-outlined text-[18px] text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {icon}
            </span>
          )}
          <h2 className="font-bold text-sm tracking-tight text-on-surface">
            {title}
          </h2>
          {badge !== null && badge !== undefined && (
            <span className="px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider bg-primary-container text-on-primary-container">
              {badge}
            </span>
          )}
        </div>

        <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 text-on-surface-variant ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
          expand_more
        </span>
      </button>

      {/* Panel Body */}
      {isOpen && (
        <div className="p-5 transition-all duration-300">
          {children}
        </div>
      )}
    </div>
  );
}
