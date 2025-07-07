import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyChWKKVtd_nSBvlT-A-Irer6VVpuOmPu6Y",
  authDomain: "net-gil-app-rbn1bz.firebaseapp.com",
  projectId: "net-gil-app-rbn1bz",
  storageBucket: "net-gil-app-rbn1bz.appspot.com",
  messagingSenderId: "77528205997",
  appId: "1:77528205997:web:e446652ae84672df62d424",
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase Auth 초기화
const auth = Platform.OS === 'web' 
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

// Firebase 서비스 내보내기
const firebaseService = {
  getApp: () => app,
  getAuth: () => auth,
  isInitialized: () => !!app && !!auth
};

export default firebaseService;
export { app, auth };
