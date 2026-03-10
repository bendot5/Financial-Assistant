import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth';
import { ThemeProvider, useTheme } from '../lib/theme';
import { registerForPushNotifications } from '../lib/pushNotifications';

// Force RTL layout for Hebrew UI
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const queryClient = new QueryClient();

function NavigationGuard() {
  const { firebaseUser, member, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!firebaseUser) {
      // Not logged in → go to phone screen
      if (!inAuth) router.replace('/(auth)/phone');
    } else if (member?.onboardingStep !== 'COMPLETE') {
      // Logged in but onboarding not finished
      if (!inOnboarding) router.replace('/(onboarding)/setup');
    } else {
      // Fully onboarded → main app
      if (inAuth || inOnboarding) router.replace('/(tabs)');
    }
  }, [firebaseUser, member, isLoading, segments]);

  // Register push token once the user is fully onboarded
  useEffect(() => {
    if (member?.onboardingStep === 'COMPLETE') {
      registerForPushNotifications().catch(console.error);
    }
  }, [member?.onboardingStep]);

  return null;
}

function ThemedStatusBar() {
  const { colors } = useTheme();
  return <StatusBar style={colors.statusBar} />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NavigationGuard />
          <ThemedStatusBar />
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
