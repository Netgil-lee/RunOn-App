import { getWeatherCondition, getDustLevel, getDustChip, getRunConditionChip } from '../utils/weatherCondition';

describe('getWeatherCondition', () => {
  it('강수확률 40% 이상이면 기온과 상관없이 RAINY', () => {
    expect(getWeatherCondition({ temperature: 20, precipitationProbability: 40 })).toBe('RAINY');
  });

  it('기온 구간별 판정', () => {
    const at = (temperature) => getWeatherCondition({ temperature, precipitationProbability: 0 });
    expect(at(30)).toBe('HOT');
    expect(at(26)).toBe('GOOD');
    expect(at(18)).toBe('PERFECT');
    expect(at(5)).toBe('GOOD');
    expect(at(-3)).toBe('COLD');
  });
});

describe('미세먼지', () => {
  it('PM10과 PM2.5 중 더 나쁜 등급을 쓴다', () => {
    expect(getDustLevel({ pm10Level: 'good', pm25Level: 'unhealthy' })).toBe('unhealthy');
    expect(getDustChip({ pm10Level: 'good', pm25Level: 'good' })).toEqual({ label: '미세먼지 좋음', tone: 'good' });
  });

  it('데이터가 없으면 칩을 만들지 않는다', () => {
    expect(getDustChip(null)).toBeNull();
    expect(getDustChip({})).toBeNull();
  });
});

describe('getRunConditionChip', () => {
  const niceWeather = { temperature: 18, precipitationProbability: 0 };

  it('날씨가 좋고 공기도 좋으면 달리기 좋은 날', () => {
    expect(getRunConditionChip(niceWeather, { pm10Level: 'good', pm25Level: 'good' }).label).toBe('달리기 좋은 날');
  });

  it('날씨가 좋아도 미세먼지가 나쁨 이상이면 마스크 안내로 바뀐다', () => {
    expect(getRunConditionChip(niceWeather, { pm10Level: 'unhealthy', pm25Level: 'good' }))
      .toEqual({ label: '마스크 챙기세요', tone: 'warn' });
  });

  it('대기질 데이터가 없으면 날씨만으로 판정한다', () => {
    expect(getRunConditionChip(niceWeather, null).label).toBe('달리기 좋은 날');
  });

  it('날씨 데이터가 없으면 칩을 만들지 않는다', () => {
    expect(getRunConditionChip(null, null)).toBeNull();
  });
});
