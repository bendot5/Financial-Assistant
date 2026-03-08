import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, type MonthlyReport, type Transaction } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { BudgetGauge } from '../../components/BudgetGauge';
import { TransactionCard } from '../../components/TransactionCard';

export default function DashboardScreen() {
  const { member } = useAuth();
  const now = new Date();

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

  const recent = txData?.transactions?.slice(0, 5) ?? [];

  const shareInvite = async () => {
    const code = householdData?.household?.inviteCode;
    if (!code) return;
    await Share.share({ message: `Join my FinancialAssistant household! Code: ${code}` });
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.greeting}>
        Good {getTimeOfDay()}, {member?.name ?? 'there'} 👋
      </Text>
      <Text style={s.month}>{now.toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>

      {report && (
        <>
          <BudgetGauge pct={report.budgetUsedPct} />

          <View style={s.statsRow}>
            <StatBox label="Spent" value={`$${report.totalExpenses.toFixed(0)}`} color="#ef4444" />
            <StatBox label="Budget" value={`$${report.budgetLimit.toFixed(0)}`} color="#6c63ff" />
            <StatBox label="Left" value={`$${Math.max(report.remaining, 0).toFixed(0)}`}
              color={report.remaining >= 0 ? '#22c55e' : '#ef4444'} />
          </View>

          {report.totalIncome > 0 && (
            <View style={s.incomeRow}>
              <Text style={s.incomeLabel}>📈 Income logged this month</Text>
              <Text style={s.incomeValue}>${report.totalIncome.toFixed(0)}</Text>
            </View>
          )}
        </>
      )}

      {reportLoading && <Text style={s.loading}>Loading summary…</Text>}

      {recent.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Recent transactions</Text>
          {recent.map((t) => <TransactionCard key={t.id} transaction={t} />)}
        </View>
      )}

      {householdData?.household?.inviteCode && (
        <TouchableOpacity style={s.inviteCard} onPress={shareInvite}>
          <Text style={s.inviteLabel}>Household invite code</Text>
          <Text style={s.inviteCode}>{householdData.household.inviteCode}</Text>
          <Text style={s.inviteHint}>Tap to share with your partner</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.statBox}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 20, paddingTop: 60, gap: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#fff' },
  month: { fontSize: 13, color: '#aaa', marginTop: -8 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: '#16213e', borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  incomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 12, padding: 14 },
  incomeLabel: { color: '#aaa', fontSize: 13 },
  incomeValue: { color: '#22c55e', fontWeight: '700', fontSize: 15 },
  section: { gap: 8 },
  sectionTitle: { color: '#ccc', fontSize: 14, fontWeight: '600' },
  loading: { color: '#666', textAlign: 'center', paddingVertical: 20 },
  inviteCard: { backgroundColor: '#16213e', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#6c63ff44', marginTop: 8 },
  inviteLabel: { color: '#888', fontSize: 12, marginBottom: 6 },
  inviteCode: { color: '#6c63ff', fontSize: 22, fontWeight: '800', letterSpacing: 3 },
  inviteHint: { color: '#555', fontSize: 11, marginTop: 6 },
});
