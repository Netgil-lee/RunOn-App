// 태그 삭제 후 사용자 통계 재계산 스크립트
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  updateDoc,
  where 
} from 'firebase/firestore';

// Firebase 설정 (실제 프로젝트 설정)
const firebaseConfig = {
  apiKey: "AIzaSyDq24FyKrDTtomyNMcC3gZB7eqpr0OGZCg",
  authDomain: "runon-production-app.firebaseapp.com",
  projectId: "runon-production-app",
  storageBucket: "runon-production-app.firebasestorage.app",
  messagingSenderId: "936820129286",
  appId: "1:936820129286:ios:1edd25b1f1cef603b14d87"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 재계산할 사용자 ID 목록
const USER_IDS = [
  'qSSWc2oRD1SNnOyOFwbd86nr5Gl1',
  'a1lNYDm7xseeUKsqF0CuUaZPuDs2',
  'Tev9dNctZWew5pYBmE8nWHElLlN2',
  'FZau1omNXgWasFQumkFWH2VPRVA2'
];

/**
 * 특정 사용자에 대한 모든 평가 데이터를 수집하여 통계 재계산
 */
async function recalculateUserStats(userId) {
  try {
    console.log(`\n🔄 사용자 통계 재계산 시작: ${userId}`);
    
    // 1. 사용자 문서 가져오기
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log(`⚠️ 사용자 문서가 존재하지 않음: ${userId}`);
      return;
    }
    
    const userData = userSnap.data();
    const currentStats = userData.communityStats || {
      totalParticipated: 0,
      thisMonthParticipated: 0,
      hostedEvents: 0,
      averageMannerScore: 5.0,
      mannerScoreCount: 0,
      receivedTags: {},
      receivedNegativeTags: {},
      receivedSpecialSituations: {}
    };
    
    console.log(`📊 현재 통계:`, {
      mannerScoreCount: currentStats.mannerScoreCount,
      averageMannerScore: currentStats.averageMannerScore,
      negativeTagsCount: Object.keys(currentStats.receivedNegativeTags || {}).length,
      specialSituationsCount: Object.keys(currentStats.receivedSpecialSituations || {}).length
    });
    
    // 2. evaluations 컬렉션에서 해당 사용자를 평가한 모든 평가 찾기
    console.log(`🔍 평가 데이터 수집 중...`);
    
    const evaluationsQuery = query(collection(db, 'evaluations'));
    const evaluationsSnapshot = await getDocs(evaluationsQuery);
    
    // 통계 집계용 변수
    let totalMannerScore = 0;
    let mannerScoreCount = 0;
    const receivedTags = {};
    const receivedNegativeTags = {};
    const receivedSpecialSituations = {};
    
    // 3. 모든 평가 문서를 순회하며 해당 사용자에 대한 평가 수집
    let foundEvaluations = 0;
    
    for (const evalDoc of evaluationsSnapshot.docs) {
      const evalData = evalDoc.data();
      const evaluations = evalData.evaluations || {};
      
      // evaluations 객체에서 해당 사용자 ID 찾기
      if (evaluations[userId]) {
        foundEvaluations++;
        const evaluation = evaluations[userId];
        
        // 매너점수 집계
        if (evaluation.mannerScore && evaluation.mannerScore > 0) {
          totalMannerScore += evaluation.mannerScore;
          mannerScoreCount++;
        }
        
        // 긍정적 태그 집계
        if (evaluation.selectedTags && Array.isArray(evaluation.selectedTags)) {
          evaluation.selectedTags.forEach(tag => {
            receivedTags[tag] = (receivedTags[tag] || 0) + 1;
          });
        }
        
        // 부정적 태그 집계
        if (evaluation.negativeTags && Array.isArray(evaluation.negativeTags)) {
          evaluation.negativeTags.forEach(tag => {
            receivedNegativeTags[tag] = (receivedNegativeTags[tag] || 0) + 1;
          });
        }
        
        // 특별상황 집계
        if (evaluation.specialSituations && Array.isArray(evaluation.specialSituations)) {
          evaluation.specialSituations.forEach(situation => {
            receivedSpecialSituations[situation] = (receivedSpecialSituations[situation] || 0) + 1;
          });
        }
      }
    }
    
    console.log(`✅ 평가 데이터 수집 완료: ${foundEvaluations}개의 평가 발견`);
    
    // 4. 평균 매너점수 계산
    const newAverageMannerScore = mannerScoreCount > 0 
      ? Math.round((totalMannerScore / mannerScoreCount) * 10) / 10 
      : 5.0;
    
    // 5. 통계 업데이트 (기존 통계는 유지하고 태그만 재계산)
    const updatedStats = {
      communityStats: {
        ...currentStats,
        averageMannerScore: newAverageMannerScore,
        mannerScoreCount: mannerScoreCount,
        receivedTags: receivedTags,
        receivedNegativeTags: receivedNegativeTags,
        receivedSpecialSituations: receivedSpecialSituations
      }
    };
    
    console.log(`📊 재계산된 통계:`, {
      mannerScoreCount: mannerScoreCount,
      averageMannerScore: newAverageMannerScore,
      negativeTagsCount: Object.keys(receivedNegativeTags).length,
      specialSituationsCount: Object.keys(receivedSpecialSituations).length,
      negativeTags: receivedNegativeTags,
      specialSituations: receivedSpecialSituations
    });
    
    // 6. Firestore에 업데이트
    await updateDoc(userRef, updatedStats);
    
    console.log(`✅ 사용자 통계 재계산 완료: ${userId}`);
    console.log(`   - 매너점수: ${currentStats.averageMannerScore} → ${newAverageMannerScore}`);
    console.log(`   - 평가 횟수: ${currentStats.mannerScoreCount} → ${mannerScoreCount}`);
    console.log(`   - 부정적 태그: ${Object.keys(currentStats.receivedNegativeTags || {}).length} → ${Object.keys(receivedNegativeTags).length}`);
    console.log(`   - 특별상황: ${Object.keys(currentStats.receivedSpecialSituations || {}).length} → ${Object.keys(receivedSpecialSituations).length}`);
    
    return {
      userId,
      success: true,
      oldStats: currentStats,
      newStats: updatedStats.communityStats
    };
    
  } catch (error) {
    console.error(`❌ 사용자 ${userId} 통계 재계산 실패:`, error);
    return {
      userId,
      success: false,
      error: error.message
    };
  }
}

