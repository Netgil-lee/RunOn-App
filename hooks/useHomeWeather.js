import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { WEATHER_CONFIG } from '../config/weather';
import weatherAlertService from '../services/weatherAlertService';
import airQualityService from '../services/airQualityService';

/**
 * 홈 화면 날씨 데이터 훅
 *
 * 현재 위치 → 날씨·시간별 예보·대기질을 한 번에 불러온다.
 * 상단바 칩과 날씨 상세 시트가 이 결과를 함께 쓰므로 조회는 한 번만 일어난다.
 * (예전에는 WeatherCard 안에 조회 로직이 들어 있었다)
 */

// OpenWeather 날씨 코드 → Ionicons 이름
const getWeatherIcon = (code) => {
  if (code >= 200 && code < 300) return 'thunderstorm';
  if (code >= 300 && code < 600) return 'rainy';
  if (code >= 600 && code < 700) return 'snow';
  if (code >= 700 && code < 800) return 'cloudy';
  if (code === 800) return 'sunny';
  return 'partly-sunny';
};

// OpenWeather 날씨 코드 → 한글 설명
const getWeatherDescription = (code) => {
  if (code >= 200 && code < 300) return '천둥번개';
  if (code >= 300 && code < 400) return '가벼운 비';
  if (code >= 500 && code < 600) return '비';
  if (code >= 600 && code < 700) return '눈';
  if (code >= 700 && code < 800) return '안개';
  if (code === 800) return '맑음';
  return '구름';
};

const getRainIcon = (rainVolume) => {
  if (rainVolume === 0) return 'sunny';
  if (rainVolume < 1) return 'rainy-outline';
  if (rainVolume < 3) return 'rainy';
  return 'thunderstorm';
};

const formatHour = (timestamp) => `${new Date(timestamp * 1000).getHours()}시`;

// '반포동 20-43' → '반포동', '종로1가' → '종로1가'. 동 단위 이름이 없으면 null
const DONG_PATTERN = /([가-힣]+\d*동|[가-힣]+\d+가|[가-힣]+(?:읍|면))(?=\s|$)/;
const extractDong = (text) => (typeof text === 'string' ? text.match(DONG_PATTERN)?.[1] || null : null);

// 역지오코딩 결과에서 상단바에 보여줄 '동' 이름을 고른다 (예: '반포동').
// iOS는 보통 district 에 동 이름이 들어오고, 없으면 name·street 에서 찾는다.
export const pickLocationName = (address) => {
  if (!address) return '현재 위치';
  const dong = extractDong(address.district) || extractDong(address.name) || extractDong(address.street);
  return dong || address.district || address.subregion || address.city || '현재 위치';
};

// 현재 위치와 표시 이름. 권한이 없거나 실패하면 기본 위치(서울 한강공원)를 쓴다.
const resolveLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('위치 권한이 거부되었습니다.');

    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = current.coords;

    let name = '현재 위치';
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      name = pickLocationName(addresses?.[0]);
    } catch (geocodeError) {
      console.warn('주소 변환 실패:', geocodeError);
    }
    return { latitude, longitude, name };
  } catch (error) {
    console.warn('위치 가져오기 실패, 기본 위치 사용:', error?.message || error);
    const fallback = WEATHER_CONFIG.DEFAULT_LOCATION;
    return { latitude: fallback.latitude, longitude: fallback.longitude, name: fallback.name };
  }
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('날씨 데이터를 가져올 수 없습니다.');
  return response.json();
};

const useHomeWeather = () => {
  const [state, setState] = useState({
    weather: null,
    coords: null,
    forecast: [],
    airQuality: null,
    alerts: [],
    locationName: '위치 확인 중',
    loading: true,
    error: null,
  });
  const coordsRef = useRef(null);
  const mountedRef = useRef(true);

  /**
   * @param {boolean} relocate - true면 현재 위치부터 다시 잡는다
   */
  const load = useCallback(async (relocate = true) => {
    try {
      let location = coordsRef.current;
      if (relocate || !location) {
        location = await resolveLocation();
        coordsRef.current = location;
      }
      const { latitude, longitude, name } = location;
      const base = WEATHER_CONFIG.API_BASE_URL;
      const params = `lat=${latitude}&lon=${longitude}&appid=${WEATHER_CONFIG.API_KEY}&units=metric&lang=kr`;

      const [currentData, forecastData, airQuality] = await Promise.all([
        fetchJson(`${base}/weather?${params}`),
        fetchJson(`${base}/forecast?${params}`),
        // 대기질은 실패해도 날씨는 보여준다
        airQualityService.fetchAirQuality(latitude, longitude).catch((error) => {
          console.warn('미세먼지 데이터 로딩 실패:', error?.message || error);
          return null;
        }),
      ]);

      const weatherCode = currentData.weather[0].id;
      const weather = {
        temperature: Math.round(currentData.main.temp),
        feelsLike: Math.round(currentData.main.feels_like),
        humidity: currentData.main.humidity,
        description: getWeatherDescription(weatherCode),
        condition: currentData.weather[0].main.toLowerCase(),
        icon: getWeatherIcon(weatherCode),
        windSpeed: Math.round(currentData.wind.speed),
        rainVolume: currentData.rain ? currentData.rain['1h'] || 0 : 0,
        precipitationProbability: Math.round((forecastData.list[0]?.pop || 0) * 100),
      };

      // 앞으로의 예보 4칸 (3시간 간격)
      const forecast = forecastData.list.slice(0, 4).map((item) => {
        const rainVolume = item.rain ? item.rain['3h'] || 0 : 0;
        return {
          time: formatHour(item.dt),
          rainVolume,
          rainProbability: Math.round((item.pop || 0) * 100),
          icon: getRainIcon(rainVolume),
        };
      });

      // 경보는 팝업으로 띄우지 않고 목록으로만 돌려준다 (상세 시트에서 표시)
      const alerts = [
        ...weatherAlertService.checkWeatherAlerts(weather, location),
        ...(await weatherAlertService.checkFloodRiskAlerts(latitude, longitude, weather)),
        ...(airQuality ? airQualityService.checkAirQualityAlerts(airQuality) : []),
      ];

      if (!mountedRef.current) return;
      setState({ weather, coords: { latitude, longitude }, forecast, airQuality, alerts, locationName: name, loading: false, error: null });
    } catch (error) {
      console.error('날씨 데이터 가져오기 실패:', error);
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        coords: coordsRef.current
          ? { latitude: coordsRef.current.latitude, longitude: coordsRef.current.longitude }
          : prev.coords,
        locationName: coordsRef.current?.name || prev.locationName,
        loading: false,
        error: error?.message || '날씨 정보를 불러올 수 없습니다',
      }));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load(true);
    // 주기 갱신은 이미 잡아둔 위치를 그대로 쓴다
    const interval = setInterval(() => load(false), WEATHER_CONFIG.UPDATE_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [load]);

  // 위치부터 다시 잡아 새로 불러온다 (지역명 탭, 당겨서 새로고침)
  const refresh = useCallback(() => load(true), [load]);

  return { ...state, refresh };
};

export default useHomeWeather;
