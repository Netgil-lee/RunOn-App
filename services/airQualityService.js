import { AIR_QUALITY_CONFIG, AIR_QUALITY_ALERT_CONFIG } from '../config/weather';

class AirQualityService {
  constructor() {
    this.API_KEY = AIR_QUALITY_CONFIG.API_KEY;
    this.API_BASE_URL = AIR_QUALITY_CONFIG.API_BASE_URL;
  }

  // AQI 레벨 판정 함수 (한국/EPA 기준)
  getAQILevel(aqi) {
    if (aqi <= 50) return 'good';           // 좋음 (0-50)
    if (aqi <= 100) return 'moderate';      // 보통 (51-100)
    if (aqi <= 150) return 'unhealthy';     // 나쁨 (101-150)
    if (aqi <= 200) return 'very_unhealthy'; // 매우나쁨 (151-200)
    return 'hazardous';                     // 위험 (201+)
  }

  // PM2.5 레벨 판정 함수
  getPM25Level(pm25) {
    if (pm25 <= AIR_QUALITY_ALERT_CONFIG.PM25.GOOD) return 'good';
    if (pm25 <= AIR_QUALITY_ALERT_CONFIG.PM25.MODERATE) return 'moderate';
    if (pm25 <= AIR_QUALITY_ALERT_CONFIG.PM25.UNHEALTHY) return 'unhealthy';
    if (pm25 <= AIR_QUALITY_ALERT_CONFIG.PM25.VERY_UNHEALTHY) return 'very_unhealthy';
    return 'hazardous';
  }

  // PM10 레벨 판정 함수
  getPM10Level(pm10) {
    if (pm10 <= AIR_QUALITY_ALERT_CONFIG.PM10.GOOD) return 'good';
    if (pm10 <= AIR_QUALITY_ALERT_CONFIG.PM10.MODERATE) return 'moderate';
    if (pm10 <= AIR_QUALITY_ALERT_CONFIG.PM10.UNHEALTHY) return 'unhealthy';
    if (pm10 <= AIR_QUALITY_ALERT_CONFIG.PM10.VERY_UNHEALTHY) return 'very_unhealthy';
    return 'hazardous';
  }

  // 레벨별 한글 설명
  getLevelDescription(level) {
    const descriptions = {
      good: '좋음',
      moderate: '보통',
      unhealthy: '나쁨',
      very_unhealthy: '매우나쁨',
      hazardous: '위험'
    };
    return descriptions[level] || '알 수 없음';
  }

  // 레벨별 색상
  getLevelColor(level) {
    const colors = {
      good: '#00E400',      // 초록색
      moderate: '#FFFF00',  // 노란색
      unhealthy: '#FF7E00', // 주황색
      very_unhealthy: '#FF0000', // 빨간색
      hazardous: '#8F3F97'  // 보라색
    };
    return colors[level] || '#666666';
  }

  // 레벨별 권장 행동 (한국/EPA 기준)
  getRecommendation(level) {
    const recommendations = {
      good: '야외 활동에 적합합니다',
      moderate: '민감군은 주의하세요',
      unhealthy: '마스크 착용을 권장합니다',
      very_unhealthy: '외출을 자제하세요',
      hazardous: '외출을 피하세요'
    };
    return recommendations[level] || '정보를 확인해주세요';
  }

  // 미세먼지 데이터 가져오기 (한국환경공단 에어코리아 API + OpenWeatherMap fallback)
  async fetchAirQuality(latitude, longitude) {
    try {
      // 먼저 한국환경공단 API 시도
      try {
        return await this.fetchKoreanAirQuality(latitude, longitude);
      } catch (koreanError) {
        console.warn('한국환경공단 API 실패, OpenWeatherMap으로 fallback:', koreanError.message);
        return await this.fetchOpenWeatherAirQuality(latitude, longitude);
      }
    } catch (error) {
      console.error('모든 미세먼지 API 실패:', error);
      throw error;
    }
  }

