import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';
import { Colors } from '../src/constants/colors';

export default function Index() {
  const { user, isLoading, hasSkippedAuth } = useAuthStore();

  // Wait for Firebase auth state to resolve
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.blue} />
      </View>
    );
  }

  // Logged in or skipped → go straight to the app
  if (user || hasSkippedAuth) {
    return <Redirect href={'/(tabs)/dashboard' as any} />;
  }

  // Not authenticated → onboarding
  return <Redirect href="/auth/welcome" />;
}
