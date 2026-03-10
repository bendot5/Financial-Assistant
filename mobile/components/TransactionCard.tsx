import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Transaction } from '../lib/api';
import { useTheme } from '../lib/theme';

const CATEGORY_EMOJI: Record<string, string> = {
  'אוכל': '🍔', 'תחבורה': '🚗', 'דיור': '🏠', 'בידור': '🎬',
  'בריאות': '💊', 'קניות': '🛍️', 'חשמל ומים': '💡', 'חיות מחמד': '🐾',
  'משכורת': '💼', 'פרילנס': '💻', 'חינוך': '📚', 'כללי': '📦',
  Food: '🍔', Transport: '🚗', Housing: '🏠', Entertainment: '🎬',
  Health: '💊', Shopping: '🛍️', Utilities: '💡', Salary: '💼',
  Freelance: '💻', Education: '📚', General: '📦',
};

interface Props {
  transaction: Transaction;
  onEdit?: (t: Transaction) => void;
  onDelete?: (t: Transaction) => void;
}

export function TransactionCard({ transaction: t, onEdit, onDelete }: Props) {
  const { colors } = useTheme();
  const isExpense = t.type === 'EXPENSE';
  const emoji = CATEGORY_EMOJI[t.category] ?? (isExpense ? '💸' : '💰');
  const date = new Date(t.date ?? t.createdAt).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' });

  const s = useMemo(() => StyleSheet.create({
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: 12, padding: 14, gap: 10 },
    emoji: { fontSize: 22, width: 28, textAlign: 'center' },
    info: { flex: 1, gap: 2 },
    description: { color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'right' },
    meta: { color: colors.textMuted, fontSize: 12, textAlign: 'right' },
    amount: { fontSize: 14, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  }), [colors]);

  return (
    <View style={s.card}>
      <Text style={s.emoji}>{emoji}</Text>
      <View style={s.info}>
        <Text style={s.description} numberOfLines={1}>{t.description}</Text>
        <Text style={s.meta}>{t.category} · {date}</Text>
      </View>
      <Text style={[s.amount, { color: isExpense ? colors.expense : colors.income }]}>
        {isExpense ? '-' : '+'}₪{t.amount.toFixed(0)}
      </Text>
      {(onEdit || onDelete) && (
        <View style={s.actions}>
          {onEdit && (
            <TouchableOpacity onPress={() => onEdit(t)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="pencil-outline" size={15} color={colors.accent} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={() => onDelete(t)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={15} color={colors.expense} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
