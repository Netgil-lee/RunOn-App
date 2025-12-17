import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import RouteMap from './RouteMap';

const RunningShareCard = forwardRef(({ 
  distance, 
  pace, 
  duration, 
  location, 
  calories,
  routeCoordinates // 이동경로 좌표 데이터
}, ref) => {
  // distance, pace, duration은 이미 포맷팅된 문자열로 받음
  // distance: "5.2km" 또는 "530m"
  // pace: "6:40/km"
  // duration: "34s" 또는 "54m 19s" 또는 "3h 21m"

  return (
    <View ref={ref} style={styles.container}>
      {/* 상단: 위치 정보 */}
      <View style={styles.locationSection}>
        <Text style={styles.spotLabel}>Place</Text>
        <Text style={styles.locationText}>
          {location}
        </Text>
      </View>

      {/* 중앙: 러닝 기록 */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{distance || '0m'}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Pace</Text>
          <Text style={styles.statValue}>{pace || '0:00/km'}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Time</Text>
          <Text style={styles.statValue}>{duration || '0s'}</Text>
        </View>
      </View>

      {/* 이동경로 (로고 위에 표시) - 항상 공간 할당 */}
      <View style={styles.routeContainer}>
        {routeCoordinates && routeCoordinates.length > 0 && (
          <RouteMap 
            coordinates={routeCoordinates} 
            width={170} 
            height={100} 
          />
        )}
      </View>

      {/* 하단: 로고 */}
      <View style={styles.logoSection}>
        <Image 
          source={require('../assets/images/runon-logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    minWidth: 300,
    width: 'auto',
    height: 'auto', // 고정 높이 제거
    backgroundColor: 'transparent', // 투명 배경으로 변경
    justifyContent: 'flex-start',
    alignItems: 'center',
    overflow: 'hidden', // 렌더링 문제 방지
    zIndex: 2, // checkerboardBackground 위에 오도록 설정
    paddingVertical: 20, // 여백 다시 늘림
  },
  locationSection: {
    alignItems: 'center',
    marginTop: 0,  
    marginBottom: 10, // location과 Distance 사이 여백 늘림
  },
  spotLabel: {
    fontSize: 12,
    color: '#ffffff',
    fontFamily: 'Gold-Regular',
    lineHeight: 12,
  },
  locationText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Gold-Regular',
    textAlign: 'center',
    lineHeight: 26,
  },
  statsSection: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0, // location과 Distance 사이 여백 조정
  },
  statItem: {
    alignItems: 'center',
    marginVertical: 8, // 각 항목 사이 여백을 적절하게 늘림
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    fontFamily: 'Gold-Regular',
    lineHeight: 12,
    marginBottom: 1,
  },
  statValue: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Gold-Regular',
    lineHeight: 28,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 0, // 로고 아래 여백 제거
  },
  logo: {
    width: 80,
    height: 40,
  },
  routeContainer: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
    width: 170,
    height: 80,
  },
});

RunningShareCard.displayName = 'RunningShareCard';

export default RunningShareCard;
