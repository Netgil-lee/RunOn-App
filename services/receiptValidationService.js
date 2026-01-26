import { Platform } from 'react-native';
import Constants from 'expo-constants';

// 영수증 검증을 위한 서버 엔드포인트
const VALIDATION_ENDPOINTS = {
  ios: 'https://buy.itunes.apple.com/verifyReceipt', // 프로덕션
  ios_sandbox: 'https://sandbox.itunes.apple.com/verifyReceipt', // 샌드박스
  android: 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications', // Google Play
};

class ReceiptValidationService {
  constructor() {
    // App Store Connect에서 설정한 공유 비밀번호를 환경 변수에서 가져옴 (선택사항)
    // 구독 제품의 경우 공유 비밀번호 없이도 영수증 검증 가능
    this.appSpecificSharedSecret = Constants.expoConfig?.extra?.appStoreSharedSecret 
      || Constants.manifest?.extra?.appStoreSharedSecret
      || process.env.APP_STORE_SHARED_SECRET
      || null; // 공유 비밀번호가 없어도 됨 (구독 제품은 선택사항)
    
    this.googlePlayCredentials = {
      serviceAccountEmail: 'your-service-account@your-project.iam.gserviceaccount.com',
      privateKey: 'your-private-key',
    };
  }

  // iOS 영수증 검증 (재시도 로직 포함)
  async validateIOSReceipt(receiptData, isSandbox = false, retryCount = 0) {
    const maxRetries = 2; // 최대 2번 재시도 (총 3번 시도)
    
    try {
      console.log('🍎 iOS 영수증 검증 시작', { 
        isSandbox, 
        hasSecret: !!this.appSpecificSharedSecret,
        retryCount,
      });
      
      // 먼저 프로덕션 엔드포인트로 시도 (실제 유저는 프로덕션 영수증)
      const endpoint = isSandbox ? VALIDATION_ENDPOINTS.ios_sandbox : VALIDATION_ENDPOINTS.ios;
      
      const requestBody = {
        'receipt-data': receiptData,
        'exclude-old-transactions': true,
      };
      
      // 공유 비밀번호가 있으면 추가 (프로덕션 영수증 검증에 필요)
      if (this.appSpecificSharedSecret) {
        requestBody.password = this.appSpecificSharedSecret;
      }

      console.log('📤 영수증 검증 요청:', { endpoint, hasPassword: !!requestBody.password, retryCount });

      // 타임아웃 설정 (30초)
      const timeout = 30000; // 30초
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      let response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('❌ 영수증 검증 타임아웃:', timeout, 'ms');
          return {
            isValid: false,
            error: '영수증 검증이 시간 초과되었습니다. 네트워크 연결을 확인해주세요.',
            timeout: true,
          };
        }
        throw fetchError;
      }

      if (!response.ok) {
        console.error('❌ 영수증 검증 HTTP 오류:', response.status, response.statusText);
        return {
          isValid: false,
          error: `영수증 검증 서버 오류: ${response.status} ${response.statusText}`,
          status: response.status,
        };
      }

      const result = await response.json();
      console.log('📥 영수증 검증 응답:', { status: result.status, statusText: this.getIOSValidationError(result.status) });
      
      // 프로덕션에서 21007 (샌드박스 영수증)을 받으면 샌드박스로 재시도
      if (result.status === 21007 && !isSandbox) {
        console.log('🔄 샌드박스 영수증 감지, 샌드박스 엔드포인트로 재시도');
        return await this.validateIOSReceipt(receiptData, true, 0);
      }

