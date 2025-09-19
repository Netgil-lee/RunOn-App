import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Runon 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  TEXT_SECONDARY: '#666666',
  BORDER: '#333333',
  SUCCESS: '#4CAF50',
  WARNING: '#FFA500',
  ERROR: '#FF6B6B',
};

const MannerDistanceDisplay = ({ 
  currentDistance = 0, 
  animated = false, 
  showGoal = true,
  size = 'medium', // 'small', 'medium', 'large'
  customContainerStyle = {},
  titleSize = 'default' // 'default', 'large'
}) => {
  const [displayDistance, setDisplayDistance] = useState(0);
  const [progressAnimation] = useState(new Animated.Value(0));
  
  const progress = (currentDistance / 42.195) * 100;
  const remainingDistance = Math.max(0, 42.195 - currentDistance);

  useEffect(() => {
    if (animated) {
      // 0km에서 현재거리까지 애니메이션
      animateDistance(0, currentDistance, 1500);
    } else {
      setDisplayDistance(currentDistance);
      progressAnimation.setValue(progress);
    }
  }, [currentDistance, animated]);

  const animateDistance = (start, end, duration) => {
    const startTime = Date.now();
    const distanceDiff = end - start;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 이징 함수 (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = start + (distanceDiff * easedProgress);
      
      setDisplayDistance(Math.round(currentValue * 10) / 10);
      progressAnimation.setValue((currentValue / 42.195) * 100);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  };

  const getDistanceLevel = (distance) => {
    if (distance >= 35) return { level: 'legend', label: '엘리트', emoji: '🏆', color: COLORS.PRIMARY };
    if (distance >= 28) return { level: 'marathoner', label: '마스터즈', emoji: '🏃‍♂️💪', color: COLORS.SUCCESS };
    if (distance >= 20) return { level: 'runner', label: '하프러너', emoji: '🏃‍♀️', color: COLORS.WARNING };
    if (distance >= 13) return { level: 'jogger', label: '조깅러', emoji: '🏃‍♂️', color: COLORS.TEXT_SECONDARY };
    return { level: 'beginner', label: '런린이', emoji: '🚶‍♂️', color: COLORS.TEXT_SECONDARY };
  };

  const distanceLevel = getDistanceLevel(displayDistance);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          distanceText: styles.smallDistanceText,
          progressBar: styles.smallProgressBar,
          goalText: styles.smallGoalText,
          levelText: styles.smallLevelText,
        };
      case 'large':
        return {
          container: styles.largeContainer,
          distanceText: styles.largeDistanceText,
          progressBar: styles.largeProgressBar,
          goalText: styles.largeGoalText,
          levelText: styles.largeLevelText,
        };
      default:
        return {
          container: styles.mediumContainer,
          distanceText: styles.mediumDistanceText,
          progressBar: styles.mediumProgressBar,
          goalText: styles.mediumGoalText,
          levelText: styles.mediumLevelText,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.container, sizeStyles.container, customContainerStyle]}>
      {/* 카드 헤더 - 프로필탭 카드와 통일감 있는 디자인 */}
      <View style={styles.cardHeader}>
        <Ionicons name="speedometer-outline" size={20} color={COLORS.PRIMARY} />
        <Text style={[styles.cardTitle, titleSize === 'large' && styles.cardTitleLarge]}>매너거리</Text>
      </View>

      {/* 거리와 레벨 정보 */}
      <View style={styles.distanceInfoRow}>
        {/* 좌측: 거리 표시 */}
        <View style={styles.distanceSection}>
          <Text style={[styles.distanceText, sizeStyles.distanceText]}>
            {displayDistance.toFixed(1)}km
          </Text>
          {remainingDistance > 0 && (
            <Text style={[styles.remainingText, sizeStyles.goalText]}>
              {remainingDistance.toFixed(1)}km 남음
            </Text>
          )}
        </View>

        {/* 우측: 레벨 표시 */}
        <View style={styles.levelSection}>
          <Text style={[styles.levelText, sizeStyles.levelText, { color: distanceLevel.color }]}>
            {distanceLevel.emoji}
          </Text>
          <Text style={[styles.levelLabel, sizeStyles.levelText, { color: COLORS.TEXT }]}>
            {distanceLevel.label}
          </Text>
        </View>
      </View>

      {/* 진행률바 */}
      <View style={[styles.progressBarContainer, sizeStyles.progressBar]}>
        <View style={styles.progressBarBackground}>
          <Animated.View 
            style={[
              styles.progressBarFill,
              {
                width: progressAnimation.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
                backgroundColor: COLORS.PRIMARY, // 프라이머리 색상으로 변경
              }
            ]} 
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // 기본 스타일은 외부에서 제어하도록 비워둠
  },

  // Small size styles
  smallContainer: {
    padding: 10,
  },
  smallDistanceText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  smallProgressBar: {
    height: 6,
    marginVertical: 8,
  },
  smallGoalText: {
    fontSize: 12,
  },
  smallLevelText: {
    fontSize: 16,
  },

  // Medium size styles
  mediumContainer: {
    padding: 16,
  },
  mediumDistanceText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  mediumProgressBar: {
    height: 8,
    marginVertical: 12,
  },
  mediumGoalText: {
    fontSize: 14,
  },
  mediumLevelText: {
    fontSize: 18,
  },

  // Large size styles
  largeContainer: {
    padding: 16,
  },
  largeDistanceText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  largeProgressBar: {
    height: 12,
    marginVertical: 16,
  },
  largeGoalText: {
    fontSize: 16,
  },
  largeLevelText: {
    fontSize: 24,
  },

  // Common styles
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginLeft: 8,
  },
  cardTitleLarge: {
    fontSize: 18,
  },
  distanceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  distanceSection: {
    flex: 1,
  },
  distanceText: {
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  levelSection: {
    alignItems: 'flex-end',
  },
  levelText: {
    fontSize: 32,
    marginBottom: 4,
  },
  levelLabel: {
    fontWeight: '600',
    textAlign: 'right',
    fontSize: 16,
  },

  progressBarContainer: {
    marginVertical: 0,
  },
  progressBarBackground: {
    height: '100%',
    backgroundColor: COLORS.BORDER,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  remainingText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 12,
  },
});

export default MannerDistanceDisplay;
