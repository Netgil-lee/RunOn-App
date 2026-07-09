# 🗑️ 데모 모드 제거 가이드

## ⚠️ 중요
**Apple App Store 심사 승인 완료 후 반드시 이 가이드를 따라 데모 모드 관련 코드와 데이터를 모두 제거해야 합니다.**

---

## 📋 제거 대상 목록

### 1. 코드 파일 수정

#### ✅ `contexts/AuthContext.js`
**제거할 내용:**
- `signInAnonymously` import (7번째 줄)
- `loginAsDemo` 함수 전체 (470-599번째 줄)
- `contextValue`에서 `loginAsDemo` 제거 (580번째 줄)

**수정 방법:**
```javascript
// 제거: import { signInAnonymously } from 'firebase/auth';

// 제거: loginAsDemo 함수 전체

// contextValue에서 제거:
const contextValue = {
  // ... 다른 값들
  // loginAsDemo, // ← 이 줄 제거
};
```

---

#### ✅ `firestore.rules`
**제거할 내용:**
- 모든 데모 계정 관련 주석 및 규칙 예외

**수정 위치:**
1. **users 컬렉션** (8번째 줄)
   ```javascript
   // 제거: allow read, write: if userId == 'demo-user-123456789';
   ```

2. **events 컬렉션** (32-43번째 줄)
   - 데모 계정 관련 주석 및 `get(/databases/$(database)/documents/users/demo-user-123456789)` 조건 제거

3. **posts 컬렉션** (57-75번째 줄)
   - 데모 계정 관련 주석 및 조건 제거

4. **chatRooms 컬렉션** (92-115번째 줄)
   - 데모 계정 관련 주석 및 조건 제거

5. **chatRooms/{chatId}/messages** (119-137번째 줄)
   - 데모 계정 관련 주석 및 조건 제거

6. **notifications 컬렉션** (131-140번째 줄)
   - 데모 계정 관련 주석 및 조건 제거

7. **meetingNotifications 컬렉션** (142-151번째 줄)
   - 데모 계정 관련 주석 및 조건 제거

**수정 후 예시 (events 컬렉션):**
```javascript
// 수정 전:
allow create: if request.auth != null && 
  (request.auth.uid == request.resource.data.organizerId ||
   // 데모 계정 허용 (users/demo-user-123456789 문서의 authUid와 일치하는 경우)
   get(/databases/$(database)/documents/users/demo-user-123456789).data.authUid == request.auth.uid);

// 수정 후:
allow create: if request.auth != null && request.auth.uid == request.resource.data.organizerId;
```

---

### 2. 스크립트 파일 삭제

#### ✅ `scripts/createReviewSampleData.js`
**작업:** 파일 전체 삭제

```bash
rm scripts/createReviewSampleData.js
```

---

### 3. Firestore 데이터 삭제

#### ✅ 데모 사용자 데이터
**컬렉션:** `users`
**문서 ID:** `demo-user-123456789`

**삭제 방법:**
1. Firebase Console → Firestore Database
2. `users` 컬렉션에서 `demo-user-123456789` 문서 삭제

또는 Firebase CLI 사용:
```bash
firebase firestore:delete users/demo-user-123456789
```

#### ✅ 샘플 데이터 (선택사항)
**컬렉션:** `posts`, `events`, `chatRooms`
**조건:** 데모 계정이 생성한 데이터

**삭제 방법:**
1. Firebase Console에서 다음 조건으로 검색:
   - `posts`: `authorId == 'demo-user-123456789'`
   - `events`: `organizerId == 'demo-user-123456789'`
   - `chatRooms`: `createdBy == 'demo-user-123456789'` 또는 `organizerId == 'demo-user-123456789'`
2. 검색된 문서들 삭제

---

### 4. 문서 파일 정리 (선택사항)

#### ✅ `APPLE_REVIEW_DEMO_GUIDE.md`
**작업:** 파일 삭제 또는 보관

```bash
# 삭제
rm APPLE_REVIEW_DEMO_GUIDE.md

# 또는 보관용으로 이름 변경
mv APPLE_REVIEW_DEMO_GUIDE.md backups/APPLE_REVIEW_DEMO_GUIDE.md
```

#### ✅ `APPLE_REVIEW_RESPONSE.md`
**작업:** 데모 계정 관련 섹션 제거

**제거할 섹션:**
- "📝 커뮤니티 기능 테스트용 샘플 데이터" 섹션 전체 (104-177번째 줄)

---

## 🔍 제거 확인 체크리스트

제거 작업 완료 후 다음을 확인하세요:

- [ ] `contexts/AuthContext.js`에서 `loginAsDemo` 함수 제거됨
- [ ] `contexts/AuthContext.js`에서 `signInAnonymously` import 제거됨
- [ ] `firestore.rules`에서 모든 데모 계정 관련 규칙 제거됨
- [ ] `scripts/createReviewSampleData.js` 파일 삭제됨
- [ ] Firestore에서 `users/demo-user-123456789` 문서 삭제됨
- [ ] Firestore에서 데모 계정이 생성한 샘플 데이터 삭제됨 (선택사항)
- [ ] `APPLE_REVIEW_RESPONSE.md`에서 데모 계정 섹션 제거됨
- [ ] 앱 빌드 및 테스트 완료
- [ ] Firestore 규칙 배포 완료

---

## 🚀 제거 후 배포 절차

### 1. 코드 수정 및 테스트
```bash
# 1. 코드 수정 (위 가이드 참조)
# 2. 로컬 테스트
npm start
# 또는
expo start
```

### 2. Firestore 규칙 배포
```bash
firebase deploy --only firestore:rules
```

### 3. 앱 빌드 및 배포
```bash
# iOS
eas build --platform ios
eas submit --platform ios

# Android
eas build --platform android
eas submit --platform android
```

---

## ⚠️ 주의사항

1. **백업:** 제거 전에 현재 코드를 백업하세요
   ```bash
   git commit -am "Before removing demo mode"
   git tag demo-mode-removal-backup
   ```

2. **테스트:** 제거 후 실제 사용자 계정으로 모든 기능이 정상 작동하는지 테스트하세요

3. **Firestore 규칙:** 규칙 수정 후 반드시 배포하고 테스트하세요

4. **데이터 삭제:** Firestore 데이터 삭제는 되돌릴 수 없으므로 신중하게 진행하세요

---

## 📝 제거 완료 후

제거 작업이 완료되면:
1. 이 가이드 문서를 삭제하거나 보관
2. Git에 커밋 및 푸시
3. 배포 노트에 데모 모드 제거 사항 기록

---

**작성일:** 2025년 11월  
**목적:** Apple App Store 심사 완료 후 데모 모드 제거 가이드  
**주의:** 앱 승인 전에는 이 가이드를 실행하지 마세요!

