# Backend adapter

Court Log currently stores a versioned database in AsyncStorage, which uses
device storage on iOS and browser storage on web. No data leaves the device.
Clearing that storage removes the data; this is not a backup or a sync service.

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
