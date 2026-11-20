import { View } from 'react-native';
import { categoryColors, type OtherActivity } from '../domain/models';
import { dateLabel } from '../domain/dates';
import { footballResult, formatTime, intervalSummary, padelResult } from '../domain/fitness';
import { Dot, ResultBadge, T, fonts, styles } from './components';
import { BlockStrip, Metric } from './OtherForm';

export function OtherSummary({ activity, detailed = false }: { activity: OtherActivity; detailed?: boolean }) {
  const result = activity.type === 'Padel' ? padelResult(activity.sets) : activity.type === 'Football' ? footballResult(activity.me, activity.opponent) : undefined;
  const summary = activity.type === 'Intervals' ? intervalSummary(activity.repeats, activity.steps) : undefined;
  return <>
    <View style={styles.between}><View style={styles.row}><Dot color={categoryColors[activity.type]} size={10} /><T style={{ fontFamily: fonts.bold, fontSize: 16 }}>{activity.type}</T></View><T muted style={{ fontSize: 12 }}>{dateLabel(activity.date)}</T>
      {result && <ResultBadge result={result} />}
    </View>
    {activity.type === 'Intervals' && summary && <>
      <View style={styles.row}><Metric label="Repeats" value={`${activity.repeats} ×`} /><Metric label="Total" value={formatTime(summary.seconds)} /><Metric label="Distance" value={`≈ ${summary.distance.toFixed(1)} km`} /></View>
      <BlockStrip repeats={activity.repeats} steps={activity.steps} />
      {detailed ? activity.steps.map(step => <View key={step.id} style={{ gap: 4 }}>
        <T style={{ fontFamily: fonts.bold }}>{step.label}</T>
        <T muted>{formatTime(step.seconds)} @ {formatTime(step.paceSeconds)} /km</T>
      </View>) : <T muted style={{ fontSize: 12 }}>{activity.steps.map(s => `${formatTime(s.seconds)} @ ${formatTime(s.paceSeconds)} /km`).join(' · ')}</T>}
    </>}
    {activity.type === 'Run' && <View style={styles.row}><Metric label="Distance" value={`${activity.distance} km`} /><Metric label="Time" value={formatTime(activity.seconds)} /><Metric label="Avg. pace" value={`${formatTime(activity.seconds / activity.distance)} /km`} /></View>}
    {activity.type === 'Football' && <View style={styles.row}><Metric label="Score" value={`${activity.me} - ${activity.opponent}`} /><Metric label="Duration" value={`${activity.minutes} min`} /></View>}
    {activity.type === 'Padel' && <><View style={styles.wrap}>{activity.sets.map((set, index) => <T key={index} heading style={{ fontSize: 27 }}>{set.me}–{set.opponent}</T>)}</View><T muted>{activity.minutes} min</T>{!result && <T>Tied sets · edit to add a deciding set.</T>}</>}
  </>;
}
