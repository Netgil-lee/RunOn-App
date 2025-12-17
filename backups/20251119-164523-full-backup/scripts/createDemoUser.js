// Apple 심사용 데모 계정 생성 스크립트
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Firebase 설정 (실제 프로젝트 설정으로 교체 필요)
const firebaseConfig = {
  // 실제 Firebase 설정으로 교체
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createDemoUser() {
  try {
    console.log('🎯 Apple 심사용 데모 계정 생성 시작...');
    
    const demoUserId = 'demo-user-123456789';
    const userRef = doc(db, 'users', demoUserId);
    
    const demoUserData = {
      uid: demoUserId,
      phoneNumber: '+821012345678',
      displayName: 'Apple 심사팀',
      email: 'demo@apple-review.com',
      emailVerified: true,
      isAnonymous: false,
      profile: {
        nickname: 'Apple 심사팀',
        bio: 'Apple App Store 심사팀 데모 계정',
        gender: '기타',
        age: 30,
        runningLevel: '중급',
        averagePace: '5분/km',
        preferredCourses: ['한강공원', '올림픽공원', '여의도한강공원'],
        preferredTimes: ['오전', '저녁'],
        runningStyles: ['혼자', '그룹'],
        favoriteSeasons: ['봄', '가을'],
        currentGoals: ['건강관리', '체력향상'],
        profileImage: null,
        updatedAt: new Date().toISOString()
      },
      onboardingCompleted: true,
      onboardingCompletedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      communityStats: {
        totalParticipated: 5,
        thisMonthParticipated: 2,
        hostedEvents: 1,
        averageMannerScore: 5.0,
        mannerScoreCount: 3,
        receivedTags: {
          '친절함': 2,
          '시간관리': 1
        }
      },
      isPremium: true,
      subscriptionType: 'com.runon.app.premium.monthly',
      purchaseDate: serverTimestamp(),
      transactionId: 'DEMO_' + Date.now(),
      originalTransactionId: 'DEMO_' + Date.now(),
      expiresDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      blacklistCount: 0,
      discountEligible: false,
      monthlyCounts: {
        '2024-10': 2,
        '2024-09': 3
      }
    };
    
    await setDoc(userRef, demoUserData, { merge: true });
    
    console.log('✅ 데모 계정 생성 완료!');
    console.log('📊 생성된 데모 계정 정보:');
    console.log('- UID:', demoUserId);
    console.log('- 전화번호: 010-1234-5678');
    console.log('- 닉네임: Apple 심사팀');
    console.log('- 프리미엄: 활성화됨');
    console.log('- 온보딩: 완료됨');
    console.log('- 참여 모임: 5개');
    console.log('- 호스트 모임: 1개');
    
    console.log('\n🎯 Apple 심사팀이 다음 정보로 로그인할 수 있습니다:');
    console.log('📱 휴대폰번호: 010-1234-5678');
    console.log('🔢 인증번호: 아무 숫자나 입력 (123456 등)');
    console.log('✅ SMS 인증이 우회되어 자동으로 로그인됩니다.');
    
  } catch (error) {
    console.error('❌ 데모 계정 생성 실패:', error);
    throw error;
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  createDemoUser()
    .then(() => {
      console.log('🎉 데모 계정 생성 스크립트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export { createDemoUser };
