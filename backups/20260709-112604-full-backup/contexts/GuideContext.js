import React, { createContext, useContext, useState, useLayoutEffect } from 'react';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const GuideContext = createContext();

export const useGuide = () => {
  const context = useContext(GuideContext);
  if (!context) {
    throw new Error('useGuide must be used within a GuideProvider');
  }
  return context;
};

// 현재 가이드는 '모임탭' 단일 가이드만 존재합니다.
const DEFAULT_GUIDE_STATES = {
  meetingGuideCompleted: false,
};

export const GuideProvider = ({ children }) => {
  const { user } = useAuth();
  const [guideStates, setGuideStates] = useState(DEFAULT_GUIDE_STATES);

  const [currentGuide, setCurrentGuide] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  // 사용자 변경 시 가이드 상태 로드
  useLayoutEffect(() => {
    if (user?.uid) {
      loadGuideStates();
    } else {
      setGuideStates(DEFAULT_GUIDE_STATES);
    }
  }, [user?.uid]);

  const loadGuideStates = async () => {
    try {
      if (!user?.uid) return;

      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      const savedGuideStates = userSnap.exists() ? userSnap.data().guideStates : null;

      setGuideStates({
        meetingGuideCompleted: savedGuideStates?.meetingGuideCompleted || false,
      });
    } catch (error) {
      console.error('가이드 상태 로드 실패:', error);
      setGuideStates(DEFAULT_GUIDE_STATES);
    }
  };

  // 가이드 상태 저장
  const saveGuideStates = async (newStates) => {
    try {
      if (!user?.uid) {
        console.warn('가이드 상태 저장: 사용자 ID가 없습니다.');
        return;
      }

      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);

      await updateDoc(userRef, {
        guideStates: {
          meetingGuideCompleted: Boolean(newStates.meetingGuideCompleted),
        },
        updatedAt: serverTimestamp(),
      });
      // 로컬 상태는 호출부(completeGuide/resetGuide)에서 이미 동기 반영됨
    } catch (error) {
      console.error('가이드 상태 저장 실패:', error);
      // 저장 실패해도 로컬 상태는 유지 (오프라인 지원)
    }
  };

  // 가이드 시작
  const startGuide = (guideType) => {
    if (guideStates[`${guideType}GuideCompleted`]) {
      return; // 이미 완료된 가이드는 시작하지 않음
    }

    setCurrentGuide(guideType);
    setCurrentStep(0);
  };

  // 가이드 다음 단계
  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  // 가이드 완료 (완료 상태 영구 저장)
  const completeGuide = (guideType) => {
    const newStates = {
      ...guideStates,
      [`${guideType}GuideCompleted`]: true,
    };
    // 로컬 상태를 먼저 동기 반영해야 currentGuide=null 직후 시작 트리거가
    // 재발동하지 않는다 (Firestore 저장은 비동기라 늦게 반영되므로 경쟁 발생)
    setGuideStates(newStates);
    setCurrentGuide(null);
    setCurrentStep(0);
    // Firestore에는 백그라운드로 영구 저장
    saveGuideStates(newStates);
  };

  // 가이드 종료 (완료 처리 없이 숨김)
  const exitGuide = () => {
    setCurrentGuide(null);
    setCurrentStep(0);
  };

  // 가이드 재시작 (개발/테스트용)
  const resetGuide = async (guideType = 'meeting') => {
    try {
      if (!user?.uid) return;

      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);

      await updateDoc(userRef, {
        [`guideStates.${guideType}GuideCompleted`]: false,
        updatedAt: serverTimestamp(),
      });

      setGuideStates(prev => ({ ...prev, [`${guideType}GuideCompleted`]: false }));
      setCurrentGuide(null);
      setCurrentStep(0);
    } catch (error) {
      console.error('가이드 리셋 실패:', error);
    }
  };

  const value = {
    guideStates,
    currentGuide,
    setCurrentGuide,
    currentStep,
    setCurrentStep,
    startGuide,
    nextStep,
    completeGuide,
    exitGuide,
    resetGuide,
  };

  return (
    <GuideContext.Provider value={value}>
      {children}
    </GuideContext.Provider>
  );
};

export default GuideContext;
