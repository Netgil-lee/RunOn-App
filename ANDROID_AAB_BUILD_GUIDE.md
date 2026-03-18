# Android AAB 빌드 가이드 (Google Play 프로덕션 배포)

> **⚠️ 필수**: AAB 빌드 시 반드시 이 가이드를 따를 것. EAS Build가 아닌 **로컬 빌드**를 사용해야 함.

---

## 왜 로컬 빌드인가?

EAS Build는 Expo 서버에 저장된 별도의 키스토어(`Build Credentials zuYGdbj8Rf`)를 사용하며,
이 키의 SHA1(`9F:28:FE:68:...`)은 Google Play에 등록된 업로드 키와 **다르다**.

로컬 빌드는 `android/keystore.properties` → `android/app/upload-keystore.jks`를 직접 사용하므로
Google Play가 요구하는 올바른 키(SHA1: `02:48:73:8E:...`)로 서명된다.

| 빌드 방식 | 서명 키 SHA1 | Google Play 호환 |
|-----------|-------------|-----------------|
| **로컬 `./gradlew bundleRelease`** | `02:48:73:8E:D2:E3:5E:BD:06:69:FB:9C:6E:4D:90:30:4C:F4:13:B8` | ✅ 일치 |
| EAS Build (원격) | `9F:28:FE:68:58:72:58:D6:BB:40:1B:9D:FB:D2:7E:FC:78:F3:F8:45` | ❌ 불일치 |

---

## 빌드 절차

### 1단계: 버전 올리기

**두 곳 모두** 버전을 올려야 한다:

**`app.json`** (Expo 설정):
```json
"version": "X.Y.Z",
"android": {
  "versionCode": N
}
```

**`android/app/build.gradle`** (네이티브 설정 — 로컬 빌드는 이 값을 사용):
```gradle
versionCode N
versionName "X.Y.Z"
```

> `versionCode`는 Google Play에 업로드할 때마다 반드시 1씩 올려야 한다.
> 두 파일의 version/versionCode 값이 반드시 일치해야 한다.

### 2단계: 로컬 AAB 빌드

```bash
cd android
./gradlew bundleRelease
```

빌드 시간: 약 1~3분

### 3단계: AAB 파일 확인

생성 위치:
```
android/app/build/outputs/bundle/release/app-release.aab
```

### 4단계: 서명 키 검증 (선택, 권장)

```bash
keytool -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab | grep "SHA1:"
```

결과가 아래와 일치해야 함:
```
SHA1: 02:48:73:8E:D2:E3:5E:BD:06:69:FB:9C:6E:4D:90:30:4C:F4:13:B8
```

### 5단계: Google Play Console 업로드

`app-release.aab` 파일을 Google Play Console → 프로덕션 트랙에 업로드

---

## 키스토어 정보

| 항목 | 값 |
|------|---|
| 키스토어 파일 | `android/app/upload-keystore.jks` |
| 설정 파일 | `android/keystore.properties` |
| 키 별칭 | `upload` |
| SHA1 | `02:48:73:8E:D2:E3:5E:BD:06:69:FB:9C:6E:4D:90:30:4C:F4:13:B8` |

> 키스토어 비밀번호는 `KEYSTORE_BACKUP_INFO.md` 참고

---

## 자주 하는 실수

### ❌ EAS Build로 AAB 생성
```bash
# 이렇게 하면 안 됨! (EAS 서버의 다른 키스토어로 서명됨)
eas build --platform android --profile production
```

### ❌ build.gradle 버전을 안 올림
```
# app.json만 올리고 build.gradle을 안 올리면
# 로컬 빌드는 build.gradle의 이전 versionCode를 사용하여 Google Play 업로드 거부됨
```

### ❌ 두 파일의 버전이 불일치
```
# app.json: versionCode 17, version "1.0.3"
# build.gradle: versionCode 16, versionName "1.0.2"
# → 반드시 두 파일을 동일하게 맞출 것
```

---

## 빌드 이력

| 날짜 | 버전 | versionCode | 비고 |
|------|------|-------------|------|
| 2026-03-17 | 1.0.3 | 17 | 지도/위치 수정, 로컬 빌드로 전환 |

---

**작성일**: 2026-03-17
**최종 업데이트**: 2026-03-17
