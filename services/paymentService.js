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
    console.error('❌ 구매 에러:', error);
    
    let errorMessage = '구매 중 오류가 발생했습니다.';
    
    if (error.code === 'E_USER_CANCELLED') {
      errorMessage = '구매가 취소되었습니다.';
    } else if (error.code === 'E_ITEM_UNAVAILABLE') {
      errorMessage = '해당 상품을 구매할 수 없습니다.';
    } else if (error.code === 'E_NETWORK_ERROR') {
      errorMessage = '네트워크 연결을 확인해주세요.';
    }
    
    Alert.alert('구매 실패', errorMessage);
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
      const product = this.products.find(p => p.productId === productId);
      if (!product) {
        throw new Error('제품을 찾을 수 없습니다.');
      }
      
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
    return this.products.find(p => p.productId === productId);
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
