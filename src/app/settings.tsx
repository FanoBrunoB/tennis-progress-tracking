import { useState } from 'react';
import { View } from 'react-native';
import type { Player } from '../domain/models';
import { themes, type Season } from '../domain/theme';
import { useApp } from '../state/AppProvider';
import { useSession } from '../state/CloudGate';
import { Button, Card, DeleteButton, Field, Screen, Sheet, T, closeForm, fonts, styles } from '../ui/components';
import { PersonalRatings } from '../ui/PersonalRatings';

export default function SettingsScreen() {
  const { data, theme, override, setOverride, toggleDemo, commit } = useApp();
  const [debug, setDebug] = useState(false);
  const [editing, setEditing] = useState<Player>();
  const [name, setName] = useState('');
  const [singles, setSingles] = useState('');
  const [doubles, setDoubles] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const session = useSession();
  const demo = Object.values(data).some(records => records.some(r => r.demo));
  const savePlayer = async () => {
    if (!editing) return;
    if (!name.trim() || [singles, doubles].some(r => r.trim() && (!Number.isFinite(Number(r)) || Number(r) < 0))) { setError('Enter a name and optional non-negative decimal ratings.'); return; }
    if (data.players.some(p => p.id !== editing.id && p.name.toLowerCase() === name.trim().toLowerCase())) { setError('A saved player already has this name.'); return; }
    setBusy(true);
    if (await commit([{ collection: 'players', record: { ...editing, name: name.trim(), singlesRating: singles.trim() ? Number(singles) : undefined, doublesRating: doubles.trim() ? Number(doubles) : undefined, updatedAt: new Date().toISOString() } }])) setEditing(undefined);
    setBusy(false);
  };
  return <Screen title="Settings" action={<Button label="Done" onPress={closeForm} />}>
    <Card><T heading style={{ fontSize: 26 }}>Your court. Your progress.</T>{session
      ? <><T muted style={{ lineHeight: 22 }}>Synced to {session.email ?? 'your account'}. Sign in on another device to see the same logs.</T><Button label="Sign out" secondary onPress={() => void session.signOut()} /></>
      : <T muted style={{ lineHeight: 22 }}>Saved on this device. No account or cloud connection. Clearing browser or app storage removes your logs.</T>}</Card>
    <PersonalRatings />
    <T heading style={{ fontSize: 25 }}>Saved players</T>
    {!data.players.length && <T muted>Players you choose to save while logging appear here.</T>}
    {[...data.players].sort((a, b) => a.name.localeCompare(b.name)).map(player => <Card key={player.id} onPress={() => { setEditing(player); setName(player.name); setSingles(player.singlesRating?.toString() ?? ''); setDoubles(player.doublesRating?.toString() ?? ''); setError(undefined); }} label={`Edit ${player.name}`}>
      <T style={{ fontFamily: fonts.bold }}>★ {player.name}</T><T muted>{player.tag ? `${player.tag} · ` : ''}Singles {player.singlesRating ?? '—'} · Doubles {player.doublesRating ?? '—'}</T>
    </Card>)}
    <Button label={debug ? 'Hide developer options' : 'Developer options'} secondary onPress={() => setDebug(!debug)} />
    {debug && <Card><T heading style={{ fontSize: 24 }}>Theme preview</T><T muted>Current: {theme.name}. Overrides last for this app session only.</T>
      <Button label={override === null ? '✓ Automatic by date' : 'Automatic by date'} secondary onPress={() => setOverride(null)} />
      {(Object.keys(themes) as Season[]).map(season => <Button key={season} label={`${override === season ? '✓ ' : ''}${themes[season].name}`} secondary onPress={() => setOverride(season)} />)}
      <T heading style={{ fontSize: 24 }}>Demo data</T><T muted>Demo records are labelled internally and can be removed without deleting your own logs.</T>
      <Button disabled={busy} label={demo ? 'Remove demo data' : 'Load demo data'} onPress={() => { setBusy(true); void toggleDemo(!demo).finally(() => setBusy(false)); }} />
    </Card>}
    <Sheet visible={!!editing} title="Edit saved player" onClose={() => setEditing(undefined)}>
      {error && <T accessibilityRole="alert">{error}</T>}
      <Field label="Name" value={name} onChangeText={setName} />
      <View style={styles.row}><Field label="Singles rating" value={singles} onChangeText={setSingles} keyboardType="decimal-pad" /><Field label="Doubles rating" value={doubles} onChangeText={setDoubles} keyboardType="decimal-pad" /></View>
      <T muted>Past matches keep the name and rating recorded on that day.</T>
      <Button label="Save player" disabled={busy} onPress={() => void savePlayer()} />
      <DeleteButton label="Delete player" onConfirm={() => { if (editing) void commit([{ collection: 'players', deleteId: editing.id }]).then(ok => { if (ok) setEditing(undefined); }); }} />
    </Sheet>
  </Screen>;
}
