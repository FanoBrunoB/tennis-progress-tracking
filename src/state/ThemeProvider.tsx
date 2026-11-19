import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { getSeasonTheme, themes, type Season, type Theme } from '../domain/theme';

interface ThemeContextValue {
  theme: Theme;
  override: Season | null;
  setOverride(value: Season | null): void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(new Date());
  const [override, setOverride] = useState<Season | null>(null);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') setNow(new Date()); });
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, []);
  return <ThemeContext.Provider value={{ theme: override ? themes[override] : getSeasonTheme(now), override, setOverride }}>{children}</ThemeContext.Provider>;
}
export function useSeasonTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('ThemeProvider is missing.');
  return value;
}