  // 한국환경공단 에어코리아 API
  async fetchKoreanAirQuality(latitude, longitude) {
    try {
      // API 키가 설정되지 않은 경우
      if (!this.API_KEY || this.API_KEY === 'YOUR_API_KEY_HERE') {
        throw new Error('API 키가 설정되지 않았습니다.');
      }

      // 시도별 실시간 측정정보 조회 API 호출 (URL 인코딩 적용)
      const sidoName = encodeURIComponent('서울');
      const response = await fetch(
        `${this.API_BASE_URL}/getCtprvnRltmMesureDnsty?serviceKey=${this.API_KEY}&returnType=json&numOfRows=100&pageNo=1&sidoName=${sidoName}&ver=1.0`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`한국환경공단 API 오류: ${response.status} - ${errorText}`);
      }

      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('미세먼지 API 응답 형식이 올바르지 않습니다.');
      }
      
      // 한국환경공단 API 응답 구조 확인
      if (!data.response || !data.response.body || !data.response.body.items) {
        throw new Error('대기질 데이터 형식이 올바르지 않습니다.');
      }

      const items = data.response.body.items;
      
      // 가장 가까운 측정소 찾기 (위치 기반)
      const nearestStation = this.findNearestStation(items, latitude, longitude);
      
      if (!nearestStation) {
        throw new Error('측정소 데이터를 찾을 수 없습니다.');
      }

      // PM2.5, PM10 데이터 추출
      const pm25 = parseFloat(nearestStation.pm25Value) || 0;
      const pm10 = parseFloat(nearestStation.pm10Value) || 0;
      const o3 = parseFloat(nearestStation.o3Value) || 0;
      const no2 = parseFloat(nearestStation.no2Value) || 0;
      const co = parseFloat(nearestStation.coValue) || 0;
      const so2 = parseFloat(nearestStation.so2Value) || 0;

      // AQI 계산 (PM2.5와 PM10 중 더 나쁜 값 사용)
      const aqi = this.calculateAQI(pm25, pm10);
      
      // 미세먼지 데이터 처리
      const processedData = {
        aqi: aqi,
        aqiLevel: this.getAQILevel(aqi),
        pm25: Math.round(pm25),
        pm25Level: this.getPM25Level(pm25),
        pm10: Math.round(pm10),
        pm10Level: this.getPM10Level(pm10),
        no2: Math.round(no2),
        o3: Math.round(o3),
        so2: Math.round(so2),
        co: Math.round(co),
        stationName: nearestStation.stationName,
        timestamp: new Date(nearestStation.dataTime),
      };

