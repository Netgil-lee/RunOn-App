const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDocs, collection } = require('firebase/firestore');
const { getAuth } = require('firebase/auth');

// Firebase 설정
const firebaseConfig = {
  // 여기에 Firebase 설정을 추가하세요
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/**
 * 로컬 파일 경로의 프로필 이미지를 제거하는 함수
 */
async function fixProfileImages() {
  try {
    console.log('🔧 프로필 이미지 정리 시작...');
    
    // 모든 사용자 문서 가져오기
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let fixedCount = 0;
    let totalCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      totalCount++;
      const userData = userDoc.data();
      
      // profileImage가 file:// 경로인지 확인
      if (userData.profile && userData.profile.profileImage && 
          userData.profile.profileImage.startsWith('file://')) {
        
        console.log(`🔧 사용자 ${userData.profile.nickname || userDoc.id}의 로컬 이미지 제거`);
        
        // profileImage 필드 제거
        await updateDoc(doc(db, 'users', userDoc.id), {
          'profile.profileImage': null
        });
        
        fixedCount++;
      }
    }
    
    console.log(`✅ 프로필 이미지 정리 완료: ${fixedCount}/${totalCount} 사용자 수정됨`);
    
  } catch (error) {
    console.error('❌ 프로필 이미지 정리 실패:', error);
  }
}

// 스크립트 실행
if (require.main === module) {
  fixProfileImages();
}

module.exports = { fixProfileImages };
