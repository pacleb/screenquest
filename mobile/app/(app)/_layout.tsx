import { Stack, Redirect } from "expo-router";
import { useAuthStore } from "../../src/store/auth";

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="parent" />
      <Stack.Screen name="child" />
    </Stack>
  );
}
