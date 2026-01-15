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
    const firestoreResults = await firestoreService.searchEventsAndCafes(query);

    // Firestore 검색 결과가 있으면 Firestore 결과만 반환
    if (firestoreResults.length > 0) {
      return {
        firestoreResults: firestoreResults,
        kakaoResults: [],
        source: 'firestore'
      };
    }

    // 2단계: Firestore 검색 결과가 없으면 Kakao Places API 검색 자동 실행
    const kakaoResults = await searchPlace(query, { size: 5 });

    return {
      firestoreResults: [],
      kakaoResults: kakaoResults,
      source: 'kakao'
    };
  } catch (error) {
    console.error('통합 검색 실패:', error);
    return {
      firestoreResults: [],
      kakaoResults: [],
      source: 'none'
    };
  }
};
