import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { assessmentLabels, type GymSession, type OtherActivity, type TennisActivity } from '../domain/models';
import { exerciseChanged } from '../domain/fitness';
import { useApp } from '../state/AppProvider';
import { Badge, Button, Card, IconButton, Label, T, closeForm, fonts, styles } from './components';
import { TennisSummary } from './TennisCard';
import { OtherSummary } from './OtherSummary';

type Activity =
  | { collection: 'tennis'; record: TennisActivity }
  | { collection: 'gym'; record: GymSession }
  | { collection: 'other'; record: OtherActivity };

function TennisDetails({ activity }: { activity: TennisActivity }) {
  return <>
    <Card><TennisSummary activity={activity} /></Card>
    {(activity.type === 'Match' || activity.type === 'Interclub') && <>
      <Card>
        <Label>Finish</Label>
        <T>{activity.finish}{activity.finish !== 'Completed' ? ` · ${activity.absentSide === 'me' ? 'You' : 'Opponent'} ${activity.finish === 'Retired' ? 'retired' : 'did not show'}` : ''}</T>
      </Card>
      <Card>
        <Label>Self-assessment</Label>
        {assessmentLabels.some(label => activity.assessment[label] !== undefined)
          ? assessmentLabels.filter(label => activity.assessment[label] !== undefined).map(label => <View key={label} style={styles.between}>
            <T muted style={{ flex: 1 }}>{label}</T><T>{activity.assessment[label]}/5</T>
          </View>)
          : <T muted>No self-assessment recorded.</T>}
      </Card>
    </>}
  </>;
}

function GymDetails({ session }: { session: GymSession }) {
  return <>
    <Card><Badge>{session.type}</Badge><T heading style={{ fontSize: 28 }}>{session.routineName}</T><T muted>{session.exercises.length} exercises</T></Card>
    {session.exercises.map(exercise => {
      const original = session.templateExercises.find(item => item.id === exercise.id);
      return <Card key={exercise.id}>
        <T style={{ fontFamily: fonts.bold }}>{exercise.name}</T>
        <T>{exercise.sets} sets × {exercise.reps} reps · {exercise.weight === undefined ? 'BW' : `${exercise.weight} ${exercise.unit}`}</T>
        {original && exerciseChanged(exercise, original) && <T muted>Template: {original.sets} × {original.reps} · {original.weight === undefined ? 'BW' : `${original.weight} ${original.unit}`}</T>}
      </Card>;
    })}
  </>;
}

export function ActivityDetails({ activity, onEdit }: { activity: Activity; onEdit(): void }) {
  const { theme } = useApp();
  const focused = useIsFocused();
  const title = activity.collection === 'gym' ? 'Gym session' : activity.record.type;
  return <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, display: focused ? 'flex' : 'none', backgroundColor: theme.bg }}>
    <View style={[styles.between, { paddingHorizontal: 12, paddingTop: 8, width: '100%', maxWidth: 560, alignSelf: 'center' }]}>
      <IconButton label="Back" onPress={closeForm}><ChevronLeft color={theme.text} /></IconButton>
      <T heading style={{ fontSize: 26, flex: 1, textAlign: 'center' }}>{title}</T>
      <Button label="Edit" secondary onPress={onEdit} />
    </View>
    <ScrollView contentContainerStyle={{ gap: 18, padding: 20, paddingBottom: 44, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <T muted>{activity.record.date}</T>
      {activity.collection === 'tennis' ? <TennisDetails activity={activity.record} />
        : activity.collection === 'gym' ? <GymDetails session={activity.record} />
        : <Card><OtherSummary activity={activity.record} detailed /></Card>}
    </ScrollView>
  </SafeAreaView>;
}
