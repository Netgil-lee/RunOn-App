import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  getFirestore,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

class MannerDistanceService {
  constructor() {
    this.db = getFirestore();
  }

  // 기존 사용자 데이터를 매너거리로 마이그레이션
  async migrateUserToMannerDistance(userId) {
    try {
      console.log('🔄 매너거리 마이그레이션 시작:', userId);
      
      const userRef = doc(this.db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.log('❌ 사용자 문서가 존재하지 않음:', userId);
        return null;
      }

      const userData = userSnap.data();
      const communityStats = userData.communityStats || {};
      
      // 매너거리 계산
      const mannerDistance = this.calculateMannerDistance(communityStats);
      
      // 매너거리 데이터 업데이트
      await updateDoc(userRef, {
        mannerDistance: {
          currentDistance: mannerDistance.currentDistance,
          totalEvaluations: mannerDistance.totalEvaluations,
          positiveTags: mannerDistance.positiveTags,
          negativeTags: mannerDistance.negativeTags,
          lastUpdated: new Date().toISOString()
        }
      });

      console.log('✅ 매너거리 마이그레이션 완료:', {
        userId,
        mannerDistance
      });

      return mannerDistance;
    } catch (error) {
      console.error('❌ 매너거리 마이그레이션 실패:', error);
      throw error;
    }
  }

  // 매너거리 계산 로직
  calculateMannerDistance(communityStats) {
    // 1. 기준점 10km
    let baseDistance = 10;
    
    // 2. 평가 횟수 보너스 (1회당 0.1km, 최대 2km)
    const evaluationCount = communityStats.mannerScoreCount || 0;
    const evaluationBonus = Math.min(evaluationCount * 0.1, 2);
    
    // 3. 참여 보너스
    let participationBonus = 0;
    const totalParticipated = communityStats.totalParticipated || 0;
    if (totalParticipated >= 10) participationBonus = 1.0;
    else if (totalParticipated >= 5) participationBonus = 0.5;
    
    // 4. 주최 보너스
    let hostingBonus = 0;
    const hostedEvents = communityStats.hostedEvents || 0;
    if (hostedEvents >= 5) hostingBonus = 1.0;
    else if (hostedEvents >= 2) hostingBonus = 0.5;
    
    // 5. 태그 보너스 (긍정적 태그 3개 이상 시 +0.2km)
    const receivedTags = communityStats.receivedTags || {};
    const totalTags = Object.keys(receivedTags).length;
    let tagBonus = 0;
    if (totalTags >= 3) tagBonus = 0.2;
    
    // 6. 최종 거리 계산
    const finalDistance = baseDistance + evaluationBonus + participationBonus + hostingBonus + tagBonus;
    
    return {
      currentDistance: Math.round(finalDistance * 10) / 10,
      totalEvaluations: evaluationCount,
      positiveTags: totalTags,
      negativeTags: 0, // 기존 데이터에는 부정적 태그가 없으므로 0
      lastUpdated: new Date().toISOString()
    };
  }

  // 사용자 매너거리 조회
  async getUserMannerDistance(userId) {
    try {
      const userRef = doc(this.db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return null;
      }

      const userData = userSnap.data();
      return userData.mannerDistance || null;
    } catch (error) {
      console.error('❌ 매너거리 조회 실패:', error);
      throw error;
    }
  }

  // 거리 변화량 계산
  calculateDistanceChange(evaluation) {
    let totalChange = 0;
    
    // 1. 기본 변화량 (매너점수)
    const scoreChanges = {
      5: 1.0,
      4: 0.7,
      3: 0.5,
      2: -0.5,
      1: -0.7
    };
    totalChange += scoreChanges[evaluation.mannerScore] || 0;
    
    // 2. 특별 상황
    if (evaluation.specialSituations && evaluation.specialSituations.length > 0) {
      evaluation.specialSituations.forEach(situation => {
        const situationChanges = {
          "노쇼": -1.0,
          "지각": -0.3,
          "부적절한 행동": -1.0
        };
        totalChange += situationChanges[situation] || 0;
      });
    }
    
    return Math.round(totalChange * 10) / 10; // 소수점 첫째자리까지
  }

  // 사용자 매너거리 업데이트
  async updateUserMannerDistance(userId, distanceChange, evaluationData = {}) {
    try {
      console.log('🔄 매너거리 업데이트 시작:', { userId, distanceChange, evaluationData });
      
      const userRef = doc(this.db, 'users', userId);
      
      // 현재 매너거리 조회
      const currentMannerDistance = await this.getUserMannerDistance(userId);
      
      if (!currentMannerDistance) {
        console.log('⚠️ 매너거리 데이터가 없음, 마이그레이션 필요:', userId);
        await this.migrateUserToMannerDistance(userId);
        return;
      }
      
      // 새로운 거리 계산
      let newDistance = Math.max(0, currentMannerDistance.currentDistance + distanceChange);
      newDistance = Math.min(42.195, newDistance); // 최대 42.195km
      
      // 태그 카운트 업데이트
      let positiveTags = currentMannerDistance.positiveTags || 0;
      let negativeTags = currentMannerDistance.negativeTags || 0;
      
      if (evaluationData.positiveTags) {
        positiveTags += evaluationData.positiveTags.length;
      }
      if (evaluationData.negativeTags) {
        negativeTags += evaluationData.negativeTags.length;
      }
      
      // 매너거리 업데이트
      await updateDoc(userRef, {
        'mannerDistance.currentDistance': newDistance,
        'mannerDistance.totalEvaluations': increment(1),
        'mannerDistance.positiveTags': positiveTags,
        'mannerDistance.negativeTags': negativeTags,
        'mannerDistance.lastUpdated': new Date().toISOString()
      });

      console.log('✅ 매너거리 업데이트 완료:', {
        userId,
        oldDistance: currentMannerDistance.currentDistance,
        newDistance,
        change: distanceChange
      });

      return {
        oldDistance: currentMannerDistance.currentDistance,
        newDistance,
        change: distanceChange
      };
    } catch (error) {
      console.error('❌ 매너거리 업데이트 실패:', error);
      throw error;
    }
  }

  // 모든 사용자 매너거리 마이그레이션 (관리자용)
  async migrateAllUsers() {
    try {
      console.log('🔄 전체 사용자 매너거리 마이그레이션 시작');
      
      const usersRef = collection(this.db, 'users');
      const usersSnap = await getDocs(usersRef);
      
      const migrationPromises = [];
      
      usersSnap.forEach((doc) => {
        const userId = doc.id;
        migrationPromises.push(this.migrateUserToMannerDistance(userId));
      });
      
      await Promise.all(migrationPromises);
      
      console.log('✅ 전체 사용자 매너거리 마이그레이션 완료');
    } catch (error) {
      console.error('❌ 전체 사용자 매너거리 마이그레이션 실패:', error);
      throw error;
    }
  }
}

export default new MannerDistanceService();
