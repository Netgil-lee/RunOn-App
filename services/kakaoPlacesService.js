import ENV from '../config/environment';

const KAKAO_REST_API_KEY = ENV.kakaoRestApiKey; // REST API 키
const PLACES_API_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';

/**
 * Kakao Places API를 사용한 장소 검색
 * @param {string} query - 검색어
 * @param {Object} options - 검색 옵션
 * @param {number} options.size - 검색 결과 개수 (기본값: 5)
 * @param {number} options.page - 페이지 번호 (기본값: 1)
 * @returns {Promise<Array>} 검색 결과 배열 (빈 배열일 수 있음)
 */
export const searchPlace = async (query, options = {}) => {
  try {
    const { size = 5, page = 1 } = options; // 기본값: 최대 5개 결과

    const response = await fetch(
      `${PLACES_API_URL}?query=${encodeURIComponent(query)}&size=${size}&page=${page}`,
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`
        }
      }
    );

    if (!response.ok) {
      console.error('Kakao Places API 응답 오류:', response.status, response.statusText);
      return []; // 에러 발생 시 빈 배열 반환
    }

    const data = await response.json();
    // API는 항상 배열을 반환 (검색 결과가 없으면 빈 배열 [])
    // 에러가 발생하지 않고 정상적으로 빈 배열을 반환하는 것이 정상 동작
    return data.documents || []; // 검색 결과 배열 (빈 배열일 수 있음)
  } catch (error) {
    console.error('장소 검색 실패:', error);
    return []; // 네트워크 에러 등 실제 에러 발생 시에도 빈 배열 반환
  }
};
