# 네이버 클라우드 SMS 설정 가이드

## 📱 네이버 클라우드 SMS 연동

RunOn 앱에서 실제 SMS 인증을 위해 네이버 클라우드 SMS를 사용합니다.

## 🔧 설정 단계

### 1. 네이버 클라우드 콘솔 설정

#### **1.1 네이버 클라우드 플랫폼 가입**
1. [네이버 클라우드 플랫폼](https://www.ncloud.com/) 접속
2. 회원가입 및 로그인
3. 결제 수단 등록 (SMS 사용을 위해 필요)

#### **1.2 SMS 서비스 활성화**
1. 네이버 클라우드 콘솔 → **AI·NAVER API** → **SENS** 선택
2. **SMS** 서비스 활성화
3. **서비스 ID** 생성 및 확인
4. **발신번호** 등록 (사업자 인증 필요)

#### **1.3 API 키 생성**
1. **IAM** → **Access Key** → **Access Key 생성**
2. **Access Key ID**와 **Secret Access Key** 확인
3. 생성된 키를 안전한 곳에 보관

### 2. 환경 변수 설정

#### **2.1 app.json 설정**
```json
{
  "expo": {
    "extra": {
      "smsApiKey": "your-naver-cloud-access-key",
      "smsSecretKey": "your-naver-cloud-secret-key", 
      "smsServiceId": "your-naver-cloud-service-id",
      "smsFromNumber": "01012345678"
    }
  }
}
```

#### **2.2 .env 파일 설정 (선택사항)**
```env
EXPO_PUBLIC_SMS_API_KEY=your-naver-cloud-access-key
EXPO_PUBLIC_SMS_SECRET_KEY=your-naver-cloud-secret-key
EXPO_PUBLIC_SMS_SERVICE_ID=your-naver-cloud-service-id
EXPO_PUBLIC_SMS_FROM_NUMBER=01012345678
```

### 3. 실제 SMS 전송 활성화

#### **3.1 SMS 서비스 활성화**
`services/smsService.js`에서 주석 처리된 부분을 해제:

```javascript
// 실제 네이버 클라우드 SMS API 호출
const timestamp = Date.now().toString();
const url = `/sms/v2/services/${this.serviceId}/messages`;
const signature = this.generateSignature(timestamp, 'POST', url);

const response = await fetch(`https://sens.apigw.ntruss.com${url}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-ncp-apigw-timestamp': timestamp,
    'x-ncp-iam-access-key': this.apiKey,
    'x-ncp-apigw-signature-v2': signature
  },
  body: JSON.stringify({
    type: 'SMS',
    contentType: 'COMM',
    countryCode: '82',
    from: this.fromNumber,
    content: `RunOn 인증번호: ${verificationCode}`,
    messages: [{ to: phoneNumber }]
  })
});

const result = await response.json();
```

#### **3.2 모의 응답 제거**
```javascript
// 이 부분을 제거하고 실제 API 응답 사용
// const mockResponse = { ... };
// return mockResponse;
```

## 📊 비용 정보

### **네이버 클라우드 SMS 요금**
- **일반 SMS**: 8.8원/건
- **월 1,000건**: 8,800원
- **월 10,000건**: 88,000원

### **사용량 제한**
- **일일 발송 한도**: 1,000건 (기본)
- **월 발송 한도**: 10,000건 (기본)
- **발신번호당 시간당**: 100건

## 🔒 보안 설정

### **1. API 키 보안**
```javascript
// 환경 변수로 관리
const apiKey = process.env.EXPO_PUBLIC_SMS_API_KEY;
const secretKey = process.env.EXPO_PUBLIC_SMS_SECRET_KEY;
```

### **2. 발신번호 인증**
- 사업자등록증 업로드
- 발신번호 인증 완료
- 인증 완료 후 SMS 발송 가능

### **3. Rate Limiting**
```javascript
// 같은 번호로 연속 전송 제한
const rateLimit = await redis.get(`rate_limit:${phoneNumber}`);
if (rateLimit) {
  throw new Error('너무 많은 인증번호 요청이 있었습니다.');
}
```

## 🚨 주의사항

### **1. 발신번호 등록**
- 사업자 인증 필수
- 인증 완료까지 1-2일 소요
- 인증 완료 전까지 SMS 발송 불가

### **2. SMS 내용 제한**
- **최대 길이**: 90자
- **특수문자**: 제한적 사용 가능
- **이모지**: 사용 불가

### **3. 수신번호 형식**
- **국내**: 01012345678 (하이픈 제외)
- **해외**: +821012345678 (국가코드 포함)

## 🧪 테스트 방법

### **1. 개발 모드 테스트**
```javascript
// 콘솔에서 생성된 인증번호 확인
console.log('🔢 생성된 인증번호:', verificationCode);
```

### **2. 실제 SMS 테스트**
1. 네이버 클라우드 콘솔에서 발신번호 인증 완료
2. 환경 변수 설정 완료
3. 실제 휴대폰 번호로 테스트

### **3. 에러 처리 테스트**
```javascript
// 잘못된 번호로 테스트
const invalidNumber = '010-0000-0000';
// 에러 메시지 확인
```

## 📈 모니터링

### **1. 네이버 클라우드 콘솔**
- **SMS** → **발송 내역** 확인
- **성공률** 및 **실패 원인** 분석
- **사용량** 및 **비용** 추적

### **2. 앱 로그 모니터링**
```javascript
// SMS 전송 성공 로그
console.log('✅ 네이버 클라우드 SMS 전송 성공');

// SMS 전송 실패 로그
console.error('❌ 네이버 클라우드 SMS 전송 실패:', error);
```

## 🔧 문제 해결

### **1. 인증 실패**
```
Error: SMS 서비스 인증에 실패했습니다.
```
**해결 방법:**
- API 키 확인
- Secret Key 확인
- 서비스 ID 확인

### **2. 발신번호 오류**
```
Error: 유효하지 않은 발신번호입니다.
```
**해결 방법:**
- 발신번호 등록 확인
- 사업자 인증 완료 확인

### **3. 할당량 초과**
```
Error: SMS 할당량을 초과했습니다.
```
**해결 방법:**
- 일일/월간 한도 확인
- 사용량 증가 요청

## 📞 지원

### **네이버 클라우드 지원**
- **고객센터**: 1588-3838
- **기술문서**: [SMS API 가이드](https://api.ncloud-docs.com/docs/ai-naver-cloud-sms-sms)
- **개발자 포럼**: [네이버 클라우드 포럼](https://forum.ncloud.com/)

### **RunOn 앱 지원**
- **개발팀**: 개발팀 연락처
- **이슈 트래커**: GitHub Issues
- **문서**: 프로젝트 README

## ✅ 체크리스트

- [ ] 네이버 클라우드 플랫폼 가입
- [ ] SMS 서비스 활성화
- [ ] 서비스 ID 생성
- [ ] 발신번호 등록 및 인증
- [ ] API 키 생성
- [ ] 환경 변수 설정
- [ ] 실제 SMS API 활성화
- [ ] 테스트 완료
- [ ] 모니터링 설정
- [ ] 에러 처리 구현 