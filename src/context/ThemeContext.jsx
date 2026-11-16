import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'qp-theme';
const MODES = ['light', 'dark', 'system'];

const systemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

const readStoredMode = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(stored) ? stored : 'dark';
  } catch {
    return 'dark';
  }
};

export const ThemeProvider = ({ children }) => {
  // Dark is the product's default look — "system" only applies once the
  // trader picks it explicitly.
  const [mode, setMode] = useState(readStoredMode);

  const resolved = mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode;

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const isDark = mode === 'system' ? systemPrefersDark() : mode === 'dark';
      root.classList.toggle('dark', isDark);
      root.classList.toggle('light', !isDark);
      root.style.colorScheme = isDark ? 'dark' : 'light';
    };

    apply();
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* private mode — the theme just won't persist */
    }

    if (mode !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolved }}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside a ThemeProvider');
  return ctx;
};
