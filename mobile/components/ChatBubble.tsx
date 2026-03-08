import { View, Text, StyleSheet } from 'react-native';

export interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  at: Date;
}

interface Props {
  message: Message;
}

export function ChatBubble({ message: m }: Props) {
  const isUser = m.role === 'user';
  const time = m.at.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[s.row, isUser && s.rowUser]}>
      {!isUser && <Text style={s.avatar}>🤖</Text>}
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleBot]}>
        <Text style={[s.text, isUser && s.textUser]}>{m.text}</Text>
        <Text style={[s.time, isUser && s.timeUser]}>{time}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 4 },
  rowUser: { justifyContent: 'flex-end' },
  avatar: { fontSize: 22, marginBottom: 4 },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: 12 },
  bubbleBot: { backgroundColor: '#16213e', borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: '#6c63ff', borderBottomRightRadius: 4 },
  text: { color: '#e0e0e0', fontSize: 14, lineHeight: 20 },
  textUser: { color: '#fff' },
  time: { color: '#666', fontSize: 10, marginTop: 4, textAlign: 'right' },
  timeUser: { color: '#ffffffaa' },
});
