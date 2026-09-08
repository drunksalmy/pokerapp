import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#1A1816' } }}>
        <Stack.Screen name="index" />
      </Stack>
      <StatusBar style="light" hidden />
    </SafeAreaProvider>
  );
}
