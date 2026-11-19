import { useState } from 'react';
import { View } from 'react-native';
import type { OtherActivity, IntervalStep } from '../domain/models';
import { categoryColors } from '../domain/models';
import { dateKey, validDate } from '../domain/dates';
import { formatTime, intervalSummary, padelResult, parseTime } from '../domain/fitness';
import { newId, newMeta, useApp } from '../state/AppProvider';
import { Button, Card, Chips, Field, FormPage, IconButton, Label, T, closeForm, fonts, styles } from './components';

interface StepDraft { id: string; label: string; duration: string; pace: string }
export function BlockStrip({ repeats, steps }: { repeats: number; steps: readonly Pick<IntervalStep, 'label' | 'seconds'>[] }) {
  const { theme } = useApp();
  const count = repeats * steps.length;
  return <View style={{ gap: 5 }}>
    <View accessibilityLabel={`${repeats} repeats of ${steps.map(s => s.label).join(', ')}`} style={{ flexDirection: 'row', gap: 3, height: 25, alignItems: 'flex-end' }}>
      {Array.from({ length: Math.min(count, 48) }, (_, index) => {
        const step = steps[index % steps.length];
        return <View key={index} style={{ flex: step.seconds || 1, height: step.label.toLowerCase() === 'recovery' ? 10 : 24, backgroundColor: step.label.toLowerCase() === 'recovery' ? theme.muted : '#FF8A3D', opacity: step.label.toLowerCase() === 'recovery' ? 0.6 : 1, borderRadius: 3 }} />;
      })}
    </View>{count > 48 && <T muted style={{ fontSize: 10 }}>First 48 blocks shown · all {repeats} repeats included in totals</T>}
  </View>;
}
export function OtherForm({ initial, kind }: { initial?: OtherActivity; kind: OtherActivity['type'] }) {
  const { commit } = useApp();
  const [type, setType] = useState(initial?.type ?? kind);
  const [date, setDate] = useState(initial?.date ?? dateKey());
  const [repeats, setRepeats] = useState(initial?.type === 'Intervals' ? initial.repeats : 6);
  const [steps, setSteps] = useState<StepDraft[]>(initial?.type === 'Intervals' ? initial.steps.map(s => ({ id: s.id, label: s.label, duration: formatTime(s.seconds), pace: formatTime(s.paceSeconds) })) : [
    { id: newId(), label: 'Work', duration: '3:00', pace: '4:30' }, { id: newId(), label: 'Recovery', duration: '1:00', pace: '11:00' },
  ]);
  const [time, setTime] = useState(initial?.type === 'Run' ? formatTime(initial.seconds, true) : '');
  const [distance, setDistance] = useState(initial?.type === 'Run' ? initial.distance.toString() : '');
  const [minutes, setMinutes] = useState(initial?.type === 'Padel' || initial?.type === 'Football' ? initial.minutes.toString() : '');
  const [sets, setSets] = useState(initial?.type === 'Padel' ? initial.sets.map(s => ({ me: s.me.toString(), opponent: s.opponent.toString() })) : [{ me: '', opponent: '' }]);
  const [me, setMe] = useState(initial?.type === 'Football' ? initial.me.toString() : '');
  const [opponent, setOpponent] = useState(initial?.type === 'Football' ? initial.opponent.toString() : '');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [identity] = useState(() => initial ?? newMeta());
  const parsedSteps = steps.map(s => ({ id: s.id, label: s.label.trim(), seconds: parseTime(s.duration) ?? NaN, paceSeconds: parseTime(s.pace) ?? NaN }));
  const stepsValid = parsedSteps.length > 0 && parsedSteps.every(s => s.label && Number.isFinite(s.seconds) && s.seconds > 0 && Number.isFinite(s.paceSeconds) && s.paceSeconds > 0);
  const summary = stepsValid ? intervalSummary(repeats, parsedSteps) : undefined;
  const num = (value: string) => value.trim() ? Number(value) : NaN;
  const whole = (value: string) => Number.isInteger(num(value)) && num(value) >= 0;
  const save = async () => {
    if (saving) return;
    const problems: string[] = [];
    if (!validDate(date)) problems.push('Enter a real date as YYYY-MM-DD.');
    const meta = { id: identity.id, createdAt: identity.createdAt, demo: identity.demo, date, updatedAt: new Date().toISOString() };
    let record: OtherActivity;
    if (type === 'Intervals') {
      if (!stepsValid) problems.push('Add steps with a label, a positive duration (mm:ss) and a positive pace (min:ss/km).');
      record = { ...meta, type, repeats, steps: parsedSteps };
    } else if (type === 'Run') {
      const seconds = parseTime(time);
      if (!seconds) problems.push('Enter a positive run time as h:mm:ss or mm:ss.');
      if (!Number.isFinite(num(distance)) || num(distance) <= 0) problems.push('Distance must be greater than zero.');
      record = { ...meta, type, seconds: seconds ?? NaN, distance: num(distance) };
    } else if (type === 'Padel') {
      if (!Number.isFinite(num(minutes)) || num(minutes) <= 0) problems.push('Enter a positive duration in minutes.');
      if (!sets.length || sets.some(s => !whole(s.me) || !whole(s.opponent) || num(s.me) === num(s.opponent))) problems.push('Add at least one set with different, non-negative whole-number scores.');
      record = { ...meta, type, minutes: num(minutes), sets: sets.map(s => ({ me: num(s.me), opponent: num(s.opponent) })) };
      if (!padelResult(record.sets)) problems.push('Add a deciding set so padel finishes with a win or loss.');
    } else {
      if (!Number.isFinite(num(minutes)) || num(minutes) <= 0) problems.push('Enter a positive duration in minutes.');
      if (!whole(me) || !whole(opponent)) problems.push('Enter non-negative whole-number team scores.');
      record = { ...meta, type, minutes: num(minutes), me: num(me), opponent: num(opponent) };
    }
    setErrors(problems);
    if (problems.length) return;
    setSaving(true);
    if (await commit([{ collection: 'other', record }])) closeForm();
    setSaving(false);
  };
  return <FormPage title={initial ? 'Edit activity' : 'Log activity'} saving={saving} onSave={() => void save()} errors={errors} onDelete={initial ? () => { void commit([{ collection: 'other', deleteId: initial.id }]).then(ok => { if (ok) closeForm(); }); } : undefined}>
    <Chips value={type} options={['Intervals', 'Run', 'Padel', 'Football']} onChange={setType} colors={categoryColors} />
    <Field label="Date · YYYY-MM-DD" value={date} onChangeText={setDate} />
    {type === 'Intervals' && <>
      <Card><View style={styles.between}><T style={{ fontFamily: fonts.bold }}>Repeats</T><View style={styles.row}><Button label="−" secondary disabled={repeats === 1} onPress={() => setRepeats(repeats - 1)} /><T heading style={{ fontSize: 28, minWidth: 30, textAlign: 'center' }}>{repeats}</T><Button label="+" secondary onPress={() => setRepeats(repeats + 1)} /></View></View></Card>
      <Label>Each repeat</Label>
      {steps.map((step, index) => <Card key={step.id}>
        <View style={styles.row}><View style={{ flex: 1 }}><Field label={`Step ${index + 1} label`} value={step.label} onChangeText={label => setSteps(steps.map(s => s.id === step.id ? { ...s, label } : s))} /></View><IconButton label={`Remove step ${index + 1}`} onPress={() => setSteps(steps.filter(s => s.id !== step.id))}><T>×</T></IconButton></View>
        <View style={styles.row}><Field label="Duration (mm:ss)" value={step.duration} onChangeText={duration => setSteps(steps.map(s => s.id === step.id ? { ...s, duration } : s))} /><Field label="Pace (min:ss/km)" value={step.pace} onChangeText={pace => setSteps(steps.map(s => s.id === step.id ? { ...s, pace } : s))} /></View>
      </Card>)}
      <Button label="+ Add step" secondary onPress={() => setSteps([...steps, { id: newId(), label: 'Work', duration: '', pace: '' }])} />
      {summary ? <Card><BlockStrip repeats={repeats} steps={parsedSteps} /><View style={styles.row}><Metric label="Total time" value={formatTime(summary.seconds)} /><Metric label="Est. distance" value={`≈ ${summary.distance.toFixed(1)} km`} /></View></Card> : <T muted>Complete each duration and pace to see a live summary.</T>}
    </>}
    {type === 'Run' && <>
      <Field label="Total time (h:mm:ss)" value={time} onChangeText={setTime} placeholder="0:38:10" />
      <Field label="Distance (km)" value={distance} onChangeText={setDistance} keyboardType="decimal-pad" placeholder="7.2" />
      {parseTime(time) && num(distance) > 0 ? <Card><Metric label="Average pace" value={`${formatTime(parseTime(time)! / num(distance))} /km`} /></Card> : null}
    </>}
    {(type === 'Padel' || type === 'Football') && <Field label="Duration (minutes)" value={minutes} onChangeText={setMinutes} keyboardType="decimal-pad" />}
    {type === 'Padel' && <>
      {sets.map((set, index) => <Card key={index}><View style={styles.row}><T>Set {index + 1}</T><Field label="Us" keyboardType="number-pad" value={set.me} onChangeText={value => setSets(sets.map((s, i) => i === index ? { ...s, me: value } : s))} /><T>–</T><Field label="Them" keyboardType="number-pad" value={set.opponent} onChangeText={value => setSets(sets.map((s, i) => i === index ? { ...s, opponent: value } : s))} /></View><Button label={`Remove set ${index + 1}`} secondary onPress={() => setSets(sets.filter((_, i) => i !== index))} /></Card>)}
      <Button label="+ Add set" secondary onPress={() => setSets([...sets, { me: '', opponent: '' }])} />
    </>}
    {type === 'Football' && <Card><View style={styles.row}><Field label="My team" value={me} onChangeText={setMe} keyboardType="number-pad" /><T>–</T><Field label="Rivals" value={opponent} onChangeText={setOpponent} keyboardType="number-pad" /></View></Card>}
  </FormPage>;
}
export function Metric({ label, value }: { label: string; value: string }) {
  return <View style={{ flex: 1, gap: 0 }}><T heading style={{ fontSize: 27 }}>{value}</T><T muted style={{ fontSize: 10, fontFamily: fonts.bold, textTransform: 'uppercase' }}>{label}</T></View>;
}
