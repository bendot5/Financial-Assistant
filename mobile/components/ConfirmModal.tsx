import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible, title, message,
  confirmText = 'אישור', cancelText = 'ביטול',
  destructive = false,
  onConfirm, onCancel,
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={[s.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[s.title, { color: colors.text }]}>{title}</Text>
          <Text style={[s.message, { color: colors.textSecondary }]}>{message}</Text>
          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, { backgroundColor: colors.inputBg }]} onPress={onCancel}>
              <Text style={[s.btnText, { color: colors.textMuted }]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: destructive ? colors.expense : colors.accent }]}
              onPress={onConfirm}
            >
              <Text style={[s.btnText, { color: '#fff' }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    gap: 12,
    borderWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '700', textAlign: 'right' },
  message: { fontSize: 14, textAlign: 'right', lineHeight: 20 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, borderRadius: 10, padding: 13, alignItems: 'center' },
  btnText: { fontWeight: '700', fontSize: 15 },
});
