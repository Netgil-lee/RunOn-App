# Galaxy S25 에뮬레이터 생성 단계별 가이드

## 📋 빠른 참조 가이드

Android Studio에서 Galaxy S25 에뮬레이터를 생성하는 단계별 가이드입니다.

---

## 🎯 단계별 생성 과정

### 1단계: Device Manager 열기
- Android Studio 상단 메뉴: **Tools → Device Manager**
- 또는 오른쪽 사이드바의 **Device Manager** 아이콘 클릭

### 2단계: Create Device 클릭
- Device Manager 창 상단의 **Create Device** 버튼 클릭

### 3단계: 기기 선택
- **Category**: Phone 선택
- **기기 목록**에서 다음 순서로 검색 및 선택:
  1. **"Galaxy S24"** 검색 → **Galaxy S24 Ultra** 선택 (가장 권장)
  2. 없으면 **"Galaxy S23"** 검색 → **Galaxy S23 Ultra** 선택
  3. 없으면 **"Galaxy S22"** 검색 → **Galaxy S22 Ultra** 선택
  4. 그것도 없으면 **"Pixel 9"** 검색 → **Pixel 9 Pro** 선택

> **중요**: Galaxy S25는 Android Studio 기본 목록에 없습니다.
> **Galaxy S24 Ultra를 선택하고 에뮬레이터 이름만 `Galaxy_S25`로 설정**하면 됩니다.
> 스펙이 거의 동일하므로 테스트에는 문제가 없습니다.

### 4단계: 시스템 이미지 선택
- **Recommended** 탭 클릭
- 다음 중 하나 선택:
  - ✅ **Android 14.0 (API 34)** - Google APIs (권장)
  - Android 13.0 (API 33) - Google APIs (최소)
- 시스템 이미지가 없으면 **Download** 버튼 클릭
- 다운로드 완료 후 **Next** 클릭

### 5단계: 에뮬레이터 설정
- **AVD Name**: `Galaxy_S25` 입력
- **Show Advanced Settings** 클릭 (선택사항이지만 권장)
  - **RAM**: `2048` MB 이상 (4096 MB 권장)
  - **VM heap**: `512` MB
  - **Internal Storage**: `2048` MB 이상
  - **SD Card**: `512` MB (선택사항)
  - **Graphics**: 
    - ✅ **Hardware - GLES 2.0** (권장 - 성능 향상)
    - 또는 Automatic
  - **Camera**: 
    - Front: Webcam0 또는 None
    - Back: Webcam0 또는 None
- **Finish** 클릭

### 6단계: 생성 완료 확인
- Device Manager에 `Galaxy_S25` 에뮬레이터가 표시되는지 확인
- 에뮬레이터 옆의 **▶️ Play 버튼**으로 실행 테스트 가능

---

## ✅ 생성 후 확인

터미널에서 다음 명령어로 확인:

```bash
# 에뮬레이터 목록 확인
emulator -list-avds

# Galaxy_S25가 목록에 표시되어야 합니다
```

---

## 🚀 에뮬레이터 실행

### 방법 1: Android Studio에서 실행
- Device Manager에서 `Galaxy_S25` 옆의 **▶️ Play 버튼** 클릭

### 방법 2: 명령어로 실행
```bash
# Galaxy S25 에뮬레이터 실행
emulator -avd Galaxy_S25 &

# 또는 제공된 스크립트 사용
./start-android-emulator.sh
```

### 방법 3: 연결 확인
```bash
# 기기 연결 확인
adb devices

# 출력 예시:
# List of devices attached
# emulator-5554    device
```

---

## 📱 Galaxy S25 실제 스펙 (참고)

에뮬레이터 생성 시 참고할 스펙:

| 항목 | 스펙 |
|------|------|
| 화면 크기 | 6.2인치 (또는 6.7인치 Ultra) |
| 해상도 | 1080 x 2340 (FHD+) 또는 1440 x 3088 (QHD+) |
| RAM | 8GB 이상 |
| Android 버전 | Android 14 (One UI 6.1) |
| API Level | 34 이상 |

---

## 🔍 문제 해결

### 문제 1: Galaxy S24 Ultra가 목록에 없음
**해결 방법:**
- Pixel 9 Pro 선택 (비슷한 최신 스펙)
- 또는 Galaxy S23 Ultra 선택

### 문제 2: 시스템 이미지 다운로드 실패
**해결 방법:**
1. Android Studio → Tools → SDK Manager
2. SDK Platforms 탭에서 Android 14 (API 34) 체크
3. Apply 클릭하여 다운로드

### 문제 3: 에뮬레이터가 느림
**해결 방법:**
1. Device Manager에서 에뮬레이터 설정 열기 (연필 아이콘)
2. Show Advanced Settings
3. Graphics: Hardware - GLES 2.0 선택
4. RAM: 4096 MB로 증가

---

## 📝 체크리스트

생성 과정 확인:
- [ ] Device Manager 열기
- [ ] Create Device 클릭
- [ ] Galaxy S24 Ultra 또는 Pixel 9 Pro 선택
- [ ] Android 14 (API 34) 시스템 이미지 선택/다운로드
- [ ] AVD Name: `Galaxy_S25` 입력
- [ ] Advanced Settings에서 Graphics: Hardware - GLES 2.0 선택
- [ ] Finish 클릭
- [ ] `emulator -list-avds`로 목록 확인

---

**작성일**: 2025-01-XX
**버전**: 1.0.0

