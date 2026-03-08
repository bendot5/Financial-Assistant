import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
} from 'react-native';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';

type Step = 'name' | 'route' | 'income' | 'budget' | 'invite';

export default function SetupScreen() {
  const { refreshMember, member } = useAuth();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [budget, setBudget] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const saveName = async () => {
    if (name.trim().length < 2) { Alert.alert('Too short', 'Enter at least 2 characters.'); return; }
    setLoading(true);
    try {
      await api.put('/profile', { name: name.trim(), onboardingStep: 'INVITE_PROMPT' });
      setStep('route');
    } catch (e: unknown) { Alert.alert('Error', e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  };

  const saveIncome = () => {
    const n = parseFloat(income);
    if (isNaN(n) || n < 0) { Alert.alert('Invalid', 'Enter a valid amount.'); return; }
    setStep('budget');
  };

  const createHousehold = async () => {
    const inc = parseFloat(income);
    const bud = parseFloat(budget);
    if (isNaN(bud) || bud <= 0) { Alert.alert('Invalid', 'Enter a valid budget.'); return; }
    setLoading(true);
    try {
      await api.post('/household', {
        name: `${name}'s Household`,
        monthlyIncome: inc || 0,
        budgetLimit: bud,
      });
      await refreshMember(); // triggers navigation guard → /(tabs)
    } catch (e: unknown) { Alert.alert('Error', e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  };

  const joinHousehold = async () => {
    if (!inviteCode.trim()) { Alert.alert('Required', 'Enter an invite code.'); return; }
    setLoading(true);
    try {
      await api.post('/household/join', { inviteCode: inviteCode.trim().toUpperCase() });
      await refreshMember();
    } catch (e: unknown) { Alert.alert('Not found', e instanceof Error ? e.message : 'Invalid code'); }
    finally { setLoading(false); }
  };

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.logo}>💰</Text>

      {step === 'name' && (
        <View style={s.card}>
          <Text style={s.title}>What's your name?</Text>
          <TextInput style={s.input} value={name} onChangeText={setName}
            placeholder="e.g. Ben" placeholderTextColor="#888" autoFocus />
          <Btn label="Continue →" onPress={saveName} loading={loading} />
        </View>
      )}

      {step === 'route' && (
        <View style={s.card}>
          <Text style={s.title}>Hi {name}! 👋</Text>
          <Text style={s.subtitle}>Do you have a household invite code?</Text>
          <Btn label="Join existing household" onPress={() => setStep('invite')} />
          <SecondaryBtn label="Create a new household" onPress={() => setStep('income')} />
        </View>
      )}

      {step === 'income' && (
        <View style={s.card}>
          <Text style={s.title}>Monthly income</Text>
          <Text style={s.subtitle}>Used for context in your reports (optional)</Text>
          <TextInput style={s.input} value={income} onChangeText={setIncome}
            placeholder="e.g. 5000" placeholderTextColor="#888"
            keyboardType="numeric" autoFocus />
          <Btn label="Continue →" onPress={saveIncome} />
        </View>
      )}

      {step === 'budget' && (
        <View style={s.card}>
          <Text style={s.title}>Monthly budget limit</Text>
          <Text style={s.subtitle}>The max you want to spend per month</Text>
          <TextInput style={s.input} value={budget} onChangeText={setBudget}
            placeholder="e.g. 3000" placeholderTextColor="#888"
            keyboardType="numeric" autoFocus />
          <Btn label="Create household 🎉" onPress={createHousehold} loading={loading} />
        </View>
      )}

      {step === 'invite' && (
        <View style={s.card}>
          <Text style={s.title}>Enter invite code</Text>
          <Text style={s.subtitle}>Ask your partner for their household code</Text>
          <TextInput style={[s.input, s.codeInput]} value={inviteCode}
            onChangeText={setInviteCode} placeholder="HH-A3B9C2"
            placeholderTextColor="#888" autoCapitalize="characters" autoFocus />
          <Btn label="Join →" onPress={joinHousehold} loading={loading} />
          <SecondaryBtn label="← Go back" onPress={() => setStep('route')} />
        </View>
      )}
    </ScrollView>
  );
}

function Btn({ label, onPress, loading }: { label: string; onPress: () => void; loading?: boolean }) {
  return (
    <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={onPress} disabled={loading}>
      <Text style={s.btnText}>{loading ? 'Please wait…' : label}</Text>
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
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 13, color: '#aaa' },
  input: { backgroundColor: '#0f3460', borderRadius: 10, padding: 14, fontSize: 16, color: '#fff' },
  codeInput: { letterSpacing: 4, fontSize: 20, textAlign: 'center' },
  btn: { backgroundColor: '#6c63ff', borderRadius: 10, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { padding: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#aaa', fontSize: 14 },
});
