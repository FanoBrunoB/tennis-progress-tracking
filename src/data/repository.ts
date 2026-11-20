import { emptyDatabase, type Collection, type Collections, type Database } from '../domain/models.ts';

export type Change = {
  [K in Collection]: { collection: K; record: Collections[K] }
}[Collection] | { collection: Collection; deleteId: string };
export interface Repository {
  read(): Promise<Database>;
  save<K extends Collection>(collection: K, record: Collections[K]): Promise<void>;
  remove(collection: Collection, id: string): Promise<void>;
  commit(changes: Change[]): Promise<void>;
}
export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
}
export const collections: Collection[] = ['players', 'tennis', 'routines', 'gym', 'other', 'ratings'];
export function assertDatabase(value: unknown): asserts value is Database {
  if (!value || typeof value !== 'object') throw new Error('Stored data is not a valid Court Log database.');
  for (const key of collections) {
    const records = Reflect.get(value, key);
    if (!Array.isArray(records) || records.some(record => !record || typeof record.id !== 'string' || typeof record.createdAt !== 'string' || typeof record.updatedAt !== 'string')) {
      throw new Error(`Stored ${key} data is invalid. No data has been overwritten.`);
    }
  }
}
function put<K extends Collection>(db: Database, collection: K, record: Collections[K]) {
  const rows: Collections[K][] = db[collection];
  const index = rows.findIndex(row => row.id === record.id);
  if (index < 0) rows.push(record);
  else rows[index] = record;
}
export function createLocalRepository(storage: Storage, key = 'court-log:v1'): Repository {
  let queue: Promise<void> = Promise.resolve();
  async function load(): Promise<Database> {
    const raw = await storage.getItem(key);
    if (raw === null) return emptyDatabase();
    const envelope: unknown = JSON.parse(raw);
    if (!envelope || typeof envelope !== 'object') throw new Error('Unsupported Court Log data version.');
    const version: unknown = Reflect.get(envelope, 'version');
    if (version !== 1 && version !== 2) throw new Error('Unsupported Court Log data version.');
    let data: unknown = Reflect.get(envelope, 'data');
    if (version === 1 && data && typeof data === 'object' && !Object.hasOwn(data, 'ratings')) data = { ...data, ratings: [] };
    assertDatabase(data);
    return data;
  }
  function commit(changes: Change[]): Promise<void> {
    const operation = queue.then(async () => {
      const data = await load();
      for (const change of changes) {
        if ('deleteId' in change) {
          const rows = data[change.collection];
          const index = rows.findIndex(row => row.id === change.deleteId);
          if (index >= 0) rows.splice(index, 1);
        } else put(data, change.collection, change.record);
      }
      await storage.setItem(key, JSON.stringify({ version: 2, data }));
    });
    // Keep later writes usable after a failed write; the caller still receives the rejection.
    queue = operation.then(() => undefined, () => undefined);
    return operation;
  }
  return {
    read: async () => { await queue; return load(); },
    save: (collection, record) => commit([{ collection, record } as Change]),
    remove: (collection, deleteId) => commit([{ collection, deleteId }]),
    commit,
  };
}
