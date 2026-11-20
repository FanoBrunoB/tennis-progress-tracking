import { View } from 'react-native';
import { router } from 'expo-router';
import type { Match, Score, Side, TennisActivity } from '../domain/models';
import { surfaceColors } from '../domain/models';
import { dateLabel } from '../domain/dates';
import { assessmentAverage, matchWinner } from '../domain/tennis';
import { Badge, Card, Dot, ResultBadge, T, fonts, styles } from './components';

function ScoreNumber({ set, side }: { set: Score; side: 'me' | 'opponent' }) {
  const loser = set.me < set.opponent ? 'me' : 'opponent';
  return <T style={{ width: 35, textAlign: 'center', fontFamily: fonts.number, fontSize: 24 }}>
    {set[side]}{set.tiebreak && side === loser && <T style={{ fontSize: 10, lineHeight: 10 }}>{String(set.tiebreak[side]).replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)])}</T>}
  </T>;
}
function Scoreboard({ match, winner: setWinner }: { match: Pick<Match, 'partner' | 'opponents' | 'sets' | 'finish' | 'absentSide'>; winner?: Side }) {
  const winner = setWinner ?? matchWinner(match);
  return <View style={{ gap: 7 }}>
    {(['me', 'opponent'] as const).map(side => <View key={side} style={styles.between}>
      <T muted={winner !== side} style={{ flex: 1, fontFamily: winner === side ? fonts.bold : fonts.medium, fontSize: 14 }}>
        {winner === side ? '✓ ' : ''}{side === 'me' ? `You${match.partner ? ` & ${match.partner.name}${match.partner.rating !== undefined ? ` · ${match.partner.rating}` : ''}` : ''}` : match.opponents.map(p => `${p.name}${p.rating !== undefined ? ` · ${p.rating}` : ''}`).join(' / ')}
      </T>
      <View style={{ flexDirection: 'row' }}>{match.sets.map((set, i) => <ScoreNumber key={i} set={set} side={side} />)}</View>
    </View>)}
  </View>;
}
export function TennisCard({ activity }: { activity: TennisActivity }) {
  const open = () => router.push({ pathname: '/log', params: { collection: 'tennis', id: activity.id } });
  return <Card onPress={open} label={`View ${activity.type.toLowerCase()} on ${activity.date}`}><TennisSummary activity={activity} /></Card>;
}
export function TennisSummary({ activity }: { activity: TennisActivity }) {
  if (activity.type === 'Training') return <View style={styles.row}><T muted>{dateLabel(activity.date)}</T><Badge>Training</Badge></View>;
  if (activity.type === 'Team training') return <>
    <View style={styles.wrap}><T muted style={{ fontSize: 12 }}>{dateLabel(activity.date)}</T><Badge>Team training</Badge></View>
    {activity.sets.map(set => <View key={set.id} style={{ gap: 8 }}>
      <View style={styles.between}><T muted>{set.format}</T><ResultBadge size={28} result={set.score.me > set.score.opponent ? 'W' : 'L'} /></View>
      <Scoreboard match={{ ...set, sets: [set.score], finish: 'Completed' }} winner={set.score.me > set.score.opponent ? 'me' : 'opponent'} />
      {set.start === '3-3' && <Badge>Started 3-3 · not in form</Badge>}
    </View>)}
    <View style={styles.row}><Dot color={surfaceColors[activity.surface]} /><T muted>{activity.surface}</T></View>
  </>;
  const winner = matchWinner(activity), average = assessmentAverage(activity.assessment);
  return <>
    <View style={styles.between}>
      <View style={[styles.wrap, { flex: 1 }]}><T muted style={{ fontSize: 12 }}>{dateLabel(activity.date)}</T><Badge gold={activity.type === 'Interclub'}>{activity.type}{activity.category && activity.type === 'Interclub' ? ` · ${activity.category}` : ''}</Badge><T muted style={{ fontSize: 12 }}>{activity.format}</T></View>
      {winner && <ResultBadge interclub={activity.type === 'Interclub'} result={winner === 'me' ? 'W' : 'L'} />}
    </View>
    <Scoreboard match={activity} />
    <View style={styles.between}><View style={[styles.wrap, { flex: 1 }]}><Dot color={surfaceColors[activity.surface]} /><T muted style={{ fontSize: 12 }}>{activity.surface}</T>
      {activity.sets.some(s => s.matchTiebreak) && <T style={{ fontSize: 12 }}>· Match tiebreak</T>}
      {activity.finish === 'Retired' && <T style={{ fontSize: 12 }}>· {activity.absentSide === 'me' ? 'You' : 'Opponent'} retired</T>}
      {activity.finish === 'Walkover' && <T style={{ fontSize: 12 }}>· Walkover</T>}
    </View>{average !== undefined && <T style={{ fontFamily: fonts.bold, fontSize: 12 }}>Self {average.toFixed(1)}/5</T>}</View>
  </>;
}
