import Constants from 'expo-constants';
import { Platform } from 'react-native';

// 환경 변수 설정
const ENV = {
  dev: {
    // Firebase - 실제 Firebase 프로젝트에서 가져온 설정으로 교체하세요
    firebaseApiKey: Constants.expoConfig?.extra?.firebaseApiKey || 'AIzaSyDq24FyKrDTtomyNMcC3gZB7eqpr0OGZCg',
    firebaseAuthDomain: 'runon-production-app.firebaseapp.com',
    firebaseProjectId: 'runon-production-app',
    firebaseStorageBucket: 'runon-production-app.firebasestorage.app',
    firebaseMessagingSenderId: '936820129286',
    firebaseAppId: '1:936820129286:ios:1edd25b1f1cef603b14d87',
    
    // 외부 API
    weatherApiKey: Constants.expoConfig?.extra?.weatherApiKey || 'c1861b48c1786a9ff6a37560f3b8c63c',
    kakaoMapApiKey: '464318d78ffeb1e52a1185498fe1af08', // JavaScript 키 (웹뷰용)
    // 시뮬레이터에서 HealthKit 동작을 모의할지 여부
    simulateHealthKitOnSimulator: true,
  },
  staging: {
    // Staging 환경 설정 (dev와 동일하게 설정하거나 별도 키 사용)
    firebaseApiKey: 'staging_firebase_api_key',
    weatherApiKey: 'staging_weather_api_key',
    kakaoMapApiKey: '464318d78ffeb1e52a1185498fe1af08',
    // ... 기타 설정
  },
  prod: {
    // Production 환경 설정 (TestFlight/App Store 대응 강화)
    firebaseApiKey: (Constants.expoConfig?.extra?.firebaseApiKey) || 
                   (Constants.manifest?.extra?.firebaseApiKey) || 
                   'AIzaSyDq24FyKrDTtomyNMcC3gZB7eqpr0OGZCg',
    firebaseAuthDomain: 'runon-production-app.firebaseapp.com',
    firebaseProjectId: 'runon-production-app',
    firebaseStorageBucket: 'runon-production-app.firebasestorage.app',
    firebaseMessagingSenderId: '936820129286',
    firebaseAppId: '1:936820129286:ios:1edd25b1f1cef603b14d87',
    
    // API 키들 - TestFlight에서 확실한 로딩을 위한 다중 fallback
    weatherApiKey: (Constants.expoConfig?.extra?.weatherApiKey) || 
                  (Constants.manifest?.extra?.weatherApiKey) || 
                  (Constants.expoConfig?.extra?.weatherApiKey) ||
                  'c1861b48c1786a9ff6a37560f3b8c63c',
    kakaoMapApiKey: '464318d78ffeb1e52a1185498fe1af08', // JavaScript 키 (웹뷰용)
    simulateHealthKitOnSimulator: false,
  }
};

// 현재 환경 감지 (TestFlight 대응 개선)
function getEnvVars(env = Constants.expoConfig?.releaseChannel) {
  // TestFlight 환경에서 Constants 로딩 상태 확인
  const hasConstants = Constants && Constants.expoConfig;
  const releaseChannel = env || Constants.releaseChannel;
  
  console.log('🌍 환경 감지:', {
    isDev: __DEV__,
    releaseChannel: releaseChannel,
    platform: Platform?.OS,
    hasExpoConfig: hasConstants,
    constantsKeys: hasConstants ? Object.keys(Constants.expoConfig) : 'N/A'
  });
  
  // TestFlight에서 API 키 로딩 상태 확인
  if (!__DEV__) {
    const selectedEnv = releaseChannel === 'staging' ? ENV.staging : ENV.prod;
    console.log('🔑 API 키 로딩 상태:', {
      weatherApiKey: selectedEnv.weatherApiKey ? '✅ 로드됨' : '❌ 실패',
      kakaoMapApiKey: selectedEnv.kakaoMapApiKey ? '✅ 로드됨' : '❌ 실패',
      firebaseApiKey: selectedEnv.firebaseApiKey ? '✅ 로드됨' : '❌ 실패'
    });
  }
  
  // __DEV__는 개발 모드일 때 true (Expo 개발 환경)
  if (__DEV__) {
    console.log('🌍 개발 환경 사용 (Expo)');
    return ENV.dev;
  } else if (releaseChannel === 'staging') {
    console.log('🌍 스테이징 환경 사용');
    return ENV.staging;
  } else {
    // TestFlight 및 프로덕션 환경
    console.log('🌍 프로덕션 환경 사용 (TestFlight/App Store)');
    return ENV.prod;
  }
}

export default getEnvVars(); 