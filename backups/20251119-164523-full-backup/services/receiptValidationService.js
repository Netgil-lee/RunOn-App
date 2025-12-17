import { Platform } from 'react-native';

// 영수증 검증을 위한 서버 엔드포인트
const VALIDATION_ENDPOINTS = {
  ios: 'https://buy.itunes.apple.com/verifyReceipt', // 프로덕션
  ios_sandbox: 'https://sandbox.itunes.apple.com/verifyReceipt', // 샌드박스
  android: 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications', // Google Play
};

class ReceiptValidationService {
  constructor() {
    this.appSpecificSharedSecret = 'your-app-specific-shared-secret'; // App Store Connect에서 설정
    this.googlePlayCredentials = {
      serviceAccountEmail: 'your-service-account@your-project.iam.gserviceaccount.com',
      privateKey: 'your-private-key',
    };
  }

  // iOS 영수증 검증
  async validateIOSReceipt(receiptData, isSandbox = false) {
    try {
      console.log('🍎 iOS 영수증 검증 시작');
      
      const endpoint = isSandbox ? VALIDATION_ENDPOINTS.ios_sandbox : VALIDATION_ENDPOINTS.ios;
      
      const requestBody = {
        'receipt-data': receiptData,
        'password': this.appSpecificSharedSecret,
        'exclude-old-transactions': true,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      
      // 샌드박스에서 실패하면 프로덕션으로 재시도
      if (result.status === 21007 && !isSandbox) {
        console.log('🔄 샌드박스 영수증으로 프로덕션 재시도');
        return await this.validateIOSReceipt(receiptData, true);
      }

      if (result.status === 0) {
        console.log('✅ iOS 영수증 검증 성공');
        return {
          isValid: true,
          receipt: result.receipt,
          latestReceiptInfo: result.latest_receipt_info,
        };
      } else {
        console.error('❌ iOS 영수증 검증 실패:', result.status);
        return {
          isValid: false,
          error: this.getIOSValidationError(result.status),
        };
      }
    } catch (error) {
      console.error('❌ iOS 영수증 검증 중 오류:', error);
      return {
        isValid: false,
        error: '영수증 검증 중 네트워크 오류가 발생했습니다.',
      };
    }
  }

  // Android 영수증 검증
  async validateAndroidReceipt(packageName, productId, purchaseToken) {
    try {
      console.log('🤖 Android 영수증 검증 시작');
      
      // Google Play Developer API를 사용한 검증
      // 실제 구현에서는 서버에서 수행하는 것이 권장됨
      
      const response = await fetch(`${VALIDATION_ENDPOINTS.android}/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getGooglePlayAccessToken()}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Android 영수증 검증 성공');
        return {
          isValid: true,
          purchase: result,
        };
      } else {
        console.error('❌ Android 영수증 검증 실패:', response.status);
        return {
          isValid: false,
          error: 'Android 영수증 검증에 실패했습니다.',
        };
      }
    } catch (error) {
      console.error('❌ Android 영수증 검증 중 오류:', error);
      return {
        isValid: false,
        error: 'Android 영수증 검증 중 오류가 발생했습니다.',
      };
    }
  }

  // Google Play 액세스 토큰 획득
  async getGooglePlayAccessToken() {
    try {
      // JWT 토큰 생성 (실제 구현에서는 서버에서 수행)
      const jwt = await this.generateJWT();
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      const result = await response.json();
      return result.access_token;
    } catch (error) {
      console.error('❌ Google Play 액세스 토큰 획득 실패:', error);
      throw error;
    }
  }

  // JWT 토큰 생성 (간단한 예시)
  async generateJWT() {
    // 실제 구현에서는 서버에서 수행하는 것이 권장됨
    // 여기서는 클라이언트 사이드에서 간단한 토큰 생성
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.googlePlayCredentials.serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    // 실제로는 서명이 필요하지만, 여기서는 예시로만 제공
    return 'mock-jwt-token';
  }

  // iOS 검증 에러 메시지
  getIOSValidationError(status) {
    const errorMessages = {
      21000: 'App Store가 영수증을 읽을 수 없습니다.',
      21002: '영수증 데이터가 손상되었습니다.',
      21003: '영수증을 인증할 수 없습니다.',
      21004: '제공된 공유 비밀번호가 계정의 공유 비밀번호와 일치하지 않습니다.',
      21005: '영수증 서버를 사용할 수 없습니다.',
      21006: '이 영수증은 유효하지만 구독이 만료되었습니다.',
      21007: '이 영수증은 샌드박스에서 발급되었습니다.',
      21008: '이 영수증은 프로덕션에서 발급되었습니다.',
      21010: '이 영수증은 더 이상 유효하지 않습니다.',
    };

    return errorMessages[status] || `알 수 없는 오류 (${status})`;
  }

  // 구독 상태 확인
  async checkSubscriptionStatus(receiptInfo) {
    try {
      if (!receiptInfo || !receiptInfo.latest_receipt_info) {
        return { isActive: false, expiresDate: null };
      }

      const latestReceipt = receiptInfo.latest_receipt_info[0];
      const expiresDate = new Date(parseInt(latestReceipt.expires_date_ms));
      const now = new Date();

      const isActive = expiresDate > now;

      return {
        isActive,
        expiresDate: expiresDate.toISOString(),
        productId: latestReceipt.product_id,
        transactionId: latestReceipt.transaction_id,
        originalTransactionId: latestReceipt.original_transaction_id,
      };
    } catch (error) {
      console.error('❌ 구독 상태 확인 실패:', error);
      return { isActive: false, expiresDate: null };
    }
  }

  // 영수증 검증 (플랫폼별 자동 처리)
  async validateReceipt(purchase) {
    try {
      if (Platform.OS === 'ios') {
        return await this.validateIOSReceipt(purchase.transactionReceipt);
      } else if (Platform.OS === 'android') {
        return await this.validateAndroidReceipt(
          'com.runon.app',
          purchase.productId,
          purchase.purchaseToken
        );
      } else {
        throw new Error('지원하지 않는 플랫폼입니다.');
      }
    } catch (error) {
      console.error('❌ 영수증 검증 실패:', error);
      return {
        isValid: false,
        error: error.message,
      };
    }
  }
}

// 싱글톤 인스턴스 생성
const receiptValidationService = new ReceiptValidationService();

export default receiptValidationService;
