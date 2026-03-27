import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';

type Step = 'name' | 'route' | 'income' | 'budget' | 'invite';

export default function SetupScreen() {
  const { refreshMember } = useAuth();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [budget, setBudget] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const saveName = async () => {
    if (name.trim().length < 2) { Alert.alert('שם קצר מדי', 'הזן לפחות 2 תווים.'); return; }
    setLoading(true);
    try {
      await api.put('/profile', { name: name.trim(), onboardingStep: 'INVITE_PROMPT' });
      setStep('route');
    } catch (e: unknown) { Alert.alert('שגיאה', e instanceof Error ? e.message : 'נכשל'); }
    finally { setLoading(false); }
  };

  const saveIncome = () => {
    if (income.trim() !== '') {
      const n = parseFloat(income);
      if (isNaN(n) || n < 0) { Alert.alert('סכום לא תקין', 'הזן סכום תקין.'); return; }
    }
    setStep('budget');
  };

  const createHousehold = async () => {
    const inc = parseFloat(income);
    const bud = parseFloat(budget);
    if (isNaN(bud) || bud <= 0) { Alert.alert('תקציב לא תקין', 'הזן תקציב תקין.'); return; }
    setLoading(true);
    try {
      await api.post('/household', {
        name: `משק הבית של ${name}`,
        monthlyIncome: inc || 0,
        budgetLimit: bud,
      });
      await refreshMember();
    } catch (e: unknown) { Alert.alert('שגיאה', e instanceof Error ? e.message : 'נכשל'); }
    finally { setLoading(false); }
  };

  const joinHousehold = async () => {
    if (!inviteCode.trim()) { Alert.alert('חובה', 'הזן קוד הזמנה.'); return; }
    setLoading(true);
    try {
      await api.post('/household/join', { inviteCode: inviteCode.trim().toUpperCase() });
      await refreshMember();
    } catch (e: unknown) { Alert.alert('לא נמצא', e instanceof Error ? e.message : 'קוד לא תקין'); }
    finally { setLoading(false); }
  };

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.logo}>💰</Text>

      {step === 'name' && (
        <View style={s.card}>
          <Text style={s.title}>מה שמך?</Text>
          <TextInput style={s.input} value={name} onChangeText={setName}
            placeholder="לדוגמה: בן" placeholderTextColor="#888" autoFocus textAlign="right" />
          <Btn label="המשך ←" onPress={saveName} loading={loading} />
        </View>
      )}

      {step === 'route' && (
        <View style={s.card}>
          <Text style={s.title}>היי {name}! 👋</Text>
          <Text style={s.subtitle}>יש לך קוד הזמנה למשק בית?</Text>
          <Btn label="הצטרף למשק בית קיים" onPress={() => setStep('invite')} />
          <SecondaryBtn label="צור משק בית חדש" onPress={() => setStep('income')} />
        </View>
      )}

      {step === 'income' && (
        <View style={s.card}>
          <Text style={s.title}>הכנסה חודשית</Text>
          <Text style={s.subtitle}>לשימוש בדוחות שלך (אופציונלי)</Text>
          <TextInput style={s.input} value={income} onChangeText={setIncome}
            placeholder="לדוגמה: 10000" placeholderTextColor="#888"
            keyboardType="numeric" autoFocus textAlign="right" />
          <Btn label="המשך ←" onPress={saveIncome} />
        </View>
      )}

      {step === 'budget' && (
        <View style={s.card}>
          <Text style={s.title}>מגבלת תקציב חודשית</Text>
          <Text style={s.subtitle}>המקסימום שברצונך להוציא בחודש</Text>
          <TextInput style={s.input} value={budget} onChangeText={setBudget}
            placeholder="לדוגמה: 5000" placeholderTextColor="#888"
            keyboardType="numeric" autoFocus textAlign="right" />
          <Btn label="צור משק בית 🎉" onPress={createHousehold} loading={loading} />
        </View>
      )}

      {step === 'invite' && (
        <View style={s.card}>
          <Text style={s.title}>הזן קוד הזמנה</Text>
          <Text style={s.subtitle}>בקש מבן/בת זוגך את קוד משק הבית</Text>
          <TextInput style={[s.input, s.codeInput]} value={inviteCode}
            onChangeText={setInviteCode} placeholder="HH-A3B9C2"
            placeholderTextColor="#888" autoCapitalize="characters" autoFocus />
          <Btn label="הצטרף ←" onPress={joinHousehold} loading={loading} />
          <SecondaryBtn label="חזור →" onPress={() => setStep('route')} />
        </View>
      )}
    </ScrollView>
  );
}

function Btn({ label, onPress, loading }: { label: string; onPress: () => void; loading?: boolean }) {
  return (
    <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={onPress} disabled={loading}>
      <Text style={s.btnText}>{loading ? 'אנא המתן...' : label}</Text>
    </TouchableOpacity>
  );
}

function SecondaryBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.secondaryBtn} onPress={onPress}>
      <Text style={s.secondaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { fontSize: 56, marginBottom: 24 },
  card: { width: '100%', backgroundColor: '#16213e', borderRadius: 16, padding: 24, gap: 14 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'right' },
  subtitle: { fontSize: 13, color: '#aaa', textAlign: 'right' },
  input: { backgroundColor: '#0f3460', borderRadius: 10, padding: 14, fontSize: 16, color: '#fff' },
  codeInput: { letterSpacing: 4, fontSize: 20, textAlign: 'center' },
  btn: { backgroundColor: '#6c63ff', borderRadius: 10, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { padding: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#aaa', fontSize: 14 },
});
