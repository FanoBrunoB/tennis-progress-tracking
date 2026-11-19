import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import type { Exercise, GymSession, Routine, RoutineType } from '../domain/models';
import { activeRoutines, editRoutine, exerciseChanged, routineName, sessionFromRoutine } from '../domain/fitness';
import { dateKey, dateLabel, validDate } from '../domain/dates';
import { newId, newMeta, useApp } from '../state/AppProvider';
import { Button, Card, Empty, Field, FormPage, Label, Segments, T, closeForm, fonts, styles } from './components';

interface ExerciseDraft { id: string; name: string; sets: string; reps: string; weight: string; unit: 'kg' | 'lb' }
const draft = (exercise?: Exercise): ExerciseDraft => ({ id: exercise?.id ?? newId(), name: exercise?.name ?? '', sets: exercise?.sets.toString() ?? '3', reps: exercise?.reps.toString() ?? '10', weight: exercise?.weight?.toString() ?? '', unit: exercise?.unit ?? 'kg' });
function toExercise(e: ExerciseDraft): Exercise {
  return { ...e, name: e.name.trim(), sets: e.sets.trim() ? Number(e.sets) : NaN, reps: e.reps.trim() ? Number(e.reps) : NaN, weight: e.weight.trim() ? Number(e.weight) : undefined };
}
function exerciseErrors(exercises: Exercise[]): string[] {
  if (!exercises.length) return ['Add at least one exercise.'];
  return exercises.flatMap((e, i) => !e.name || !Number.isInteger(e.sets) || e.sets < 1 || !Number.isInteger(e.reps) || e.reps < 1 || e.weight !== undefined && (!Number.isFinite(e.weight) || e.weight < 0) ? [`Exercise ${i + 1}: enter a name, positive whole-number sets/reps and an optional non-negative weight.`] : []);
}
function ExerciseEditor({ value, onChange, original, children }: { value: ExerciseDraft; onChange(value: ExerciseDraft): void; original?: Exercise; children?: React.ReactNode }) {
  const { theme } = useApp();
  const changed = original && exerciseChanged(toExercise(value), original);
  const border = (key: 'sets' | 'reps' | 'weight' | 'unit') => original && toExercise(value)[key] !== original[key] ? { borderColor: '#FF8A3D', borderWidth: 2 } : undefined;
  return <Card style={changed ? { borderColor: '#FF8A3D', borderWidth: 1.5 } : undefined}>
    {original ? <T style={{ fontFamily: fonts.bold }}>{value.name}</T> : <Field label="Exercise name" value={value.name} placeholder="e.g. Bench press" onChangeText={name => onChange({ ...value, name })} />}
    {changed && <T style={{ color: '#FFD4BA', fontSize: 11 }}>EDITED TODAY · was {original.sets} × {original.reps} · {original.weight === undefined ? 'BW' : `${original.weight} ${original.unit}`}</T>}
    <View style={[styles.row, { alignItems: 'flex-start' }]}>
      <Field label="Sets" accessibilityLabel={`${value.name || 'Exercise'} sets`} value={value.sets} keyboardType="number-pad" onChangeText={sets => onChange({ ...value, sets })} style={[{ fontFamily: fonts.number, fontSize: 24, textAlign: 'center' }, border('sets')]} />
      <Field label="Reps" accessibilityLabel={`${value.name || 'Exercise'} reps`} value={value.reps} keyboardType="number-pad" onChangeText={reps => onChange({ ...value, reps })} style={[{ fontFamily: fonts.number, fontSize: 24, textAlign: 'center' }, border('reps')]} />
      <Field label="Weight · BW if empty" accessibilityLabel={`${value.name || 'Exercise'} weight`} value={value.weight} placeholder="BW" keyboardType="decimal-pad" onChangeText={weight => onChange({ ...value, weight })} style={[{ fontFamily: fonts.number, fontSize: 24, textAlign: 'center' }, border('weight')]} />
    </View>
    <View style={[{ borderRadius: 16 }, border('unit')]}><Segments value={value.unit} options={['kg', 'lb']} onChange={unit => onChange({ ...value, unit })} /></View>
    {children}
    {!original && <T muted style={{ fontSize: 11, color: theme.muted }}>Each exercise keeps its own unit.</T>}
  </Card>;
}
export function RoutineForm({ initial }: { initial?: Routine }) {
  const { commit } = useApp();
  const [type, setType] = useState<RoutineType>(initial?.type ?? 'Push');
  const [name, setName] = useState(initial?.name ?? routineName(new Date(), type));
  const [nameEdited, setNameEdited] = useState(false);
  const [exercises, setExercises] = useState<ExerciseDraft[]>(initial?.exercises.map(draft) ?? [draft()]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [identity] = useState(() => initial ?? newMeta());
  const build = (): Routine => initial ? editRoutine(initial, { type, name: name.trim(), exercises: exercises.map(toExercise) }, new Date().toISOString()) : { ...identity, type, name: name.trim(), exercises: exercises.map(toExercise), archived: false, updatedAt: new Date().toISOString() };
  const save = async () => {
    if (saving) return;
    const record = build(), problems = exerciseErrors(record.exercises);
    if (!record.name) problems.unshift('Enter a routine name.');
    setErrors(problems);
    if (problems.length) return;
    setSaving(true);
    if (await commit([{ collection: 'routines', record }])) closeForm();
    setSaving(false);
  };
  const move = (index: number, delta: number) => {
    const next = [...exercises], target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setExercises(next);
  };
  return <FormPage title="Routine template" saving={saving} onSave={() => void save()} errors={errors} onDelete={initial ? () => { void commit([{ collection: 'routines', deleteId: initial.id }]).then(ok => { if (ok) closeForm(); }); } : undefined}>
    <Label>Type</Label><Segments value={type} options={['Legs', 'Push', 'Pull']} onChange={value => { setType(value); if (!initial && !nameEdited) setName(routineName(new Date(), value)); }} />
    <Field label="Name · month it was created" value={name} onChangeText={value => { setNameEdited(true); setName(value); }} />
    <T muted style={{ fontSize: 12 }}>Created {initial ? dateLabel(initial.createdAt.slice(0, 10)) : 'today'} · last edited {initial ? dateLabel(initial.updatedAt.slice(0, 10)) : 'today'}</T>
    <Card><T muted style={{ lineHeight: 21 }}>Changing weights, sets or reps updates this routine and keeps its name. A new month name only appears when you create a New routine.</T></Card>
    <Label>Exercises · sets / reps / weight</Label>
    {exercises.map((e, index) => <ExerciseEditor key={e.id} value={e} onChange={value => setExercises(exercises.map(x => x.id === e.id ? value : x))}>
      <View style={styles.row}><Button label="Move up" secondary disabled={index === 0} onPress={() => move(index, -1)} style={styles.grow} /><Button label="Move down" secondary disabled={index === exercises.length - 1} onPress={() => move(index, 1)} style={styles.grow} /></View>
      <Button label="Remove exercise" secondary onPress={() => setExercises(exercises.filter(x => x.id !== e.id))} />
    </ExerciseEditor>)}
    <Button label="+ Add exercise" secondary onPress={() => setExercises([...exercises, draft()])} />
    {initial && <Button label={initial.archived ? 'Restore routine' : 'Archive routine'} secondary onPress={() => { void commit([{ collection: 'routines', record: editRoutine(initial, { archived: !initial.archived }, new Date().toISOString()) }]).then(ok => { if (ok) closeForm(); }); }} />}
  </FormPage>;
}
export function GymForm({ initial }: { initial?: GymSession }) {
  const { data, commit } = useApp();
  const [type, setType] = useState<RoutineType>(initial?.type ?? 'Push');
  const [date, setDate] = useState(initial?.date ?? dateKey());
  const [selected, setSelected] = useState<ReturnType<typeof sessionFromRoutine> | undefined>(initial);
  const [exercises, setExercises] = useState<ExerciseDraft[]>(initial?.exercises.map(draft) ?? []);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [identity] = useState(() => initial ?? newMeta());
  const options = activeRoutines(data.routines, type);
  const save = async () => {
    if (saving) return;
    const parsed = exercises.map(toExercise);
    const problems = exerciseErrors(parsed);
    if (!validDate(date)) problems.unshift('Enter a real date as YYYY-MM-DD.');
    if (!selected) problems.unshift('Pick an active routine for this session.');
    setErrors(problems);
    if (problems.length || !selected) return;
    const record: GymSession = { ...identity, ...selected, type, date, exercises: parsed, updatedAt: new Date().toISOString() };
    setSaving(true);
    if (await commit([{ collection: 'gym', record }])) closeForm();
    setSaving(false);
  };
  return <FormPage title={initial ? 'Edit gym session' : 'Log gym session'} onSave={() => void save()} saving={saving} errors={errors} onDelete={initial ? () => { void commit([{ collection: 'gym', deleteId: initial.id }]).then(ok => { if (ok) closeForm(); }); } : undefined}>
    <Field label="Date · YYYY-MM-DD" value={date} onChangeText={setDate} />
    <Label>Type</Label><Segments value={type} options={['Legs', 'Push', 'Pull']} onChange={value => { setType(value); setSelected(undefined); setExercises([]); }} />
    <Label>Routine</Label>
    {selected && <Card><T heading style={{ fontSize: 24 }}>{selected.routineName}</T><T muted>Selected · prefilled from template</T></Card>}
    {options.map(routine => <Button key={routine.id} label={`${selected?.routineId === routine.id ? '✓ ' : ''}${routine.name}`} secondary onPress={() => { const snapshot = sessionFromRoutine(routine); setSelected(snapshot); setExercises(snapshot.exercises.map(draft)); }} />)}
    {!options.length && !selected && <Empty text="No active routines of this type. Create a routine first." />}
    <Button label="+ New routine" secondary onPress={() => router.push({ pathname: '/log', params: { kind: 'Routine' } })} />
    {selected && <>
      <Label>Today&apos;s numbers</Label>
      {exercises.map(e => <ExerciseEditor key={e.id} value={e} original={selected.templateExercises.find(x => x.id === e.id)} onChange={value => setExercises(exercises.map(x => x.id === e.id ? value : x))} />)}
      <Card><T muted style={{ lineHeight: 22 }}>Changes here only apply to this session. To change the routine for good, edit the template.</T>
        {data.routines.some(r => r.id === selected.routineId) && <Button label="Edit template" secondary onPress={() => router.push({ pathname: '/log', params: { collection: 'routines', id: selected.routineId } })} />}
      </Card>
    </>}
  </FormPage>;
}
