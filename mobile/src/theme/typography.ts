import { TextStyle } from 'react-native';

// Font families — loaded via expo-font in root layout
export const fonts = {
  // Child UI
  child: {
    regular: 'Nunito_400Regular',
    semiBold: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
    extraBold: 'Nunito_800ExtraBold',
  },
  // Parent UI
  parent: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
} as const;

// Predefined text styles
export const typography: Record<string, TextStyle> = {
  // Child headings
  childH1: { fontFamily: fonts.child.extraBold, fontSize: 32, lineHeight: 40 },
  childH2: { fontFamily: fonts.child.bold, fontSize: 24, lineHeight: 32 },
  childH3: { fontFamily: fonts.child.bold, fontSize: 20, lineHeight: 28 },
  childBody: { fontFamily: fonts.child.regular, fontSize: 16, lineHeight: 24 },
  childBodyBold: { fontFamily: fonts.child.semiBold, fontSize: 16, lineHeight: 24 },
  childCaption: { fontFamily: fonts.child.semiBold, fontSize: 13, lineHeight: 18 },
  childLarge: { fontFamily: fonts.child.extraBold, fontSize: 48, lineHeight: 56 },

  // Parent headings
  parentH1: { fontFamily: fonts.parent.bold, fontSize: 28, lineHeight: 36 },
  parentH2: { fontFamily: fonts.parent.semiBold, fontSize: 20, lineHeight: 28 },
  parentH3: { fontFamily: fonts.parent.semiBold, fontSize: 17, lineHeight: 24 },
  parentBody: { fontFamily: fonts.parent.regular, fontSize: 15, lineHeight: 22 },
  parentBodyBold: { fontFamily: fonts.parent.medium, fontSize: 15, lineHeight: 22 },
  parentCaption: { fontFamily: fonts.parent.medium, fontSize: 13, lineHeight: 18 },
  parentSmall: { fontFamily: fonts.parent.regular, fontSize: 12, lineHeight: 16 },
};
