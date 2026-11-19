import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import airQualityService from '../services/airQualityService';

// NetGill 디자인 시스템
import { useTheme } from '../contexts/ThemeContext';

/**
 * 날씨 상세 카드 (표시 전용)
 *
 * 데이터 조회는 hooks/useHomeWeather 가 맡고, 이 컴포넌트는 받은 값을 그리기만 한다.
 * 홈 상단바 칩을 누르면 뜨는 날씨 상세 시트 안에서 사용한다.
 */
const WeatherCard = ({ weather, forecast = [], airQuality, alerts = [], locationName, loading, error }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (loading && !weather) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.PRIMARY} />
          <Text style={styles.loadingText}>날씨 정보 로딩 중...</Text>
        </View>
      </View>
    );
  }

  if (error && !weather) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={24} color={colors.TEXT_SECONDARY} />
          <Text style={styles.errorText}>
            날씨 정보를 불러올 수 없습니다
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="location" size={16} color={colors.TEXT} />
        <Text style={styles.locationText}>{locationName}</Text>
      </View>

      {/* 날씨·대기질 경보 */}
      {alerts.map((alert) => (
        <View key={alert.type} style={styles.alertRow}>
          <Ionicons name="warning" size={16} color={colors.WARNING} />
          <View style={styles.alertTextBox}>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            <Text style={styles.alertMessage}>{alert.message}</Text>
          </View>
        </View>
      ))}
      
      {/* 날씨 섹션 */}
      <View style={styles.weatherSection}>
        <View style={styles.weatherInfo}>
          <View style={styles.leftSection}>
            <View style={styles.mainWeather}>
              <Ionicons 
                name={weather.icon} 
                size={32} 
                color={colors.PRIMARY} 
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
                    color={item.rainVolume > 0 ? colors.PRIMARY : colors.TEXT_SECONDARY} 
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
                            backgroundColor: colors.PRIMARY
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
              <Ionicons name="cloud-offline-outline" size={32} color={colors.TEXT_SECONDARY} />
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

const createStyles = (colors) => StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 12,
  },
  alertRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: colors.CARD,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.BORDER,
  },
  alertTextBox: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontFamily: 'Pretendard-SemiBold',
    color: colors.TEXT,
  },
  alertMessage: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Pretendard-Regular',
    color: colors.TEXT_SECONDARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: colors.TEXT,
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
    color: colors.TEXT,
    fontFamily: 'Pretendard-Bold',
  },
  description: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
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
    color: colors.TEXT,
    marginBottom: 6,
  },
  forecastRain: {
    fontSize: 12,
    color: colors.TEXT,
    marginTop: 4,
    fontWeight: '500',
  },
  forecastVolume: {
    fontSize: 10,
    color: colors.TEXT,
    marginTop: 2,
  },

  detailText: {
    fontSize: 15,
    color: colors.TEXT,
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
    color: colors.TEXT_SECONDARY,
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
    color: colors.TEXT_SECONDARY,
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
    backgroundColor: colors.SURFACE,
    marginVertical: 12,
  },
  airQualityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    color: colors.TEXT,
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
    color: colors.TEXT,
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
    color: colors.TEXT,
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
    backgroundColor: colors.SURFACE,
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
    color: colors.TEXT_SECONDARY,
    fontFamily: 'Pretendard',
  },
  // 3x1 그리드 스타일
  airQualityGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.BACKGROUND,
    borderRadius: 3,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.BORDER,
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
    backgroundColor: colors.BORDER,
  },
  gridItemLabel: {
    fontSize: 15,
    color: colors.TEXT,
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
    color: colors.TEXT,
  },
  healthImpactValue: {
    textAlign: 'center',
  },
  gridItemUnit: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
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
    backgroundColor: colors.SURFACE,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    color: colors.PRIMARY,
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
    color: colors.TEXT_SECONDARY,
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
    color: colors.TEXT,
    fontFamily: 'Pretendard-SemiBold',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 13,
    color: colors.TEXT_SECONDARY,
    fontFamily: 'Pretendard',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  errorSourceContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.SURFACE,
    width: '100%',
    alignItems: 'center',
  },
  errorSourceText: {
    fontSize: 11,
    color: colors.TEXT_SECONDARY,
    fontFamily: 'Pretendard',
    fontWeight: '400',
  },
});

export default WeatherCard; 