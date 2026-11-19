import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { createLocalRepository, type Change, type Repository } from '../data/repository';
import { demoData } from '../data/demo';
import { emptyDatabase, type Collection, type Database, type RecordMeta } from '../domain/models';
import { type Season, type Theme } from '../domain/theme';
import { useSeasonTheme } from './ThemeProvider';

export const newMeta = (): RecordMeta => {
  const now = new Date().toISOString();
  return { id: randomUUID(), createdAt: now, updatedAt: now };
};
export const newId = randomUUID;
interface AppContextValue {
  data: Database;
  ready: boolean;
  error?: string;
  clearError(): void;
  reload(): Promise<void>;
  commit(changes: Change[]): Promise<boolean>;
  theme: Theme;
  override: Season | null;
  setOverride(value: Season | null): void;
  toggleDemo(enabled: boolean): Promise<boolean>;
  toast?: { text: string; undo?: () => Promise<void> };
  notify(text: string, undo?: () => Promise<void>): void;
}
const AppContext = createContext<AppContextValue | null>(null);
export const localRepository = createLocalRepository(AsyncStorage);
export function AppProvider({ children, repository = localRepository }: { children: React.ReactNode; repository?: Repository }) {
  const [data, setData] = useState(emptyDatabase);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  const { theme, override, setOverride } = useSeasonTheme();
  const [toast, setToast] = useState<AppContextValue['toast']>();
  const reload = useCallback(async () => {
    try { setData(await repository.read()); setError(undefined); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load your data.'); }
    finally { setReady(true); }
  }, [repository]);
  useEffect(() => {
    let active = true;
    repository.read().then(value => { if (active) { setData(value); setError(undefined); } }, e => {
      if (active) setError(e instanceof Error ? e.message : 'Could not load your data.');
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [repository]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void reload(); });
    return () => listener.remove();
  }, [reload]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(undefined), 7000);
    return () => clearTimeout(timer);
  }, [toast]);
  const commit = useCallback(async (changes: Change[]) => {
    try {
      await repository.commit(changes);
      setData(await repository.read());
      setError(undefined);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your changes.');
      return false;
    }
  }, [repository]);
  const toggleDemo = async (enabled: boolean) => {
    const changes: Change[] = [];
    for (const collection of Object.keys(data) as Collection[]) {
      data[collection].filter(r => r.demo).forEach(r => changes.push({ collection, deleteId: r.id }));
    }
    if (enabled) {
      const demo = demoData(randomUUID);
      for (const collection of Object.keys(demo) as Collection[]) {
        demo[collection].forEach(record => changes.push({ collection, record } as Change));
      }
    }
    return commit(changes);
  };
  return <AppContext.Provider value={{ data, ready, error, clearError: () => setError(undefined), reload, commit, theme, override, setOverride, toggleDemo, toast, notify: (text, undo) => setToast({ text, undo }) }}>{children}</AppContext.Provider>;
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppProvider is missing.');
  return value;
}
