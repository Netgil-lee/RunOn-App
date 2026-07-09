import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { RunningTrackerModule } = NativeModules;

// iOS 전용 네이티브 러닝 추적 서비스
// Android에서는 사용 불가 (fallback 필요)
const emitter = Platform.OS === 'ios' && RunningTrackerModule
  ? new NativeEventEmitter(RunningTrackerModule)
  : null;

const nativeRunningService = {
  isAvailable: Platform.OS === 'ios' && !!RunningTrackerModule,

  async startTracking() {
    if (!this.isAvailable) throw new Error('nativeRunningService: iOS 전용');
    return RunningTrackerModule.startTracking();
  },

  async stopTracking() {
    if (!this.isAvailable) return;
    return RunningTrackerModule.stopTracking();
  },

  async pauseTracking() {
    if (!this.isAvailable) return;
    return RunningTrackerModule.pauseTracking();
  },

  async resumeTracking() {
    if (!this.isAvailable) return;
    return RunningTrackerModule.resumeTracking();
  },

  // 콜백: { latitude, longitude, accuracy, deltaMeters, currentPaceText, timestamp, isPaused }
  onLocationUpdate(callback) {
    if (!emitter) return { remove: () => {} };
    return emitter.addListener('onLocationUpdate', callback);
  },

  onTrackingError(callback) {
    if (!emitter) return { remove: () => {} };
    return emitter.addListener('onTrackingError', callback);
  },
};

export default nativeRunningService;