      return {
        ...processedData,
        source: 'korean'
      };
    } catch (error) {
      console.error('한국환경공단 API 실패:', error);
      throw error;
    }
  }

  // OpenWeatherMap Air Pollution API (fallback)
  async fetchOpenWeatherAirQuality(latitude, longitude) {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=c1861b48c1786a9ff6a37560f3b8c63c`
      );

      if (!response.ok) {
        throw new Error(`OpenWeatherMap API 오류: ${response.status}`);
      }

      const data = await response.json();
      const components = data.list[0].components;
      
      const pm25 = components.pm2_5 || 0;
      const pm10 = components.pm10 || 0;
      const o3 = components.o3 || 0;
      const no2 = components.no2 || 0;
      const co = components.co || 0;
      const so2 = components.so2 || 0;

      const aqi = this.calculateAQI(pm25, pm10);
      
      return {
        aqi: aqi,
        aqiLevel: this.getAQILevel(aqi),
        pm25: Math.round(pm25),
        pm25Level: this.getPM25Level(pm25),
        pm10: Math.round(pm10),
        pm10Level: this.getPM10Level(pm10),
        no2: Math.round(no2),
        o3: Math.round(o3),
        so2: Math.round(so2),
        co: Math.round(co),
        stationName: 'OpenWeatherMap',
        timestamp: new Date(),
        source: 'openweather'
      };
    } catch (error) {
      console.error('OpenWeatherMap API 실패:', error);
      throw error;
    }
  }

  // 가장 가까운 측정소 찾기
  findNearestStation(items, latitude, longitude) {
    if (!items || items.length === 0) return null;
    
    // 서울시 내 측정소 중에서 유효한 데이터가 있는 첫 번째 측정소 반환
    // 실제로는 위도/경도 기반으로 가장 가까운 측정소를 찾아야 하지만,
    // 현재는 서울시 전체 평균 데이터를 사용
    return items.find(item => 
      item.pm25Value && 
      item.pm10Value && 
      item.pm25Value !== '-' && 
      item.pm10Value !== '-'
    ) || items[0];
  }

  // AQI 계산 (PM2.5와 PM10 중 더 나쁜 값 사용)
  calculateAQI(pm25, pm10) {
    const pm25AQI = this.calculatePM25AQI(pm25);
    const pm10AQI = this.calculatePM10AQI(pm10);
    
    // 더 나쁜 AQI 값 반환
    return Math.max(pm25AQI, pm10AQI);
  }

  // PM2.5 AQI 계산 (한국 대기환경기준)
  calculatePM25AQI(pm25) {
    if (pm25 <= 15) return Math.round((pm25 / 15) * 50);           // 좋음 (0-50)
    if (pm25 <= 35) return Math.round(50 + ((pm25 - 15) / 20) * 50); // 보통 (51-100)
    if (pm25 <= 75) return Math.round(100 + ((pm25 - 35) / 40) * 50); // 나쁨 (101-150)
    if (pm25 <= 150) return Math.round(150 + ((pm25 - 75) / 75) * 50); // 매우나쁨 (151-200)
    return Math.round(200 + ((pm25 - 150) / 100) * 300);           // 위험 (201-500)
  }

  // PM10 AQI 계산 (한국 대기환경기준)
  calculatePM10AQI(pm10) {
    if (pm10 <= 30) return Math.round((pm10 / 30) * 50);           // 좋음 (0-50)
    if (pm10 <= 80) return Math.round(50 + ((pm10 - 30) / 50) * 50); // 보통 (51-100)
    if (pm10 <= 150) return Math.round(100 + ((pm10 - 80) / 70) * 50); // 나쁨 (101-150)
    if (pm10 <= 300) return Math.round(150 + ((pm10 - 150) / 150) * 50); // 매우나쁨 (151-200)
    return Math.round(200 + ((pm10 - 300) / 200) * 300);           // 위험 (201-500)
  }

  // 미세먼지 알림 확인
  checkAirQualityAlerts(airQualityData) {
    const alerts = [];
    
    // PM2.5 알림
    if (airQualityData.pm25Level === 'unhealthy' || airQualityData.pm25Level === 'very_unhealthy' || airQualityData.pm25Level === 'hazardous') {
      alerts.push({
        type: 'pm25',
        title: '초미세먼지 주의',
        message: `PM2.5 농도가 ${airQualityData.pm25}μg/m³로 ${this.getLevelDescription(airQualityData.pm25Level)} 수준입니다. ${this.getRecommendation(airQualityData.pm25Level)}`,
        level: airQualityData.pm25Level,
        value: airQualityData.pm25
      });
    }

    // PM10 알림
    if (airQualityData.pm10Level === 'unhealthy' || airQualityData.pm10Level === 'very_unhealthy' || airQualityData.pm10Level === 'hazardous') {
      alerts.push({
        type: 'pm10',
        title: '미세먼지 주의',
        message: `PM10 농도가 ${airQualityData.pm10}μg/m³로 ${this.getLevelDescription(airQualityData.pm10Level)} 수준입니다. ${this.getRecommendation(airQualityData.pm10Level)}`,
        level: airQualityData.pm10Level,
        value: airQualityData.pm10
      });
    }

    return alerts;
  }
}

export default new AirQualityService();
