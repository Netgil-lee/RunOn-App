# HealthKit 연동 설정 가이드

## 1. Xcode 프로젝트 설정

### A. HealthKit Capability 추가
1. Xcode에서 `ios/RunOn.xcworkspace` 열기
2. 프로젝트 네비게이터에서 `RunOn` 프로젝트 선택
3. `TARGETS` → `RunOn` → `Signing & Capabilities` 탭
4. `+ Capability` 버튼 클릭
5. `HealthKit` 검색 후 추가

### B. HealthKit Framework 추가
1. `TARGETS` → `RunOn` → `Build Phases` 탭
2. `Link Binary With Libraries` 섹션에서 `+` 버튼 클릭
3. `HealthKit.framework` 검색 후 추가

## 2. Info.plist 설정 (이미 완료됨)

다음 권한들이 이미 설정되어 있습니다:
```xml
<key>NSHealthShareUsageDescription</key>
<string>러닝 기록을 공유하기 위해 건강 데이터에 접근합니다.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>러닝 기록을 저장하기 위해 건강 데이터를 업데이트합니다.</string>
```

## 3. Podfile 설정

Podfile에 다음을 추가해야 할 수 있습니다:
```ruby
pod 'react-native-health', :path => '../node_modules/react-native-health'
```

그 후 다음 명령어 실행:
```bash
cd ios && pod install
```

## 4. 테스트 방법

### A. 시뮬레이터 테스트
- iOS 시뮬레이터에서는 HealthKit이 제한적으로 작동
- 실제 기기에서 테스트 권장

### B. 실제 기기 테스트
1. 개발자 계정으로 기기에 앱 설치
2. HealthKit 권한 허용
3. Apple Health 앱에서 러닝 기록 추가
4. RunOn 앱에서 공유 기능 테스트

## 5. 권한 요청 플로우

1. 사용자가 공유 버튼 클릭
2. HealthKit 권한 상태 확인
3. 권한이 없으면 권한 요청 다이얼로그 표시
4. 사용자가 권한 허용
5. 워크아웃 데이터 가져오기
6. 공유 이미지 생성

## 6. 에러 처리

### A. HealthKit 사용 불가
- iOS 8.0 미만 기기
- HealthKit이 지원되지 않는 기기

### B. 권한 거부
- 사용자가 권한을 거부한 경우
- 설정에서 권한을 비활성화한 경우

### C. 데이터 없음
- 해당 시간대에 러닝 기록이 없는 경우
- Apple Health 앱에 데이터가 없는 경우

## 7. 개발/테스트용 더미 데이터

실제 HealthKit 연동이 실패할 경우 더미 데이터를 사용:
- 거리: 5.2km
- 시간: 25분
- 페이스: 4분 48초/km
- 칼로리: 320kcal
- 경로: 여의도한강공원 기준 더미 경로

## 8. 주의사항

1. **개인정보 보호**: HealthKit 데이터는 민감한 개인정보
2. **권한 관리**: 최소한의 권한만 요청
3. **에러 처리**: 모든 HealthKit 호출에 try-catch 적용
4. **사용자 안내**: 권한 요청 이유를 명확히 설명

## 9. 다음 단계

1. Xcode에서 HealthKit capability 추가
2. 실제 기기에서 테스트
3. 사용자 피드백 수집
4. 성능 최적화
5. 에러 처리 개선
