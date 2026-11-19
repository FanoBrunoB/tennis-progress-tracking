import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { categoryColors, type OtherActivity } from '../../domain/models';
import { dateLabel, newestFirst } from '../../domain/dates';
import { footballResult, formatTime, intervalSummary, padelResult } from '../../domain/fitness';
import { useApp } from '../../state/AppProvider';
import { Button, Card, Chips, Dot, Empty, ResultBadge, Screen, T, fonts, styles } from '../../ui/components';
import { BlockStrip, Metric } from '../../ui/OtherForm';

export default function OtherScreen() {
  const { data } = useApp();
  const [filter, setFilter] = useState<'All' | OtherActivity['type']>('All');
  const activities = newestFirst(data.other).filter(a => filter === 'All' || a.type === filter);
  return <Screen title="Other" action={<Button label="+ Log" onPress={() => router.push({ pathname: '/log', params: { kind: 'Intervals' } })} />}>
    <Chips value={filter} options={['All', 'Intervals', 'Run', 'Padel', 'Football']} onChange={setFilter} colors={categoryColors} />
    {activities.map(activity => {
      const result = activity.type === 'Padel' ? padelResult(activity.sets) : activity.type === 'Football' ? footballResult(activity.me, activity.opponent) : undefined;
      return <Card key={activity.id} onPress={() => router.push({ pathname: '/log', params: { collection: 'other', id: activity.id } })} label={`Edit ${activity.type.toLowerCase()} on ${activity.date}`}>
      <View style={styles.between}><View style={styles.row}><Dot color={categoryColors[activity.type]} size={10} /><T style={{ fontFamily: fonts.bold, fontSize: 16 }}>{activity.type}</T></View><T muted style={{ fontSize: 12 }}>{dateLabel(activity.date)}</T>
        {result && <ResultBadge result={result} />}
      </View>
      {activity.type === 'Intervals' && <>
        <View style={styles.row}><Metric label="Repeats" value={`${activity.repeats} ×`} /><Metric label="Total" value={formatTime(intervalSummary(activity.repeats, activity.steps).seconds)} /><Metric label="Distance" value={`≈ ${intervalSummary(activity.repeats, activity.steps).distance.toFixed(1)} km`} /></View>
        <BlockStrip repeats={activity.repeats} steps={activity.steps} />
        <T muted style={{ fontSize: 12 }}>{activity.steps.map(s => `${formatTime(s.seconds)} @ ${formatTime(s.paceSeconds)} /km`).join(' · ')}</T>
      </>}
      {activity.type === 'Run' && <View style={styles.row}><Metric label="Distance" value={`${activity.distance} km`} /><Metric label="Time" value={formatTime(activity.seconds)} /><Metric label="Avg. pace" value={`${formatTime(activity.seconds / activity.distance)} /km`} /></View>}
      {activity.type === 'Football' && <View style={styles.row}><Metric label="Score" value={`${activity.me} - ${activity.opponent}`} /><Metric label="Duration" value={`${activity.minutes} min`} /></View>}
      {activity.type === 'Padel' && <><View style={styles.wrap}>{activity.sets.map((set, index) => <T key={index} heading style={{ fontSize: 27 }}>{set.me}–{set.opponent}</T>)}</View><T muted>{activity.minutes} min</T>{!result && <T>Tied sets · edit to add a deciding set.</T>}</>}
    </Card>;
    })}
    {!activities.length && <Empty text="No activities yet. Tap + to log one." />}
  </Screen>;
}
