import { initializeApp, getApps } from 'firebase/app';
import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

if (!getApps().length) {
  const app = initializeApp(firebaseConfig);

  if (Platform.OS !== 'web') {
    // Use AsyncStorage for persistence on native only.
    // These require()s are intentionally inside the guard so they are never
    // evaluated during Expo web / static-export (Node.js) runs.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
    initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  }
  // On web: Firebase Auth uses browserLocalPersistence automatically — no setup needed.
}
