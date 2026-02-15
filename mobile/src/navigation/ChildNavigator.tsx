import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/Ionicons";
import { colors as staticColors, fonts, useTheme } from "../theme";
import type { ChildTabParamList, ChildStackParamList } from "./types";

import HomeScreen from "../screens/child/HomeScreen";
import QuestsScreen from "../screens/child/QuestsScreen";
import PlayScreen from "../screens/child/PlayScreen";
import TrophiesScreen from "../screens/child/TrophiesScreen";
import ProfileScreen from "../screens/child/ProfileScreen";
import QuestDetailScreen from "../screens/child/QuestDetailScreen";
import AvatarCustomizeScreen from "../screens/child/AvatarCustomizeScreen";
import ThemesScreen from "../screens/child/ThemesScreen";

const Tab = createBottomTabNavigator<ChildTabParamList>();
const Stack = createNativeStackNavigator<ChildStackParamList>();

function ChildTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
        tabBarStyle: {
          backgroundColor: staticColors.primaryDark,
          borderTopColor: staticColors.primaryDark,
          height: 64,
          paddingBottom: 10,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.child.semiBold,
          fontSize: 11,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Quests"
        component={QuestsScreen}
        options={{
          title: "Quests",
          tabBarIcon: ({ color, size }) => (
            <Icon name="star" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Play"
        component={PlayScreen}
        options={{
          title: "Play",
          tabBarIcon: ({ color, size }) => (
            <Icon name="play-circle" size={size + 4} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Trophies"
        component={TrophiesScreen}
        options={{
          title: "Trophies",
          tabBarIcon: ({ color, size }) => (
            <Icon name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Me",
          tabBarIcon: ({ color, size }) => (
            <Icon name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function ChildNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChildTabsInner" component={ChildTabs} />
      <Stack.Screen name="QuestDetail" component={QuestDetailScreen} />
      <Stack.Screen name="AvatarCustomize" component={AvatarCustomizeScreen} />
      <Stack.Screen name="Themes" component={ThemesScreen} />
    </Stack.Navigator>
  );
}
