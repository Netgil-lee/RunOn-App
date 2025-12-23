import {
  initConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  getAvailablePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
} from 'react-native-iap';
import { Platform, Alert } from 'react-native';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore as db } from '../config/firebase';
import receiptValidationService from './receiptValidationService';

// 제품 ID 정의
const PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'com.runon.app.premium.monthly',
  PREMIUM_YEARLY: 'com.runon.app.premium.yearly',
  PREMIUM_LIFETIME: 'com.runon.app.premium.lifetime',
};

// 구독 제품 ID
const SUBSCRIPTION_IDS = [
  PRODUCT_IDS.PREMIUM_MONTHLY,
  PRODUCT_IDS.PREMIUM_YEARLY,
];

// 소비성 제품 ID
const CONSUMABLE_IDS = [
  PRODUCT_IDS.PREMIUM_LIFETIME,
];

class PaymentService {
  constructor() {
    this.isInitialized = false;
    this.products = [];
    this.purchaseUpdateSubscription = null;
    this.purchaseErrorSubscription = null;
    this.purchaseCallbacks = {}; // 구매 콜백 저장 (productId별)
    this.isHandlingError = false; // 에러 처리 중복 방지 플래그
    this.lastErrorTime = null; // 마지막 에러 발생 시간
    this.currentPurchaseProductId = null; // 현재 진행 중인 구매 제품 ID
  }

  // 결제 서비스 초기화
  async initialize() {
    try {
      console.log('💳 PaymentService: 초기화 시작');
      
      // IAP 연결 초기화
      const result = await initConnection();
      console.log('✅ IAP 연결 초기화 성공:', result);

      // 제품 정보 가져오기
      await this.loadProducts();

      // 구매 업데이트 리스너 설정
      this.setupPurchaseListeners();

      this.isInitialized = true;
      console.log('✅ PaymentService 초기화 완료');
      
      return true;
    } catch (error) {
      console.error('❌ PaymentService 초기화 실패:', error);
      return false;
    }
  }

  // 제품 정보 로드
  async loadProducts() {
    try {
      console.log('🛍️ 제품 정보 로드 시작');
      
      // 구독 제품과 소비성 제품을 함께 가져오기
      const allProductIds = [...SUBSCRIPTION_IDS, ...CONSUMABLE_IDS];
      
      // 구독 제품 가져오기
      const subscriptions = await fetchProducts({ 
        skus: SUBSCRIPTION_IDS, 
        type: 'subs' 
      });
      
      // 소비성 제품 가져오기
      const inAppProducts = await fetchProducts({ 
        skus: CONSUMABLE_IDS, 
        type: 'in-app' 
      });
      
      // 모든 제품 합치기
      const products = [...subscriptions, ...inAppProducts];
      
      this.products = products;
      console.log('✅ 제품 정보 로드 완료:', products.length, '개');
      
      // 디버깅: 제품 정보 상세 로그
      if (products.length > 0) {
        console.log('📦 로드된 제품 정보:');
        products.forEach((product, index) => {
          console.log(`  제품 ${index + 1}:`, {
            id: product.id,
            productId: product.productId,
            productIdentifier: product.productIdentifier,
            identifier: product.identifier,
            title: product.title,
          });
        });
      }
      
      return products;
    } catch (error) {
      console.error('❌ 제품 정보 로드 실패:', error);
      throw error;
    }
  }

