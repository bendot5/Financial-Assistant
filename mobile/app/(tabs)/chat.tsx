import { useState, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useTheme } from '../../lib/theme';
import { ChatBubble, type Message } from '../../components/ChatBubble';
import { TransactionFormModal } from '../../components/TransactionFormModal';

const WELCOME: Message = {
  id: 'welcome',
  role: 'bot',
  text: 'שלום! ספר לי על הוצאה או הכנסה ואני ארשום אותה.\n\nלדוגמה:\n• "הוצאתי 50 על אוכל"\n• "נטפליקס 15 שקל"\n• "קיבלתי משכורת 5000"',
  at: new Date(),
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  // Stores the previous user message when the bot asks a follow-up (e.g. "כמה זה עלה?")
  const [pendingContext, setPendingContext] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { colors } = useTheme();

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.cardBg },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'right' },
    headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, textAlign: 'right' },
    list: { padding: 16, gap: 8, flexGrow: 1, justifyContent: 'flex-end' },
    inputRow: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: colors.cardBg, alignItems: 'flex-end' },
    input: { flex: 1, backgroundColor: colors.inputBg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, fontSize: 15, maxHeight: 100 },
    sendBtn: { width: 44, height: 44, backgroundColor: colors.accent, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    sendDisabled: { opacity: 0.4 },
    sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },
    manualBtn: { width: 44, height: 44, backgroundColor: colors.inputBg, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.accent },
    manualIcon: { color: colors.accent, fontSize: 20 },
  }), [colors]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text, at: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    Keyboard.dismiss();
    setLoading(true);

    // If there's a pending context (bot asked a follow-up), combine with previous message
    const fullMessage = pendingContext ? `${pendingContext} ${text}` : text;

    try {
      const res = await api.post<{ type: string; message: string }>('/transactions', { message: fullMessage });
      const botMsg: Message = { id: `bot-${Date.now()}`, role: 'bot', text: res.message, at: new Date() };
      setMessages((prev) => [...prev, botMsg]);

      if (res.type === 'SUCCESS') {
        setPendingContext(null);
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['report'] });
        setTimeout(() => router.push('/(tabs)/'), 1500);
      } else if (res.type === 'MISSING_AMOUNT') {
        // Save combined message so the next reply has full context
        setPendingContext(fullMessage);
      } else {
        setPendingContext(null);
      }
    } catch {
      setPendingContext(null);
      const errMsg: Message = {
        id: `err-${Date.now()}`, role: 'bot',
        text: '❌ משהו השתבש. נסה שוב.',
        at: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleManualSave = async (data: { type: 'EXPENSE' | 'INCOME'; amount: number; category: string; description: string; date: string }) => {
    await api.post('/transactions/manual', data);
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['report'] });
    const botMsg: Message = {
      id: `manual-${Date.now()}`, role: 'bot',
      text: `✅ נרשם: ${data.description} — ₪${data.amount}`,
      at: new Date(),
    };
    setMessages((prev) => [...prev, botMsg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Text style={s.headerTitle}>רישום פעולה</Text>
        <Text style={s.headerSub}>מונע על ידי בינה מלאכותית — פשוט כתוב בטבעיות</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={s.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={s.inputRow}>
        <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && s.sendDisabled]} onPress={send} disabled={!input.trim() || loading}>
          <Text style={s.sendIcon}>↑</Text>
        </TouchableOpacity>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="לדוגמה: הוצאתי 50 על קניות"
          placeholderTextColor={colors.textMuted}
          multiline
          onSubmitEditing={send}
          textAlign="right"
        />
        <TouchableOpacity style={s.manualBtn} onPress={() => setManualVisible(true)}>
          <Text style={s.manualIcon}>✎</Text>
        </TouchableOpacity>
      </View>

      <TransactionFormModal
        visible={manualVisible}
        onClose={() => setManualVisible(false)}
        onSave={handleManualSave}
      />
    </KeyboardAvoidingView>
  );
}
