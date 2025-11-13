// 클라이언트 사이드에서 프리미엄 테스트를 위한 유틸리티 함수들

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// '리리' 사용자를 프리미엄으로 설정하는 함수
export const setLiliAsPremium = async () => {
  try {
    console.log('🔍 "리리" 닉네임을 가진 사용자 검색 중...');
    
    // 현재 로그인된 사용자의 닉네임 확인
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!currentUser.uid) {
      console.log('❌ 로그인된 사용자가 없습니다.');
      return false;
    }
    
    // 사용자 데이터 가져오기
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log('❌ 사용자 문서를 찾을 수 없습니다.');
      return false;
    }
    
    const userData = userDoc.data();
    const nickname = userData.profile?.nickname || userData.displayName || userData.nickname;
    
    console.log('👤 현재 사용자 정보:', {
      uid: currentUser.uid,
      nickname: nickname,
      email: userData.email || '이메일 없음'
    });
    
    if (nickname !== '리리') {
      console.log('⚠️ 현재 사용자가 "리리"가 아닙니다. 닉네임:', nickname);
      console.log('💡 "리리" 닉네임으로 변경하거나, 다른 사용자로 로그인해주세요.');
      return false;
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
    
    await updateDoc(userRef, premiumData);
    
    console.log('✅ 프리미엄 상태 설정 완료!');
    console.log('📊 설정된 프리미엄 정보:', premiumData);
    
    // 설정 확인
    const updatedUser = await getDoc(userRef);
    const updatedData = updatedUser.data();
    
    console.log('🔍 설정 확인:');
    console.log('- isPremium:', updatedData.isPremium);
    console.log('- subscriptionType:', updatedData.subscriptionType);
    console.log('- expiresDate:', updatedData.expiresDate?.toDate?.() || updatedData.expiresDate);
    console.log('- isActive:', updatedData.isActive);
    
    return true;
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    return false;
  }
};

// 프리미엄 상태를 일반 사용자로 되돌리는 함수
export const removePremiumFromLili = async () => {
  try {
    console.log('🔄 "리리" 사용자의 프리미엄 상태 제거 중...');
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!currentUser.uid) {
      console.log('❌ 로그인된 사용자가 없습니다.');
      return false;
    }
    
    const userRef = doc(db, 'users', currentUser.uid);
    
    const removeData = {
      isPremium: false,
      subscriptionType: null,
      purchaseDate: null,
      transactionId: null,
      originalTransactionId: null,
      expiresDate: null,
      isActive: false,
    };
    
    await updateDoc(userRef, removeData);
    
    console.log('✅ 프리미엄 상태 제거 완료!');
    return true;
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    return false;
  }
};

// 개발자 도구에서 사용할 수 있는 전역 함수들
if (typeof window !== 'undefined') {
  window.setLiliAsPremium = setLiliAsPremium;
  window.removePremiumFromLili = removePremiumFromLili;
  
  console.log('🛠️ 개발자 도구에서 사용 가능한 함수들:');
  console.log('- setLiliAsPremium(): "리리" 사용자를 프리미엄으로 설정');
  console.log('- removePremiumFromLili(): "리리" 사용자의 프리미엄 상태 제거');
}
