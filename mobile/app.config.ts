import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_PROD = process.env.APP_ENV === 'production';
const IS_STAGING = process.env.APP_ENV === 'staging';

const getApiUrl = () => {
  if (IS_PROD) return 'https://api.screenquest.app/api';
  if (IS_STAGING) return 'https://screenquest-api-staging.onrender.com/api';
  return 'http://localhost:3000/api';
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ScreenQuest',
  slug: 'screenquest',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/sq-launch.jpg',
    resizeMode: 'contain',
    backgroundColor: '#f6f0fa',
  },
  ios: {
    bundleIdentifier: 'com.screenquest.app',
    buildNumber: '1',
    supportsTablet: true,
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    package: 'com.screenquest.app',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#4A90D9',
    },
    permissions: [
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'VIBRATE',
    ],
  },
  plugins: [
    '@sentry/react-native/expo',
    '@react-native-firebase/app',
    '@react-native-firebase/messaging',
  ],
  extra: {
    apiUrl: getApiUrl(),
    eas: {
      projectId: 'YOUR_EAS_PROJECT_ID',
    },
  },
});
