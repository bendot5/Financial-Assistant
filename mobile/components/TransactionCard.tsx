import { View, Text, StyleSheet } from 'react-native';
import type { Transaction } from '../lib/api';

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍔', Transport: '🚗', Housing: '🏠', Entertainment: '🎬',
  Health: '💊', Shopping: '🛍️', Utilities: '💡', Salary: '💼',
  Freelance: '💻', Education: '📚', General: '📦',
};

interface Props {
  transaction: Transaction;
}

export function TransactionCard({ transaction: t }: Props) {
  const isExpense = t.type === 'EXPENSE';
  const emoji = CATEGORY_EMOJI[t.category] ?? '💰';
  const date = new Date(t.createdAt).toLocaleDateString('default', { month: 'short', day: 'numeric' });

  return (
    <View style={s.card}>
      <Text style={s.emoji}>{emoji}</Text>
      <View style={s.info}>
        <Text style={s.description} numberOfLines={1}>{t.description}</Text>
        <Text style={s.meta}>{t.category} · {date}</Text>
      </View>
      <Text style={[s.amount, { color: isExpense ? '#ef4444' : '#22c55e' }]}>
        {isExpense ? '-' : '+'}${t.amount.toFixed(2)}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 12, padding: 14, gap: 12 },
  emoji: { fontSize: 24, width: 32, textAlign: 'center' },
  info: { flex: 1, gap: 2 },
  description: { color: '#fff', fontSize: 14, fontWeight: '600' },
  meta: { color: '#888', fontSize: 12 },
  amount: { fontSize: 15, fontWeight: '700' },
});
