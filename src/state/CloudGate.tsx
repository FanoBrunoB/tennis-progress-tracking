import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { copyLocalToEmptyCloud, createCloudRepository } from '../data/cloudRepository';
import { createFirestoreStore, firebase, firebaseConfigured } from '../data/firebase';
import { LoginScreen } from '../ui/LoginScreen';
import { AppProvider, localRepository } from './AppProvider';
import { useSeasonTheme } from './ThemeProvider';

interface Session { email: string | null; signOut(): Promise<void> }
const SessionContext = createContext<Session | null>(null);
/** The signed-in account, or null when the app runs with on-device storage only. */
export const useSession = () => useContext(SessionContext);

/**
 * Chooses where logs are stored. With Firebase configured, the user signs in and
 * logs sync to their account; otherwise everything stays on this device.
 */
export function CloudGate({ children }: { children: React.ReactNode }) {
  if (!firebaseConfigured) return <AppProvider>{children}</AppProvider>;
  return <SignedInGate>{children}</SignedInGate>;
}

function SignedInGate({ children }: { children: React.ReactNode }) {
  const { theme } = useSeasonTheme();
  const [user, setUser] = useState<User | null>();
  const [migratedFor, setMigratedFor] = useState<string>();
  useEffect(() => onAuthStateChanged(firebase().auth, setUser), []);
  const uid = user?.uid;
  const repository = useMemo(() => uid ? createCloudRepository(createFirestoreStore(firebase().db, uid)) : undefined, [uid]);
  useEffect(() => {
    if (!uid || !repository) return;
    let active = true;
    const key = `court-log:migrated:${uid}`;
    (async () => {
      try {
        // Logs saved before signing in are uploaded once, and only into an empty account.
        if (!(await AsyncStorage.getItem(key))) {
          await copyLocalToEmptyCloud(localRepository, repository);
          await AsyncStorage.setItem(key, new Date().toISOString());
        }
      } catch (error) {
        // Local logs are kept untouched; the copy is retried on the next launch.
        console.warn('Court Log: could not copy on-device logs to your account', error);
      } finally {
        if (active) setMigratedFor(uid);
      }
    })();
    return () => { active = false; };
  }, [uid, repository]);

  if (user === undefined || (uid && migratedFor !== uid)) {
    return <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center' }}><ActivityIndicator color={theme.accent} /></View>;
  }
  if (!user || !repository) return <AppProvider><LoginScreen /></AppProvider>;
  return <SessionContext.Provider value={{ email: user.email, signOut: () => signOut(firebase().auth) }}>
    <AppProvider key={user.uid} repository={repository}>{children}</AppProvider>
  </SessionContext.Provider>;
}
