// 홈 화면 파트너 배너(광고 팝업 + 홈 상단 배너) 데이터/노출 제어 서비스
//
// - 광고 이미지는 관리자 대시보드(runon-admin-dashboard)에서 Firestore `adBanners`
//   컬렉션에 등록됨. 앱은 active === true 인 배너를 order 순으로 받아 자동 전환(캐러셀)으로 노출한다.
// - 배너가 어디에 뜨는지는 문서의 placement 필드로 정한다.
//     'popup' : 홈 진입 시 뜨는 팝업 (최대 3개)
//     'home'  : 홈 상단 배너 (최대 5개)
//     'both'  : 두 곳 모두
//   placement 필드가 없는 예전 문서는 'popup'으로 취급한다.
// - 전환 주기는 Firestore `appConfig/adBanner` 문서의 rotationIntervalMs 값을 따른다.
//   (대시보드에서 조정 → 앱 재배포 없이 반영)
// - 노출 규칙:
//   1) 앱 실행(콜드 스타트)당 1회만 노출 → 모듈 스코프 플래그로 제어
//   2) '오늘 하루 보지 않기'를 누른 날에는 노출 안 함 → AsyncStorage에 날짜 저장
//
// iOS 저장소와 동일한 Firebase 프로젝트(runon-production-app)를 공유하므로
// 컬렉션/필드 스키마는 iOS와 반드시 일치해야 한다.

import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';

import { firestore } from '../config/firebase';

const AD_POPUP_HIDDEN_KEY = '@runon:ad_popup_hidden_date';

// 대시보드(MAX_ACTIVE_AD_BANNERS)와 맞춘 상한. 서버가 이미 제한하지만
// 잘못된 데이터가 들어와도 앱이 4개 이상 돌리지 않도록 한 번 더 막는다.
export const MAX_AD_BANNERS = 3;
// 홈 상단 배너 상한
export const MAX_HOME_BANNERS = 5;

export const PLACEMENT_POPUP = 'popup';
export const PLACEMENT_HOME = 'home';
export const PLACEMENT_BOTH = 'both';

// 배너가 해당 위치(placement)에 노출 대상인지. 필드 없는 문서는 팝업 전용.
export const isBannerForPlacement = (banner, placement) => {
  const value = banner?.placement || PLACEMENT_POPUP;
  return value === PLACEMENT_BOTH || value === placement;
};
// appConfig 문서를 못 읽었을 때 쓰는 기본 전환 주기
export const DEFAULT_ROTATION_INTERVAL_MS = 2000;

// 콜드 스타트마다 초기화되는 모듈 스코프 플래그 → "앱 실행당 1회" 보장.
// (탭 이동으로 홈이 다시 활성화돼도 다시 뜨지 않게 함)
let shownThisSession = false;

export const hasShownAdThisSession = () => shownThisSession;
export const markAdShownThisSession = () => {
  shownThisSession = true;
};

// 로컬 기준 YYYY-MM-DD
const todayKey = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

// '오늘 하루 보지 않기' 저장 (오늘 날짜 기록)
export const suppressAdForToday = async () => {
  try {
    await AsyncStorage.setItem(AD_POPUP_HIDDEN_KEY, todayKey());
  } catch (error) {
    console.warn('광고 팝업 숨김 저장 실패:', error);
  }
};

// 오늘 '보지 않기'가 눌렸는지 여부
export const isAdHiddenToday = async () => {
  try {
    const saved = await AsyncStorage.getItem(AD_POPUP_HIDDEN_KEY);
    return saved === todayKey();
  } catch (error) {
    return false;
  }
};

// Firestore Timestamp / seconds / number / 문자열 대응 → ms
const toMillis = (ts) => {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  if (typeof ts === 'number') return ts;
  const parsed = Date.parse(ts);
  return Number.isNaN(parsed) ? 0 : parsed;
};

// 노출 순서 비교: order(오름차순)가 우선, order가 없는 옛 배너는 뒤로 밀고 최신순.
const compareBannerOrder = (a, b) => {
  const ao = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
  const bo = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return toMillis(b.createdAt) - toMillis(a.createdAt);
};

// 활성 광고 배너 조회 (order 순). 위치별로 먼저 거른 뒤 그 위치의 상한만큼 자른다.
// @param {'popup'|'home'} placement - 기본값은 팝업
export const fetchActiveAdBanners = async (placement = PLACEMENT_POPUP) => {
  try {
    // where 단일 필터만 사용 → 복합 색인 불필요. 정렬은 클라이언트에서 처리.
    const q = query(collection(firestore, 'adBanners'), where('active', '==', true));
    const snap = await getDocs(q);
    if (snap.empty) return [];

    return snap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((b) => b.imageUrl) // 이미지 URL 없는 문서는 제외
      .filter((b) => isBannerForPlacement(b, placement))
      .sort(compareBannerOrder)
      .slice(0, placement === PLACEMENT_HOME ? MAX_HOME_BANNERS : MAX_AD_BANNERS);
  } catch (error) {
    console.warn('광고 배너 조회 실패:', error);
    return [];
  }
};

// 배너 자동 전환 주기 조회. 실패하거나 값이 이상하면 기본값을 쓴다.
export const fetchAdRotationIntervalMs = async () => {
  try {
    const snap = await getDoc(doc(firestore, 'appConfig', 'adBanner'));
    const value = snap.exists() ? snap.data().rotationIntervalMs : null;
    if (typeof value === 'number' && value > 0) return value;
    return DEFAULT_ROTATION_INTERVAL_MS;
  } catch (error) {
    console.warn('광고 배너 전환 주기 조회 실패:', error);
    return DEFAULT_ROTATION_INTERVAL_MS;
  }
};

// 배너의 링크(linkUrl)를 연다. 링크가 없거나 열 수 없으면 아무 일도 하지 않는다.
// Android 11+ 에서는 canOpenURL이 매니페스트 <queries>에 없는 스킴에 false를 돌려주므로
// 미리 묻지 않고 바로 열어 본다 (열 앱이 없으면 예외 → 아래에서 무시).
export const openAdBannerLink = async (banner) => {
  const url = banner?.linkUrl;
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.warn('광고 링크 열기 실패:', error);
  }
};

export default {
  fetchActiveAdBanners,
  openAdBannerLink,
  fetchAdRotationIntervalMs,
  hasShownAdThisSession,
  markAdShownThisSession,
  isAdHiddenToday,
  suppressAdForToday,
};
