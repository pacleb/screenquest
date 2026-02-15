import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../store/auth";
import { AuthNavigator } from "./AuthNavigator";
import { SetupNavigator } from "./SetupNavigator";
import { AppNavigator } from "./AppNavigator";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isLoading, isAuthenticated, user } = useAuthStore();

  if (isLoading) {
    return null;
  }

  const needsSetup = isAuthenticated && !user?.familyId;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : needsSetup ? (
        <Stack.Screen name="Setup" component={SetupNavigator} />
      ) : (
        <Stack.Screen name="App" component={AppNavigator} />
      )}
    </Stack.Navigator>
  );
}
