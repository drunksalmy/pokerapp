import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#1A1816' } }}>
        {/* SDK 58: on iOS 27 apps are resizable and lockAsync may be refused,
            so the table also declares portrait on the screen itself, which is
            the documented per-screen way. The table already adapts to its
            window size, so it stays usable if the system ignores both. */}
        <Stack.Screen name="index" options={{ orientation: 'portrait' }} />
      </Stack>
      <StatusBar style="light" hidden />
    </SafeAreaProvider>
  );
}
