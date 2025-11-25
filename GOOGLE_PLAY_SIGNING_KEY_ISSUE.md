# 🔐 Google Play Console 서명 키 오류 해결 가이드

## 📋 문제 상황

Google Play Console에 AAB를 업로드했을 때 다음과 같은 오류가 발생했습니다:

**오류 메시지**: "Android App Bundle이 잘못된 키로 서명되었습니다."

- **Google Play Console에 등록된 올바른 SHA-1**: `00:12:5F:D4:CD:61:EB:5F:B8:CA:01:86:E1:7A:DD:DC:E7:51:A4:6C`
  - Google Play Console → 출시 → 앱 무결성 → 업로드 키 인증서에서 확인됨
- **실제 업로드에 사용된 SHA-1 (잘못된 키)**: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
- **Firebase Console에 등록된 SHA-1**: `5e:8f:16:06:2e:a3:cd:2c:4a:0d:54:78:76:ba:a6:f3:8c:ab:f6:25` ⚠️
  - Firebase Console → 프로젝트 설정 → Android 앱 → SHA 인증서 지문에서 확인됨
  - **문제**: Firebase에 등록된 SHA-1이 잘못된 키의 SHA-1과 일치함

**Google Play Console 업로드 키 인증서 정보**:
- **MD5**: `00:48:CB:8A:A5:5F:3C:EE:04:A6:82:FF:F7:AA:B1:1F`
- **SHA-1**: `00:12:5F:D4:CD:61:EB:5F:B8:CA:01:86:E1:7A:DD:DC:E7:51:A4:6C` ✅
- **SHA-256**: `E8:4A:7F:0C:95:33:40:50:AD:48:4B:9B:E3:56:09:DF:21:61:C9:2A:12:02:CE:70:2A:34:A8:77:81:50:46:3E`

## ❌ Google Play Console에서 SHA-1 직접 변경 불가

**중요**: Google Play Console에서 SHA-1 값을 직접 변경할 수 **없습니다**. SHA-1은 서명 키에서 자동으로 생성되는 값이므로, 올바른 키로 AAB를 다시 서명해야 합니다.

## 🔍 현재 상황 확인

### 1. 키스토어 파일 위치
- **문서상 위치**: `android/app/upload-keystore.jks`
- **현재 상태**: 파일이 해당 위치에 없음
- **키스토어 정보**:
  - 패스워드: `runon2024!`
  - 키 별칭: `upload`
  - 키 패스워드: `runon2024!`

### 2. 키스토어 SHA-1 확인 방법

올바른 키스토어 파일을 찾았다면 다음 명령어로 SHA-1을 확인하세요:

```bash
keytool -list -v -keystore android/app/upload-keystore.jks -alias upload -storepass runon2024! | grep SHA1
```

## ✅ 해결 방법

### 방법 1: 올바른 키스토어로 재서명 (권장)

1. **올바른 키스토어 파일 찾기**
   - 백업 폴더 확인
   - 다른 개발자에게 문의
   - 안전한 저장소에서 복원

2. **키스토어 SHA-1 확인**
   ```bash
   keytool -list -v -keystore [키스토어경로] -alias upload -storepass runon2024! | grep SHA1
   ```
   - **중요**: SHA-1이 `00:12:5F:D4:CD:61:EB:5F:B8:CA:01:86:E1:7A:DD:DC:E7:51:A4:6C`와 **정확히 일치**해야 합니다
   - Google Play Console의 "업로드 키 인증서" 페이지에 표시된 SHA-1과 동일해야 합니다

3. **올바른 키스토어로 AAB 재빌드**
   - 키스토어 파일을 `android/app/upload-keystore.jks`에 배치
   - `android/keystore.properties` 파일 설정 확인
   - AAB 다시 빌드 및 업로드

