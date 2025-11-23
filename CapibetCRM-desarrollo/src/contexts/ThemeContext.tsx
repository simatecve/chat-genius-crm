'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Cargar tema desde localStorage al inicializar
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
      setTheme(savedTheme);
    } else {
      // Si no hay tema guardado, usar el tema del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    // Aplicar tema al documento
    document.documentElement.setAttribute('data-theme', theme);
    
    // Guardar en localStorage
    localStorage.setItem('theme', theme);
    
    // Aplicar variables CSS según el tema
    const root = document.documentElement;
    
    if (theme === 'dark') {
      // Tema oscuro
      root.style.setProperty('--bg-primary', '#1A1D23');
      root.style.setProperty('--bg-secondary', '#2A2D35');
      root.style.setProperty('--bg-tertiary', '#3A3D45');
      root.style.setProperty('--text-primary', '#FFFFFF');
      root.style.setProperty('--text-secondary', '#E5E7EB');
      root.style.setProperty('--text-muted', '#9CA3AF');
      root.style.setProperty('--border-primary', '#3A3D45');
      root.style.setProperty('--border-secondary', '#4B5563');
      root.style.setProperty('--accent-primary', '#F29A1F');
      root.style.setProperty('--accent-hover', '#F29A1F');
      root.style.setProperty('--success', '#10B981');
      root.style.setProperty('--warning', '#F59E0B');
      root.style.setProperty('--error', '#EF4444');
      root.style.setProperty('--info', '#3B82F6');
    } else {
      // Tema claro
      root.style.setProperty('--bg-primary', '#FFFFFF');
      root.style.setProperty('--bg-secondary', '#F9FAFB');
      root.style.setProperty('--bg-tertiary', '#F3F4F6');
      root.style.setProperty('--text-primary', '#111827');
      root.style.setProperty('--text-secondary', '#374151');
      root.style.setProperty('--text-muted', '#6B7280');
      root.style.setProperty('--border-primary', '#E5E7EB');
      root.style.setProperty('--border-secondary', '#D1D5DB');
      root.style.setProperty('--accent-primary', '#F29A1F');
      root.style.setProperty('--accent-hover', '#F29A1F');
      root.style.setProperty('--success', '#10B981');
      root.style.setProperty('--warning', '#F59E0B');
      root.style.setProperty('--error', '#EF4444');
      root.style.setProperty('--info', '#3B82F6');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
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
