/**
 * Garmin Connect 연동 서비스 (Eval 테스트용)
 * - 백엔드 API(garminGetActivities) 호출만 담당 (Garmin API 직접 호출 없음)
 * - appleFitnessService와 동일한 findMatchingWorkout 반환 형식
 */
import env from '../config/environment';

const RUNNING_TYPES = ['RUNNING', 'RUN', 'TREADMILL_RUNNING', 'INDOOR_RUNNING'];

/**
 * 이벤트 시간 파싱 (date + time → Date 객체)
 * appleFitnessService.parseEventTime과 동일한 로직
 */
function parseEventTime(event) {
  if (!event?.date) return null;

  let year; let month; let day;
  if (event.date instanceof Date) {
    year = event.date.getFullYear();
    month = event.date.getMonth();
    day = event.date.getDate();
  } else if (typeof event.date === 'string') {
    const parts = event.date.split('-');
    if (parts.length !== 3) return null;
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else if (event.date?.toDate) {
    const d = event.date.toDate();
    year = d.getFullYear();
    month = d.getMonth();
    day = d.getDate();
  } else {
    return null;
  }

  let hour = 9; let minute = 0;
  if (event.time) {
    const m = event.time.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/);
    if (m) {
      hour = parseInt(m[2], 10);
      minute = parseInt(m[3], 10);
      if (m[1] === '오후' && hour !== 12) hour += 12;
      else if (m[1] === '오전' && hour === 12) hour = 0;
    }
  }

  return new Date(year, month, day, hour, minute, 0, 0);
}

function formatDistance(meters) {
  if (!meters || meters < 0) return '0m';
  if (meters < 1000) return `${Math.round(meters)}m`;
  const km = meters / 1000;
  const kmStr = km % 1 === 0 ? km.toString() : km.toFixed(2).replace(/\.?0+$/, '');
  return `${kmStr}km`;
}

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** averagePaceInMinutesPerKilometer → "6:30/km" */
function formatPaceFromMinPerKm(minPerKm) {
  if (!minPerKm || minPerKm <= 0) return '0:00/km';
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

/**
 * Garmin 활동 → 공유 카드 형식 변환
 */
function activityToShareFormat(activity) {
  const meters = activity.distanceInMeters || 0;
  const seconds = activity.durationInSeconds || 0;
  const minPerKm = activity.averagePaceInMinutesPerKilometer;
  const pace = minPerKm > 0
    ? formatPaceFromMinPerKm(minPerKm)
    : (seconds > 0 && meters > 0 ? formatPaceFromMinPerKm((seconds / 60) / (meters / 1000)) : '0:00/km');

  return {
    distance: formatDistance(meters),
    duration: formatDuration(seconds),
    pace,
    calories: activity.activeKilocalories || 0,
    routeCoordinates: activity.rawData?.samples?.map((s) => ({
      latitude: s.latitude,
      longitude: s.longitude,
    })).filter((c) => c.latitude != null && c.longitude != null) || [],
  };
}

class GarminConnectService {
  constructor() {
    this.baseUrl = env.garminApiBaseUrl || null;
    this.garminUserId = env.garminEvalUserId || null;
  }

  isServiceAvailable() {
    return !!(this.baseUrl && this.garminUserId);
  }

  /**
   * 이벤트와 매칭되는 Garmin 활동 조회
   * @param {Object} event - { date, time, title, location, organizer }
   * @returns {Promise<{distance, duration, pace, calories, routeCoordinates}|null>}
   */
  async findMatchingWorkout(event) {
    if (!this.isServiceAvailable()) {
      console.warn('⚠️ [GarminConnectService] Eval 설정이 없습니다. garminApiBaseUrl, garminEvalUserId 확인.');
      return null;
    }

    const eventTime = parseEventTime(event);
    if (!eventTime) {
      console.warn('⚠️ [GarminConnectService] 이벤트 시간 파싱 실패');
      return null;
    }

    // Garmin startTimeInSeconds는 UTC. 모임 시간(로컬) → UTC 변환 후 ±12시간 범위로 검색
    // (타임존 차이로 인한 매칭 실패 방지, API 최대 24시간 제한)
    const SEARCH_WINDOW_HOURS = 12;
    const searchStart = Math.floor((eventTime.getTime() / 1000) - SEARCH_WINDOW_HOURS * 60 * 60);
    const searchEnd = Math.floor((eventTime.getTime() / 1000) + SEARCH_WINDOW_HOURS * 60 * 60);

    const url = `${this.baseUrl}/garminGetActivities?garminUserId=${encodeURIComponent(this.garminUserId)}&startTime=${searchStart}&endTime=${searchEnd}`;

    console.log('🔍 [GarminConnectService] 조회 파라미터:', {
      garminUserId: this.garminUserId,
      searchStart,
      searchEnd,
      eventTimeLocal: eventTime.toLocaleString('ko-KR'),
      url,
    });

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error('❌ [GarminConnectService] API 오류:', res.status, await res.text());
        return null;
      }

      const data = await res.json();
      const { activities } = data;

      console.log('🔍 [GarminConnectService] API 응답:', {
        activitiesCount: activities?.length ?? 0,
        firstActivity: activities?.[0] ? {
          summaryId: activities[0].summaryId,
          startTimeInSeconds: activities[0].startTimeInSeconds,
          activityType: activities[0].activityType,
        } : null,
      });

      if (!Array.isArray(activities) || activities.length === 0) {
        console.log('🔍 [GarminConnectService] 매칭 활동 없음 (조회 범위 내 데이터 없음)');
        return null;
      }

      const runningActivities = activities.filter(
        (a) => RUNNING_TYPES.includes((a.activityType || '').toUpperCase())
      );
      if (runningActivities.length === 0) {
        console.log('🔍 [GarminConnectService] RUNNING 타입 활동 없음');
        return null;
      }

      const eventTs = eventTime.getTime() / 1000;
      const closest = runningActivities.reduce((best, curr) => {
        const currTs = curr.startTimeInSeconds || 0;
        const bestTs = best?.startTimeInSeconds || 0;
        return Math.abs(currTs - eventTs) < Math.abs(bestTs - eventTs) ? curr : best;
      });

      console.log('✅ [GarminConnectService] 매칭 활동:', closest.summaryId);
      return activityToShareFormat(closest);
    } catch (err) {
      console.error('❌ [GarminConnectService] findMatchingWorkout 실패:', err);
      return null;
    }
  }
}

export default new GarminConnectService();
