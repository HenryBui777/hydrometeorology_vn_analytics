import React, { createContext, useContext, useEffect, useState } from 'react';

const AppearanceContext = createContext(null);
const stored = (key, fallback) => localStorage.getItem(key) || fallback;

export function AppearanceProvider({ children }) {
  const [theme, setTheme] = useState(() => stored('kttv-theme', 'light'));
  const [palette, setPalette] = useState(() => stored('kttv-palette', 'standard'));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.palette = palette;
    localStorage.setItem('kttv-theme', theme);
    localStorage.setItem('kttv-palette', palette);
  }, [theme, palette]);
  return <AppearanceContext.Provider value={{ theme, setTheme, palette, setPalette }}>{children}</AppearanceContext.Provider>;
}

export const useAppearance = () => {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error('useAppearance must be used inside AppearanceProvider');
  return value;
};
