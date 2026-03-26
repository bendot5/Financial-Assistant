import { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES } from './TransactionFormModal';

const DAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    type: 'EXPENSE' | 'INCOME';
    amount: number;
    category: string;
    description: string;
    frequency: 'WEEKLY' | 'MONTHLY';
    dayOfWeek?: number;
    dayOfMonth?: number;
  }) => Promise<void>;
}

export function RecurringTransactionModal({ visible, onClose, onSave }: Props) {
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'MONTHLY' | 'WEEKLY'>('MONTHLY');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleOpen = () => {
    setType('EXPENSE');
    setAmount('');
    setCategory(CATEGORIES[0]);
    setDescription('');
    setFrequency('MONTHLY');
    setDayOfMonth('1');
    setDayOfWeek(0);
  };

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { Alert.alert('סכום לא תקין', 'הזן מספר חיובי.'); return; }
    if (!category) { Alert.alert('חסר תחום', 'בחר תחום.'); return; }

    if (frequency === 'MONTHLY') {
      const day = parseInt(dayOfMonth, 10);
      if (isNaN(day) || day < 1 || day > 31) {
        Alert.alert('יום לא תקין', 'הזן מספר בין 1 ל-31.');
        return;
      }
    }

    setSaving(true);
    try {
      await onSave({
        type,
        amount: num,
        category,
        description: description.trim() || category,
        frequency,
        ...(frequency === 'MONTHLY'
          ? { dayOfMonth: parseInt(dayOfMonth, 10) }
          : { dayOfWeek }),
      });
      onClose();
    } catch (e: unknown) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'נסה שוב.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onShow={handleOpen}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#888" />
            </TouchableOpacity>
            <Text style={s.title}>הוספת תשלום קבוע</Text>
            <View style={{ width: 22 }} />
          </View>

          {/* Type toggle */}
          <View style={s.typeRow}>
            <TouchableOpacity
              style={[s.typeBtn, type === 'EXPENSE' && s.typeBtnActive]}
              onPress={() => setType('EXPENSE')}
            >
              <Text style={[s.typeBtnText, type === 'EXPENSE' && s.typeBtnTextActive]}>💸 הוצאה</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.typeBtn, type === 'INCOME' && s.typeBtnActiveIncome]}
              onPress={() => setType('INCOME')}
            >
              <Text style={[s.typeBtnText, type === 'INCOME' && s.typeBtnTextActive]}>💰 הכנסה</Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <Text style={s.label}>סכום (₪)</Text>
          <TextInput
            style={s.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#555"
            textAlign="right"
          />

          {/* Category */}
          <Text style={s.label}>תחום</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[s.chip, category === c && s.chipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[s.chipText, category === c && s.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Description */}
          <Text style={s.label}>פירוט (אופציונלי)</Text>
          <TextInput
            style={s.input}
            value={description}
            onChangeText={setDescription}
            placeholder="לדוגמה: שכר דירה"
            placeholderTextColor="#555"
            textAlign="right"
          />

          {/* Frequency */}
          <Text style={s.label}>תדירות</Text>
          <View style={s.typeRow}>
            <TouchableOpacity
              style={[s.typeBtn, frequency === 'MONTHLY' && s.typeBtnFreqActive]}
              onPress={() => setFrequency('MONTHLY')}
            >
              <Text style={[s.typeBtnText, frequency === 'MONTHLY' && s.typeBtnTextActive]}>📅 חודשי</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.typeBtn, frequency === 'WEEKLY' && s.typeBtnFreqActive]}
              onPress={() => setFrequency('WEEKLY')}
            >
              <Text style={[s.typeBtnText, frequency === 'WEEKLY' && s.typeBtnTextActive]}>📆 שבועי</Text>
            </TouchableOpacity>
          </View>

          {/* Day selector */}
          {frequency === 'MONTHLY' ? (
            <>
              <Text style={s.label}>יום בחודש</Text>
              <TextInput
                style={s.input}
                value={dayOfMonth}
                onChangeText={setDayOfMonth}
                keyboardType="number-pad"
                placeholder="1–31"
                placeholderTextColor="#555"
                textAlign="right"
              />
            </>
          ) : (
            <>
              <Text style={s.label}>יום בשבוע</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips}>
                {DAY_LABELS.map((label, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[s.chip, dayOfWeek === idx && s.chipActive]}
                    onPress={() => setDayOfWeek(idx)}
                  >
                    <Text style={[s.chipText, dayOfWeek === idx && s.chipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Save */}
          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={s.saveBtnText}>{saving ? 'שומר...' : 'הוסף תשלום קבוע'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000088' },
  sheet: {
    backgroundColor: '#1a1a2e', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 14, paddingBottom: 36,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, padding: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#16213e', borderWidth: 1, borderColor: '#0f3460',
  },
  typeBtnActive: { backgroundColor: '#ef444420', borderColor: '#ef4444' },
  typeBtnActiveIncome: { backgroundColor: '#22c55e20', borderColor: '#22c55e' },
  typeBtnFreqActive: { backgroundColor: '#6c63ff20', borderColor: '#6c63ff' },
  typeBtnText: { color: '#888', fontWeight: '600', fontSize: 14 },
  typeBtnTextActive: { color: '#fff' },
  label: { color: '#888', fontSize: 12, fontWeight: '600', textAlign: 'right' },
  input: {
    backgroundColor: '#16213e', borderRadius: 10, padding: 12,
    fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#0f3460',
  },
  chips: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#16213e', borderWidth: 1, borderColor: '#0f3460', marginRight: 8,
  },
  chipActive: { backgroundColor: '#6c63ff', borderColor: '#6c63ff' },
  chipText: { color: '#888', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  saveBtn: { backgroundColor: '#6c63ff', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
