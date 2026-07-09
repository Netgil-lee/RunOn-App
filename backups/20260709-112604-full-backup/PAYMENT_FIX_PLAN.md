# 🚨 프로덕션 구독 결제 실패 원인 분석 및 수정 계획

## 📋 개요
프로덕션 앱에서 구독 결제가 작동하지 않는 문제를 분석하고 수정 계획을 수립합니다.

**작성일**: 2025년 1월
**상태**: 진행 중 (Phase 1 작업 중)

---

## 🔴 발견된 문제점 (우선순위별)

### ⚠️ 치명적 문제 (즉시 수정 필요)

#### 1. userId 누락으로 인한 Firestore 업데이트 실패
**위치**: `services/paymentService.js` - `handlePurchaseUpdate()` (323-367줄)

**문제 상황**:
- `userId`가 `callbacks?.userId`에서만 가져옴
- 콜백이 없거나 이미 삭제된 경우 `userId`가 `undefined`
- 결과: 구매는 완료되지만 Firestore에 구독 상태가 저장되지 않음

**영향도**: 🔴 매우 높음
- 사용자가 결제했지만 구독이 활성화되지 않음
- 사용자 불만 및 환불 요청 발생 가능

**현재 코드**:
```javascript
const callbacks = this.purchaseCallbacks[productId];
const userId = callbacks?.userId;  // ❌ 콜백이 없으면 undefined

if (userId) {
  await this.updateUserSubscription(...);  // ❌ userId가 없으면 실행 안 됨
} else {
  console.warn('⚠️ userId가 없어 Firestore 업데이트를 건너뜁니다.');
}
```

---

#### 2. 미완료 거래 처리 시 userId 누락 및 Firestore 업데이트 없음
**위치**: `services/paymentService.js` - `processPendingPurchases()` (108-141줄)

**문제 상황**:
- 앱 재시작 후 미완료 거래 처리 시 `userId`를 전달하지 않음
- 영수증 검증만 하고 Firestore 업데이트를 하지 않음
- 결과: 구매는 완료되지만 구독 상태가 저장되지 않음

**영향도**: 🔴 매우 높음
- 앱 재시작 후 구매한 사용자의 구독이 활성화되지 않음

**현재 코드**:
```javascript
// ❌ userId를 전달하지 않음
const validationResult = await this.validateReceipt(purchase);

if (validationResult.isValid) {
  // ❌ Firestore 업데이트 없음
  await finishTransaction({ purchase, isConsumable: false });
}
```

---

### 🟡 높은 우선순위 문제

#### 3. 영수증 검증 실패 가능성
**위치**: `services/receiptValidationService.js`

**문제 상황**:
- 클라이언트에서 직접 App Store API 호출
- 네트워크 오류나 타임아웃 시 검증 실패
- 프로덕션 환경에서 공유 비밀번호가 제대로 전달되지 않을 수 있음

**영향도**: 🟡 높음
- 영수증 검증 실패 시 구매가 완료되지 않음
- 사용자가 결제했지만 구독이 활성화되지 않음

**참고**: 영수증 검증은 **필수**입니다. 검증 실패 시 Firestore 업데이트를 하면 안 됩니다.

---

#### 4. react-native-iap v14 영수증 데이터 필드명 문제
**위치**: `services/receiptValidationService.js` - `validateReceipt()` (283-313줄)

**문제 상황**:
- react-native-iap v14에서는 영수증 데이터 필드명이 다를 수 있음
- 여러 필드를 시도하지만 실제로는 다른 필드명을 사용할 수 있음
- 영수증 데이터를 찾지 못하면 검증 실패

**영향도**: 🟡 높음
- 영수증 데이터를 찾지 못하면 검증 실패

---

### 🟢 중간 우선순위 문제

#### 5. 포그라운드 전환 시 구독 상태 확인 미구현
**위치**: `contexts/PremiumContext.js`

**문제 상황**:
- 앱 실행 시에만 구독 상태 확인
- 포그라운드 전환 시 확인하지 않음
- 다른 기기에서 구독 취소/만료 시 감지 불가

**영향도**: 🟢 중간
- 사용자 경험 저하

---

#### 6. 구독 만료/취소 시 Firestore 업데이트 없음
**위치**: `contexts/PremiumContext.js` - `hasPremiumAccess()`

**문제 상황**:
- 만료 시 로컬 상태만 업데이트
- Firestore는 업데이트하지 않음
- 다른 기기/세션에서 동기화 안 됨

**영향도**: 🟢 중간
- 데이터 불일치 발생

---

## 📝 수정 계획

### Phase 1: 치명적 문제 해결 (즉시 수정)

#### 작업 1-1: handlePurchaseUpdate에서 userId 전달 개선
**파일**: `services/paymentService.js`
**위치**: `handlePurchaseUpdate()` 메서드

