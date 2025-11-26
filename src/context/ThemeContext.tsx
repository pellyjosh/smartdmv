
"use client";

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { hexToHslParts } from '@/lib/utils';

type Theme = 'light' | 'dark';
type Appearance = 'light' | 'dark' | 'system';
type ThemeVariant = 'professional' | 'tint' | 'vibrant';

interface ThemeContextProps {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  appearance: Appearance;
  setAppearance: Dispatch<SetStateAction<Appearance>>;
  variant: ThemeVariant;
  setVariant: Dispatch<SetStateAction<ThemeVariant>>;
  radius: number;
  setRadius: Dispatch<SetStateAction<number>>;
  primaryColor: string;
  setPrimaryColor: Dispatch<SetStateAction<string>>;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const DEFAULT_PRIMARY_COLOR_HEX = '#009eed';
const DEFAULT_VARIANT: ThemeVariant = 'professional';
const DEFAULT_RADIUS = 0.5;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>('system');
  const [theme, setTheme] = useState<Theme>('light');
  const [variant, setVariant] = useState<ThemeVariant>(DEFAULT_VARIANT);
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS);
  const [primaryColor, setPrimaryColor] = useState<string>(DEFAULT_PRIMARY_COLOR_HEX);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const storedAppearance = localStorage.getItem('vetconnectpro-appearance') as Appearance | null;
    const storedTheme = localStorage.getItem('vetconnectpro-theme') as Theme | null;
    const storedPrimaryColor = localStorage.getItem('vetconnectpro-primary-color');
    const storedVariant = localStorage.getItem('vetconnectpro-theme-variant') as ThemeVariant | null;
    const storedRadius = localStorage.getItem('vetconnectpro-radius');

    if (storedAppearance) {
      setAppearance(storedAppearance);
    } else if (storedTheme) {
      setAppearance(storedTheme);
    } else {
      setAppearance('system');
    }

    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }

    if (storedPrimaryColor) {
      setPrimaryColor(storedPrimaryColor);
    }

    if (storedVariant) {
      setVariant(storedVariant);
    }

    if (storedRadius) {
      const parsed = parseFloat(storedRadius);
      if (!Number.isNaN(parsed)) setRadius(parsed);
    }

    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    localStorage.setItem('vetconnectpro-appearance', appearance);

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effectiveTheme: Theme = appearance === 'system' ? (prefersDark ? 'dark' : 'light') : appearance;
    setTheme(effectiveTheme);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (appearance === 'system') {
        const nextTheme: Theme = media.matches ? 'dark' : 'light';
        setTheme(nextTheme);
      }
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [appearance, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
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
      document.documentElement.style.setProperty('--sidebar-primary', primaryHslParts);
      document.documentElement.style.setProperty('--sidebar-ring', primaryHslParts);
      const rgb = hexToRgbParts(primaryColor);
      if (rgb) {
        document.documentElement.style.setProperty('--primary-rgb', rgb);
      }
    }
    localStorage.setItem('vetconnectpro-primary-color', primaryColor);
  }, [primaryColor, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    document.documentElement.setAttribute('data-theme-variant', variant);
    localStorage.setItem('vetconnectpro-theme-variant', variant);
  }, [variant, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    document.documentElement.style.setProperty('--radius', `${radius}rem`);
    localStorage.setItem('vetconnectpro-radius', String(radius));
  }, [radius, isMounted]);

  const contextValue = useMemo(() => ({
    theme,
    setTheme: (next: Theme | ((prev: Theme) => Theme)) => {
      const value = typeof next === 'function' ? (next as (prev: Theme) => Theme)(theme) : next;
      setAppearance(value);
      setTheme(value);
    },
    appearance,
    setAppearance,
    variant,
    setVariant,
    radius,
    setRadius,
    primaryColor,
    setPrimaryColor,
  }), [theme, appearance, variant, radius, primaryColor]);

  if (!isMounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
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

function hexToRgbParts(hex: string): string | null {
  if (!hex || !hex.startsWith('#')) return null;
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  } else {
    return null;
  }
  return `${r}, ${g}, ${b}`;
}
