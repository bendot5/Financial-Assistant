import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { getConfirmation } from '../../lib/auth';

// Navigation is handled automatically by the root layout guard
// once Firebase auth state changes after a successful confirmation.
export default function OtpScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    const confirmation = getConfirmation();
    if (!confirmation) {
      Alert.alert('הפגישה פגה', 'חזור אחורה ובקש קוד חדש.');
      return;
    }
    if (code.length < 6) {
      Alert.alert('קוד לא תקין', 'הזן את הקוד בן 6 הספרות שקיבלת ב-SMS.');
      return;
    }
    setLoading(true);
    try {
      await confirmation.confirm(code);
      // onAuthStateChanged in RootLayout will handle navigation automatically
    } catch {
      Alert.alert('קוד שגוי', 'הקוד שגוי או פג תוקף. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={s.emoji}>📱</Text>
      <Text style={s.title}>הזן את הקוד</Text>
      <Text style={s.subtitle}>שלחנו קוד בן 6 ספרות לטלפון שלך</Text>

      <TextInput
        style={s.input}
        value={code}
        onChangeText={setCode}
        placeholder="_ _ _ _ _ _"
        placeholderTextColor="#888"
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        textAlign="center"
      />

      <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleVerify} disabled={loading}>
        <Text style={s.btnText}>{loading ? 'מאמת...' : 'אמת ←'}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#aaa', marginBottom: 40 },
  input: { width: '100%', backgroundColor: '#16213e', borderRadius: 12, padding: 18, fontSize: 28, fontWeight: '700', color: '#fff', letterSpacing: 12, marginBottom: 20 },
  btn: { width: '100%', backgroundColor: '#6c63ff', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
