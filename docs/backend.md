# Backend adapter

Court Log has two adapters. Without Firebase settings it stores a versioned
database in AsyncStorage (device storage on iOS, browser storage on web) and no
data leaves the device. With the `EXPO_PUBLIC_FIREBASE_*` variables from
`.env.example` set, `CloudGate` requires an email/password sign-in and stores
each record as a Firestore document at `users/{uid}/{collection}/{id}`
(`src/data/cloudRepository.ts`, `src/data/firebase.ts`). On the first sign-in on
a device, on-device logs are copied once into an empty account.

Firestore rules must restrict `users/{uid}/**` to `request.auth.uid == uid`.
Create the user in Firebase Console; the app has no sign-up screen. On web,
Firestore keeps an IndexedDB cache, so logs load offline and changes made offline
sync on reconnect. Concurrent edits to the same record resolve last-write-wins.

The seam is `Repository` in `src/data/repository.ts`. Screens use `useApp()`;
they never import AsyncStorage. Provide another implementation through
`<AppProvider repository={cloudRepository}>` in the root layout.

An adapter implements:

- `read()`: return all five collections, including archived routines.
- `save(collection, record)`: upsert a complete record, preserving its UUID and
  creation timestamp.
- `remove(collection, id)`: delete a record without altering historical snapshots.
- `commit(changes)`: atomically apply a group of upserts/deletions, or reject.
  Player updates and their match snapshots use this to avoid partial saves.

Reject failed operations with a useful `Error`; the provider displays the error
and keeps forms open. Never return empty data after a network failure.
Implement the same contract tests as the local adapter before swapping it in.

Every top-level record has a UUID, `createdAt` and `updatedAt` (ISO timestamps).
Activity dates are local `YYYY-MM-DD` strings, not UTC timestamps. Matches
snapshot participant names and ratings; sessions snapshot routine names,
exercises and original template values. Do not join those snapshots to current
players or routines when rendering history. Deleting a player/routine must not
delete historical activities.

For a cloud backend, add single-user authorization before exposing data,
transaction support, schema migrations, and backups. For offline multi-device
sync, add a durable outbox, deletion tombstones and an explicit conflict policy;
timestamps alone do not provide safe sync. The current local adapter serializes
writes within one running app, not across simultaneous browser tabs/devices.

Developer options in Settings provide a session-only theme override and a demo
data toggle. Only records marked `demo` are removed by that toggle.
