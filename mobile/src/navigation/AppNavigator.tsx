import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../store/auth";
import { ParentNavigator } from "./ParentNavigator";
import { ChildNavigator } from "./ChildNavigator";
import type { AppStackParamList } from "./types";

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  const user = useAuthStore((s) => s.user);
  const isChild = user?.role === "child";

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isChild ? (
        <Stack.Screen name="ChildTabs" component={ChildNavigator} />
      ) : (
        <Stack.Screen name="ParentTabs" component={ParentNavigator} />
      )}
    </Stack.Navigator>
  );
}
