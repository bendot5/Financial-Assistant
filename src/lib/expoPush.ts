import { Expo, type ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Sends a push notification to one or more Expo push tokens.
 * Silently skips invalid tokens rather than throwing.
 */
export async function sendPushNotifications(
  tokens: string[],
  payload: PushPayload,
): Promise<void> {
  const messages: ExpoPushMessage[] = tokens
    .filter((t) => Expo.isExpoPushToken(t))
    .map((to) => ({ to, ...payload }));

  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error('[ExpoPush] Failed to send chunk:', err);
    }
  }
}
