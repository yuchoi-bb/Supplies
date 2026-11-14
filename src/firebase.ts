import { Capacitor } from '@capacitor/core';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  type Auth,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

// Firebase 프로젝트 "up-wishlist"의 웹 앱 "Kangaroo Supplies Web" 설정.
// 웹페이지에 공개로 들어가는 식별값이며, 데이터 보호는 Firestore 보안 규칙이 맡는다.
// VITE_FIREBASE_* 환경변수가 있으면 그 값이 우선한다.
const env = import.meta.env;
const config = {
  apiKey: (env.VITE_FIREBASE_API_KEY as string) || 'AIzaSyBugGi2xSyx-SeROwXNTjqyyCCJpDjNsAk',
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string) || 'up-wishlist.firebaseapp.com',
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string) || 'up-wishlist',
  storageBucket:
    (env.VITE_FIREBASE_STORAGE_BUCKET as string) || 'up-wishlist.firebasestorage.app',
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '860927554139',
  appId: (env.VITE_FIREBASE_APP_ID as string) || '1:860927554139:web:688a543728ac533807457e',
};

// 안드로이드 앱(웹뷰) 안에서는 웹 팝업 방식 Google 로그인이 막히므로,
// 네이티브 로그인을 붙이기 전까지는 앱에서는 기기 저장 모드로만 동작한다.
export const firebaseEnabled =
  Boolean(config.apiKey && config.projectId && config.appId) && !Capacitor.isNativePlatform();

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (firebaseEnabled) {
  app = initializeApp(config as Record<string, string>);
  authInstance = getAuth(app);
  // 오프라인에서도 읽고 쓸 수 있게 로컬 캐시를 켠다.
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

export const auth = authInstance;
export const db = dbInstance;

export async function signInWithGoogle(): Promise<void> {
  if (!auth) throw new Error('Firebase가 설정되지 않았습니다.');
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  await fbSignOut(auth);
}