/**
 * 모든 사용자 통계 재계산 실행
 */
async function recalculateAllUsers() {
  console.log('🚀 태그 삭제 후 사용자 통계 재계산 시작');
  console.log(`📋 대상 사용자 수: ${USER_IDS.length}`);
  console.log(`👥 사용자 ID 목록:`, USER_IDS);
  
  const results = [];
  
  for (const userId of USER_IDS) {
    const result = await recalculateUserStats(userId);
    results.push(result);
    
    // API 호출 제한을 피하기 위해 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 재계산 결과 요약:');
  console.log('='.repeat(50));
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`✅ 성공: ${successCount}명`);
  console.log(`❌ 실패: ${failCount}명`);
  
  results.forEach(result => {
    if (result.success) {
      console.log(`\n✅ ${result.userId}`);
      console.log(`   매너점수: ${result.oldStats.averageMannerScore} → ${result.newStats.averageMannerScore}`);
      console.log(`   평가 횟수: ${result.oldStats.mannerScoreCount} → ${result.newStats.mannerScoreCount}`);
    } else {
      console.log(`\n❌ ${result.userId}: ${result.error}`);
    }
  });
  
  console.log('\n✅ 모든 사용자 통계 재계산 완료');
}

// 스크립트 실행
recalculateAllUsers()
  .then(() => {
    console.log('\n🎉 스크립트 실행 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });

