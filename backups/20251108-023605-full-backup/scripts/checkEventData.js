// Firebase 이벤트 데이터 확인 스크립트
// Firebase Console에서 수동으로 확인해야 합니다.

console.log('🔍 Firebase 이벤트 데이터 확인 방법:');
console.log('1. Firebase Console 접속: https://console.firebase.google.com/');
console.log('2. runon-production-app 프로젝트 선택');
console.log('3. Firestore Database 클릭');
console.log('4. events 컬렉션 클릭');
console.log('5. 각 이벤트 문서를 확인하여 participants 필드 상태 확인');

console.log('\n📋 확인할 내용:');
console.log('- participants 필드가 배열 형태인지 확인');
console.log('- participants 필드에 실제 사용자 UID가 포함되어 있는지 확인');
console.log('- 예시: participants: ["Tev9dNctZWew5pYBmE8nWHElLlN2", "D3J9scIkLEhETiJcjXZkZwjd4Xu1"]');

console.log('\n⚠️ 문제가 있을 수 있는 경우:');
console.log('- participants 필드가 없음');
console.log('- participants 필드가 배열이 아닌 다른 타입');
console.log('- participants 필드가 빈 배열');
console.log('- participants 필드에 잘못된 UID가 포함됨');

console.log('\n🔧 해결 방법:');
console.log('- participants 필드가 없으면 빈 배열 []로 설정');
console.log('- participants 필드가 배열이 아니면 올바른 배열 형태로 수정');
console.log('- 참여자가 있으면 해당 사용자의 UID를 배열에 추가');
