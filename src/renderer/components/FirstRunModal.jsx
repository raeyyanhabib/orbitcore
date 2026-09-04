// src/renderer/components/FirstRunModal.jsx
// Welcome screen shown only on first app launch.
// Collects user name, age, and occupation to personalize research queries.

import React, { useState } from 'react';

const STANDARD_OCCUPATIONS = ["Student", "Professional", "Freelancer", "Other"];

export default function FirstRunModal({ onComplete }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("Student");
  const [customOccupation, setCustomOccupation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 = welcome, 1 = form

  const validate = () => {
    if (!name.trim()) {
      setError("Please enter your name.");
      return false;
    }
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      setError("Please enter a valid age between 13 and 120.");
      return false;
    }
    if (occupation === "Other" && !customOccupation.trim()) {
      setError("Please describe your occupation.");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setIsSubmitting(true);

    const finalOccupation = occupation === "Other" ? customOccupation.trim() : occupation;

    // Save all 4 settings via IPC
    window.electronAPI.sendTaskAction("saveSetting", { key: "userName", value: name.trim() });
    window.electronAPI.sendTaskAction("saveSetting", { key: "userAge", value: age });
    window.electronAPI.sendTaskAction("saveSetting", { key: "userOccupation", value: finalOccupation });
    window.electronAPI.sendTaskAction("saveSetting", { key: "firstRunComplete", value: "true" });

    // Small delay to ensure writes are flushed before closing
    setTimeout(() => {
      setIsSubmitting(false);
      onComplete();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-xl">
      {/* Ambient glow accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Glass card */}
        <div className="bg-surface-container border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header gradient bar */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-primary-fixed to-secondary" />

          {/* Content */}
          <div className="p-8">
            {currentStep === 0 ? (
              // Welcome screen
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary-container flex items-center justify-center shadow-[0_0_30px_rgba(107,216,203,0.3)]">
                  <span
                    className="material-symbols-outlined text-on-primary-container text-4xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    rocket_launch
                  </span>
                </div>
                <h2 className="text-headline-lg font-headline-lg font-bold bg-gradient-to-r from-primary to-primary-fixed bg-clip-text text-transparent mb-3">
                  Welcome to Orbit
                </h2>
                <p className="text-on-surface-variant text-body-md mb-2">
                  Your personal productivity command center.
                </p>
                <p className="text-on-surface-variant/70 text-label-sm mb-8">
                  Let's take 30 seconds to personalize your experience before launch.
                </p>

                <div className="grid grid-cols-3 gap-3 mb-8 text-center">
                  {[
                    { icon: "person", label: "Your Name" },
                    { icon: "school", label: "Your Field" },
                    { icon: "auto_awesome", label: "Smart Research" },
                  ].map((item) => (
                    <div key={item.label} className="bg-surface rounded-xl p-3 border border-white/5">
                      <span className="material-symbols-outlined text-primary text-xl block mb-1">{item.icon}</span>
                      <span className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider">{item.label}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentStep(1)}
                  className="w-full py-3.5 bg-gradient-to-r from-primary to-primary-fixed text-on-primary font-bold rounded-xl transition-all hover:shadow-[0_0_25px_rgba(107,216,203,0.5)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">arrow_forward</span>
                  Get Started
                </button>
              </div>
            ) : (
              // Form screen
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">person</span>
                  </div>
                  <div>
                    <h2 className="text-headline-md font-headline-md font-bold text-on-surface">
                      Your Profile
                    </h2>
                    <p className="text-label-sm text-on-surface-variant">Shapes your research context</p>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  {/* Name */}
                  <div>
                    <label className="text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider block mb-1.5">
                      What's your name?
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setError(""); }}
                      placeholder="e.g., Raeyyan"
                      className="w-full bg-surface border border-white/10 text-on-surface rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/40 text-body-md"
                      autoFocus
                    />
                  </div>

                  {/* Age */}
                  <div>
                    <label className="text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider block mb-1.5">
                      How old are you?
                    </label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => { setAge(e.target.value); setError(""); }}
                      placeholder="e.g., 20"
                      min={13}
                      max={120}
                      className="w-full bg-surface border border-white/10 text-on-surface rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/40 text-body-md"
                    />
                  </div>

                  {/* Occupation */}
                  <div>
                    <label className="text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider block mb-1.5">
                      What do you do?
                    </label>
                    <select
                      value={occupation}
                      onChange={(e) => { setOccupation(e.target.value); setError(""); }}
                      className="w-full bg-surface border border-white/10 text-on-surface rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors cursor-pointer text-body-md"
                    >
                      {STANDARD_OCCUPATIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>

                    {occupation === "Other" && (
                      <input
                        type="text"
                        value={customOccupation}
                        onChange={(e) => { setCustomOccupation(e.target.value); setError(""); }}
                        placeholder="e.g., Content Creator, Researcher..."
                        className="mt-2 w-full bg-surface border border-white/10 text-on-surface rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/40 text-body-md"
                        autoFocus
                      />
                    )}
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 bg-error-container/30 border border-error/20 rounded-xl px-4 py-3">
                      <span className="material-symbols-outlined text-error text-[18px]">error</span>
                      <span className="text-label-sm text-error">{error}</span>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-gradient-to-r from-primary to-primary-fixed text-on-primary font-bold rounded-xl transition-all hover:shadow-[0_0_25px_rgba(107,216,203,0.5)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:scale-100 disabled:cursor-wait flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">sync</span>
                        Initializing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">rocket_launch</span>
                        Launch Orbit
                      </>
                    )}
                  </button>
                </div>

                {/* Privacy note */}
                <p className="text-center text-[11px] text-on-surface-variant/50 mt-5 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  All data is stored locally on your device only.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-4">
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${currentStep === 0 ? 'bg-primary w-5' : 'bg-white/20'}`} />
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${currentStep === 1 ? 'bg-primary w-5' : 'bg-white/20'}`} />
        </div>
      </div>
    </div>
  );
}
