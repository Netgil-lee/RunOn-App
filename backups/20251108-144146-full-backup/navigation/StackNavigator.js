import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import PhoneAuthScreen from '../screens/PhoneAuthScreen';
import VerificationScreen from '../screens/VerificationScreen';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import NotificationScreen from '../screens/NotificationScreen';
import SearchScreen from '../screens/SearchScreen';

import OnboardingScreen from '../screens/OnboardingScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';

const Stack = createStackNavigator();

const StackNavigator = () => {
  const { user, initializing, error, onboardingCompleted } = useAuth();
  
  console.log('🧭 StackNavigator 상태:', { 
    user: user ? user.uid : null, 
    initializing, 
    onboardingCompleted 
  });



  // 초기화 중일 때는 스플래시 화면 표시
  if (initializing) {

    return <SplashScreen />;
  }


  
  if (error) {

  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontSize: 22,
          fontWeight: 'bold',
        },
        headerShown: false,
        cardStyle: { backgroundColor: '#000' },
        animationEnabled: true,
        gestureEnabled: false,
        // 부드러운 fade-in 전환 효과
        cardStyleInterpolator: ({ current, next, layouts }) => {
          return {
            cardStyle: {
              opacity: current.progress.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0, 0.3, 1],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  scale: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          };
        },
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 600,
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 400,
            },
          },
        },
      }}
    >
      {/* 모든 화면을 항상 등록하되, 초기 화면만 조건에 따라 결정 */}
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{
              animationTypeForReplace: 'push'
            }}
          />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen}
            options={{
              headerShown: true,
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            }}
          />
          <Stack.Screen 
            name="Onboarding" 
            component={OnboardingScreen}
            options={{
              headerShown: false,
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            }}
          />
          <Stack.Screen 
            name="Notification" 
            component={NotificationScreen}
            options={{
              headerShown: true,
              title: '알림',
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            }}
          />
          <Stack.Screen 
            name="Search" 
            component={SearchScreen}
            options={{
              headerShown: false,
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            }}
          />
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{
              animationTypeForReplace: 'pop'
            }}
          />
          <Stack.Screen 
        name="PhoneAuth" 
        component={PhoneAuthScreen}
            options={{
          title: '휴대폰 인증',
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            }}
          />

          <Stack.Screen 
        name="Verification" 
        component={VerificationScreen}
            options={{
          title: '인증번호 확인',
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            }}
          />
          <Stack.Screen 
            name="HelpCenter" 
            component={HelpCenterScreen}
            options={{
              headerShown: false,
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            }}
          />
    </Stack.Navigator>
  );
};

export default StackNavigator; 