import type { FirebaseApp } from 'firebase/app';
import { browserLocalPersistence, indexedDBLocalPersistence, initializeAuth, type Auth } from 'firebase/auth';

/** Web: keep the user signed in across reloads and home-screen launches. */
export function createAuth(app: FirebaseApp): Auth {
  return initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
}
