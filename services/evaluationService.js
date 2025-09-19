import { getFirestore, doc, updateDoc, getDoc, arrayUnion, increment, setDoc, deleteDoc } from 'firebase/firestore';
import mannerDistanceService from './mannerDistanceService';

class EvaluationService {
  constructor() {
    this.db = getFirestore();
  }

  // 평가 결과를 Firebase에 저장
  async saveEvaluationResults(eventId, evaluations, evaluatorId) {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log('🔍 EvaluationService.saveEvaluationResults 호출됨 (시도:', retryCount + 1, ')');
        console.log('🔍 모임 ID:', eventId);
        console.log('🔍 평가자 ID:', evaluatorId);
        console.log('🔍 환경:', __DEV__ ? 'development' : 'production');
        
        // 평가 데이터 유효성 검증
        if (!eventId || !evaluatorId || !evaluations) {
          throw new Error('필수 평가 데이터가 누락되었습니다.');
        }
        
        // 평가 데이터를 별도의 evaluations 컬렉션에 저장
        const docId = `${eventId}_${evaluatorId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        const evaluationRef = doc(this.db, 'evaluations', docId);
        
        console.log('🔍 평가 데이터 저장 시도:', {
          docId,
          eventId,
          evaluatorId,
          evaluationsCount: Object.keys(evaluations).length
        });
        
        // 평가 데이터 구조
        const evaluationData = {
          eventId,
          evaluatorId,
          timestamp: new Date(),
          evaluations: evaluations,
          isCompleted: true
        };

        // evaluations 컬렉션에 평가 결과 저장 (중복 방지)
        await setDoc(evaluationRef, evaluationData, { merge: true });
        
        console.log('✅ 평가 데이터 저장 완료:', {
          docId,
          eventId,
          evaluatorId,
          isCompleted: true
        });

        console.log('✅ 평가 결과 저장 완료 (시도:', retryCount + 1, ')');

        // 각 참여자의 프로필 통계 업데이트
        await this.updateParticipantStats(evaluations);

        console.log('✅ 평가 시스템 완료 (시도:', retryCount + 1, ')');
        return { success: true };
        
      } catch (error) {
        retryCount++;
        console.error('❌ 평가 저장 실패 (시도:', retryCount, '):', error);
        console.error('❌ 에러 상세:', {
          code: error.code,
          message: error.message,
          environment: __DEV__ ? 'development' : 'production'
        });
        
        if (retryCount >= maxRetries) {
          console.error('❌ 최대 재시도 횟수 초과');
          throw error;
        }
        
        // 1초 대기 후 재시도
        console.log('⏳ 재시도 대기 중... (1초)');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // 참여자들의 통계 업데이트 (기존 시스템 + 매너거리 시스템)
  async updateParticipantStats(evaluations) {
    console.log('🔍 updateParticipantStats 호출됨:', evaluations);
    
    const updatePromises = Object.entries(evaluations).map(async ([participantId, evaluation]) => {
      console.log('🔍 참여자 통계 업데이트 시작:', { participantId, evaluation });
      
      if (!evaluation.mannerScore) {
        console.log('⚠️ mannerScore가 없어서 건너뜀:', participantId);
        return;
      }

      const userRef = doc(this.db, 'users', participantId);
      
      try {
        // 현재 사용자 데이터 가져오기
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          console.warn('⚠️ 사용자 문서가 존재하지 않음 (평가 서비스):', participantId, '- 평가 건너뜀');
          return;
        }

        const userData = userSnap.data();
        const currentStats = userData.communityStats || {
          totalParticipated: 0,
          thisMonthParticipated: 0,
          hostedEvents: 0,
          averageMannerScore: 5.0, // 초기값 5.0으로 설정
          totalMannerScores: 0,
          mannerScoreCount: 0,
          receivedTags: {},
          receivedNegativeTags: {},
          receivedSpecialSituations: {}
        };

        // 매너점수 통계 업데이트 (평균 기반 재계산)
        const currentAverage = currentStats.averageMannerScore;
        const currentCount = currentStats.mannerScoreCount;
        const newCount = currentCount + 1;
        const newAverageScore = (currentAverage * currentCount + evaluation.mannerScore) / newCount;

        // 긍정적 태그 통계 업데이트
        const updatedTags = { ...currentStats.receivedTags };
        console.log('🔍 긍정적 태그 업데이트 시작:', {
          participantId,
          currentTags: currentStats.receivedTags,
          selectedTags: evaluation.selectedTags,
          updatedTags
        });
        
        if (evaluation.selectedTags && evaluation.selectedTags.length > 0) {
          evaluation.selectedTags.forEach(tag => {
            updatedTags[tag] = (updatedTags[tag] || 0) + 1;
            console.log('🔍 긍정적 태그 추가:', { tag, count: updatedTags[tag] });
          });
        } else {
          console.log('⚠️ 선택된 긍정적 태그가 없음:', evaluation.selectedTags);
        }
        
        console.log('🔍 최종 업데이트된 긍정적 태그:', updatedTags);

        // 부정적 태그 통계 업데이트
        const updatedNegativeTags = { ...currentStats.receivedNegativeTags };
        console.log('🔍 부정적 태그 업데이트 시작:', {
          participantId,
          currentNegativeTags: currentStats.receivedNegativeTags,
          selectedNegativeTags: evaluation.negativeTags,
          updatedNegativeTags
        });
        
        if (evaluation.negativeTags && evaluation.negativeTags.length > 0) {
          evaluation.negativeTags.forEach(tag => {
            updatedNegativeTags[tag] = (updatedNegativeTags[tag] || 0) + 1;
            console.log('🔍 부정적 태그 추가:', { tag, count: updatedNegativeTags[tag] });
          });
        } else {
          console.log('⚠️ 선택된 부정적 태그가 없음:', evaluation.negativeTags);
        }
        
        console.log('🔍 최종 업데이트된 부정적 태그:', updatedNegativeTags);

        // 특별상황 통계 업데이트
        const updatedSpecialSituations = { ...currentStats.receivedSpecialSituations };
        console.log('🔍 특별상황 업데이트 시작:', {
          participantId,
          currentSpecialSituations: currentStats.receivedSpecialSituations,
          selectedSpecialSituations: evaluation.specialSituations,
          updatedSpecialSituations
        });
        
        if (evaluation.specialSituations && evaluation.specialSituations.length > 0) {
          evaluation.specialSituations.forEach(situation => {
            updatedSpecialSituations[situation] = (updatedSpecialSituations[situation] || 0) + 1;
            console.log('🔍 특별상황 추가:', { situation, count: updatedSpecialSituations[situation] });
          });
        } else {
          console.log('⚠️ 선택된 특별상황이 없음:', evaluation.specialSituations);
        }
        
        console.log('🔍 최종 업데이트된 특별상황:', updatedSpecialSituations);

        // 업데이트할 데이터 (기존 시스템)
        const updatedStats = {
          communityStats: {
            ...currentStats,
            averageMannerScore: Math.round(newAverageScore * 10) / 10, // 소수점 첫째자리까지
            mannerScoreCount: newCount,
            receivedTags: updatedTags,
            receivedNegativeTags: updatedNegativeTags,
            receivedSpecialSituations: updatedSpecialSituations
          }
        };

        console.log('📊 통계 업데이트 데이터:', {
          participantId,
          currentAverage,
          currentCount,
          newScore: evaluation.mannerScore,
          newAverageScore,
          newCount,
          updatedTags,
          updatedStats
        });

        await updateDoc(userRef, updatedStats);
        console.log('✅ 사용자 통계 업데이트 완료:', participantId);
        
        // 매너거리 시스템 업데이트
        try {
          const distanceChange = mannerDistanceService.calculateDistanceChange(evaluation);
          const evaluationData = {
            positiveTags: evaluation.selectedTags || [],
            negativeTags: evaluation.negativeTags || [],
            specialSituations: evaluation.specialSituations || []
          };
          
          await mannerDistanceService.updateUserMannerDistance(
            participantId, 
            distanceChange, 
            evaluationData
          );
          
          console.log('✅ 매너거리 업데이트 완료:', { participantId, distanceChange });
        } catch (mannerDistanceError) {
          console.error('❌ 매너거리 업데이트 실패:', mannerDistanceError);
          // 매너거리 업데이트 실패해도 기존 시스템은 정상 동작하도록 함
        }
        
        // 업데이트 후 데이터 확인
        const updatedUserSnap = await getDoc(userRef);
        if (updatedUserSnap.exists()) {
          const updatedUserData = updatedUserSnap.data();
          console.log('🔍 업데이트 후 사용자 데이터:', {
            participantId,
            communityStats: updatedUserData.communityStats,
            mannerDistance: updatedUserData.mannerDistance
          });
        }
      } catch (error) {
        console.error(`사용자 ${participantId} 통계 업데이트 실패:`, error);
      }
    });

    await Promise.all(updatePromises);
  }


  // 특정 사용자가 특정 모임에 대해 평가를 완료했는지 확인
  async isEvaluationCompleted(eventId, evaluatorId) {
    try {
      console.log('🔍 isEvaluationCompleted 호출:', { eventId, evaluatorId });
      
      // 입력값 유효성 검증
      if (!eventId || !evaluatorId) {
        console.warn('⚠️ isEvaluationCompleted - 필수 파라미터 누락:', { eventId, evaluatorId });
        return false;
      }
      
      // 문서 ID 생성 (특수문자 처리)
      const docId = `${eventId}_${evaluatorId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      console.log('🔍 생성된 문서 ID:', docId);
      
      const evaluationRef = doc(this.db, 'evaluations', docId);
      const evaluationSnap = await getDoc(evaluationRef);
      
      if (!evaluationSnap.exists()) {
        console.log('📄 평가 문서가 존재하지 않음:', docId);
        return false;
      }
      
      const evaluationData = evaluationSnap.data();
      const isCompleted = evaluationData.isCompleted === true;
      
      console.log('✅ 평가 완료 상태 확인:', {
        docId,
        isCompleted,
        evaluationData: {
          eventId: evaluationData.eventId,
          evaluatorId: evaluationData.evaluatorId,
          isCompleted: evaluationData.isCompleted,
          timestamp: evaluationData.timestamp
        }
      });
      
      return isCompleted;
    } catch (error) {
      console.error('❌ isEvaluationCompleted 오류:', error);
      console.error('❌ 오류 상세:', {
        eventId,
        evaluatorId,
        errorMessage: error.message,
        errorCode: error.code
      });
      return false; // 오류 시 false 반환 (안전한 기본값)
    }
  }

