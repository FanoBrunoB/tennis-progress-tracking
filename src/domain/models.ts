export interface RecordMeta {
  id: string;
  createdAt: string;
  updatedAt: string;
  demo?: boolean;
}

export type Format = 'Singles' | 'Doubles';
export type Surface = 'Hard' | 'Clay' | 'Carpet';
export type Side = 'me' | 'opponent';
export interface Player extends RecordMeta {
  name: string;
  tag?: 'My club' | 'Friend';
  singlesRating?: number;
  doublesRating?: number;
}
export interface Participant {
  playerId?: string;
  name: string;
  rating?: number;
}
export interface Score {
  me: number;
  opponent: number;
  tiebreak?: { me: number; opponent: number };
  matchTiebreak?: boolean;
}
export interface Lineup {
  format: Format;
  opponents: Participant[];
  partner?: Participant;
}
export const assessmentLabels = [
  'Pre-match form', 'During the match', 'Serve', 'Backhand', 'Forehand', 'Volley', 'Nerves',
] as const;
export type Assessment = Partial<Record<(typeof assessmentLabels)[number], number>>;
export interface Match extends RecordMeta, Lineup {
  type: 'Match' | 'Interclub';
  date: string;
  category?: 'Liga' | 'Division';
  surface: Surface;
  sets: Score[];
  finish: 'Completed' | 'Retired' | 'Walkover';
  absentSide?: Side;
  assessment: Assessment;
}
export interface Training extends RecordMeta {
  type: 'Training';
  date: string;
}
export interface TeamSet extends Lineup {
  id: string;
  score: Score;
  start: 'Normal' | '3-3';
}
export interface TeamTraining extends RecordMeta {
  type: 'Team training';
  date: string;
  surface: Surface;
  sets: TeamSet[];
}
export type TennisActivity = Match | Training | TeamTraining;
export type RoutineType = 'Legs' | 'Push' | 'Pull';
export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  unit: 'kg' | 'lb';
}
export interface Routine extends RecordMeta {
  type: RoutineType;
  name: string;
  archived: boolean;
  exercises: Exercise[];
}
export interface GymSession extends RecordMeta {
  date: string;
  type: RoutineType;
  routineId: string;
  routineName: string;
  exercises: Exercise[];
  templateExercises: Exercise[];
}
export interface IntervalStep {
  id: string;
  label: string;
  seconds: number;
  paceSeconds: number;
}
interface OtherBase extends RecordMeta { date: string }
export interface Intervals extends OtherBase {
  type: 'Intervals';
  repeats: number;
  steps: IntervalStep[];
}
export interface Run extends OtherBase {
  type: 'Run';
  seconds: number;
  distance: number;
}
export interface Padel extends OtherBase {
  type: 'Padel';
  minutes: number;
  sets: { me: number; opponent: number }[];
}
export interface Football extends OtherBase {
  type: 'Football';
  minutes: number;
  me: number;
  opponent: number;
}
export type OtherActivity = Intervals | Run | Padel | Football;
export interface Collections {
  players: Player;
  tennis: TennisActivity;
  routines: Routine;
  gym: GymSession;
  other: OtherActivity;
}
export type Collection = keyof Collections;
export type Database = { [K in Collection]: Collections[K][] };
export const emptyDatabase = (): Database => ({ players: [], tennis: [], routines: [], gym: [], other: [] });
export const categoryColors = {
  Tennis: '#A8E063', Gym: '#A3ABB5', Football: '#FFFFFF',
  Padel: '#4C9BFF', Intervals: '#FF8A3D', Run: '#FFD23F',
};
export const surfaceColors: Record<Surface, string> = { Hard: '#4C9BFF', Clay: '#E0763F', Carpet: '#B3A6D9' };
