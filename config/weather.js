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