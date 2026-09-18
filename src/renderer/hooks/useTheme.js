// src/renderer/hooks/useTheme.js
import { useEffect } from 'react';
import THEMES from '../themes';

export function useTheme(themeName, setThemeName) {
  useEffect(() => {
    const savedTheme = localStorage.getItem('orbitcore-theme-name') || 'dark-teal';
    setThemeName(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (name) => {
    const theme = THEMES[name];
    if (!theme) return;

    // Set data attribute and class for light/dark mode
    document.documentElement.setAttribute('data-theme', theme.mode);
    document.documentElement.className = theme.mode;

    // Apply all CSS variables from theme
    const root = document.documentElement.style;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.setProperty(`--${key}`, value);
    });

    // Save preference
    localStorage.setItem('orbitcore-theme-name', name);
    setThemeName(name);
  };

  return { applyTheme };
}