  // 구매 리스너 설정
  setupPurchaseListeners() {
    // 구매 업데이트 리스너
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase) => {
        console.log('🛒 구매 업데이트:', purchase);
        await this.handlePurchaseUpdate(purchase);
      }
    );

    // 구매 에러 리스너
    this.purchaseErrorSubscription = purchaseErrorListener(
      (error) => {
        console.error('❌ 구매 에러:', error);
        this.handlePurchaseError(error);
      }
    );
  }

  // 구매 업데이트 처리
  async handlePurchaseUpdate(purchase) {
    try {
      console.log('🔄 구매 업데이트 처리 시작:', purchase);
      
      const productId = purchase.productId;
      const callbacks = this.purchaseCallbacks[productId];
      const userId = callbacks?.userId; // 콜백에서 userId 가져오기
      
      // 영수증 검증
      const validationResult = await this.validateReceipt(purchase);
      
      if (validationResult.isValid) {
        // 사용자 구독 상태 업데이트 (userId가 있는 경우에만)
        if (userId) {
          await this.updateUserSubscription(purchase, validationResult.subscriptionStatus, userId);
        }
        
        // 거래 완료 처리
        await finishTransaction({ purchase, isConsumable: false });
        
        console.log('✅ 구매 처리 완료');
        
        // 콜백이 있으면 콜백 호출, 없으면 기본 Alert 표시
        if (callbacks?.onSuccess) {
          callbacks.onSuccess(purchase, validationResult.subscriptionStatus);
          delete this.purchaseCallbacks[productId];
        } else {
          // 기본 성공 알림 (콜백이 없는 경우)
          Alert.alert(
            '구매 완료',
            '프리미엄 구독이 활성화되었습니다!',
            [{ text: '확인' }]
          );
        }
        
        // 구매 완료 후 추적 정보 초기화
        if (this.currentPurchaseProductId === productId) {
          this.currentPurchaseProductId = null;
        }
      } else {
        console.error('❌ 영수증 검증 실패:', validationResult.error);
        
        // 콜백이 있으면 콜백 호출, 없으면 기본 Alert 표시
        if (callbacks?.onError) {
          callbacks.onError(new Error(validationResult.error || '영수증 검증에 실패했습니다.'));
          delete this.purchaseCallbacks[productId];
        } else {
          Alert.alert('구매 실패', validationResult.error || '영수증 검증에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('❌ 구매 업데이트 처리 실패:', error);
      
      const productId = purchase?.productId;
      const callbacks = productId ? this.purchaseCallbacks[productId] : null;
      
      // 콜백이 있으면 콜백 호출
      if (callbacks?.onError) {
        callbacks.onError(error);
        if (productId) {
          delete this.purchaseCallbacks[productId];
        }
      }
    }
  }

  // 구매 에러 처리
  handlePurchaseError(error) {
    // 중복 호출 방지: 같은 에러가 1초 이내에 반복 호출되는 경우 무시
    const now = Date.now();
    if (this.isHandlingError && this.lastErrorTime && (now - this.lastErrorTime) < 1000) {
      console.log('⚠️ 중복 에러 호출 무시:', error);
      return;
    }
    
    this.isHandlingError = true;
    this.lastErrorTime = now;
    
    console.error('❌ 구매 에러:', error);
    
    let errorMessage = '구매 중 오류가 발생했습니다.';
    let errorTitle = '구매 실패';
    
    // 에러 코드에 따른 메시지 설정
    if (error.code === 'E_USER_CANCELLED' || error.code === 'user-cancelled') {
      errorMessage = '구매가 취소되었습니다.';
      // 사용자 취소는 Alert 표시하지 않음 (정상적인 동작)
      this.isHandlingError = false;
      return;
    } else if (error.code === 'E_ITEM_UNAVAILABLE') {
      errorMessage = '해당 상품을 구매할 수 없습니다.';
    } else if (error.code === 'E_NETWORK_ERROR') {
      errorMessage = '네트워크 연결을 확인해주세요.';
    } else if (error.message && error.message.includes('Authentication Failed')) {
      errorTitle = '인증 실패';
      errorMessage = 'Apple 계정 인증에 실패했습니다.\n\n샌드박스 테스트 계정을 사용하는 경우:\n1. App Store Connect에서 샌드박스 테스터 계정이 활성화되었는지 확인\n2. 새로운 샌드박스 테스트 계정으로 시도\n3. 기기의 Settings → App Store에서 로그아웃 후 다시 로그인';
    } else if (error.message && error.message.includes('Password reuse not available')) {
      errorTitle = '계정 인증 오류';
      errorMessage = '사용 중인 Apple 계정이 샌드박스 테스트를 지원하지 않습니다.\n\n해결 방법:\n1. App Store Connect에서 새로운 샌드박스 테스트 계정 생성\n2. Settings → App Store에서 샌드박스 테스트 계정으로 로그인\n3. 실제 기기에서 TestFlight으로 테스트';
    }
    
    // 현재 진행 중인 구매의 콜백에 에러 전달
    const targetProductId = error.productId || this.currentPurchaseProductId;
    if (targetProductId && this.purchaseCallbacks[targetProductId]) {
      const callbacks = this.purchaseCallbacks[targetProductId];
      if (callbacks?.onError) {
        callbacks.onError(error);
      }
      // 에러 발생 시 콜백 제거
      delete this.purchaseCallbacks[targetProductId];
    } else if (this.currentPurchaseProductId) {
      // productId가 없지만 현재 구매가 있는 경우
      const callbacks = this.purchaseCallbacks[this.currentPurchaseProductId];
      if (callbacks?.onError) {
        callbacks.onError(error);
      }
      delete this.purchaseCallbacks[this.currentPurchaseProductId];
    }
    
    // 구매 에러 발생 시 추적 정보 초기화
    this.currentPurchaseProductId = null;
    
    // Alert 표시
    Alert.alert(errorTitle, errorMessage);
    
    // 에러 처리 완료 후 플래그 해제 (1초 후)
    setTimeout(() => {
      this.isHandlingError = false;
    }, 1000);
  }

  // 영수증 검증
  async validateReceipt(purchase) {
    try {
      console.log('🔍 영수증 검증 시작');
      
      // 영수증 검증 서비스 사용
      const validationResult = await receiptValidationService.validateReceipt(purchase);
      
      if (validationResult.isValid) {
        console.log('✅ 영수증 검증 성공');
        
        // 구독 상태 확인
        if (Platform.OS === 'ios' && validationResult.receipt) {
          const subscriptionStatus = await receiptValidationService.checkSubscriptionStatus(validationResult.receipt);
          return {
            isValid: true,
            subscriptionStatus,
          };
        }
        
        return { isValid: true };
      } else {
        console.error('❌ 영수증 검증 실패:', validationResult.error);
        return { isValid: false, error: validationResult.error };
      }
    } catch (error) {
      console.error('❌ 영수증 검증 실패:', error);
      return { isValid: false, error: error.message };
    }
  }

  // 사용자 구독 상태 업데이트
  async updateUserSubscription(purchase, subscriptionStatus = null, userId = null) {
    try {
      console.log('👤 사용자 구독 상태 업데이트 시작');
      
      if (!userId) {
        console.error('❌ userId가 제공되지 않았습니다.');
        throw new Error('userId가 필요합니다.');
      }
      
      // Firestore에서 사용자 문서 업데이트
      const userRef = doc(db, 'users', userId);
      
      // iOS의 경우 필드명이 다름
      const originalTransactionId = Platform.OS === 'ios' 
        ? (purchase.originalTransactionIdentifierIOS || purchase.transactionId)
        : (purchase.originalTransactionIdAndroid || purchase.transactionId);
      
      const expirationDate = Platform.OS === 'ios'
        ? (purchase.expirationDateIOS ? new Date(purchase.expirationDateIOS).toISOString() : null)
        : (purchase.expirationDateAndroid ? new Date(purchase.expirationDateAndroid).toISOString() : null);
      
      const subscriptionData = {
        isPremium: true,
        subscriptionType: purchase.productId,
        purchaseDate: new Date(purchase.transactionDate),
        transactionId: purchase.transactionId,
        originalTransactionId: originalTransactionId,
        expiresDate: subscriptionStatus?.expiresDate || expirationDate,
        isActive: subscriptionStatus?.isActive ?? true,
      };
      
      await setDoc(userRef, subscriptionData, { merge: true });
      console.log('✅ 사용자 구독 상태 업데이트 완료');
    } catch (error) {
      console.error('❌ 사용자 구독 상태 업데이트 실패:', error);
      throw error;
    }
  }

  // 구매 요청
  async purchaseProduct(productId, userId, callbacks = {}) {
    try {
      console.log('🛒 구매 요청 시작:', productId);
      
      if (!this.isInitialized) {
        throw new Error('PaymentService가 초기화되지 않았습니다.');
      }
      
      // 제품이 존재하는지 확인
      // react-native-iap v14에서는 제품 ID가 'id' 필드에 저장됨
      // productId, productIdentifier, identifier, id 등 여러 필드명 확인
      const product = this.products.find(p => 
        p.id === productId ||
        p.productId === productId || 
        p.productIdentifier === productId || 
        p.identifier === productId
      );
      
      if (!product) {
        // 디버깅: 현재 저장된 제품 ID 목록 출력
        console.error('❌ 제품을 찾을 수 없습니다. 요청한 제품 ID:', productId);
        console.error('📦 현재 저장된 제품 목록:');
        this.products.forEach((p, index) => {
          console.error(`  제품 ${index + 1}:`, {
            id: p.id,
            productId: p.productId,
            productIdentifier: p.productIdentifier,
            identifier: p.identifier,
            title: p.title,
          });
        });
        throw new Error('제품을 찾을 수 없습니다.');
      }
      
      console.log('✅ 제품 확인 완료:', {
        requestedId: productId,
        foundProductId: product.id || product.productId || product.productIdentifier || product.identifier,
        title: product.title,
      });
      
      // 콜백 저장 (구매 완료 시 호출)
      // userId도 함께 저장하여 handlePurchaseUpdate에서 사용
      if (callbacks.onSuccess || callbacks.onError) {
        this.purchaseCallbacks[productId] = {
          ...callbacks,
          userId: userId, // userId를 콜백 객체에 저장
        };
      }
      
      // 제품 타입 확인 (구독인지 소비성 제품인지)
      const isSubscription = SUBSCRIPTION_IDS.includes(productId);
      
      // 현재 구매 요청 추적
      this.currentPurchaseProductId = productId;
      
      // 구매 요청 (react-native-iap는 purchaseUpdatedListener로 구매 완료를 처리)
      // 최신 API: requestPurchase는 Promise를 반환하지만, 실제 구매 완료는 purchaseUpdatedListener로 처리됨
      await requestPurchase({
        request: {
          ios: { sku: productId },
        },
        type: isSubscription ? 'subs' : 'in-app',
      });
      
      console.log('✅ 구매 요청 완료');
      // react-native-iap는 purchaseUpdatedListener로 구매 완료를 알림
    } catch (error) {
      console.error('❌ 구매 요청 실패:', error);
      
      // 콜백이 있으면 에러 콜백 호출
      if (this.purchaseCallbacks[productId]?.onError) {
        this.purchaseCallbacks[productId].onError(error);
        delete this.purchaseCallbacks[productId];
      }
      
      // 구매 요청 실패 시 추적 정보 초기화
      if (this.currentPurchaseProductId === productId) {
        this.currentPurchaseProductId = null;
      }
      
      throw error;
    }
  }

  // 사용 가능한 구매 내역 조회
  async getAvailablePurchases() {
    try {
      console.log('📋 구매 내역 조회 시작');
      
      const purchases = await getAvailablePurchases();
      console.log('✅ 구매 내역 조회 완료:', purchases.length, '개');
      
      return purchases;
    } catch (error) {
      console.error('❌ 구매 내역 조회 실패:', error);
      throw error;
    }
  }

  // 사용자 구독 상태 확인
  async checkUserSubscriptionStatus(userId) {
    try {
      console.log('🔍 사용자 구독 상태 확인 시작:', userId);
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const isPremium = userData.isPremium && userData.isActive;
        
        console.log('✅ 사용자 구독 상태:', isPremium ? '프리미엄' : '일반');
        return {
          isPremium,
          subscriptionType: userData.subscriptionType,
          expiresDate: userData.expiresDate,
        };
      }
      
      return { isPremium: false };
    } catch (error) {
      console.error('❌ 사용자 구독 상태 확인 실패:', error);
      return { isPremium: false };
    }
  }

  // 제품 정보 가져오기
  getProducts() {
    return this.products;
  }

  // 특정 제품 정보 가져오기
  getProduct(productId) {
    // react-native-iap v14에서는 제품 ID가 'id' 필드에 저장됨
    return this.products.find(p => 
      p.id === productId ||
      p.productId === productId ||
      p.productIdentifier === productId ||
      p.identifier === productId
    );
  }

  // 서비스 정리
  cleanup() {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }
    
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }
    
    this.isInitialized = false;
    console.log('🧹 PaymentService 정리 완료');
  }
}

// 싱글톤 인스턴스 생성
const paymentService = new PaymentService();

export default paymentService;
export { PRODUCT_IDS };
