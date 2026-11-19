import { useFonts } from 'expo-font';
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useApp } from '../state/AppProvider';
import { CloudGate } from '../state/CloudGate';
import { ThemeProvider } from '../state/ThemeProvider';
import { Button, T, styles } from '../ui/components';

function Content() {
  const { theme, ready, error, reload, toast } = useApp();
  return <View style={{ flex: 1, backgroundColor: theme.bg }}>
    <StatusBar style="light" />
    {!ready ? <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={theme.accent} /></View> : <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}><Stack.Screen name="(tabs)" /><Stack.Screen name="log" options={{ presentation: 'modal' }} /><Stack.Screen name="settings" options={{ presentation: 'modal' }} /></Stack>}
    {error && <View accessibilityRole="alert" style={{ position: 'absolute', top: 54, left: 16, right: 16, padding: 16, backgroundColor: '#70291F', borderRadius: 14, gap: 10 }}><T style={{ color: '#FFFFFF' }}>{error}</T><Button label="Retry loading" onPress={() => void reload()} secondary /></View>}
    {toast && <View accessibilityRole="alert" style={[styles.between, { position: 'absolute', bottom: 100, left: 20, right: 20, backgroundColor: theme.card2, borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 14, maxWidth: 520, alignSelf: 'center' }]}>
      <T style={{ flex: 1 }}>{toast.text}</T>{toast.undo && <Button label="Undo" onPress={() => void toast.undo?.()} />}
    </View>}
  </View>;
}
export default function RootLayout() {
  const [loaded, error] = useFonts({ BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (error) throw error;
  return <SafeAreaProvider><ThemeProvider>{loaded ? <CloudGate><Content /></CloudGate> : <View style={{ flex: 1, backgroundColor: '#0E1C3D', justifyContent: 'center' }}><ActivityIndicator color="#E3B341" /></View>}</ThemeProvider></SafeAreaProvider>;
}
