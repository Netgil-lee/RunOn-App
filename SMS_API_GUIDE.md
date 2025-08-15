# SMS API 구현 가이드

## 📱 서버 사이드 SMS 인증 시스템

현재 앱은 모의 SMS 서비스를 사용하고 있습니다. 실제 SMS 전송을 위해 서버 API를 구현해야 합니다.

## 🔧 구현 방법

### 1. SMS 서비스 선택

#### **옵션 1: 네이버 클라우드 SMS (추천)**
```javascript
// 네이버 클라우드 SMS API
const sendSMS = async (phoneNumber) => {
  const response = await fetch('https://sens.apigw.ntruss.com/sms/v2/services/{serviceId}/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ncp-apigw-timestamp': timestamp,
      'x-ncp-iam-access-key': accessKey,
      'x-ncp-apigw-signature-v2': signature
    },
    body: JSON.stringify({
      type: 'SMS',
      contentType: 'COMM',
      countryCode: '82',
      from: '발신번호',
      content: 'RunOn 인증번호: {인증번호}',
      messages: [{ to: phoneNumber }]
    })
  });
};
```

#### **옵션 2: AWS SNS**
```javascript
// AWS SNS API
const sendSMS = async (phoneNumber) => {
  const response = await fetch('https://sns.ap-northeast-2.amazonaws.com/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `AWS4-HMAC-SHA256 Credential=${accessKey}`
    },
    body: `Action=Publish&Message=${encodeURIComponent(message)}&PhoneNumber=${phoneNumber}`
  });
};
```

#### **옵션 3: Twilio**
```javascript
// Twilio SMS API
const sendSMS = async (phoneNumber) => {
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `To=${phoneNumber}&From=${fromNumber}&Body=${encodeURIComponent(message)}`
  });
};
```

### 2. 서버 API 엔드포인트

#### **SMS 전송 API**
```
POST /api/sms/send
Content-Type: application/json

{
  "phoneNumber": "+821012345678",
  "message": "RunOn 인증번호: 123456"
}
```

**응답:**
```json
{
  "success": true,
  "verificationId": "verification_1234567890_abc123",
  "message": "SMS가 성공적으로 전송되었습니다.",
  "expiresIn": 180
}
```

#### **인증번호 확인 API**
```
POST /api/sms/verify
Content-Type: application/json

{
  "verificationId": "verification_1234567890_abc123",
  "code": "123456"
}
```

**응답:**
```json
{
  "success": true,
  "user": {
    "uid": "user_1234567890_def456",
    "phoneNumber": "+821012345678",
    "displayName": null,
    "email": null
  }
}
```

### 3. 환경 변수 설정

#### **개발 환경**
```javascript
// config/environment.js
smsApiEndpoint: 'https://your-dev-api.com/sms',
smsApiKey: 'your-dev-sms-api-key',
```

#### **프로덕션 환경**
```javascript
// config/environment.js
smsApiEndpoint: 'https://your-production-api.com/sms',
smsApiKey: 'your-production-sms-api-key',
```

### 4. 보안 고려사항

#### **인증번호 생성**
```javascript
// 6자리 랜덤 인증번호 생성
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
```

#### **인증번호 저장**
```javascript
// Redis 또는 데이터베이스에 저장
const saveVerificationCode = async (verificationId, code, phoneNumber) => {
  await redis.setex(`verification:${verificationId}`, 180, JSON.stringify({
    code: code,
    phoneNumber: phoneNumber,
    createdAt: Date.now()
  }));
};
```

#### **인증번호 확인**
```javascript
const verifyCode = async (verificationId, code) => {
  const stored = await redis.get(`verification:${verificationId}`);
  if (!stored) {
    throw new Error('인증 세션이 만료되었습니다.');
  }
  
  const data = JSON.parse(stored);
  if (data.code !== code) {
    throw new Error('인증번호가 올바르지 않습니다.');
  }
  
  // 인증 성공 시 저장된 데이터 삭제
  await redis.del(`verification:${verificationId}`);
  return true;
};
```

### 5. 에러 처리

#### **SMS 전송 실패**
```javascript
try {
  await sendSMS(phoneNumber);
} catch (error) {
  if (error.code === 'QUOTA_EXCEEDED') {
    throw new Error('SMS 할당량을 초과했습니다. 나중에 다시 시도해주세요.');
  } else if (error.code === 'INVALID_PHONE_NUMBER') {
    throw new Error('유효하지 않은 휴대폰번호입니다.');
  } else {
    throw new Error('SMS 전송에 실패했습니다. 다시 시도해주세요.');
  }
}
```

### 6. 비용 최적화

#### **인증번호 재사용 방지**
```javascript
// 같은 번호로 연속 전송 제한
const rateLimit = await redis.get(`rate_limit:${phoneNumber}`);
if (rateLimit) {
  throw new Error('너무 많은 인증번호 요청이 있었습니다. 잠시 후 다시 시도해주세요.');
}

// 1분 제한 설정
await redis.setex(`rate_limit:${phoneNumber}`, 60, '1');
```

## 🚀 배포 단계

### 1단계: 모의 서비스 테스트
- 현재 구현된 모의 SMS 서비스로 테스트
- 인증번호: `123456`

### 2단계: 실제 SMS 서비스 연동
- 선택한 SMS 서비스 API 연동
- 서버 API 엔드포인트 구현

### 3단계: 보안 강화
- Rate limiting 구현
- 인증번호 만료 시간 설정
- 에러 처리 개선

### 4단계: 모니터링
- SMS 전송 성공률 모니터링
- 비용 추적
- 에러 로그 분석

## 📊 비용 비교

| 서비스 | 1건당 비용 | 월 1000건 |
|--------|------------|-----------|
| 네이버 클라우드 | 8.8원 | 8,800원 |
| AWS SNS | 0.015달러 | 약 15,000원 |
| Twilio | 0.0075달러 | 약 7,500원 |
| Firebase | 0.01달러 | 약 10,000원 |

## ⚠️ 주의사항

1. **개인정보보호**: 휴대폰번호 암호화 저장
2. **보안**: API 키 노출 방지
3. **비용**: 사용량 모니터링 필수
4. **법규**: SMS 발송 관련 법규 준수
5. **백업**: SMS 서비스 장애 대비

## 🔗 참고 자료

- [네이버 클라우드 SMS API](https://api.ncloud-docs.com/docs/ai-naver-cloud-sms-sms)
- [AWS SNS SMS](https://docs.aws.amazon.com/sns/latest/dg/sns-mobile-phone-number-as-subscriber.html)
- [Twilio SMS API](https://www.twilio.com/docs/sms/api) 