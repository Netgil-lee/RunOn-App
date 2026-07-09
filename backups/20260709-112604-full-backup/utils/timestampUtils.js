/**
 * Firebase Timestamp를 안전한 문자열로 변환
 * @param {any} timestamp - 변환할 타임스탬프
 * @returns {string} 안전한 문자열
 */
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    // Firebase Timestamp 객체인 경우
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleString('ko-KR');
    }
    
    // Date 객체인 경우
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString('ko-KR');
    }
    
    // 숫자인 경우 (Unix timestamp)
    if (typeof timestamp === 'number') {
      const date = new Date(timestamp);
      return date.toLocaleString('ko-KR');
    }
    
    // 문자열인 경우 그대로 반환
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    
    // 기타 객체인 경우 빈 문자열 반환 (안전하게 처리)
    if (typeof timestamp === 'object') {
      console.warn('Timestamp 객체를 문자열로 변환할 수 없습니다:', timestamp);
      return '';
    }
    
    return String(timestamp);
  } catch (error) {
    console.warn('Timestamp 변환 오류:', error);
    return '';
  }
};

/**
 * Firebase Timestamp를 상대적 시간으로 변환 (예: "3분 전", "1시간 전")
 * @param {any} timestamp - 변환할 타임스탬프
 * @returns {string} 상대적 시간 문자열
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    let date;
    
    // Firebase Timestamp 객체인 경우
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return formatTimestamp(timestamp);
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return '방금 전';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}분 전`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}시간 전`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}일 전`;
    }
  } catch (error) {
    console.warn('상대적 시간 변환 오류:', error);
    return formatTimestamp(timestamp);
  }
};

/**
 * 객체의 모든 Timestamp 필드를 안전하게 변환
 * @param {Object} obj - 변환할 객체
 * @returns {Object} 변환된 객체
 */
export const sanitizeTimestamps = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && value.seconds) {
      // Firebase Timestamp 객체인 경우
      sanitized[key] = formatTimestamp(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // 중첩된 객체인 경우 재귀적으로 처리
      sanitized[key] = sanitizeTimestamps(value);
    } else if (Array.isArray(value)) {
      // 배열인 경우 각 요소를 처리
      sanitized[key] = value.map(item => 
        typeof item === 'object' ? sanitizeTimestamps(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};
