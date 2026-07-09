// 온보딩 로그 확인 도구
// AsyncStorage에 저장된 디버깅 정보를 확인합니다.

const checkOnboardingLogs = async () => {
  console.log('🔍 온보딩 로그 확인 도구');
  
  try {
    // AsyncStorage 시뮬레이션 (실제로는 React Native 환경에서만 동작)
    console.log('📝 AsyncStorage에서 로그 확인:');
    console.log('   - 키: onboarding_debug_log');
    console.log('   - 위치: 앱 내부 저장소');
    
    console.log('\n📊 예상 로그 구조:');
    console.log('{');
    console.log('  "timestamp": "2024-01-01T12:00:00.000Z",');
    console.log('  "step": 7,');
    console.log('  "formData": { ... },');
    console.log('  "currentGoals": ["목표1", "목표2"],');
    console.log('  "canProceed": true,');
    console.log('  "message": "handleComplete 함수 실행됨"');
    console.log('}');
    
    console.log('\n🔧 로그 확인 방법:');
    console.log('1. React Native Debugger 사용');
    console.log('2. Flipper 플러그인 사용');
    console.log('3. 콘솔 로그 직접 확인');
    console.log('4. AsyncStorage 직접 접근');
    
    console.log('\n📱 실제 확인 방법:');
    console.log('1. 앱에서 온보딩 완료 버튼 클릭');
    console.log('2. 개발자 도구에서 콘솔 확인');
    console.log('3. 다음 로그들 확인:');
    console.log('   - 🚀 온보딩 완료 버튼 클릭됨');
    console.log('   - 📊 현재 formData: {...}');
    console.log('   - 🎯 선택된 목표들: [...]');
    console.log('   - ✅ 진행 가능 여부: true');
    console.log('   - 🚀 AppIntroScreen으로 네비게이션 시작');
    console.log('   - ✅ AppIntro 네비게이션 성공');
    
    console.log('\n🚨 문제 발생 시 확인할 로그:');
    console.log('   - ❌ AppIntro 네비게이션 실패: ...');
    console.log('   - ❌ 온보딩 완료 처리 실패: ...');
    console.log('   - ⚠️ 사용자 정보가 없어 온보딩 완료 처리 불가');
    
    console.log('\n🎯 네비게이션 상태 확인:');
    console.log('   - 🧭 AppNavigator 상태: {...}');
    console.log('   - 🧭 AppNavigator: 온보딩 미완료 - 온보딩 화면으로 이동');
    console.log('   - 🧭 AppNavigator: 온보딩 완료 - 홈 화면으로 이동');
    
  } catch (error) {
    console.error('❌ 로그 확인 중 오류:', error);
  }
};

// 테스트 실행
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { checkOnboardingLogs };
} else {
  // 브라우저 환경에서 실행
  checkOnboardingLogs();
}

console.log('�� 로그 확인 도구 로드 완료');
