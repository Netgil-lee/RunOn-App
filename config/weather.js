// 날씨 API 설정
export const WEATHER_CONFIG = {
  // OpenWeatherMap API 키
  // 1. https://openweathermap.org/ 에서 무료 계정 생성
  // 2. "My API keys"에서 API 키 확인
  // 3. 아래에 실제 API 키를 입력하세요
  // 4. API 키 활성화까지 2-3시간 소요될 수 있습니다
  API_KEY: 'c1861b48c1786a9ff6a37560f3b8c63c',
  
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

// API 키 설정 함수
export const setWeatherApiKey = (apiKey) => {
  WEATHER_CONFIG.API_KEY = apiKey;
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