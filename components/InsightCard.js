import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { getCourseName, TIME_OPTIONS } from '../constants/onboardingOptions';

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  SECONDARY: '#666666',
};

const InsightCard = ({ user, weather }) => {
  if (!user) return null;

  // 현재 시간에 따른 인사말
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '새벽 러닝';
    if (hour < 12) return '좋은 아침';
    if (hour < 18) return '오후 러닝';
    return '저녁 러닝';
  };



  // 사용자 레벨에 따른 목표 달성률 (커뮤니티 활동 데이터 기반)
  const getWeeklyProgress = () => {
    // 커뮤니티 활동 데이터에서 총참여 횟수 가져오기
    const totalParticipated = user.communityActivity?.totalParticipated || 0;
    
    // 목표 단계별 설정 (5의 배수)
    const goalSteps = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];
    
    // 현재 참여 횟수에 맞는 다음 목표 찾기
    let targetCount = 5; // 기본 목표
    
    for (let i = 0; i < goalSteps.length; i++) {
      if (totalParticipated < goalSteps[i]) {
        targetCount = goalSteps[i];
        break;
      }
    }
    
    // 100번 이상의 경우 다음 단계 목표 설정 (10의 배수로 증가)
    if (totalParticipated >= 100) {
      const nextGoal = Math.ceil(totalParticipated / 10) * 10;
      targetCount = nextGoal;
    }
    
    return { 
      current: totalParticipated, 
      total: targetCount 
    };
  };

  // 선호 코스 표시 (온보딩 데이터 기반)
  const getPreferredCourse = () => {
    // 온보딩에서 선택한 코스 배열 가져오기
    const preferredCourses = user.preferredCourses || ['banpo'];
    
    // 배열에서 임의로 하나 선택
    const randomIndex = Math.floor(Math.random() * preferredCourses.length);
    const selectedCourse = preferredCourses[randomIndex];
    
    // getCourseName 함수를 사용하여 코스 이름 반환
    return getCourseName(selectedCourse);
  };

  // 최적 러닝 시간 (온보딩 데이터 기반) - 오전/오후 구분
  const getOptimalTime = () => {
    const time = user.time || 'morning';
    const goal = user.goal || 'habit';
    
    // TIME_OPTIONS에서 해당 시간 옵션 찾기
    const timeOption = TIME_OPTIONS.find(t => t.id === time);
    if (!timeOption) return '오전 7-9시';
    
    // 시간에 따른 오전/오후 구분
    const timeRange = timeOption.time;
    if (time === 'dawn' || time === 'morning') {
      return `오전 ${timeRange}`;
    } else {
      return `오후 ${timeRange}`;
    }
  };

  // 사용자 이름 표시
  const getUserDisplayName = () => {
    
    // user 객체에서 displayName 확인
    if (user?.displayName) {
      return user.displayName;
    }
    if (user?.name) {
      return user.name;
    }
    
    return '사용자';
  };

  const progress = getWeeklyProgress();

  return (
    <View style={styles.container} key={`insight-${user?.displayName || 'default'}`}>
            <View style={styles.header}>
        <Text style={styles.greetingText} key={`greeting-${user?.displayName || 'default'}`}>
          {(() => {
            const greeting = getGreeting();
            const displayName = getUserDisplayName();
            return `${greeting}, ${displayName}님!`;
          })()}
        </Text>
      </View>
      
      <View style={styles.content}>


        {/* 중간: 진행률 표시 */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>모임참여 목표</Text>
            <Text style={styles.progressText}>{progress.current}/{progress.total}</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(progress.current / progress.total) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* 하단: 핵심 정보 */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>코스</Text>
            <Text style={styles.infoValue}>{getPreferredCourse()}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>시간</Text>
            <Text style={styles.infoValue}>{getOptimalTime()}</Text>
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
    marginTop: 16,
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


  content: {
    padding: 16,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    fontFamily: 'Pretendard',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 16,
    color: COLORS.SECONDARY,
    fontFamily: 'Pretendard',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-Medium',
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 3,
  },
  infoGrid: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 4,
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#1F1F24',
    marginHorizontal: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    marginBottom: 4,
    fontFamily: 'Pretendard',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-Medium',
  },

});

export default InsightCard; 