/**
 * Environment configuration for the mobile app.
 *
 * Values are read from .env files via react-native-config:
 *   .env            → default (development)
 *   .env.staging    → staging builds
 *   .env.production → production builds
 *
 * To select an env file for an iOS build:
 *   ENVFILE=.env.staging npx react-native run-ios --mode Release
 *
 * For Xcode archive builds, set ENVFILE in the scheme's
 * Build → Pre-actions, or in the Build Settings.
 */

import Config from 'react-native-config';

export interface EnvConfig {
  apiUrl: string;
  environment: string;
}

export const ENV: EnvConfig = {
  apiUrl: Config.API_URL ?? 'https://screenquest-api-staging.onrender.com/api',
  environment: Config.APP_ENV ?? 'development',
};
