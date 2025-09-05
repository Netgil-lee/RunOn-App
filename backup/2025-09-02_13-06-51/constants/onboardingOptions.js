// 온보딩 관련 모든 옵션 데이터와 유틸리티 함수들

// 한강공원 데이터
export const HAN_RIVER_PARKS = [
  { id: 'gwangnaru', name: '광나루한강공원', distance: '2.7km' },
  { id: 'nanji', name: '난지한강공원', distance: '4.2km' },
  { id: 'ttukseom', name: '뚝섬한강공원', distance: '4.8km', popular: true },
  { id: 'mangwon', name: '망원한강공원', distance: '5.4km' },
  { id: 'banpo', name: '반포한강공원', distance: '8.5km', popular: true },
  { id: 'ichon', name: '이촌한강공원', distance: '4.9km' },
  { id: 'jamwon', name: '잠원한강공원', distance: '3.8km' },
  { id: 'jamsil', name: '잠실한강공원', distance: '6.2km', popular: true },
  { id: 'yanghwa', name: '양화한강공원', distance: '2.1km' },
  { id: 'yeouido', name: '여의도한강공원', distance: '9.8km', popular: true },
];

// 강변 데이터
export const RIVER_SIDES = [
  { id: 'danghyeon', name: '당현천', description: '노원구 대표 생태하천' },
  { id: 'dorim', name: '도림천', description: '영등포구 도시하천' },
  { id: 'bulgwang', name: '불광천', description: '은평구 대표 하천' },
  { id: 'seongnae', name: '성내천', description: '강동구 자연하천' },
  { id: 'anyang', name: '안양천', description: '서남부 주요 하천' },
  { id: 'yangjae', name: '양재천', description: '강남구 생태하천' },
  { id: 'jungnang', name: '중랑천', description: '서울 동북부 주요 하천' },
  { id: 'jeongneung', name: '정릉천', description: '북한산 기슭 자연천' },
  { id: 'cheonggyecheon', name: '청계천', description: '도심 속 생태하천' },
  { id: 'tan', name: '탄천', description: '서울 구간 생태복원 하천' },
  { id: 'hongje', name: '홍제천', description: '서대문구 도심하천' },
];

// 러닝 레벨 옵션
export const RUNNING_LEVELS = [
  {
    id: 'beginner',
    title: '초보',
    pace: '7분 이상 페이스',
    description: '러닝을 시작한 지 얼마 안 되었거나\n천천히 즐기며 달리는 것을 좋아해요',
  },
  {
    id: 'intermediate',
    title: '중급',
    pace: '5-7분 페이스',
    description: '어느 정도 러닝에 익숙하고\n꾸준한 페이스로 달릴 수 있어요',
  },
  {
    id: 'advanced',
    title: '고급',
    pace: '5분 이하 페이스',
    description: '러닝 경험이 풍부하고\n빠른 속도로 달리는 것을 즐겨요',
  },
];

// 선호 시간 옵션
export const TIME_OPTIONS = [
  { id: 'dawn', title: '새벽', time: '5-7시', description: '상쾌한 아침 공기' },
  { id: 'morning', title: '아침', time: '7-9시', description: '활기찬 하루 시작' },
  { id: 'evening', title: '저녁', time: '6-8시', description: '하루를 마무리하며' },
  { id: 'night', title: '야간', time: '8-10시', description: '조용한 밤 러닝' },
];

// 러닝 스타일 옵션
export const RUNNING_STYLE_OPTIONS = [
  {
    id: 'social',
    title: '대화하며 천천히',
    description: '친구들과 이야기하며 여유롭게',
  },
  {
    id: 'focused',
    title: '집중해서 빠르게',
    description: '목표를 정하고 강도 높게',
  },
  {
    id: 'steady',
    title: '꾸준한 페이스',
    description: '일정한 속도로 안정적으로',
  },
  {
    id: 'interval',
    title: '인터벌 트레이닝',
    description: '빠르고 느림을 반복하며',
  },
];

// 계절 옵션
export const SEASON_OPTIONS = [
  { id: 'spring', emoji: '🌸', title: '봄', description: '따뜻한 햇살' },
  { id: 'summer', emoji: '☀️', title: '여름', description: '뜨거운 열정' },
  { id: 'autumn', emoji: '🍂', title: '가을', description: '선선한 바람' },
  { id: 'winter', emoji: '❄️', title: '겨울', description: '차가운 공기' },
];

// 목표 옵션
export const GOAL_OPTIONS = [
  { id: 'weight', title: '체중 감량' },
  { id: '5k', title: '5K 완주' },
  { id: '10k', title: '10K 완주' },
  { id: 'half', title: '하프마라톤' },
  { id: 'full', title: '풀마라톤' },
  { id: 'pr', title: '개인 기록 단축' },
  { id: 'habit', title: '러닝 습관' },
  { id: 'stress', title: '스트레스 해소' },
];

// 유틸리티 함수들
export const getLevelInfo = (id) => {
  const level = RUNNING_LEVELS.find(l => l.id === id);
  if (level) {
    return { title: level.title, subtitle: level.pace };
  }
  return { title: id, subtitle: '' };
};

export const getCourseName = (id) => {
  const park = HAN_RIVER_PARKS.find(p => p.id === id);
  if (park) return park.name;
  const river = RIVER_SIDES.find(r => r.id === id);
  if (river) return river.name;
  return id;
};

export const getTimeTitle = (id) => {
  const t = TIME_OPTIONS.find(t => t.id === id);
  return t ? t.title : id;
};

export const getStyleTitle = (id) => {
  const s = RUNNING_STYLE_OPTIONS.find(s => s.id === id);
  return s ? s.title : id;
};

export const getSeasonTitle = (id) => {
  const s = SEASON_OPTIONS.find(s => s.id === id);
  return s ? (s.emoji + ' ' + s.title) : id;
};

export const getGoalTitle = (id) => {
  const g = GOAL_OPTIONS.find(g => g.id === id);
  return g ? g.title : id;
}; 