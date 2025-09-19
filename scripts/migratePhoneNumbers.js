// scripts/migratePhoneNumbers.js
// 기존 휴대전화번호 데이터를 국제 형식으로 마이그레이션하는 스크립트

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');
const ENV = require('../config/environment.js');

const firebaseConfig = {
  apiKey: ENV.firebaseApiKey,
  authDomain: ENV.firebaseAuthDomain,
  projectId: ENV.firebaseProjectId,
  storageBucket: ENV.firebaseStorageBucket,
  messagingSenderId: ENV.firebaseMessagingSenderId,
  appId: ENV.firebaseAppId,
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 한국 전화번호를 국제 형식으로 변환하는 함수
const convertToInternationalFormat = (phoneNumber) => {
  if (!phoneNumber) return null;
  
  // 이미 국제 형식인 경우 (+82로 시작)
  if (phoneNumber.startsWith('+82')) {
    return phoneNumber;
  }
  
  // 한국 형식인 경우 (010-1234-5678 또는 01012345678)
  const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
  if (cleanNumber.length === 11 && cleanNumber.startsWith('010')) {
    return `+82${cleanNumber}`;
  }
  
  return phoneNumber; // 변환할 수 없는 형식은 그대로 반환
};

// 마이그레이션 실행 함수
const migratePhoneNumbers = async () => {
  try {
    console.log('🚀 휴대전화번호 마이그레이션 시작...');
    
    // 모든 사용자 문서 가져오기
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    console.log(`📊 총 ${querySnapshot.size}개의 사용자 문서 발견`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const userDoc of querySnapshot.docs) {
      try {
        const userData = userDoc.data();
        const currentPhoneNumber = userData.phoneNumber;
        
        if (!currentPhoneNumber) {
          console.log(`⏭️  사용자 ${userDoc.id}: 전화번호 없음, 건너뜀`);
          skippedCount++;
          continue;
        }
        
        // 국제 형식으로 변환
        const internationalPhoneNumber = convertToInternationalFormat(currentPhoneNumber);
        
        // 변환이 필요한 경우에만 업데이트
        if (internationalPhoneNumber !== currentPhoneNumber) {
          await updateDoc(doc(db, 'users', userDoc.id), {
            phoneNumber: internationalPhoneNumber
          });
          
          console.log(`✅ 사용자 ${userDoc.id}: ${currentPhoneNumber} → ${internationalPhoneNumber}`);
          migratedCount++;
        } else {
          console.log(`⏭️  사용자 ${userDoc.id}: 이미 국제 형식 (${currentPhoneNumber}), 건너뜀`);
          skippedCount++;
        }
        
      } catch (error) {
        console.error(`❌ 사용자 ${userDoc.id} 마이그레이션 실패:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 마이그레이션 완료!');
    console.log(`✅ 성공: ${migratedCount}개`);
    console.log(`⏭️  건너뜀: ${skippedCount}개`);
    console.log(`❌ 실패: ${errorCount}개`);
    
  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
  }
};

// 스크립트 실행
if (require.main === module) {
  migratePhoneNumbers();
}

module.exports = migratePhoneNumbers;
