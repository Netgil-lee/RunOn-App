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
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters) => {
    const km = meters / 1000;
    return `${km.toFixed(1)}km`;
  };

  return (
    <View ref={ref} style={styles.container}>
      {/* 상단: 위치 정보 */}
      <View style={styles.locationSection}>
        <Text style={styles.spotLabel}>Spot</Text>
        <Text style={styles.locationText}>
          {location}
        </Text>
      </View>

      {/* 중앙: 러닝 기록 */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{formatDistance(distance)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Pace</Text>
          <Text style={styles.statValue}>{pace}/km</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Time</Text>
          <Text style={styles.statValue}>{formatDuration(duration)}</Text>
        </View>
        
        {/* 이동경로 (Time 아래에 표시) */}
        {routeCoordinates && routeCoordinates.length > 0 && (
          <View style={styles.routeContainer}>
            <RouteMap 
              coordinates={routeCoordinates} 
              width={200} 
              height={100} 
            />
          </View>
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
    height: 400,
    backgroundColor: 'transparent', // 투명 배경으로 변경
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden', // 렌더링 문제 방지
    zIndex: 2, // checkerboardBackground 위에 오도록 설정
  },
  locationSection: {
    alignItems: 'center',
    marginTop: 10,  
    marginBottom: -8, // location과 Distance 사이 여백을 다른 항목들과 통일
  },
  spotLabel: {
    fontSize: 12,
    color: '#ffffff',
    fontFamily: 'Gold',
    lineHeight: 12,
  },
  locationText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Gold',
    textAlign: 'center',
    lineHeight: 26,
  },
  statsSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -8, // location과 Distance 사이 여백을 다른 항목들과 통일
  },
  statItem: {
    alignItems: 'center',
    marginVertical: 8, // 각 항목 사이 여백을 16px로 통일
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    fontFamily: 'Gold',
    lineHeight: 12,
    marginBottom: 1,
  },
  statValue: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Gold',
    lineHeight: 28,
  },
  logoSection: {
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 40,
  },
  routeContainer: {
    marginTop: 20,
    alignItems: 'center',
    width: 200,
    height: 80,
  },
});

RunningShareCard.displayName = 'RunningShareCard';

export default RunningShareCard;
