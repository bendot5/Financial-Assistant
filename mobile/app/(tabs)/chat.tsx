import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ChatBubble, type Message } from '../../components/ChatBubble';

const WELCOME: Message = {
  id: 'welcome',
  role: 'bot',
  text: "Hi! Tell me about an expense or income and I'll log it.\n\nExamples:\n• \"Spent 50 on lunch\"\n• \"Netflix $15\"\n• \"Received salary 5000\"",
  at: new Date(),
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text, at: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    Keyboard.dismiss();
    setLoading(true);

    try {
      const res = await api.post<{ type: string; message: string }>('/transactions', { message: text });
      const botMsg: Message = { id: `bot-${Date.now()}`, role: 'bot', text: res.message, at: new Date() };
      setMessages((prev) => [...prev, botMsg]);

      // Refresh dashboard data when a transaction is successfully logged
      if (res.type === 'SUCCESS') {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['report'] });
        // Navigate to dashboard after a short delay so the user can read the confirmation
        setTimeout(() => router.push('/(tabs)/'), 1500);
      }
    } catch (err) {
      const errMsg: Message = {
        id: `err-${Date.now()}`, role: 'bot',
        text: '❌ Something went wrong. Please try again.',
        at: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Log Transaction</Text>
        <Text style={s.headerSub}>AI-powered — just type naturally</Text>
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
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="e.g. Spent 50 on groceries"
          placeholderTextColor="#555"
          multiline
          onSubmitEditing={send}
        />
        <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && s.sendDisabled]} onPress={send} disabled={!input.trim() || loading}>
          <Text style={s.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#16213e' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: '#888', marginTop: 2 },
  list: { padding: 16, gap: 8, flexGrow: 1, justifyContent: 'flex-end' },
  inputRow: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: '#16213e', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#0f3460', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, backgroundColor: '#6c63ff', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
