import React, { useEffect } from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import { useCommunity } from '../contexts/CommunityContext';
import LoginScreen from '../screens/LoginScreen';
import PhoneAuthScreen from '../screens/PhoneAuthScreen';

import VerificationScreen from '../screens/VerificationScreen';
import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import CommunityScreen from '../screens/CommunityScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SplashScreen from '../screens/SplashScreen';
import ChatScreen from '../screens/ChatScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import ParticipantScreen from '../screens/ParticipantScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import RunningMeetingReview from '../screens/RunningMeetingReview';
import SettingsScreen from '../screens/SettingsScreen';
import PostCreateScreen from '../screens/PostCreateScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import NotificationScreen from '../screens/NotificationScreen';
import SearchScreen from '../screens/SearchScreen';

import AppIntroScreen from '../screens/AppIntroScreen';
import AppGuideScreen from '../screens/AppGuideScreen';
import EmailSignupScreen from '../screens/EmailSignupScreen';
import EmailLoginScreen from '../screens/EmailLoginScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
};

// 로그인된 사용자를 위한 BottomTab 네비게이션
const MainTabNavigator = () => {
  const { hasMeetingNotification, hasUpdateNotification } = useEvents();
  const { hasCommunityNotification } = useCommunity();

  // 디버깅: AppNavigator 알림 상태 로그
  console.log('🔍 AppNavigator 알림 상태:', {
    hasMeetingNotification,
    hasUpdateNotification,
    hasCommunityNotification,
    scheduleTabBadge: hasMeetingNotification || hasUpdateNotification,
    communityTabBadge: hasCommunityNotification,
    totalBadges: (hasMeetingNotification || hasUpdateNotification) + (hasCommunityNotification ? 1 : 0)
  });

  // 알림 표시가 있는 아이콘 컴포넌트
  const TabIconWithBadge = ({ route, focused, color, size }) => {
    let iconName;
    let hasBadge = false;

    if (route.name === 'HomeTab') {
      iconName = focused ? 'home' : 'home-outline';
    } else if (route.name === 'ScheduleTab') {
      iconName = focused ? 'calendar-clear' : 'calendar-clear-outline';
      hasBadge = hasMeetingNotification || hasUpdateNotification;
    } else if (route.name === 'CommunityTab') {
      iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
      hasBadge = hasCommunityNotification;
    } else if (route.name === 'ProfileTab') {
      iconName = focused ? 'person' : 'person-outline';
    }

    return (
      <View style={{ position: 'relative' }}>
        <Ionicons name={iconName} size={28} color={color} />
        {hasBadge && (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#FF0022',
            }}
          />
        )}
      </View>
    );
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => (
          <TabIconWithBadge route={route} focused={focused} color={color} size={size} />
        ),
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: '#cccccc',
        tabBarStyle: {
          backgroundColor: COLORS.SURFACE,
          borderTopWidth: 0,
          height: 85,
          paddingBottom: 36,
          paddingTop: 0,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '500',
          marginTop: -2,
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen}
        options={{ tabBarLabel: '홈' }}
      />
      <Tab.Screen 
        name="ScheduleTab" 
        component={ScheduleScreen}
        options={{ tabBarLabel: '모임' }}
      />
      <Tab.Screen 
        name="CommunityTab" 
        component={CommunityScreen}
        options={{ tabBarLabel: '커뮤니티' }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen}
        options={{ tabBarLabel: '프로필' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, initializing, onboardingCompleted } = useAuth();

  console.log('🧭 AppNavigator 상태:', { 
    user: user ? user.uid : null, 
    initializing, 
    onboardingCompleted,
    hasUser: !!user,
    onboardingStatus: onboardingCompleted ? 'completed' : 'pending',
    environment: __DEV__ ? 'development' : 'production'
  });

  // 상태 일관성 검증 및 디버깅
  useEffect(() => {
    if (!initializing) {
      console.log('🔍 AppNavigator: 상태 일관성 검증');
      console.log('🔍 사용자 존재:', !!user);
      console.log('🔍 온보딩 완료 상태:', onboardingCompleted);
      console.log('🔍 초기화 상태:', initializing);
      
      // TestFlight 환경에서의 추가 디버깅
      if (!__DEV__) {
        console.log('🔍 TestFlight 환경 - 네비게이션 결정:', {
          shouldShowLogin: !user,
          shouldShowOnboarding: user && !onboardingCompleted,
          shouldShowMain: user && onboardingCompleted,
          timestamp: new Date().toISOString()
        });
        
        // TestFlight에서 상태 불일치 감지
        if (user && onboardingCompleted === undefined) {
          console.warn('⚠️ TestFlight: 온보딩 상태가 undefined입니다');
        }
        
        if (user && onboardingCompleted === null) {
          console.warn('⚠️ TestFlight: 온보딩 상태가 null입니다');
        }
      }
    }
  }, [user, initializing, onboardingCompleted]);

  if (initializing) {
    console.log('🧭 AppNavigator: 초기화 중 - SplashScreen 표시');
    return <SplashScreen />;
  }

  // 간단한 조건부 렌더링
  if (!user) {
    // 사용자가 없으면 로그인 화면
    console.log('🧭 AppNavigator: 사용자 없음 - 로그인 화면으로 이동');
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: COLORS.BACKGROUND },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="EmailSignup" component={EmailSignupScreen} />
        <Stack.Screen name="EmailLogin" component={EmailLoginScreen} />

        <Stack.Screen name="PhoneAuth" component={PhoneAuthScreen} />
        <Stack.Screen name="Verification" component={VerificationScreen} />
        <Stack.Screen name="AppIntro" component={AppIntroScreen} />
        <Stack.Screen name="AppGuide" component={AppGuideScreen} />
      </Stack.Navigator>
    );
  } else if (!onboardingCompleted) {
    // 사용자가 있지만 온보딩이 완료되지 않았으면 온보딩 화면
    console.log('🧭 AppNavigator: 온보딩 미완료 - 온보딩 화면으로 이동');
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: COLORS.BACKGROUND },
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="AppIntro" component={AppIntroScreen} />
      </Stack.Navigator>
    );
  } else {
    // 사용자가 있고 온보딩이 완료되었으면 메인 화면
    console.log('🧭 AppNavigator: 온보딩 완료 - 홈 화면으로 이동');
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: COLORS.BACKGROUND },
        }}
      >
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen name="AppIntro" component={AppIntroScreen} />
        <Stack.Screen name="AppGuide" component={AppGuideScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Participant" component={ParticipantScreen} />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} />
        <Stack.Screen name="RunningMeetingReview" component={RunningMeetingReview} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="PostCreate" component={PostCreateScreen} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} />
        <Stack.Screen name="Notification" component={NotificationScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
      </Stack.Navigator>
    );
  }
};

export default AppNavigator; 