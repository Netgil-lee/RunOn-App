# Firestore 인덱스 설정 가이드

## 문제 상황

앱 실행 시 다음과 같은 Firestore 인덱스 오류가 발생할 수 있습니다:

```
@firebase/firestore: The query requires an index. You can create it here: https://console.firebase.google.com/...
```

## 해결 방법

### 1. 자동 인덱스 생성 (권장)

1. 오류 로그에 표시된 링크를 클릭
2. Firebase Console에서 자동으로 인덱스 생성 페이지로 이동
3. "인덱스 만들기" 버튼 클릭
4. 인덱스 생성 완료까지 대기 (몇 분 소요)

### 2. 수동 인덱스 생성

Firebase Console → Firestore Database → 색인 → 복합 색인 추가

#### 필요한 인덱스들:

**chatRooms 컬렉션:**
- 컬렉션 ID: `chatRooms`
- 필드 경로: `participants` (배열 포함)
- 필드 경로: `lastMessageTime` (내림차순)

**notifications 컬렉션:**
- 컬렉션 ID: `notifications`
- 필드 경로: `userId` (오름차순)
- 필드 경로: `timestamp` (내림차순)

### 3. 임시 해결책 (현재 적용됨)

복합 쿼리의 `orderBy` 부분을 주석 처리하여 오류 방지:

```javascript
// services/firestoreService.js
onNotificationsSnapshot(userId, callback) {
  const notificationsQuery = query(
    notificationsRef, 
    where('userId', '==', userId)
    // orderBy('timestamp', 'desc') // 임시 주석 처리
  );
}

onChatRoomsSnapshot(userId, callback) {
  const chatQuery = query(
    chatRoomsRef, 
    where('participants', 'array-contains', userId)
    // orderBy('lastMessageTime', 'desc') // 임시 주석 처리
  );
}
```

## 인덱스 생성 후 복원

인덱스가 생성되면 `services/firestoreService.js`에서 주석 처리된 `orderBy`를 복원:

```javascript
onNotificationsSnapshot(userId, callback) {
  const notificationsQuery = query(
    notificationsRef, 
    where('userId', '==', userId),
    orderBy('timestamp', 'desc') // 복원
  );
}

onChatRoomsSnapshot(userId, callback) {
  const chatQuery = query(
    chatRoomsRef, 
    where('participants', 'array-contains', userId),
    orderBy('lastMessageTime', 'desc') // 복원
  );
}
```

## 주의사항

- 인덱스 생성은 Firebase 프로젝트당 제한이 있습니다
- 복합 인덱스는 생성에 시간이 걸릴 수 있습니다
- 개발/운영 환경별로 각각 인덱스를 생성해야 합니다

## 개발 권장사항

1. **단순 쿼리 우선**: `where`만 사용하는 쿼리부터 구현
2. **클라이언트 정렬**: 복잡한 정렬은 클라이언트에서 처리
3. **인덱스 계획**: 쿼리 설계 시 필요한 인덱스 미리 계획 