# Kakao API 설정 가이드

## 401 오류 해결 (Kakao Places API)

장소 검색 시 `Kakao Places API 응답 오류: 401`이 발생하면 **REST API 키** 설정을 확인하세요.

### 원인

- **JavaScript 키** (kakaoMapApiKey): 카카오맵 웹뷰용
- **REST API 키** (kakaoRestApiKey): 장소 검색(Local API)용

두 키가 다르며, Local Search API에는 **REST API 키**만 사용할 수 있습니다.

### 해결 방법

1. [Kakao Developers Console](https://developers.kakao.com/console/app) 접속
2. 앱 선택 → **앱 키** 메뉴
3. **REST API 키** 복사
4. `app.json`의 `extra.kakaoRestApiKey`에 해당 값 설정

```json
"extra": {
  "kakaoMapApiKey": "464318d78ffeb1e52a1185498fe1af08",
  "kakaoRestApiKey": "여기에_REST_API_키_입력",
  ...
}
```

5. 앱 재빌드 후 장소 검색 재시도

### 추가 확인사항

- **로컬 API 활성화**: [앱 설정] → [제품 설정] → [로컬] API가 활성화되어 있는지 확인
- **플랫폼 설정**: Android/iOS 앱이 등록되어 있는지 확인

### "Network request failed" 오류

장소 검색 시 `TypeError: Network request failed`가 발생하면:

- **인터넷 연결**: 기기/에뮬레이터의 네트워크 연결 확인
- **에뮬레이터**: Android 에뮬레이터는 네트워크가 불안정할 수 있음 → 실제 기기에서 테스트
- **VPN/방화벽**: 회사망·VPN 사용 시 `dapi.kakao.com` 차단 여부 확인
- **권한**: `AndroidManifest.xml`에 `INTERNET` 권한 포함 여부 확인
