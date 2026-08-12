import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.supplies.app',
  appName: '준비물',
  webDir: 'dist',
  android: {
    // 웹뷰에서 준비물 목록을 스크롤할 때 자연스럽게 동작하도록.
    backgroundColor: '#f5f6fa',
  },
};

export default config;
