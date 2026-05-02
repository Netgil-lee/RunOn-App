import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'runon_running_records_v1';

const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDistance = (meters) => {
  const safeMeters = Number.isFinite(meters) ? Math.max(0, meters) : 0;
  if (safeMeters < 1000) return `${Math.round(safeMeters)}m`;
  const km = safeMeters / 1000;
  return `${km % 1 === 0 ? km.toString() : km.toFixed(2).replace(/\.?0+$/, '')}km`;
};

const formatDuration = (seconds) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const formatPace = (distanceMeters, durationSeconds) => {
  if (!distanceMeters || !durationSeconds) return '0:00/km';
  const paceSeconds = (durationSeconds / distanceMeters) * 1000;
  const min = Math.floor(paceSeconds / 60);
  const sec = Math.floor(paceSeconds % 60);
  return `${min}:${String(sec).padStart(2, '0')}/km`;
};

const normalizeRecord = (record) => {
  const startDate = parseDate(record.startTime);
  if (!startDate) return null;

  const distanceMeters = Number(record.distanceMeters ?? record.raw?.distanceMeters ?? 0);
  const durationSeconds = Number(record.durationSeconds ?? record.raw?.durationSeconds ?? 0);

  return {
    id: record.id || `runon-${startDate.getTime()}`,
    startTime: startDate.toISOString(),
    sourceName: 'RunOn',
    sourceLabel: 'RunOn',
    distance: formatDistance(distanceMeters),
    pace: record.pace || formatPace(distanceMeters, durationSeconds),
    duration: record.duration || formatDuration(durationSeconds),
    calories: Math.max(0, Math.round(Number(record.calories || 0))),
    routeCoordinates: Array.isArray(record.routeCoordinates) ? record.routeCoordinates : [],
    raw: {
      distanceMeters,
      durationSeconds,
      startDate: startDate.toISOString(),
      endDate: record.endTime || record.raw?.endDate || null,
      calories: Math.max(0, Math.round(Number(record.calories || 0))),
    },
  };
};

class RunOnRunningService {
  async getAllRecords() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('❌ [RunOnRunningService] 로컬 기록 조회 실패:', error);
      return [];
    }
  }

  async saveAllRecords(records) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  async addRecord(record) {
    const normalized = normalizeRecord(record);
    if (!normalized) {
      throw new Error('유효하지 않은 러닝 기록입니다.');
    }

    const records = await this.getAllRecords();
    const next = [normalized, ...records].slice(0, 300);
    await this.saveAllRecords(next);
    return normalized;
  }

  async deleteRecord(recordId) {
    const records = await this.getAllRecords();
    const next = records.filter((record) => `${record?.id || ''}` !== `${recordId || ''}`);
    await this.saveAllRecords(next);
    return records.length !== next.length;
  }

  async getRecentRunningWorkouts(days = 14) {
    const loadAll = !Number.isFinite(days) || days <= 0;
    const periodDays = loadAll ? 0 : days;
    const threshold = loadAll
      ? Number.NEGATIVE_INFINITY
      : Date.now() - (periodDays * 24 * 60 * 60 * 1000);
    const records = await this.getAllRecords();

    return records
      .map((item) => normalizeRecord(item))
      .filter((item) => item && new Date(item.startTime).getTime() >= threshold)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }
}

export default new RunOnRunningService();
