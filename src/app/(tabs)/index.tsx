import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { categoryColors } from '../../domain/models';
import { calendarDays, dateKey, dateLabel, newestFirst } from '../../domain/dates';
import { formResults } from '../../domain/tennis';
import { useApp } from '../../state/AppProvider';
import { Card, Dot, Empty, IconButton, ResultBadge, Screen, Sheet, T, fonts, styles } from '../../ui/components';

export default function HomeScreen() {
  const { data, theme } = useApp();
  const { width } = useWindowDimensions();
  const calendarPadding = Math.max(0, Math.min(18, Math.floor((Math.min(width, 560) - 40 - 7 * 44) / 2)));
  const [month, setMonth] = useState(new Date());
  const [day, setDay] = useState<string>();
  const activities = [
    ...data.tennis.map(a => ({ ...a, collection: 'tennis', category: 'Tennis' as const })),
    ...data.gym.map(a => ({ ...a, collection: 'gym', category: 'Gym' as const, type: `Gym · ${a.type}` })),
    ...data.other.map(a => ({ ...a, collection: 'other', category: a.type })),
  ];
  return <Screen title="Home" home>
    <Card>
      <View style={styles.between}><T heading style={{ fontSize: 25 }}>Form</T><T muted style={{ fontSize: 12 }}>Last 5</T></View>
      {(['Singles', 'Doubles'] as const).map(format => {
        const results = formResults(data.tennis, format);
        return <View key={format} style={[styles.row, { justifyContent: 'space-between', gap: 2 }]}>
          <T muted style={{ fontFamily: fonts.medium, fontSize: 12, width: 56, flexShrink: 0 }}>{format}</T>
          {Array.from({ length: 5 }, (_, i) => {
            // DECISION: empty slots precede results so the latest is always the rightmost circle.
            const result = results[i - (5 - results.length)];
            return result ? <Pressable key={result.id} accessibilityRole="button" accessibilityLabel={`${format} ${result.win ? 'win' : 'loss'} on ${result.date}`} onPress={() => {
              const activity = data.tennis.find(a => a.id === result.id || a.type === 'Team training' && a.sets.some(s => s.id === result.id));
              if (activity) router.push({ pathname: '/log', params: { collection: 'tennis', id: activity.id } });
            }} style={{ minHeight: 52, padding: 0, borderWidth: 0, justifyContent: 'center' }}><ResultBadge size={44} result={result.win ? 'W' : 'L'} interclub={result.interclub} /></Pressable> : <View key={i} accessibilityLabel="No result yet" style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.border }} />;
          })}
        </View>;
      })}
    </Card>
    <Card style={{ backgroundColor: theme.deep, paddingHorizontal: calendarPadding, paddingVertical: 18 }}>
      <View style={styles.between}><T heading style={{ fontSize: 25 }}>{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</T>
        <View style={styles.row}><IconButton label="Previous month" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft color={theme.text} size={20} /></IconButton><IconButton label="Next month" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight color={theme.text} size={20} /></IconButton></View>
      </View>
      <View style={{ flexDirection: 'row' }}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <T key={d} muted style={{ width: '14.2857%', textAlign: 'center', fontFamily: fonts.bold, fontSize: 11 }}>{d}</T>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{calendarDays(month).map((date, i) => {
        const categories = [...new Set(activities.filter(a => a.date === date).map(a => a.category))];
        const today = date === dateKey();
        return <View key={date ?? `empty-${i}`} style={{ width: '14.2857%', minHeight: 44 }}>
          {date && <Pressable accessibilityRole="button" accessibilityLabel={`${dateLabel(date)}, ${activities.filter(a => a.date === date).length} activities`} onPress={() => setDay(date)} style={{ minHeight: 44, padding: 0, borderWidth: 0, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 1 }}>
            <View style={{ width: 30, height: 30, borderRadius: 18, backgroundColor: today ? theme.accent : 'transparent', justifyContent: 'center', alignItems: 'center' }}><T muted={date > dateKey()} style={{ fontFamily: fonts.medium, color: today ? theme.onAccent : date > dateKey() ? theme.muted : theme.text }}>{Number(date.slice(-2))}</T></View>
            <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center', minHeight: 9 }}>{categories.slice(0, 3).map(category => <Dot key={category} color={categoryColors[category]} size={6} />)}{categories.length > 3 && <T style={{ fontSize: 8 }}>+</T>}</View>
          </Pressable>}
        </View>;
      })}</View>
    </Card>
    <Sheet visible={!!day} title={day ? dateLabel(day) : ''} onClose={() => setDay(undefined)}>
      {newestFirst(activities.filter(a => a.date === day)).map(a => <Card key={a.id} onPress={() => { setDay(undefined); router.push({ pathname: '/log', params: { collection: a.collection, id: a.id } }); }} label={`Open ${a.type}`}><View style={styles.row}><Dot color={categoryColors[a.category]} /><T style={{ fontFamily: fonts.bold }}>{a.type}</T></View></Card>)}
      {!activities.some(a => a.date === day) && <Empty text="No activities on this day." />}
    </Sheet>
  </Screen>;
}
