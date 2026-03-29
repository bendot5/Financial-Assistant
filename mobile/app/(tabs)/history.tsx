import { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api, type Transaction } from '../../lib/api';
import { useTheme } from '../../lib/theme';
import { TransactionCard } from '../../components/TransactionCard';
import { TransactionFormModal } from '../../components/TransactionFormModal';
import { ConfirmModal } from '../../components/ConfirmModal';

export default function HistoryScreen() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>(undefined);
  const [confirmModal, setConfirmModal] = useState<{
    title: string; message: string; confirmText: string; onConfirm: () => void;
  } | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', year, month],
    queryFn: () => api.get<{ transactions: Transaction[] }>(`/transactions?month=${month}&year=${year}`),
  });

  const transactions = data?.transactions ?? [];
  const monthLabel = new Date(year, month - 1).toLocaleString('he-IL', { month: 'long', year: 'numeric' });

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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['report'] });
  };

  const handleAdd = async (data: {
    type: 'EXPENSE' | 'INCOME'; amount: number; category: string; description: string; date: string;
  }) => {
    await api.post('/transactions/manual', data);
    invalidate();
  };

  const handleEdit = async (data: {
    type: 'EXPENSE' | 'INCOME'; amount: number; category: string; description: string; date: string;
  }) => {
    if (!editingTx) return;
    await api.put(`/transactions/${editingTx.id}`, data);
    invalidate();
  };

  const handleDelete = (tx: Transaction) => {
    setConfirmModal({
      title: 'מחיקת פעולה',
      message: `למחוק את "${tx.description}"?`,
      confirmText: 'מחק',
      onConfirm: async () => {
        try {
          await api.delete(`/transactions/${tx.id}`);
          invalidate();
        } catch { Alert.alert('שגיאה', 'לא ניתן למחוק. נסה שוב.'); }
      },
    });
  };

  const openAdd = () => { setEditingTx(undefined); setModalVisible(true); };
  const openEdit = (tx: Transaction) => { setEditingTx(tx); setModalVisible(true); };

  const { colors } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: colors.cardBg, gap: 10 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '700', color: colors.text },
    addBtn: { backgroundColor: colors.accent, borderRadius: 20, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
    monthNav: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    navBtn: { padding: 4 },
    navArrow: { color: colors.accent, fontSize: 24, fontWeight: '700' },
    monthLabel: { flex: 1, color: colors.text, fontWeight: '600', fontSize: 15, textAlign: 'center' },
    summaryRow: { flexDirection: 'row', gap: 16, justifyContent: 'flex-end' },
    summaryExpense: { color: colors.expense, fontWeight: '700' },
    summaryIncome: { color: colors.income, fontWeight: '700' },
    list: { padding: 16, gap: 8 },
    empty: { color: colors.textMuted, textAlign: 'center', paddingTop: 60 },
  }), [colors]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.titleRow}>
          <TouchableOpacity style={s.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={s.title}>היסטוריה</Text>
        </View>
        <View style={s.monthNav}>
          <TouchableOpacity onPress={nextMonth} style={s.navBtn}><Text style={s.navArrow}>‹</Text></TouchableOpacity>
          <Text style={s.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity onPress={prevMonth} style={s.navBtn}><Text style={s.navArrow}>›</Text></TouchableOpacity>
        </View>
        <View style={s.summaryRow}>
          <Text style={s.summaryExpense}>💸 ₪{totalExpenses.toFixed(0)}</Text>
          {totalIncome > 0 && <Text style={s.summaryIncome}>📈 ₪{totalIncome.toFixed(0)}</Text>}
        </View>
      </View>

      {isLoading && <Text style={s.empty}>טוען...</Text>}

      {!isLoading && transactions.length === 0 && (
        <Text style={s.empty}>אין פעולות ב{monthLabel}.</Text>
      )}

      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TransactionCard
            transaction={item}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
        contentContainerStyle={s.list}
      />

      <TransactionFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        transaction={editingTx}
        onSave={editingTx ? handleEdit : handleAdd}
      />
      <ConfirmModal
        visible={confirmModal !== null}
        title={confirmModal?.title ?? ''}
        message={confirmModal?.message ?? ''}
        confirmText={confirmModal?.confirmText ?? 'אישור'}
        destructive
        onConfirm={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}
        onCancel={() => setConfirmModal(null)}
      />
    </View>
  );
}

