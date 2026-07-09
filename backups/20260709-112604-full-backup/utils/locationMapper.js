// 한강공원 및 강변 위치를 영어로 매핑하는 시스템

const LOCATION_MAPPING = {
  // 한강공원 (10개)
  '광나루한강공원': 'Gwangnaru Hanriver',
  '난지한강공원': 'Nanji Hanriver',
  '뚝섬한강공원': 'Ttukseom Hanriver',
  '망원한강공원': 'Mangwon Hanriver',
  '반포한강공원': 'Banpo Hanriver',
  '이촌한강공원': 'Ichon Hanriver',
  '잠원한강공원': 'Jamwon Hanriver',
  '잠실한강공원': 'Jamsil Hanriver',
  '양화한강공원': 'Yanghwa Hanriver',
  '여의도한강공원': 'Yeoyuido Hanriver',
  
  // 강변 (11개)
  '당현천': 'Danghyeon River',
  '도림천': 'Dorim River',
  '불광천': 'Bulgwang River',
  '성내천': 'Seongnae River',
  '안양천': 'Anyang River',
  '양재천': 'Yangjae River',
  '정릉천': 'Jeongneung River',
  '중랑천': 'Jungnang River',
  '청계천': 'Cheonggye River',
  '탄천': 'Tan River',
  '홍제천': 'Hongje River',
  
  // 기본값
  '한강': 'Hanriver',
  '강변': 'Riverside'
};

/**
 * 한국어 위치명을 영어로 변환
 * @param {string} koreanLocation - 한국어 위치명
 * @returns {string} 영어 위치명
 */
export const getEnglishLocation = (koreanLocation) => {
  if (!koreanLocation) return 'Hanriver';
  
  // 정확한 매칭
  if (LOCATION_MAPPING[koreanLocation]) {
    return LOCATION_MAPPING[koreanLocation];
  }
  
  // 부분 매칭 (예: "반포한강공원" → "Banpo Hanriver")
  for (const [key, value] of Object.entries(LOCATION_MAPPING)) {
    if (koreanLocation.includes(key)) {
      return value;
    }
  }
  
  // 기본값
  return 'Hanriver';
};

/**
 * 영어 위치명을 한국어로 변환
 * @param {string} englishLocation - 영어 위치명
 * @returns {string} 한국어 위치명
 */
export const getKoreanLocation = (englishLocation) => {
  if (!englishLocation) return '한강';
  
  for (const [key, value] of Object.entries(LOCATION_MAPPING)) {
    if (value === englishLocation) {
      return key;
    }
  }
  
  return '한강';
};

/**
 * 모든 위치 매핑 정보 반환
 * @returns {Object} 위치 매핑 객체
 */
export const getAllLocationMappings = () => {
  return { ...LOCATION_MAPPING };
};

/**
 * 한강공원 목록만 반환
 * @returns {Array} 한강공원 목록
 */
export const getHanRiverParks = () => {
  return [
    '광나루한강공원', '난지한강공원', '뚝섬한강공원', '망원한강공원',
    '반포한강공원', '이촌한강공원', '잠원한강공원', '잠실한강공원',
    '양화한강공원', '여의도한강공원'
  ];
};

/**
 * 강변 목록만 반환
 * @returns {Array} 강변 목록
 */
export const getRiversides = () => {
  return [
    '당현천', '도림천', '불광천', '성내천', '안양천',
    '양재천', '정릉천', '중랑천', '청계천', '탄천', '홍제천'
  ];
};

