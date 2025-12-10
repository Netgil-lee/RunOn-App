// Health Connect Fitness 서비스
import healthConnectService from './healthConnectService';

class FitnessService {
  constructor() {
    this.service = healthConnectService;
  }

  /**
   * Fitness 서비스 초기화
   * @returns {Promise<boolean>} 초기화 성공 여부
   */
  async initialize() {
    if (!this.service) {
      console.warn('⚠️ 현재 플랫폼에서는 Fitness 서비스를 사용할 수 없습니다.');
      return false;
    }
    return await this.service.initialize();
  }

  /**
   * 권한 상태 확인
   * @returns {Promise<Object>} { isAvailable, hasPermissions, error }
   */
  async checkPermissions() {
    if (!this.service) {
      return {
        isAvailable: false,
        hasPermissions: false,
        error: '현재 플랫폼에서는 Fitness 서비스를 사용할 수 없습니다.'
      };
    }
    return await this.service.checkPermissions();
  }

  /**
   * 권한 요청
   * @returns {Promise<boolean>} 권한 허용 여부
   */
  async requestPermissions() {
    if (!this.service) {
      console.warn('⚠️ 현재 플랫폼에서는 권한을 요청할 수 없습니다.');
      return false;
    }
    return await this.service.requestPermissions();
  }

  /**
   * 서비스 사용 가능 여부 확인
   * @returns {boolean} 사용 가능 여부
   */
  isServiceAvailable() {
    if (!this.service) {
      return false;
    }
    return this.service.isServiceAvailable();
  }

  /**
   * 이벤트와 매칭되는 운동기록 찾기
   * @param {Object} event - 이벤트 데이터
   * @returns {Promise<Object|null>} 운동기록 데이터 또는 null
   */
  async findMatchingWorkout(event) {
    if (!this.service) {
      console.warn('⚠️ 현재 플랫폼에서는 운동기록을 조회할 수 없습니다.');
      return null;
    }
    return await this.service.findMatchingWorkout(event);
  }

  /**
   * 이동경로 좌표 조회
   * @param {Date} startDate - 시작 시간
   * @param {Date} endDate - 종료 시간
   * @returns {Promise<Array>} 좌표 배열
   */
  async getRouteCoordinates(startDate, endDate) {
    if (!this.service) {
      console.warn('⚠️ 현재 플랫폼에서는 이동경로를 조회할 수 없습니다.');
      return [];
    }
    return await this.service.getRouteCoordinates(startDate, endDate);
  }

  /**
   * 거리 포맷팅
   * @param {number} meters - 미터 단위 거리
   * @returns {string} 포맷팅된 거리 문자열
   */
  formatDistance(meters) {
    if (!this.service) {
      return '0m';
    }
    return this.service.formatDistance(meters);
  }

  /**
   * 페이스 포맷팅
   * @param {string} pace - 페이스 문자열
   * @returns {string} 포맷팅된 페이스 문자열
   */
  formatPace(pace) {
    if (!this.service) {
      return '0:00/km';
    }
    return this.service.formatPace(pace);
  }

  /**
   * 시간 포맷팅
   * @param {number} seconds - 초 단위 시간
   * @returns {string} 포맷팅된 시간 문자열
   */
  formatDuration(seconds) {
    if (!this.service) {
      return '0s';
    }
    return this.service.formatDuration(seconds);
  }

  /**
   * 이벤트 시간 파싱
   * @param {Object} event - 이벤트 데이터
   * @returns {Date|null} 파싱된 Date 객체
   */
  parseEventTime(event) {
    if (!this.service) {
      return null;
    }
    return this.service.parseEventTime(event);
  }
}

export default new FitnessService();

