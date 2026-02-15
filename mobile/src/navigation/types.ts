export type RootStackParamList = {
  Auth: undefined;
  Setup: undefined;
  App: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  CreateFamily: undefined;
  JoinFamily: undefined;
  AddChild: undefined;
};

export type AppStackParamList = {
  ParentTabs: undefined;
  ChildTabs: undefined;
};

export type ParentTabParamList = {
  Dashboard: undefined;
  Approvals: undefined;
  Quests: undefined;
  Consequences: undefined;
  Family: undefined;
  Settings: undefined;
};

export type ParentStackParamList = {
  ParentTabsInner: undefined;
  QuestEdit: { id?: string };
  Paywall: undefined;
  QuestArchival: undefined;
};

export type ChildTabParamList = {
  Home: undefined;
  Quests: undefined;
  Play: undefined;
  Trophies: undefined;
  Profile: undefined;
};

export type ChildStackParamList = {
  ChildTabsInner: undefined;
  QuestDetail: { id: string };
  AvatarCustomize: undefined;
  Themes: undefined;
};
