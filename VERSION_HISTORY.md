# RunOn 앱 버전 관리 기록

## 📱 Google Play Console 업로드 이력

### v1.0.1 (versionCode: 3) - 2024년 8월 17일
**📋 출시명**: `RunOn v1.0.1 - versionCode 중복 문제 해결`

**🎯 주요 변경사항**:
- 🔢 versionCode 중복 문제 해결
  - Google Play Console APK 중복 경고 해결
  - versionCode 2→3 업데이트로 새로운 업로드 가능
- 🛡️ 아동 안전 정책 강화 (유지)
  - 앱 내 아동 안전 정책 페이지 포함
  - CSAE(아동성적학대착취) 콘텐츠 금지 정책 명시
  - 24시간 신고 시스템 운영
- 🔒 개인정보처리방침 업데이트 (유지)
  - 아동 개인정보 보호 조항 포함

**📂 파일 정보**:
- AAB 파일: `app-release.aab`
- 파일 크기: ~52MB (54,258,480 bytes)
- 패키지명: `com.runon.app`
- 키스토어: `upload-keystore.jks`
- 생성 시간: 2024년 8월 17일 16:23

**🔗 정책 링크**:
- 아동 안전 정책: https://netgil-lee.github.io/RunOn-App/
- 개인정보처리방침: https://netgil-lee.github.io/RunOn-App/privacy-policy.html

**📞 신고 채널**:
- 일반 신고: dlrhdkgml12@gmail.com

**⚠️ 해결된 문제**:
- Google Play Console "APK 중복" 경고 완전 해결
- versionCode 2→3 업데이트로 새로운 업로드 가능
- 모든 Play Console 요구사항 준수
- 버전 일관성 확보 (app.json ↔ build.gradle)

---

### v1.0.1 (versionCode: 2) - 2024년 8월 17일 [폐기됨]
**📋 출시명**: `RunOn v1.0.1 - 아동 안전 정책 업데이트`

**🎯 주요 변경사항**:
- 🛡️ 아동 안전 정책 강화
  - 앱 내 아동 안전 정책 페이지 추가
  - CSAE(아동성적학대착취) 콘텐츠 금지 정책 명시
  - 24시간 신고 시스템 운영
- 🔒 개인정보처리방침 업데이트
  - 아동 개인정보 보호 조항 추가
- 📱 앱 기능 개선
  - 설정 화면 정책 링크 접근성 향상
  - 버전 정보 업데이트

**📂 파일 정보**:
- AAB 파일: `app-release.aab`
- 파일 크기: ~52MB (54,258,478 bytes)
- 패키지명: `com.runon.app`
- 키스토어: `upload-keystore.jks`

**🔗 정책 링크**:
- 아동 안전 정책: https://netgil-lee.github.io/RunOn-App/
- 개인정보처리방침: https://netgil-lee.github.io/RunOn-App/privacy-policy.html

**📞 신고 채널**:
- 일반 신고: dlrhdkgml12@gmail.com

**⚠️ 해결된 문제**:
- Google Play Console CSAE 경고 해결
- 정책 페이지 링크 누락 문제 해결
- 버전 불일치 문제 해결 (app.json versionCode 1→2 수정)

---

### v1.0.0 (versionCode: 1) - 2024년 8월 17일
**📋 출시명**: `RunOn 초기 버전`

**🎯 주요 기능**:
- 🏃‍♂️ 러닝 모임 플랫폼 기본 기능
- 📍 한강 러닝 코스 지도
- 👥 커뮤니티 기능
- 📅 일정 관리
- 🔔 알림 시스템
- 🌤️ 날씨 정보

**📂 파일 정보**:
- 첫 번째 AAB 업로드
- 패키지명: `com.runon.app`
- 새로운 프로젝트로 시작

**⚠️ 알려진 문제**:
- 아동 안전 정책 링크 누락 (v1.0.1에서 해결)

---

## 📋 다음 버전 업로드 템플릿

### v[VERSION] (versionCode: [CODE]) - [날짜]
**📋 출시명**: `[출시명]`

**🎯 주요 변경사항**:
- [변경사항 1]
- [변경사항 2]

**📂 파일 정보**:
- AAB 파일: `app-release.aab`
- 파일 크기: [크기]
- 패키지명: `com.runon.app`
- 키스토어: `upload-keystore.jks`

**⚠️ 해결된 문제**:
- [해결된 문제들]

**🔄 업그레이드 노트**:
- [특별히 주의할 점이나 변경사항]

---

## 🔧 버전 업데이트 체크리스트

### 빌드 전 확인사항
- [ ] `app.json`에서 `version` 업데이트
- [ ] `android/app/build.gradle`에서 `versionCode`, `versionName` 업데이트
- [ ] 변경사항 테스트 완료
- [ ] 키스토어 파일 백업 확인

### 빌드 과정
- [ ] `./gradlew clean` 실행
- [ ] `./gradlew bundleRelease` 실행
- [ ] AAB 파일 생성 확인

### 업로드 후
- [ ] Google Play Console 업로드 완료
- [ ] 출시 노트 작성
- [ ] 이 문서에 버전 기록 추가
- [ ] Git 커밋 및 태그 생성

---

## 📱 키스토어 정보

**파일 위치**: `/Users/lee_mac/RunOn-App/android/app/upload-keystore.jks`
**백업 정보**: `KEYSTORE_BACKUP_INFO.md` 참조

**⚠️ 중요**: 키스토어 파일을 절대 삭제하지 마세요! 이 파일 없이는 앱 업데이트가 불가능합니다.

---

*마지막 업데이트: 2024년 8월 17일*
