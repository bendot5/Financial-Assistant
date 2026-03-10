import { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert, Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import type { Transaction } from '../lib/api';

export const CATEGORIES = [
  'אוכל', 'תחבורה', 'דיור', 'בידור', 'בריאות',
  'קניות', 'חיות מחמד', 'משכורת', 'פרילנס', 'חינוך', 'כללי',
];

interface Props {
  visible: boolean;
  onClose: () => void;
  /** If provided, the form is in "edit" mode. Otherwise "add" mode. */
  transaction?: Transaction;
  onSave: (data: {
    type: 'EXPENSE' | 'INCOME';
    amount: number;
    category: string;
    description: string;
    date: string; // ISO "YYYY-MM-DD"
  }) => Promise<void>;
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDate(d: Date) {
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function TransactionFormModal({ visible, onClose, transaction, onSave }: Props) {
  const isEdit = !!transaction;

  const [type, setType] = useState<'EXPENSE' | 'INCOME'>(transaction?.type ?? 'EXPENSE');
  const [amount, setAmount] = useState(transaction?.amount?.toString() ?? '');
  const [category, setCategory] = useState(transaction?.category ?? CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [date, setDate] = useState<Date>(() => {
    const src = transaction?.date ?? transaction?.createdAt;
    return src ? new Date(src) : new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset when modal opens
  const handleOpen = () => {
    setType(transaction?.type ?? 'EXPENSE');
    setAmount(transaction?.amount?.toString() ?? '');
    setCategory(transaction?.category ?? CATEGORIES[0]);
    setCustomCategory('');
    setShowCustomInput(false);
    setDescription(transaction?.description ?? '');
    const src = transaction?.date ?? transaction?.createdAt;
    setDate(src ? new Date(src) : new Date());
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { Alert.alert('סכום לא תקין', 'הזן מספר חיובי.'); return; }
    const finalCategory = showCustomInput && customCategory.trim()
      ? customCategory.trim()
      : category;
    if (!finalCategory) { Alert.alert('חסר תחום', 'בחר תחום.'); return; }
    setSaving(true);
    try {
      await onSave({
        type,
        amount: num,
        category: finalCategory,
        description: description.trim() || finalCategory,
        date: toISO(date),
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
        {/* Backdrop tap closes modal */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#888" />
            </TouchableOpacity>
            <Text style={s.title}>{isEdit ? 'עריכת פעולה' : 'הוספת פעולה'}</Text>
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

          {/* Date */}
          <Text style={s.label}>תאריך</Text>
          <TouchableOpacity style={s.dateBtn} onPress={() => setShowDatePicker((v) => !v)}>
            <Ionicons name="calendar-outline" size={16} color="#6c63ff" />
            <Text style={s.dateBtnText}>{formatDate(date)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              onChange={(_, selected) => {
                if (Platform.OS !== 'ios') setShowDatePicker(false);
                if (selected) setDate(selected);
              }}
            />
          )}

          {/* Category */}
          <Text style={s.label}>תחום</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[s.chip, !showCustomInput && category === c && s.chipActive]}
                onPress={() => { setCategory(c); setShowCustomInput(false); setCustomCategory(''); }}
              >
                <Text style={[s.chipText, !showCustomInput && category === c && s.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[s.chip, showCustomInput && s.chipActive]}
              onPress={() => setShowCustomInput((v) => !v)}
            >
              <Text style={[s.chipText, showCustomInput && s.chipTextActive]}>➕ תחום חדש</Text>
            </TouchableOpacity>
          </ScrollView>
          {showCustomInput && (
            <TextInput
              style={[s.input, { marginTop: 6 }]}
              value={customCategory}
              onChangeText={setCustomCategory}
              placeholder="שם התחום החדש"
              placeholderTextColor="#555"
              textAlign="right"
              autoFocus
            />
          )}

          {/* Description */}
          <Text style={s.label}>פירוט (אופציונלי)</Text>
          <TextInput
            style={s.input}
            value={description}
            onChangeText={setDescription}
            placeholder="תיאור קצר"
            placeholderTextColor="#555"
            textAlign="right"
          />

          {/* Save */}
          <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
            <Text style={s.saveBtnText}>{saving ? 'שומר...' : isEdit ? 'שמור שינויים' : 'הוסף פעולה'}</Text>
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
  typeBtnText: { color: '#888', fontWeight: '600', fontSize: 14 },
  typeBtnTextActive: { color: '#fff' },
  label: { color: '#888', fontSize: 12, fontWeight: '600', textAlign: 'right' },
  input: {
    backgroundColor: '#16213e', borderRadius: 10, padding: 12,
    fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#0f3460',
  },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#16213e', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#0f3460',
  },
  dateBtnText: { color: '#fff', fontSize: 15, flex: 1, textAlign: 'right' },
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
