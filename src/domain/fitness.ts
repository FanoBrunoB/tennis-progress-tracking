import type { Exercise, IntervalStep, Routine, RoutineType } from './models.ts';

export function parseTime(value: string): number | undefined {
  if (!/^\d+:[0-5]\d(?::[0-5]\d)?$/.test(value)) return undefined;
  return value.split(':').reduce((seconds, part) => seconds * 60 + Number(part), 0);
}
export function formatTime(seconds: number, hours = false): string {
  const rounded = Math.round(seconds);
  if (hours || rounded >= 3600) return `${Math.floor(rounded / 3600)}:${String(Math.floor(rounded / 60) % 60).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}
export function intervalSummary(repeats: number, steps: readonly Pick<IntervalStep, 'seconds' | 'paceSeconds'>[]) {
  return {
    seconds: repeats * steps.reduce((sum, s) => sum + s.seconds, 0),
    distance: repeats * steps.reduce((sum, s) => sum + s.seconds / s.paceSeconds, 0),
  };
}
export const footballResult = (me: number, opponent: number) => me > opponent ? 'W' : me < opponent ? 'L' : 'D';
export function padelResult(sets: readonly { me: number; opponent: number }[]) {
  const wins = sets.filter(s => s.me > s.opponent).length;
  const losses = sets.filter(s => s.me < s.opponent).length;
  return wins === losses ? undefined : wins > losses ? 'W' : 'L';
}
export function routineName(date: Date, type: RoutineType): string {
  return `${date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} · ${type}`;
}
export const copyExercises = (exercises: readonly Exercise[]): Exercise[] => exercises.map(e => ({ ...e }));
export function sessionFromRoutine(routine: Routine) {
  return {
    type: routine.type, routineId: routine.id, routineName: routine.name,
    exercises: copyExercises(routine.exercises), templateExercises: copyExercises(routine.exercises),
  };
}
export const activeRoutines = (routines: readonly Routine[], type: RoutineType) => routines.filter(r => !r.archived && r.type === type);
export function exerciseChanged(exercise: Exercise, original?: Exercise): boolean {
  return !original || exercise.sets !== original.sets || exercise.reps !== original.reps || exercise.weight !== original.weight || exercise.unit !== original.unit || exercise.name !== original.name;
}
export function editRoutine(routine: Routine, updates: Partial<Pick<Routine, 'name' | 'type' | 'exercises' | 'archived'>>, now: string): Routine {
  return { ...routine, ...updates, updatedAt: now };
}
