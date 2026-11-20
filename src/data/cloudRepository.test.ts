import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { copyLocalToEmptyCloud, createCloudRepository, type DocumentStore } from './cloudRepository.ts';
import { createLocalRepository, type Storage } from './repository.ts';
import type { Collection, Match, Player, RatingEntry } from '../domain/models.ts';

const player: Player = { id: 'p1', createdAt: '2026-11-19T10:00:00Z', updatedAt: '2026-11-19T10:00:00Z', name: 'Alex', singlesRating: 25.8, doublesRating: 22 };
/** In-memory stand-in for Firestore: one JSON document per record, atomic batches. */
function memoryStore(options: { failWrites?: () => boolean } = {}) {
  const docs = new Map<string, string>();
  let writes = 0;
  const store: DocumentStore = {
    list: async (collection: Collection) => [...docs].filter(([key]) => key.startsWith(`${collection}/`)).map(([, value]) => JSON.parse(value)),
    write: async batch => {
      if (options.failWrites?.()) throw new Error('Network unavailable');
      for (const w of batch) {
        if (w.record) docs.set(`${w.collection}/${w.id}`, JSON.stringify(w.record));
        else docs.delete(`${w.collection}/${w.id}`);
      }
      writes += 1;
    },
  };
  return { store, docs, batches: () => writes };
}
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return { getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); } };
}

describe('cloud repository interface', () => {
  it('persists CRUD across adapter instances and returns independent snapshots', async () => {
    const { store } = memoryStore(), repo = createCloudRepository(store);
    await repo.save('players', player);
    await repo.save('players', { ...player, name: 'Alex Smith' });
    const snapshot = await repo.read();
    snapshot.players[0].name = 'unsaved';
    const next = createCloudRepository(store);
    assert.equal((await next.read()).players[0].name, 'Alex Smith');
    await next.remove('players', player.id);
    assert.deepEqual((await next.read()).players, []);
  });
  it('handles concurrent writes without losing records', async () => {
    const repo = createCloudRepository(memoryStore().store);
    await Promise.all(Array.from({ length: 10 }, (_, i) => repo.save('players', { ...player, id: `${i}` })));
    assert.equal((await repo.read()).players.length, 10);
  });
  it('syncs personal rating updates as separate records without replacing history', async () => {
    const { store } = memoryStore(), repo = createCloudRepository(store);
    const entry: RatingEntry = { id: 'r1', createdAt: player.createdAt, updatedAt: player.updatedAt, date: '2026-11-19', format: 'Singles', rating: 25.8 };
    await repo.save('ratings', entry);
    await repo.save('ratings', { ...entry, id: 'r2', format: 'Doubles', rating: 22 });
    await repo.save('ratings', { ...entry, id: 'r3', date: '2026-11-20', rating: 26.1 });
    assert.deepEqual((await createCloudRepository(store).read()).ratings.map(r => [r.format, r.rating]), [['Singles', 25.8], ['Doubles', 22], ['Singles', 26.1]]);
  });
  it('commits player rating updates and match snapshots in one batch', async () => {
    const { store, batches } = memoryStore(), repo = createCloudRepository(store);
    const match: Match = { ...player, id: 'match', type: 'Match', date: '2026-11-19', format: 'Singles', surface: 'Hard', finish: 'Walkover', absentSide: 'opponent', sets: [], assessment: {}, opponents: [{ playerId: player.id, name: player.name, rating: 26 }] };
    await repo.commit([{ collection: 'players', record: { ...player, singlesRating: 26 } }, { collection: 'tennis', record: match }]);
    assert.equal(batches(), 1);
    await repo.save('players', { ...player, singlesRating: 30 });
    const data = await repo.read();
    assert.equal(data.players[0].doublesRating, 22);
    const saved = data.tennis[0];
    assert.ok(saved.type === 'Match');
    assert.equal(saved.opponents[0].rating, 26);
  });
  it('reports corrupt documents instead of returning partial data', async () => {
    const { store, docs } = memoryStore();
    docs.set('players/broken', JSON.stringify({ name: 'No id' }));
    await assert.rejects(createCloudRepository(store).read(), /invalid/);
  });
  it('reports failed writes and allows retrying', async () => {
    let fail = true;
    const repo = createCloudRepository(memoryStore({ failWrites: () => fail }).store);
    await assert.rejects(repo.save('players', player), /Network unavailable/);
    fail = false;
    await repo.save('players', player);
    assert.equal((await repo.read()).players.length, 1);
  });
  it('rejects batches Firestore would refuse, before writing anything', async () => {
    const { store, batches } = memoryStore(), repo = createCloudRepository(store);
    await assert.rejects(repo.commit(Array.from({ length: 501 }, (_, i) => ({ collection: 'players', record: { ...player, id: `${i}` } }))), /Too many/);
    assert.equal(batches(), 0);
  });
});

describe('first sign-in migration', () => {
  it('copies personal rating history and recognizes accounts containing only ratings', async () => {
    const local = createLocalRepository(memoryStorage());
    await local.save('ratings', { id: 'r1', createdAt: player.createdAt, updatedAt: player.updatedAt, date: '2026-11-19', format: 'Singles', rating: 25.8 });
    const cloud = createCloudRepository(memoryStore().store);
    assert.equal(await copyLocalToEmptyCloud(local, cloud), 1);
    assert.deepEqual((await cloud.read()).ratings, (await local.read()).ratings);
    await local.save('players', player);
    assert.equal(await copyLocalToEmptyCloud(local, cloud), 0);
    assert.deepEqual((await cloud.read()).players, []);
  });
  it('copies local logs to an empty account in chunks', async () => {
    const local = createLocalRepository(memoryStorage());
    for (let i = 0; i < 5; i++) await local.save('players', { ...player, id: `${i}` });
    const { store, batches } = memoryStore(), cloud = createCloudRepository(store);
    assert.equal(await copyLocalToEmptyCloud(local, cloud, 2), 5);
    assert.equal(batches(), 3);
    assert.equal((await cloud.read()).players.length, 5);
  });
  it('never touches an account that already has data', async () => {
    const local = createLocalRepository(memoryStorage());
    await local.save('players', { ...player, id: 'local' });
    const cloud = createCloudRepository(memoryStore().store);
    await cloud.save('players', player);
    assert.equal(await copyLocalToEmptyCloud(local, cloud), 0);
    assert.deepEqual((await cloud.read()).players.map(p => p.id), ['p1']);
  });
});
