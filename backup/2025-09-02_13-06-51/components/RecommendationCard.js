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

  // 날씨 기반 러닝 추천 생성 (러닝 불가능한 조건 우선 처리)
  const getWeatherRecommendation = () => {
    if (!weather) {
      return {
        recommendation: '오늘은 러닝하기 좋은 날씨예요!',
        intensity: 'MED',
        type: 'default'
      };
    }

    const temp = weather.temperature;
    const condition = weather.condition?.toLowerCase() || '';
    const humidity = weather.humidity || 50;
    
    // 1. 러닝 불가능한 조건들 (최우선)
    // 비 관련 조건 (강수확률 40% 이상)
    if (weather.precipitationProbability >= 40) {
      return {
        recommendation: '오늘은 비가 올 확률이 높습니다.\n실내 러닝을 해보는건 어떠세요?',
        intensity: 'LOW',
        type: 'rain'
      };
    }
    
    // 눈 관련 조건
    if (condition.includes('snow') || condition.includes('눈')) {
      return {
        recommendation: '오늘은 눈이 옵니다.\n실내 러닝을 해보는건 어떠세요?',
        intensity: 'LOW',
        type: 'snow'
      };
    }
    
    // 2. 온도 기반 추천 (러닝 가능한 조건)
    if (temp >= 35) {
      return {
        recommendation: '오늘은 기온이 35도입니다.\n가급적 실외 러닝은 자제하는 것이 좋겠어요.',
        intensity: 'LOW',
        type: 'hot'
      };
    } else if (temp >= 30) {
      return {
        recommendation: '오늘은 매우 더운 날씨입니다.\n새벽이나 저녁에 러닝하는 것을 추천해요.',
        intensity: 'MED',
        type: 'warm'
      };
    } else if (temp >= 20) {
      return {
        recommendation: '오늘은 러닝하기 완벽한 날씨입니다!\n한강코스에서 러닝을 즐겨보세요.',
        intensity: 'HIGH',
        type: 'perfect'
      };
    } else if (temp >= 10) {
      return {
        recommendation: '오늘은 선선한 날씨입니다.\n가벼운 워밍업 후 러닝을 시작해보세요.',
        intensity: 'MED',
        type: 'cool'
      };
    } else if (temp >= 0) {
      return {
        recommendation: '오늘은 쌀쌀한 날씨입니다.\n따뜻한 옷을 입고 러닝하세요.',
        intensity: 'MED',
        type: 'cold'
      };
    } else {
      return {
        recommendation: '오늘은 매우 추운 날씨입니다.\n실내 러닝을 고려해보세요.',
        intensity: 'LOW',
        type: 'freezing'
      };
    }
  };

  // 날씨 조건별 추가 추천 (러닝 불가능한 조건 우선 처리)
  const getWeatherConditionRecommendation = () => {
    if (!weather) return '';

    const condition = weather.condition?.toLowerCase() || '';
    const temp = weather.temperature;
    
    // 1. 러닝 불가능한 조건들 (최우선) - 메인 추천에서 이미 처리됨
    // 비와 눈은 메인 추천에서 처리하므로 여기서는 제외
    
    // 2. 러닝 가능하지만 주의가 필요한 조건들
    // 안개 관련 조건
    if (condition.includes('fog') || condition.includes('안개')) {
      return '안개가 있습니다. 러닝 시 시야 확보에 주의하세요.';
    }
    
    // 바람 관련 조건
    if (condition.includes('wind') || condition.includes('바람')) {
      return '바람이 강합니다. 바람을 등지고 러닝하는 것이 좋겠어요.';
    }
    
    // 3. 일반적인 주의사항
    // 습도 관련 조건 (건조할 때만)
    if (weather.humidity <= 30) {
      return '건조한 날씨입니다. 수분 섭취를 잊지 마세요.';
    }
    
    return '';
  };

  // 사용자 데이터와 날씨를 기반으로 추천 생성 (온보딩 데이터 기반)
  const getRecommendation = () => {
    const level = user.level || 'beginner';
    const goal = user.goal || 'habit';
    const course = user.course || 'banpo';
    
    let recommendation = '';
    let intensity = 'LOW';
    
    // 목표와 레벨에 따른 추천
    switch (goal) {
      case 'habit':
        if (level === 'beginner') {
          recommendation = '20분 저강도 러닝';
          intensity = 'LOW';
        } else if (level === 'intermediate') {
          recommendation = '30분 저강도 러닝';
          intensity = 'LOW';
        } else {
          recommendation = '40분 저강도 러닝';
          intensity = 'MED';
        }
        break;
      case 'weight':
        if (level === 'beginner') {
          recommendation = '30분 중강도 러닝';
          intensity = 'MED';
        } else if (level === 'intermediate') {
          recommendation = '45분 중강도 러닝';
          intensity = 'MED';
        } else {
          recommendation = '60분 중강도 러닝';
          intensity = 'HIGH';
        }
        break;
      case '5k':
        if (level === 'beginner') {
          recommendation = '5km 장거리 러닝';
          intensity = 'MED';
        } else if (level === 'intermediate') {
          recommendation = '5km 목표 달성 러닝';
          intensity = 'HIGH';
        } else {
          recommendation = '5km 기록 단축 러닝';
          intensity = 'HIGH';
        }
        break;
      case '10k':
        if (level === 'beginner') {
          recommendation = '5km 장거리 러닝';
          intensity = 'MED';
        } else if (level === 'intermediate') {
          recommendation = '8km 장거리 러닝';
          intensity = 'HIGH';
        } else {
          recommendation = '10km 목표 달성 러닝';
          intensity = 'HIGH';
        }
        break;
      case 'half':
        if (level === 'beginner') {
          recommendation = '10km 장거리 러닝';
          intensity = 'MED';
        } else if (level === 'intermediate') {
          recommendation = '15km 장거리 러닝';
          intensity = 'HIGH';
        } else {
          recommendation = '21km 목표 달성 러닝';
          intensity = 'HIGH';
        }
        break;
      case 'full':
        if (level === 'beginner') {
          recommendation = '15km 장거리 러닝';
          intensity = 'MED';
        } else if (level === 'intermediate') {
          recommendation = '25km 장거리 러닝';
          intensity = 'HIGH';
        } else {
          recommendation = '42km 목표 달성 러닝';
          intensity = 'HIGH';
        }
        break;
      case 'pr':
        if (level === 'beginner') {
          recommendation = '인터벌 워킹';
          intensity = 'MED';
        } else if (level === 'intermediate') {
          recommendation = '인터벌 러닝';
          intensity = 'HIGH';
        } else {
          recommendation = '고강도 인터벌';
          intensity = 'HIGH';
        }
        break;
      case 'stress':
        if (level === 'beginner') {
          recommendation = '30분 저강도 러닝';
          intensity = 'LOW';
        } else if (level === 'intermediate') {
          recommendation = '45분 저강도 러닝';
          intensity = 'LOW';
        } else {
          recommendation = '60분 저강도 러닝';
          intensity = 'MED';
        }
        break;
      default:
        recommendation = '5km 러닝';
        intensity = 'MED';
    }
    
    // 코스별 추가 정보
    if (course === 'mangwon' || course === 'ttukseom') {
      recommendation += ' (한강공원 코스)';
    } else if (course === 'banpo' || course === 'jamsil' || course === 'yeouido') {
      recommendation += ' (한강공원 코스)';
    }
    
    // 날씨별 조정
    if (weather) {
      if (weather.temperature < 5) {
        recommendation = '실내 러닝 추천';
        intensity = 'LOW';
      } else if (weather.temperature > 25) {
        recommendation = '새벽/저녁 러닝';
        intensity = 'MED';
      }
    }
    
    return { recommendation, intensity };
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

  const weatherRecommendation = getWeatherRecommendation();
  const conditionRecommendation = getWeatherConditionRecommendation();
  const { recommendation, intensity } = getRecommendation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>러닝 추천</Text>
        </View>
        <View style={[
          styles.intensityBadge, 
          { 
            backgroundColor: weatherRecommendation.intensity === 'LOW' ? '#00FF88' : 
                           weatherRecommendation.intensity === 'MED' ? '#FFB800' : '#FF6B6B' 
          }
        ]}>
          <Text style={styles.intensityText}>{weatherRecommendation.intensity}</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        {/* 메인 추천 - 날씨 기반 */}
        <View style={styles.mainRecommendation}>
          <Text style={styles.recommendationText}>{weatherRecommendation.recommendation}</Text>
          {conditionRecommendation && (
            <Text style={styles.conditionText}>{conditionRecommendation}</Text>
          )}
        </View>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.SURFACE,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-SemiBold',
  },
  intensityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  intensityText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.BACKGROUND,
  },
  content: {
    padding: 16,
  },
  mainRecommendation: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  recommendationText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.TEXT,
    textAlign: 'left',
    marginBottom: 8,
    fontFamily: 'Pretendard-Bold',
  },
  conditionText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.SECONDARY,
    textAlign: 'left',
    lineHeight: 22,
    fontFamily: 'Pretendard',
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
    color: COLORS.SECONDARY,
    marginBottom: 4,
    fontFamily: 'Pretendard',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-Medium',
  },
});

export default RecommendationCard; 