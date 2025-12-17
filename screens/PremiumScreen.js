import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../contexts/PremiumContext';
import paymentService, { PRODUCT_IDS } from '../services/paymentService';

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
  // 인증 및 프리미엄 컨텍스트
  const { user } = useAuth();
  const { updatePremiumStatus } = usePremium();

  // 모달 상태 관리
  const [showMainModal, setShowMainModal] = useState(false);
  const [showPlansExpanded, setShowPlansExpanded] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('yearly'); // 기본값: 연간
  const [monthlyCardHeight, setMonthlyCardHeight] = useState(0); // 월간 구독 카드 높이
  const [buttonHeight, setButtonHeight] = useState(80); // '모든 플랜 보기' 버튼 높이

  // 결제 상태 관리
  const [isProcessing, setIsProcessing] = useState(false); // 결제 진행 중 여부
  const [retryCount, setRetryCount] = useState(0); // 재시도 횟수

  // 회전 애니메이션을 위한 Animated.Value
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // 모달 오버레이 페이드 애니메이션
  const modalBackdropOpacity = useRef(new Animated.Value(0)).current;
  
  // 모달 컨텐츠 슬라이드 애니메이션
  const modalContentTranslateY = useRef(new Animated.Value(300)).current;
  const modalContentOpacity = useRef(new Animated.Value(0)).current;
  
  // 플랜 확장 애니메이션
  const plansExpandedHeight = useRef(new Animated.Value(0)).current;

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

  // 모달 핸들러
  const handleOpenMainModal = () => {
    setShowMainModal(true);
    // 초기값 설정
    modalContentTranslateY.setValue(300);
    modalContentOpacity.setValue(0);
    
    // 병렬 애니메이션 실행
    Animated.parallel([
      Animated.timing(modalBackdropOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(modalContentTranslateY, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(modalContentOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCloseMainModal = () => {
    // 병렬 애니메이션 실행
    Animated.parallel([
      Animated.timing(modalBackdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalContentTranslateY, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(modalContentOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowMainModal(false);
      setShowPlansExpanded(false);
      plansExpandedHeight.setValue(0);
      setMonthlyCardHeight(0);
      setButtonHeight(56);
    });
  };

  const handleViewAllPlans = () => {
    // 상태 변경을 먼저 하고 애니메이션 시작
    setShowPlansExpanded(true);
    // 다음 프레임에서 애니메이션 시작 (렌더링 완료 후)
    requestAnimationFrame(() => {
      Animated.spring(plansExpandedHeight, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: false,
      }).start();
    });
  };

  const handleClosePlansExpanded = () => {
    Animated.spring(plansExpandedHeight, {
      toValue: 0,
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start(() => {
      setShowPlansExpanded(false);
    });
  };

  const handleFreeTrial = () => {
    // 플랜이 확장되어 있으면 선택된 플랜으로 결제, 아니면 기본 연간 구독
    if (showPlansExpanded) {
      handleFreeTrialWithPlan();
    } else {
      // 기본 연간 구독으로 진행
      handleCloseMainModal();
      // TODO: 연간 구독 무료 체험 시작 로직
    }
  };

  const handleSelectPlan = (planType) => {
    // 플랜 선택만 하고, 실제 결제는 handleFreeTrial에서 처리
    setSelectedPlan(planType);
  };

  const handleFreeTrialWithPlan = async () => {
    // 사용자 확인 다이얼로그
    Alert.alert(
      '구독 확인',
      '정말 구독하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '구독하기',
          onPress: async () => {
            await processPurchase();
          },
        },
      ]
    );
  };

  // 결제 처리 함수
  const processPurchase = async () => {
    if (!user?.uid) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    // 제품 ID 결정
    const productId = selectedPlan === 'yearly' 
      ? PRODUCT_IDS.PREMIUM_YEARLY 
      : PRODUCT_IDS.PREMIUM_MONTHLY;

    try {
      setIsProcessing(true);
      setRetryCount(0);

      // PaymentService 초기화 확인
      if (!paymentService.isInitialized) {
        const initialized = await paymentService.initialize();
        if (!initialized) {
          throw new Error('결제 서비스를 초기화할 수 없습니다.');
        }
      }

      // 제품 정보 로드
      await paymentService.loadProducts();

      // 구매 요청
      // react-native-iap는 purchaseUpdatedListener로 구매 완료를 처리하므로
      // 구매 성공 처리는 paymentService의 handlePurchaseUpdate에서 수행됨
      // 하지만 PremiumScreen에서 모달과 PremiumContext를 제어해야 하므로
      // paymentService에 성공 콜백을 전달
      // requestPurchase는 Promise를 반환하지 않으므로 await 사용 안 함
      paymentService.purchaseProduct(productId, user.uid, {
        onSuccess: async (purchase, subscriptionStatus) => {
          // PremiumContext 업데이트
          updatePremiumStatus({
            subscriptionType: productId,
            expiresDate: subscriptionStatus?.expiresDate || purchase.expirationDate,
          });

          // 모달 닫기
          handleCloseMainModal();

          // 로딩 상태 해제
          setIsProcessing(false);

          // 성공 메시지
          Alert.alert('환영합니다!', '러논 멤버스에 오신 걸 환영합니다');
        },
        onError: (error) => {
          // 로딩 상태 해제
          setIsProcessing(false);
          
          // 에러 타입 확인
          const errorCode = error.code || error.message;
          
          // 사용자 취소 처리
          if (errorCode === 'E_USER_CANCELLED' || error.message?.includes('취소')) {
            Alert.alert('결제 취소', '결제가 취소되었습니다');
            return;
          }

          // 네트워크 오류 처리 (재시도)
          if (errorCode === 'E_NETWORK_ERROR' || error.message?.includes('네트워크')) {
            if (retryCount < 3) {
              const newRetryCount = retryCount + 1;
              setRetryCount(newRetryCount);
              
              Alert.alert(
                '네트워크 오류',
                '네트워크 연결을 확인해주세요.',
                [
                  {
                    text: '취소',
                    style: 'cancel',
                  },
                  {
                    text: '재시도',
                    onPress: () => processPurchase(),
                  },
                ]
              );
              return;
            } else {
              Alert.alert(
                '결제 실패',
                '네트워크 오류로 결제를 완료할 수 없습니다. 잠시 후 다시 시도해주세요.'
              );
            }
          } else {
            // 기타 오류 처리
            Alert.alert(
              '결제 실패',
              '결제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
            );
          }
        },
      });

    } catch (error) {
      console.error('❌ 결제 처리 실패:', error);
      setIsProcessing(false);
      
      // 에러 타입 확인
      const errorCode = error.code || error.message;
      
      // 사용자 취소 처리
      if (errorCode === 'E_USER_CANCELLED' || error.message?.includes('취소')) {
        Alert.alert('결제 취소', '결제가 취소되었습니다');
        return;
      }

      // 네트워크 오류 처리 (재시도)
      if (errorCode === 'E_NETWORK_ERROR' || error.message?.includes('네트워크')) {
        if (retryCount < 3) {
          const newRetryCount = retryCount + 1;
          setRetryCount(newRetryCount);
          
          Alert.alert(
            '네트워크 오류',
            '네트워크 연결을 확인해주세요.',
            [
              {
                text: '취소',
                style: 'cancel',
              },
              {
                text: '재시도',
                onPress: () => processPurchase(),
              },
            ]
          );
          return;
        } else {
          Alert.alert(
            '결제 실패',
            '네트워크 오류로 결제를 완료할 수 없습니다. 잠시 후 다시 시도해주세요.'
          );
        }
      } else {
        // 기타 오류 처리
        Alert.alert(
          '결제 실패',
          '결제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        );
      }
    }
  };

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

        {/* 하단 여백 (버튼 공간 확보) */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <SafeAreaView style={styles.bottomButtonWrapper}>
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={handleOpenMainModal}
          >
            <Text style={styles.bottomButtonText}>30일간 무료로 사용해보기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 메인 모달 (모든 플랜 보기 / 30일 무료 체험) */}
      <Modal
        visible={showMainModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseMainModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalBackdrop,
              {
                opacity: modalBackdropOpacity,
              },
            ]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={handleCloseMainModal}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: modalContentTranslateY }],
                opacity: modalContentOpacity,
              },
            ]}
          >
            <Text style={styles.modalTitle}>RunOn 맴버스, 무료로 시작해보세요</Text>
            
            {/* 연간 구독 UI (기본 표시) */}
            <View style={styles.titlePlanCardContainer}>
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'yearly' && styles.planCardSelected,
                  showPlansExpanded && styles.planCardWithRadio
                ]}
                onPress={() => showPlansExpanded && handleSelectPlan('yearly')}
                disabled={!showPlansExpanded}
              >
                <View style={styles.planCardContent}>
                  <View style={styles.planCardLeft}>
                    <View style={styles.planCardTitleRow}>
                      <Text style={styles.planName}>연간 구독</Text>
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountBadgeText}>22% 할인</Text>
                      </View>
                    </View>
                    <View style={styles.planCardPriceRow}>
                      <Text style={styles.planPriceMain}>30일 무료 체험 후</Text>
                      <View style={styles.planPriceContainer}>
                        <Text style={styles.planPrice}>₩55,000</Text>
                        <Text style={styles.planPeriod}>/년</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.planCardRight}>
                    <Animated.View
                      style={{
                        opacity: plansExpandedHeight,
                        transform: [{
                          scale: plansExpandedHeight.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 1],
                          })
                        }]
                      }}
                    >
                      {showPlansExpanded && (
                        <View style={selectedPlan === 'yearly' ? styles.radioButtonSelected : styles.radioButton}>
                          {selectedPlan === 'yearly' && <View style={styles.radioButtonInner} />}
                        </View>
                      )}
                    </Animated.View>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtonsContainer}>
              {/* 버튼과 월간 플랜이 같은 위치에 배치되는 컨테이너 */}
              <Animated.View
                style={[
                  styles.planToggleContainer,
                  {
                    height: plansExpandedHeight.interpolate({
                      inputRange: [0, 1],
                      outputRange: [buttonHeight, monthlyCardHeight || buttonHeight],
                    }),
                  },
                ]}
              >
                {/* '모든 플랜 보기' 버튼 - 사라지는 애니메이션 */}
                <Animated.View
                  style={[
                    styles.planToggleItem,
                    {
                      opacity: plansExpandedHeight.interpolate({
                        inputRange: [0, 0.3, 1],
                        outputRange: [1, 0, 0],
                      }),
                      transform: [{
                        translateY: plansExpandedHeight.interpolate({
                          inputRange: [0, 0.3, 1],
                          outputRange: [0, -10, -20],
                        })
                      }],
                      pointerEvents: showPlansExpanded ? 'none' : 'auto',
                    },
                  ]}
                >
                  <View
                    onLayout={(event) => {
                      const { height } = event.nativeEvent.layout;
                      if (height > 0) {
                        setButtonHeight(height);
                      }
                    }}
                  >
                    <TouchableOpacity
                      style={styles.modalOptionButtonOutlined}
                      onPress={handleViewAllPlans}
                      disabled={showPlansExpanded}
                    >
                      <Text style={styles.modalOptionTextOutlined}>모든 플랜 보기</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
                
                {/* 월간 플랜 - 나타나는 애니메이션 */}
                <Animated.View
                  style={[
                    styles.planToggleItem,
                    {
                      opacity: plansExpandedHeight.interpolate({
                        inputRange: [0, 0.3, 1],
                        outputRange: [0, 0, 1],
                      }),
                      transform: [{
                        translateY: plansExpandedHeight.interpolate({
                          inputRange: [0, 0.3, 1],
                          outputRange: [20, 10, 0],
                        })
                      }],
                      pointerEvents: showPlansExpanded ? 'auto' : 'none',
                      marginTop: 12,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.planCard,
                      selectedPlan === 'monthly' && styles.planCardSelected
                    ]}
                    onPress={() => handleSelectPlan('monthly')}
                    onLayout={(event) => {
                      const { height } = event.nativeEvent.layout;
                      if (height > 0) {
                        // marginTop: 12를 포함한 전체 높이
                        setMonthlyCardHeight(height + 12);
                      }
                    }}
                  >
                    <View style={styles.planCardContent}>
                      <View style={styles.planCardLeft}>
                        <View style={styles.planCardTitleRow}>
                          <Text style={styles.planName}>월간 구독</Text>
                        </View>
                        <View style={styles.planCardPriceRow}>
                          <Text style={styles.planPriceMain}>30일 무료 체험 후</Text>
                          <View style={styles.planPriceContainer}>
                            <Text style={styles.planPrice}>₩5,900</Text>
                            <Text style={styles.planPeriod}>/월</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.planCardRight}>
                        <View style={selectedPlan === 'monthly' ? styles.radioButtonSelected : styles.radioButton}>
                          {selectedPlan === 'monthly' && <View style={styles.radioButtonInner} />}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
              
              <TouchableOpacity
                style={[styles.modalOptionButtonPrimary, isProcessing && styles.modalOptionButtonPrimaryDisabled]}
                onPress={handleFreeTrial}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={[styles.modalOptionTextPrimary, { marginLeft: 8 }]}>
                      처리 중...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.modalOptionTextPrimary}>
                    30일간 무료로 사용해보기
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDisclaimer}>
              무료 체험 기간 동안 요금이 청구되지 않습니다.{'\n'}언제든지 취소할 수 있습니다.
            </Text>
          </Animated.View>
        </View>
      </Modal>
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
    height: 100,
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
  // 하단 고정 버튼
  bottomButtonWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.BACKGROUND,
  },
  bottomButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  bottomButton: {
    backgroundColor: '#FF0073',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  planToggleContainer: {
    position: 'relative',
    minHeight: 70,
    overflow: 'visible',
  },
  planToggleItem: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  plansExpandedContainer: {
    overflow: 'hidden',
    marginTop: 0,
    marginBottom: 12,
  },
  plansExpandedContent: {
    // 월간 플랜만 표시
  },
  modalContent: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    maxHeight: '100%',
    minHeight: 'auto',
  },
  modalCloseButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'Regular',
    color: COLORS.WHITE,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Pretendard-Regular',
    lineHeight: 32,
  },
  modalSubtitle: {
    fontSize: 16,
    color: COLORS.GRAY_400,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Pretendard-Regular',
    lineHeight: 24,
  },
  titlePlanCardContainer: {
    marginBottom: 0,
  },
  modalButtonsContainer: {
    marginBottom: 20,
  },
  planCardWithRadio: {
    // 라디오 버튼이 있을 때 추가 스타일 (필요시)
  },
  modalOptionButtonOutlined: {
    borderWidth: 2,
    borderColor: '#FF0073',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  modalOptionButtonPrimary: {
    backgroundColor: '#FF0073',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  modalOptionButtonPrimaryDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionTextOutlined: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF0073',
    fontFamily: 'Pretendard-SemiBold',
  },
  modalOptionTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.WHITE,
    fontFamily: 'Pretendard-SemiBold',
  },
  modalDisclaimer: {
    fontSize: 12,
    color: COLORS.GRAY_500,
    textAlign: 'center',
    fontFamily: 'Pretendard-Regular',
    lineHeight: 16,
    marginTop: 1,
    marginBottom: 0,
  },
  // 플랜 모달 스타일 (더 이상 사용하지 않음)
  plansContainer: {
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: '#FF0073',
    backgroundColor: COLORS.CARD,
  },
  planCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planCardLeft: {
    flex: 1,
    marginRight: 16,
  },
  planCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 12,
    minWidth: 80,
  },
  planCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  planCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 4,
  },
  planName: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.WHITE,
    fontFamily: 'Pretendard-Regular',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.GRAY_500,
  },
  radioButtonSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF0073',
    backgroundColor: '#FF0073',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.WHITE,
  },
  planPriceMain: {
    fontSize: 12,
    color: COLORS.GRAY_400,
    fontFamily: 'Pretendard-Regular',
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.WHITE,
    fontFamily: 'Pretendard-SemiBold',
  },
  planPeriod: {
    fontSize: 14,
    color: COLORS.GRAY_400,
    marginLeft: 4,
    fontFamily: 'Pretendard-Regular',
  },
  planPriceSub: {
    fontSize: 12,
    color: COLORS.GRAY_500,
    fontFamily: 'Pretendard-Regular',
  },
  freeTrialBadge: {
    backgroundColor: '#FF0073',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  freeTrialBadgeText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  discountBadge: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountBadgeText: {
    color: COLORS.BACKGROUND,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  planSelectButton: {
    backgroundColor: '#FF0073',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  planSelectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.WHITE,
    fontFamily: 'Pretendard-SemiBold',
  },
  planDisclaimer: {
    fontSize: 12,
    color: COLORS.GRAY_500,
    textAlign: 'center',
    fontFamily: 'Pretendard-Regular',
    lineHeight: 18,
  },
});

export default PremiumScreen;