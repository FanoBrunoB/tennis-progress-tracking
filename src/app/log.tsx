import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { TennisForm } from '../ui/TennisForm';
import { GymForm, RoutineForm } from '../ui/GymForms';
import { OtherForm } from '../ui/OtherForm';
import { Button, Empty, Screen, closeForm } from '../ui/components';
import { ActivityDetails } from '../ui/ActivityDetails';

export default function LogScreen() {
  const { kind, id, collection, mode } = useLocalSearchParams<{ kind?: string; id?: string; collection?: string; mode?: string }>();
  const { data } = useApp();
  const edit = () => router.setParams({ mode: 'edit' });
  if (id) {
    if (collection === 'tennis') {
      const record = data.tennis.find(a => a.id === id);
      if (record) return mode === 'edit' ? <TennisForm key={id} initial={record} kind={record.type} /> : <ActivityDetails activity={{ collection: 'tennis', record }} onEdit={edit} />;
    } else if (collection === 'gym') {
      const record = data.gym.find(a => a.id === id);
      if (record) return mode === 'edit' ? <GymForm key={id} initial={record} /> : <ActivityDetails activity={{ collection: 'gym', record }} onEdit={edit} />;
    } else if (collection === 'routines') {
      const record = data.routines.find(a => a.id === id);
      if (record) return <RoutineForm key={id} initial={record} />;
    } else if (collection === 'other') {
      const record = data.other.find(a => a.id === id);
      if (record) return mode === 'edit' ? <OtherForm key={id} initial={record} kind={record.type} /> : <ActivityDetails activity={{ collection: 'other', record }} onEdit={edit} />;
    }
    return <Screen title="Not found"><Empty text="This record no longer exists." /><Button label="Go back" onPress={closeForm} /></Screen>;
  }
  if (kind === 'Routine') return <RoutineForm />;
  if (kind === 'Gym session') return <GymForm />;
  if (kind === 'Intervals' || kind === 'Run' || kind === 'Padel' || kind === 'Football') return <OtherForm kind={kind} />;
  if (kind === 'Match' || kind === 'Interclub' || kind === 'Training' || kind === 'Team training') return <TennisForm kind={kind} />;
  return <Screen title="Log activity"><Empty text="Choose an activity from the + menu." /><Button label="Go back" onPress={closeForm} /></Screen>;
}
