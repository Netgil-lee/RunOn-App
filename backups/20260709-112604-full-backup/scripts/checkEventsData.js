// Firebase 이벤트 데이터 확인 스크립트
// Firebase Console에서 수동으로 확인해야 합니다.

console.log('🔍 Firebase 이벤트 데이터 확인 방법:');
console.log('1. Firebase Console 접속: https://console.firebase.google.com/');
console.log('2. runon-production-app 프로젝트 선택');
console.log('3. Firestore Database 클릭');
console.log('4. events 컬렉션 클릭');
console.log('5. 이벤트 문서들이 있는지 확인');

console.log('\n📋 확인할 내용:');
console.log('- events 컬렉션에 문서가 있는지 확인');
console.log('- 각 이벤트 문서의 participants 필드 확인');
console.log('- 이벤트 문서의 기본 필드들 (title, organizer, date 등) 확인');

console.log('\n⚠️ 문제가 있을 수 있는 경우:');
console.log('- events 컬렉션이 비어있음');
console.log('- 이벤트 문서의 필수 필드가 누락됨');
console.log('- participants 필드가 잘못된 형태로 저장됨');

console.log('\n🔧 해결 방법:');
console.log('- 이벤트가 없다면 새로 생성');
console.log('- 필수 필드가 누락된 경우 수정');
console.log('- participants 필드를 배열 형태로 수정');

console.log('\n📊 예상되는 이벤트 데이터 구조:');
console.log('{');
console.log('  title: "러닝 모임",');
console.log('  organizer: "호스트명",');
console.log('  organizerId: "사용자UID",');
console.log('  participants: ["사용자UID1", "사용자UID2"],');
console.log('  maxParticipants: 5,');
console.log('  date: "2024-01-18",');
console.log('  time: "19:00",');
console.log('  location: "반포한강공원",');
console.log('  distance: "5km",');
console.log('  pace: "6:00-7:00"');
console.log('}');
