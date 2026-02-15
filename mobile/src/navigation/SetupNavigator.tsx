import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CreateFamilyScreen from "../screens/auth/CreateFamilyScreen";
import AddChildScreen from "../screens/auth/AddChildScreen";

export type SetupStackParamList = {
  CreateFamily: undefined;
  AddChild: undefined;
};

const Stack = createNativeStackNavigator<SetupStackParamList>();

export function SetupNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="CreateFamily" component={CreateFamilyScreen} />
      <Stack.Screen name="AddChild" component={AddChildScreen} />
    </Stack.Navigator>
  );
}
