import { useState, useMemo, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type MonthlyReport, type WeeklyReport, type Transaction } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { BudgetGauge } from '../../components/BudgetGauge';
import { TransactionCard } from '../../components/TransactionCard';
import { TransactionFormModal } from '../../components/TransactionFormModal';
import { ChartSection } from '../../components/ChartSection';

export default function DashboardScreen() {
  const { member } = useAuth();
  const now = new Date();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | undefined>(undefined);
  const [hiddenWeeklyCats, setHiddenWeeklyCats] = useState<Set<string>>(new Set());
  const [showWeeklyFilter, setShowWeeklyFilter] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('weeklyHiddenCats').then((v) => {
      if (v) setHiddenWeeklyCats(new Set(JSON.parse(v)));
    });
  }, []);

  const toggleWeeklyCat = (cat: string) => {
    setHiddenWeeklyCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      AsyncStorage.setItem('weeklyHiddenCats', JSON.stringify([...next]));
      return next;
    });
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['report'] });
  };

  const handleEdit = async (data: { type: 'EXPENSE' | 'INCOME'; amount: number; category: string; description: string; date: string }) => {
    if (!editingTx) return;
    await api.put(`/transactions/${editingTx.id}`, data);
    invalidate();
  };

  const handleDelete = (tx: Transaction) => {
    Alert.alert(
      'מחיקת פעולה',
      `למחוק את "${tx.description}"?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/transactions/${tx.id}`);
              invalidate();
            } catch { Alert.alert('שגיאה', 'לא ניתן למחוק. נסה שוב.'); }
          },
        },
      ]
    );
  };

  const openEdit = (tx: Transaction) => { setEditingTx(tx); setModalVisible(true); };

  const { colors } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 20, paddingTop: 60, gap: 16 },
    greeting: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'right' },
    month: { fontSize: 13, color: colors.textSecondary, marginTop: -8, textAlign: 'right' },
    statsRow: { flexDirection: 'row', gap: 10 },
    statBox: { flex: 1, backgroundColor: colors.cardBg, borderRadius: 12, padding: 14, alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: '800' },
    statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    incomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.cardBg, borderRadius: 12, padding: 14 },
    incomeLabel: { color: colors.textSecondary, fontSize: 13 },
    incomeValue: { color: colors.income, fontWeight: '700', fontSize: 15 },
    section: { gap: 8 },
    sectionTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: '600', textAlign: 'right' },
    loading: { color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
    inviteCard: { backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.accent + '44', marginTop: 8 },
    inviteLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 6 },
    inviteCode: { color: colors.accent, fontSize: 22, fontWeight: '800', letterSpacing: 3 },
    inviteHint: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
    catTable: { backgroundColor: colors.cardBg, borderRadius: 12, padding: 14, gap: 14 },
    catRow: { gap: 4 },
    catLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
    catName: { color: colors.text, fontSize: 13, fontWeight: '600' },
    catAmount: { fontSize: 13, fontWeight: '700' },
    barBg: { height: 6, backgroundColor: colors.inputBg, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3 },
    catPct: { color: colors.textMuted, fontSize: 11, textAlign: 'right' },
    weeklyCard: { backgroundColor: colors.cardBg, borderRadius: 12, padding: 14, gap: 8 },
    weeklyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    weeklyLabel: { color: colors.textSecondary, fontSize: 13 },
    weeklyValue: { fontSize: 15, fontWeight: '700' },
    sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    filterBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border },
    filterBtnText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
    filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: colors.accent + '22', borderWidth: 1, borderColor: colors.accent },
    filterChipHidden: { backgroundColor: colors.inputBg, borderColor: colors.border },
    filterChipText: { color: colors.accent, fontSize: 11, fontWeight: '600' },
    filterChipTextHidden: { color: colors.textMuted },
  }), [colors]);

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['report', now.getFullYear(), now.getMonth() + 1],
    queryFn: () => api.get<MonthlyReport>(`/reports/monthly?month=${now.getMonth() + 1}&year=${now.getFullYear()}`),
    enabled: !!member?.householdId,
  });

  const { data: txData } = useQuery({
    queryKey: ['transactions', now.getFullYear(), now.getMonth() + 1],
    queryFn: () => api.get<{ transactions: Transaction[] }>(`/transactions?month=${now.getMonth() + 1}&year=${now.getFullYear()}`),
    enabled: !!member?.householdId,
  });

  const { data: householdData } = useQuery({
    queryKey: ['household'],
    queryFn: () => api.get<{ household: { inviteCode: string; name: string } }>('/household'),
    enabled: !!member?.householdId,
  });

  const { data: weekly } = useQuery({
    queryKey: ['weekly'],
    queryFn: () => api.get<WeeklyReport>('/reports/weekly'),
    enabled: !!member?.householdId,
  });

  const recent = txData?.transactions?.slice(0, 5) ?? [];

  const shareInvite = async () => {
    const code = householdData?.household?.inviteCode;
    if (!code) return;
    await Share.share({ message: `הצטרף למשק הבית שלי ב-FinancialAssistant! קוד: ${code}` });
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.greeting}>
        {getTimeOfDay()}, {member?.name ?? 'שלום'} 👋
      </Text>
      <Text style={s.month}>{now.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}</Text>

      {report && (
        <>
          <BudgetGauge pct={report.budgetUsedPct} />

          <View style={s.statsRow}>
            <StatBox label="הוצאות" value={`₪${report.totalExpenses.toFixed(0)}`} color="#ef4444" s={s} />
            <StatBox label="תקציב" value={`₪${report.budgetLimit.toFixed(0)}`} color="#6c63ff" s={s} />
            <StatBox label="נותר" value={`₪${Math.max(report.remaining, 0).toFixed(0)}`}
              color={report.remaining >= 0 ? '#22c55e' : '#ef4444'} s={s} />
          </View>

          {report.totalIncome > 0 && (
            <View style={s.incomeRow}>
              <Text style={s.incomeLabel}>📈 הכנסות החודש</Text>
              <Text style={s.incomeValue}>₪{report.totalIncome.toFixed(0)}</Text>
            </View>
          )}

          {report.topCategories.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>💸 הוצאות לפי תחום</Text>
              <View style={s.catTable}>
                {report.topCategories.map((c) => (
                  <CategoryRow key={c.category} item={c} color="#ef4444" s={s} />
                ))}
              </View>
            </View>
          )}

          {report.incomeCategories?.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>💰 הכנסות לפי תחום</Text>
              <View style={s.catTable}>
                {report.incomeCategories.map((c) => (
                  <CategoryRow key={c.category} item={c} color="#22c55e" s={s} />
                ))}
              </View>
            </View>
          )}

          {/* Category budgets progress */}
          {report.categoryBudgets?.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>🎯 יעדי הוצאה לפי תחום</Text>
              <View style={s.catTable}>
                {report.categoryBudgets.map((cb) => (
                  <View key={cb.category} style={s.catRow}>
                    <View style={s.catLabelRow}>
                      <Text style={s.catName}>{cb.category}</Text>
                      <Text style={[s.catAmount, { color: cb.pct > 100 ? '#ef4444' : '#f59e0b' }]}>
                        ₪{cb.spent.toFixed(0)} / ₪{cb.budgetLimit.toFixed(0)}
                      </Text>
                    </View>
                    <View style={s.barBg}>
                      <View style={[s.barFill, {
                        width: `${Math.min(cb.pct, 100)}%` as `${number}%`,
                        backgroundColor: cb.pct > 100 ? '#ef4444' : cb.pct >= 80 ? '#f59e0b' : '#22c55e',
                      }]} />
                    </View>
                    <Text style={s.catPct}>{cb.pct}%</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Chart */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>📊 גרפים</Text>
            <View style={s.catTable}>
              <ChartSection report={report} />
            </View>
          </View>
        </>
      )}

      {/* Weekly summary */}
      {weekly && (
        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <TouchableOpacity style={s.filterBtn} onPress={() => setShowWeeklyFilter((v) => !v)}>
              <Text style={s.filterBtnText}>{showWeeklyFilter ? '✕ סגור' : '⚙️ סנן קטגוריות'}</Text>
            </TouchableOpacity>
            <Text style={s.sectionTitle}>📅 סיכום שבועי</Text>
          </View>

          {showWeeklyFilter && weekly.categoryBudgets.filter((cb) => cb.weeklyLimit > 0).length > 0 && (
            <View style={s.filterChips}>
              {weekly.categoryBudgets.filter((cb) => cb.weeklyLimit > 0).map((cb) => {
                const hidden = hiddenWeeklyCats.has(cb.category);
                return (
                  <TouchableOpacity
                    key={cb.category}
                    style={[s.filterChip, hidden && s.filterChipHidden]}
                    onPress={() => toggleWeeklyCat(cb.category)}
                  >
                    <Text style={[s.filterChipText, hidden && s.filterChipTextHidden]}>
                      {hidden ? '○ ' : '● '}{cb.category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={s.weeklyCard}>
            <View style={s.weeklyRow}>
              <Text style={s.weeklyLabel}>הוצאות השבוע</Text>
              <Text style={[s.weeklyValue, { color: colors.expense }]}>₪{weekly.totalExpenses.toFixed(0)}</Text>
            </View>
            {weekly.weeklyBudget > 0 && (
              <>
                <View style={s.weeklyRow}>
                  <Text style={s.weeklyLabel}>יעד שבועי (פרופורציה)</Text>
                  <Text style={[s.weeklyValue, { color: colors.accent }]}>₪{weekly.weeklyBudget.toFixed(0)}</Text>
                </View>
                <View style={s.barBg}>
                  <View style={[s.barFill, {
                    width: `${Math.min(weekly.budgetUsedPct, 100)}%` as `${number}%`,
                    backgroundColor: weekly.budgetUsedPct > 100 ? colors.expense : weekly.budgetUsedPct >= 80 ? '#f59e0b' : colors.income,
                  }]} />
                </View>
                <Text style={s.catPct}>{weekly.budgetUsedPct}% מהיעד השבועי</Text>
              </>
            )}
            {weekly.categoryBudgets
              .filter((cb) => cb.weeklyLimit > 0 && !hiddenWeeklyCats.has(cb.category))
              .map((cb) => (
                <View key={cb.category} style={[s.catRow, { marginTop: 8 }]}>
                  <View style={s.catLabelRow}>
                    <Text style={s.catName}>{cb.category}</Text>
                    <Text style={[s.catAmount, { color: cb.pct > 100 ? colors.expense : '#f59e0b' }]}>
                      ₪{cb.spent.toFixed(0)} / ₪{cb.weeklyLimit.toFixed(0)}
                    </Text>
                  </View>
                  <View style={s.barBg}>
                    <View style={[s.barFill, {
                      width: `${Math.min(cb.pct, 100)}%` as `${number}%`,
                      backgroundColor: cb.pct > 100 ? colors.expense : cb.pct >= 80 ? '#f59e0b' : colors.income,
                    }]} />
                  </View>
                </View>
              ))}
          </View>
        </View>
      )}

      {reportLoading && <Text style={s.loading}>טוען סיכום...</Text>}

      {recent.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>פעולות אחרונות</Text>
          {recent.map((t) => (
            <TransactionCard
              key={t.id}
              transaction={t}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </View>
      )}

      {householdData?.household?.inviteCode && (
        <TouchableOpacity style={s.inviteCard} onPress={shareInvite}>
          <Text style={s.inviteLabel}>קוד הזמנה למשק הבית</Text>
          <Text style={s.inviteCode}>{householdData.household.inviteCode}</Text>
          <Text style={s.inviteHint}>לחץ לשיתוף עם בני ביתך</Text>
        </TouchableOpacity>
      )}
      <TransactionFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        transaction={editingTx}
        onSave={handleEdit}
      />
    </ScrollView>
  );
}

type Styles = ReturnType<typeof StyleSheet.create>;

function StatBox({ label, value, color, s }: { label: string; value: string; color: string; s: Styles }) {
  return (
    <View style={s.statBox}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function CategoryRow({
  item, color, s,
}: { item: { category: string; amount: number; pct: number }; color: string; s: Styles }) {
  return (
    <View style={s.catRow}>
      <View style={s.catLabelRow}>
        <Text style={s.catName}>{item.category}</Text>
        <Text style={[s.catAmount, { color }]}>₪{item.amount.toFixed(0)}</Text>
      </View>
      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${item.pct}%` as `${number}%`, backgroundColor: color }]} />
      </View>
      <Text style={s.catPct}>{item.pct}%</Text>
    </View>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'בוקר טוב';
  if (h < 18) return 'צהריים טובים';
  return 'ערב טוב';
}
