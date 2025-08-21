import ENV from './environment';

// 날씨 API 설정
export const WEATHER_CONFIG = {
  // OpenWeatherMap API 키 (환경 변수에서 가져옴)
  API_KEY: ENV.weatherApiKey,
  
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