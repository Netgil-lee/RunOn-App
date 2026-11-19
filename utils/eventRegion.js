/**
 * 모임 지역 분류 (홈 '내 주변 모임' 칩 필터용)
 *
 * 모임 문서에는 주소·행정구역 필드가 없고 장소명(location)과 좌표(customMarkerCoords)만 있다.
 * - 한강: 장소명에 '한강'이 들어가는 모임
 * - 서울 / 경기: 좌표가 대략적인 경계 안에 들어오는지로 판정
 *
 * 경계는 손으로 잡은 근사값이라 시 경계 바로 근처 모임은 반대쪽으로 분류될 수 있다.
 */

export const REGION_ALL = 'all';
export const REGION_HANGANG = 'hangang';
export const REGION_SEOUL = 'seoul';
export const REGION_GYEONGGI = 'gyeonggi';

export const REGION_CHIPS = [
  { key: REGION_ALL, label: '전체' },
  { key: REGION_HANGANG, label: '한강' },
  { key: REGION_SEOUL, label: '서울' },
  { key: REGION_GYEONGGI, label: '경기' },
];

// 서울시 경계 근사 다각형 [위도, 경도] — 북쪽(도봉)에서 시계 방향
const SEOUL_POLYGON = [
  [37.701, 127.015], [37.690, 127.095], [37.640, 127.112], [37.580, 127.115],
  [37.555, 127.180], [37.515, 127.160], [37.475, 127.130], [37.455, 127.095],
  [37.428, 127.050], [37.440, 126.990], [37.455, 126.930], [37.435, 126.900],
  [37.480, 126.830], [37.545, 126.765], [37.600, 126.800], [37.590, 126.880],
  [37.645, 126.905], [37.660, 126.950], [37.690, 126.985],
];

// 경기도를 감싸는 사각 범위와, 그 안에서 빼야 하는 인천 쪽 범위
const GYEONGGI_BOX = { minLat: 36.89, maxLat: 38.30, minLng: 126.37, maxLng: 127.86 };
const INCHEON_BOX = { minLat: 37.33, maxLat: 37.62, minLng: 126.37, maxLng: 126.78 };

const inBox = (lat, lng, box) =>
  lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;

// 점이 다각형 안에 있는지 (ray casting)
const inPolygon = (lat, lng, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    const crosses = (lngI > lng) !== (lngJ > lng)
      && lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (crosses) inside = !inside;
  }
  return inside;
};

/** 모임 좌표를 { latitude, longitude }로 돌려준다. 없으면 null */
export const getEventCoords = (event) => {
  const coords = event?.customMarkerCoords;
  if (!coords) return null;
  const latitude = Number(coords.latitude ?? coords.lat);
  const longitude = Number(coords.longitude ?? coords.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

/** 좌표가 속한 광역 지역: 'seoul' | 'gyeonggi' | null */
export const getProvince = (coords) => {
  if (!coords) return null;
  const { latitude, longitude } = coords;
  if (inPolygon(latitude, longitude, SEOUL_POLYGON)) return REGION_SEOUL;
  if (inBox(latitude, longitude, GYEONGGI_BOX) && !inBox(latitude, longitude, INCHEON_BOX)) {
    return REGION_GYEONGGI;
  }
  return null;
};

/** 모임이 칩(region)에 해당하는지 */
export const matchesRegion = (event, region) => {
  if (region === REGION_ALL) return true;
  if (region === REGION_HANGANG) {
    return `${event?.location || ''} ${event?.customLocation || ''}`.includes('한강');
  }
  return getProvince(getEventCoords(event)) === region;
};

/** 두 좌표 사이 거리(m) — Haversine */
export const getDistanceMeters = (a, b) => {
  if (!a || !b) return Infinity;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};