4. **Firebase Console에 올바른 SHA-1 추가** ⚠️ **중요**
   - Firebase Console → 프로젝트 설정 → Android 앱 (RunOn) 선택
   - "SHA 인증서 지문" 섹션에서 "디지털 지문 추가" 클릭
   - 올바른 키스토어의 SHA-1 (`00:12:5F:D4:CD:61:EB:5F:B8:CA:01:86:E1:7A:DD:DC:E7:51:A4:6C`) 추가
   - 기존의 잘못된 SHA-1 (`5e:8f:16:06:2e:a3:cd:2c:4a:0d:54:78:76:ba:a6:f3:8c:ab:f6:25`)은 삭제하거나 그대로 둘 수 있음 (여러 SHA-1 등록 가능)

### 방법 2: Google Play Console에서 업로드 키 재설정

만약 올바른 키스토어를 찾을 수 없다면:

1. **Google Play Console 접속**
   - [Google Play Console](https://play.google.com/console)
   - 앱 선택 → **출시** → **앱 무결성** (App Integrity)

2. **앱 서명 정보 확인**
   - "앱 서명" 섹션에서 현재 등록된 업로드 키 확인
   - "업로드 키 인증서" 정보 확인

3. **업로드 키 재설정 (필요시)**
   - Google Play Console에서 업로드 키를 재설정할 수 있습니다
   - 단, 이는 신중하게 진행해야 하며 Google 지원팀에 문의가 필요할 수 있습니다

### 방법 3: EAS Build 사용 시

EAS Build를 사용하는 경우:

1. **EAS 자격 증명 확인**
   ```bash
   eas credentials
   ```

2. **EAS에 저장된 키스토어 확인**
   - EAS가 키스토어를 관리하는 경우, EAS 대시보드에서 확인
   - 올바른 키스토어가 등록되어 있는지 확인

3. **올바른 키로 재빌드**
   ```bash
   eas build --platform android --profile production
   ```

## 🔧 키스토어 복원 방법

### 백업에서 복원

```bash
# 백업 위치에서 키스토어 복원
cp [백업경로]/upload-keystore.jks android/app/

# keystore.properties 파일도 복원 (있는 경우)
cp [백업경로]/keystore.properties android/
```

## 📝 체크리스트

### 문제 해결 전 확인사항
- [ ] 올바른 키스토어 파일 위치 확인
- [ ] 키스토어 파일의 SHA-1 값 확인
- [ ] Google Play Console의 예상 SHA-1과 일치하는지 확인
- [ ] Firebase Console에 등록된 SHA-1 확인 및 올바른 SHA-1 추가
- [ ] `android/keystore.properties` 파일 설정 확인
- [ ] 빌드 설정이 올바른 키스토어를 사용하는지 확인

### 해결 후 확인사항
- [ ] 올바른 키스토어로 AAB 재빌드 완료
- [ ] 재빌드한 AAB의 서명 확인
- [ ] Firebase Console에 올바른 SHA-1 추가 완료
- [ ] Google Play Console에 성공적으로 업로드
- [ ] 업로드 후 오류 없이 검증 완료

## ⚠️ 주의사항

1. **키스토어 분실 시**
   - 키스토어를 분실하면 기존 앱 업데이트가 불가능할 수 있습니다
   - 새 키스토어를 사용하려면 Google Play Console에서 업로드 키 재설정이 필요합니다

2. **서명 키 변경의 영향**
   - 서명 키를 변경하면 기존 사용자에게 업데이트를 제공하는 데 문제가 발생할 수 있습니다
   - 가능하면 원래 키스토어를 사용하는 것이 좋습니다

3. **보안**
   - 키스토어 파일과 비밀번호는 절대 공개하지 마세요
   - 안전한 곳에 백업을 보관하세요

## 📞 추가 도움

- **Google Play Console 지원**: [Google Play Console 도움말](https://support.google.com/googleplay/android-developer)
- **EAS Build 문서**: [Expo EAS Build 문서](https://docs.expo.dev/build/introduction/)

---

**작성일**: 2024년 11월  
**관련 문서**: `KEYSTORE_BACKUP_INFO.md`, `GOOGLE_PLAY_DEPLOYMENT_GUIDE.md`

