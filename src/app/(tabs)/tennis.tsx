import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { getSeasonTheme } from '../../domain/theme';
import { newestFirst } from '../../domain/dates';
import { formResults } from '../../domain/tennis';
import { useApp } from '../../state/AppProvider';
import { Button, Card, Chips, Empty, Screen, T, styles } from '../../ui/components';
import { TennisCard } from '../../ui/TennisCard';

const filters = ['All', 'Interclub', 'Match', 'Team training', 'Training'] as const;
export default function TennisScreen() {
  const { data } = useApp();
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const today = new Date();
  const season = data.tennis.filter(a => new Date(`${a.date}T12:00:00`).getFullYear() === today.getFullYear() && getSeasonTheme(new Date(`${a.date}T12:00:00`)).name === getSeasonTheme(today).name);
  const activities = newestFirst(data.tennis).filter(a => filter === 'All' || a.type === filter);
  return <Screen title="Tennis" action={<Button label="+ Log" onPress={() => router.push({ pathname: '/log', params: { kind: 'Match' } })} />}>
    <View style={styles.row}>{(['Singles', 'Doubles'] as const).map(format => {
      const results = formResults(season, format, Infinity);
      return <Card key={format} style={{ flex: 1 }}><T muted style={{ fontSize: 12 }}>{format} · season</T><T heading style={{ fontSize: 29 }}>{results.filter(r => r.win).length}W - {results.filter(r => !r.win).length}L</T></Card>;
    })}</View>
    <Chips value={filter} options={filters} onChange={setFilter} />
    {activities.length ? activities.map(a => <TennisCard key={a.id} activity={a} />) : <Empty text="No matches yet. Tap + to log one." />}
    <Button label="Manage saved players" secondary onPress={() => router.push('/settings')} />
  </Screen>;
}
