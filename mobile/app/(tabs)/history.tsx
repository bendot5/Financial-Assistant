import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, type Transaction } from '../../lib/api';
import { TransactionCard } from '../../components/TransactionCard';

export default function HistoryScreen() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', year, month],
    queryFn: () => api.get<{ transactions: Transaction[] }>(`/transactions?month=${month}&year=${year}`),
  });

  const transactions = data?.transactions ?? [];
  const monthLabel = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
    if (isCurrentMonth) return;
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const totalExpenses = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const totalIncome = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>History</Text>
        <View style={s.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={s.navBtn}><Text style={s.navArrow}>‹</Text></TouchableOpacity>
          <Text style={s.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity onPress={nextMonth} style={s.navBtn}><Text style={s.navArrow}>›</Text></TouchableOpacity>
        </View>
        <View style={s.summaryRow}>
          <Text style={s.summaryExpense}>💸 ${totalExpenses.toFixed(0)}</Text>
          {totalIncome > 0 && <Text style={s.summaryIncome}>📈 ${totalIncome.toFixed(0)}</Text>}
        </View>
      </View>

      {isLoading && <Text style={s.empty}>Loading…</Text>}

      {!isLoading && transactions.length === 0 && (
        <Text style={s.empty}>No transactions in {monthLabel}.</Text>
      )}

      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => <TransactionCard transaction={item} />}
        contentContainerStyle={s.list}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#16213e', gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navBtn: { padding: 4 },
  navArrow: { color: '#6c63ff', fontSize: 24, fontWeight: '700' },
  monthLabel: { flex: 1, color: '#fff', fontWeight: '600', fontSize: 15, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', gap: 16 },
  summaryExpense: { color: '#ef4444', fontWeight: '700' },
  summaryIncome: { color: '#22c55e', fontWeight: '700' },
  list: { padding: 16, gap: 8 },
  empty: { color: '#555', textAlign: 'center', paddingTop: 60 },
});
