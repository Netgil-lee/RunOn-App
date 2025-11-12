import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  WHITE: '#ffffff',
  GRAY_100: '#f3f4f6',
  GRAY_200: '#e5e7eb',
  GRAY_300: '#d1d5db',
  GRAY_400: '#9ca3af',
  GRAY_500: '#6b7280',
  GRAY_600: '#4b5563',
  GRAY_700: '#374151',
  GRAY_800: '#1f2937',
  GRAY_900: '#111827',
  GOLD: '#FFD700',
  SILVER: '#C0C0C0',
  BRONZE: '#CD7F32',
};

const PremiumScreen = ({ navigation }) => {
  // 회전 애니메이션을 위한 Animated.Value
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // 회전 애니메이션 시작
  useEffect(() => {
    let animationId;
    let startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % 8000) / 8000; // 8초마다 반복
      
      rotateAnim.setValue(progress);
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    // 컴포넌트 언마운트 시 애니메이션 정리
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [rotateAnim]);

  // 회전 변환 값 계산
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.WHITE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>구독 서비스</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* RunOn Members 소개 섹션 */}
        <View style={styles.introSection}>
          <View style={styles.introIcon}>
            <View style={styles.premiumBadgeContainer}>
              <Animated.View 
                style={[
                  styles.premiumBadgeGlow,
                  { transform: [{ rotate }] }
                ]}
              >
                <Image 
                  source={require('../assets/images/Union.png')} 
                  style={styles.premiumBadgeImage}
                />
              </Animated.View>
              <View style={styles.premiumIconOverlay}>
                <Ionicons name="diamond-outline" size={24} color="#FFFFFF" />
              </View>
            </View>
          </View>
          <Text style={styles.introTitle}>RunOn 맴버스</Text>
          <Text style={styles.introSubtitle}>
            더 많은 서비스를 구독하고 혜택을 받으세요
          </Text>
        </View>

        {/* RunOn Members 혜택 */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>혜택</Text>
          
          {/* 블랙리스트 기능 */}
          <View style={styles.featureItem}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.WHITE} />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>블랙리스트 관리</Text>
              <Text style={styles.featureDescription}>
                최대 3명까지 블랙리스트에 등록할 수 있습니다
              </Text>
            </View>
          </View>
          
          {/* 가맹점 할인 */}
          <View style={styles.featureItem}>
            <Ionicons name="storefront" size={24} color={COLORS.WHITE} />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>가맹점 할인 혜택</Text>
              <Text style={styles.featureDescription}>
                제휴 가맹점에서 특별 할인을 받으세요 (추후 제공 예정)
              </Text>
            </View>
          </View>
          
          {/* 러닝 이벤트 참여 기회 */}
          <View style={styles.featureItem}>
            <Ionicons name="trophy" size={24} color={COLORS.WHITE} />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>러논맴버스를 위한 러닝 이벤트</Text>
              <Text style={styles.featureDescription}>
                특별한 경험을 위한 러닝세션에 참가할 수 있습니다.
              </Text>
            </View>
          </View>
        </View>

        {/* 하단 여백 */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    backgroundColor: COLORS.SURFACE,
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.WHITE,
    fontFamily: 'Pretendard-SemiBold',
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  introSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  introIcon: {
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginBottom: 8,
    textAlign: 'center',
  },
  introSubtitle: {
    fontSize: 16,
    color: COLORS.GRAY_400,
    textAlign: 'center',
    lineHeight: 24,
  },
  benefitsSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.CARD,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  featureContent: {
    flex: 1,
    marginLeft: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF0073',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 40,
  },
  // RunOn Members 배지 스타일 (프로필탭과 동일)
  premiumBadgeContainer: {
    marginLeft: -2,
    marginRight: 8,
    backgroundColor: 'transparent',
    // 글로우 효과 - 핑크 색상 (범위 확대)
    shadowColor: '#FF0073',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  premiumBadgeGlow: {
    backgroundColor: 'transparent',
  },
  premiumBadgeImage: {
    width: 100,
    height: 40,
    resizeMode: 'contain',
  },
  premiumIconOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PremiumScreen;