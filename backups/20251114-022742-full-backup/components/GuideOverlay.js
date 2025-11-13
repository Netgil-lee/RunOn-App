import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const GuideOverlay = ({
  visible,
  title,
  description,
  targetPosition,
  targetSize,
  highlightShape = 'circle', // 'circle' or 'rectangle'
  showArrow = false,
  arrowDirection = 'right', // 'up', 'down', 'left', 'right'
  onNext,
  isLastStep = false,
  targetId = '', // 가이드 타겟 ID 추가
}) => {
  if (!visible) return null;
  
  // highlightShape가 'none'이면 targetPosition이 없어도 됨
  if (highlightShape !== 'none' && !targetPosition) return null;

  const highlightStyle = targetPosition && targetSize && 
    typeof targetPosition.x === 'number' && typeof targetPosition.y === 'number' &&
    typeof targetSize.width === 'number' && typeof targetSize.height === 'number' &&
    !isNaN(targetPosition.x) && !isNaN(targetPosition.y) &&
    !isNaN(targetSize.width) && !isNaN(targetSize.height) &&
    targetSize.width > 0 && targetSize.height > 0 ? {
    position: 'absolute',
    left: targetPosition.x - targetSize.width / 2,
    top: targetPosition.y - targetSize.height / 2,
    width: targetSize.width,
    height: targetSize.height,
    borderRadius: highlightShape === 'circle' ? targetSize.width / 2 : 8,
    borderWidth: 3,
    borderColor: '#FFEA00',
    backgroundColor: 'transparent',
  } : {};

  const getArrowStyle = () => {
    if (!targetPosition) return {};
    
    const arrowSize = 20;
    const arrowDistance = 30;
    
    switch (arrowDirection) {
      case 'up':
        return {
          position: 'absolute',
          left: targetPosition.x - arrowSize / 2,
          top: targetPosition.y - targetSize.height / 2 - arrowDistance,
          transform: [{ rotate: '180deg' }],
        };
      case 'down':
        return {
          position: 'absolute',
          left: targetPosition.x - arrowSize / 2,
          top: targetPosition.y + targetSize.height / 2 + arrowDistance,
        };
      case 'left':
        return {
          position: 'absolute',
          left: targetPosition.x - targetSize.width / 2 - arrowDistance,
          top: targetPosition.y - arrowSize / 2,
          transform: [{ rotate: '90deg' }],
        };
      case 'right':
        return {
          position: 'absolute',
          left: targetPosition.x + targetSize.width / 2 + arrowDistance,
          top: targetPosition.y - arrowSize / 2,
          transform: [{ rotate: '-90deg' }],
        };
      default:
        return {};
    }
  };

  const getTextPosition = () => {
    const textWidth = screenWidth * 0.8;
    const textHeight = 120;
    
    // highlightShape가 'none'이면 화면 정중앙에 배치
    if (highlightShape === 'none') {
      return {
        position: 'absolute',
        left: screenWidth / 2 - textWidth / 2,
        top: screenHeight / 2 - textHeight / 2,
        width: textWidth,
      };
    }
    
    // 한강 지도 가이드의 경우 텍스트를 지도 사각형 내부에 고정
    if (targetId === 'hanRiverMap' && targetPosition) {
      return {
        position: 'absolute',
        left: screenWidth / 2 - textWidth / 2,
        top: targetPosition.y + targetSize.height / 2 - 190, // 지도 사각형 내부 (아래에서 60px 위)
        width: textWidth,
      };
    }
    
    // 내가 만든 모임 가이드의 경우 텍스트를 사각형 아래에 고정
    if (targetId === 'myCreatedMeetingsSection' && targetPosition) {
      return {
        position: 'absolute',
        left: screenWidth / 2 - textWidth / 2,
        top: targetPosition.y + targetSize.height / 2 + 20, // 사각형 아래 20px
        width: textWidth,
      };
    }
    
    // 홈탭 4단계 meetingdashboard 가이드의 경우 텍스트를 사각형 아래에 고정
    if (targetId === 'meetingdashboard' && targetPosition) {
      return {
        position: 'absolute',
        left: screenWidth / 2 - textWidth / 2,
        top: targetPosition.y + targetSize.height / 2 + 40, // 사각형 아래 40px
        width: textWidth,
      };
    }
    
    // 홈탭 3단계 hanriverLocationList 가이드의 경우 텍스트를 하이라이트 사각형 아래에 고정
    if (targetId === 'hanriverLocationList' && targetPosition) {
      return {
        position: 'absolute',
        left: screenWidth / 2 - textWidth / 2,
        top: targetPosition.y + targetSize.height / 2 + 40, // 하이라이트 사각형 아래 40px
        width: textWidth,
      };
    }
    
    // 홈탭 5단계 meetingcardlist 가이드의 경우 텍스트를 하이라이트 사각형 위에 고정
    if (targetId === 'meetingcardlist' && targetPosition) {
      return {
        position: 'absolute',
        left: screenWidth / 2 - textWidth / 2,
        top: targetPosition.y - targetSize.height / 2 - 170, // 하이라이트 사각형 위 170px
        width: textWidth,
      };
    }
    
    // 모임탭 4단계 meetingCard 가이드의 경우 텍스트를 5단계와 같은 위치에 고정
    if (targetId === 'meetingCard' && targetPosition) {
      return {
        position: 'absolute',
        left: screenWidth / 2 - textWidth / 2,
        top: targetPosition.y + targetSize.height / 2 + 180, // 5단계와 동일한 위치
        width: textWidth,
      };
    }
    
    // 모임탭 5단계 meetingCardMenu 가이드의 경우 텍스트를 모임카드 아래에 고정
    if (targetId === 'meetingCardMenu' && targetPosition) {
      return {
        position: 'absolute',
        left: screenWidth / 2 - textWidth / 2,
        top: targetPosition.y + targetSize.height / 2 + 20, // 모임카드 아래 20px
        width: textWidth,
      };
    }
    
    // 종료하기 버튼 가이드의 경우 텍스트를 버튼 위에 고정
    if (targetId === 'endMeetingButton' && targetPosition) {
      return {
        position: 'absolute',
        left: screenWidth / 2 - textWidth / 2,
        top: targetPosition.y - targetSize.height / 2 - 220, // 버튼 위 220px
        width: textWidth,
      };
    }
    
    // 다른 가이드들은 기존 로직 사용
    let top = screenHeight / 2 - textHeight / 2;
    
    // 하이라이트 영역과 겹치는지 확인하고 조정 (targetPosition이 있을 때만)
    if (targetPosition) {
      if (targetPosition.y > screenHeight / 2) {
        // 하이라이트가 화면 하반부에 있으면 텍스트를 위쪽에 배치
        top = Math.min(top, targetPosition.y - targetSize.height / 2 - textHeight - 20);
      } else {
        // 하이라이트가 화면 상반부에 있으면 텍스트를 아래쪽에 배치
        top = Math.max(top, targetPosition.y + targetSize.height / 2 + 20);
      }
    }
    
    return {
      position: 'absolute',
      left: screenWidth / 2 - textWidth / 2,
      top: Math.max(50, Math.min(top, screenHeight - textHeight - 100)),
      width: textWidth,
    };
  };

  return (
    <View style={styles.overlay}>
      {/* 반투명 배경 */}
      <View style={styles.background} />
      
      {/* 하이라이트 영역 (highlightShape가 'none'이 아닐 때만) */}
      {highlightShape !== 'none' && <View style={highlightStyle} />}
      
      {/* 화살표 (선택적) */}
      {showArrow && (
        <View style={getArrowStyle()}>
          <Ionicons name="arrow-down" size={20} color="#FFEA00" />
        </View>
      )}
      
      {/* 설명 텍스트 */}
      <View style={getTextPosition()}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        
        {/* 버튼들 */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>
              {isLastStep ? '완료' : '다음'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Pretendard-Bold',
  },
  description: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    fontFamily: 'Pretendard-Regular',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: '#3AF8FF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  nextButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
    textAlign: 'center',
  },
});

export default GuideOverlay;
