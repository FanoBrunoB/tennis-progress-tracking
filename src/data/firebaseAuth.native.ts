import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import type { Auth, Persistence } from 'firebase/auth';

// Metro resolves Firebase's React Native build, which exports getReactNativePersistence,
// but the default TypeScript types describe the browser build and omit it.
const { getReactNativePersistence } = FirebaseAuth as unknown as {
  getReactNativePersistence(storage: typeof AsyncStorage): Persistence;
};

/** iOS/Android: keep the user signed in across app launches. */
export function createAuth(app: FirebaseApp): Auth {
  return FirebaseAuth.initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}
