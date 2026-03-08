import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth';
import { registerForPushNotifications } from '../lib/pushNotifications';

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

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationGuard />
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
