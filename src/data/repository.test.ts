import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalRepository, type Storage } from './repository.ts';
import type { Player, Match } from '../domain/models.ts';

const player: Player = { id: 'p1', createdAt: '2026-11-19T10:00:00Z', updatedAt: '2026-11-19T10:00:00Z', name: 'Alex', singlesRating: 25.8, doublesRating: 22 };
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return { getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); } };
}
describe('local repository interface', () => {
  it('persists CRUD across adapter instances and returns independent snapshots', async () => {
    const storage = memoryStorage(), repo = createLocalRepository(storage);
    await repo.save('players', player);
    await repo.save('players', { ...player, name: 'Alex Smith' });
    const snapshot = await repo.read();
    snapshot.players[0].name = 'unsaved';
    const next = createLocalRepository(storage);
    assert.equal((await next.read()).players[0].name, 'Alex Smith');
    await next.remove('players', player.id);
    assert.deepEqual((await next.read()).players, []);
  });
  it('serializes concurrent writes without losing records', async () => {
    const repo = createLocalRepository(memoryStorage());
    await Promise.all(Array.from({ length: 10 }, (_, i) => repo.save('players', { ...player, id: `${i}` })));
    assert.equal((await repo.read()).players.length, 10);
  });
  it('commits player rating updates and match snapshots together', async () => {
    const repo = createLocalRepository(memoryStorage());
    const match: Match = { ...player, id: 'match', type: 'Match', date: '2026-11-19', format: 'Singles', surface: 'Hard', finish: 'Walkover', absentSide: 'opponent', sets: [], assessment: {}, opponents: [{ playerId: player.id, name: player.name, rating: 26 }] };
    await repo.commit([{ collection: 'players', record: { ...player, singlesRating: 26 } }, { collection: 'tennis', record: match }]);
    await repo.save('players', { ...player, singlesRating: 30 });
    const data = await repo.read();
    assert.equal(data.players[0].doublesRating, 22);
    const saved = data.tennis[0];
    assert.ok(saved.type === 'Match');
    assert.equal(saved.opponents[0].rating, 26);
  });
  it('reports corrupt storage instead of silently replacing it', async () => {
    let written = false;
    const repo = createLocalRepository({ getItem: async () => '{"version":1,"data":{}}', setItem: async () => { written = true; } });
    await assert.rejects(repo.save('players', player), /invalid/);
    assert.equal(written, false);
  });
  it('reports failed writes and allows retrying', async () => {
    const base = memoryStorage();
    let fail = true;
    const repo = createLocalRepository({ ...base, setItem: async (key, value) => { if (fail) throw new Error('Storage full'); await base.setItem(key, value); } });
    await assert.rejects(repo.save('players', player), /Storage full/);
    fail = false;
    await repo.save('players', player);
    assert.equal((await repo.read()).players.length, 1);
  });
});
