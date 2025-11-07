import React, { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      
      const userKey = `guideStates_${user.uid}`;
      const savedStates = await AsyncStorage.getItem(userKey);
      if (savedStates) {
        const parsedStates = JSON.parse(savedStates);
        setGuideStates(parsedStates);
      } else {
        // 새 사용자 - 기본 상태로 초기화
        setGuideStates({
          homeGuideCompleted: false,
          meetingGuideCompleted: false,
          communityGuideCompleted: false,
          settingsGuideCompleted: false,
        });
      }
    } catch (error) {
      console.error('가이드 상태 로드 실패:', error);
    }
  };

  // 가이드 상태 저장
  const saveGuideStates = async (newStates) => {
    try {
      if (!user?.uid) return;
      
      const userKey = `guideStates_${user.uid}`;
      await AsyncStorage.setItem(userKey, JSON.stringify(newStates));
      setGuideStates(newStates);
    } catch (error) {
      console.error('가이드 상태 저장 실패:', error);
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
      
      const userKey = `guideStates_${user.uid}`;
      
      if (guideType) {
        const newStates = {
          ...guideStates,
          [`${guideType}GuideCompleted`]: false,
        };
        await AsyncStorage.setItem(userKey, JSON.stringify(newStates));
        setGuideStates(newStates);
      } else {
        // 모든 가이드 리셋
        await AsyncStorage.removeItem(userKey);
        setGuideStates({
          homeGuideCompleted: false,
          meetingGuideCompleted: false,
          communityGuideCompleted: false,
          settingsGuideCompleted: false,
        });
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
