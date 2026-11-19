import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { Change } from '../data/repository';
import type { Format, Lineup, Participant, Player, Score, TeamSet, TennisActivity, Match, Surface, Assessment } from '../domain/models';
import { assessmentLabels, surfaceColors } from '../domain/models';
import { dateKey, validDate } from '../domain/dates';
import { assessmentAverage, needsTiebreak, ratingFor, validateMatch, validateTeamSet, withRating } from '../domain/tennis';
import { newId, newMeta, useApp } from '../state/AppProvider';
import { Badge, Button, Card, Chips, Field, FormPage, Label, Segments, Sheet, T, closeForm, fonts, styles } from './components';

interface PlayerDraft { name: string; playerId?: string; rating: string; different: boolean; updateSaved: boolean }
interface LineupDraft { format: Format; partner: PlayerDraft; first: PlayerDraft; second: PlayerDraft }
interface ScoreDraft { me: string; opponent: string; tbMe: string; tbOpponent: string; matchTiebreak: boolean }
interface TeamDraft { id: string; lineup: LineupDraft; score: ScoreDraft; start: 'Normal' | '3-3' }
const playerDraft = (p?: Participant): PlayerDraft => ({ name: p?.name ?? '', playerId: p?.playerId, rating: p?.rating?.toString() ?? '', different: false, updateSaved: true });
const lineupDraft = (lineup?: Lineup): LineupDraft => ({ format: lineup?.format ?? 'Singles', partner: playerDraft(lineup?.partner), first: playerDraft(lineup?.opponents[0]), second: playerDraft(lineup?.opponents[1]) });
const scoreDraft = (s?: Score, mtb = false): ScoreDraft => ({ me: s?.me.toString() ?? '', opponent: s?.opponent.toString() ?? '', tbMe: s?.tiebreak?.me.toString() ?? '', tbOpponent: s?.tiebreak?.opponent.toString() ?? '', matchTiebreak: s?.matchTiebreak ?? mtb });
const number = (s: string) => s.trim() === '' ? NaN : Number(s);
const toScore = (draft: ScoreDraft): Score => {
  const score: Score = { me: number(draft.me), opponent: number(draft.opponent), matchTiebreak: draft.matchTiebreak };
  if (needsTiebreak(score)) score.tiebreak = { me: number(draft.tbMe), opponent: number(draft.tbOpponent) };
  return score;
};
const toParticipant = (p: PlayerDraft): Participant => ({ name: p.name.trim(), playerId: p.playerId, rating: p.rating.trim() ? Number(p.rating) : undefined });
const toLineup = (l: LineupDraft): Lineup => ({ format: l.format, opponents: l.format === 'Singles' ? [toParticipant(l.first)] : [toParticipant(l.first), toParticipant(l.second)], partner: l.format === 'Doubles' ? toParticipant(l.partner) : undefined });
const usedDrafts = (l: LineupDraft): PlayerDraft[] => l.format === 'Singles' ? [l.first] : [l.partner, l.first, l.second];
const teamDraft = (set?: TeamSet): TeamDraft => ({ id: set?.id ?? newId(), lineup: lineupDraft(set), score: scoreDraft(set?.score), start: set?.start ?? 'Normal' });

