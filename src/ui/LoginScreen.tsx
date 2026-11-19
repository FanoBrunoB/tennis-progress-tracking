import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { firebase } from '../data/firebase';
import { useApp } from '../state/AppProvider';
import { Button, Card, Field, Racket, T } from './components';

function authMessage(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email': return 'Email or password is incorrect.';
    case 'auth/too-many-requests': return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/network-request-failed': return 'No connection. Check your internet and try again.';
    default: return error instanceof Error ? error.message : 'Could not sign in.';
  }
}

export function LoginScreen() {
  const { theme } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const signIn = async () => {
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true); setError(undefined); setInfo(undefined);
    try { await signInWithEmailAndPassword(firebase().auth, email.trim(), password); }
    catch (e) { setError(authMessage(e)); setBusy(false); }
  };
  const resetPassword = async () => {
    if (!email.trim()) { setError('Enter your email first.'); return; }
    setBusy(true); setError(undefined); setInfo(undefined);
    try { await sendPasswordResetEmail(firebase().auth, email.trim()); setInfo('If that email has an account, a reset link is on its way.'); }
    catch (e) { setError(authMessage(e)); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', gap: 16 }}>
          <Racket color={theme.accent} size={40} />
          <T heading style={{ fontSize: 40 }}>Court Log</T>
          <T muted style={{ lineHeight: 22 }}>Sign in to sync your logs across devices.</T>
          <Card>
            {error && <T accessibilityRole="alert" style={{ color: '#FFD4BA' }}>{error}</T>}
            {info && <T accessibilityRole="alert">{info}</T>}
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" textContentType="username" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={() => void signIn()} />
            <Button label={busy ? 'Signing in…' : 'Sign in'} disabled={busy} onPress={() => void signIn()} />
            <Button label="Forgot password" secondary disabled={busy} onPress={() => void resetPassword()} />
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
