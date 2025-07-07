import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { WEATHER_CONFIG } from '../config/weather';

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  SECONDARY: '#666666',
};

const WeatherCard = () => {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    name: '위치 확인 중...'
  });

  const API_KEY = WEATHER_CONFIG.API_KEY;

  // 날씨 아이콘 매핑
  const getWeatherIcon = (weatherCode) => {
    if (weatherCode >= 200 && weatherCode < 300) return 'thunderstorm';
    if (weatherCode >= 300 && weatherCode < 400) return 'rainy';
    if (weatherCode >= 500 && weatherCode < 600) return 'rainy';
    if (weatherCode >= 600 && weatherCode < 700) return 'snow';
    if (weatherCode >= 700 && weatherCode < 800) return 'cloudy';
    if (weatherCode === 800) return 'sunny';
    if (weatherCode >= 801 && weatherCode < 900) return 'partly-sunny';
    return 'partly-sunny';
  };

  // 강수량 아이콘 매핑 (간단한 버전)
  const getRainIcon = (rainVolume) => {
    if (rainVolume === 0) return 'sunny';
    if (rainVolume < 1) return 'rainy-outline';
    if (rainVolume < 3) return 'rainy';
    return 'thunderstorm';
  };

  // 날씨 상태 한글 변환
  const getWeatherDescription = (weatherCode) => {
    if (weatherCode >= 200 && weatherCode < 300) return '천둥번개';
    if (weatherCode >= 300 && weatherCode < 400) return '가벼운 비';
    if (weatherCode >= 500 && weatherCode < 600) return '비';
    if (weatherCode >= 600 && weatherCode < 700) return '눈';
    if (weatherCode >= 700 && weatherCode < 800) return '안개';
    if (weatherCode === 800) return '맑음';
    if (weatherCode >= 801 && weatherCode < 900) return '구름';
    return '구름';
  };

  // 시간 포맷팅 (HH시)
  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return `${date.getHours()}시`;
  };

  // 현재 위치 가져오기
  const getCurrentLocation = async () => {
    try {
      // 위치 권한 요청
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('위치 권한이 거부되었습니다.');
      }

      // 현재 위치 가져오기
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = currentLocation.coords;

      // 역 지오코딩으로 주소 가져오기
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude,
          longitude
        });
        
        const address = addresses[0];
        const locationName = '현재 내위치';

        setLocation({
          latitude,
          longitude,
          name: locationName
        });

        return { latitude, longitude };
      } catch (geocodeError) {
        console.warn('주소 변환 실패:', geocodeError);
        setLocation({
          latitude,
          longitude,
          name: '현재 내위치'
        });
        return { latitude, longitude };
      }
    } catch (error) {
      console.error('위치 가져오기 실패:', error);
      // 권한이 거부되었거나 위치를 가져올 수 없는 경우 기본 위치 사용
      const defaultLocation = WEATHER_CONFIG.DEFAULT_LOCATION;
      setLocation({
        latitude: defaultLocation.latitude,
        longitude: defaultLocation.longitude,
        name: defaultLocation.name + ' (기본위치)'
      });
      return {
        latitude: defaultLocation.latitude,
        longitude: defaultLocation.longitude
      };
    }
  };

  // 날씨 데이터 가져오기
  const fetchWeather = async (coords = null) => {
    try {
      setLoading(true);
      setError(null);

      // API 키가 설정되지 않은 경우
      if (API_KEY === 'YOUR_API_KEY_HERE') {
        throw new Error('API 키가 설정되지 않았습니다.');
      }

      // 좌표가 없으면 현재 위치 가져오기
      let { latitude, longitude } = coords || await getCurrentLocation();

      // 현재 날씨와 예보 데이터를 병렬로 가져오기
      const [currentResponse, forecastResponse] = await Promise.all([
        fetch(
          `${WEATHER_CONFIG.API_BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=kr`
        ),
        fetch(
          `${WEATHER_CONFIG.API_BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=kr`
        )
      ]);

      if (!currentResponse.ok || !forecastResponse.ok) {
        throw new Error('날씨 데이터를 가져올 수 없습니다.');
      }

      const currentData = await currentResponse.json();
      const forecastData = await forecastResponse.json();
      
      // 현재 날씨 설정
      setWeather({
        temperature: Math.round(currentData.main.temp),
        feelsLike: Math.round(currentData.main.feels_like),
        humidity: currentData.main.humidity,
        description: getWeatherDescription(currentData.weather[0].id),
        icon: getWeatherIcon(currentData.weather[0].id),
        windSpeed: Math.round(currentData.wind.speed),
      });

      // 향후 6시간의 예보 데이터 처리 (2시간 간격으로 4개)
      const next6Hours = forecastData.list.slice(0, 6).map(item => ({
        time: formatTime(item.dt),
        rainVolume: item.rain ? item.rain['3h'] || 0 : 0,
        rainProbability: Math.round((item.pop || 0) * 100),
        icon: getRainIcon(item.rain ? item.rain['3h'] || 0 : 0),
      }));
      
      // 2시간 간격으로 4개만 선택 (0, 1, 2, 3번째 인덱스 - 0, 3, 6, 9시간 후)
      const next4Hours = [next6Hours[0], next6Hours[1], next6Hours[2], next6Hours[3]];

      setForecast(next4Hours);
    } catch (err) {
      console.error('날씨 데이터 가져오기 실패:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    
    // 설정된 간격마다 날씨 데이터 업데이트
    const interval = setInterval(() => {
      // 기존 위치 정보가 있으면 그것을 사용, 없으면 다시 위치 가져오기
      if (location.latitude && location.longitude) {
        fetchWeather({ latitude: location.latitude, longitude: location.longitude });
      } else {
        fetchWeather();
      }
    }, WEATHER_CONFIG.UPDATE_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>날씨 정보 로딩 중...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={24} color={COLORS.SECONDARY} />
          <Text style={styles.errorText}>
            {error === 'API 키가 설정되지 않았습니다.' 
              ? 'API 키를 설정해주세요' 
              : '날씨 정보를 불러올 수 없습니다'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="location" size={16} color={COLORS.PRIMARY} />
        <Text style={styles.locationText}>{location.name}</Text>
      </View>
      
      <View style={styles.weatherInfo}>
        <View style={styles.leftSection}>
          <View style={styles.mainWeather}>
            <Ionicons 
              name={weather.icon} 
              size={32} 
              color={COLORS.PRIMARY} 
            />
            <View style={styles.temperatureContainer}>
              <Text style={styles.temperature}>{weather.temperature}°C</Text>
              <Text style={styles.description}>{weather.description}</Text>
            </View>
          </View>
          
          <Text style={styles.detailText}>
            체감 {weather.feelsLike}°C • 습도 {weather.humidity}%
          </Text>
        </View>
        
        <View style={styles.forecastContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.forecastScroll}
          >
            {forecast.map((item, index) => (
              <View key={index} style={styles.forecastItem}>
                <Text style={styles.forecastTime}>{item.time}</Text>
                <Ionicons 
                  name={item.icon} 
                  size={20} 
                  color={item.rainVolume > 0 ? COLORS.PRIMARY : COLORS.SECONDARY} 
                />
                <Text style={styles.forecastRain}>
                  {item.rainProbability}%
                </Text>
                {item.rainVolume > 0 && (
                  <Text style={styles.forecastVolume}>
                    {item.rainVolume.toFixed(1)}mm
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 0,
    marginTop: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.TEXT,
    marginLeft: 6,
    fontWeight: '500',
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftSection: {
    flex: 0,
  },
  mainWeather: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  temperatureContainer: {
    marginLeft: 12,
  },
  temperature: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  description: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    marginTop: 2,
  },
  forecastContainer: {
    flex: 1,
    marginLeft: 40,
  },
  forecastScroll: {
    maxHeight: 100,
  },
  forecastItem: {
    alignItems: 'center',
    marginRight: 12,
    minWidth: 40,
  },
  forecastTime: {
    fontSize: 12,
    color: COLORS.TEXT,
    marginBottom: 6,
  },
  forecastRain: {
    fontSize: 12,
    color: COLORS.TEXT,
    marginTop: 4,
    fontWeight: '500',
  },
  forecastVolume: {
    fontSize: 10,
    color: COLORS.PRIMARY,
    marginTop: 2,
  },

  detailText: {
    fontSize: 15,
    color: COLORS.TEXT,
    marginTop: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    marginLeft: 8,
  },
});

export default WeatherCard; 