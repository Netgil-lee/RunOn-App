# HealthKit 연동/배포 체크리스트 (RunOn)

## 패키지 버전 (2025-10-31)
- React Native: 0.81.5 (New Architecture)
- Expo: 54.0.21
- Hermes: 0.81.5
- react-native-health: 1.19.0
- react-native-reanimated: ~4.1.1

설치/동기화
```
npm install
cd ios && pod install --repo-update && cd ..
```

## Xcode 설정
- Signing & Capabilities: HealthKit 추가(필수), 필요 시 Background Delivery 체크
- Release 서명: Apple Distribution, Provisioning Profile = RunOn App Store Distribution, Bundle ID = com.runon.app
- Entitlements: `com.apple.developer.healthkit=true` (+ 선택: background-delivery, health-records)
- Info.plist: NSHealthShareUsageDescription, NSHealthUpdateUsageDescription, ITSAppUsesNonExemptEncryption=false, RCTNewArchEnabled=true

## CocoaPods (ios/Podfile)
- 링크:
```
pod 'RNAppleHealthKit', :path => '../node_modules/react-native-health'
```
- dSYM 강제(배포 심볼 경고 완화): Release 설정에
```
DEBUG_INFORMATION_FORMAT='dwarf-with-dsym'
GCC_GENERATE_DEBUGGING_SYMBOLS=YES
STRIP_INSTALLED_PRODUCT=NO
```

## New Architecture
- ios/Podfile.properties.json: `{ "newArchEnabled": "true" }`
- Info.plist: `RCTNewArchEnabled=true`

## 코드 구현 요약 (services/appleFitnessService.js)
- HealthKit 모듈 로드 순서: dynamic import → require 폴백 → NativeModules(AppleHealthKit|RNAppleHealthKit)
- 시뮬레이터 모의 허용: `config/environment.js`의 `simulateHealthKitOnSimulator`
- 권한 옵션: `AppleHealthKit.Constants.Permissions` 기반
- 에러시 옵션/키 로그 출력

## 런타임/서명 검증 명령어
```
# 엔타이틀먼트
codesign -d --entitlements :- "<path>/RunOn.app" | plutil -p -
# 프로비저닝 App ID/HealthKit
security cms -D -i "<path>/RunOn.app/embedded.mobileprovision" | plutil -p - | grep -A3 application-identifier
security cms -D -i "<path>/RunOn.app/embedded.mobileprovision" | plutil -p - | grep -A5 'com.apple.developer.healthkit'
```

## 빌드/배포
```
cd ios
rm -rf Pods Podfile.lock ~/Library/Developer/Xcode/DerivedData/*
pod install --repo-update
xcodebuild -workspace RunOn.xcworkspace -scheme RunOn -configuration Release -sdk iphoneos clean build
```
- Archive → Distribute(TestFlight). dSYM 경고는 배포 가능(위 설정으로 완화).

## 점검 순서
1) 앱 엔타이틀먼트에 `com.apple.developer.healthkit=true` 포함
2) embedded.mobileprovision의 `application-identifier`가 Bundle ID와 일치
3) 런타임에서 `NativeModules.(AppleHealthKit|RNAppleHealthKit)` 존재
4) Pods 재설치 후 실기기 Release 빌드
5) 필요 시 경량 Swift 브리지로 권한만 요청