  // 사용자의 커뮤니티 통계 가져오기
  async getUserCommunityStats(userId) {
    try {
      const userRef = doc(this.db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return {
          totalParticipated: 0,
          thisMonthParticipated: 0,
          hostedEvents: 0,
          averageMannerScore: 5.0, // 초기값 5.0
          receivedTags: {},
          receivedNegativeTags: {},
          receivedSpecialSituations: {}
        };
      }

      const userData = userSnap.data();
      return userData.communityStats || {
        totalParticipated: 0,
        thisMonthParticipated: 0,
        hostedEvents: 0,
        averageMannerScore: 5.0, // 초기값 5.0
        receivedTags: {},
        receivedNegativeTags: {},
        receivedSpecialSituations: {}
      };
    } catch (error) {
      console.error('커뮤니티 통계 가져오기 실패:', error);
      return {
        totalParticipated: 0,
        thisMonthParticipated: 0,
        hostedEvents: 0,
        averageMannerScore: 0,
        receivedTags: {},
        receivedNegativeTags: {},
        receivedSpecialSituations: {}
      };
    }
  }

  // 참여 모임 수 업데이트 (모임 참여 시 호출)
  async incrementParticipationCount(userId, isHost = false) {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log('📊 EvaluationService - 참여 카운트 업데이트 시작 (시도:', retryCount + 1, ')');
        console.log('📊 사용자 ID:', userId, '호스트 여부:', isHost);
        console.log('🔍 환경:', __DEV__ ? 'development' : 'production');
        
        const userRef = doc(this.db, 'users', userId);
        
        const updateData = {
          'communityStats.totalParticipated': increment(1),
          'communityStats.thisMonthParticipated': increment(1) // 이번달 참여 카운트 증가
        };

        if (isHost) {
          updateData['communityStats.hostedEvents'] = increment(1);
          // 모임 생성도 이번달 참여에 포함되므로 추가 증가
          updateData['communityStats.thisMonthParticipated'] = increment(1);
        }

        console.log('📊 EvaluationService - 업데이트 데이터:', updateData);
        await updateDoc(userRef, updateData);
        
        console.log('✅ EvaluationService - 참여 카운트 업데이트 완료 (시도:', retryCount + 1, ')');
        return;
        
      } catch (error) {
        retryCount++;
        console.error('❌ 참여 수 업데이트 실패 (시도:', retryCount, '):', error);
        console.error('❌ 에러 상세:', {
          code: error.code,
          message: error.message,
          environment: __DEV__ ? 'development' : 'production'
        });
        
        if (retryCount >= maxRetries) {
          console.error('❌ 최대 재시도 횟수 초과');
          return; // 실패해도 앱 동작에 영향 없도록 return
        }
        
        // 1초 대기 후 재시도
        console.log('⏳ 재시도 대기 중... (1초)');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}

export default new EvaluationService(); 