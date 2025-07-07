import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';

import OnboardingScreen from '../screens/OnboardingScreen';

const Stack = createStackNavigator();

const StackNavigator = () => {
  const { user, initializing, error } = useAuth();



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
      {user ? (
        // 로그인된 사용자 - 홈 화면과 채팅 화면 표시
        <>
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
        </>
      ) : (
        // 로그인되지 않은 사용자 - 인증 화면들 표시
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{
              animationTypeForReplace: 'pop'
            }}
          />
          <Stack.Screen 
            name="Signup" 
            component={SignupScreen}
            options={{
              animationTypeForReplace: 'push',
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
        </>
      )}
    </Stack.Navigator>
  );
};

export default StackNavigator; 