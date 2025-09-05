// 채팅방 참여자 문제 해결 스크립트
// Firebase Console에서 수동으로 수정해야 합니다.

console.log('🔍 채팅방 참여자 문제 해결 방법:');
console.log('1. Firebase Console 접속: https://console.firebase.google.com/');
console.log('2. runon-production-app 프로젝트 선택');
console.log('3. Firestore Database 클릭');
console.log('4. chatRooms 컬렉션 클릭');
console.log('5. 채팅방 ID "3TmmKE2XoInHjlR0eMGg" 문서 찾기');
console.log('6. participants 필드를 다음으로 수정:');
console.log('   ["Tev9dNctZWew5pYBmE8nWHElLlN2", "D3J9scIkLEhETiJcjXZkZwjd4Xu1"]');
console.log('7. Update 버튼 클릭');

console.log('\n📋 수정할 정보:');
console.log('- 채팅방 ID: 3TmmKE2XoInHjlR0eMGg');
console.log('- 현재 participants: ["Tev9dNctZWew5pYBmE8nWHElLlN2"]');
console.log('- 수정 후 participants: ["Tev9dNctZWew5pYBmE8nWHElLlN2", "D3J9scIkLEhETiJcjXZkZwjd4Xu1"]');
console.log('- 몽치 UID: Tev9dNctZWew5pYBmE8nWHElLlN2');
console.log('- 리리 UID: D3J9scIkLEhETiJcjXZkZwjd4Xu1');

console.log('\n⚠️ 주의사항:');
console.log('- participants 필드는 배열 형태로 유지해야 합니다');
console.log('- 기존 참여자를 삭제하지 말고 새 참여자만 추가하세요');
console.log('- 수정 후 앱을 재시작하여 변경사항을 확인하세요');
