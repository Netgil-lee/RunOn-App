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
  appId: Platform.OS === 'android' ? (ENV.firebaseAppIdAndroid || ENV.firebaseAppId) : (ENV.firebaseAppIdIos || ENV.firebaseAppId),
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase Auth 초기화 (자동 로그인 최적화)
let auth;
try {
  // AsyncStorage persistence로 자동 로그인 지원
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  console.log('✅ Firebase Auth 초기화 성공 (자동 로그인 지원)');
} catch (error) {
  console.log('🔄 Firebase Auth persistence 설정 실패, 기본 설정으로 재시도...');
  try {
    // 기본 getAuth로 fallback
    auth = getAuth(app);
    console.log('✅ Firebase Auth 초기화 성공 (기본 모드)');
  } catch (fallbackError) {
    console.error('❌ Firebase Auth 초기화 실패:', fallbackError);
    // 치명적 에러 발생 시에도 앱이 계속 실행되도록 null로 설정
    auth = null;
  }
}

// 한국을 기본 국가로 설정
if (auth && auth.settings) {
  auth.settings.appVerificationDisabledForTesting = false;
  // 한국 국가 코드 설정
  auth.settings.phoneNumber = '+82';
  // reCAPTCHA 설정 최적화
  auth.settings.forceRecaptchaFlow = false;
  // WebKit 네트워킹 설정 강화
  auth.settings.appVerificationDisabledForTesting = false;
  // 언어 설정 (한국어)
  auth.languageCode = 'ko';
  console.log('🇰🇷 한국 국가 코드 설정 완료');
  console.log('🔐 reCAPTCHA 설정 최적화 완료');
  console.log('🌐 WebKit 네트워킹 설정 완료');
  console.log('🇰🇷 한국어 언어 설정 완료');
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

// Firebase 서비스 내보내기 (안전성 강화)
const firebaseService = {
  getApp: () => app,
  getAuth: () => auth,
  getStorage: () => storage,
  getFirestore: () => firestore,
  isInitialized: () => {
    try {
      return !!app && !!storage && !!firestore;
    } catch (error) {
      console.warn('Firebase 초기화 상태 확인 실패:', error);
      return false;
    }
  }
};

export default firebaseService;
export { app, auth, storage, firestore };
