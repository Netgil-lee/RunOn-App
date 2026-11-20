import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import PhoneAuthScreen from '../screens/PhoneAuthScreen';

import VerificationScreen from '../screens/VerificationScreen';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
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
import RunningTrackerScreen from '../screens/RunningTrackerScreen';
import RunningResultScreen from '../screens/RunningResultScreen';
import RunningStatsScreen from '../screens/RunningStatsScreen';

import AppIntroScreen from '../screens/AppIntroScreen';
import AppGuideScreen from '../screens/AppGuideScreen';
import BlacklistManagementScreen from '../screens/BlacklistManagementScreen';
import PremiumScreen from '../screens/PremiumScreen';
import PillTabBar from '../components/PillTabBar';
import { useTheme } from '../contexts/ThemeContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// 로그인된 사용자를 위한 BottomTab 네비게이션
// 탭바는 화면 위에 떠 있는 알약 모양(PillTabBar) — 아이콘·알림 점도 그 안에서 그린다
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{ headerShown: false }}
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
        name="MapTab" 
        component={MapScreen}
        options={{ tabBarLabel: '지도' }}
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

const AppNavigator = ({ isDemoMode = false }) => {
  const { user, initializing, onboardingCompleted } = useAuth();
  const { colors } = useTheme();





  if (initializing) {

    return <SplashScreen />;
  }

  // 간단한 조건부 렌더링
  if (!user) {

    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.BACKGROUND },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />

        <Stack.Screen name="PhoneAuth" component={PhoneAuthScreen} />
        <Stack.Screen name="Verification" component={VerificationScreen} />
        <Stack.Screen name="AppIntro" component={AppIntroScreen} />
        <Stack.Screen name="AppGuide" component={AppGuideScreen} />
      </Stack.Navigator>
    );
  } else if (!onboardingCompleted) {
    // 사용자가 있지만 온보딩이 완료되지 않았으면 온보딩 화면

    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.BACKGROUND },
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="AppIntro" component={AppIntroScreen} />
      </Stack.Navigator>
    );
  } else {
    // 사용자가 있고 온보딩이 완료되었으면 메인 화면

    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.BACKGROUND },
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
        <Stack.Screen name="RunningTracker" component={RunningTrackerScreen} />
        <Stack.Screen name="RunningResult" component={RunningResultScreen} />
        <Stack.Screen name="RunningStats" component={RunningStatsScreen} />
        <Stack.Screen name="BlacklistManagement" component={BlacklistManagementScreen} />
        <Stack.Screen name="Premium" component={PremiumScreen} />
      </Stack.Navigator>
    );
  }
};

export default AppNavigator; 