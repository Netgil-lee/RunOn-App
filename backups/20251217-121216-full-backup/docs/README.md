# RunOn - 정책 페이지

이 디렉터리는 RunOn 앱의 GitHub Pages 호스팅을 위한 정책 페이지들을 포함합니다.

## 🌐 GitHub Pages 설정 방법

### 1. 저장소 설정
1. GitHub 저장소로 이동
2. **Settings** 탭 클릭
3. **Pages** 섹션으로 이동
4. **Source**를 "Deploy from a branch"로 설정
5. **Branch**를 "main"으로 선택
6. **Folder**를 "/docs"로 선택
7. **Save** 클릭

### 2. 링크 업데이트
저장소 설정 후 다음 파일의 링크를 실제 GitHub Pages URL로 업데이트하세요:

**screens/SettingsScreen.js**
```javascript
Linking.openURL('https://YOUR_GITHUB_USERNAME.github.io/REPOSITORY_NAME/')
```

실제 URL 예시:
```javascript
Linking.openURL('https://yourusername.github.io/RunOn-App/')
```

### 3. 페이지 확인
- 아동 보호 정책: `https://yourusername.github.io/RunOn-App/`
- 개인정보처리방침: `https://yourusername.github.io/RunOn-App/privacy-policy.html`

## 📄 포함된 페이지

- **index.html**: 아동 안전 및 보호 정책
- **privacy-policy.html**: 개인정보처리방침
- **_config.yml**: Jekyll 설정 파일

## 🔧 수정 방법

정책 내용을 수정하려면:
1. 해당 HTML 파일을 편집
2. GitHub에 커밋 및 푸시
3. GitHub Pages가 자동으로 업데이트 (보통 1-5분 소요)

## 📞 연락처

정책 관련 문의:
- 이메일: dlrhdkgml12@gmail.com
- 전화: 02-0000-0000
