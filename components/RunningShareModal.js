import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import RunningShareCard from './RunningShareCard';
import { getEnglishLocation } from '../utils/locationMapper';
import appleFitnessService from '../services/appleFitnessService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const RunningShareModal = ({ 
  visible, 
  onClose, 
  workoutData, 
  eventData,
  onShareComplete 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(false);
  const [actualWorkoutData, setActualWorkoutData] = useState(null);
  const shareCardRef = useRef(null);

  // 권한 요청
  useEffect(() => {
    const requestPermission = async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    requestPermission();
  }, []);

  // 실제 운동기록 데이터 가져오기
  useEffect(() => {
    if (visible && eventData) {
      fetchActualWorkoutData();
    }
  }, [visible, eventData]);

  const fetchActualWorkoutData = async () => {
    try {
      setIsLoadingWorkout(true);
      console.log('🔍 실제 운동기록 데이터 조회 시작:', eventData);
      
      const workoutData = await appleFitnessService.findMatchingWorkout(eventData);
      
      if (workoutData) {
        console.log('✅ 매칭되는 운동기록 발견:', workoutData);
        setActualWorkoutData(workoutData);
      } else {
        console.log('❌ 매칭되는 운동기록 없음');
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
      console.error('❌ 운동기록 데이터 조회 실패:', error);
      Alert.alert(
        '데이터 조회 실패',
        '운동기록을 가져오는 중 오류가 발생했습니다.',
        [
          { text: '확인', onPress: onClose }
        ]
      );
    } finally {
      setIsLoadingWorkout(false);
    }
  };

  // 공유카드 데이터 준비 (실제 운동기록 우선 사용)
  const shareCardData = actualWorkoutData ? {
    distance: actualWorkoutData.distance || 0,
    pace: actualWorkoutData.pace || '0:00',
    duration: actualWorkoutData.duration || 0,
    location: getEnglishLocation(eventData?.location || '한강'),
    calories: actualWorkoutData.calories || 0,
    routeCoordinates: actualWorkoutData.routeCoordinates || []
  } : {
    // fallback: 기존 데이터 사용
    distance: workoutData?.distance || 0,
    pace: workoutData?.pace || '0:00',
    duration: workoutData?.duration || 0,
    location: getEnglishLocation(eventData?.location || '한강'),
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
        result: 'tmpfile'
        // backgroundColor 제거 - 투명 배경으로 저장
      });

      // 갤러리에 저장
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('RunOn', asset, false);

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
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.bottomModalContainer}>
          <View style={styles.modalContainer}>
            {/* 헤더 */}
            <View style={styles.header}>
              <Text style={styles.title}>러닝 기록 공유</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            {/* 구분선 */}
            <View style={styles.headerDivider} />

            {/* 공유카드 */}
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

             {/* 액션 버튼 */}
             <View style={styles.actionButtons}>
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
             </View>

            {/* 하단 안내 텍스트 */}
            <Text style={styles.helpText}>
              러닝 기록을 갤러리에 저장할 수 있습니다
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomModalContainer: {
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
});

export default RunningShareModal;

