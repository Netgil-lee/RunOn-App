import {
  getEventCoords, getProvince, matchesRegion, getDistanceMeters,
  REGION_ALL, REGION_HANGANG, REGION_SEOUL, REGION_GYEONGGI,
} from '../utils/eventRegion';

const at = (latitude, longitude) => ({ latitude, longitude });

describe('getProvince', () => {
  it('서울 안쪽 좌표', () => {
    expect(getProvince(at(37.5116, 126.9960))).toBe(REGION_SEOUL); // 반포한강공원
    expect(getProvince(at(37.5206, 127.1214))).toBe(REGION_SEOUL); // 올림픽공원
    expect(getProvince(at(37.5665, 126.9780))).toBe(REGION_SEOUL); // 시청
  });

  it('경기 좌표', () => {
    expect(getProvince(at(37.2636, 127.0286))).toBe(REGION_GYEONGGI); // 수원
    expect(getProvince(at(37.6584, 126.7700))).toBe(REGION_GYEONGGI); // 일산
    expect(getProvince(at(37.3595, 127.1052))).toBe(REGION_GYEONGGI); // 분당
  });

  it('인천·그 밖 지역은 어느 쪽도 아니다', () => {
    expect(getProvince(at(37.4563, 126.7052))).toBeNull(); // 인천
    expect(getProvince(at(35.1796, 129.0756))).toBeNull(); // 부산
    expect(getProvince(null)).toBeNull();
  });
});

describe('matchesRegion', () => {
  const banpo = { location: '반포한강공원', customMarkerCoords: at(37.5116, 126.9960) };
  const suwon = { location: '광교호수공원', customMarkerCoords: { lat: 37.2836, lng: 127.0660 } };
  const noCoords = { location: '어딘가' };

  it('전체는 모두 통과', () => {
    expect([banpo, suwon, noCoords].every((e) => matchesRegion(e, REGION_ALL))).toBe(true);
  });

  it('한강은 장소명으로 판정', () => {
    expect(matchesRegion(banpo, REGION_HANGANG)).toBe(true);
    expect(matchesRegion(suwon, REGION_HANGANG)).toBe(false);
  });

  it('서울·경기는 좌표로 판정하고, 좌표가 없으면 제외', () => {
    expect(matchesRegion(banpo, REGION_SEOUL)).toBe(true);
    expect(matchesRegion(suwon, REGION_GYEONGGI)).toBe(true);
    expect(matchesRegion(suwon, REGION_SEOUL)).toBe(false);
    expect(matchesRegion(noCoords, REGION_SEOUL)).toBe(false);
  });
});

describe('좌표 유틸', () => {
  it('lat/lng 표기도 읽는다', () => {
    expect(getEventCoords({ customMarkerCoords: { lat: 37.5, lng: 127 } })).toEqual(at(37.5, 127));
    expect(getEventCoords({})).toBeNull();
  });

  it('거리 계산 (반포~잠실 한강공원 약 7.6km)', () => {
    const meters = getDistanceMeters(at(37.5116, 126.9960), at(37.5180, 127.0820));
    expect(meters).toBeGreaterThan(7000);
    expect(meters).toBeLessThan(8500);
    expect(getDistanceMeters(null, at(1, 1))).toBe(Infinity);
  });
});