**수정 내용**:
1. 콜백에서 `userId` 가져오기 (기존 방식 유지)
2. `userId`가 없으면 Firestore에서 `transactionId`로 사용자 찾기
3. 그래도 없으면 `purchase` 객체에서 사용자 정보 추출 시도
4. 모든 방법 실패 시 상세 로그 남기기

**예상 소요 시간**: 1-2시간
**난이도**: 중간

---

#### 작업 1-2: processPendingPurchases에서 userId 전달 및 Firestore 업데이트
**파일**: `services/paymentService.js`
**위치**: `processPendingPurchases()` 메서드

**수정 내용**:
1. Firestore에서 `transactionId`로 사용자 찾기
2. 사용자를 찾으면 `userId` 전달하여 Firestore 업데이트
3. 사용자를 찾지 못하면 상세 로그 남기기
4. 영수증 검증 성공 시에만 Firestore 업데이트 (보안 유지)

**예상 소요 시간**: 1-2시간
**난이도**: 중간

---

### Phase 2: 영수증 검증 개선

#### 작업 2-1: 영수증 검증 재시도 로직 강화
**파일**: `services/receiptValidationService.js`
**위치**: `validateIOSReceipt()` 메서드

**수정 내용**:
1. 네트워크 오류 시 재시도 로직 개선
2. 타임아웃 처리 개선
3. 상세 에러 로깅 추가

**예상 소요 시간**: 1시간
**난이도**: 낮음

---

#### 작업 2-2: react-native-iap v14 영수증 필드명 확인 및 수정
**파일**: `services/receiptValidationService.js`
**위치**: `validateReceipt()` 메서드

**수정 내용**:
1. 실제 purchase 객체 구조 확인 (로깅 강화)
2. react-native-iap v14 문서 확인
3. 올바른 필드명 사용

**예상 소요 시간**: 1-2시간
**난이도**: 낮음

---

### Phase 3: 보안 강화 (선택사항, 권장)

#### 작업 3-1: Firebase Cloud Functions 영수증 검증 API 구현
**파일**: `functions/index.js`

**수정 내용**:
1. 영수증 검증 Cloud Function 추가
2. 공유 비밀번호를 서버에서만 관리
3. 클라이언트는 서버 API만 호출하도록 변경

**예상 소요 시간**: 3-4시간
**난이도**: 높음

**참고**: 이 작업은 보안 강화를 위한 것이며, Phase 1, 2를 먼저 완료한 후 진행하는 것을 권장합니다.

---

### Phase 4: 구독 상태 동기화 개선

#### 작업 4-1: 포그라운드 전환 시 구독 상태 확인
**파일**: `contexts/PremiumContext.js`

**수정 내용**:
1. `AppState` 리스너 추가
2. 포그라운드 복귀 시 `checkPremiumStatus()` 호출

**예상 소요 시간**: 1시간
**난이도**: 낮음

---

#### 작업 4-2: 구독 만료/취소 시 Firestore 업데이트
**파일**: `contexts/PremiumContext.js`, `services/paymentService.js`

**수정 내용**:
1. `hasPremiumAccess()`에서 만료 확인 시 Firestore 업데이트
2. `checkUserSubscriptionStatus()`에서 만료 확인 및 업데이트

**예상 소요 시간**: 1-2시간
**난이도**: 중간

---

## 🎯 권장 수정 순서

### 즉시 수정 (프로덕션 결제 복구)
1. ✅ **작업 1-1**: handlePurchaseUpdate에서 userId 전달 개선
2. ✅ **작업 1-2**: processPendingPurchases에서 userId 전달 및 Firestore 업데이트

### 빠른 개선 (영수증 검증 안정화)
3. ✅ **작업 2-1**: 영수증 검증 재시도 로직 강화
4. ✅ **작업 2-2**: react-native-iap v14 영수증 필드명 확인 및 수정

### 추가 개선 (선택사항)
5. ⚪ **작업 4-1**: 포그라운드 전환 시 구독 상태 확인
6. ⚪ **작업 4-2**: 구독 만료/취소 시 Firestore 업데이트
7. ⚪ **작업 3-1**: Firebase Cloud Functions 영수증 검증 API 구현 (보안 강화)

---

## 📊 예상 소요 시간

| Phase | 작업 | 예상 시간 | 누적 시간 |
|-------|------|----------|----------|
| Phase 1 | 작업 1-1 | 1-2시간 | 1-2시간 |
| Phase 1 | 작업 1-2 | 1-2시간 | 2-4시간 |
| Phase 2 | 작업 2-1 | 1시간 | 3-5시간 |
| Phase 2 | 작업 2-2 | 1-2시간 | 4-7시간 |
| Phase 4 | 작업 4-1 | 1시간 | 5-8시간 |
| Phase 4 | 작업 4-2 | 1-2시간 | 6-10시간 |
| Phase 3 | 작업 3-1 | 3-4시간 | 9-14시간 |

**즉시 수정 (Phase 1)**: 2-4시간
**전체 수정 (Phase 1-4)**: 6-10시간
**보안 강화 포함 (Phase 1-3)**: 9-14시간

