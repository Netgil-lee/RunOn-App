import { WEATHER_CONFIG, WEATHER_ALERT_CONFIG } from '../config/weather';

class WeatherAlertService {
  constructor() {
    this.lastAlertTime = {}; // 마지막 알림 시간 추적
    this.alertCooldown = 30 * 60 * 1000; // 30분 쿨다운
  }

  // 날씨 데이터에서 알림 조건 확인
  checkWeatherAlerts(weatherData, location) {
    const alerts = [];

    // 기온 알림 확인
    if (weatherData.temperature >= WEATHER_ALERT_CONFIG.TEMPERATURE.HIGH) {
      alerts.push({
        type: 'temperature_high',
        title: '고온 주의보',
        message: `현재 기온이 ${weatherData.temperature}°C로 매우 높습니다. 러닝 시 탈수 증상을 주의하세요.`,
        severity: 'warning',
        icon: 'thermometer',
        timestamp: new Date().toISOString()
      });
    } else if (weatherData.temperature <= WEATHER_ALERT_CONFIG.TEMPERATURE.LOW) {
      alerts.push({
        type: 'temperature_low',
        title: '저온 주의보',
        message: `현재 기온이 ${weatherData.temperature}°C로 매우 낮습니다. 러닝 시 동상 위험을 주의하세요.`,
        severity: 'warning',
        icon: 'thermometer',
        timestamp: new Date().toISOString()
      });
    }

    // 강수량 알림 확인
    if (weatherData.rainVolume >= WEATHER_ALERT_CONFIG.RAIN.HEAVY) {
      alerts.push({
        type: 'rain_heavy',
        title: '강한 비 주의보',
        message: `시간당 강수량이 ${weatherData.rainVolume}mm로 매우 강합니다. 러닝을 중단하고 안전한 곳으로 이동하세요.`,
        severity: 'danger',
        icon: 'rainy',
        timestamp: new Date().toISOString()
      });
    } else if (weatherData.rainVolume >= WEATHER_ALERT_CONFIG.RAIN.MODERATE) {
      alerts.push({
        type: 'rain_moderate',
        title: '비 주의보',
        message: `시간당 강수량이 ${weatherData.rainVolume}mm로 보통 이상입니다. 러닝 시 미끄러짐에 주의하세요.`,
        severity: 'warning',
        icon: 'rainy',
        timestamp: new Date().toISOString()
      });
    }

    // 바람 알림 확인
    if (weatherData.windSpeed >= WEATHER_ALERT_CONFIG.WIND.STRONG) {
      alerts.push({
        type: 'wind_strong',
        title: '강풍 주의보',
        message: `풍속이 ${weatherData.windSpeed}m/s로 강합니다. 러닝 시 낙하물에 주의하세요.`,
        severity: 'warning',
        icon: 'airplane',
        timestamp: new Date().toISOString()
      });
    }

    // 습도 알림 확인
    if (weatherData.humidity >= WEATHER_ALERT_CONFIG.HUMIDITY.HIGH) {
      alerts.push({
        type: 'humidity_high',
        title: '고습도 주의보',
        message: `습도가 ${weatherData.humidity}%로 매우 높습니다. 러닝 시 체감 온도가 높아질 수 있습니다.`,
        severity: 'info',
        icon: 'water',
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  }

  // 미세먼지 알림 확인 (별도 API 필요)
  async checkAirQualityAlerts(latitude, longitude) {
    try {
      // OpenWeatherMap Air Pollution API 사용
      const response = await fetch(
        `${WEATHER_CONFIG.API_BASE_URL}/air_pollution?lat=${latitude}&lon=${longitude}&appid=${WEATHER_CONFIG.API_KEY}`
      );

      if (!response.ok) {
        throw new Error('미세먼지 데이터를 가져올 수 없습니다.');
      }

      const data = await response.json();
      const pm10 = data.list[0].components.pm10;
      const alerts = [];

      if (pm10 >= WEATHER_ALERT_CONFIG.AIR_QUALITY.VERY_UNHEALTHY) {
        alerts.push({
          type: 'air_very_unhealthy',
          title: '미세먼지 매우 나쁨',
          message: `PM10 농도가 ${pm10}μg/m³로 매우 높습니다. 실외 러닝을 중단하세요.`,
          severity: 'danger',
          icon: 'cloud',
          timestamp: new Date().toISOString()
        });
      } else if (pm10 >= WEATHER_ALERT_CONFIG.AIR_QUALITY.UNHEALTHY) {
        alerts.push({
          type: 'air_unhealthy',
          title: '미세먼지 나쁨',
          message: `PM10 농도가 ${pm10}μg/m³로 높습니다. 러닝 시간을 줄이거나 실내로 이동하세요.`,
          severity: 'warning',
          icon: 'cloud',
          timestamp: new Date().toISOString()
        });
      } else if (pm10 >= WEATHER_ALERT_CONFIG.AIR_QUALITY.MODERATE) {
        alerts.push({
          type: 'air_moderate',
          title: '미세먼지 보통',
          message: `PM10 농도가 ${pm10}μg/m³로 보통 수준입니다. 민감군은 주의하세요.`,
          severity: 'info',
          icon: 'cloud',
          timestamp: new Date().toISOString()
        });
      }

      return alerts;
    } catch (error) {
      console.error('미세먼지 알림 확인 실패:', error);
      return [];
    }
  }

  // 한강 범람 위험 알림 확인
  async checkFloodRiskAlerts(latitude, longitude, weatherData) {
    try {
      const alerts = [];

      // 강수량 기반 범람 위험 확인
      if (weatherData.rainVolume >= WEATHER_ALERT_CONFIG.FLOOD_RISK.RAIN_THRESHOLD) {
        alerts.push({
          type: 'flood_risk_rain',
          title: '한강 범람 위험 주의보',
          message: `시간당 강수량이 ${weatherData.rainVolume}mm로 매우 높습니다. 한강 주변 러닝을 중단하고 안전한 곳으로 이동하세요.`,
          severity: 'danger',
          icon: 'warning',
          timestamp: new Date().toISOString()
        });
      }

      // 한강 수위 정보 확인 (실제로는 별도 API 필요)
      // 여기서는 강수량만으로 판단
      if (weatherData.rainVolume >= WEATHER_ALERT_CONFIG.RAIN.MODERATE) {
        alerts.push({
          type: 'flood_warning',
          title: '한강 주변 주의보',
          message: '강수량이 증가하고 있습니다. 한강 주변 러닝 시 수위 변화에 주의하세요.',
          severity: 'warning',
          icon: 'water',
          timestamp: new Date().toISOString()
        });
      }

      return alerts;
    } catch (error) {
      console.error('범람 위험 알림 확인 실패:', error);
      return [];
    }
  }

  // 알림 중복 방지 (쿨다운 체크)
  shouldSendAlert(alertType) {
    const now = Date.now();
    const lastTime = this.lastAlertTime[alertType] || 0;
    
    if (now - lastTime > this.alertCooldown) {
      this.lastAlertTime[alertType] = now;
      return true;
    }
    return false;
  }

  // 모든 알림 확인
  async checkAllAlerts(weatherData, location) {
    const allAlerts = [];

    // 기본 날씨 알림
    const weatherAlerts = this.checkWeatherAlerts(weatherData, location);
    allAlerts.push(...weatherAlerts);

    // 미세먼지 알림
    const airQualityAlerts = await this.checkAirQualityAlerts(location.latitude, location.longitude);
    allAlerts.push(...airQualityAlerts);

    // 범람 위험 알림
    const floodAlerts = await this.checkFloodRiskAlerts(location.latitude, location.longitude, weatherData);
    allAlerts.push(...floodAlerts);

    // 쿨다운 체크 후 필터링
    return allAlerts.filter(alert => this.shouldSendAlert(alert.type));
  }
}

export default new WeatherAlertService(); 