import React from "react";
import { Platform } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { colors, fonts } from "../theme";
import type { ParentTabParamList, ParentStackParamList } from "./types";

import DashboardScreen from "../screens/parent/DashboardScreen";
import ApprovalsScreen from "../screens/parent/ApprovalsScreen";
import QuestsScreen from "../screens/parent/QuestsScreen";
import ConsequencesScreen from "../screens/parent/ConsequencesScreen";
import FamilyScreen from "../screens/parent/FamilyScreen";
import SettingsScreen from "../screens/parent/SettingsScreen";
import QuestEditScreen from "../screens/parent/QuestEditScreen";
import PaywallScreen from "../screens/parent/PaywallScreen";
import QuestArchivalScreen from "../screens/parent/QuestArchivalScreen";
import NotificationPreferencesScreen from "../screens/parent/NotificationPreferencesScreen";

const Tab = createBottomTabNavigator<ParentTabParamList>();
const Stack = createNativeStackNavigator<ParentStackParamList>();

function ParentTabs() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: "rgba(255,255,255,0.6)",
        tabBarStyle: {
          backgroundColor: colors.primaryDark,
          borderTopColor: colors.primaryDark,
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 4,
          paddingHorizontal: 4,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.parent.medium,
          fontSize: 11,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Icon name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Approvals"
        component={ApprovalsScreen}
        options={{
          title: "Approvals",
          tabBarIcon: ({ color, size }) => (
            <Icon name="checkmark-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Quests"
        component={QuestsScreen}
        options={{
          title: "Quests",
          tabBarIcon: ({ color, size }) => (
            <Icon name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Consequences"
        component={ConsequencesScreen}
        options={{
          title: "Rules",
          tabBarIcon: ({ color, size }) => (
            <Icon name="shield-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Family"
        component={FamilyScreen}
        options={{
          title: "Family",
          tabBarIcon: ({ color, size }) => (
            <Icon name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Icon name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function ParentNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ParentTabsInner" component={ParentTabs} />
      <Stack.Screen name="QuestEdit" component={QuestEditScreen} />
      <Stack.Screen name="Paywall" component={PaywallScreen} />
      <Stack.Screen name="QuestArchival" component={QuestArchivalScreen} />
      <Stack.Screen
        name="NotificationPreferences"
        component={NotificationPreferencesScreen}
      />
    </Stack.Navigator>
  );
}
