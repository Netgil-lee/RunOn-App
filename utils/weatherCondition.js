/**
 * 날씨·대기질로 '오늘 달리기 어떤가'를 판정하는 유틸
 */

// 대기질 등급 — 뒤로 갈수록 나쁨
const AIR_LEVEL_ORDER = ['good', 'moderate', 'unhealthy', 'very_unhealthy', 'hazardous'];
const AIR_LEVEL_LABEL = {
  good: '좋음',
  moderate: '보통',
  unhealthy: '나쁨',
  very_unhealthy: '매우나쁨',
  hazardous: '위험',
};

/**
 * 기온·강수확률 기준 러닝 컨디션.
 * @returns {'PERFECT'|'GOOD'|'HOT'|'COLD'|'RAINY'}
 */
export const getWeatherCondition = (weather) => {
  if (!weather) return 'GOOD';

  // 강수확률 40% 이상이면 비 (최우선)
  if (weather.precipitationProbability >= 40) return 'RAINY';

  const temp = weather.temperature;
  if (temp >= 29) return 'HOT';
  if (temp >= 25) return 'GOOD';
  if (temp >= 15) return 'PERFECT';
  if (temp >= 1) return 'GOOD';
  return 'COLD';
};

/**
 * 미세먼지(PM10)와 초미세먼지(PM2.5) 중 더 나쁜 쪽 등급.
 * 데이터가 없으면 null.
 */
export const getDustLevel = (airQuality) => {
  if (!airQuality) return null;
  const levels = [airQuality.pm10Level, airQuality.pm25Level]
    .filter((level) => AIR_LEVEL_ORDER.includes(level));
  if (levels.length === 0) return null;
  return levels.sort((a, b) => AIR_LEVEL_ORDER.indexOf(b) - AIR_LEVEL_ORDER.indexOf(a))[0];
};

/** 미세먼지 칩: { label: '미세먼지 좋음', tone } */
export const getDustChip = (airQuality) => {
  const level = getDustLevel(airQuality);
  if (!level) return null;
  const tone = level === 'good' ? 'good' : level === 'moderate' ? 'neutral' : 'warn';
  return { label: `미세먼지 ${AIR_LEVEL_LABEL[level]}`, tone };
};

/**
 * 러닝 컨디션 칩: { label, tone }.
 * 미세먼지가 나쁨 이상이면 날씨가 좋아도 '달리기 좋은 날'로 안내하지 않는다.
 */
export const getRunConditionChip = (weather, airQuality) => {
  if (!weather) return null;

  const dustLevel = getDustLevel(airQuality);
  if (dustLevel && AIR_LEVEL_ORDER.indexOf(dustLevel) >= AIR_LEVEL_ORDER.indexOf('unhealthy')) {
    return { label: '마스크 챙기세요', tone: 'warn' };
  }

  switch (getWeatherCondition(weather)) {
    case 'PERFECT': return { label: '달리기 좋은 날', tone: 'good' };
    case 'HOT': return { label: '더위 주의', tone: 'warn' };
    case 'COLD': return { label: '추위 주의', tone: 'warn' };
    case 'RAINY': return { label: '비 소식 있어요', tone: 'warn' };
    default: return { label: '달리기 무난한 날', tone: 'neutral' };
  }
};
