import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyChWKKVtd_nSBvlT-A-Irer6VVpuOmPu6Y",
  authDomain: "net-gil-app-rbn1bz.firebaseapp.com",
  projectId: "net-gil-app-rbn1bz",
  storageBucket: "net-gil-app-rbn1bz.firebasestorage.app",
  messagingSenderId: "77528205997",
  appId: "1:77528205997:web:e446652ae84672df62d424"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firebase 서비스 초기화
const auth = getAuth(app);
const db = getFirestore(app);

// 서비스 export
export { auth, db };
export default app; 