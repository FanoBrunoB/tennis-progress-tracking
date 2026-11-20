import { useState } from 'react';
import { View } from 'react-native';
import type { Format, RatingEntry } from '../domain/models';
import { dateKey, validDate } from '../domain/dates';
import { personalRatingHistory } from '../domain/tennis';
import { newMeta, useApp } from '../state/AppProvider';
import { Button, Card, Field, Label, Segments, T, styles } from './components';

export function PersonalRatings() {
  const { data, commit, notify } = useApp();
  const [format, setFormat] = useState<Format>('Singles');
  const [date, setDate] = useState(dateKey);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const histories = {
    Singles: personalRatingHistory(data.ratings, 'Singles'),
    Doubles: personalRatingHistory(data.ratings, 'Doubles'),
  };
  const save = async () => {
    if (saving) return;
    const rating = value.trim() ? Number(value) : NaN;
    if (!validDate(date)) { setError('Enter a real date as YYYY-MM-DD.'); return; }
    if (!Number.isFinite(rating) || rating < 0) { setError('Enter a non-negative decimal rating.'); return; }
    setError(undefined);
    setSaving(true);
    const record: RatingEntry = { ...newMeta(), date, format, rating };
    if (await commit([{ collection: 'ratings', record }])) {
      setValue('');
      notify(`${format} rating added to history.`);
    }
    setSaving(false);
  };
  return <>
    <T heading style={{ fontSize: 25 }}>My rating</T>
    <View style={styles.row}>{(['Singles', 'Doubles'] as const).map(item => {
      const latest = histories[item][0];
      return <Card key={item} style={{ flex: 1 }}>
        <T muted>{item} · latest</T>
        <T heading style={{ fontSize: 30 }}>{latest?.rating ?? '—'}</T>
        <T muted style={{ fontSize: 12 }}>{latest?.date ?? 'Not recorded yet'}</T>
      </Card>;
    })}</View>
    <Card>
      <T muted>Every update adds a dated entry. Earlier ratings are kept.</T>
      <Segments value={format} options={['Singles', 'Doubles']} onChange={setFormat} />
      {error && <T accessibilityRole="alert">{error}</T>}
      <Field label="Rating date · YYYY-MM-DD" value={date} onChangeText={setDate} editable={!saving} />
      <Field label={`${format} rating`} keyboardType="decimal-pad" placeholder="e.g. 25.8" value={value} onChangeText={setValue} editable={!saving} onSubmitEditing={() => void save()} />
      <Button label={saving ? 'Saving rating...' : 'Add rating update'} disabled={saving} onPress={() => void save()} />
    </Card>
    <Card>
      <Label>{format} rating history</Label>
      {histories[format].length ? histories[format].map(entry => <View key={entry.id} style={styles.between}>
        <T muted>{entry.date}</T>
        <T style={{ fontSize: 18 }}>{entry.rating}</T>
      </View>) : <T muted>No {format.toLowerCase()} ratings yet. Add your first update above.</T>}
    </Card>
  </>;
}
