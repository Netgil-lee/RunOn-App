import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Dimensions,
  TextInput,
  Animated,
  Platform,
  InteractionManager,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  LayoutAnimation,
  UIManager,
} from 'react-native';

// Android에서 LayoutAnimation 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import RunningShareCard from './RunningShareCard';
import { getEnglishLocation } from '../utils/locationMapper';
import appleFitnessService from '../services/appleFitnessService';
import garminConnectService from '../services/garminConnectService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const detectWorkoutSourceType = (...candidates) => {
  for (const candidate of candidates) {
    const text = `${candidate || ''}`.trim().toLowerCase();
    if (!text) continue;
    if (text.includes('runon')) return 'runon';
    if (text.includes('apple')) return 'apple';
    if (text.includes('fitness')) return 'apple';
    if (text.includes('health')) return 'apple';
    if (text.includes('garmin')) return 'garmin';
  }
  return 'unknown';
};

const normalizeWorkoutData = (data) => ({
  distance: data?.distance || '0m',
  pace: data?.pace || '0:00/km',
  duration: data?.duration || '0s',
  calories: data?.calories || 0,
  routeCoordinates: Array.isArray(data?.routeCoordinates) ? data.routeCoordinates : [],
});

const RunningShareModal = ({ 
  visible, 
  onClose, 
  workoutData, 
  eventData,
  workoutSource = null,
  presetWorkoutData = null,
  onShareComplete 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(false);
  const [actualWorkoutData, setActualWorkoutData] = useState(null);
  const [customPlace, setCustomPlace] = useState('');
  const [hasEnteredPlace, setHasEnteredPlace] = useState(false);
  const [dataSource, setDataSource] = useState('apple'); // 'apple' | 'garmin'
  const shareCardRef = useRef(null);
  const placeInputRef = useRef(null);
  const localWorkoutData = normalizeWorkoutData(presetWorkoutData || workoutData);
  const detectedSource = detectWorkoutSourceType(
    workoutSource,
    presetWorkoutData?.sourceLabel,
    presetWorkoutData?.sourceName,
    workoutData?.sourceLabel,
    workoutData?.sourceName
  );
  const shouldUseRunOnLocalData = detectedSource === 'runon';
  
  // 모달 오버레이 페이드 애니메이션
  const modalBackdropOpacity = useRef(new Animated.Value(0)).current;
  // 모달 슬라이드 애니메이션
  const modalSlideAnim = useRef(new Animated.Value(300)).current;

  // 권한 요청
  useEffect(() => {
    const requestPermission = async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    requestPermission();
  }, []);

  // 모달이 열릴 때 상태 초기화 및 애니메이션
  useEffect(() => {
    if (visible) {
      setCustomPlace('');
      setHasEnteredPlace(false);
      setActualWorkoutData(null);
      
      // 모달 슬라이드 초기 위치 설정
      modalSlideAnim.setValue(300);
      
      // 배경 페이드 인 + 모달 슬라이드 업 동시 애니메이션
      Animated.parallel([
        Animated.timing(modalBackdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(modalSlideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, modalBackdropOpacity, modalSlideAnim]);

  // 키보드 애니메이션 부드럽게 처리
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        LayoutAnimation.configureNext({
          duration: 250,
          create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
          update: { type: LayoutAnimation.Types.easeInEaseOut },
        });
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        LayoutAnimation.configureNext({
          duration: 200,
          create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
          update: { type: LayoutAnimation.Types.easeInEaseOut },
        });
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // 부드러운 닫기 애니메이션
  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    
    // 배경 페이드 아웃 + 모달 슬라이드 다운 동시 애니메이션
    Animated.parallel([
      Animated.timing(modalBackdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalSlideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 애니메이션 완료 후 모달 닫기
      onClose();
    });
  }, [modalBackdropOpacity, modalSlideAnim, onClose]);

  // 실제 운동기록 데이터 가져오기 (place 입력 후에만 실행)
  useEffect(() => {
    if (!visible || !hasEnteredPlace) return;
    if (shouldUseRunOnLocalData) return;
    if (eventData) {
      fetchActualWorkoutData();
    }
  }, [visible, eventData, hasEnteredPlace, dataSource, shouldUseRunOnLocalData]);

  const fetchActualWorkoutData = async () => {
    try {
      setIsLoadingWorkout(true);
      console.log('🔍 [RunningShareModal] 실제 운동기록 데이터 조회 시작', { dataSource });
      console.log('🔍 [RunningShareModal] eventData:', JSON.stringify(eventData, null, 2));

      let workoutData = null;

      if (dataSource === 'garmin' && garminConnectService.isServiceAvailable()) {
        console.log('🔍 [RunningShareModal] Garmin Connect로 조회');
        workoutData = await garminConnectService.findMatchingWorkout(eventData);
      } else {
        const isAvailable = appleFitnessService.isServiceAvailable();
        console.log('🔍 [RunningShareModal] HealthKit 서비스 사용 가능:', isAvailable);

        if (!isAvailable) {
          console.warn('⚠️ [RunningShareModal] HealthKit 서비스가 사용 불가능합니다. 초기화 시도...');
          const initialized = await appleFitnessService.initialize();
          console.log('🔍 [RunningShareModal] HealthKit 초기화 결과:', initialized);
        }

        workoutData = await appleFitnessService.findMatchingWorkout(eventData);
      }

      console.log('🔍 [RunningShareModal] findMatchingWorkout 결과:', workoutData ? '성공' : '실패');
      
      if (workoutData) {
        console.log('✅ [RunningShareModal] 매칭되는 운동기록 발견:', JSON.stringify(workoutData, null, 2));
        setActualWorkoutData(workoutData);
      } else {
        console.log('❌ [RunningShareModal] 매칭되는 운동기록 없음');
        Alert.alert(
          '운동기록 없음',
          '해당 시간대에 일치하는 운동기록이 없습니다.\n(모임 시간 ±30분 범위 내)',
          [
            { text: '확인', onPress: onClose }
          ]
        );
        return;
      }
    } catch (error) {
      console.error('❌ [RunningShareModal] 운동기록 데이터 조회 실패:', error);
      console.error('❌ [RunningShareModal] 에러 상세:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      Alert.alert(
        '데이터 조회 실패',
        '운동기록을 가져오는 중 오류가 발생했습니다.',
        [
          { text: '확인', onPress: onClose }
        ]
      );
    } finally {
      setIsLoadingWorkout(false);
      console.log('🔍 [RunningShareModal] fetchActualWorkoutData 완료');
    }
  };

  // place 입력 처리
  const handlePlaceSubmit = () => {
    if (!customPlace.trim()) {
      Alert.alert('입력 필요', 'Place를 입력해주세요.');
      return;
    }
    if (shouldUseRunOnLocalData || presetWorkoutData) {
      setActualWorkoutData(localWorkoutData);
    }
    setHasEnteredPlace(true);
  };

  // 공유카드 데이터 준비 (실제 운동기록 우선 사용)
  const shareCardData = actualWorkoutData ? {
    distance: actualWorkoutData.distance || 0,
    pace: actualWorkoutData.pace || '0:00',
    duration: actualWorkoutData.duration || 0,
    location: customPlace || getEnglishLocation(eventData?.location || '한강'),
    calories: actualWorkoutData.calories || 0,
    routeCoordinates: actualWorkoutData.routeCoordinates || []
  } : {
    // fallback: 기존 데이터 사용
    distance: workoutData?.distance || 0,
    pace: workoutData?.pace || '0:00',
    duration: workoutData?.duration || 0,
    location: customPlace || getEnglishLocation(eventData?.location || '한강'),
    calories: workoutData?.calories || 0,
    routeCoordinates: workoutData?.routeCoordinates || []
  };

  // 이미지 생성 및 저장
  const handleSaveImage = async () => {
    if (!hasPermission) {
      Alert.alert(
        '권한 필요',
        '사진을 저장하려면 갤러리 접근 권한이 필요합니다.',
        [
          { text: '취소', style: 'cancel' },
          { text: '설정', onPress: () => {
            // 설정 앱으로 이동하는 로직 (필요시)
          }}
        ]
      );
      return;
    }

    try {
      setIsGenerating(true);
      
      // 공유카드 이미지 생성
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
        // iOS에서 SVG(경로 라인) 캡처 안정성 개선
        useRenderInContext: Platform.OS === 'ios',
        // backgroundColor 제거 - 투명 배경으로 저장
      });

      // 갤러리에 저장 (앨범 생성 실패와 저장 실패를 분리)
      const asset = await MediaLibrary.createAssetAsync(uri);
      try {
        const existingAlbum = await MediaLibrary.getAlbumAsync('RunOn');
        if (existingAlbum) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], existingAlbum, false);
        } else {
          await MediaLibrary.createAlbumAsync('RunOn', asset, false);
        }
      } catch (albumError) {
        // 앨범 처리 실패 시에도 asset 자체는 저장됐을 수 있으므로 성공 흐름 유지
        console.warn('⚠️ RunOn 앨범 처리 실패(기본 사진첩 저장은 성공):', albumError);
      }

      Alert.alert(
        '저장 완료',
        '러닝 기록이 갤러리에 저장되었습니다!',
        [{ text: '확인' }]
      );

      // 공유 완료 콜백 호출
      if (onShareComplete) {
        onShareComplete();
      }

    } catch (error) {
      console.error('이미지 저장 실패:', error);
      Alert.alert(
        '저장 실패',
        '이미지 저장 중 오류가 발생했습니다.',
        [{ text: '확인' }]
      );
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
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
            onPressIn={handleClose}
          />
        </Animated.View>
        <KeyboardAvoidingView 
          style={styles.bottomModalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContentContainer}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[
              styles.modalContainer,
              { transform: [{ translateY: modalSlideAnim }] }
            ]}>
              {/* 헤더 */}
              <View style={styles.header}>
                <Text style={styles.title}>러닝 기록 공유</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPressIn={handleClose}
                >
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
            
              {/* 구분선 */}
              <View style={styles.headerDivider} />

              {!hasEnteredPlace ? (
                /* Place 입력 화면 */
                <View style={styles.inputContainer}>
                  {!presetWorkoutData && garminConnectService.isServiceAvailable() && (
                    <View style={styles.dataSourceRow}>
                      <Text style={styles.inputLabel}>데이터 소스</Text>
                      <View style={styles.dataSourceButtons}>
                        <TouchableOpacity
                          style={[styles.dataSourceButton, dataSource === 'apple' && styles.dataSourceButtonActive]}
                          onPress={() => setDataSource('apple')}
                        >
                          <Text style={[styles.dataSourceButtonText, dataSource === 'apple' && styles.dataSourceButtonTextActive]}>
                            Apple Fitness
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.dataSourceButton, dataSource === 'garmin' && styles.dataSourceButtonActive]}
                          onPress={() => setDataSource('garmin')}
                        >
                          <Text style={[styles.dataSourceButtonText, dataSource === 'garmin' && styles.dataSourceButtonTextActive]}>
                            Garmin Connect
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  <Text style={styles.inputLabel}>place를 입력해주세요</Text>
                  <TextInput
                    ref={placeInputRef}
                    style={styles.placeInput}
                    placeholder="Enter place (English only)"
                    placeholderTextColor="#666666"
                    value={customPlace}
                    onChangeText={(text) => {
                      // 영어, 숫자, 공백, 특수문자만 허용
                      const englishOnly = text.replace(/[^a-zA-Z0-9\s\-_.,!?]/g, '');
                      setCustomPlace(englishOnly);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus={false}
                    returnKeyType="done"
                    onSubmitEditing={handlePlaceSubmit}
                    blurOnSubmit={false}
                  />
                </View>
              ) : (
                /* 공유카드 */
                <View style={styles.cardContainer}>
                  {isLoadingWorkout ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loadingText}>운동기록을 조회하는 중...</Text>
                    </View>
                  ) : (
                    <RunningShareCard
                      ref={shareCardRef}
                      distance={shareCardData.distance}
                      pace={shareCardData.pace}
                      duration={shareCardData.duration}
                      location={shareCardData.location}
                      calories={shareCardData.calories}
                      routeCoordinates={shareCardData.routeCoordinates}
                    />
                  )}
                </View>
              )}

              {/* 액션 버튼 */}
              <View style={styles.actionButtons}>
                {!hasEnteredPlace ? (
                  /* 입력 버튼 */
                  <TouchableOpacity 
                    style={[
                      styles.actionButton, 
                      styles.saveButton,
                      !customPlace.trim() && styles.disabledButton
                    ]}
                    onPress={handlePlaceSubmit}
                    disabled={!customPlace.trim()}
                  >
                    <Text style={styles.saveButtonText}>입력</Text>
                  </TouchableOpacity>
                ) : (
                  /* 이미지 저장 버튼 */
                  <TouchableOpacity 
                    style={[
                      styles.actionButton, 
                      styles.saveButton,
                      (isGenerating || isLoadingWorkout || !actualWorkoutData) && styles.disabledButton
                    ]}
                    onPress={handleSaveImage}
                    disabled={isGenerating || isLoadingWorkout || !actualWorkoutData}
                  >
                    <Ionicons name="download" size={20} color="#000000" />
                    <Text style={styles.saveButtonText}>
                      {isGenerating ? '저장 중...' : 
                       isLoadingWorkout ? '데이터 조회 중...' : 
                       !actualWorkoutData ? '데이터 없음' : '이미지 저장'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 하단 안내 텍스트 */}
              <Text style={styles.helpText}>
                러닝 기록을 갤러리에 저장할 수 있습니다
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: screenWidth,
    backgroundColor: '#1F1F24',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34, // 하단 안전 영역 고려
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Pretendard-Bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#333333',
    width: '100%',
  },
  cardContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    width: '100%', // 구분선과 동일한 너비
  },
  saveButton: {
    backgroundColor: '#3AF8FF',
  },
  disabledButton: {
    backgroundColor: '#666666',
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'Pretendard-SemiBold',
  },
  helpText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Pretendard-Regular',
  },
  loadingContainer: {
    width: 300,
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'Pretendard-Regular',
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    paddingVertical: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'Pretendard-SemiBold',
    marginBottom: 12,
    textAlign: 'center',
  },
  placeInput: {
    width: '100%',
    height: 48,
    backgroundColor: '#333333',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'Pretendard-Regular',
    borderWidth: 1,
    borderColor: '#444444',
  },
  dataSourceRow: {
    marginBottom: 16,
  },
  dataSourceButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  dataSourceButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#333333',
    alignItems: 'center',
  },
  dataSourceButtonActive: {
    backgroundColor: '#3AF8FF',
  },
  dataSourceButtonText: {
    fontSize: 14,
    color: '#999999',
    fontFamily: 'Pretendard-Regular',
  },
  dataSourceButtonTextActive: {
    color: '#000000',
    fontFamily: 'Pretendard-SemiBold',
  },
});

export default RunningShareModal;

