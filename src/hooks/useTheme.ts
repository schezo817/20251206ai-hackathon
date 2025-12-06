import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface UseThemeResult {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useTheme = (): UseThemeResult => {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('fatigue-care-theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    
    root.style.setProperty('--bg-primary', newTheme === 'dark' ? '#111827' : '#ffffff');
    root.style.setProperty('--bg-secondary', newTheme === 'dark' ? '#1f2937' : '#f9fafb');
    root.style.setProperty('--bg-tertiary', newTheme === 'dark' ? '#374151' : '#ffffff');
    root.style.setProperty('--text-primary', newTheme === 'dark' ? '#f9fafb' : '#111827');
    root.style.setProperty('--text-secondary', newTheme === 'dark' ? '#d1d5db' : '#4b5563');
    root.style.setProperty('--text-tertiary', newTheme === 'dark' ? '#9ca3af' : '#6b7280');
    root.style.setProperty('--border-color', newTheme === 'dark' ? '#374151' : '#e5e7eb');
    root.style.setProperty('--shadow-color', newTheme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)');
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('fatigue-care-theme', newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [theme, setTheme]);

  return {
    theme,
    toggleTheme,
    setTheme,
  };
};