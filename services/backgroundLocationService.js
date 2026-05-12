import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_RUNNING_LOCATION_TASK = 'BACKGROUND_RUNNING_LOCATION_TASK';
const BUFFER_KEY = '@runon:background_location_buffer_v1';
const MAX_BUFFER_SIZE = 600;

// 버퍼 read-modify-write 동시 실행 방지용 in-memory 뮤텍스
let isConsuming = false;

const toCoordItem = (location) => {
  const coords = location?.coords || {};
  const latitude = Number(coords.latitude);
  const longitude = Number(coords.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    timestamp: Number(location?.timestamp || Date.now()),
    accuracy: Number(coords?.accuracy || 0),
    speed: Number(coords?.speed),
  };
};

const appendBufferItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) return;
  try {
    const raw = await AsyncStorage.getItem(BUFFER_KEY);
    const prev = raw ? JSON.parse(raw) : [];
    const next = [...prev, ...items].slice(-MAX_BUFFER_SIZE);
    await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('⚠️ 백그라운드 위치 버퍼 저장 실패:', error?.message || error);
  }
};

if (!TaskManager.isTaskDefined(BACKGROUND_RUNNING_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_RUNNING_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('❌ 백그라운드 위치 Task 오류:', error?.message || error);
      return;
    }
    const locations = data?.locations;
    if (!Array.isArray(locations) || locations.length === 0) return;
    const normalized = locations.map(toCoordItem).filter(Boolean);
    await appendBufferItems(normalized);
  });
}

const backgroundLocationService = {
  taskName: BACKGROUND_RUNNING_LOCATION_TASK,

  async ensureBackgroundPermission() {
    const current = await Location.getBackgroundPermissionsAsync();
    if (current?.granted) return true;
    const requested = await Location.requestBackgroundPermissionsAsync();
    return !!requested?.granted;
  },

  async start() {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_RUNNING_LOCATION_TASK);
    if (isStarted) return;

    // 새 세션 시작 시 버퍼 초기화
    await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify([]));

    await Location.startLocationUpdatesAsync(BACKGROUND_RUNNING_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 3,
      timeInterval: 1500,
      activityType: Location.ActivityType.Fitness,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        // Android 전용 (iOS에서는 무시됨)
        notificationTitle: 'RunOn 러닝 측정 중',
        notificationBody: '백그라운드에서 러닝 위치를 기록하고 있습니다.',
      },
    });
  },

  async stop() {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_RUNNING_LOCATION_TASK);
    if (isStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_RUNNING_LOCATION_TASK);
    }
  },

  /**
   * 버퍼에 쌓인 좌표를 원자적으로 소비한다.
   * AppState 복귀 즉시 호출과 2초 폴링이 동시에 실행될 때
   * 같은 좌표가 이중 집계되지 않도록 in-memory 뮤텍스로 보호한다.
   */
  async consumeBufferedLocations() {
    if (isConsuming) return [];
    isConsuming = true;
    try {
      const raw = await AsyncStorage.getItem(BUFFER_KEY);
      const items = raw ? JSON.parse(raw) : [];
      if (Array.isArray(items) && items.length > 0) {
        await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify([]));
      }
      return Array.isArray(items) ? items : [];
    } catch (error) {
      console.warn('⚠️ 백그라운드 위치 버퍼 조회 실패:', error?.message || error);
      return [];
    } finally {
      isConsuming = false;
    }
  },
};

export default backgroundLocationService;
