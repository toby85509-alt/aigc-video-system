import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { AppContextType, ThemeMode } from '../types';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const toast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{ toast, theme, toggleTheme }}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none',
        }}>
          {toasts.map(t => (
            <div
              key={t.id}
              className={`toast toast-${t.type} animate-slide-in-right`}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 20px',
                borderRadius: 'var(--radius)',
                background: t.type === 'success' ? 'var(--success)' :
                           t.type === 'error' ? 'var(--danger)' :
                           t.type === 'warning' ? 'var(--warning)' : 'var(--primary)',
                color: '#fff',
                fontWeight: 500,
                fontSize: '14px',
                boxShadow: 'var(--shadow-lg)',
                cursor: 'pointer',
                maxWidth: '380px',
                animation: 'slideInRight 0.3s ease',
              }}
              onClick={() => dismissToast(t.id)}
            >
              <span style={{ fontSize: '18px', flexShrink: 0 }}>
                {t.type === 'success' ? '\u2713' : t.type === 'error' ? '\u2715' : t.type === 'warning' ? '\u26A0' : '\u2139'}
              </span>
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function useToast() {
  const { toast } = useApp();
  return toast;
}
