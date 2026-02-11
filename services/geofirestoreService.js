import { GeoFirestore } from 'geofirestore';
import ENV from '../config/environment';
import { getAuth } from 'firebase/auth';
// Firestore compat 모드 import (GeoFirestore 호환성)
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

// GeoFirestore 인스턴스 생성 (지연 초기화)
let geofirestoreInstance = null;

function getGeoFirestore() {
  if (!geofirestoreInstance) {
    try {
      console.log('🔍 GeoFirestore 초기화 시작...');
      
      // compat 모드 Firestore 인스턴스 생성
      // 중요: 기존 modular 앱과 동일한 앱 인스턴스를 사용해야 인증이 공유됨
      // 별도 앱을 생성하지 않고 기본 앱 사용
      let compatApp;
      try {
        // 기본 앱 사용 (기존 modular 앱과 동일)
        compatApp = firebase.app();
        console.log('🔍 기존 compat app 사용:', compatApp.name);
      } catch (e) {
        // 기본 앱이 없으면 초기화 (기존 modular 앱과 동일한 설정)
        compatApp = firebase.initializeApp({
          apiKey: ENV.firebaseApiKey,
          authDomain: ENV.firebaseAuthDomain,
          projectId: ENV.firebaseProjectId,
          storageBucket: ENV.firebaseStorageBucket,
          messagingSenderId: ENV.firebaseMessagingSenderId,
          appId: ENV.firebaseAppId
        });
        console.log('🔍 새 compat app 생성:', compatApp.name);
      }
      
      const compatFirestore = firebase.firestore(compatApp);
      const compatAuth = firebase.auth(compatApp);
      
      // 기존 modular SDK의 인증 상태 확인
      const modularAuth = getAuth();
      
      // compat 앱의 settings를 modular 앱과 동일하게 설정
      if (compatAuth.settings) {
        compatAuth.settings.appVerificationDisabledForTesting = false;
        compatAuth.languageCode = 'ko';
      }
      
      // 인증 상태 확인
      if (modularAuth.currentUser) {
        console.log('🔐 Modular auth 사용자:', modularAuth.currentUser.uid);
      }
      
      // compat auth 상태 확인 (비동기)
      compatAuth.onAuthStateChanged((user) => {
        if (user) {
          console.log('✅ Compat auth 사용자 확인:', user.uid);
        } else {
          console.warn('⚠️ Compat auth 사용자 없음');
        }
      });
      
      console.log('🔍 Compat Firestore 확인:', {
        compatFirestore: !!compatFirestore,
        hasCollection: typeof compatFirestore.collection === 'function',
        appName: compatApp.name,
        hasAuth: !!compatAuth,
        currentUser: compatAuth.currentUser?.uid || 'none'
      });
      
      // GeoFirestore 초기화
      geofirestoreInstance = new GeoFirestore(compatFirestore);
      
      // 초기화 확인
      console.log('🔍 GeoFirestore 인스턴스 확인:', {
        geofirestore: !!geofirestoreInstance,
        hasCollection: typeof geofirestoreInstance?.collection === 'function'
      });
      
      if (typeof geofirestoreInstance.collection === 'function') {
        console.log('✅ GeoFirestore 초기화 성공');
      } else {
        console.error('❌ GeoFirestore collection 메서드 없음');
      }
    } catch (error) {
      console.error('❌ GeoFirestore 초기화 실패:', error);
      throw error;
    }
  }
  return geofirestoreInstance;
}

// 기본 export는 함수로 변경 (지연 초기화)
export default getGeoFirestore;