---

## ⚠️ 주의사항

### 영수증 검증은 필수입니다
- 영수증 검증 실패 시 Firestore 업데이트를 하면 안 됩니다
- 검증 실패 원인을 해결해야 합니다
- 서버 측 검증 API 구현을 권장합니다 (보안 강화)

### 테스트 필수
- 각 작업 완료 후 테스트 필요
- 프로덕션 배포 전 전체 플로우 테스트 필수
- 샌드박스 환경에서 충분히 테스트

---

## ✅ 체크리스트

### Phase 1 (치명적 문제 해결)
- [x] 작업 1-1: handlePurchaseUpdate에서 userId 전달 개선 ✅ 완료
- [x] 작업 1-2: processPendingPurchases에서 userId 전달 및 Firestore 업데이트 ✅ 완료
- [ ] Phase 1 테스트 완료

### Phase 2 (영수증 검증 개선)
- [ ] 작업 2-1: 영수증 검증 재시도 로직 강화
- [ ] 작업 2-2: react-native-iap v14 영수증 필드명 확인 및 수정
- [ ] Phase 2 테스트 완료

### Phase 4 (구독 상태 동기화 개선)
- [ ] 작업 4-1: 포그라운드 전환 시 구독 상태 확인
- [ ] 작업 4-2: 구독 만료/취소 시 Firestore 업데이트
- [ ] Phase 4 테스트 완료

### Phase 3 (보안 강화 - 선택사항)
- [ ] 작업 3-1: Firebase Cloud Functions 영수증 검증 API 구현
- [ ] 클라이언트 코드 수정 (서버 API 호출)
- [ ] Phase 3 테스트 완료

---

## 📞 문의사항

수정 작업 진행 전 확인이 필요한 사항:
1. Phase 1만 먼저 진행할지, 전체를 진행할지 결정
2. Phase 3 (서버 측 검증) 진행 여부 결정
3. 테스트 환경 및 계정 준비 상태 확인

---

## 📝 작업 진행 상황

### Phase 1 완료 (2025년 1월)

#### ✅ 작업 1-1: handlePurchaseUpdate에서 userId 전달 개선
**완료일**: 2025년 1월

**수정 내용**:
1. `findUserIdByTransactionId()` 헬퍼 함수 추가
   - Firestore에서 `transactionId`로 사용자 찾기
   - `originalTransactionId`로도 시도
2. `handlePurchaseUpdate()` 메서드 개선
   - 콜백에서 `userId` 가져오기 (기존 방식 유지)
   - `userId`가 없으면 `transactionId`로 Firestore에서 사용자 찾기
   - 여러 `transactionId` 필드 시도 (iOS/Android 호환)
   - 모든 방법 실패 시 상세 로그 남기기

**수정된 파일**: `services/paymentService.js`
- `findUserIdByTransactionId()` 메서드 추가 (약 50줄)
- `handlePurchaseUpdate()` 메서드 수정 (약 30줄)
- Firestore import 추가 (`collection`, `query`, `where`, `getDocs`, `limit`)

---

#### ✅ 작업 1-2: processPendingPurchases에서 userId 전달 및 Firestore 업데이트
**완료일**: 2025년 1월

**수정 내용**:
1. `processPendingPurchases()` 메서드 개선
   - `transactionId`로 Firestore에서 사용자 찾기
   - 영수증 검증 성공 시 `userId`가 있으면 Firestore 업데이트
   - 영수증 검증 실패 시 Firestore 업데이트 하지 않음 (보안 유지)
   - 상세 로깅 추가

**수정된 파일**: `services/paymentService.js`
- `processPendingPurchases()` 메서드 수정 (약 40줄)

---

### Phase 1 수정 요약

**주요 개선사항**:
1. ✅ `userId`를 찾는 다중 방법 구현
   - 콜백에서 가져오기 (기존)
   - `transactionId`로 Firestore에서 찾기 (신규)
   - `originalTransactionId`로도 시도 (신규)

2. ✅ 미완료 거래 처리 시 Firestore 업데이트 추가
   - 앱 재시작 후 구매한 사용자의 구독도 활성화됨

3. ✅ 상세 로깅 추가
   - `userId`를 찾지 못한 경우 상세 정보 로깅
   - 디버깅 용이성 향상

**예상 효과**:
- 프로덕션에서 구매한 사용자의 구독이 정상적으로 활성화됨
- 앱 재시작 후에도 구매한 사용자의 구독이 활성화됨
- `userId`를 찾지 못한 경우 상세 로그로 문제 파악 가능

**주의사항**:
- Firestore에 `transactionId` 인덱스가 필요할 수 있음
- 첫 구매 시에는 `transactionId`로 사용자를 찾을 수 없을 수 있음 (이 경우 콜백에서 가져와야 함)

---

**마지막 업데이트**: 2025년 1월
**상태**: Phase 1 완료 ✅ (테스트 대기 중)

