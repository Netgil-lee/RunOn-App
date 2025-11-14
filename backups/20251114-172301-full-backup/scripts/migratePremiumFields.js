/**
 * 프리미엄 필드 마이그레이션 스크립트
 * 기존 사용자 문서에 프리미엄 관련 필드를 추가합니다.
 */

const admin = require('firebase-admin');

// Firebase Admin SDK 초기화 (서비스 계정 키 필요)
const serviceAccount = require('../path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://your-project-id.firebaseio.com'
});

const db = admin.firestore();

/**
 * 기존 사용자 문서에 프리미엄 필드 추가
 */
async function migrateExistingUsers() {
  try {
    console.log('프리미엄 필드 마이그레이션 시작...');
    
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    if (snapshot.empty) {
      console.log('마이그레이션할 사용자가 없습니다.');
      return;
    }
    
    const batch = db.batch();
    let updateCount = 0;
    
    snapshot.forEach((doc) => {
      const userData = doc.data();
      
      // 프리미엄 필드가 없는 경우에만 추가
      if (!userData.hasOwnProperty('isPremium')) {
        batch.update(doc.ref, {
          isPremium: false,
          subscriptionType: null,
          purchaseDate: null,
          transactionId: null,
          originalTransactionId: null,
          expiresDate: null,
          isActive: false,
          blacklistCount: 0,
          discountEligible: false,
          monthlyCounts: {}
        });
        updateCount++;
      }
    });
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`${updateCount}명의 사용자 문서가 업데이트되었습니다.`);
    } else {
      console.log('업데이트할 사용자가 없습니다.');
    }
    
  } catch (error) {
    console.error('마이그레이션 실패:', error);
  }
}

/**
 * 블랙리스트 카운트 업데이트
 * 기존 블랙리스트 데이터를 기반으로 blacklistCount 필드 업데이트
 */
async function updateBlacklistCounts() {
  try {
    console.log('블랙리스트 카운트 업데이트 시작...');
    
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    const batch = db.batch();
    let updateCount = 0;
    
    for (const doc of snapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;
      
      // 블랙리스트 서브컬렉션 조회
      const blacklistRef = db.collection('users').doc(userId).collection('blacklist');
      const blacklistSnapshot = await blacklistRef.get();
      
      const currentCount = blacklistSnapshot.size;
      
      // blacklistCount가 실제 블랙리스트 수와 다른 경우 업데이트
      if (userData.blacklistCount !== currentCount) {
        batch.update(doc.ref, {
          blacklistCount: currentCount
        });
        updateCount++;
      }
    }
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`${updateCount}명의 블랙리스트 카운트가 업데이트되었습니다.`);
    } else {
      console.log('업데이트할 블랙리스트 카운트가 없습니다.');
    }
    
  } catch (error) {
    console.error('블랙리스트 카운트 업데이트 실패:', error);
  }
}

/**
 * 월간 카운트 초기화
 * 매월 1일 자정에 실행할 스크립트
 */
async function resetMonthlyCounts() {
  try {
    console.log('월간 카운트 초기화 시작...');
    
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    const batch = db.batch();
    let updateCount = 0;
    
    snapshot.forEach((doc) => {
      const userData = doc.data();
      
      // monthlyCounts 필드가 있는 경우 초기화
      if (userData.monthlyCounts) {
        batch.update(doc.ref, {
          monthlyCounts: {
            eventsCreated: 0,
            eventsJoined: 0,
            lastResetDate: new Date().toISOString()
          }
        });
        updateCount++;
      }
    });
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`${updateCount}명의 월간 카운트가 초기화되었습니다.`);
    } else {
      console.log('초기화할 월간 카운트가 없습니다.');
    }
    
  } catch (error) {
    console.error('월간 카운트 초기화 실패:', error);
  }
}

/**
 * 마이그레이션 실행
 */
async function runMigration() {
  try {
    await migrateExistingUsers();
    await updateBlacklistCounts();
    console.log('마이그레이션 완료!');
  } catch (error) {
    console.error('마이그레이션 실행 실패:', error);
  } finally {
    process.exit(0);
  }
}

// 스크립트 실행
if (require.main === module) {
  runMigration();
}

module.exports = {
  migrateExistingUsers,
  updateBlacklistCounts,
  resetMonthlyCounts
};
