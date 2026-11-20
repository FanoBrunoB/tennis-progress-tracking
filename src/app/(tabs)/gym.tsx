import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { newestFirst, dateLabel } from '../../domain/dates';
import { exerciseChanged } from '../../domain/fitness';
import { useApp } from '../../state/AppProvider';
import { Badge, Button, Card, Chips, Dot, Empty, Screen, Segments, T, fonts, styles } from '../../ui/components';

export default function GymScreen() {
  const { data, commit } = useApp();
  const [tab, setTab] = useState<'Activity' | 'Routines'>('Activity');
  const [filter, setFilter] = useState<'All' | 'Legs' | 'Push' | 'Pull'>('All');
  const [archived, setArchived] = useState(false);
  const routines = [...data.routines].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const sessions = data.gym.filter(s => s.date.startsWith(month));
  return <Screen title="Gym" action={<Button label={tab === 'Activity' ? '+ Log session' : '+ New routine'} onPress={() => router.push({ pathname: '/log', params: { kind: tab === 'Activity' ? 'Gym session' : 'Routine' } })} />}>
    <Segments value={tab} options={['Activity', 'Routines']} onChange={setTab} />
    {tab === 'Activity' ? <>
      <T muted style={{ lineHeight: 22 }}><T heading style={{ fontSize: 22 }}>{sessions.length}</T> sessions this month · {(['Legs', 'Push', 'Pull'] as const).map(type => `${type} ${sessions.filter(s => s.type === type).length}`).join(' · ')}</T>
      {newestFirst(data.gym).map(session => <Card key={session.id} onPress={() => router.push({ pathname: '/log', params: { collection: 'gym', id: session.id } })} label={`View gym session on ${session.date}`}>
        <View style={styles.between}><View style={styles.row}><T muted style={{ fontSize: 12 }}>{dateLabel(session.date)}</T><Badge>{session.type}</Badge></View><T muted style={{ fontSize: 12 }}>{session.exercises.length} exercises</T></View>
        <T heading style={{ fontSize: 24 }}>{session.routineName}</T>
        <View style={{ gap: 5 }}>{session.exercises.slice(0, 3).map(e => <View key={e.id} style={styles.between}><T muted style={{ flex: 1 }}>{e.name}</T><T style={{ fontFamily: fonts.bold }}>{e.sets} × {e.reps} · {e.weight === undefined ? 'BW' : `${e.weight} ${e.unit}`}</T>{exerciseChanged(e, session.templateExercises.find(t => t.id === e.id)) && <Dot color="#FF8A3D" size={7} />}</View>)}</View>
      </Card>)}
      {!data.gym.length && <Empty text="No gym sessions yet. Tap + to log one." />}
    </> : <>
      <Chips value={filter} options={['All', 'Legs', 'Push', 'Pull']} onChange={setFilter} />
      {routines.filter(r => !r.archived && (filter === 'All' || r.type === filter)).map(routine => <Card key={routine.id} onPress={() => router.push({ pathname: '/log', params: { collection: 'routines', id: routine.id } })} label={`Edit ${routine.name}`}>
        <View style={styles.row}><Badge>{routine.type}</Badge><View style={{ flex: 1, gap: 5 }}><T style={{ fontFamily: fonts.bold }}>{routine.name}</T><T muted style={{ fontSize: 12 }}>{routine.exercises.length} exercises · used {sessions.filter(s => s.routineId === routine.id).length}× this month</T></View><T>›</T></View>
      </Card>)}
      {!routines.some(r => !r.archived && (filter === 'All' || r.type === filter)) && <Empty text="No routines yet. Create a New routine to get started." />}
      <Button label={`Archived (${routines.filter(r => r.archived).length}) · ${archived ? 'Hide' : 'Show'}`} secondary onPress={() => setArchived(!archived)} />
      {archived && routines.filter(r => r.archived).map(routine => <Card key={routine.id}><T muted>{routine.name}</T><View style={styles.row}>
        <Button label="Edit" secondary onPress={() => router.push({ pathname: '/log', params: { collection: 'routines', id: routine.id } })} />
        <Button label="Restore" onPress={() => void commit([{ collection: 'routines', record: { ...routine, archived: false, updatedAt: new Date().toISOString() } }])} />
      </View></Card>)}
    </>}
  </Screen>;
}
