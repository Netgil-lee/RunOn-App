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
import weatherAlertService from '../services/weatherAlertService';
import airQualityService from '../services/airQualityService';
import { useNotificationSettings } from '../contexts/NotificationSettingsContext';

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  SECONDARY: '#666666',
};

const WeatherCard = ({ onWeatherDataUpdate, isRefreshing = false }) => {
  const { isNotificationTypeEnabled, settings } = useNotificationSettings();
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [airQuality, setAirQuality] = useState(null);
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
        
        if (addresses && addresses.length > 0) {
          const address = addresses[0];
          // 동과 도로명 정보를 조합하여 주소 생성
          let locationName = '';
          
          // 동 정보 추출 (name에서 동 정보 가져오기)
          let dongName = '';
          let roadName = '';
          
          // name에서 동 정보 추출 (예: "역삼동" 형태)
          if (address.name) {
            if (address.name.includes('동')) {
              dongName = address.name;
            } else if (address.name.includes('가')) {
              dongName = address.name;
            }
          }
          
          // street에서 도로명 추출 (예: "강남대로" 형태)
          // street에 동 정보가 포함되어 있지 않은 경우만 도로명으로 사용
          if (address.street) {
            const streetText = address.street;
            // street에 동 정보가 포함되어 있지 않은 경우만 도로명으로 사용
            if (!streetText.includes('동') && !streetText.includes('가')) {
              roadName = streetText;
            } else if (!dongName) {
              // 동 정보가 아직 없고 street에 동 정보가 있는 경우
              if (streetText.includes('동')) {
                dongName = streetText;
              } else if (streetText.includes('가')) {
                dongName = streetText;
              }
            }
          }
          
          // 동과 도로명 조합 (중복 제거)
          if (dongName && roadName) {
            // "현재위치 - 역삼동 강남대로" 형태로 표시
            locationName = `현재위치 - ${dongName} ${roadName}`;
          } else if (dongName) {
            // 동만 있는 경우
            locationName = `현재위치 - ${dongName}`;
          } else if (roadName) {
            // 도로명만 있는 경우
            locationName = `현재위치 - ${roadName}`;
          } else {
            // 주소 정보가 없는 경우
            locationName = '현재위치';
          }

          setLocation({
            latitude,
            longitude,
            name: locationName
          });
        } else {
          // 주소 변환 결과가 없는 경우
          setLocation({
            latitude,
            longitude,
            name: '현재위치'
          });
        }

        return { latitude, longitude };
      } catch (geocodeError) {
        console.warn('주소 변환 실패:', geocodeError);
        setLocation({
          latitude,
          longitude,
          name: '현재위치'
        });
        return { latitude, longitude };
      }
    } catch (error) {
      // 지도탭(MapScreen)에서만 로그 표시 - WeatherCard는 HomeScreen에서 사용 (로그 생략)
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

      // 현재 날씨, 예보 데이터를 먼저 가져오기
      const [currentResponse, forecastResponse] = await Promise.all([
        fetch(
          `${WEATHER_CONFIG.API_BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=kr`
        ),
        fetch(
          `${WEATHER_CONFIG.API_BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=kr`
        )
      ]);

      // 미세먼지 데이터는 별도로 처리 (실패해도 날씨는 표시)
      let airQualityData = null;
      try {
        airQualityData = await airQualityService.fetchAirQuality(latitude, longitude);
      } catch (airQualityError) {
        console.warn('미세먼지 데이터 로딩 실패:', airQualityError.message);
        // 미세먼지 데이터 실패는 무시하고 계속 진행
      }

      if (!currentResponse.ok || !forecastResponse.ok) {
        const currentErrorText = await currentResponse.text();
        const forecastErrorText = await forecastResponse.text();
        console.error('날씨 API 응답 오류:', {
          current: { status: currentResponse.status, text: currentErrorText },
          forecast: { status: forecastResponse.status, text: forecastErrorText }
        });
        throw new Error('날씨 데이터를 가져올 수 없습니다.');
      }

      let currentData, forecastData;
      try {
        const currentText = await currentResponse.text();
        const forecastText = await forecastResponse.text();
        
        currentData = JSON.parse(currentText);
        forecastData = JSON.parse(forecastText);
      } catch (parseError) {
        throw new Error('날씨 API 응답 형식이 올바르지 않습니다.');
      }
      
      // 현재 날씨 설정
      const currentWeather = {
        temperature: Math.round(currentData.main.temp),
        feelsLike: Math.round(currentData.main.feels_like),
        humidity: currentData.main.humidity,
        description: getWeatherDescription(currentData.weather[0].id),
        condition: currentData.weather[0].main.toLowerCase(), // 날씨 조건 추가
        icon: getWeatherIcon(currentData.weather[0].id),
        windSpeed: Math.round(currentData.wind.speed),
        rainVolume: currentData.rain ? currentData.rain['1h'] || 0 : 0, // 현재 강수량 추가
        precipitationProbability: Math.round((forecastData.list[0]?.pop || 0) * 100), // 강수확률 추가
      };

      setWeather(currentWeather);
      setAirQuality(airQualityData || null);
      
      // 부모 컴포넌트에 날씨 데이터 전달
      if (onWeatherDataUpdate) {
        onWeatherDataUpdate(currentWeather);
      }

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

      // 날씨 알림 확인
      const weatherAlerts = await weatherAlertService.checkAllAlerts(currentWeather, {
        latitude,
        longitude,
        name: location.name
      });

      // 미세먼지 알림 확인 (데이터가 있을 때만)
      const airQualityAlerts = airQualityData ? airQualityService.checkAirQualityAlerts(airQualityData) : [];

      // 모든 알림을 합쳐서 표시
      const allAlerts = [...weatherAlerts, ...airQualityAlerts];

      // 알림이 있으면 표시 (사용자 알림 설정 확인)
      if (allAlerts.length > 0) {
        allAlerts.forEach(alert => {
          // 날씨 알림 설정 확인
          const isEnabled = isNotificationTypeEnabled(alert.type);
          
          // 디버깅 로그
          console.log(`🔔 날씨 알림 체크:`, {
            type: alert.type,
            title: alert.title,
            isEnabled: isEnabled,
            weatherAlertSetting: settings?.notifications?.weatherAlert
          });
          
          if (isEnabled) {
            Alert.alert(
              alert.title,
              alert.message,
              [
                { text: '확인', style: 'default' },
                { text: '알림 설정', onPress: () => {
                  // 알림 설정 화면으로 이동하는 로직 추가 가능
                  console.log('알림 설정으로 이동');
                }}
              ]
            );
          } else {
            console.log(`📵 날씨 알림이 OFF되어 있어 표시하지 않음: ${alert.type}`);
          }
        });
      }

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

  // 새로고침 시 날씨 데이터 다시 가져오기
  useEffect(() => {
    if (isRefreshing) {
      console.log('🌤️ 날씨 데이터 새로고침 시작');
      fetchWeather();
    }
  }, [isRefreshing]);

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
        <Ionicons name="location" size={16} color={COLORS.TEXT} />
        <Text style={styles.locationText}>{location.name}</Text>
      </View>
      
      {/* 날씨 섹션 */}
      <View style={styles.weatherSection}>
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

      {/* 미세먼지 섹션 */}
      <View style={styles.airQualitySection}>
        <View style={styles.sectionDivider} />
        
        {airQuality ? (
          <View style={styles.airQualityInfo}>
            {/* 대기질 지수 - 수치 + 프로그레스바 */}
            <View style={styles.aqiMainContainer}>
              <View style={styles.aqiInfo}>
                <View style={styles.aqiLabelRow}>
                  <Text style={styles.aqiLabel}>대기질 지수</Text>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>
                      {airQualityService.getRecommendation(airQuality.aqiLevel)}
                    </Text>
                  </View>
                </View>
                <View style={styles.aqiValueRow}>
                  <Text style={styles.aqiValue}>
                    {airQuality.aqi}
                  </Text>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <View 
                        style={[
                          styles.progressBarFill, 
                          { 
                            width: `${Math.min((airQuality.aqi / 500) * 100, 100)}%`,
                            backgroundColor: COLORS.PRIMARY
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressBarLabel}>0 - 500</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 3x1 그리드 - 미세먼지, 초미세먼지, 건강영향 수준 */}
            <View style={styles.airQualityGrid}>
              {/* 미세먼지 농도 */}
              <View style={styles.gridItem}>
                <Text style={styles.gridItemLabel}>미세먼지</Text>
                <View style={styles.gridItemValueContainer}>
                  <Text style={styles.gridItemValue}>
                    {airQuality.pm10}
                  </Text>
                  <Text style={styles.gridItemUnit}>μg/m³</Text>
                </View>
              </View>

              <View style={styles.gridDivider} />

              {/* 초미세먼지 농도 */}
              <View style={styles.gridItem}>
                <Text style={styles.gridItemLabel}>초미세먼지</Text>
                <View style={styles.gridItemValueContainer}>
                  <Text style={styles.gridItemValue}>
                    {airQuality.pm25}
                  </Text>
                  <Text style={styles.gridItemUnit}>μg/m³</Text>
                </View>
              </View>

              <View style={styles.gridDivider} />

              {/* 건강 영향 수준 */}
              <View style={styles.gridItem}>
                <Text style={styles.gridItemLabel}>건강 영향</Text>
                <View style={styles.gridItemValueContainer}>
                  <Text style={[styles.gridItemValue, styles.healthImpactValue]}>
                    {airQualityService.getLevelDescription(airQuality.aqiLevel)}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* 출처 표기 */}
            <View style={styles.sourceContainer}>
              <Text style={styles.sourceText}>출처 : 환경부/한국환경공단</Text>
            </View>
          </View>
        ) : (
          /* 네트워크 오류 시 표시할 화면 */
          <View style={styles.airQualityErrorContainer}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="cloud-offline-outline" size={32} color={COLORS.SECONDARY} />
            </View>
            <Text style={styles.errorTitle}>대기질 정보를 불러올 수 없습니다</Text>
            <Text style={styles.errorMessage}>
              데이터는 실시간 관측된 자료이며 측정소 현지 사정이나{'\n'}
              데이터의 수신상태에 따라 미수신될 수 있음
            </Text>
            <View style={styles.errorSourceContainer}>
              <Text style={styles.errorSourceText}>출처 : 환경부/한국환경공단</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    padding: 16,
    paddingBottom: 12,
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
    fontFamily: 'Pretendard-Medium',
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
    fontFamily: 'Pretendard-Bold',
  },
  description: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    marginTop: 2,
    fontFamily: 'Pretendard',
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
    color: COLORS.TEXT,
    marginTop: 2,
  },

  detailText: {
    fontSize: 15,
    color: COLORS.TEXT,
    marginTop: 12,
    fontFamily: 'Pretendard',
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
  // 날씨 섹션 스타일
  weatherSection: {
    marginBottom: 8,
  },
  // 미세먼지 섹션 스타일
  airQualitySection: {
    marginTop: 8,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.SURFACE,
    marginVertical: 12,
  },
  airQualityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    color: COLORS.TEXT,
    marginLeft: 6,
    fontWeight: '500',
    fontFamily: 'Pretendard-Medium',
  },
  airQualityInfo: {
    flexDirection: 'column',
  },
  // 대기질 지수 메인 컨테이너
  aqiMainContainer: {
    paddingVertical: 2,
    marginBottom: 8,
  },
  aqiInfo: {
    flex: 1,
  },
  aqiLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  aqiLabel: {
    fontSize: 14,
    color: COLORS.TEXT,
    fontFamily: 'Pretendard',
  },
  aqiValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  aqiValue: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Pretendard-Bold',
    marginRight: 12,
    color: COLORS.TEXT,
  },
  aqiLevel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  // 프로그레스바 스타일
  progressBarContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 16,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBarLabel: {
    fontSize: 10,
    color: COLORS.SECONDARY,
    fontFamily: 'Pretendard',
  },
  // 3x1 그리드 스타일
  airQualityGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 4,
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  gridDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#3A3A3A',
  },
  gridItemLabel: {
    fontSize: 15,
    color: COLORS.TEXT,
    fontWeight: '400',
    fontFamily: 'Pretendard',
    marginBottom: 6,
    textAlign: 'center',
  },
  gridItemValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemValue: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Pretendard-Bold',
    marginBottom: 0,
    textAlign: 'center',
    color: COLORS.TEXT,
  },
  healthImpactValue: {
    textAlign: 'center',
  },
  gridItemUnit: {
    fontSize: 12,
    color: COLORS.SECONDARY,
    fontFamily: 'Pretendard',
    textAlign: 'center',
    marginLeft: 4,
  },
  // 태그 스타일 (모임카드와 동일)
  tagContainer: {
    marginTop: 6,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#1C3336',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: '500',
    fontFamily: 'Pretendard-Medium',
  },
  // 출처 표기 스타일
  sourceContainer: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
  },
  sourceText: {
    fontSize: 11,
    color: COLORS.SECONDARY,
    fontFamily: 'Pretendard',
    fontWeight: '400',
  },
  // 오류 화면 스타일
  airQualityErrorContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  errorIconContainer: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 16,
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 13,
    color: COLORS.SECONDARY,
    fontFamily: 'Pretendard',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  errorSourceContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.SURFACE,
    width: '100%',
    alignItems: 'center',
  },
  errorSourceText: {
    fontSize: 11,
    color: COLORS.SECONDARY,
    fontFamily: 'Pretendard',
    fontWeight: '400',
  },
});

export default WeatherCard; 