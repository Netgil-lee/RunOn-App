/**
 * Kakao Local REST API 기반 장소/주소 검색 서비스
 *
 * 모임 생성 2단계에서 도로명 주소(또는 장소명)를 입력하면
 * 좌표를 찾아 지도를 그 위치로 이동시키는 데 사용한다.
 *
 * - 주소 검색: /v2/local/search/address.json  (도로명·지번 주소)
 * - 키워드 검색: /v2/local/search/keyword.json (장소명 — "뚝섬한강공원" 등)
 *
 * 주소 검색을 먼저 시도하고, 결과가 없으면 키워드 검색으로 폴백한다.
 */

import ENV from '../config/environment';

const KAKAO_BASE_URL = 'https://dapi.kakao.com/v2/local/search';
const DEFAULT_SIZE = 5;
const REQUEST_TIMEOUT_MS = 8000;

const buildHeaders = () => ({
  Authorization: `KakaoAK ${ENV.kakaoRestApiKey}`,
});

/**
 * 타임아웃이 적용된 fetch (네트워크가 느릴 때 검색창이 무한 로딩되는 것 방지)
 */
const fetchWithTimeout = async (url) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Kakao API 응답 오류 (${response.status})`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * 주소 검색 결과 → 공통 포맷
 * 도로명 주소가 있으면 도로명을 우선 표기하고, 없으면 지번 주소를 쓴다.
 */
const normalizeAddressDocument = (doc, index) => {
  const road = doc.road_address;
  const jibun = doc.address;
  const lat = parseFloat(doc.y);
  const lng = parseFloat(doc.x);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: `address-${index}-${doc.address_name}`,
    // 건물명이 있으면 그게 사용자에게 가장 알아보기 쉬운 이름
    name: road?.building_name || road?.address_name || doc.address_name,
    roadAddress: road?.address_name || '',
    jibunAddress: jibun?.address_name || '',
    lat,
    lng,
    source: 'address',
  };
};

/**
 * 키워드(장소명) 검색 결과 → 공통 포맷
 */
const normalizeKeywordDocument = (doc, index) => {
  const lat = parseFloat(doc.y);
  const lng = parseFloat(doc.x);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: doc.id || `keyword-${index}-${doc.place_name}`,
    name: doc.place_name,
    roadAddress: doc.road_address_name || '',
    jibunAddress: doc.address_name || '',
    lat,
    lng,
    source: 'keyword',
  };
};

/**
 * 도로명/지번 주소 검색
 */
export const searchAddress = async (query, size = DEFAULT_SIZE) => {
  const url = `${KAKAO_BASE_URL}/address.json?query=${encodeURIComponent(query)}&size=${size}`;
  const data = await fetchWithTimeout(url);
  return (data?.documents || [])
    .map(normalizeAddressDocument)
    .filter(Boolean);
};

/**
 * 장소명 키워드 검색
 * @param {{lat:number, lng:number}} [center] 있으면 해당 좌표 주변 결과에 가중치
 */
export const searchKeyword = async (query, size = DEFAULT_SIZE, center = null) => {
  let url = `${KAKAO_BASE_URL}/keyword.json?query=${encodeURIComponent(query)}&size=${size}`;

  // 현재 지도 중심을 기준점으로 넘기면 "스타벅스" 같은 흔한 이름이 근처 지점부터 나온다.
  // sort=distance는 쓰지 않는다 — "뚝섬한강공원" 검색에 공원 대신 그 안 화장실이 먼저 나온다.
  if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
    url += `&x=${center.lng}&y=${center.lat}`;
  }

  const data = await fetchWithTimeout(url);
  return (data?.documents || [])
    .map(normalizeKeywordDocument)
    .filter(Boolean);
};

/**
 * 통합 검색 — 주소 우선, 없으면 장소명으로 폴백
 *
 * @returns {Promise<Array<{id, name, roadAddress, jibunAddress, lat, lng, source}>>}
 * @throws {Error} 네트워크/API 오류 시 (호출부에서 안내 문구 처리)
 */
export const searchPlaces = async (query, options = {}) => {
  const trimmed = (query || '').trim();
  if (!trimmed) return [];

  const { size = DEFAULT_SIZE, center = null } = options;

  const addressResults = await searchAddress(trimmed, size);
  if (addressResults.length > 0) {
    return addressResults;
  }

  return await searchKeyword(trimmed, size, center);
};

export default {
  searchAddress,
  searchKeyword,
  searchPlaces,
};
