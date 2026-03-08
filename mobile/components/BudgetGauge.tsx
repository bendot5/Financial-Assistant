import { View, Text, StyleSheet } from 'react-native';

interface Props {
  pct: number; // 0–100+
}

export function BudgetGauge({ pct }: Props) {
  const capped = Math.min(pct, 100);
  const color = pct > 100 ? '#ef4444' : pct >= 85 ? '#f97316' : '#22c55e';
  const label = pct > 100 ? 'Over budget!' : pct >= 85 ? 'Almost at limit' : 'On track';

  return (
    <View style={s.container}>
      <View style={s.row}>
        <Text style={s.label}>Budget used</Text>
        <Text style={[s.pct, { color }]}>{pct}%</Text>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: `${capped}%` as `${number}%`, backgroundColor: color }]} />
      </View>
      <Text style={[s.status, { color }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: '#16213e', borderRadius: 16, padding: 20, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#ccc', fontSize: 14, fontWeight: '600' },
  pct: { fontSize: 22, fontWeight: '800' },
  track: { height: 10, backgroundColor: '#0f3460', borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  status: { fontSize: 12, fontWeight: '600' },
});
