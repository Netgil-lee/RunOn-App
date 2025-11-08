/**
 * Promise에 타임아웃을 추가하는 유틸리티 함수
 * @param {Promise} promise - 타임아웃을 추가할 Promise
 * @param {number} timeoutMs - 타임아웃 시간 (밀리초)
 * @param {string} errorMessage - 타임아웃 시 표시할 에러 메시지
 * @returns {Promise} 타임아웃이 적용된 Promise
 */
export const withTimeout = (promise, timeoutMs, errorMessage = '요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.') => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

