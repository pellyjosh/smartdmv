
"use client";

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { hexToHslParts } from '@/lib/utils';

type Theme = 'light' | 'dark';

interface ThemeContextProps {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  primaryColor: string; // Stored as HEX
  setPrimaryColor: Dispatch<SetStateAction<string>>;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const DEFAULT_PRIMARY_COLOR_HEX = '#009eed';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [primaryColor, setPrimaryColor] = useState<string>(DEFAULT_PRIMARY_COLOR_HEX);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Load theme and primary color from localStorage on mount
    const storedTheme = localStorage.getItem('vetconnectpro-theme') as Theme | null;
    const storedPrimaryColor = localStorage.getItem('vetconnectpro-primary-color');

    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      // Fallback to system preference for initial theme if nothing stored
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }

    if (storedPrimaryColor) {
      setPrimaryColor(storedPrimaryColor);
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Apply theme class to HTML element
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('vetconnectpro-theme', theme);
  }, [theme, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    
    const primaryHslParts = hexToHslParts(primaryColor);
    if (primaryHslParts) {
      document.documentElement.style.setProperty('--primary', primaryHslParts);
      document.documentElement.style.setProperty('--ring', primaryHslParts);
      // Assuming sidebar primary/ring should also follow this main primary color
      document.documentElement.style.setProperty('--sidebar-primary', primaryHslParts);
      document.documentElement.style.setProperty('--sidebar-ring', primaryHslParts);
    }
    localStorage.setItem('vetconnectpro-primary-color', primaryColor);
  }, [primaryColor, isMounted]);

  if (!isMounted) {
    // Prevent rendering children until theme is loaded to avoid flash/hydration issues
    // You could return a loader here if preferred
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, primaryColor, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
