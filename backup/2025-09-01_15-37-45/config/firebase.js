import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, PhoneAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import ENV from './environment';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: ENV.firebaseApiKey,
  authDomain: ENV.firebaseAuthDomain,
  projectId: ENV.firebaseProjectId,
  storageBucket: ENV.firebaseStorageBucket,
  messagingSenderId: ENV.firebaseMessagingSenderId,
  appId: ENV.firebaseAppId,
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase Auth 초기화 (자동 로그인 지원 강화)
let auth;
try {
  // AsyncStorage를 사용한 영속성 설정으로 자동 로그인 지원
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  console.log('✅ Firebase Auth 초기화 성공 (initializeAuth with persistence)');
} catch (error) {
  console.log('🔄 Firebase Auth 재초기화 시도...');
  try {
    auth = getAuth(app);
    console.log('✅ Firebase Auth 초기화 성공 (getAuth fallback)');
  } catch (fallbackError) {
    console.error('❌ Firebase Auth 초기화 실패:', fallbackError);
    throw fallbackError;
  }
}

// 한국을 기본 국가로 설정
if (auth && auth.settings) {
  auth.settings.appVerificationDisabledForTesting = false;
  // 한국 국가 코드 설정
  auth.settings.phoneNumber = '+82';
  console.log('🇰🇷 한국 국가 코드 설정 완료');
}

// Phone Auth 지원 확인
console.log('📱 PhoneAuthProvider 확인:', typeof PhoneAuthProvider);
console.log('📱 PhoneAuthProvider 상세:', PhoneAuthProvider);
console.log('📱 auth 객체 상세:', auth);

// Firebase Storage 초기화
const storage = getStorage(app);

// Firebase Firestore 초기화
const firestore = getFirestore(app);

console.log('✅ Firebase 초기화 성공');

// Firebase 서비스 내보내기
const firebaseService = {
  getApp: () => app,
  getAuth: () => auth,
  getStorage: () => storage,
  getFirestore: () => firestore,
  isInitialized: () => !!app && !!auth && !!storage && !!firestore
};

export default firebaseService;
export { app, auth, storage, firestore };
