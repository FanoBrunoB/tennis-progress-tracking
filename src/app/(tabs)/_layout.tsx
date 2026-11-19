import { Tabs } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, Dumbbell, House, Plus } from 'lucide-react-native';
import { useApp } from '../../state/AppProvider';
import { LogSheet } from '../../ui/LogSheet';
import { Racket } from '../../ui/components';

export default function TabLayout() {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const [log, setLog] = useState(false);
  const labels = ['Tennis', 'Gym', 'Home', 'Other activities'];
  return <>
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: theme.bg } }} tabBar={({ state, emitter, navigateToTab }) => <View style={{ backgroundColor: theme.deep, borderTopColor: theme.border, borderTopWidth: 1, paddingBottom: Math.max(insets.bottom, 14), paddingTop: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', maxWidth: 560, alignSelf: 'center', alignItems: 'center' }}>
        {state.routes.map((route, index) => {
          const selected = index === state.index, color = selected ? theme.text : theme.muted;
          const icon = route.name === 'tennis' ? <Racket color={color} /> : route.name === 'gym' ? <Dumbbell size={26} color={color} /> : route.name === 'index' ? <House size={32} color={color} /> : <Activity size={26} color={color} />;
          return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={labels[index]} accessibilityState={{ selected }} onPress={() => { const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!event.defaultPrevented) navigateToTab(route.key); }} style={{ height: 52, width: 56, padding: 0, borderWidth: 0, borderRadius: 18, backgroundColor: selected ? theme.card2 : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{icon}</Pressable>;
        })}
        <Pressable accessibilityRole="button" accessibilityLabel="Log activity" onPress={() => setLog(true)} style={{ width: 52, height: 52, padding: 0, borderWidth: 0, borderRadius: 26, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}><Plus color={theme.onAccent} size={28} /></Pressable>
      </View>
    </View>}>
      <Tabs.Screen name="tennis" /><Tabs.Screen name="gym" /><Tabs.Screen name="index" /><Tabs.Screen name="other" />
    </Tabs>
    <LogSheet visible={log} onClose={() => setLog(false)} />
  </>;
}