function PlayerField({ label, value, onChange, format }: { label: string; value: PlayerDraft; onChange(value: PlayerDraft): void; format: Format }) {
  const { data, theme } = useApp();
  const [focused, setFocused] = useState(false);
  const saved = data.players.find(p => p.id === value.playerId);
  const suggestions = data.players.filter(p => p.name.toLowerCase().includes(value.name.toLowerCase()) && p.id !== value.playerId).slice(0, 5);
  return <Card style={{ backgroundColor: theme.card2, padding: 12, gap: 9 }}>
    <View style={styles.row}><Field label={label} value={value.name} placeholder="Player name" onFocus={() => setFocused(true)} onChangeText={name => onChange({ ...playerDraft(), name })} /><T style={{ color: '#FFD978', fontSize: saved ? 22 : 11, marginTop: 20 }}>{saved ? '★' : value.name.trim() ? 'NEW' : ''}</T></View>
    {focused && suggestions.length > 0 && <View>{suggestions.map(player => <Pressable key={player.id} accessibilityRole="button" accessibilityLabel={`Select ${player.name}`} onPress={() => {
      onChange({ name: player.name, playerId: player.id, rating: ratingFor(player, format)?.toString() ?? '', different: false, updateSaved: true }); setFocused(false);
    }} style={{ minHeight: 44, justifyContent: 'center', borderBottomColor: theme.border, borderBottomWidth: 1 }}><T>★ {player.name}{ratingFor(player, format) !== undefined ? ` · ${ratingFor(player, format)}` : ''}</T></Pressable>)}</View>}
    {saved && <View style={{ backgroundColor: theme.deep, borderRadius: 12, padding: 10, gap: 10 }}>
      <T style={{ fontSize: 12 }}>Saved {format.toLowerCase()} rating <T style={{ fontFamily: fonts.bold }}>{ratingFor(saved, format) ?? 'not set'}</T></T>
      <View style={styles.between}><T muted style={{ flex: 1, fontSize: 12 }}>Different on this day?</T><View style={{ width: 120 }}><Segments value={value.different ? 'Yes' : 'No'} options={['No', 'Yes']} onChange={v => onChange({ ...value, different: v === 'Yes', rating: v === 'No' ? ratingFor(saved, format)?.toString() ?? '' : value.rating })} /></View></View>
      {!value.different && value.rating !== (ratingFor(saved, format)?.toString() ?? '') && <T muted style={{ fontSize: 12 }}>Stored on this match: {value.rating || 'not set'}</T>}
    </View>}
    {(!saved || value.different) && <>
      <Field label={`Rating${saved ? ' on this day' : ' (optional)'}`} keyboardType="decimal-pad" value={value.rating} placeholder="e.g. 25.8" onChangeText={rating => onChange({ ...value, rating })} />
      {saved && <Pressable accessibilityRole="checkbox" accessibilityLabel="Update saved rating" accessibilityState={{ checked: value.updateSaved }} onPress={() => onChange({ ...value, updateSaved: !value.updateSaved })} style={[styles.row, { minHeight: 44 }]}><T style={{ color: theme.accent, fontSize: 20 }}>{value.updateSaved ? '☑' : '☐'}</T><T>Update saved</T></Pressable>}
    </>}
  </Card>;
}
function LineupEditor({ value, onChange }: { value: LineupDraft; onChange(value: LineupDraft): void }) {
  const { data } = useApp();
  const switchFormat = (format: Format) => {
    const reset = (draft: PlayerDraft) => {
      const saved = data.players.find(p => p.id === draft.playerId);
      return saved ? { ...draft, rating: ratingFor(saved, format)?.toString() ?? '', different: false, updateSaved: true } : { ...draft, rating: '' };
    };
    onChange({ ...value, format, partner: reset(value.partner), first: reset(value.first), second: reset(value.second) });
  };
  return <View style={styles.stack}>
    <Label>Format</Label><Segments value={value.format} options={['Singles', 'Doubles']} onChange={switchFormat} />
    <Label>Players</Label>
    {value.format === 'Doubles' && <PlayerField label="Partner" format={value.format} value={value.partner} onChange={partner => onChange({ ...value, partner })} />}
    <PlayerField label={value.format === 'Singles' ? 'Opponent' : 'Opponent 1'} format={value.format} value={value.first} onChange={first => onChange({ ...value, first })} />
    {value.format === 'Doubles' && <PlayerField label="Opponent 2" format={value.format} value={value.second} onChange={second => onChange({ ...value, second })} />}
  </View>;
}
function ScoreEditor({ label, value, onChange }: { label: string; value: ScoreDraft; onChange(value: ScoreDraft): void }) {
  return <View style={{ gap: 8 }}>
    <View style={styles.row}><T style={{ flex: 1, fontFamily: fonts.bold }}>{label}</T>
      <View style={{ width: 66 }}><Field accessibilityLabel={`${label} You`} label="You" keyboardType="number-pad" value={value.me} onChangeText={me => onChange({ ...value, me })} style={{ textAlign: 'center', fontFamily: fonts.heading, fontSize: 23 }} /></View>
      <T style={{ marginTop: 20 }}>–</T>
      <View style={{ width: 66 }}><Field accessibilityLabel={`${label} Opponent`} label="Opponent" keyboardType="number-pad" value={value.opponent} onChangeText={opponent => onChange({ ...value, opponent })} style={{ textAlign: 'center', fontFamily: fonts.heading, fontSize: 23 }} /></View>
    </View>
    {needsTiebreak(toScore(value)) && <View style={styles.row}><T muted style={{ flex: 1, fontSize: 12 }}>↳ Tiebreak</T>
      <View style={{ width: 66 }}><Field accessibilityLabel={`${label} tiebreak You`} keyboardType="number-pad" value={value.tbMe} onChangeText={tbMe => onChange({ ...value, tbMe })} /></View><T>–</T>
      <View style={{ width: 66 }}><Field accessibilityLabel={`${label} tiebreak Opponent`} keyboardType="number-pad" value={value.tbOpponent} onChangeText={tbOpponent => onChange({ ...value, tbOpponent })} /></View>
    </View>}
  </View>;
}
function attachPlayer(activity: TennisActivity, player: Player): TennisActivity {
  const attach = (p: Participant) => p.name.toLowerCase() === player.name.toLowerCase() ? { ...p, playerId: player.id } : p;
  const attachLineup = (lineup: Lineup) => ({ ...lineup, opponents: lineup.opponents.map(attach), partner: lineup.partner && attach(lineup.partner) });
  if (activity.type === 'Training') return activity;
  if (activity.type === 'Team training') return { ...activity, sets: activity.sets.map(set => ({ ...set, ...attachLineup(set) })) };
  return { ...activity, ...attachLineup(activity) };
}
export function TennisForm({ initial, kind }: { initial?: TennisActivity; kind: string }) {
  const { data, commit } = useApp();
  const initialMatch = initial?.type === 'Match' || initial?.type === 'Interclub' ? initial : undefined;
  const [type, setType] = useState<TennisActivity['type']>(initial?.type ?? (['Interclub', 'Training', 'Team training'].includes(kind) ? kind as TennisActivity['type'] : 'Match'));
  const [date, setDate] = useState(initial?.date ?? dateKey());
  const [category, setCategory] = useState<'Liga' | 'Division'>(initialMatch?.category ?? 'Division');
  const [surface, setSurface] = useState<Surface>(initial && initial.type !== 'Training' ? initial.surface : 'Hard');
  const [lineup, setLineup] = useState(lineupDraft(initialMatch));
  const [scores, setScores] = useState([scoreDraft(initialMatch?.sets[0]), scoreDraft(initialMatch?.sets[1]), scoreDraft(initialMatch?.sets[2], true)]);
  const [finish, setFinish] = useState<Match['finish']>(initialMatch?.finish ?? 'Completed');
  const [absent, setAbsent] = useState<'me' | 'opponent'>(initialMatch?.absentSide ?? 'opponent');
  const [assessment, setAssessment] = useState<Assessment>(initialMatch?.assessment ?? {});
  const [team, setTeam] = useState<TeamDraft[]>(initial?.type === 'Team training' ? initial.sets.map(teamDraft) : [teamDraft()]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<{ activity: TennisActivity; changes: Change[]; players: { name: string; singlesRating?: number; doublesRating?: number }[] }>();
  const [identity] = useState(() => initial ?? newMeta());
  const [tag, setTag] = useState<'No tag' | 'My club' | 'Friend'>('No tag');
  const split = number(scores[0].me) !== number(scores[0].opponent) && number(scores[1].me) !== number(scores[1].opponent) && (number(scores[0].me) > number(scores[0].opponent)) !== (number(scores[1].me) > number(scores[1].opponent)) && scores.slice(0, 2).every(s => s.me !== '' && s.opponent !== '');
  const persist = async (activity: TennisActivity, changes: Change[]) => {
    setSaving(true);
    if (await commit([...changes, { collection: 'tennis', record: activity }])) closeForm();
    setSaving(false);
  };
  const save = async () => {
    if (saving || pending) return;
    const problems: string[] = [];
    if (!validDate(date)) problems.push('Enter a real date as YYYY-MM-DD.');
    const meta = { id: identity.id, createdAt: identity.createdAt, updatedAt: new Date().toISOString(), demo: identity.demo };
    let activity: TennisActivity;
    let lineups: LineupDraft[] = [];
    if (type === 'Training') activity = { ...meta, type, date };
    else if (type === 'Team training') {
      activity = { ...meta, type, date, surface, sets: team.map(s => ({ id: s.id, ...toLineup(s.lineup), score: toScore(s.score), start: s.start })) };
      lineups = team.map(s => s.lineup);
      if (!team.length) problems.push('Add at least one set.');
      team.forEach((s, i) => {
        const score = toScore(s.score);
        const error = validateTeamSet({ id: s.id, ...toLineup(s.lineup), start: s.start, score });
        if (error) problems.push(`Set ${i + 1}: ${error}`);
        const names = usedDrafts(s.lineup).map(p => p.name.trim().toLowerCase());
        if (names.some(n => !n) || new Set(names).size !== names.length) problems.push(`Set ${i + 1}: enter different names for every player.`);
      });
    } else {
      const lastPlayed = scores.findLastIndex(s => s.me !== '' || s.opponent !== '');
      const selectedScores = finish === 'Walkover' ? [] : finish === 'Completed' ? scores.slice(0, split ? 3 : 2) : scores.slice(0, lastPlayed + 1);
      activity = { ...meta, type, date, category: type === 'Interclub' ? category : undefined, surface, ...toLineup(lineup), sets: selectedScores.map(toScore), finish, absentSide: finish === 'Completed' ? undefined : absent, assessment };
      lineups = [lineup];
      problems.push(...validateMatch(activity));
    }
    for (const l of lineups) for (const p of usedDrafts(l)) {
      if (p.rating.trim() && (!Number.isFinite(Number(p.rating)) || Number(p.rating) < 0)) problems.push(`Enter a valid decimal rating for ${p.name || 'each player'}.`);
    }
    setErrors(problems);
    if (problems.length) return;
    const changes: Change[] = [];
    const newPlayers: { name: string; singlesRating?: number; doublesRating?: number }[] = [];
    for (const l of lineups) for (const p of usedDrafts(l)) {
      const saved = data.players.find(s => s.id === p.playerId || s.name.toLowerCase() === p.name.trim().toLowerCase());
      if (saved) {
        activity = attachPlayer(activity, saved);
        if (p.different && p.updateSaved) {
          const prior: Change | undefined = changes.findLast((c): boolean => c.collection === 'players' && 'record' in c && c.record.id === saved.id);
          const latest: Player = prior?.collection === 'players' && 'record' in prior ? prior.record : saved;
          changes.push({ collection: 'players', record: withRating(latest, l.format, p.rating.trim() ? Number(p.rating) : undefined, meta.updatedAt) });
        }
      } else {
        let candidate = newPlayers.find(n => n.name.toLowerCase() === p.name.trim().toLowerCase());
        if (!candidate) { candidate = { name: p.name.trim() }; newPlayers.push(candidate); }
        candidate[l.format === 'Singles' ? 'singlesRating' : 'doublesRating'] = p.rating.trim() ? Number(p.rating) : undefined;
      }
    }
    if (newPlayers.length) { setTag('No tag'); setPending({ activity, changes, players: newPlayers }); }
    else await persist(activity, changes);
  };
  const answerPlayer = async (savePlayer: boolean) => {
    if (!pending) return;
    let { activity } = pending;
    const changes = [...pending.changes];
    const [candidate, ...rest] = pending.players;
    if (savePlayer) {
      const player: Player = { ...newMeta(), ...candidate, tag: tag === 'No tag' ? undefined : tag, demo: activity.demo };
      changes.push({ collection: 'players', record: player });
      activity = attachPlayer(activity, player);
    }
    if (rest.length) { setTag('No tag'); setPending({ activity, changes, players: rest }); }
    else { setPending(undefined); await persist(activity, changes); }
  };
  const average = assessmentAverage(assessment);
  return <FormPage title={type === 'Team training' ? 'Team training' : type === 'Training' ? 'Training' : initial ? 'Edit match' : 'Log match'} onSave={() => void save()} saving={saving} errors={errors} onDelete={initial ? () => { void commit([{ collection: 'tennis', deleteId: initial.id }]).then(ok => { if (ok) closeForm(); }); } : undefined}>
    <Label>Type</Label><Segments value={type} options={['Interclub', 'Match', 'Training', 'Team training']} onChange={setType} />
    <Field label="Date · YYYY-MM-DD" value={date} onChangeText={setDate} error={validDate(date) ? undefined : 'Use YYYY-MM-DD'} />
    {type !== 'Training' && <>
      {type === 'Interclub' && <><Label>Interclub category</Label><Segments value={category} options={['Division', 'Liga']} onChange={setCategory} /></>}
      {type !== 'Team training' && <LineupEditor value={lineup} onChange={setLineup} />}
      <Label>Surface</Label><Chips value={surface} options={['Hard', 'Clay', 'Carpet']} onChange={setSurface} colors={surfaceColors} />
      {type === 'Team training' ? <>
        {team.map((s, index) => <Card key={s.id}>
          <View style={styles.between}><T heading style={{ fontSize: 23 }}>Set {index + 1}</T>{s.start === '3-3' && <Badge>Not in form</Badge>}</View>
          <LineupEditor value={s.lineup} onChange={value => setTeam(team.map(t => t.id === s.id ? { ...t, lineup: value } : t))} />
          <ScoreEditor label={`Set ${index + 1}`} value={s.score} onChange={value => setTeam(team.map(t => t.id === s.id ? { ...t, score: value } : t))} />
          <Segments value={s.start} options={['Normal', '3-3']} onChange={start => setTeam(team.map(t => t.id === s.id ? { ...t, start } : t))} />
          <T muted style={{ fontSize: 12 }}>{s.start === '3-3' ? 'Start at 3-3 · never counts toward form' : 'Normal start'}</T>
          <Button label={`Remove set ${index + 1}`} secondary onPress={() => setTeam(team.filter(t => t.id !== s.id))} />
        </Card>)}
        <Button label="+ Add set" secondary onPress={() => setTeam([...team, teamDraft()])} />
      </> : <>
        <Label>Finish</Label><Segments value={finish} options={['Completed', 'Retired', 'Walkover']} onChange={setFinish} />
        {finish !== 'Completed' && <><Label>{finish === 'Retired' ? 'Who retired?' : 'Who did not show?'}</Label><Segments value={absent === 'me' ? 'Me' : 'Opponent'} options={['Me', 'Opponent']} onChange={v => setAbsent(v === 'Me' ? 'me' : 'opponent')} /></>}
        {finish !== 'Walkover' && <Card>
          <Label>Score</Label>
          {scores.slice(0, split || finish === 'Retired' ? 3 : 2).map((score, i) => <View key={i} style={styles.stack}>
            {i === 2 && <Segments value={score.matchTiebreak ? 'Match tiebreak' : 'Full set'} options={['Match tiebreak', 'Full set']} onChange={v => setScores(scores.map((s, index) => index === 2 ? { ...s, matchTiebreak: v === 'Match tiebreak' } : s))} />}
            <ScoreEditor label={`Set ${i + 1}`} value={score} onChange={value => setScores(scores.map((s, index) => index === i ? value : s))} />
          </View>)}
          {finish === 'Retired' && <T muted style={{ fontSize: 12 }}>Leave unplayed sets empty. Partial scores are allowed in the last played set.</T>}
        </Card>}
        <Card><View style={styles.between}><Label>Self-assessment</Label><T muted style={{ fontSize: 11 }}>Optional · 1 poor / 5 great</T></View>
          {assessmentLabels.map(label => <View key={label} style={styles.between}>
            <T style={{ width: 74, fontSize: 12 }}>{label}{label === 'Nerves' ? '\n5 = calm' : ''}</T>
            <View style={{ flexDirection: 'row', flex: 1, justifyContent: 'space-between' }}>{[1, 2, 3, 4, 5].map(value => <AssessmentButton key={value} value={value} selected={assessment[label] === value} onPress={() => setAssessment({ ...assessment, [label]: assessment[label] === value ? undefined : value })} label={`${label} ${value}`} />)}</View>
          </View>)}
          <T muted>Average {average !== undefined ? `${average.toFixed(1)}/5` : '—'}</T>
        </Card>
      </>}
    </>}
    <Sheet visible={!!pending} title={`Save ${pending?.players[0]?.name ?? 'player'}?`} onClose={() => setPending(undefined)}>
      <T muted>Add to saved players for faster logging next time.</T>
      <Label>Optional tag</Label><Segments value={tag} options={['No tag', 'My club', 'Friend']} onChange={setTag} />
      <Button label="Save player" onPress={() => void answerPlayer(true)} />
      <Button label="Only this match" secondary onPress={() => void answerPlayer(false)} />
    </Sheet>
  </FormPage>;
}
function AssessmentButton({ value, selected, onPress, label }: { value: number; selected: boolean; onPress(): void; label: string }) {
  const { theme } = useApp();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={{ minWidth: 44, minHeight: 44, padding: 0, borderWidth: 0, justifyContent: 'center', alignItems: 'center' }}><View style={{ width: 30, height: 30, borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: selected ? theme.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}><T heading style={{ color: selected ? theme.onAccent : theme.text, fontSize: 18 }}>{value}</T></View></Pressable>;
}
