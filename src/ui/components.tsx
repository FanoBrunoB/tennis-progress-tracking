import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, X } from 'lucide-react-native';
import Svg, { Ellipse, Line } from 'react-native-svg';
import { router, useIsFocused } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { readableText } from '../domain/theme';

export const fonts = { body: 'Inter_400Regular', medium: 'Inter_500Medium', bold: 'Inter_700Bold', heading: 'BarlowCondensed_700Bold', number: 'BarlowCondensed_600SemiBold' };
const SurfaceContext = React.createContext<string | null>(null);
export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  wrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  stack: { gap: 14 },
  grow: { flex: 1 },
  caption: { fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: fonts.bold },
});
export function T({ children, muted, heading, style, ...props }: React.ComponentProps<typeof Text> & { muted?: boolean; heading?: boolean }) {
  const { theme } = useApp();
  const surface = React.useContext(SurfaceContext) ?? theme.bg;
  return <Text {...props} style={[{ color: muted ? readableText(theme.muted, surface, theme.text) : theme.text, fontSize: 14, fontFamily: heading ? fonts.heading : fonts.body }, style]}>{children}</Text>;
}
export function Button({ label, onPress, secondary, danger, disabled, style }: { label: string; onPress(): void; secondary?: boolean; danger?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const { theme } = useApp();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [{ borderWidth: 0, minWidth: 44, minHeight: 44, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? '#892C25' : secondary ? theme.card2 : theme.accent, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }, style]}>
    <T style={{ fontFamily: fonts.bold, color: danger ? '#FFFFFF' : secondary ? theme.text : theme.onAccent }}>{label}</T>
  </Pressable>;
}
export function IconButton({ label, children, onPress }: { label: string; children: React.ReactNode; onPress(): void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ padding: 0, borderWidth: 0, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>{children}</Pressable>;
}
export function Card({ children, style, onPress, label }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?(): void; label?: string }) {
  const { theme } = useApp();
  const cardStyle = [{ backgroundColor: theme.card, borderWidth: 0, borderRadius: 20, padding: 16, gap: 12 }, style];
  const background = StyleSheet.flatten(cardStyle)?.backgroundColor;
  return <SurfaceContext.Provider value={typeof background === 'string' ? background : theme.card}>{onPress ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={cardStyle}>{children}</Pressable> : <View style={cardStyle}>{children}</View>}</SurfaceContext.Provider>;
}
export function Field({ label, error, style, ...props }: TextInputProps & { label?: string; error?: string; style?: StyleProp<TextStyle> }) {
  const { theme } = useApp();
  return <View style={{ flex: 1, gap: 7 }}>
    {label && <T muted style={{ fontSize: 12, fontFamily: fonts.medium }}>{label}</T>}
    <TextInput {...props} accessibilityLabel={props.accessibilityLabel ?? label} placeholderTextColor={theme.muted} style={[{ color: theme.text, backgroundColor: theme.deep, borderWidth: 1, borderColor: error ? '#FFAA85' : theme.border, borderRadius: 12, padding: 12, minHeight: 44, fontSize: 15, fontFamily: fonts.medium }, style]} />
    {error && <T accessibilityRole="alert" style={{ color: '#FFD4BA', fontSize: 12 }}>{error}</T>}
  </View>;
}
export function Label({ children }: { children: React.ReactNode }) {
  return <T muted style={[styles.caption, { marginTop: 6 }]}>{children}</T>;
}
export function Segments<const TValue extends string>({ value, options, onChange }: { value: TValue; options: readonly TValue[]; onChange(value: NoInfer<TValue>): void }) {
  const { theme } = useApp();
  return <View style={{ flexDirection: 'row', backgroundColor: theme.deep, borderRadius: 15, padding: 4, flexWrap: 'wrap' }}>
    {options.map(option => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: option === value }} onPress={() => onChange(option)} style={{ flex: 1, minWidth: 62, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 11, borderWidth: 0, paddingVertical: 0, paddingHorizontal: 6, backgroundColor: option === value ? theme.accent : 'transparent' }}>
      <T style={{ fontSize: 12, fontFamily: fonts.bold, color: option === value ? theme.onAccent : theme.text, textAlign: 'center' }}>{option}</T>
    </Pressable>)}
  </View>;
}
export function Chips<const TValue extends string>({ value, options, onChange, colors }: { value: TValue; options: readonly TValue[]; onChange(value: NoInfer<TValue>): void; colors?: Partial<Record<NoInfer<TValue>, string>> }) {
  const { theme } = useApp();
  return <View style={styles.wrap}>{options.map(option => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: option === value }} onPress={() => onChange(option)} style={[styles.row, { borderRadius: 25, borderWidth: 1, borderColor: value === option ? theme.text : theme.border, backgroundColor: value === option ? theme.text : 'transparent', minWidth: 44, minHeight: 44, paddingVertical: 0, paddingHorizontal: 13 }]}>
    {colors?.[option] && <Dot color={colors[option]} />}
    <T style={{ color: value === option ? theme.deep : theme.text, fontFamily: fonts.bold, fontSize: 13 }}>{option}</T>
  </Pressable>)}</View>;
}
export const Dot = ({ color, size = 8 }: { color?: string; size?: number }) => <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color }} />;
export function Badge({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  const { theme } = useApp();
  return <View style={{ backgroundColor: gold ? 'transparent' : theme.card2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: gold ? 1 : 0, borderColor: '#FFD978' }}><T style={{ color: gold ? '#FFD978' : theme.text, fontSize: 11, fontFamily: fonts.bold, textTransform: 'uppercase' }}>{children}</T></View>;
}
export function ResultBadge({ result, interclub, size = 32 }: { result: string; interclub?: boolean; size?: number }) {
  const { theme } = useApp();
  return <View accessibilityLabel={`${result === 'W' ? 'Win' : result === 'L' ? 'Loss' : 'Draw'}${interclub ? ', interclub' : ''}`} style={{ width: size, height: size }}>
    {interclub && <View pointerEvents="none" style={{ position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderWidth: 2, borderColor: '#E3B341', borderRadius: 60 }} />}
    <View style={{ height: size, width: size, borderRadius: size / 2, backgroundColor: result === 'W' ? '#2E9E2E' : result === 'L' ? '#C0392B' : theme.card2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontFamily: fonts.heading, fontSize: size * 0.5, textShadowColor: '#102A12', textShadowRadius: 2, textShadowOffset: { width: 0, height: 0 } }}>{result}</Text>
    </View>
  </View>;
}
export function Screen({ title, children, action, home }: { title: string; children: React.ReactNode; action?: React.ReactNode; home?: boolean }) {
  const { theme } = useApp();
  const focused = useIsFocused();
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, display: focused ? 'flex' : 'none', backgroundColor: theme.bg }}>
    {home && <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, width: '49%', height: 175, borderLeftWidth: 1, borderColor: theme.border }}>
      {[20, 80, 140].map(top => <View key={top} style={{ position: 'absolute', top, left: 0, right: 0, height: 1, backgroundColor: theme.border }} />)}
      <View style={{ position: 'absolute', top: 20, bottom: 0, left: '62%', width: 1, backgroundColor: theme.border }} />
    </View>}
    <ScrollView contentContainerStyle={{ width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 42, paddingBottom: 28, gap: 18 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 4, marginBottom: 0 }}>
        <T muted style={styles.caption}>{home ? new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '').toUpperCase() : theme.name.toUpperCase()}</T>
        <View style={styles.between}>
          <T heading style={{ fontSize: 42, lineHeight: 50 }}>{title}</T>
          {home ? <Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/settings')} style={{ backgroundColor: theme.accent, borderWidth: 0, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 30, minHeight: 44, justifyContent: 'center' }}><T style={{ color: theme.onAccent, fontSize: 12, fontFamily: fonts.bold }}>{theme.name}</T></Pressable> : action}
        </View>
      </View>
      {children}
    </ScrollView>
  </SafeAreaView>;
}
export function Empty({ text }: { text: string }) {
  const { theme } = useApp();
  return <View style={{ padding: 28, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border }}><T muted style={{ textAlign: 'center', lineHeight: 23 }}>{text}</T></View>;
}
export function Sheet({ visible, onClose, children, title }: { visible: boolean; onClose(): void; children: React.ReactNode; title: string }) {
  const { theme } = useApp();
  return <SurfaceContext.Provider value={theme.card}><Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable accessibilityLabel="Dismiss sheet" accessibilityRole="button" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.65)' }]} />
      <View accessibilityViewIsModal style={{ backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: theme.border, alignSelf: 'center', marginTop: 12 }} />
        <View style={[styles.between, { paddingHorizontal: 20, paddingTop: 12 }]}><T heading style={{ fontSize: 30, flex: 1 }}>{title}</T><IconButton label="Close sheet" onPress={onClose}><X size={20} color={theme.text} /></IconButton></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 35, gap: 14 }}>{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal></SurfaceContext.Provider>;
}
export function FormPage({ title, onSave, saving, children, errors = [], onDelete }: { title: string; onSave(): void; saving?: boolean; children: React.ReactNode; errors?: string[]; onDelete?(): void }) {
  const { theme } = useApp();
  const focused = useIsFocused();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  useEffect(() => { if (errors.length) scroll.current?.scrollTo({ y: 0, animated: true }); }, [errors]);
  return <SafeAreaView style={{ flex: 1, display: focused ? 'flex' : 'none', backgroundColor: theme.bg }} edges={['top', 'left', 'right', 'bottom']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.between, { paddingHorizontal: 12, paddingTop: 8, width: '100%', maxWidth: 560, alignSelf: 'center' }]}>
        <IconButton label="Back" onPress={closeForm}><ChevronLeft color={theme.text} /></IconButton>
        <T heading style={{ fontSize: 26 }}>{title}</T>
        <Pressable disabled={saving} onPress={onSave} accessibilityRole="button" accessibilityLabel="Save" style={{ padding: 0, borderWidth: 0, minWidth: 52, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>{saving ? <ActivityIndicator color={theme.text} /> : <T style={{ fontFamily: fonts.bold }}>Save</T>}</Pressable>
      </View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 18, padding: 20, paddingBottom: 44, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        {errors.length > 0 && <Card style={{ backgroundColor: '#70291F' }}>{errors.map((e, i) => <T key={i} accessibilityRole="alert" style={{ color: '#FFFFFF', lineHeight: 21 }}>{e}</T>)}</Card>}
        {children}
        <Button label={saving ? 'Saving...' : 'Save'} disabled={saving} onPress={onSave} />
        {onDelete && <DeleteButton onConfirm={onDelete} />}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function DeleteButton({ onConfirm, label = 'Delete activity' }: { onConfirm(): void; label?: string }) {
  const [confirm, setConfirm] = React.useState(false);
  return <>
    <Button label={label} danger onPress={() => setConfirm(true)} />
    <Sheet visible={confirm} onClose={() => setConfirm(false)} title="Are you sure?">
      <T>This cannot be undone.</T>
      <Button label={`Confirm ${label.toLowerCase()}`} danger onPress={() => { setConfirm(false); onConfirm(); }} />
      <Button label="Cancel" secondary onPress={() => setConfirm(false)} />
    </Sheet>
  </>;
}
export function closeForm() { if (router.canGoBack()) router.back(); else router.replace('/'); }
export function Racket({ color, size = 26 }: { color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <Ellipse cx="11" cy="10" rx="6.5" ry="9" transform="rotate(-40 11 10)" stroke={color} strokeWidth={1.8} />
    <Line x1="15" y1="17" x2="25" y2="27" stroke={color} strokeWidth={2} />
    <Line x1="6" y1="4" x2="16" y2="15" stroke={color} strokeWidth={1.2} />
    <Line x1="4" y1="9" x2="12" y2="18" stroke={color} strokeWidth={1.2} />
    <Line x1="10" y1="2" x2="19" y2="12" stroke={color} strokeWidth={1.2} />
  </Svg>;
}
