import React, { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react';
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

export const GuideProvider = ({ children }) => {
  const { user } = useAuth();
  const [guideStates, setGuideStates] = useState({
    homeGuideCompleted: false,
    meetingGuideCompleted: false,
    communityGuideCompleted: false,
    settingsGuideCompleted: false,
  });

  const [currentGuide, setCurrentGuide] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  // 사용자 변경 시 가이드 상태 로드
  useLayoutEffect(() => {
    if (user?.uid) {
      loadGuideStates();
    } else {
      // 사용자가 없으면 기본 상태로 초기화
      setGuideStates({
        homeGuideCompleted: false,
        meetingGuideCompleted: false,
        communityGuideCompleted: false,
        settingsGuideCompleted: false,
      });
    }
  }, [user?.uid]);

  const loadGuideStates = async () => {
    try {
      if (!user?.uid) return;
      
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const savedGuideStates = userData.guideStates;
        
        if (savedGuideStates) {
          // Firestore에서 가이드 상태 로드
          setGuideStates({
            homeGuideCompleted: savedGuideStates.homeGuideCompleted || false,
            meetingGuideCompleted: savedGuideStates.meetingGuideCompleted || false,
            communityGuideCompleted: savedGuideStates.communityGuideCompleted || false,
            settingsGuideCompleted: savedGuideStates.settingsGuideCompleted || false,
          });
        } else {
          // 새 사용자 - 기본 상태로 초기화
          setGuideStates({
            homeGuideCompleted: false,
            meetingGuideCompleted: false,
            communityGuideCompleted: false,
            settingsGuideCompleted: false,
          });
        }
      } else {
        // 사용자 문서가 없으면 기본 상태로 초기화
        setGuideStates({
          homeGuideCompleted: false,
          meetingGuideCompleted: false,
          communityGuideCompleted: false,
          settingsGuideCompleted: false,
        });
      }
    } catch (error) {
      console.error('가이드 상태 로드 실패:', error);
      // 에러 발생 시 기본 상태로 초기화
      setGuideStates({
        homeGuideCompleted: false,
        meetingGuideCompleted: false,
        communityGuideCompleted: false,
        settingsGuideCompleted: false,
      });
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
      
      // Firestore에 guideStates 필드 업데이트
      await updateDoc(userRef, {
        guideStates: {
          homeGuideCompleted: Boolean(newStates.homeGuideCompleted),
          meetingGuideCompleted: Boolean(newStates.meetingGuideCompleted),
          communityGuideCompleted: Boolean(newStates.communityGuideCompleted),
          settingsGuideCompleted: Boolean(newStates.settingsGuideCompleted),
        },
        updatedAt: serverTimestamp(),
      });
      
      // 상태 업데이트는 성공한 후에만 수행
      setGuideStates(newStates);
    } catch (error) {
      console.error('가이드 상태 저장 실패:', error);
      // 에러가 발생해도 로컬 상태는 업데이트 (오프라인 지원)
      // 하지만 Firestore 업데이트는 실패했으므로 다음 로드 시 다시 시도됨
      setGuideStates(newStates);
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

  // 가이드 완료
  const completeGuide = (guideType) => {
    const newStates = {
      ...guideStates,
      [`${guideType}GuideCompleted`]: true,
    };
    saveGuideStates(newStates);
    setCurrentGuide(null);
    setCurrentStep(0);
  };

  // 가이드 종료
  const exitGuide = () => {
    setCurrentGuide(null);
    setCurrentStep(0);
  };

  // 가이드 재시작 (개발/테스트용)
  const resetGuide = async (guideType = null) => {
    try {
      if (!user?.uid) return;
      
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      
      if (guideType) {
        // 특정 가이드만 리셋
        const newStates = {
          ...guideStates,
          [`${guideType}GuideCompleted`]: false,
        };
        
        await updateDoc(userRef, {
          [`guideStates.${guideType}GuideCompleted`]: false,
          updatedAt: serverTimestamp(),
        });
        
        setGuideStates(newStates);
      } else {
        // 모든 가이드 리셋
        const resetStates = {
          homeGuideCompleted: false,
          meetingGuideCompleted: false,
          communityGuideCompleted: false,
          settingsGuideCompleted: false,
        };
        
        await updateDoc(userRef, {
          guideStates: resetStates,
          updatedAt: serverTimestamp(),
        });
        
        setGuideStates(resetStates);
      }
      
      // 현재 가이드 상태 초기화
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
