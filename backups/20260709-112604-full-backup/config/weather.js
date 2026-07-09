import ENV from './environment';

// 날씨 API 설정
export const WEATHER_CONFIG = {
  // OpenWeatherMap API 키 (환경 변수에서 가져옴, TestFlight 대응)
  API_KEY: ENV.weatherApiKey || 'c1861b48c1786a9ff6a37560f3b8c63c',
  
  // 기본 위치 (서울 한강공원)
  DEFAULT_LOCATION: {
    latitude: 37.5285,
    longitude: 126.9375,
    name: '서울 한강공원'
  },
  
  // API 설정
  API_BASE_URL: 'https://api.openweathermap.org/data/2.5',
  
  // 업데이트 간격 (30분)
  UPDATE_INTERVAL: 30 * 60 * 1000,
};

// 미세먼지 API 설정 (한국환경공단 에어코리아)
export const AIR_QUALITY_CONFIG = {
  // 한국환경공단 에어코리아 API 키
  API_KEY: '26d7b594660415a676a94c995fdeed91a2ab9c261fc3c2f33e163aabfd90943f',
  
  // API 설정
  API_BASE_URL: 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc',
  
  // 업데이트 간격 (1시간 - 한국환경공단 데이터 업데이트 주기)
  UPDATE_INTERVAL: 60 * 60 * 1000,
  
  // 서울시 코드 (시도별 실시간 측정정보 조회용)
  SEOUL_CODE: '서울',
};

// API 키 설정 함수 (개발 중에만 사용)
export const setWeatherApiKey = (apiKey) => {
  if (__DEV__) {
    WEATHER_CONFIG.API_KEY = apiKey;
    console.log('⚠️ 개발 모드에서만 API 키 변경 가능');
  } else {
    console.warn('⚠️ 프로덕션에서는 API 키를 변경할 수 없습니다.');
  }
};

// API 키 가져오기 함수
export const getWeatherApiKey = () => {
  return WEATHER_CONFIG.API_KEY;
};

// 날씨 알림 설정
export const WEATHER_ALERT_CONFIG = {
  // 기온 알림 임계값
  TEMPERATURE: {
    HIGH: 35, // 고온 경고 (35도 이상)
    LOW: -10, // 저온 경고 (-10도 이하)
  },
  
  // 강수량 알림 임계값 (mm/h)
  RAIN: {
    LIGHT: 5,    // 가벼운 비 (5mm/h 이상)
    MODERATE: 15, // 보통 비 (15mm/h 이상)
    HEAVY: 30,   // 강한 비 (30mm/h 이상)
  },
  
  // 바람 알림 임계값 (m/s)
  WIND: {
    STRONG: 10, // 강풍 (10m/s 이상)
  },
  
  // 습도 알림 임계값 (%)
  HUMIDITY: {
    HIGH: 90, // 고습도 (90% 이상)
  },
  
  // 미세먼지 알림 임계값 (PM10, μg/m³)
  AIR_QUALITY: {
    MODERATE: 55,  // 보통 (55 이상)
    UNHEALTHY: 150, // 나쁨 (150 이상)
    VERY_UNHEALTHY: 250, // 매우 나쁨 (250 이상)
  },
  
  // 한강 범람 위험 임계값
  FLOOD_RISK: {
    RAIN_THRESHOLD: 50, // 시간당 강수량 (mm/h)
    RIVER_LEVEL_THRESHOLD: 8.5, // 한강 수위 (m)
  }
};

// 미세먼지 알림 설정
export const AIR_QUALITY_ALERT_CONFIG = {
  // PM2.5 알림 임계값 (μg/m³)
  PM25: {
    GOOD: 15,        // 좋음 (15 이하)
    MODERATE: 35,    // 보통 (35 이하)
    UNHEALTHY: 75,   // 나쁨 (75 이하)
    VERY_UNHEALTHY: 150, // 매우 나쁨 (150 이하)
  },
  
  // PM10 알림 임계값 (μg/m³)
  PM10: {
    GOOD: 30,        // 좋음 (30 이하)
    MODERATE: 80,    // 보통 (80 이하)
    UNHEALTHY: 150,  // 나쁨 (150 이하)
    VERY_UNHEALTHY: 300, // 매우 나쁨 (300 이하)
  },
  
  // AQI (Air Quality Index) 임계값 (한국/EPA 기준)
  AQI: {
    GOOD: 50,        // 좋음 (0-50)
    MODERATE: 100,   // 보통 (51-100)
    UNHEALTHY: 150,  // 나쁨 (101-150)
    VERY_UNHEALTHY: 200, // 매우나쁨 (151-200)
    HAZARDOUS: 500   // 위험 (201+)
  }
}; 