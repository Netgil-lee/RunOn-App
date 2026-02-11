import { searchPlace } from './kakaoPlacesService';
import firestoreService from './firestoreService';

/**
 * 통합 검색 서비스
 * Firestore 우선 검색 방식: Firestore 검색 먼저 실행, 결과가 없으면 Kakao Places API 검색
 * @param {string} query - 검색어
 * @returns {Promise<Object>} 검색 결과 객체
 * @property {Array} firestoreResults - Firestore 검색 결과 (모임/카페)
 * @property {Array} kakaoResults - Kakao Places API 검색 결과 (장소)
 * @property {string} source - 검색 소스 ('firestore' | 'kakao' | 'none')
 */
export const unifiedSearch = async (query) => {
  try {
    if (!query || query.trim().length === 0) {
      return {
        firestoreResults: [],
        kakaoResults: [],
        source: 'none'
      };
    }

    // 1단계: Firestore 검색 먼저 실행
    let firestoreResults = [];
    try {
      firestoreResults = await firestoreService.searchEventsAndCafes(query);
    } catch (error) {
      // Firestore 검색 실패 시에도 계속 진행
      console.warn('⚠️ Firestore 검색 실패, Kakao Places API 검색으로 진행:', error.message);
    }

    // Firestore 검색 결과가 있으면 Firestore 결과만 반환
    if (firestoreResults.length > 0) {
      return {
        firestoreResults: firestoreResults,
        kakaoResults: [],
        source: 'firestore'
      };
    }

    // 2단계: Firestore 검색 결과가 없으면 Kakao Places API 검색 자동 실행
    let kakaoResults = [];
    try {
      kakaoResults = await searchPlace(query, { size: 5 });
    } catch (error) {
      // Kakao Places API 검색 실패 시에도 에러를 던지지 않고 빈 배열 반환
      console.warn('⚠️ Kakao Places API 검색 실패:', error.message);
    }

    return {
      firestoreResults: [],
      kakaoResults: kakaoResults,
      source: kakaoResults.length > 0 ? 'kakao' : 'none'
    };
  } catch (error) {
    // 예상치 못한 오류 발생 시에도 빈 결과 반환
    console.error('통합 검색 실패:', error);
    return {
      firestoreResults: [],
      kakaoResults: [],
      source: 'none'
    };
  }
};
