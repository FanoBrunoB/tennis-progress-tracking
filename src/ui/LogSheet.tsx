import { router } from 'expo-router';
import { View, Pressable } from 'react-native';
import { categoryColors } from '../domain/models';
import { dateKey } from '../domain/dates';
import { newMeta, useApp } from '../state/AppProvider';
import { Dot, Label, Sheet, T, fonts, styles } from './components';

const groups = [
  { title: 'Tennis', items: [
    { kind: 'Interclub', subtitle: 'Liga or division', color: categoryColors.Tennis },
    { kind: 'Match', subtitle: 'Friendly or tournament', color: categoryColors.Tennis },
    { kind: 'Team training', subtitle: 'Sets incl. 3-3 starts', color: categoryColors.Tennis },
    { kind: 'Training', subtitle: 'One tap · today', color: categoryColors.Tennis },
  ] },
  { title: 'Gym + other', items: [
    { kind: 'Gym session', subtitle: 'From a routine', color: categoryColors.Gym },
    { kind: 'Intervals', subtitle: 'Repeats + pace', color: categoryColors.Intervals },
    { kind: 'Run', subtitle: 'Time + distance', color: categoryColors.Run },
    { kind: 'Padel', subtitle: 'Sets + duration', color: categoryColors.Padel },
    { kind: 'Football', subtitle: 'Score + duration', color: categoryColors.Football },
  ] },
];
export function LogSheet({ visible, onClose }: { visible: boolean; onClose(): void }) {
  const { theme, commit, notify } = useApp();
  const select = async (kind: string) => {
    onClose();
    if (kind === 'Training') {
      const record = { ...newMeta(), date: dateKey(), type: 'Training' as const };
      if (await commit([{ collection: 'tennis', record }])) notify('Training logged for today', async () => { await commit([{ collection: 'tennis', deleteId: record.id }]); });
    } else router.push({ pathname: '/log', params: { kind } });
  };
  return <Sheet visible={visible} onClose={onClose} title="Log activity">
    {groups.map(group => <View key={group.title} style={styles.stack}>
      <Label>{group.title}</Label>
      <View style={styles.wrap}>{group.items.map(item => <Pressable key={item.kind} accessibilityRole="button" accessibilityLabel={`Log ${item.kind}`} onPress={() => void select(item.kind)} style={[styles.row, { width: '48%', borderWidth: 0, gap: 10, padding: 12, minHeight: 64, backgroundColor: theme.card2, borderRadius: 16 }]}>
        <Dot color={item.color} size={11} />
        <View style={{ flex: 1, gap: 3 }}><T style={{ fontFamily: fonts.bold, fontSize: 14 }}>{item.kind}</T><T muted style={{ fontSize: 11 }}>{item.subtitle}</T></View>
      </Pressable>)}</View>
    </View>)}
  </Sheet>;
}
