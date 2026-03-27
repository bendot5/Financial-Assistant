import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Requests notification permission, retrieves the Expo push token,
 * and registers it with the backend so the monthly cron job can reach this device.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) {
    console.log('[Push] Skipping push registration — not a physical device.');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Notification permission denied.');
    return;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  let pushToken: string;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    pushToken = tokenData.data;
  } catch (err) {
    // getExpoPushTokenAsync requires an EAS project ID which is only available
    // after running `eas build`. Skip silently during local development.
    console.warn('[Push] Could not get Expo push token (EAS project not configured):', err);
    return;
  }

  await api.put('/profile', { pushToken });
  console.log('[Push] Registered token:', pushToken);
}
