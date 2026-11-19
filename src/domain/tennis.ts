import type { Assessment, Format, Match, Player, Score, Side, TeamSet, TennisActivity } from './models.ts';
import { newestFirst } from './dates.ts';

const integer = (n: number) => Number.isInteger(n) && n >= 0;
export const needsTiebreak = (score: Score) => !score.matchTiebreak &&
  ((score.me === 7 && score.opponent === 6) || (score.me === 6 && score.opponent === 7));
export function validateSet(score: Score, partial = false): string | undefined {
  if (!integer(score.me) || !integer(score.opponent)) return 'Enter non-negative whole-number scores.';
  const high = Math.max(score.me, score.opponent);
  const low = Math.min(score.me, score.opponent);
  if (score.matchTiebreak) {
    if (partial && !(high >= 10 && high - low >= 2)) return undefined;
    return high >= 10 && high - low === 2 || high === 10 && low <= 8 ? undefined : 'Match tiebreak: first to 10, win by 2.';
  }
  const complete = high === 6 && low <= 4 || high === 7 && (low === 5 || low === 6);
  if (!complete && !(partial && high <= 6 && !(high === 6 && low <= 4))) return 'A full set must end 6-0 to 6-4, 7-5 or 7-6.';
  if (needsTiebreak(score)) {
    const tb = score.tiebreak;
    if (!tb || !integer(tb.me) || !integer(tb.opponent)) return 'Enter tiebreak points for this 7-6 set.';
    const h = Math.max(tb.me, tb.opponent), l = Math.min(tb.me, tb.opponent);
    if (!(h === 7 && l <= 5 || h > 7 && h - l === 2) || (tb.me > tb.opponent) !== (score.me > score.opponent)) {
      return 'Tiebreak: first to 7, win by 2; its winner must win the set.';
    }
  }
  return undefined;
}
export function setWinner(score: Score): Side | undefined {
  if (validateSet(score)) return undefined;
  return score.me > score.opponent ? 'me' : 'opponent';
}
export function validateTeamSet(set: TeamSet): string | undefined {
  if (set.start === '3-3') {
    if (Math.min(set.score.me, set.score.opponent) < 3) return 'Both sides started at 3.';
    // DECISION: a 3-3 practice set may finish at 6-5, as shown in the design.
    if (Number.isInteger(set.score.me) && Number.isInteger(set.score.opponent) &&
      Math.max(set.score.me, set.score.opponent) === 6 && Math.min(set.score.me, set.score.opponent) < 6) return undefined;
  }
  return validateSet(set.score);
}
export function matchWinner(match: Pick<Match, 'finish' | 'absentSide' | 'sets'>): Side | undefined {
  if (match.finish !== 'Completed') return match.absentSide === 'me' ? 'opponent' : match.absentSide === 'opponent' ? 'me' : undefined;
  let me = 0, opponent = 0;
  for (const set of match.sets) {
    const winner = setWinner(set);
    if (winner === 'me') me++;
    if (winner === 'opponent') opponent++;
  }
  return me >= 2 ? 'me' : opponent >= 2 ? 'opponent' : undefined;
}
export function validateMatch(match: Match): string[] {
  const errors: string[] = [];
  if (match.type === 'Interclub' && !match.category) errors.push('Select Liga or Division.');
  if (match.opponents.length !== (match.format === 'Singles' ? 1 : 2) || match.opponents.some(p => !p.name.trim()) ||
    (match.format === 'Doubles' && !match.partner?.name.trim())) errors.push('Enter every player name.');
  const names = ['you', ...match.opponents.map(p => p.name.trim().toLowerCase()), ...(match.partner ? [match.partner.name.trim().toLowerCase()] : [])];
  if (new Set(names).size !== names.length) errors.push('Each player must be different.');
  if (match.finish !== 'Completed' && !match.absentSide) errors.push('Select who retired or did not show.');
  if (match.finish === 'Walkover') return errors;
  if (match.sets.length > 3) errors.push('A match has at most three sets.');
  match.sets.forEach((s, i) => {
    const error = validateSet(s, match.finish === 'Retired' && i === match.sets.length - 1);
    if (error) errors.push(`Set ${i + 1}: ${error}`);
    if (s.matchTiebreak && i !== 2) errors.push('Only the third set can be a match tiebreak.');
  });
  if (match.sets.length === 3 && setWinner(match.sets[0]) === setWinner(match.sets[1])) errors.push('Set 3 is only played when the first two sets are split.');
  if (match.finish === 'Completed' && !matchWinner(match)) errors.push('Complete two winning sets, including a third set if split.');
  return errors;
}
export function assessmentAverage(assessment: Assessment): number | undefined {
  const values = Object.values(assessment).filter((value): value is number => value !== undefined);
  return values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : undefined;
}
export interface FormResult {
  id: string;
  date: string;
  createdAt: string;
  format: Format;
  win: boolean;
  interclub: boolean;
}
export function formResults(activities: readonly TennisActivity[], format: Format, limit = 5): FormResult[] {
  const results: FormResult[] = [];
  for (const activity of activities) {
    if (activity.type === 'Training') continue;
    if (activity.type === 'Team training') {
      activity.sets.forEach((set, index) => {
        const winner = setWinner(set.score);
        if (set.start === 'Normal' && set.format === format && winner) {
          results.push({ id: set.id, date: activity.date, createdAt: `${activity.createdAt}:${String(index).padStart(5, '0')}`, format, win: winner === 'me', interclub: false });
        }
      });
    } else {
      const winner = matchWinner(activity);
      if (activity.format === format && winner) results.push({ id: activity.id, date: activity.date, createdAt: activity.createdAt, format, win: winner === 'me', interclub: activity.type === 'Interclub' });
    }
  }
  return newestFirst(results).slice(0, limit).reverse();
}
export function ratingFor(player: Player, format: Format): number | undefined {
  return format === 'Singles' ? player.singlesRating : player.doublesRating;
}
export function withRating(player: Player, format: Format, rating: number | undefined, now: string): Player {
  return { ...player, [format === 'Singles' ? 'singlesRating' : 'doublesRating']: rating, updatedAt: now };
}
export function snapshotPlayer(player: Player, format: Format, rating = ratingFor(player, format)) {
  return { playerId: player.id, name: player.name, rating };
}
