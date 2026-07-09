# GitHub Pages 커스텀 도메인 설정 가이드

## 📋 설정 전 확인사항

1. DNS 설정 완료 확인
   - CNAME 레코드: `www.runonapp.kr` → `netgil-lee.github.io`
   - DNS 전파 확인: [whatsmydns.net](https://www.whatsmydns.net)에서 확인
2. GitHub 저장소 접근 권한 확인
3. 저장소가 GitHub Pages로 활성화되어 있는지 확인

---

## 🔧 GitHub Pages 설정 방법

### 1단계: GitHub 저장소 접속

1. [GitHub](https://github.com)에 로그인
2. 저장소 `RunOn-App` (또는 해당 저장소)로 이동
3. 저장소 페이지 상단의 **Settings** 탭 클릭

### 2단계: Pages 설정으로 이동

1. Settings 페이지 왼쪽 사이드바에서 **Pages** 메뉴 클릭
2. 또는 URL로 직접 이동: `https://github.com/netgil-lee/RunOn-App/settings/pages`

### 3단계: Source 설정 (처음 설정하는 경우)

**Build and deployment** 섹션에서:
1. **Source** 드롭다운 선택
2. **Deploy from a branch** 선택
3. **Branch** 선택:
   - Branch: `main` (또는 `master`)
   - Folder: `/docs` 선택
4. **Save** 버튼 클릭

### 4단계: 커스텀 도메인 설정

**Custom domain** 섹션에서:
1. **Custom domain** 입력 필드에 `www.runonapp.kr` 입력
   - ⚠️ `http://` 또는 `https://` 없이 입력
   - ⚠️ 마지막 슬래시(/) 없이 입력
2. **Save** 버튼 클릭

### 5단계: 설정 확인

저장 후 몇 초~몇 분 내에:
- ✅ **DNS 체크 표시**: 초록색 체크 표시가 나타나면 DNS 설정이 올바름
- ❌ **경고 표시**: 빨간색 경고가 나타나면 DNS 전파 대기 또는 설정 확인 필요

---

## ⏱️ 설정 후 대기 시간

### DNS 전파 대기
- **일반**: 1-24시간
- **최대**: 48시간

### GitHub Pages 인식
- DNS 전파 완료 후 **자동으로 인식**
- 인식되면 초록색 체크 표시(✓)가 나타남

---

## 🔒 HTTPS 설정 (Enforce HTTPS)

### 활성화 조건
1. DNS 전파 완료
2. GitHub Pages가 도메인 인식 완료
3. Let's Encrypt 인증서 발급 (자동, 24시간 내)

### 활성화 방법
1. **Custom domain** 섹션에서
2. **Enforce HTTPS** 체크박스가 활성화되면 체크
3. 체크 후 `https://www.runonapp.kr`로 자동 리다이렉트

---

## ✅ 설정 확인 체크리스트

- [ ] GitHub 저장소 Settings > Pages 접속
- [ ] Source: `/docs` 폴더에서 배포 설정
- [ ] Custom domain: `www.runonapp.kr` 입력
- [ ] Save 클릭
- [ ] DNS 체크 표시(✓) 확인 (몇 분~몇 시간 소요)
- [ ] `https://www.runonapp.kr` 접속 테스트
- [ ] `https://www.runonapp.kr/privacy-policy.html` 접속 테스트
- [ ] Enforce HTTPS 활성화 (24시간 후)

---

## 🔍 문제 해결

### 문제 1: "DNS check failed" 오류

**원인**:
- DNS 전파가 아직 완료되지 않음
- CNAME 레코드가 올바르게 설정되지 않음

**해결 방법**:
1. [whatsmydns.net](https://www.whatsmydns.net)에서 DNS 전파 확인
2. CNAME 레코드가 `netgil-lee.github.io`로 올바르게 설정되었는지 확인
3. 24시간 대기 후 다시 확인

### 문제 2: "InvalidARecordError" 오류

**원인**:
- `www` 서브도메인에 A 레코드가 설정되어 있음

**해결 방법**:
1. DNS 관리 페이지에서 `www` A 레코드 모두 삭제
2. CNAME 레코드로 변경 (`netgil-lee.github.io`)
3. GitHub Pages에서 도메인 삭제 후 다시 추가

### 문제 3: "Enforce HTTPS" 옵션이 비활성화됨

**원인**:
- DNS 전파가 완료되지 않음
- 인증서가 아직 발급되지 않음

**해결 방법**:
1. DNS 전파 완료 대기 (최대 48시간)
2. 24시간 후 다시 확인
3. GitHub Pages가 도메인을 인식할 때까지 대기

### 문제 4: 도메인을 삭제하고 다시 추가하려면

1. **Custom domain** 입력 필드의 도메인 삭제
2. **Save** 클릭
3. 몇 분 대기
4. 다시 도메인 입력 후 **Save** 클릭

---

## 📸 설정 화면 예시

### Custom domain 섹션

```
Custom domain
─────────────
[www.runonapp.kr                    ] [Save]

✓ DNS check successful
  Your site's DNS settings are correctly configured.

☐ Enforce HTTPS
  (Only available after DNS configuration is detected)
```

### DNS 체크 성공 후

```
Custom domain
─────────────
[www.runonapp.kr                    ] [Save]

✓ DNS check successful
  Your site's DNS settings are correctly configured.

☑ Enforce HTTPS
  Visitors to your site will be redirected to HTTPS.
```

---

## 🎯 최종 확인

설정이 완료되면:

1. **브라우저에서 접속 테스트**:
   - `https://www.runonapp.kr` ✅
   - `https://www.runonapp.kr/privacy-policy.html` ✅

2. **GitHub Pages 상태 확인**:
   - Settings > Pages에서 초록색 체크 표시 확인
   - Enforce HTTPS 활성화 확인

3. **자동 배포 확인**:
   - `docs` 폴더의 파일을 수정하고 커밋하면 자동으로 배포됨
   - 배포는 보통 1-5분 내 완료

---

## 📝 참고사항

### CNAME 파일 확인

`docs/CNAME` 파일이 올바르게 설정되어 있는지 확인:
```
www.runonapp.kr
```

이 파일은 GitHub에 푸시되어 있어야 합니다.

### 루트 도메인도 사용하려면

`runonapp.kr` (www 없이)도 사용하려면:
1. GitHub Pages Settings에서 추가 도메인으로 등록
2. 또는 `www.runonapp.kr`로 리다이렉트 설정

---

**작성일**: 2026년 1월 28일  
**도메인**: www.runonapp.kr  
**GitHub 사용자명**: netgil-lee  
**저장소**: RunOn-App
