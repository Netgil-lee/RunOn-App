import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import paymentService from '../services/paymentService';

const PremiumContext = createContext();

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
};

export const PremiumProvider = ({ children }) => {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState(null);
  const [expiresDate, setExpiresDate] = useState(null);
  const [loading, setLoading] = useState(true);

  // 사용자 변경 시 프리미엄 상태 확인
  useEffect(() => {
    if (user?.uid) {
      checkPremiumStatus();
    } else {
      setIsPremium(false);
      setSubscriptionType(null);
      setExpiresDate(null);
      setLoading(false);
    }
  }, [user?.uid]);

  // 프리미엄 상태 확인
  const checkPremiumStatus = async () => {
    try {
      setLoading(true);
      
      if (!user?.uid) {
        setIsPremium(false);
        return;
      }

      const subscription = await paymentService.checkUserSubscriptionStatus(user.uid);
      
      setIsPremium(subscription.isPremium);
      setSubscriptionType(subscription.subscriptionType);
      setExpiresDate(subscription.expiresDate);
      
      console.log('✅ 프리미엄 상태 확인 완료:', {
        isPremium: subscription.isPremium,
        subscriptionType: subscription.subscriptionType,
        expiresDate: subscription.expiresDate,
      });
    } catch (error) {
      console.error('❌ 프리미엄 상태 확인 실패:', error);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  };

  // 프리미엄 상태 업데이트 (구매 완료 후 호출)
  const updatePremiumStatus = (subscriptionData) => {
    setIsPremium(true);
    setSubscriptionType(subscriptionData.subscriptionType);
    setExpiresDate(subscriptionData.expiresDate);
  };

  // 프리미엄 상태 초기화 (로그아웃 시 호출)
  const resetPremiumStatus = () => {
    setIsPremium(false);
    setSubscriptionType(null);
    setExpiresDate(null);
  };

  // 프리미엄 기능 접근 권한 확인
  const hasPremiumAccess = (feature) => {
    if (!isPremium) return false;
    
    // 구독 만료 확인
    if (expiresDate && new Date() > new Date(expiresDate)) {
      setIsPremium(false);
      return false;
    }
    
    return true;
  };

  // 프리미엄 기능별 접근 권한
  const premiumFeatures = {
    unlimitedMeetings: hasPremiumAccess('unlimitedMeetings'),
    advancedFiltering: hasPremiumAccess('advancedFiltering'),
    prioritySupport: hasPremiumAccess('prioritySupport'),
    adFree: hasPremiumAccess('adFree'),
    detailedAnalytics: hasPremiumAccess('detailedAnalytics'),
    specialEvents: hasPremiumAccess('specialEvents'),
  };

  const value = {
    isPremium,
    subscriptionType,
    expiresDate,
    loading,
    premiumFeatures,
    checkPremiumStatus,
    updatePremiumStatus,
    resetPremiumStatus,
    hasPremiumAccess,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
};
