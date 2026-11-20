import type { Database, RecordMeta } from '../domain/models.ts';
import { dateKey } from '../domain/dates.ts';
import { routineName, sessionFromRoutine } from '../domain/fitness.ts';

export function demoData(id: () => string, today = new Date()): Database {
  const meta = (): RecordMeta => ({ id: id(), createdAt: today.toISOString(), updatedAt: today.toISOString(), demo: true });
  const day = (ago: number) => dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - ago));
  const players: Database['players'] = [
    { ...meta(), name: 'Mads Poulsen', tag: 'My club', singlesRating: 25.8, doublesRating: 23.2 },
    { ...meta(), name: 'Jonas Lund', tag: 'Friend', singlesRating: 24.6, doublesRating: 22.4 },
    { ...meta(), name: 'Anders Berg', singlesRating: 26.1, doublesRating: 24 },
  ];
  const tennis: Database['tennis'] = [];
  for (let i = 0; i < 10; i++) {
    const win = ![2, 6, 9].includes(i), doubles = i % 2 === 1;
    tennis.push({
      ...meta(), date: day(2 + i * 2), type: i % 3 === 0 ? 'Interclub' : 'Match', category: 'Liga',
      format: doubles ? 'Doubles' : 'Singles', surface: i % 2 ? 'Clay' : 'Hard', finish: 'Completed',
      opponents: [{ playerId: players[1].id, name: players[1].name, rating: doubles ? 22.4 : 24.6 }, ...(doubles ? [{ name: 'Oliver Strand', rating: 23.1 }] : [])],
      partner: doubles ? { playerId: players[0].id, name: players[0].name, rating: 23.2 } : undefined,
      sets: win ? [{ me: 6, opponent: 4 }, { me: 6, opponent: 3 }] : [{ me: 4, opponent: 6 }, { me: 3, opponent: 6 }],
      assessment: { Serve: 4, Backhand: 3, Forehand: 4, Nerves: 4 },
    });
  }
  tennis.push({ ...meta(), type: 'Training', date: day(0) }, {
    ...meta(), type: 'Team training', date: day(5), surface: 'Clay',
    sets: [{ id: id(), format: 'Singles', opponents: [{ name: 'Anders Berg' }], start: '3-3', score: { me: 6, opponent: 4 } }],
  });
  const routines: Database['routines'] = (['Push', 'Pull', 'Legs'] as const).map(type => ({
    ...meta(), type, name: routineName(today, type), archived: false,
    exercises: (type === 'Push' ? ['Bench press', 'Overhead press', 'Cable fly'] : type === 'Pull' ? ['Pull-ups', 'Barbell row', 'Face pull'] : ['Back squat', 'Romanian deadlift', 'Calf raise'])
      .map((name, i) => ({ id: id(), name, sets: 4 - i % 2, reps: 8 + i * 2, weight: name === 'Pull-ups' ? undefined : [70, 40, 25][i], unit: i === 2 ? 'lb' : 'kg' })),
  }));
  const gym: Database['gym'] = Array.from({ length: 5 }, (_, i) => ({
    ...meta(), ...sessionFromRoutine(routines[i % 3]), date: day(i * 3 + 1),
  }));
  gym[0].exercises[0].weight = 72.5;
  const other: Database['other'] = [
    { ...meta(), type: 'Intervals', date: day(2), repeats: 6, steps: [{ id: id(), label: 'Work', seconds: 180, paceSeconds: 270 }, { id: id(), label: 'Recovery', seconds: 60, paceSeconds: 660 }] },
    { ...meta(), type: 'Run', date: day(4), seconds: 2290, distance: 7.2 },
    { ...meta(), type: 'Football', date: day(8), minutes: 75, me: 5, opponent: 3 },
    { ...meta(), type: 'Padel', date: day(0), minutes: 80, sets: [{ me: 6, opponent: 4 }, { me: 3, opponent: 6 }, { me: 7, opponent: 5 }] },
  ];
  return { players, tennis, routines, gym, other, ratings: [] };
}
