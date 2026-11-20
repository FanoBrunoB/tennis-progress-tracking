import { useState } from 'react';
import { router } from 'expo-router';
import { categoryColors, type OtherActivity } from '../../domain/models';
import { newestFirst } from '../../domain/dates';
import { useApp } from '../../state/AppProvider';
import { Button, Card, Chips, Empty, Screen } from '../../ui/components';
import { OtherSummary } from '../../ui/OtherSummary';

export default function OtherScreen() {
  const { data } = useApp();
  const [filter, setFilter] = useState<'All' | OtherActivity['type']>('All');
  const activities = newestFirst(data.other).filter(a => filter === 'All' || a.type === filter);
  return <Screen title="Other" action={<Button label="+ Log" onPress={() => router.push({ pathname: '/log', params: { kind: 'Intervals' } })} />}>
    <Chips value={filter} options={['All', 'Intervals', 'Run', 'Padel', 'Football']} onChange={setFilter} colors={categoryColors} />
    {activities.map(activity => <Card key={activity.id} onPress={() => router.push({ pathname: '/log', params: { collection: 'other', id: activity.id } })} label={`View ${activity.type.toLowerCase()} on ${activity.date}`}>
      <OtherSummary activity={activity} />
    </Card>)}
    {!activities.length && <Empty text="No activities yet. Tap + to log one." />}
  </Screen>;
}
