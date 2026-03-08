import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { firebaseConfig } from '../../lib/firebase';
import { setConfirmation } from '../../lib/auth';
import { RecaptchaModal } from '../../components/RecaptchaModal';

export default function PhoneScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRecaptcha, setShowRecaptcha] = useState(false);

  const handleSend = () => {
    const cleaned = phone.trim();
    if (!cleaned.startsWith('+') || cleaned.length < 8) {
      Alert.alert('Invalid number', 'Enter your full number with country code, e.g. +1 555 123 4567');
      return;
    }
    setLoading(true);
    setShowRecaptcha(true);
  };

  const handleVerificationId = (verificationId: string) => {
    setShowRecaptcha(false);
    setLoading(false);
    const auth = getAuth();
    // Wrap the verificationId in a confirmation object that otp.tsx expects.
    setConfirmation({
      confirm: async (code: string) => {
        const credential = PhoneAuthProvider.credential(verificationId, code);
        return signInWithCredential(auth, credential);
      },
    });
    router.push('/(auth)/otp');
  };

  const handleError = (msg: string) => {
    setShowRecaptcha(false);
    setLoading(false);
    Alert.alert('Error', msg);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <RecaptchaModal
        visible={showRecaptcha}
        phoneNumber={phone.trim()}
        firebaseConfig={firebaseConfig}
        onVerificationId={handleVerificationId}
        onError={handleError}
      />

      <Text style={s.logo}>💰</Text>
      <Text style={s.title}>FinancialAssistant</Text>
      <Text style={s.subtitle}>Track spending with your household</Text>

      <View style={s.card}>
        <Text style={s.label}>Phone number</Text>
        <TextInput
          style={s.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 555 123 4567"
          placeholderTextColor="#888"
          keyboardType="phone-pad"
          autoFocus
        />
        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSend} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Sending…' : 'Send OTP →'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.hint}>We'll send a one-time verification code via SMS.</Text>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { fontSize: 64, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#aaa', marginBottom: 40 },
  card: { width: '100%', backgroundColor: '#16213e', borderRadius: 16, padding: 24, gap: 12 },
  label: { color: '#ccc', fontSize: 13, fontWeight: '600' },
  input: { backgroundColor: '#0f3460', borderRadius: 10, padding: 14, fontSize: 16, color: '#fff' },
  btn: { backgroundColor: '#6c63ff', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  hint: { color: '#666', fontSize: 12, marginTop: 24, textAlign: 'center' },
});
