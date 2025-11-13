const admin = require('firebase-admin');

// Firebase Admin SDK 초기화
const serviceAccount = require('../config/firebase-admin-key.json'); // 실제 키 파일 경로로 수정 필요

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://runon-app-default-rtdb.firebaseio.com" // 실제 프로젝트 URL로 수정
});

const db = admin.firestore();

async function setPremiumTest() {
  try {
    console.log('🔍 "리리" 닉네임을 가진 사용자 검색 중...');
    
    // 모든 사용자 문서에서 '리리' 닉네임을 가진 사용자 찾기
    const usersSnapshot = await db.collection('users').get();
    let liliUser = null;
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const nickname = userData.profile?.nickname || userData.displayName || userData.nickname;
      
      if (nickname === '리리') {
        liliUser = {
          id: doc.id,
          data: userData
        };
        console.log('✅ "리리" 사용자 발견:', {
          uid: doc.id,
          nickname: nickname,
          email: userData.email || '이메일 없음',
          createdAt: userData.createdAt?.toDate?.() || userData.createdAt
        });
      }
    });
    
    if (!liliUser) {
      console.log('❌ "리리" 닉네임을 가진 사용자를 찾을 수 없습니다.');
      console.log('📋 현재 등록된 사용자 목록:');
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const nickname = userData.profile?.nickname || userData.displayName || userData.nickname;
        console.log(`- ${nickname || '닉네임 없음'} (${doc.id})`);
      });
      return;
    }
    
    // 프리미엄 상태 설정
    console.log('💎 "리리" 사용자를 프리미엄 사용자로 설정 중...');
    
    const premiumData = {
      isPremium: true,
      subscriptionType: 'com.runon.app.premium.monthly',
      purchaseDate: new Date(),
      transactionId: 'TEST_' + Date.now(),
      originalTransactionId: 'TEST_' + Date.now(),
      expiresDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후
      isActive: true,
    };
    
    await db.collection('users').doc(liliUser.id).update(premiumData);
    
    console.log('✅ 프리미엄 상태 설정 완료!');
    console.log('📊 설정된 프리미엄 정보:', premiumData);
    
    // 설정 확인
    const updatedUser = await db.collection('users').doc(liliUser.id).get();
    const updatedData = updatedUser.data();
    
    console.log('🔍 설정 확인:');
    console.log('- isPremium:', updatedData.isPremium);
    console.log('- subscriptionType:', updatedData.subscriptionType);
    console.log('- expiresDate:', updatedData.expiresDate?.toDate?.() || updatedData.expiresDate);
    console.log('- isActive:', updatedData.isActive);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

// 스크립트 실행
setPremiumTest();
