import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  signInWithCredential,
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

const isNative = Capacitor.isNativePlatform();

export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (firebaseEnabled) {
  app = initializeApp(config as Record<string, string>);
  // 앱(웹뷰)에서는 팝업용 리소스를 싣지 않는 initializeAuth를 쓴다.
  authInstance = isNative
    ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
    : getAuth(app);
  // 오프라인에서도 읽고 쓸 수 있게 로컬 캐시를 켠다.
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

export const auth = authInstance;
export const db = dbInstance;

// 웹: Google 팝업 로그인.
// 앱: 웹뷰에서는 팝업 로그인이 막히므로 안드로이드 네이티브 Google 로그인으로 토큰을 받아
//     웹 SDK에 넘긴다. (Firestore는 웹 SDK가 그대로 사용)
export async function signInWithGoogle(): Promise<void> {
  if (!auth) throw new Error('Firebase가 설정되지 않았습니다.');
  if (isNative) {
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;
    if (!idToken) throw new Error('Google 로그인 토큰을 받지 못했습니다.');
    await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    return;
  }
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  if (isNative) {
    await FirebaseAuthentication.signOut().catch(() => {
      /* 네이티브 로그인 상태가 없어도 무시 */
    });
  }
  await fbSignOut(auth);
}
