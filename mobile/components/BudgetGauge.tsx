import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme';

interface Props {
  pct: number; // 0–100+
}

export function BudgetGauge({ pct }: Props) {
  const { colors } = useTheme();
  const capped = Math.min(pct, 100);
  const color = pct > 100 ? colors.expense : pct >= 85 ? '#f97316' : colors.income;
  const label = pct > 100 ? 'חריגה מהתקציב!' : pct >= 85 ? 'קרוב לגבול' : 'בשליטה';

  const s = useMemo(() => StyleSheet.create({
    container: { backgroundColor: colors.cardBg, borderRadius: 16, padding: 20, gap: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
    pct: { fontSize: 22, fontWeight: '800' },
    track: { height: 10, backgroundColor: colors.inputBg, borderRadius: 5, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 5 },
    status: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
  }), [colors]);

  return (
    <View style={s.container}>
      <View style={s.row}>
        <Text style={s.label}>ניצול תקציב</Text>
        <Text style={[s.pct, { color }]}>{pct}%</Text>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: `${capped}%` as `${number}%`, backgroundColor: color }]} />
      </View>
      <Text style={[s.status, { color }]}>{label}</Text>
    </View>
  );
}
