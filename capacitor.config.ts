import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myhiitlab.app',
  appName: 'Hiit Lab',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    Deploy: {
      appId: '76606737',
      channel: 'Production',
      updateMethod: 'auto',
      maxVersions: 2,
    },
  },
};

export default config;
