import type { Collection, Database, RecordMeta } from '../domain/models.ts';
import { assertDatabase, collections, type Change, type Repository } from './repository.ts';

/** One document write. A missing `record` deletes the document. */
export interface DocumentWrite {
  collection: Collection;
  id: string;
  record?: RecordMeta;
}
/**
 * Minimal document database the cloud repository needs. Each record is stored
 * as its own document, keyed by its UUID, so writes never rewrite the whole log.
 */
export interface DocumentStore {
  list(collection: Collection): Promise<unknown[]>;
  /** Applies every write atomically, or rejects without applying any. */
  write(writes: DocumentWrite[]): Promise<void>;
}
/** Firestore rejects batches larger than this. */
export const maxWritesPerCommit = 500;

export function createCloudRepository(store: DocumentStore): Repository {
  async function read(): Promise<Database> {
    const lists = await Promise.all(collections.map(collection => store.list(collection)));
    const data = Object.fromEntries(collections.map((collection, i) => [collection, lists[i]]));
    assertDatabase(data);
    return data;
  }
  async function commit(changes: Change[]) {
    if (changes.length > maxWritesPerCommit) throw new Error(`Too many changes at once (${changes.length}). Try a smaller edit.`);
    const writes = changes.map((change): DocumentWrite => 'deleteId' in change
      ? { collection: change.collection, id: change.deleteId }
      : { collection: change.collection, id: change.record.id, record: change.record });
    if (writes.some(write => !write.id)) throw new Error('A record is missing its id. Nothing was saved.');
    await store.write(writes);
  }
  return {
    read,
    save: (collection, record) => commit([{ collection, record } as Change]),
    remove: (collection, deleteId) => commit([{ collection, deleteId }]),
    commit,
  };
}

/**
 * Copies every local record to an empty cloud account. Does nothing when the
 * cloud already has data, so it can never overwrite or duplicate synced logs.
 * Returns the number of records copied.
 */
export async function copyLocalToEmptyCloud(local: Repository, cloud: Repository, chunkSize = 400): Promise<number> {
  const remote = await cloud.read();
  if (collections.some(collection => remote[collection].length > 0)) return 0;
  const data = await local.read();
  const changes = collections.flatMap(collection => data[collection].map(record => ({ collection, record }) as Change));
  for (let i = 0; i < changes.length; i += chunkSize) await cloud.commit(changes.slice(i, i + chunkSize));
  return changes.length;
}
