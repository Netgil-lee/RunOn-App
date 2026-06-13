import firestoreService from './firestoreService';

export const unifiedSearch = async (query) => {
  try {
    if (!query || query.trim().length === 0) {
      return { firestoreResults: [], kakaoResults: [], source: 'none' };
    }

    let firestoreResults = [];
    try {
      firestoreResults = await firestoreService.searchEventsAndCafes(query);
    } catch (error) {
      console.warn('⚠️ Firestore 검색 실패:', error.message);
    }

    return {
      firestoreResults,
      kakaoResults: [],
      source: firestoreResults.length > 0 ? 'firestore' : 'none',
    };
  } catch (error) {
    console.error('통합 검색 실패:', error);
    return { firestoreResults: [], kakaoResults: [], source: 'none' };
  }
};
