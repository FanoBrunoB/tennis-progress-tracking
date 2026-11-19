import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { collection, doc, getDocs, initializeFirestore, memoryLocalCache, persistentLocalCache, persistentMultipleTabManager, writeBatch, type Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import type { DocumentStore } from './cloudRepository';
import { createAuth } from './firebaseAuth';

// These values identify the Firebase project; they are not secrets.
// Access is protected by Firebase Authentication and the Firestore security rules.
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
/** Without a configured project the app keeps working with on-device storage only. */
export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let services: { app: FirebaseApp; auth: ReturnType<typeof createAuth>; db: Firestore } | undefined;
export function firebase() {
  if (!firebaseConfigured) throw new Error('Firebase is not configured.');
  if (!services) {
    const app = getApps()[0] ?? initializeApp(config);
    const db = initializeFirestore(app, {
      // Optional model fields are left undefined; Firestore would reject them otherwise.
      ignoreUndefinedProperties: true,
      // On web, keep an IndexedDB copy so logs load offline and queued writes survive reloads.
      localCache: Platform.OS === 'web' ? persistentLocalCache({ tabManager: persistentMultipleTabManager() }) : memoryLocalCache(),
    });
    services = { app, auth: createAuth(app), db };
  }
  return services;
}

/** Stores each record at users/{uid}/{collection}/{recordId}. */
export function createFirestoreStore(db: Firestore, uid: string): DocumentStore {
  const records = (name: string) => collection(db, 'users', uid, name);
  return {
    async list(name) {
      const snapshot = await getDocs(records(name));
      return snapshot.docs.map(d => d.data());
    },
    async write(writes) {
      const batch = writeBatch(db);
      for (const w of writes) {
        if (w.record) batch.set(doc(records(w.collection), w.id), w.record);
        else batch.delete(doc(records(w.collection), w.id));
      }
      const synced = batch.commit();
      // Offline, Firestore applies the batch to its local cache immediately but only resolves once the
      // server confirms. Don't leave forms stuck waiting for signal; the queued batch syncs on reconnect.
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false) {
        synced.catch(error => console.warn('Court Log: queued changes failed to sync', error));
        return;
      }
      await synced;
    },
  };
}