      if (result.status === 0) {
        console.log('✅ iOS 영수증 검증 성공');
        return {
          isValid: true,
          receipt: result.receipt,
          latestReceiptInfo: result.latest_receipt_info,
        };
      } else {
        // 일시적 오류인 경우 재시도 (21005: 영수증 서버를 사용할 수 없음)
        const isRetryableError = result.status === 21005; // 서버 사용 불가
        
        if (isRetryableError && retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // 지수 백오프: 1초, 2초, 4초
          console.log(`🔄 일시적 오류 감지, ${delay}ms 후 재시도 (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return await this.validateIOSReceipt(receiptData, isSandbox, retryCount + 1);
        }
        
        console.error('❌ iOS 영수증 검증 실패:', result.status, this.getIOSValidationError(result.status));
        return {
          isValid: false,
          error: this.getIOSValidationError(result.status),
          status: result.status, // 상세 정보를 위해 status 포함
        };
      }
    } catch (error) {
      // 네트워크 오류인 경우 재시도
      const isNetworkError = error.name === 'AbortError' || 
                            error.message?.includes('network') ||
                            error.message?.includes('fetch') ||
                            !error.response;
      
      if (isNetworkError && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // 지수 백오프: 1초, 2초, 4초
        console.log(`🔄 네트워크 오류 감지, ${delay}ms 후 재시도 (${retryCount + 1}/${maxRetries}):`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        return await this.validateIOSReceipt(receiptData, isSandbox, retryCount + 1);
      }
      
      console.error('❌ iOS 영수증 검증 중 오류:', error);
      return {
        isValid: false,
        error: error.name === 'AbortError' 
          ? '영수증 검증이 시간 초과되었습니다. 네트워크 연결을 확인해주세요.'
          : '영수증 검증 중 네트워크 오류가 발생했습니다.',
        timeout: error.name === 'AbortError',
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
  // receiptData가 직접 전달되면 사용, 없으면 purchase 객체에서 찾기
  async validateReceipt(purchase, receiptData = null) {
    try {
      if (Platform.OS === 'ios') {
        // receiptData가 직접 전달된 경우 (전체 앱 영수증)
        if (receiptData) {
          console.log('📄 전체 앱 영수증으로 검증합니다.');
          return await this.validateIOSReceipt(receiptData);
        }
        
        // react-native-iap v14에서는 영수증 데이터 필드명이 다를 수 있음
        // 여러 필드명을 시도하여 영수증 데이터 찾기
        const foundReceiptData = purchase.transactionReceipt 
          || purchase.transactionReceiptIOS 
          || purchase.receiptData
          || purchase.receipt
          || purchase.transactionReceiptString
          || purchase.transactionReceiptBase64
          || purchase.originalTransactionReceipt;
        
        if (!foundReceiptData) {
          console.error('❌ Purchase 객체에 영수증 데이터가 없습니다.');
          console.error('📦 Purchase 객체 키:', Object.keys(purchase));
          console.error('📦 Purchase 객체 (민감 정보 제외):', JSON.stringify({
            productId: purchase.productId,
            transactionId: purchase.transactionId,
            transactionDate: purchase.transactionDate,
            originalTransactionIdentifierIOS: purchase.originalTransactionIdentifierIOS,
            expirationDateIOS: purchase.expirationDateIOS,
            // 영수증 데이터는 제외 (너무 길 수 있음)
            hasTransactionReceipt: !!purchase.transactionReceipt,
            hasTransactionReceiptIOS: !!purchase.transactionReceiptIOS,
            hasReceiptData: !!purchase.receiptData,
            hasReceipt: !!purchase.receipt,
            hasTransactionReceiptString: !!purchase.transactionReceiptString,
            hasTransactionReceiptBase64: !!purchase.transactionReceiptBase64,
            hasOriginalTransactionReceipt: !!purchase.originalTransactionReceipt,
          }, null, 2));
          console.warn('⚠️ iOS 구독 거래는 전체 앱 영수증을 사용해야 합니다. paymentService에서 getReceiptIOS()를 호출하세요.');
          return {
            isValid: false,
            error: 'Purchase 객체에 영수증 데이터가 없습니다. 전체 앱 영수증을 사용하세요.',
          };
        }
        
        // 어떤 필드에서 영수증 데이터를 찾았는지 로깅
        const foundInField = purchase.transactionReceipt ? 'transactionReceipt' :
                             purchase.transactionReceiptIOS ? 'transactionReceiptIOS' :
                             purchase.receiptData ? 'receiptData' :
                             purchase.receipt ? 'receipt' :
                             purchase.transactionReceiptString ? 'transactionReceiptString' :
                             purchase.transactionReceiptBase64 ? 'transactionReceiptBase64' :
                             purchase.originalTransactionReceipt ? 'originalTransactionReceipt' : 'unknown';
        
        console.log('📄 영수증 데이터 발견:', { 
          foundIn: foundInField,
          hasData: !!foundReceiptData, 
          dataLength: foundReceiptData?.length || 0,
          dataType: typeof foundReceiptData,
        });
        
        return await this.validateIOSReceipt(foundReceiptData);
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
