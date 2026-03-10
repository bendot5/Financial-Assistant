import { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import type { MonthlyReport } from '../lib/api';
import { useTheme } from '../lib/theme';

const STORAGE_KEY = 'chartPreference';
const SCREEN_WIDTH = Dimensions.get('window').width - 40;

type ChartMode = 'line' | 'bar' | 'pie';

const PIE_COLORS = ['#6c63ff', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];

interface Props {
  report: MonthlyReport;
}

export function ChartSection({ report }: Props) {
  const { colors, isDark } = useTheme();
  const [mode, setMode] = useState<ChartMode>('bar');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'line' || v === 'bar' || v === 'pie') setMode(v);
    });
  }, []);

  const setModeAndSave = (m: ChartMode) => {
    setMode(m);
    AsyncStorage.setItem(STORAGE_KEY, m);
  };

  const chartConfig = useMemo(() => ({
    backgroundColor: colors.cardBg,
    backgroundGradientFrom: colors.cardBg,
    backgroundGradientTo: colors.inputBg,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
    labelColor: (opacity = 1) => isDark
      ? `rgba(255,255,255,${opacity})`
      : `rgba(30,30,30,${opacity})`,
    style: { borderRadius: 12 },
    propsForDots: { r: '3', strokeWidth: '1', stroke: '#6c63ff' },
  }), [colors, isDark]);

  const s = useMemo(() => StyleSheet.create({
    container: { gap: 10 },
    toggleRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
    toggleBtn: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
      backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    },
    toggleBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    toggleText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    toggleTextActive: { color: '#fff' },
    chart: { alignItems: 'center' },
    chartStyle: { borderRadius: 12, marginTop: 4 },
    empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  }), [colors]);

  const hasExpenses = report.totalExpenses > 0;
  const topCats = report.topCategories.slice(0, 5);

  const barData = {
    labels: topCats.map((c) => c.category.length > 5 ? c.category.slice(0, 5) + '…' : c.category),
    datasets: [{ data: topCats.length > 0 ? topCats.map((c) => c.amount) : [0] }],
  };

  // Last 7 days — fill missing days with 0
  const todayNum = new Date().getDate();
  const startDay = Math.max(1, todayNum - 6);
  const last7Days = Array.from({ length: todayNum - startDay + 1 }, (_, i) => startDay + i);
  const expenseByDay = Object.fromEntries(report.dailyExpenses.map((d) => [d.day, d.amount]));
  const lineData = {
    labels: last7Days.map((d) => `${d}`),
    datasets: [{ data: last7Days.map((d) => expenseByDay[d] ?? 0) }],
  };

  const pieData = topCats.map((c, i) => ({
    name: c.category.length > 6 ? c.category.slice(0, 6) + '…' : c.category,
    population: c.amount,
    color: PIE_COLORS[i % PIE_COLORS.length],
    legendFontColor: colors.textSecondary,
    legendFontSize: 11,
  }));

  return (
    <View style={s.container}>
      <View style={s.toggleRow}>
        {(['line', 'bar', 'pie'] as ChartMode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[s.toggleBtn, mode === m && s.toggleBtnActive]}
            onPress={() => setModeAndSave(m)}
          >
            <Text style={[s.toggleText, mode === m && s.toggleTextActive]}>
              {m === 'line' ? '📈 קו' : m === 'bar' ? '📊 עמודות' : '🥧 פאי'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!hasExpenses ? (
        <Text style={s.empty}>אין הוצאות החודש</Text>
      ) : (
        <View style={s.chart}>
          {mode === 'line' && (
            <LineChart
              data={lineData}
              width={SCREEN_WIDTH}
              height={180}
              chartConfig={chartConfig}
              bezier
              style={s.chartStyle}
              withInnerLines={false}
            />
          )}
          {mode === 'bar' && topCats.length > 0 && (
            <BarChart
              data={barData}
              width={SCREEN_WIDTH}
              height={180}
              chartConfig={chartConfig}
              style={s.chartStyle}
              showValuesOnTopOfBars
              yAxisLabel="₪"
              yAxisSuffix=""
            />
          )}
          {mode === 'pie' && pieData.length > 0 && (
            <PieChart
              data={pieData}
              width={SCREEN_WIDTH}
              height={160}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="10"
              style={s.chartStyle}
            />
          )}
        </View>
      )}
    </View>
  );
}
