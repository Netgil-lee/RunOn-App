// 홈 화면 광고 팝업(파트너 배너) 데이터/노출 제어 서비스
//
// - 광고 이미지는 관리자 대시보드(runon-admin-dashboard)에서 Firestore `adBanners`
//   컬렉션에 등록됨. 앱은 active === true 인 배너 중 가장 최근 것을 1개 노출.
// - 노출 규칙:
//   1) 앱 실행(콜드 스타트)당 1회만 노출 → 모듈 스코프 플래그로 제어
//   2) '오늘 하루 보지 않기'를 누른 날에는 노출 안 함 → AsyncStorage에 날짜 저장
//
// iOS 저장소와 동일한 Firebase 프로젝트(runon-production-app)를 공유하므로
// 컬렉션/필드 스키마는 iOS와 반드시 일치해야 한다.

import { collection, query, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { firestore } from '../config/firebase';

const AD_POPUP_HIDDEN_KEY = '@runon:ad_popup_hidden_date';

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

// 활성 광고 배너 1개 조회 (가장 최근 등록된 것)
export const fetchActiveAdBanner = async () => {
  try {
    // where 단일 필터만 사용 → 복합 색인 불필요. 정렬은 클라이언트에서 처리.
    const q = query(collection(firestore, 'adBanners'), where('active', '==', true));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const banners = snap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((b) => b.imageUrl); // 이미지 URL 없는 문서는 제외

    if (banners.length === 0) return null;

    banners.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    return banners[0];
  } catch (error) {
    console.warn('광고 배너 조회 실패:', error);
    return null;
  }
};

export default {
  fetchActiveAdBanner,
  hasShownAdThisSession,
  markAdShownThisSession,
  isAdHiddenToday,
  suppressAdForToday,
};
