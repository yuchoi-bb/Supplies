import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kangaroo.app',
  appName: 'Kangaroo',
  webDir: 'dist',
  android: {
    backgroundColor: '#141d33',
  },
  plugins: {
    // 앱에서는 안드로이드 네이티브 Google 로그인으로 토큰만 받고,
    // 실제 Firebase 로그인·Firestore는 웹 SDK가 처리한다.
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
};

export default config;
