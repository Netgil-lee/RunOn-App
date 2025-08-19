import { getFirestore, doc, updateDoc, getDoc, arrayUnion, increment } from 'firebase/firestore';

class EvaluationService {
  constructor() {
    this.db = getFirestore();
  }

  // 평가 결과를 Firebase에 저장
  async saveEvaluationResults(meetingId, evaluations, evaluatorId) {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log('🔍 EvaluationService.saveEvaluationResults 호출됨 (시도:', retryCount + 1, ')');
        console.log('🔍 모임 ID:', meetingId);
        console.log('🔍 평가자 ID:', evaluatorId);
        console.log('🔍 환경:', __DEV__ ? 'development' : 'production');
        
        const meetingRef = doc(this.db, 'meetings', meetingId);
        
        // 평가 데이터 구조
        const evaluationData = {
          evaluatorId,
          timestamp: new Date(),
          evaluations: evaluations
        };

        // 모임 문서에 평가 결과 추가
        await updateDoc(meetingRef, {
          evaluations: arrayUnion(evaluationData)
        });

        console.log('✅ 모임 평가 결과 저장 완료 (시도:', retryCount + 1, ')');

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

  // 참여자들의 통계 업데이트
  async updateParticipantStats(evaluations) {
    const updatePromises = Object.entries(evaluations).map(async ([participantId, evaluation]) => {
      if (!evaluation.mannerScore) return;

      const userRef = doc(this.db, 'users', participantId);
      
      try {
        // 현재 사용자 데이터 가져오기
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;

        const userData = userSnap.data();
        const currentStats = userData.communityStats || {
          totalParticipated: 0,
          thisMonthParticipated: 0,
          hostedEvents: 0,
          averageMannerScore: 5.0, // 초기값 5.0으로 설정
          totalMannerScores: 0,
          mannerScoreCount: 0,
          receivedTags: {}
        };

        // 매너점수 통계 업데이트 (평균 기반 재계산)
        const currentAverage = currentStats.averageMannerScore;
        const currentCount = currentStats.mannerScoreCount;
        const newCount = currentCount + 1;
        const newAverageScore = (currentAverage * currentCount + evaluation.mannerScore) / newCount;

        // 태그 통계 업데이트
        const updatedTags = { ...currentStats.receivedTags };
        if (evaluation.selectedTags) {
          evaluation.selectedTags.forEach(tag => {
            updatedTags[tag] = (updatedTags[tag] || 0) + 1;
          });
        }

        // 업데이트할 데이터
        const updatedStats = {
          communityStats: {
            ...currentStats,
            averageMannerScore: Math.round(newAverageScore * 10) / 10, // 소수점 첫째자리까지
            mannerScoreCount: newCount,
            receivedTags: updatedTags
          }
        };

        await updateDoc(userRef, updatedStats);
      } catch (error) {
        console.error(`사용자 ${participantId} 통계 업데이트 실패:`, error);
      }
    });

    await Promise.all(updatePromises);
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
          receivedTags: {}
        };
      }

      const userData = userSnap.data();
      return userData.communityStats || {
        totalParticipated: 0,
        thisMonthParticipated: 0,
        hostedEvents: 0,
        averageMannerScore: 5.0, // 초기값 5.0
        receivedTags: {}
      };
    } catch (error) {
      console.error('커뮤니티 통계 가져오기 실패:', error);
      return {
        totalParticipated: 0,
        thisMonthParticipated: 0,
        hostedEvents: 0,
        averageMannerScore: 0,
        receivedTags: {}
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