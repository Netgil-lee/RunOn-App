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
import CarrierAuthScreen from '../screens/CarrierAuthScreen';
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
import VerificationIntroScreen from '../screens/VerificationIntroScreen';
import AppIntroScreen from '../screens/AppIntroScreen';
import AppGuideScreen from '../screens/AppGuideScreen';

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
  const { hasMeetingNotification } = useEvents();
  const { hasCommunityNotification } = useCommunity();

  // 알림 표시가 있는 아이콘 컴포넌트
  const TabIconWithBadge = ({ route, focused, color, size }) => {
    let iconName;
    let hasBadge = false;

    if (route.name === 'HomeTab') {
      iconName = focused ? 'home' : 'home-outline';
    } else if (route.name === 'ScheduleTab') {
      iconName = focused ? 'calendar-clear' : 'calendar-clear-outline';
      hasBadge = hasMeetingNotification;
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
    onboardingCompleted 
  });

  // 로그아웃 감지 및 로그인 화면 강제 이동
  useEffect(() => {
    if (!initializing && !user) {
      console.log('🚪 AppNavigator: 사용자가 로그아웃됨 - 로그인 화면으로 이동');
    }
  }, [user, initializing]);

  if (initializing) {
    return <SplashScreen />;
  }

  // 초기 화면 결정
  let initialRouteName = 'Login';
  if (user && onboardingCompleted) {
    initialRouteName = 'Main';
    console.log('🧭 AppNavigator: 홈 화면으로 이동');
  } else if (user && !onboardingCompleted) {
    initialRouteName = 'Onboarding';
    console.log('🧭 AppNavigator: 온보딩 화면으로 이동');
  } else {
    console.log('🧭 AppNavigator: 로그인 화면으로 이동');
  }

  

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.BACKGROUND },
        cardOverlayEnabled: false,
        animationEnabled: true,
        gestureEnabled: false,
        presentation: 'card',
      }}
    >
      {/* 모든 화면을 항상 등록하되, 초기 화면만 조건에 따라 결정 */}
          <Stack.Screen 
            name="Main" 
            component={MainTabNavigator}
            options={{
              animationTypeForReplace: 'push'
            }}
          />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen}
            options={{
              headerShown: true,
              headerStyle: {
                backgroundColor: COLORS.SURFACE,
              },
              headerTintColor: '#ffffff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
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
            name="Participant" 
            component={ParticipantScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="EventDetail" 
            component={EventDetailScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="RunningMeetingReview" 
            component={RunningMeetingReview}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="PostCreate" 
            component={PostCreateScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="PostDetail" 
            component={PostDetailScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="Notification" 
            component={NotificationScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="Search" 
            component={SearchScreen}
            options={{
              headerShown: false,
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
            name="VerificationIntro" 
            component={VerificationIntroScreen}
            options={{
              headerShown: false,
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
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
        name="CarrierAuth" 
        component={CarrierAuthScreen}
            options={{
          title: '통신사 본인인증',
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
            name="AppIntro" 
            component={AppIntroScreen}
            options={{
              headerShown: false,
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            }}
          />
          <Stack.Screen 
            name="AppGuide" 
            component={AppGuideScreen}
            options={{
              headerShown: false,
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            }}
          />
    </Stack.Navigator>
  );
};

export default AppNavigator; 