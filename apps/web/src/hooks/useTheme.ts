import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

type Theme = 'system' | 'light' | 'dark';

function getSystemPreference(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemPreference() : theme;
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(resolved);
  document.documentElement.setAttribute('data-theme', resolved);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getPreferences();
        const saved = data.preferences?.theme as Theme | undefined;
        if (saved) {
          setTheme(saved);
          applyTheme(saved);
        } else {
          applyTheme('dark');
        }
      } catch {
        applyTheme('dark');
      }
    })();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function onChange() {
      if (theme === 'system') applyTheme('system');
    }
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setAndPersistTheme = useCallback(async (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    try {
      await api.putPreferences({ theme: next });
    } catch {
      // Best effort
    }
  }, []);

  return { theme, setTheme: setAndPersistTheme };
}
