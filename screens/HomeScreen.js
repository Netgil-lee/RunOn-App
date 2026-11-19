import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getTabBarSpace } from '../constants/layout';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import { useCommunity } from '../contexts/CommunityContext';
import { useTheme } from '../contexts/ThemeContext';
import useHomeWeather from '../hooks/useHomeWeather';
import useHomeSummary from '../hooks/useHomeSummary';
import useHomeCafes from '../hooks/useHomeCafes';
import HomeTopBar from '../components/home/HomeTopBar';
import HomeShortcuts from '../components/home/HomeShortcuts';
import UpcomingEventStrip from '../components/home/UpcomingEventStrip';
import WeatherDetailSheet from '../components/home/WeatherDetailSheet';
import HomeHeroBanner from '../components/home/HomeHeroBanner';
import HomeStatTiles from '../components/home/HomeStatTiles';
import NearbyEventsSection from '../components/home/NearbyEventsSection';
import CafeFoodSection from '../components/home/CafeFoodSection';
import AdPopupModal from '../components/AdPopupModal';
import {
  fetchActiveAdBanners,
  fetchAdRotationIntervalMs,
  hasShownAdThisSession,
  markAdShownThisSession,
  isAdHiddenToday,
  suppressAdForToday,
  PLACEMENT_HOME,
} from '../services/adBannerService';

// 같은 세션에서 홈 진입 시각을 다시 기록하기까지의 최소 간격
const HOME_ACCESS_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

/**
 * 홈 화면
 *
 * 위→아래: 상단바(지역·검색·알림·날씨 칩) → 배너 → 바로가기 5개 → 다가오는 내 모임
 *          → 2칸 타일(주간 러닝 / 모임 참여 목표) → 내 주변 모임 → 러닝카페·푸드
 * 스펙: design/home-redesign/README.md, 구현 결정: IMPLEMENTATION_PLAN.md
 */
const HomeScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const { user } = useAuth() || {};
  const { hasMeetingNotification } = useEvents() || {};
  const { hasCommunityNotification } = useCommunity() || {};
  const hasUnread = !!(hasMeetingNotification || hasCommunityNotification);

  const weatherState = useHomeWeather();
  const refreshWeather = weatherState.refresh;

  const summary = useHomeSummary(user);
  const refreshSummary = summary.refresh;
  const cafes = useHomeCafes(user);
  const refreshCafes = cafes.refresh;
  // 러닝카페 바로가기 'N' 배지: 최근 한 달 안에 새로 입점한 카페가 있을 때
  const hasNewCafe = cafes.newPlaces.some((place) => place.type === 'cafe');

  // 홈 상단 배너 (대시보드에서 '홈 배너'로 등록한 것)
  const [heroBanners, setHeroBanners] = useState([]);
  const [heroRotationMs, setHeroRotationMs] = useState(null);

  const [refreshing, setRefreshing] = useState(false);
  const [weatherSheetVisible, setWeatherSheetVisible] = useState(false);

  // 광고 팝업 상태 (활성 배너 + 자동 전환 주기)
  const [adBanners, setAdBanners] = useState([]);
  const [adRotationMs, setAdRotationMs] = useState(null);
  const [adVisible, setAdVisible] = useState(false);

  const lastHomeAccessUpdateRef = useRef(null);

  // 관리자 대시보드 DAU/WAU/MAU 집계용 — 홈 탭 진입 시각 기록
  const updateLastHomeAccess = useCallback(async () => {
    if (!user) return;

    const now = Date.now();
    if (
      lastHomeAccessUpdateRef.current
      && now - lastHomeAccessUpdateRef.current < HOME_ACCESS_UPDATE_INTERVAL_MS
    ) {
      return;
    }

    try {
      await updateDoc(doc(getFirestore(), 'users', user.uid), {
        lastHomeAccess: serverTimestamp(),
      });
      lastHomeAccessUpdateRef.current = now;
    } catch (error) {
      console.error('❌ lastHomeAccess 업데이트 실패:', error);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      updateLastHomeAccess();
    }, [updateLastHomeAccess])
  );

  // 홈 진입 시 광고 팝업 노출 판단
  // 순서: 이번 실행에 아직 안 띄웠나? → 오늘 '보지 않기' 안 눌렀나? → 활성 배너 있나?
  useEffect(() => {
    let cancelled = false;

    const maybeShowAd = async () => {
      if (!user) return;
      if (hasShownAdThisSession()) return;
      if (await isAdHiddenToday()) return;

      const [banners, rotationMs] = await Promise.all([
        fetchActiveAdBanners(),
        fetchAdRotationIntervalMs(),
      ]);
      if (cancelled || banners.length === 0) return;

      markAdShownThisSession();
      setAdBanners(banners);
      setAdRotationMs(rotationMs);
      setAdVisible(true);
    };

    maybeShowAd();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // 홈 상단 배너 불러오기
  const loadHeroBanners = useCallback(async () => {
    const [banners, rotationMs] = await Promise.all([
      fetchActiveAdBanners(PLACEMENT_HOME),
      fetchAdRotationIntervalMs(),
    ]);
    setHeroBanners(banners);
    setHeroRotationMs(rotationMs);
  }, []);

  useEffect(() => {
    if (user) loadHeroBanners();
  }, [user, loadHeroBanners]);

  // 광고 팝업 닫기 (suppressToday: '오늘 하루 보지 않기' 체크 여부)
  const handleCloseAd = useCallback(async (suppressToday) => {
    setAdVisible(false);
    if (suppressToday) {
      await suppressAdForToday();
    }
  }, []);

  // 당겨서 새로고침 — 모임 데이터는 EventContext가 실시간으로 갱신하므로 나머지만 다시 불러온다
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshWeather(), refreshSummary(), refreshCafes(), loadHeroBanners()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshWeather, refreshSummary, refreshCafes, loadHeroBanners]);

  return (
    <View style={styles.container}>
      <HomeTopBar
        weatherState={weatherState}
        hasUnread={hasUnread}
        onLocationPress={refreshWeather}
        onSearchPress={() => navigation.navigate('Search')}
        onNotificationPress={() => navigation.navigate('Notification')}
        onWeatherPress={() => setWeatherSheetVisible(true)}
      />

      {/* 데모 모드 인디케이터 */}
      {user?.isDemo && (
        <View style={[styles.demoIndicator, { top: insets.top + 6 }]}>
          <Text style={styles.demoText}>🎭 데모 모드</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.PRIMARY]}
            tintColor={colors.PRIMARY}
          />
        }
      >
        <HomeHeroBanner banners={heroBanners} rotationIntervalMs={heroRotationMs} />

        <HomeShortcuts navigation={navigation} showCafeBadge={hasNewCafe} />

        <UpcomingEventStrip navigation={navigation} />

        <HomeStatTiles
          summary={summary}
          onPressRunning={() => navigation.navigate('RunningStats')}
          onPressMeeting={() => navigation.navigate('ScheduleTab', { showMyJoined: true })}
        />

        <NearbyEventsSection navigation={navigation} coords={weatherState.coords} />

        <CafeFoodSection
          navigation={navigation}
          newPlaces={cafes.newPlaces}
          frequentPlaces={cafes.frequentPlaces}
          loading={cafes.loading}
        />

        {/* 떠 있는 탭바에 마지막 콘텐츠가 가리지 않도록 띄운다 */}
        <View style={{ height: getTabBarSpace(insets) + 16 }} />
      </ScrollView>

      <WeatherDetailSheet
        visible={weatherSheetVisible}
        onClose={() => setWeatherSheetVisible(false)}
        weatherState={weatherState}
      />

      {/* 파트너 광고 팝업 */}
      <AdPopupModal
        visible={adVisible}
        banners={adBanners}
        rotationIntervalMs={adRotationMs}
        onClose={handleCloseAd}
      />
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  demoIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.PINK,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 1000,
  },
  demoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
