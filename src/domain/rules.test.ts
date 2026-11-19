import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, getSeasonTheme, readableText, themes } from './theme.ts';
import { assessmentAverage, formResults, matchWinner, needsTiebreak, snapshotPlayer, validateMatch, validateSet, validateTeamSet, withRating } from './tennis.ts';
import { activeRoutines, editRoutine, footballResult, intervalSummary, padelResult, parseTime, sessionFromRoutine } from './fitness.ts';
import { calendarDays, validDate } from './dates.ts';
import type { Match, Player, Routine, TennisActivity } from './models.ts';

const meta = { id: 'm1', createdAt: '2026-11-19T10:00:00Z', updatedAt: '2026-11-19T10:00:00Z' };
const match = (updates: Partial<Match> = {}): Match => ({
  ...meta, type: 'Match', date: '2026-11-19', format: 'Singles', surface: 'Hard',
  opponents: [{ name: 'Alex' }], sets: [{ me: 6, opponent: 4 }, { me: 6, opponent: 3 }],
  finish: 'Completed', assessment: {}, ...updates,
});
describe('season boundaries (local calendar dates)', () => {
  for (const [month, day, season] of [
    [3, 28, 'hard'], [3, 29, 'clay'], [6, 6, 'clay'], [6, 7, 'grass'],
    [7, 25, 'grass'], [7, 26, 'indoors'], [12, 31, 'indoors'], [1, 1, 'hard'],
  ] as const) {
    it(`${month}/${day} is ${season}`, () => assert.equal(getSeasonTheme(new Date(2026, month - 1, day)), themes[season]));
  }
  it('keeps muted body copy at 4.5:1 on every seasonal surface', () => {
    for (const theme of Object.values(themes)) for (const surface of [theme.bg, theme.card, theme.card2, theme.deep]) {
      assert.ok(contrastRatio(readableText(theme.muted, surface, theme.text), surface) >= 4.5);
    }
  });
});
describe('tennis scores and winners', () => {
  it('wins in two sets', () => assert.equal(matchWinner(match()), 'me'));
  it('wins 2-1 with a match tiebreak', () => {
    const activity = match({ sets: [{ me: 6, opponent: 4 }, { me: 3, opponent: 6 }, { me: 12, opponent: 10, matchTiebreak: true }] });
    assert.equal(matchWinner(activity), 'me');
    assert.deepEqual(validateMatch(activity), []);
  });
  it('loses 2-1 with a full third set', () => assert.equal(matchWinner(match({ sets: [{ me: 6, opponent: 4 }, { me: 3, opponent: 6 }, { me: 5, opponent: 7 }] })), 'opponent'));
  it('uses the non-retiring side even with partial scores', () => {
    const activity = match({ finish: 'Retired', absentSide: 'me', sets: [{ me: 4, opponent: 1 }] });
    assert.equal(matchWinner(activity), 'opponent');
    assert.deepEqual(validateMatch(activity), []);
  });
  it('allows retirement before any completed set', () => assert.deepEqual(validateMatch(match({ finish: 'Retired', absentSide: 'opponent', sets: [] })), []));
  it('uses the side who showed up for walkovers', () => assert.equal(matchWinner(match({ finish: 'Walkover', absentSide: 'opponent', sets: [] })), 'me'));
  it('requires a third set only after split sets', () => {
    assert.ok(validateMatch(match({ sets: [{ me: 6, opponent: 4 }, { me: 3, opponent: 6 }] })).length);
    assert.ok(validateMatch(match({ sets: [{ me: 6, opponent: 4 }, { me: 6, opponent: 4 }, { me: 6, opponent: 2 }] })).length);
  });
  it('requires tiebreak points only for 7-6 / 6-7', () => {
    assert.equal(needsTiebreak({ me: 7, opponent: 6 }), true);
    assert.equal(needsTiebreak({ me: 6, opponent: 7 }), true);
    assert.equal(needsTiebreak({ me: 7, opponent: 5 }), false);
    assert.equal(needsTiebreak({ me: 10, opponent: 6, matchTiebreak: true }), false);
    assert.ok(validateSet({ me: 7, opponent: 6 }));
    assert.equal(validateSet({ me: 6, opponent: 7, tiebreak: { me: 5, opponent: 7 } }), undefined);
    assert.ok(validateSet({ me: 6, opponent: 7, tiebreak: { me: 7, opponent: 5 } }));
  });
  it('validates win-by-two without accepting scores played past the winning point', () => {
    for (const [me, opponent] of [[10, 0], [10, 8], [11, 9], [18, 16]]) assert.equal(validateSet({ me, opponent, matchTiebreak: true }), undefined);
    for (const [me, opponent] of [[9, 7], [10, 9], [12, 8], [-1, 10], [10.5, 8]]) assert.ok(validateSet({ me, opponent, matchTiebreak: true }));
    assert.ok(validateSet({ me: 8, opponent: 6 }));
    assert.equal(validateSet({ me: 7, opponent: 5 }), undefined);
  });
  it('keeps self-assessment optional and averages only provided values', () => {
    assert.equal(assessmentAverage({}), undefined);
    assert.equal(assessmentAverage({ Serve: 5, Nerves: 2, Volley: undefined }), 3.5);
  });
  it('allows the design short-start practice score without changing full-set rules', () => {
    const set = { id: 's1', format: 'Singles' as const, opponents: [{ name: 'Alex' }], start: '3-3' as const, score: { me: 6, opponent: 5 } };
    assert.equal(validateTeamSet(set), undefined);
    assert.ok(validateTeamSet({ ...set, start: 'Normal' }));
    assert.ok(validateTeamSet({ ...set, score: { me: 6, opponent: 2 } }));
  });
});
describe('form', () => {
  it('separates formats, flags interclub and excludes training/3-3 sets', () => {
    const activities: TennisActivity[] = [
      match({ type: 'Interclub', category: 'Liga' }),
      match({ id: 'double', format: 'Doubles', partner: { name: 'Sam' }, opponents: [{ name: 'Alex' }, { name: 'Kim' }] }),
      { ...meta, id: 'training', type: 'Training', date: '2026-11-19' },
      { ...meta, id: 'team', type: 'Team training', date: '2026-11-19', surface: 'Hard', sets: [
        { id: 'normal', format: 'Singles', opponents: [{ name: 'Lee' }], score: { me: 4, opponent: 6 }, start: 'Normal' },
        { id: 'short', format: 'Singles', opponents: [{ name: 'Lee' }], score: { me: 6, opponent: 4 }, start: '3-3' },
      ] },
    ];
    const singles = formResults(activities, 'Singles');
    assert.deepEqual(singles.map(r => [r.id, r.win, r.interclub]), [['m1', true, true], ['normal', false, false]]);
    assert.deepEqual(formResults(activities, 'Doubles').map(r => r.id), ['double']);
  });
  it('takes five latest by date then createdAt, displayed oldest to latest', () => {
    const activities = Array.from({ length: 8 }, (_, i) => match({ id: `${i}`, date: i === 0 ? '2026-11-18' : '2026-11-19', createdAt: `2026-11-19T10:0${i}:00Z` }));
    assert.deepEqual(formResults(activities.reverse(), 'Singles').map(r => r.id), ['3', '4', '5', '6', '7']);
  });
});
describe('fitness and snapshots', () => {
  const routine: Routine = { ...meta, type: 'Push', name: 'November 2026 · Push', archived: false, exercises: [{ id: 'e1', name: 'Bench press', sets: 4, reps: 8, weight: 70, unit: 'kg' }] };
  it('calculates 6 × [3:00 @4:30 + 1:00 @11:00]', () => {
    const summary = intervalSummary(6, [{ seconds: 180, paceSeconds: 270 }, { seconds: 60, paceSeconds: 660 }]);
    assert.equal(summary.seconds, 1440);
    assert.ok(Math.abs(summary.distance - 4.54545) < 0.00001);
  });
  it('parses times and rejects malformed seconds', () => {
    assert.equal(parseTime('0:38:10'), 2290);
    assert.equal(parseTime('3:00'), 180);
    assert.equal(parseTime('3:90'), undefined);
    assert.equal(parseTime('-1:00'), undefined);
  });
  it('session edits never mutate the template or original snapshot', () => {
    const session = sessionFromRoutine(routine);
    session.exercises[0].weight = 72.5;
    assert.equal(routine.exercises[0].weight, 70);
    assert.equal(session.templateExercises[0].weight, 70);
    const edited = editRoutine(routine, { exercises: [{ ...routine.exercises[0], weight: 80 }] }, '2026-12-01T10:00:00Z');
    assert.equal(edited.id, routine.id);
    assert.equal(edited.name, routine.name);
    assert.equal(session.templateExercises[0].weight, 70);
  });
  it('excludes archived routines from the picker', () => {
    assert.deepEqual(activeRoutines([routine, { ...routine, id: 'archived', archived: true }, { ...routine, id: 'pull', type: 'Pull' }], 'Push').map(r => r.id), ['m1']);
  });
  it('snapshots per-match rating and updates only one format', () => {
    const player: Player = { ...meta, name: 'Alex', singlesRating: 25.8, doublesRating: 22 };
    const snapshot = snapshotPlayer(player, 'Singles', 26);
    const updated = withRating(player, 'Singles', 26, '2026-11-20T10:00:00Z');
    assert.equal(updated.singlesRating, 26);
    assert.equal(updated.doublesRating, 22);
    assert.equal(player.singlesRating, 25.8);
    updated.singlesRating = 30;
    assert.equal(snapshot.rating, 26);
  });
  it('computes padel results with any number of sets and football W/D/L', () => {
    assert.equal(padelResult(Array.from({ length: 12 }, (_, i) => ({ me: i < 7 ? 6 : 2, opponent: i < 7 ? 4 : 6 }))), 'W');
    assert.equal(padelResult([{ me: 2, opponent: 6 }]), 'L');
    assert.equal(padelResult([{ me: 6, opponent: 2 }, { me: 2, opponent: 6 }]), undefined);
    assert.equal(footballResult(5, 3), 'W');
    assert.equal(footballResult(2, 2), 'D');
    assert.equal(footballResult(1, 2), 'L');
  });
});
describe('calendar', () => {
  it('starts on Monday and keeps real dates across leap years', () => {
    assert.equal(calendarDays(new Date(2026, 10, 1))[6], '2026-11-01');
    assert.equal(validDate('2028-02-29'), true);
    assert.equal(validDate('2026-02-29'), false);
    assert.equal(validDate('2026-13-01'), false);
  });
});
