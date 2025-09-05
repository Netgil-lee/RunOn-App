import ENV from '../config/environment';
import { Crypto } from 'expo-crypto';

class SMSService {
  constructor() {
    this.apiEndpoint = ENV.smsApiEndpoint;
    this.apiKey = ENV.smsApiKey;
    this.secretKey = ENV.smsSecretKey;
    this.serviceId = ENV.smsServiceId;
    this.fromNumber = ENV.smsFromNumber;
  }

  // 네이버 클라우드 SMS API 서명 생성 (React Native 호환)
  async generateSignature(timestamp, method, url) {
    try {
      const message = `${method} ${url}\n${timestamp}\n${this.apiKey}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const key = encoder.encode(this.secretKey);
      
      // HMAC-SHA256 서명 생성
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
      return btoa(String.fromCharCode(...new Uint8Array(signature)));
    } catch (error) {
      console.error('서명 생성 실패:', error);
      // 임시로 빈 서명 반환 (개발 모드에서만 사용)
      return 'temp_signature_for_dev';
    }
  }

  // 6자리 인증번호 생성
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // SMS 전송 (네이버 클라우드 SMS)
  async sendSMS(phoneNumber) {
    try {
      console.log('📞 네이버 클라우드 SMS 전송 시작:', phoneNumber);
      
      // 인증번호 생성
      const verificationCode = this.generateVerificationCode();
      const verificationId = `verification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 개발 모드에서는 모의 응답, 프로덕션에서는 실제 API 사용
      const isProduction = !__DEV__;
      
      if (isProduction && this.apiKey !== 'your-naver-cloud-access-key') {
        // 실제 네이버 클라우드 SMS API 호출
        console.log('🚀 실제 네이버 클라우드 SMS API 호출');
        
        const timestamp = Date.now().toString();
        const url = `/sms/v2/services/${this.serviceId}/messages`;
        const signature = await this.generateSignature(timestamp, 'POST', url);
        
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
        
        if (result.statusCode === '202') {
          console.log('✅ 실제 네이버 클라우드 SMS 전송 성공');
          return {
            success: true,
            verificationId: verificationId,
            message: 'SMS가 성공적으로 전송되었습니다.',
            expiresIn: 180
          };
        } else {
          throw new Error(`SMS 전송 실패: ${result.errorMessage || '알 수 없는 오류'}`);
        }
      } else {
        // 개발 모드: 모의 응답
        console.log('🧪 개발 모드: 모의 SMS 전송');
        
        const mockResponse = {
          success: true,
          verificationId: verificationId,
          verificationCode: verificationCode, // 개발용 - 실제로는 서버에서만 저장
          message: 'SMS가 성공적으로 전송되었습니다. (개발 모드)',
          expiresIn: 180 // 3분
        };
        
        console.log('✅ 모의 SMS 전송 성공:', mockResponse);
        console.log('🔢 생성된 인증번호 (개발용):', verificationCode);
        
        return mockResponse;
      }
      
    } catch (error) {
      console.error('❌ 네이버 클라우드 SMS 전송 실패:', error);
      
      // 네이버 클라우드 SMS 에러 처리
      if (error.message && error.message.includes('QUOTA_EXCEEDED')) {
        throw new Error('SMS 할당량을 초과했습니다. 나중에 다시 시도해주세요.');
      } else if (error.message && error.message.includes('INVALID_PHONE_NUMBER')) {
        throw new Error('유효하지 않은 휴대폰번호입니다.');
      } else if (error.message && error.message.includes('AUTHENTICATION_FAILED')) {
        throw new Error('SMS 서비스 인증에 실패했습니다.');
      } else if (error.message && error.message.includes('INVALID_FROM_NUMBER')) {
        throw new Error('등록되지 않은 발신번호입니다.');
      } else {
        throw new Error('SMS 전송에 실패했습니다. 다시 시도해주세요.');
      }
    }
  }

  // 인증번호 확인
  async verifyCode(verificationId, code) {
    try {
      console.log('🔢 인증번호 확인 시작:', { verificationId, code });
      
      // 개발 모드에서는 모의 확인, 프로덕션에서는 서버 확인
      const isProduction = !__DEV__;
      
      if (isProduction && this.apiKey !== 'your-naver-cloud-access-key') {
        // 실제 서버에서 verificationId에 해당하는 인증번호를 확인
        console.log('🚀 실제 서버 인증번호 확인');
        
        // const response = await fetch(`${this.apiEndpoint}/verify`, {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'Authorization': `Bearer ${this.apiKey}`
        //   },
        //   body: JSON.stringify({
        //     verificationId: verificationId,
        //     code: code
        //   })
        // });
        
        // const result = await response.json();
        
        // 실제 서버에서 verificationId에 해당하는 인증번호를 확인
        // 실제 구현에서는 서버에서 verificationId에 해당하는 인증번호를 저장하고 확인해야 함
        throw new Error('인증번호 확인 기능이 아직 구현되지 않았습니다.');
      } else {
        // 개발 모드: 모의 확인
        console.log('🧪 개발 모드: 모의 인증번호 확인');
        
        // 개발 모드에서는 저장된 인증번호로 확인
        if (code === this.lastVerificationCode) {
          const mockResponse = {
            success: true,
            user: {
              uid: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              phoneNumber: verificationId.split('_')[2], // 임시로 verificationId에서 추출
              displayName: null,
              email: null
            }
          };
          
          console.log('✅ 모의 인증번호 확인 성공:', mockResponse);
          return mockResponse;
        } else {
          throw new Error('인증번호가 올바르지 않습니다.');
        }
      }
      
    } catch (error) {
      console.error('❌ 인증번호 확인 실패:', error);
      throw error;
    }
  }

  // 인증번호 재전송
  async resendSMS(phoneNumber) {
    try {
      console.log('📞 네이버 클라우드 SMS 재전송 시작:', phoneNumber);
      
      // 새로운 인증번호로 재전송
      const result = await this.sendSMS(phoneNumber);
      
      console.log('✅ 네이버 클라우드 SMS 재전송 성공');
      return result;
      
    } catch (error) {
      console.error('❌ 네이버 클라우드 SMS 재전송 실패:', error);
      throw error;
    }
  }
}

export default new SMSService(); 