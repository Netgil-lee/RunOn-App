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
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
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
      
      // IAP 연결 초기화 - 네이티브 모듈 호출이므로 안전하게 처리
      let result;
      try {
        result = await initConnection();
        console.log('✅ IAP 연결 초기화 성공:', result);
      } catch (initError) {
        console.error('❌ IAP 연결 초기화 실패:', initError);
        throw initError;
      }

      // 구매 업데이트 리스너 설정 (initConnection 후 가능한 한 빨리 설정)
      try {
        this.setupPurchaseListeners();
      } catch (listenerError) {
        console.error('❌ 리스너 설정 실패:', listenerError);
        throw listenerError;
      }

      // 제품 정보 가져오기
      try {
        await this.loadProducts();
      } catch (loadError) {
        console.error('❌ 제품 정보 로드 실패:', loadError);
        // 제품 로드 실패해도 리스너는 설정 (이전 구매 처리 가능)
      }

      // 미완료 거래 확인 및 처리 (중요: 프로덕션 환경에서 구매가 완료되었지만 앱에서 처리되지 않은 경우)
      try {
        await this.processPendingPurchases();
      } catch (pendingError) {
        console.error('❌ 미완료 거래 처리 실패:', pendingError);
        // 미완료 거래 처리 실패해도 초기화는 계속 진행
      }

      this.isInitialized = true;
      console.log('✅ PaymentService 초기화 완료');
      
      return true;
    } catch (error) {
      console.error('❌ PaymentService 초기화 실패:', error);
      this.isInitialized = false;
      return false;
    }
  }

  // 미완료 거래 확인 및 처리 (앱 시작 시 또는 백그라운드에서 복귀 시 호출)
  async processPendingPurchases() {
    try {
      console.log('🔄 미완료 거래 확인 시작...');
      
      const purchases = await getAvailablePurchases();
      console.log(`📋 미완료 거래 발견: ${purchases.length}개`);
      
      if (purchases.length === 0) {
        console.log('✅ 미완료 거래 없음');
        return;
      }

      // 각 미완료 거래 처리
      for (const purchase of purchases) {
        try {
          const productId = this.getProductIdFromPurchase(purchase);
          console.log(`🔄 미완료 거래 처리 중: ${productId}`);
          
          // userId 찾기 (transactionId로 Firestore에서 찾기)
          let userId = null;
          if (purchase.transactionId) {
            userId = await this.findUserIdByTransactionId(purchase.transactionId);
          }
          
          if (!userId && purchase.originalTransactionIdentifierIOS) {
            userId = await this.findUserIdByTransactionId(purchase.originalTransactionIdentifierIOS);
          }
          
          if (!userId && purchase.originalTransactionIdAndroid) {
            userId = await this.findUserIdByTransactionId(purchase.originalTransactionIdAndroid);
          }
          
          console.log(`📋 미완료 거래 정보:`, {
            productId,
            userId: userId || '없음',
            transactionId: purchase.transactionId,
          });
          
          // 영수증 검증 및 처리
          const validationResult = await this.validateReceipt(purchase);
          
          if (validationResult.isValid) {
            console.log(`✅ 미완료 거래 검증 성공: ${productId}`);
            
            // userId가 있으면 Firestore 업데이트
            if (userId) {
              try {
                console.log(`👤 미완료 거래 Firestore 업데이트 시작...`);
                await this.updateUserSubscription(purchase, validationResult.subscriptionStatus, userId);
                console.log(`✅ 미완료 거래 Firestore 업데이트 완료`);
              } catch (updateError) {
                console.error(`❌ 미완료 거래 Firestore 업데이트 실패:`, {
                  error: updateError.message,
                  code: updateError.code,
                  userId,
                  transactionId: purchase.transactionId,
                });
                // 업데이트 실패해도 거래는 완료 처리
              }
            } else {
              console.error(`❌ userId를 찾을 수 없어 Firestore 업데이트를 건너뜁니다.`, {
                productId,
                transactionId: purchase.transactionId,
              });
              console.error(`⚠️ 이 구매는 완료되었지만 구독 상태가 저장되지 않았습니다.`);
            }
            
            // 거래 완료 처리
            try {
              await finishTransaction({ purchase, isConsumable: false });
              console.log(`✅ 미완료 거래 완료 처리: ${productId}`);
            } catch (finishError) {
              console.error(`❌ 미완료 거래 완료 처리 실패: ${productId}`, finishError);
            }
          } else {
            console.error(`❌ 미완료 거래 검증 실패: ${productId}`, validationResult.error);
            // 영수증 검증 실패 시 Firestore 업데이트를 하지 않음 (보안)
            // 거래는 완료 처리 (이미 구매가 완료되었으므로)
            try {
              await finishTransaction({ purchase, isConsumable: false });
              console.log(`⚠️ 검증 실패했지만 거래 완료 처리: ${productId}`);
            } catch (finishError) {
              console.error(`❌ 거래 완료 처리 실패: ${productId}`, finishError);
            }
          }
        } catch (purchaseError) {
          console.error(`❌ 미완료 거래 처리 중 오류:`, purchaseError);
          // 개별 거래 처리 실패해도 다음 거래 계속 처리
        }
      }
      
      console.log('✅ 미완료 거래 처리 완료');
    } catch (error) {
      console.error('❌ 미완료 거래 확인 실패:', error);
      throw error;
    }
  }

  // 제품 정보 로드
  async loadProducts() {
    try {
      console.log('🛍️ 제품 정보 로드 시작');
      console.log('📋 요청할 제품 ID:', {
        subscriptions: SUBSCRIPTION_IDS,
        consumables: CONSUMABLE_IDS,
      });
      
      // 구독 제품과 소비성 제품을 함께 가져오기
      const allProductIds = [...SUBSCRIPTION_IDS, ...CONSUMABLE_IDS];
      
      // 구독 제품 가져오기
      let subscriptions = [];
      if (SUBSCRIPTION_IDS.length > 0) {
        try {
          subscriptions = await fetchProducts({ 
            skus: SUBSCRIPTION_IDS, 
            type: 'subs' 
          });
          console.log('✅ 구독 제품 로드 완료:', subscriptions.length, '개');
        } catch (subError) {
          console.error('❌ 구독 제품 로드 실패:', subError);
          throw subError;
        }
      }
      
      // 소비성 제품 가져오기
      let inAppProducts = [];
      if (CONSUMABLE_IDS.length > 0) {
        try {
          inAppProducts = await fetchProducts({ 
            skus: CONSUMABLE_IDS, 
            type: 'in-app' 
          });
          console.log('✅ 소비성 제품 로드 완료:', inAppProducts.length, '개');
        } catch (inAppError) {
          console.error('❌ 소비성 제품 로드 실패:', inAppError);
          // 소비성 제품 로드 실패는 치명적이지 않을 수 있음 (구독만 사용하는 경우)
        }
      }
      
      // 모든 제품 합치기
      const products = [...subscriptions, ...inAppProducts];
      
      this.products = products;
      console.log('✅ 제품 정보 로드 완료:', products.length, '개');
      console.log('📦 로드된 제품 목록:', products.map(p => ({
        id: p.id,
        productId: p.productId,
        title: p.title,
        price: p.price,
      })));
      
      return products;
    } catch (error) {
      console.error('❌ 제품 정보 로드 실패:', error);
      console.error('❌ 에러 상세:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      throw error;
    }
  }

  // 구매 리스너 설정
  setupPurchaseListeners() {
    // 이미 리스너가 등록되어 있으면 중복 등록 방지
    if (this.purchaseUpdateSubscription && this.purchaseErrorSubscription) {
      console.log('⚠️ 리스너가 이미 등록되어 있습니다. 중복 등록 방지.');
      return;
    }
    
    // 기존 리스너가 있으면 제거
    if (this.purchaseUpdateSubscription) {
      try {
        this.purchaseUpdateSubscription.remove();
      } catch (error) {
        console.error('❌ 기존 purchaseUpdateSubscription 제거 실패:', error);
      }
      this.purchaseUpdateSubscription = null;
    }
    
    if (this.purchaseErrorSubscription) {
      try {
        this.purchaseErrorSubscription.remove();
      } catch (error) {
        console.error('❌ 기존 purchaseErrorSubscription 제거 실패:', error);
      }
      this.purchaseErrorSubscription = null;
    }
    
    // 구매 업데이트 리스너 - 안전한 래핑으로 크래시 방지
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      (purchase) => {
        // 네이티브 모듈 콜백에서 예외가 발생하지 않도록 안전하게 래핑
        (async () => {
          try {
            // purchase 객체 유효성 검사
            if (!purchase) {
              console.error('❌ purchase 객체가 null입니다.');
              return;
            }
            
            console.log('🛒 구매 업데이트 수신:', purchase.productId || purchase.id);
            await this.handlePurchaseUpdate(purchase);
          } catch (error) {
            console.error('❌ 구매 업데이트 처리 중 에러:', error);
            // 에러가 발생해도 크래시를 방지하기 위해 안전하게 처리
            try {
              const productId = this.getProductIdFromPurchase(purchase);
              this.invokeCallback(productId, 'error', error);
            } catch (callbackError) {
              console.error('❌ 콜백 호출 중 에러:', callbackError);
            }
          }
        })().catch((error) => {
          // 최종 안전망: 모든 예외를 잡아서 크래시 방지
          console.error('❌ 구매 업데이트 처리 중 치명적 에러:', error);
        });
      }
    );

    // 구매 에러 리스너 - 안전한 래핑으로 크래시 방지
    this.purchaseErrorSubscription = purchaseErrorListener(
      (error) => {
        try {
          console.error('❌ 구매 에러:', error?.code, error?.message);
          this.handlePurchaseError(error);
        } catch (handlerError) {
          // handlePurchaseError에서 예외가 발생해도 크래시 방지
          console.error('❌ 구매 에러 처리 중 에러:', handlerError);
        }
      }
    );
    
    console.log('✅ 구매 리스너 등록 완료');
  }

  // Purchase 객체에서 productId 추출 (헬퍼 함수)
  getProductIdFromPurchase(purchase) {
    return purchase.productId || purchase.productIdentifier || purchase.id;
  }

  // 제품 찾기 (헬퍼 함수)
  findProduct(productId) {
    return this.products.find(p => 
      p.id === productId ||
      p.productId === productId || 
      p.productIdentifier === productId || 
      p.identifier === productId
    );
  }

  // 콜백 호출 및 정리 (헬퍼 함수)
  invokeCallback(productId, type, ...args) {
    try {
      if (!productId) {
        return null;
      }
      
      const callbacks = this.purchaseCallbacks[productId];
      if (callbacks) {
        try {
          if (type === 'success' && callbacks.onSuccess) {
            // 성공 콜백: 여러 인자를 전달 (purchase, subscriptionStatus 등)
            callbacks.onSuccess(...args);
          } else if (type === 'error' && callbacks.onError) {
            // 에러 콜백: 첫 번째 인자만 전달 (에러 객체)
            callbacks.onError(args[0]);
          }
        } catch (callbackError) {
          console.error('❌ 콜백 실행 중 에러:', callbackError);
        } finally {
          // 콜백 실행 후 정리
          delete this.purchaseCallbacks[productId];
        }
      }
      return callbacks;
    } catch (error) {
      console.error('❌ invokeCallback 처리 중 에러:', error);
      return null;
    }
  }

  // transactionId로 사용자 찾기 (헬퍼 함수)
  async findUserIdByTransactionId(transactionId) {
    try {
      if (!transactionId) {
        return null;
      }

      console.log('🔍 transactionId로 사용자 찾기:', transactionId);
      
      // Firestore에서 transactionId로 사용자 찾기
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('transactionId', '==', transactionId),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.id;
        console.log('✅ transactionId로 사용자 찾기 성공:', userId);
        return userId;
      }
      
      // originalTransactionId로도 시도
      const q2 = query(
        usersRef,
        where('originalTransactionId', '==', transactionId),
        limit(1)
      );
      
      const querySnapshot2 = await getDocs(q2);
      
      if (!querySnapshot2.empty) {
        const userDoc = querySnapshot2.docs[0];
        const userId = userDoc.id;
        console.log('✅ originalTransactionId로 사용자 찾기 성공:', userId);
        return userId;
      }
      
      console.warn('⚠️ transactionId로 사용자를 찾을 수 없습니다:', transactionId);
      return null;
    } catch (error) {
      console.error('❌ transactionId로 사용자 찾기 실패:', error);
      return null;
    }
  }

  // 구매 업데이트 처리
  async handlePurchaseUpdate(purchase) {
    let productId = null;
    try {
      // purchase 객체 유효성 검사
      if (!purchase) {
        throw new Error('purchase 객체가 유효하지 않습니다.');
      }
      
      productId = this.getProductIdFromPurchase(purchase);
      if (!productId) {
        throw new Error('productId를 찾을 수 없습니다.');
      }
      
      // userId 찾기 (여러 방법 시도)
      let userId = null;
      
      // 방법 1: 콜백에서 userId 가져오기 (기존 방식)
      const callbacks = this.purchaseCallbacks[productId];
      userId = callbacks?.userId;
      
      if (userId) {
        console.log('✅ 콜백에서 userId 가져오기 성공:', userId);
      } else {
        console.warn('⚠️ 콜백에서 userId를 찾을 수 없습니다. 다른 방법 시도...');
        
        // 방법 2: transactionId로 Firestore에서 사용자 찾기
        if (purchase.transactionId) {
          userId = await this.findUserIdByTransactionId(purchase.transactionId);
        }
        
        if (!userId && purchase.originalTransactionIdentifierIOS) {
          userId = await this.findUserIdByTransactionId(purchase.originalTransactionIdentifierIOS);
        }
        
        if (!userId && purchase.originalTransactionIdAndroid) {
          userId = await this.findUserIdByTransactionId(purchase.originalTransactionIdAndroid);
        }
      }
      
      console.log('🔄 구매 업데이트 처리:', {
        productId,
        userId: userId || '없음',
        transactionId: purchase.transactionId,
      });
      
      // 영수증 검증 (반드시 성공해야 함)
      let validationResult;
      try {
        validationResult = await this.validateReceipt(purchase);
      } catch (validationError) {
        console.error('❌ 영수증 검증 중 예외 발생:', validationError);
        validationResult = { isValid: false, error: validationError.message || '영수증 검증 중 오류가 발생했습니다.' };
      }
      
      if (validationResult.isValid) {
        // 사용자 구독 상태 업데이트
        if (userId) {
          try {
            console.log('👤 Firestore 사용자 구독 상태 업데이트 시작...');
            await this.updateUserSubscription(purchase, validationResult.subscriptionStatus, userId);
            console.log('✅ Firestore 사용자 구독 상태 업데이트 완료');
          } catch (updateError) {
            console.error('❌ Firestore 사용자 구독 상태 업데이트 실패:', {
              error: updateError.message,
              code: updateError.code,
              userId,
              transactionId: purchase.transactionId,
            });
            
            // Firestore 권한 오류인 경우 상세 정보 제공
            if (updateError.code === 'permission-denied') {
              console.error('❌ Firestore 권한 오류: firestore.rules에서 users/{userId} 쓰기 권한을 확인하세요.');
              console.error('❌ 현재 userId:', userId);
              console.error('❌ Firestore 규칙 확인: users/{userId} 문서에 대한 쓰기 권한이 필요합니다.');
            } else if (updateError.code === 'unavailable') {
              console.error('❌ Firestore 서비스 사용 불가: 네트워크 연결을 확인하세요.');
            } else if (updateError.code === 'deadline-exceeded') {
              console.error('❌ Firestore 타임아웃: 요청이 시간 초과되었습니다.');
            }
            
            // 업데이트 실패해도 거래는 완료 처리 (구매는 이미 완료되었으므로)
          }
        } else {
          console.error('❌ userId를 찾을 수 없어 Firestore 업데이트를 건너뜁니다.', {
            productId,
            transactionId: purchase.transactionId,
            originalTransactionId: purchase.originalTransactionIdentifierIOS || purchase.originalTransactionIdAndroid,
            purchaseKeys: Object.keys(purchase),
          });
          console.error('⚠️ 이 구매는 완료되었지만 구독 상태가 저장되지 않았습니다.');
          console.error('⚠️ 수동으로 확인이 필요할 수 있습니다.');
        }
        
        // 거래 완료 처리 - 네이티브 모듈 호출이므로 안전하게 처리
        try {
          await finishTransaction({ purchase, isConsumable: false });
          console.log('✅ 거래 완료 처리 성공');
        } catch (finishError) {
          console.error('❌ finishTransaction 실패:', finishError);
          // finishTransaction 실패는 로그만 남기고 계속 진행
          // 이미 처리된 거래일 수 있으므로 크래시를 유발하지 않음
        }
        
        console.log('✅ 구매 처리 완료');
        
        // 성공 콜백 호출
        try {
          const hasCallback = this.invokeCallback(productId, 'success', purchase, validationResult.subscriptionStatus);
          if (!hasCallback) {
            Alert.alert('구매 완료', '프리미엄 구독이 활성화되었습니다!');
          }
        } catch (callbackError) {
          console.error('❌ 성공 콜백 호출 실패:', callbackError);
        }
      } else {
        console.error('❌ 영수증 검증 실패:', validationResult.error);
        
        // 영수증 검증 실패 시 에러 콜백 호출
        try {
          const error = new Error(validationResult.error || '영수증 검증에 실패했습니다.');
          const hasCallback = this.invokeCallback(productId, 'error', error);
          if (!hasCallback) {
            Alert.alert('구매 실패', validationResult.error || '영수증 검증에 실패했습니다.');
          }
        } catch (callbackError) {
          console.error('❌ 에러 콜백 호출 실패:', callbackError);
        }
      }
    } catch (error) {
      console.error('❌ 구매 업데이트 처리 실패:', error);
      
      // productId가 없으면 purchase에서 다시 추출 시도
      if (!productId && purchase) {
        try {
          productId = this.getProductIdFromPurchase(purchase);
        } catch (e) {
          console.error('❌ productId 추출 실패:', e);
        }
      }
      
      // 에러 콜백 호출
      if (productId) {
        try {
          const hasCallback = this.invokeCallback(productId, 'error', error);
          if (!hasCallback) {
            Alert.alert('구매 실패', '구매 처리 중 오류가 발생했습니다.');
          }
        } catch (callbackError) {
          console.error('❌ 에러 콜백 호출 실패:', callbackError);
        }
      }
    }
  }

  // 에러 메시지 생성 (헬퍼 함수)
  getErrorMessage(error) {
    if (error.code === 'E_ITEM_UNAVAILABLE') {
      return { title: '구매 실패', message: '해당 상품을 구매할 수 없습니다.' };
    } else if (error.code === 'E_NETWORK_ERROR') {
      return { title: '구매 실패', message: '네트워크 연결을 확인해주세요.' };
    } else if (error.message?.includes('Authentication Failed') || error.message?.includes('Password reuse not available')) {
      return {
        title: '인증 실패',
        message: '⚠️ Xcode 시뮬레이터에서는 실제 Apple ID로 구매 테스트가 불가능합니다.\n\n해결 방법:\n1. 시뮬레이터: Settings → App Store에서 샌드박스 테스트 계정으로 로그인\n2. 실제 기기: TestFlight 또는 App Store에서 다운로드한 앱으로 테스트'
      };
    }
    return { title: '구매 실패', message: '구매 중 오류가 발생했습니다.' };
  }

  // 구매 에러 처리
  handlePurchaseError(error) {
    try {
      // error 객체 유효성 검사
      if (!error) {
        console.error('❌ error 객체가 null입니다.');
        return;
      }
      
      // 중복 호출 방지
      const now = Date.now();
      if (this.isHandlingError && this.lastErrorTime && (now - this.lastErrorTime) < 1000) {
        return;
      }
      
      this.isHandlingError = true;
      this.lastErrorTime = now;
      
      const productId = error.productId || this.currentPurchaseProductId;
      
      // 사용자 취소는 Alert 표시하지 않지만, 콜백은 호출하여 로딩 상태 해제
      if (error.code === 'E_USER_CANCELLED' || error.code === 'user-cancelled') {
        // 콜백 호출하여 로딩 상태 해제 (Alert는 표시하지 않음)
        try {
          this.invokeCallback(productId, 'error', error);
        } catch (callbackError) {
          console.error('❌ 취소 콜백 호출 실패:', callbackError);
        }
        this.currentPurchaseProductId = null;
        this.isHandlingError = false;
        return;
      }
      
      // 콜백에 에러 전달
      let hasCallback = false;
      try {
        hasCallback = !!this.invokeCallback(productId, 'error', error);
      } catch (callbackError) {
        console.error('❌ 에러 콜백 호출 실패:', callbackError);
      }
      
      // 추적 정보 초기화
      this.currentPurchaseProductId = null;
      
      // 콜백이 없으면 기본 Alert 표시
      if (!hasCallback) {
        try {
          const { title, message } = this.getErrorMessage(error);
          Alert.alert(title, message);
        } catch (alertError) {
          console.error('❌ Alert 표시 실패:', alertError);
        }
      }
      
      setTimeout(() => {
        this.isHandlingError = false;
      }, 1000);
    } catch (handlerError) {
      // handlePurchaseError 자체에서 예외가 발생해도 크래시 방지
      console.error('❌ handlePurchaseError 처리 중 에러:', handlerError);
      this.isHandlingError = false;
    }
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
        if (Platform.OS === 'ios') {
          // checkSubscriptionStatus는 latest_receipt_info를 포함한 receiptInfo 객체를 기대함
          // validationResult.latestReceiptInfo가 있으면 전체 result 객체 구조로 전달
          if (validationResult.latestReceiptInfo) {
            // latestReceiptInfo를 포함한 receiptInfo 객체 생성
            const receiptInfo = {
              latest_receipt_info: validationResult.latestReceiptInfo,
              receipt: validationResult.receipt,
            };
            const subscriptionStatus = await receiptValidationService.checkSubscriptionStatus(receiptInfo);
            return {
              isValid: true,
              subscriptionStatus,
            };
          } else if (validationResult.receipt) {
            // receipt만 있는 경우 시도
            const subscriptionStatus = await receiptValidationService.checkSubscriptionStatus(validationResult.receipt);
            return {
              isValid: true,
              subscriptionStatus,
            };
          }
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
      console.log('👤 사용자 구독 상태 업데이트 시작:', {
        userId,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        hasSubscriptionStatus: !!subscriptionStatus,
      });
      
      if (!userId) {
        console.error('❌ userId가 제공되지 않았습니다.');
        throw new Error('userId가 필요합니다.');
      }
      
      // Firestore에서 사용자 문서 업데이트
      const userRef = doc(db, 'users', userId);
      
      // 현재 사용자 문서 확인 (권한 문제 진단용)
      try {
        const currentUserDoc = await getDoc(userRef);
        if (!currentUserDoc.exists()) {
          console.warn('⚠️ 사용자 문서가 존재하지 않습니다. 새로 생성합니다.');
        } else {
          console.log('✅ 사용자 문서 존재 확인 완료');
        }
      } catch (checkError) {
        console.error('❌ 사용자 문서 확인 실패:', {
          error: checkError.message,
          code: checkError.code,
        });
        // 계속 진행 (문서가 없을 수 있음)
      }
      
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
      
      console.log('📝 Firestore 업데이트 데이터:', {
        userId,
        isPremium: subscriptionData.isPremium,
        subscriptionType: subscriptionData.subscriptionType,
        transactionId: subscriptionData.transactionId,
        expiresDate: subscriptionData.expiresDate,
        isActive: subscriptionData.isActive,
      });
      
      await setDoc(userRef, subscriptionData, { merge: true });
      console.log('✅ 사용자 구독 상태 업데이트 완료');
    } catch (error) {
      console.error('❌ 사용자 구독 상태 업데이트 실패:', {
        error: error.message,
        code: error.code,
        userId,
        transactionId: purchase.transactionId,
      });
      
      // Firestore 권한 오류인 경우 상세 정보 제공
      if (error.code === 'permission-denied') {
        console.error('❌ Firestore 권한 오류: firestore.rules에서 users/{userId} 쓰기 권한을 확인하세요.');
        console.error('❌ 현재 userId:', userId);
        console.error('❌ Firestore 규칙 확인: users/{userId} 문서에 대한 쓰기 권한이 필요합니다.');
      } else if (error.code === 'unavailable') {
        console.error('❌ Firestore 서비스 사용 불가: 네트워크 연결을 확인하세요.');
      } else if (error.code === 'deadline-exceeded') {
        console.error('❌ Firestore 타임아웃: 요청이 시간 초과되었습니다.');
      }
      
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
      
      if (!productId) {
        throw new Error('productId가 제공되지 않았습니다.');
      }
      
      // 제품 확인
      console.log('🔍 제품 확인 중:', {
        productId,
        loadedProductsCount: this.products.length,
        loadedProductIds: this.products.map(p => p.id || p.productId),
      });
      
      const product = this.findProduct(productId);
      if (!product) {
        console.error('❌ 제품을 찾을 수 없습니다:', {
          productId,
          availableProducts: this.products.map(p => ({
            id: p.id,
            productId: p.productId,
            productIdentifier: p.productIdentifier,
          })),
        });
        const error = new Error(`제품을 찾을 수 없습니다: ${productId}. 제품 정보를 다시 로드해주세요.`);
        this.invokeCallback(productId, 'error', error);
        throw error;
      }
      
      console.log('✅ 제품 확인 완료:', {
        productId: product.id || product.productId,
        title: product.title,
        price: product.price,
      });
      
      // 콜백 저장 (구매 완료 시 호출)
      if (callbacks.onSuccess || callbacks.onError) {
        this.purchaseCallbacks[productId] = {
          ...callbacks,
          userId: userId,
        };
      }
      
      // 제품 타입 확인
      const isSubscription = SUBSCRIPTION_IDS.includes(productId);
      
      // 현재 구매 요청 추적
      this.currentPurchaseProductId = productId;
      
      // 구매 요청 (react-native-iap는 purchaseUpdatedListener로 구매 완료를 처리)
      // 네이티브 모듈 호출이므로 안전하게 처리
      try {
        console.log('🛒 requestPurchase 호출 시작:', {
          productId,
          isSubscription,
          product: product ? { id: product.id, productId: product.productId } : '없음',
        });
        
        // react-native-iap v14 API 사용법
        // 구독의 경우 request 객체와 type이 필요함
        const purchasePromise = requestPurchase({
          request: {
            sku: productId,
          },
          type: isSubscription ? 'subs' : 'in-app',
        });
        
        // Promise가 반환되면 에러 처리
        if (purchasePromise && typeof purchasePromise.catch === 'function') {
          purchasePromise.catch((error) => {
            console.error('❌ requestPurchase Promise 실패:', error);
            // purchaseErrorListener에서도 처리되지만, 여기서도 콜백 호출
            this.invokeCallback(productId, 'error', error);
          });
        }
        
        console.log('✅ requestPurchase 호출 완료 (다이얼로그 표시 대기 중)');
      } catch (requestError) {
        console.error('❌ requestPurchase 호출 실패 (동기 에러):', requestError);
        // 동기 에러는 즉시 콜백 호출
        this.invokeCallback(productId, 'error', requestError);
        throw requestError;
      }
    } catch (error) {
      console.error('❌ 구매 요청 실패:', error);
      
      // 에러 콜백 호출
      try {
        this.invokeCallback(productId, 'error', error);
      } catch (callbackError) {
        console.error('❌ 에러 콜백 호출 실패:', callbackError);
      }
      
      // 추적 정보 초기화
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
    return this.findProduct(productId);
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
