export const colors = {
  // Primary: Deep Purple
  primary: '#6B2FA0',
  primaryLight: '#8B5FBF',
  primaryDark: '#4A1D73',

  // Accent: Golden Amber
  accent: '#F5A623',
  accentLight: '#FFD166',
  accentDark: '#D4891A',

  // Secondary: Bright Green (timer/success)
  secondary: '#4CD964',
  secondaryLight: '#7EE89A',
  secondaryDark: '#2DA844',

  // Kept for backward compatibility — same as primary
  purple: '#6B2FA0',

  // Neutrals: Purple-tinted
  background: '#F5F0FA',
  card: '#FFFFFF',
  textPrimary: '#2A1B3D',
  textSecondary: '#6B5B7B',
  border: '#E0D6EC',

  // Semantic
  error: '#E74C3C',
  warning: '#F5A623',
  xp: '#FFD700',
  streak: '#FF6B35',

  // Child-specific
  childBg: '#F0E6FF',
  questCard: '#E8F5E9',
  timerActive: '#4CD964',
  timerWarning: '#F5A623',
  timerDanger: '#E74C3C',
} as const;
