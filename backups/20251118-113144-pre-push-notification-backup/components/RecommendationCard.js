import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  SECONDARY: '#666666',
};

const RecommendationCard = ({ user, weather }) => {
  if (!user) return null;

  // 날씨 컨디션 결정 (새로운 태그 시스템)
  const getWeatherCondition = () => {
    if (!weather) {
      return 'GOOD';
    }

    const temp = weather.temperature;
    
    // 강수확률 40% 이상이면 RAINY (최우선)
    if (weather.precipitationProbability >= 40) {
      return 'RAINY';
    }
    
    // 온도 기반 날씨 컨디션
    if (temp >= 29) {
      return 'HOT';
    } else if (temp >= 25) {
      return 'GOOD';
    } else if (temp >= 15) {
      return 'PERFECT';
    } else if (temp >= 1) {
      return 'GOOD';
    } else {
      return 'COLD';
    }
  };


  // 날짜 기반 시드값 생성 (대한민국 시간 기준)
  const getDateBasedSeed = () => {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    const year = koreaTime.getFullYear();
    const month = koreaTime.getMonth() + 1;
    const day = koreaTime.getDate();
    
    // YYYYMMDD 형식으로 날짜 문자열 생성
    const dateString = `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
    return parseInt(dateString);
  };

  // 시드 기반 랜덤 함수
  const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // 러닝 레벨 결정 (새로운 태그 시스템)
  const getRunningLevel = () => {
    const level = user.level || 'beginner';
    const goal = user.goal || 'habit';
    
    let intensity = 'LOW';
    
    // 목표와 레벨에 따른 강도 결정
    switch (goal) {
      case 'habit':
        if (level === 'beginner') {
          intensity = 'LOW';
        } else if (level === 'intermediate') {
          intensity = 'LOW';
        } else {
          intensity = 'MED';
        }
        break;
      case 'weight':
        if (level === 'beginner') {
          intensity = 'MED';
        } else if (level === 'intermediate') {
          intensity = 'MED';
        } else {
          intensity = 'HIGH';
        }
        break;
      case '5k':
        if (level === 'beginner') {
          intensity = 'MED';
        } else if (level === 'intermediate') {
          intensity = 'HIGH';
        } else {
          intensity = 'HIGH';
        }
        break;
      case '10k':
        if (level === 'beginner') {
          intensity = 'MED';
        } else if (level === 'intermediate') {
          intensity = 'HIGH';
        } else {
          intensity = 'HIGH';
        }
        break;
      case 'half':
        if (level === 'beginner') {
          intensity = 'MED';
        } else if (level === 'intermediate') {
          intensity = 'HIGH';
        } else {
          intensity = 'HIGH';
        }
        break;
      case 'full':
        if (level === 'beginner') {
          intensity = 'MED';
        } else if (level === 'intermediate') {
          intensity = 'HIGH';
        } else {
          intensity = 'HIGH';
        }
        break;
      case 'pr':
        if (level === 'beginner') {
          intensity = 'MED';
        } else if (level === 'intermediate') {
          intensity = 'HIGH';
        } else {
          intensity = 'HIGH';
        }
        break;
      case 'stress':
        if (level === 'beginner') {
          intensity = 'LOW';
        } else if (level === 'intermediate') {
          intensity = 'LOW';
        } else {
          intensity = 'MED';
        }
        break;
      default:
        intensity = 'MED';
    }
    
    // 날씨별 조정
    if (weather) {
      if (weather.temperature < 5) {
        intensity = 'LOW';
      } else if (weather.temperature > 25) {
        intensity = 'MED';
      }
    }
    
    // 날짜 기반 시드값 생성
    const dateSeed = getDateBasedSeed();
    const userSeed = (user.uid || 'default').charCodeAt(0); // 사용자별 고유값
    const combinedSeed = dateSeed + userSeed;
    
    // LOW/MED/HIGH를 Lv 1-10으로 변환 (날짜 기반 랜덤)
    switch (intensity) {
      case 'LOW':
        return Math.floor(seededRandom(combinedSeed) * 3) + 1; // Lv 1-3
      case 'MED':
        return Math.floor(seededRandom(combinedSeed + 1) * 4) + 4; // Lv 4-7
      case 'HIGH':
        return Math.floor(seededRandom(combinedSeed + 2) * 3) + 8; // Lv 8-10
      default:
        return 5;
    }
  };

  // 추천 거리 계산 (온보딩 데이터 기반)
  const getRecommendedDistance = () => {
    const level = user.level || 'beginner';
    const goal = user.goal || 'habit';
    const course = user.course || 'banpo';
    
    let distance = '';
    
    switch (goal) {
      case 'habit':
        distance = level === 'beginner' ? '2-3km' : level === 'intermediate' ? '3-5km' : '5-7km';
        break;
      case 'weight':
        distance = level === 'beginner' ? '3-5km' : level === 'intermediate' ? '5-7km' : '8-10km';
        break;
      case '5k':
        distance = level === 'beginner' ? '3-5km' : level === 'intermediate' ? '5km' : '5km';
        break;
      case '10k':
        distance = level === 'beginner' ? '5-7km' : level === 'intermediate' ? '8-10km' : '10km';
        break;
      case 'half':
        distance = level === 'beginner' ? '10-15km' : level === 'intermediate' ? '15-20km' : '21km';
        break;
      case 'full':
        distance = level === 'beginner' ? '15-25km' : level === 'intermediate' ? '25-35km' : '42km';
        break;
      case 'pr':
        distance = level === 'beginner' ? '3-5km' : level === 'intermediate' ? '5-7km' : '8-10km';
        break;
      case 'stress':
        distance = level === 'beginner' ? '3-5km' : level === 'intermediate' ? '5-7km' : '7-10km';
        break;
      default:
        distance = level === 'beginner' ? '3-5km' : level === 'intermediate' ? '5-7km' : '8-10km';
    }
    
    // 코스별 조정
    if (course === 'mangwon' || course === 'ttukseom') {
      distance = level === 'beginner' ? '2-3km' : level === 'intermediate' ? '3-5km' : '5-7km';
    } else if (course === 'banpo' || course === 'jamsil' || course === 'yeouido') {
      distance = level === 'beginner' ? '3-5km' : level === 'intermediate' ? '5-7km' : '8-10km';
    }
    
    return distance;
  };

  // 추천 시간 계산 (온보딩 데이터 기반)
  const getRecommendedDuration = () => {
    const level = user.level || 'beginner';
    const goal = user.goal || 'habit';
    const course = user.course || 'banpo';
    
    let duration = '';
    
    switch (goal) {
      case 'habit':
        duration = level === 'beginner' ? '20-30분' : level === 'intermediate' ? '30-40분' : '40-50분';
        break;
      case 'weight':
        duration = level === 'beginner' ? '30-45분' : level === 'intermediate' ? '45-60분' : '60-75분';
        break;
      case '5k':
        duration = level === 'beginner' ? '30-45분' : level === 'intermediate' ? '25-35분' : '20-30분';
        break;
      case '10k':
        duration = level === 'beginner' ? '45-70분' : level === 'intermediate' ? '40-60분' : '35-50분';
        break;
      case 'half':
        duration = level === 'beginner' ? '70-90분' : level === 'intermediate' ? '90-120분' : '90-150분';
        break;
      case 'full':
        duration = level === 'beginner' ? '120-180분' : level === 'intermediate' ? '180-240분' : '180-300분';
        break;
      case 'pr':
        duration = level === 'beginner' ? '20-30분' : level === 'intermediate' ? '30-45분' : '45-60분';
        break;
      case 'stress':
        duration = level === 'beginner' ? '30-45분' : level === 'intermediate' ? '45-60분' : '60-75분';
        break;
      default:
        duration = level === 'beginner' ? '25-35분' : level === 'intermediate' ? '35-50분' : '45-70분';
    }
    
    // 코스별 조정
    if (course === 'mangwon' || course === 'ttukseom') {
      duration = level === 'beginner' ? '30-45분' : level === 'intermediate' ? '45-60분' : '60-90분';
    } else if (course === 'banpo' || course === 'jamsil' || course === 'yeouido') {
      duration = level === 'beginner' ? '25-40분' : level === 'intermediate' ? '35-55분' : '45-75분';
    }
    
    return duration;
  };

  // 추천 페이스 계산 (온보딩 데이터 기반)
  const getRecommendedPace = () => {
    const level = user.level || 'beginner';
    const goal = user.goal || 'habit';
    const course = user.course || 'banpo';
    
    let pace = '';
    
    switch (goal) {
      case 'habit':
        pace = level === 'beginner' ? '7:00/km' : level === 'intermediate' ? '6:30/km' : '6:00/km';
        break;
      case 'weight':
        pace = level === 'beginner' ? '6:30/km' : level === 'intermediate' ? '6:00/km' : '5:30/km';
        break;
      case '5k':
        pace = level === 'beginner' ? '7:30/km' : level === 'intermediate' ? '6:00/km' : '5:00/km';
        break;
      case '10k':
        pace = level === 'beginner' ? '7:00/km' : level === 'intermediate' ? '6:30/km' : '5:30/km';
        break;
      case 'half':
        pace = level === 'beginner' ? '7:30/km' : level === 'intermediate' ? '7:00/km' : '6:00/km';
        break;
      case 'full':
        pace = level === 'beginner' ? '8:00/km' : level === 'intermediate' ? '7:30/km' : '6:30/km';
        break;
      case 'pr':
        pace = level === 'beginner' ? '6:00/km' : level === 'intermediate' ? '5:30/km' : '5:00/km';
        break;
      case 'stress':
        pace = level === 'beginner' ? '7:30/km' : level === 'intermediate' ? '7:00/km' : '6:30/km';
        break;
      default:
        pace = level === 'beginner' ? '7:00/km' : level === 'intermediate' ? '6:30/km' : '6:00/km';
    }
    
    // 코스별 조정
    if (course === 'mangwon' || course === 'ttukseom') {
      pace = level === 'beginner' ? '8:00/km' : level === 'intermediate' ? '7:30/km' : '7:00/km';
    } else if (course === 'banpo' || course === 'jamsil' || course === 'yeouido') {
      pace = level === 'beginner' ? '6:00/km' : level === 'intermediate' ? '5:30/km' : '5:00/km';
    }
    
    return pace;
  };

  const runningLevel = getRunningLevel();
  const weatherCondition = getWeatherCondition();

  // 러닝 레벨 색상 결정
  const getRunningLevelColor = (level) => {
    if (level >= 1 && level <= 3) return '#3AF8FF'; // 파란색 (저강도)
    if (level >= 4 && level <= 7) return '#FFB800'; // 노란색 (중강도)
    if (level >= 8 && level <= 10) return '#FF6B6B'; // 빨간색 (고강도)
    return '#3AF8FF';
  };

  // 날씨 컨디션 색상 결정
  const getWeatherConditionColor = (condition) => {
    switch (condition) {
      case 'PERFECT': return '#00FF88'; // 초록색
      case 'GOOD': return '#FFB800'; // 노란색
      case 'HOT': return '#FF6B6B'; // 빨간색
      case 'COLD': return '#3AF8FF'; // 파란색
      case 'RAINY': return '#666666'; // 회색
      default: return '#FFB800';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>러닝 추천</Text>
          <View style={styles.tagsContainer}>
            <View style={[
              styles.tagBadge, 
              { backgroundColor: getRunningLevelColor(runningLevel) }
            ]}>
              <Text style={styles.tagText}>RUNNING: Lv {runningLevel}</Text>
            </View>
            <View style={[
              styles.tagBadge, 
              { backgroundColor: getWeatherConditionColor(weatherCondition) }
            ]}>
              <Text style={styles.tagText}>WEATHER: {weatherCondition}</Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.content}>
        {/* 상세 정보 */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>거리</Text>
            <Text style={styles.detailValue}>{getRecommendedDistance()}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>시간</Text>
            <Text style={styles.detailValue}>{getRecommendedDuration()}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>페이스</Text>
            <Text style={styles.detailValue}>{getRecommendedPace()}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.CARD,
    marginHorizontal: 0,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    paddingBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-SemiBold',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.BACKGROUND,
  },
  content: {
    padding: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 4,
    alignItems: 'center',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#1F1F24',
    marginHorizontal: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.TEXT,
    marginBottom: 4,
    fontFamily: 'Pretendard',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-Bold',
  },
});

export default RecommendationCard; 