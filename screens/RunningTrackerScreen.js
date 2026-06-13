import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ActivityIndicator, AppState, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import runOnRunningService from '../services/runOnRunningService';
import backgroundLocationService from '../services/backgroundLocationService';
import runningTrackingSessionService from '../services/runningTrackingSessionService';
import RouteMap from '../components/RouteMap';
import { getAppleFitnessService } from '../services/getAppleFitnessService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
const GPS_START_CACHE_MAX_AGE_MS = 15000;

const toRad = (value) => (value * Math.PI) / 180;
const calcDistanceMeters = (from, to) => {
  const R = 6371e3;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDuration = (seconds) => {
  const safe = Math.max(0, Math.floor(seconds));
  const hh = Math.floor(safe / 3600);
  const mm = Math.floor((safe % 3600) / 60);
  const ss = safe % 60;
  if (hh > 0) return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

const formatDistance = (meters) => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2).replace(/\.?0+$/, '')}km`;
};

const formatPace = (distanceMeters, durationSeconds) => {
  if (!distanceMeters || !durationSeconds) return '0:00/km';
  const pace = (durationSeconds / distanceMeters) * 1000;
  const min = Math.floor(pace / 60);
  const sec = Math.floor(pace % 60);
  return `${min}:${String(sec).padStart(2, '0')}/km`;
};

const formatPaceFromMps = (speedMps) => {
  if (!Number.isFinite(speedMps) || speedMps <= 0.3) return '--:--/km';
  const paceSeconds = 1000 / speedMps;
  const min = Math.floor(paceSeconds / 60);
  const sec = Math.floor(paceSeconds % 60);
  return `${min}:${String(sec).padStart(2, '0')}/km`;
};

const estimateCalories = (durationSeconds, weightKg = 70) => {
  const MET = 9.0;
  const hours = durationSeconds / 3600;
  return Math.max(0, Math.round(MET * weightKg * hours));
};

const calcPathDistanceMeters = (coordinates = []) => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coordinates.length; i += 1) {
    total += calcDistanceMeters(coordinates[i - 1], coordinates[i]);
  }
  return total;
};

const toMapCoords = (coords = []) => (
  coords
    .map((coord) => ({
      latitude: Number(coord?.latitude),
      longitude: Number(coord?.longitude),
    }))
    .filter((coord) => Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude))
);

const GPS_READY_BEEP_URI_1S = 'data:audio/wav;base64,UklGRmQfAABXQVZFZm10IBAAAAABAAEAoA8AAEAfAAACABAAZGF0YUAfAAAAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00w==';

const RunningTrackerScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [hasStartedRun, setHasStartedRun] = useState(false);
  const [isStartingRun, setIsStartingRun] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [currentPaceText, setCurrentPaceText] = useState('--:--/km');
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [mapRouteCoordinates, setMapRouteCoordinates] = useState([]);
  const [preStartCurrentLocation, setPreStartCurrentLocation] = useState(null);
  const [isRunFinished, setIsRunFinished] = useState(false);
  const [isGpsPreparing, setIsGpsPreparing] = useState(true);
  const [showGpsReadyFeedback, setShowGpsReadyFeedback] = useState(false);
  const [runningMapStatus, setRunningMapStatus] = useState('loading'); // loading | ready | error
  const [runningMapError, setRunningMapError] = useState('');
  const [runningMapReloadKey, setRunningMapReloadKey] = useState(0);
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false);
  const [pendingFinishData, setPendingFinishData] = useState(null);
  const [isSavingRun, setIsSavingRun] = useState(false);
  const runningMapRef = useRef(null);

  const startTimeRef = useRef(new Date());
  const locationWatcherRef = useRef(null);
  const lastCoordRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const distanceMetersRef = useRef(0);
  const routeCoordinatesRef = useRef([]);
  const runStartedAtMsRef = useRef(null);
  const totalPausedMsRef = useRef(0);
  const pauseStartedAtMsRef = useRef(null);
  const isPausedRef = useRef(false);
  const endedRef = useRef(false);
  const gpsReadyFeedbackShownRef = useRef(false);
  const gpsReadyFeedbackTimerRef = useRef(null);
  const latestGpsCoordRef = useRef(null);
  const latestGpsTimestampRef = useRef(null);
  const smoothedSpeedMpsRef = useRef(null);
  const activeSessionIdRef = useRef(null);
  const sessionSaveTimerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  // 복구 진행 중 플래그: true이면 prepareGps가 UI 피드백/좌표 덮어쓰기를 건너뜀
  const isRecoveryActiveRef = useRef(false);
  const [bgPermissionGranted, setBgPermissionGranted] = useState(true);

  const averagePaceText = useMemo(
    () => formatPace(distanceMeters, elapsedSeconds),
    [distanceMeters, elapsedSeconds]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const nextRoute = routeCoordinatesRef.current || [];
      setMapRouteCoordinates(nextRoute.length > 0 ? [...nextRoute] : []);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // 경로 좌표 메모이제이션 (2초 주기로 갱신되는 mapRouteCoordinates 기반)
  const mapCoords = useMemo(() => toMapCoords(mapRouteCoordinates), [mapRouteCoordinates]);

  // 현재 위치 (러닝 중: 마지막 좌표, 시작 전: GPS 위치)
  const mapCurrentLocation = useMemo(() => {
    if (mapCoords.length > 0) return mapCoords[mapCoords.length - 1];
    if (!hasStartedRun && preStartCurrentLocation) return preStartCurrentLocation;
    return null;
  }, [mapCoords, hasStartedRun, preStartCurrentLocation]);

  // 카메라 자동 추적 (러닝 중 + 일시정지 아닐 때)
  useEffect(() => {
    if (!isPaused && !isRunFinished && mapCurrentLocation) {
      runningMapRef.current?.animateToRegion({
        latitude: mapCurrentLocation.latitude,
        longitude: mapCurrentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 300);
    }
  }, [mapCurrentLocation, isPaused, isRunFinished]);

  // Android: 커스텀 View 마커는 tracksViewChanges=true일 때만 비트맵으로 래스터화됨.
  // 마커가 처음 나타나는 시점(러닝 시작/종료/첫 좌표)에 잠시 켰다가 끔. (위치 이동은 false여도 갱신됨)
  const hasAnyRunMarker = mapCoords.length > 0 || !!mapCurrentLocation;
  const [markersTrackViewChanges, setMarkersTrackViewChanges] = useState(true);
  useEffect(() => {
    setMarkersTrackViewChanges(true);
    const timer = setTimeout(() => setMarkersTrackViewChanges(false), 1500);
    return () => clearTimeout(timer);
  }, [hasStartedRun, isRunFinished, hasAnyRunMarker]);

  const playGpsReadyBeep = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: GPS_READY_BEEP_URI_1S },
        { shouldPlay: true, volume: 1.0, isLooping: false }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status?.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (error) {
      console.warn('⚠️ GPS 완료 비프음 재생 실패:', error?.message || error);
    }
  };

  const handleGpsReadyFeedback = () => {
    if (gpsReadyFeedbackShownRef.current) return;
    gpsReadyFeedbackShownRef.current = true;
    setShowGpsReadyFeedback(true);
    playGpsReadyBeep();
    if (gpsReadyFeedbackTimerRef.current) {
      clearTimeout(gpsReadyFeedbackTimerRef.current);
    }
    gpsReadyFeedbackTimerRef.current = setTimeout(() => {
      setShowGpsReadyFeedback(false);
      gpsReadyFeedbackTimerRef.current = null;
    }, 1400);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (!hasStartedRun) {
        setElapsedSeconds(0);
        return;
      }
      if (!runStartedAtMsRef.current) return;
      const now = Date.now();
      const inProgressPauseMs = (isPausedRef.current && pauseStartedAtMsRef.current)
        ? now - pauseStartedAtMsRef.current
        : 0;
      const elapsedMs = now - runStartedAtMsRef.current - totalPausedMsRef.current - inProgressPauseMs;
      setElapsedSeconds(Math.max(0, Math.floor(elapsedMs / 1000)));
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStartedRun]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const processIncomingLocation = (nextCoord, nextTimestamp, accuracy = 0, providedSpeed) => {
    if (endedRef.current) return;
    if (!nextCoord) return;
    const nextTs = nextTimestamp || Date.now();

    latestGpsCoordRef.current = nextCoord;
    latestGpsTimestampRef.current = nextTs;

    if (isPausedRef.current) {
      lastCoordRef.current = nextCoord;
      lastTimestampRef.current = nextTs;
      return;
    }

    const previous = lastCoordRef.current;
    const previousTimestamp = lastTimestampRef.current;
    if (!previous) {
      lastCoordRef.current = nextCoord;
      lastTimestampRef.current = nextTs;
      routeCoordinatesRef.current = [...routeCoordinatesRef.current, nextCoord];
      setRouteCoordinates(routeCoordinatesRef.current);
      return;
    }
    let delta = calcDistanceMeters(previous, nextCoord);
    const runElapsedSeconds = runStartedAtMsRef.current
      ? Math.max(0, (nextTs - runStartedAtMsRef.current) / 1000)
      : 0;

    if (delta < 0.2) return;
    if (delta > 1000) return;
    if (accuracy > 60 && delta > 120) return;
    if (runElapsedSeconds < 20 && (accuracy > 35 || delta > 40)) return;
    if (previousTimestamp) {
      const elapsed = Math.max((nextTs - previousTimestamp) / 1000, 1);
      const speedMps = delta / elapsed;
      if (speedMps > 12) return;
      if (runElapsedSeconds < 20 && speedMps > 6.5) return;
    }

    lastCoordRef.current = nextCoord;
    lastTimestampRef.current = nextTs;
    routeCoordinatesRef.current = [...routeCoordinatesRef.current, nextCoord];
    setRouteCoordinates(routeCoordinatesRef.current);

    distanceMetersRef.current += delta;
    setDistanceMeters(distanceMetersRef.current);

    // 세션 상태 주기적 영속화 (5초 debounce)
    if (sessionSaveTimerRef.current) clearTimeout(sessionSaveTimerRef.current);
    sessionSaveTimerRef.current = setTimeout(() => {
      runningTrackingSessionService.update({
        distanceMeters: distanceMetersRef.current,
        totalPausedMs: totalPausedMsRef.current,
        isPaused: isPausedRef.current,
        pauseStartedAtMs: pauseStartedAtMsRef.current,
        lastCoord: nextCoord,
      }).catch(() => {});
      sessionSaveTimerRef.current = null;
    }, 5000);

    if (previousTimestamp) {
      const elapsed = Math.max((nextTs - previousTimestamp) / 1000, 1);
      const speedFromDelta = delta / elapsed;
      const reportedSpeed = Number(providedSpeed);
      const baseSpeed = Number.isFinite(reportedSpeed) && reportedSpeed > 0.3
        ? reportedSpeed
        : speedFromDelta;
      if (Number.isFinite(baseSpeed) && baseSpeed > 0.3) {
        const prevSmoothed = smoothedSpeedMpsRef.current;
        const nextSmoothed = Number.isFinite(prevSmoothed)
          ? (prevSmoothed * 0.72) + (baseSpeed * 0.28)
          : baseSpeed;
        smoothedSpeedMpsRef.current = nextSmoothed;
        setCurrentPaceText(formatPaceFromMps(nextSmoothed));
      }
    }
  };

  /**
   * 백그라운드에서 쌓인 위치 버퍼를 일괄 처리한다.
   * - 타임스탬프 오름차순 정렬 후 처리 (iOS가 배치로 전달할 때 순서 보장 안 됨)
   * - 포그라운드 실시간 필터보다 완화된 기준 적용:
   *   · 백그라운드 구간은 GPS 업데이트 간격이 길어 구간 속도가 실제보다 낮게 계산됨
   *   · speed 리포트 신뢰성이 낮으므로 거리 계산은 좌표 간 거리만 사용
   *   · 정확도(accuracy) 기준 완화: 포그라운드 60m → 백그라운드 100m
   */
  const processBufferedLocations = (items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    if (endedRef.current) return;

    const sorted = [...items].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    sorted.forEach((item) => {
      const nextCoord = {
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
      };
      const nextTimestamp = Number(item.timestamp || Date.now());
      const accuracy = Number(item.accuracy || 0);

      if (!Number.isFinite(nextCoord.latitude) || !Number.isFinite(nextCoord.longitude)) return;
      if (endedRef.current) return;

      latestGpsCoordRef.current = nextCoord;
      latestGpsTimestampRef.current = nextTimestamp;

      if (isPausedRef.current) {
        lastCoordRef.current = nextCoord;
        lastTimestampRef.current = nextTimestamp;
        return;
      }

      const previous = lastCoordRef.current;
      const previousTimestamp = lastTimestampRef.current;
      const runElapsedSeconds = runStartedAtMsRef.current
        ? Math.max(0, (nextTimestamp - runStartedAtMsRef.current) / 1000)
        : 0;
      if (!previous) {
        lastCoordRef.current = nextCoord;
        lastTimestampRef.current = nextTimestamp;
        routeCoordinatesRef.current = [...routeCoordinatesRef.current, nextCoord];
        setRouteCoordinates(routeCoordinatesRef.current);
        return;
      }

      const delta = calcDistanceMeters(previous, nextCoord);

      // 완화된 필터 (백그라운드 GPS 특성 반영)
      if (delta < 0.5) return;              // 너무 작은 이동 무시
      if (delta > 1500) return;             // 1.5km 초과 점프는 오류 좌표
      if (accuracy > 100 && delta > 200) return;  // 정확도 낮고 점프 큰 경우만 제거
      if (runElapsedSeconds < 20 && (accuracy > 35 || delta > 40)) return;

      // 백그라운드 구간은 elapsed time 기반 속도 계산 신뢰도가 낮으므로
      // 명백히 불가능한 속도(20m/s = 72km/h 초과)만 걸러냄
      if (previousTimestamp) {
        const elapsed = Math.max((nextTimestamp - previousTimestamp) / 1000, 1);
        const speedMps = delta / elapsed;
        if (speedMps > 20) return;
        if (runElapsedSeconds < 20 && speedMps > 6.5) return;
      }

      lastCoordRef.current = nextCoord;
      lastTimestampRef.current = nextTimestamp;
      // 거리 누적에 반영된 좌표만 경로에 추가해 초기 튐을 시각적으로도 제거한다.
      routeCoordinatesRef.current = [...routeCoordinatesRef.current, nextCoord];
      setRouteCoordinates(routeCoordinatesRef.current);

      distanceMetersRef.current += delta;
      setDistanceMeters(distanceMetersRef.current);

      if (sessionSaveTimerRef.current) clearTimeout(sessionSaveTimerRef.current);
      sessionSaveTimerRef.current = setTimeout(() => {
        runningTrackingSessionService.update({
          distanceMeters: distanceMetersRef.current,
          totalPausedMs: totalPausedMsRef.current,
          isPaused: isPausedRef.current,
          pauseStartedAtMs: pauseStartedAtMsRef.current,
          lastCoord: nextCoord,
        }).catch(() => {});
        sessionSaveTimerRef.current = null;
      }, 5000);
    });
  };

  // ─── 앱 복귀 시 백그라운드 버퍼 즉시 소비 ───────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;
      if (
        (prevState === 'background' || prevState === 'inactive') &&
        nextState === 'active' &&
        hasStartedRun &&
        !endedRef.current
      ) {
        backgroundLocationService.consumeBufferedLocations()
          .then((items) => processBufferedLocations(items))
          .catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [hasStartedRun]);

  // ─── 화면 진입 시 중단된 세션 복구 감지 ─────────────────────────────────
  useEffect(() => {
    const checkForRecovery = async () => {
      const savedSession = await runningTrackingSessionService.load();
      if (!savedSession) return;

      const {
        sessionId,
        startedAtMs,
        totalPausedMs = 0,
        distanceMeters: savedDistance = 0,
        isPaused: wasPaused = false,
        lastCoord,
      } = savedSession;

      // 복구 가능한 세션이 있으면 사용자에게 선택지 제공
      const elapsedMin = Math.floor((Date.now() - startedAtMs - totalPausedMs) / 60000);
      Alert.alert(
        '러닝 기록 복구',
        `중단된 러닝이 있습니다.\n경과 시간: 약 ${elapsedMin}분\n누적 거리: ${(savedDistance / 1000).toFixed(2)}km\n\n이어서 기록하시겠어요?`,
        [
          {
            text: '삭제하고 새로 시작',
            style: 'destructive',
            onPress: async () => {
              await runningTrackingSessionService.clear();
              await backgroundLocationService.stop().catch(() => {});
            },
          },
          {
            text: '이어서 기록',
            onPress: async () => {
              // prepareGps가 진행 중이어도 UI 피드백/좌표 덮어쓰기를 막음
              isRecoveryActiveRef.current = true;

              // 백그라운드 버퍼에 쌓인 좌표 가져오기
              const buffered = await backgroundLocationService.consumeBufferedLocations().catch(() => []);

              // 세션 상태 복원
              activeSessionIdRef.current = sessionId;
              runStartedAtMsRef.current = startedAtMs;
              startTimeRef.current = new Date(startedAtMs);
              totalPausedMsRef.current = totalPausedMs;
              distanceMetersRef.current = savedDistance;
              setDistanceMeters(savedDistance);
              smoothedSpeedMpsRef.current = null;
              endedRef.current = false;
              setIsRunFinished(false);
              isPausedRef.current = wasPaused;
              setIsPaused(wasPaused);
              pauseStartedAtMsRef.current = wasPaused ? Date.now() : null;

              // 마지막 알려진 좌표를 기준점으로 설정
              if (lastCoord) {
                lastCoordRef.current = lastCoord;
                lastTimestampRef.current = Date.now();
                routeCoordinatesRef.current = [lastCoord];
                setRouteCoordinates([lastCoord]);
                setMapRouteCoordinates([lastCoord]);
                setPreStartCurrentLocation(lastCoord);
              }

              // 백그라운드에서 쌓인 좌표 병합
              if (buffered.length > 0) {
                buffered.forEach((item) => {
                  processIncomingLocation(
                    { latitude: Number(item.latitude), longitude: Number(item.longitude) },
                    Number(item.timestamp || Date.now()),
                    Number(item.accuracy || 0),
                    Number(item.speed)
                  );
                });
              }

              setIsGpsPreparing(false);
              setHasStartedRun(true);
            },
          },
        ]
      );
    };

    checkForRecovery().catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;

    const prepareGps = async () => {
      setIsGpsPreparing(true);
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) {
        const requested = await Location.requestForegroundPermissionsAsync();
        if (!requested.granted) {
          setIsGpsPreparing(false);
          Alert.alert('권한 필요', '러닝 기록을 위해 위치 권한이 필요합니다.', [
            { text: '확인', onPress: () => navigation.goBack() },
          ]);
          return;
        }
      }

      const initialPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      latestGpsCoordRef.current = {
        latitude: initialPosition.coords.latitude,
        longitude: initialPosition.coords.longitude,
      };
      latestGpsTimestampRef.current = initialPosition.timestamp || Date.now();

      // 복구가 진행 중이면 좌표·피드백 덮어쓰기 생략
      if (isRecoveryActiveRef.current) {
        setIsGpsPreparing(false);
        return;
      }

      // 백그라운드 위치 권한("항상 허용") 확인 → 미허용 시 경고 배너 표시
      try {
        const bgPermission = await Location.getBackgroundPermissionsAsync();
        setBgPermissionGranted(!!bgPermission?.granted);
      } catch {
        setBgPermissionGranted(false);
      }

      setPreStartCurrentLocation(latestGpsCoordRef.current);
      setIsGpsPreparing(false);
      handleGpsReadyFeedback();
    };

    prepareGps().catch((error) => {
      console.error('❌ GPS 준비 실패:', error);
      setIsGpsPreparing(false);
      Alert.alert('오류', 'GPS 수신을 시작하지 못했습니다. 다시 시도해주세요.');
    });

    return () => {
      mounted = false;
      if (gpsReadyFeedbackTimerRef.current) {
        clearTimeout(gpsReadyFeedbackTimerRef.current);
        gpsReadyFeedbackTimerRef.current = null;
      }
      if (sessionSaveTimerRef.current) {
        clearTimeout(sessionSaveTimerRef.current);
        sessionSaveTimerRef.current = null;
      }
      locationWatcherRef.current?.remove();
      locationWatcherRef.current = null;
      backgroundLocationService.stop().catch(() => {});
    };
  }, [navigation]);

  const handleStartRun = async () => {
    if (hasStartedRun || isGpsPreparing || isStartingRun) return;
    setIsStartingRun(true);
    /** 타이머·기록 시작 시각: 반드시 「러닝 시작」 탭 직후 (GPS fix 타임스탬프 사용 안 함) */
    const sessionStartMs = Date.now();
    try {
      const cachedCoord = latestGpsCoordRef.current;
      const cachedTimestamp = Number(latestGpsTimestampRef.current || 0);
      const isFreshCachedCoord = (
        cachedCoord
        && Number.isFinite(cachedTimestamp)
        && sessionStartMs - cachedTimestamp <= GPS_START_CACHE_MAX_AGE_MS
      );

      let initialCoord = isFreshCachedCoord ? cachedCoord : null;

      if (!initialCoord) {
        try {
          const refreshedPosition = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeout: 1800,
            maximumAge: 8000,
          });
          if (refreshedPosition?.coords) {
            initialCoord = {
              latitude: refreshedPosition.coords.latitude,
              longitude: refreshedPosition.coords.longitude,
            };
          }
        } catch (refreshError) {
          // 짧은 재조회 실패 시 마지막 알려진 좌표를 사용한다.
        }
      }

      if (!initialCoord) {
        const fallbackPosition = await Location.getLastKnownPositionAsync({
          maxAge: 10000,
          requiredAccuracy: 60,
        });
        if (fallbackPosition?.coords) {
          initialCoord = {
            latitude: fallbackPosition.coords.latitude,
            longitude: fallbackPosition.coords.longitude,
          };
        }
      }

      if (!initialCoord) {
        throw new Error('START_POSITION_UNAVAILABLE');
      }

      latestGpsCoordRef.current = initialCoord;
      latestGpsTimestampRef.current = sessionStartMs;
      endedRef.current = false;
      setIsRunFinished(false);
      setIsPaused(false);
      isPausedRef.current = false;
      setElapsedSeconds(0);
      setDistanceMeters(0);
      setCurrentPaceText('--:--/km');
      distanceMetersRef.current = 0;
      smoothedSpeedMpsRef.current = null;
      totalPausedMsRef.current = 0;
      pauseStartedAtMsRef.current = null;
      runStartedAtMsRef.current = sessionStartMs;
      startTimeRef.current = new Date(sessionStartMs);
      lastCoordRef.current = initialCoord;
      lastTimestampRef.current = sessionStartMs;
      routeCoordinatesRef.current = [initialCoord];
      setRouteCoordinates([initialCoord]);
      setMapRouteCoordinates([initialCoord]);
      setPreStartCurrentLocation(initialCoord);
      activeSessionIdRef.current = `run-${sessionStartMs}`;

      // 세션 영속화 시작 (앱 강제종료 복구 대비)
      await runningTrackingSessionService.save({
        sessionId: activeSessionIdRef.current,
        startedAtMs: sessionStartMs,
        totalPausedMs: 0,
        distanceMeters: 0,
        isPaused: false,
        pauseStartedAtMs: null,
        lastCoord: initialCoord,
      });

      try {
        // "항상 허용"(ACCESS_BACKGROUND_LOCATION)을 best-effort로 요청해 둔다.
        // 단, location 타입 포그라운드 서비스는 "앱 사용 중 허용"만으로도 백그라운드에서
        // 위치를 계속 받으므로, 권한 등급과 무관하게 포그라운드 서비스를 시작한다.
        const hasBackgroundPermission = await backgroundLocationService.ensureBackgroundPermission();
        setBgPermissionGranted(!!hasBackgroundPermission);
        await backgroundLocationService.start();
        if (!hasBackgroundPermission) {
          console.warn('⚠️ "항상 허용" 미부여 — 포그라운드 서비스로 백그라운드 추적(OEM 절전 정책에 따라 제한될 수 있음)');
        }
      } catch (bgError) {
        console.warn('⚠️ 백그라운드 위치 추적 시작 실패:', bgError?.message || bgError);
      }

      const watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (position) => {
          const nextCoord = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          const nextTimestamp = position.timestamp || Date.now();
          const accuracy = Number(position.coords?.accuracy || 0);
          processIncomingLocation(nextCoord, nextTimestamp, accuracy, position.coords?.speed);
        }
      );

      locationWatcherRef.current = watcher;
      setHasStartedRun(true);
    } catch (error) {
      console.error('❌ 러닝 시작 실패:', error);
      Alert.alert('오류', '러닝 시작에 실패했습니다. GPS 상태를 확인 후 다시 시도해주세요.');
    } finally {
      setIsStartingRun(false);
    }
  };

  const handleExitBeforeStart = () => {
    Alert.alert(
      '러닝을 종료할까요?',
      '아직 러닝을 시작하지 않았습니다. 측정 화면을 종료합니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '종료', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  const handlePauseResume = () => {
    if (isGpsPreparing || !hasStartedRun) return;
    setIsPaused((prev) => {
      const next = !prev;
      isPausedRef.current = next;
      if (next) {
        pauseStartedAtMsRef.current = Date.now();
      } else if (pauseStartedAtMsRef.current) {
        totalPausedMsRef.current += Date.now() - pauseStartedAtMsRef.current;
        pauseStartedAtMsRef.current = null;
      }
      // 일시정지 상태 즉시 저장 (복구 시 정확한 경과시간 계산용)
      runningTrackingSessionService.update({
        isPaused: next,
        pauseStartedAtMs: next ? pauseStartedAtMsRef.current : null,
        totalPausedMs: totalPausedMsRef.current,
      }).catch(() => {});
      return next;
    });
  };

  const handleRetryRunningMap = () => {
    setRunningMapError('');
    setRunningMapStatus('loading');
    setRunningMapReloadKey((prev) => prev + 1);
  };

  const buildFinalizedRunData = async () => {
    const endTime = new Date();
    const endMs = endTime.getTime();
    const inProgressPauseMs = (isPausedRef.current && pauseStartedAtMsRef.current)
      ? endMs - pauseStartedAtMsRef.current
      : 0;
    const duration = Math.max(
      0,
      Math.floor((endMs - (runStartedAtMsRef.current || endMs) - totalPausedMsRef.current - inProgressPauseMs) / 1000)
    );
    setElapsedSeconds(duration);
    const calories = estimateCalories(duration);
    let finalRouteCoordinates = [...routeCoordinatesRef.current];

    // 종료 직전 마지막 좌표를 한 번 더 확보해 짧은 세션의 거리 0 고착을 완화
    try {
      const finalPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 4000,
      });
      if (finalPosition?.coords) {
        const finalCoord = {
          latitude: finalPosition.coords.latitude,
          longitude: finalPosition.coords.longitude,
        };
        const lastCoord = finalRouteCoordinates[finalRouteCoordinates.length - 1];
        if (!lastCoord || calcDistanceMeters(lastCoord, finalCoord) > 3) {
          finalRouteCoordinates = [...finalRouteCoordinates, finalCoord];
          routeCoordinatesRef.current = finalRouteCoordinates;
          setRouteCoordinates(finalRouteCoordinates);
          setMapRouteCoordinates(finalRouteCoordinates);
        }
      }
    } catch (error) {
      // 마지막 좌표 확보 실패는 무시하고 기존 추적값 사용
      console.warn('⚠️ 종료 시 마지막 좌표 확보 실패:', error?.message || error);
    }

    const refDistance = Math.max(0, Number(distanceMetersRef.current || 0));
    const pathDistance = calcPathDistanceMeters(finalRouteCoordinates);
    let finalDistanceMeters = Math.max(refDistance, pathDistance);

    // GPS 콜백 누락/지연으로 거리 누적이 0인 경우를 위한 최소 fallback
    if (finalDistanceMeters < 1 && duration >= 15 && finalRouteCoordinates.length >= 2) {
      const firstCoord = finalRouteCoordinates[0];
      const lastCoord = finalRouteCoordinates[finalRouteCoordinates.length - 1];
      const displacement = calcDistanceMeters(firstCoord, lastCoord);
      if (displacement > 5) {
        finalDistanceMeters = displacement;
      }
    }

    distanceMetersRef.current = finalDistanceMeters;
    setDistanceMeters(finalDistanceMeters);

    const pace = formatPace(finalDistanceMeters, duration);
    const workoutPayload = {
      startDate: startTimeRef.current,
      endDate: endTime,
      distance: Math.max(0, finalDistanceMeters),
      calories,
      routeCoordinates: finalRouteCoordinates,
    };

    return {
      endTime,
      duration,
      pace,
      finalDistanceMeters,
      calories,
      finalRouteCoordinates,
      workoutPayload,
      result: {
        distance: formatDistance(finalDistanceMeters),
        pace,
        duration: formatDuration(duration),
      },
    };
  };

  const handleSaveRunRecord = async () => {
    if (!pendingFinishData || isSavingRun) return;
    setIsSavingRun(true);

    const {
      endTime,
      duration,
      pace,
      finalDistanceMeters,
      calories,
      finalRouteCoordinates,
      workoutPayload,
      result,
    } = pendingFinishData;

    let saveStatus = 'success';
    try {
      await runOnRunningService.addRecord({
        id: `runon-${startTimeRef.current.getTime()}`,
        startTime: startTimeRef.current.toISOString(),
        endTime: endTime.toISOString(),
        distanceMeters: finalDistanceMeters,
        durationSeconds: duration,
        pace,
        duration: (() => {
          const hours = Math.floor(duration / 3600);
          const minutes = Math.floor((duration % 3600) / 60);
          const seconds = duration % 60;
          if (hours > 0) return `${hours}h ${minutes}m`;
          if (minutes > 0) return `${minutes}m ${seconds}s`;
          return `${seconds}s`;
        })(),
        calories,
        routeCoordinates: finalRouteCoordinates,
      });
    } catch (error) {
      console.error('❌ RunOn 로컬 기록 저장 실패:', error);
    }

    const appleSvc = getAppleFitnessService();
    if (Platform.OS === 'ios' && appleSvc) {
      try {
        await appleSvc.saveWorkout(workoutPayload);
      } catch (error) {
        console.error('❌ HealthKit 저장 실패:', error);
        saveStatus = 'failed';
      }
    }

    setIsSavingRun(false);
    setShowFinishConfirmModal(false);
    setPendingFinishData(null);

    navigation.replace('RunningResult', {
      result,
      workoutPayload: {
        ...workoutPayload,
        startDate: workoutPayload.startDate.toISOString(),
        endDate: workoutPayload.endDate.toISOString(),
      },
      saveStatus,
    });
  };

  const handleDiscardRunRecord = () => {
    setShowFinishConfirmModal(false);
    setPendingFinishData(null);
    navigation.goBack();
  };

  const handleEnd = async () => {
    if (isGpsPreparing || !hasStartedRun) return;
    if (endedRef.current) return;
    endedRef.current = true;
    setIsRunFinished(true);
    locationWatcherRef.current?.remove();
    locationWatcherRef.current = null;
    if (sessionSaveTimerRef.current) {
      clearTimeout(sessionSaveTimerRef.current);
      sessionSaveTimerRef.current = null;
    }
    await backgroundLocationService.stop().catch(() => {});
    await runningTrackingSessionService.clear().catch(() => {});
    const finalizedData = await buildFinalizedRunData();
    setPendingFinishData(finalizedData);
    setShowFinishConfirmModal(true);
  };

  useEffect(() => {
    if (!hasStartedRun || endedRef.current) return undefined;
    const timer = setInterval(() => {
      backgroundLocationService.consumeBufferedLocations()
        .then((items) => processBufferedLocations(items))
        .catch(() => {});
    }, 2000);
    return () => clearInterval(timer);
  }, [hasStartedRun]);

  const finishMapCoordinates = toMapCoords(pendingFinishData?.finalRouteCoordinates || []);

  return (
    <View style={styles.container}>
      <View style={styles.fullMapWrap}>
        <MapView
          ref={runningMapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.runningMapWebView}
          initialRegion={{
            latitude: preStartCurrentLocation?.latitude ?? 37.5665,
            longitude: preStartCurrentLocation?.longitude ?? 126.9780,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          mapType="standard"
          onMapReady={() => setRunningMapStatus('ready')}
        >
          {mapCoords.length >= 2 && (
            <Polyline
              coordinates={mapCoords}
              strokeColor="#3AF8FF"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
          )}
          {mapCoords.length >= 1 && (
            <Marker coordinate={mapCoords[0]} tracksViewChanges={markersTrackViewChanges} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.runMarkerStart} />
            </Marker>
          )}
          {isRunFinished && mapCoords.length >= 1 && (
            <Marker coordinate={mapCoords[mapCoords.length - 1]} tracksViewChanges={markersTrackViewChanges} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.runMarkerEnd} />
            </Marker>
          )}
          {mapCurrentLocation && (
            <Marker coordinate={mapCurrentLocation} tracksViewChanges={markersTrackViewChanges} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.runMarkerCurrent} />
            </Marker>
          )}
        </MapView>
      </View>

      {(runningMapStatus !== 'ready' || isGpsPreparing || showGpsReadyFeedback) && (
        <View
          style={[
            styles.mapLoadingOverlay,
            runningMapStatus === 'error' && styles.mapErrorOverlay,
          ]}
          pointerEvents="box-none"
        >
          {isGpsPreparing ? (
            <View style={styles.gpsPreparingWrap}>
              <Text style={[styles.mapPlaceholderText, styles.gpsPreparingText]}>GPS 수신 확인중...</Text>
              <Text style={styles.gpsPreparingSubText}>정확한 시작 위치를 확인하고 있어요</Text>
            </View>
          ) : showGpsReadyFeedback ? (
            <View style={styles.gpsReadyFeedbackWrap}>
              <Ionicons name="checkmark-circle" size={42} color={colors.PRIMARY} />
              <Text style={styles.gpsReadyFeedbackText}>GPS 수신 완료</Text>
            </View>
          ) : (
            <Text style={styles.mapPlaceholderText}>
              {runningMapStatus === 'error'
                ? `지도 로드 실패: ${runningMapError || '알 수 없는 오류'}`
                : '카카오맵 로딩 중...'}
            </Text>
          )}
        </View>
      )}

      {/* 백그라운드 위치 권한 미허용 경고 */}
      {!bgPermissionGranted && hasStartedRun && !isRunFinished && (
        <TouchableOpacity
          style={styles.bgPermissionWarning}
          onPress={() => Linking.openSettings()}
          activeOpacity={0.8}
        >
          <Ionicons name="warning-outline" size={15} color="#FF9F0A" style={{ marginRight: 5 }} />
          <Text style={styles.bgPermissionWarningText}>
            화면 OFF 시 거리 측정 불가 — 설정에서 위치 권한을 <Text style={{ fontWeight: '800' }}>"항상 허용"</Text>으로 변경해주세요
          </Text>
        </TouchableOpacity>
      )}

      <View style={[styles.bottomModal, { bottom: 24 + Math.max(insets.bottom, 0) }]}>
        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>시간</Text>
            <Text style={styles.metricValue}>{formatDuration(elapsedSeconds)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>거리</Text>
            <Text style={styles.metricValue}>{formatDistance(distanceMeters)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>현재 페이스</Text>
            <Text style={styles.metricValue}>{currentPaceText}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>평균 페이스</Text>
            <Text style={styles.metricValue}>{averagePaceText}</Text>
          </View>
        </View>
        <View style={styles.actionRow}>
          {!hasStartedRun ? (
            <>
              <TouchableOpacity
                style={[
                  styles.startButton,
                  (isGpsPreparing || isStartingRun) && styles.disabledActionButton,
                ]}
                onPress={handleStartRun}
                disabled={isGpsPreparing || isStartingRun}
              >
                {isStartingRun ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <Ionicons name="play" size={18} color="#000000" />
                    <Text style={styles.startButtonText}>러닝 시작</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.endButton}
                onPress={handleExitBeforeStart}
              >
                <Ionicons name="stop" size={18} color="#ffffff" />
                <Text style={styles.endButtonText}>러닝 종료</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.pauseButton, isGpsPreparing && styles.disabledActionButton]}
                onPress={handlePauseResume}
                disabled={isGpsPreparing}
              >
                <Ionicons name={isPaused ? 'play' : 'pause'} size={18} color="#000000" />
                <Text style={styles.pauseButtonText}>{isPaused ? '재개' : '일시정지'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.endButton, isGpsPreparing && styles.disabledActionButton]}
                onPress={handleEnd}
                disabled={isGpsPreparing}
              >
                <Ionicons name="stop" size={18} color="#ffffff" />
                <Text style={styles.endButtonText}>종료</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {runningMapStatus === 'error' && !isGpsPreparing && (
          <TouchableOpacity style={styles.mapRetryButton} onPress={handleRetryRunningMap}>
            <Text style={styles.mapRetryButtonText}>지도 다시 시도</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showFinishConfirmModal} transparent animationType="fade" onRequestClose={handleDiscardRunRecord}>
        <View style={styles.finishModalOverlay}>
          <View style={styles.finishModalCard}>
            <Text style={styles.finishModalTitle}>러닝 기록을 저장할까요?</Text>
            <View style={styles.finishMetricRow}>
              <View style={styles.finishMetricItem}>
                <Text style={styles.finishMetricLabel}>시간</Text>
                <Text style={styles.finishMetricValue}>{pendingFinishData?.result?.duration || '00:00'}</Text>
              </View>
              <View style={styles.finishMetricItem}>
                <Text style={styles.finishMetricLabel}>거리</Text>
                <Text style={styles.finishMetricValue}>{pendingFinishData?.result?.distance || '0m'}</Text>
              </View>
              <View style={styles.finishMetricItem}>
                <Text style={styles.finishMetricLabel}>페이스</Text>
                <Text style={styles.finishMetricValue}>{pendingFinishData?.result?.pace || '0:00/km'}</Text>
              </View>
            </View>

            <View style={styles.finishRouteWrap}>
              {finishMapCoordinates.length >= 2 ? (
                <RouteMap
                  coordinates={finishMapCoordinates}
                  width={300}
                  height={172}
                  debugTag="finish-modal"
                />
              ) : (
                <Text style={styles.finishRoutePlaceholder}>이동 경로 데이터가 없습니다.</Text>
              )}
            </View>

            <View style={styles.finishActionRow}>
              <TouchableOpacity
                style={[styles.finishActionButton, styles.finishDeleteButton]}
                onPress={handleDiscardRunRecord}
                disabled={isSavingRun}
              >
                <Text style={styles.finishDeleteButtonText}>삭제</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.finishActionButton, styles.finishSaveButton, isSavingRun && styles.disabledActionButton]}
                onPress={handleSaveRunRecord}
                disabled={isSavingRun}
              >
                {isSavingRun ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={styles.finishSaveButtonText}>저장</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
  },
  fullMapWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#101014', // intentional: map tile placeholder, immersive dark — keep
  },
  bottomModal: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.BORDER,
    backgroundColor: 'rgba(20,20,24,0.94)', // intentional: glass HUD overlay on fullscreen map — keep dark
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    zIndex: 6,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    color: colors.TEXT_SECONDARY,
    fontSize: 11,
    marginBottom: 6,
  },
  metricValue: {
    color: colors.TEXT,
    fontSize: 19,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  runningMapWebView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#101014', // intentional: map tile placeholder, immersive dark — keep
  },
  runMarkerCurrent: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3AF8FF', // intentional: GPS map marker accent color — keep
    borderWidth: 2.5,
    borderColor: '#fff', // intentional: marker border always white — keep
  },
  runMarkerStart: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00C853', // intentional: map start marker green — keep
    borderWidth: 2,
    borderColor: '#fff', // intentional: marker border always white — keep
  },
  runMarkerEnd: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF3B30', // intentional: map end marker red — keep
    borderWidth: 2,
    borderColor: '#fff', // intentional: marker border always white — keep
  },
  mapLoadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,16,20,0.5)', // intentional: fullscreen dim overlay on map — keep
    zIndex: 7,
    paddingHorizontal: 18,
  },
  mapErrorOverlay: {
    backgroundColor: 'rgba(16,16,20,0.18)', // intentional: immersive map overlay — keep
  },
  mapPlaceholderText: {
    color: colors.TEXT_SECONDARY,
    fontSize: 13,
    textAlign: 'center',
  },
  gpsPreparingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsPreparingText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#ECFCFF', // intentional: light text on immersive dark glass overlay — keep
    marginBottom: 6,
  },
  gpsPreparingSubText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#BBD2D6', // intentional: light subtext on immersive dark overlay — keep
    textAlign: 'center',
  },
  gpsReadyFeedbackWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsReadyFeedbackText: {
    marginTop: 6,
    color: '#D8FCFF', // intentional: light text on immersive map overlay — keep
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  pauseButton: {
    flex: 1,
    backgroundColor: colors.PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  startButton: {
    flex: 1,
    backgroundColor: colors.PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  startButtonText: {
    color: '#000000', // intentional: black text on PRIMARY (cyan) button — keep
    fontSize: 16,
    fontWeight: '800',
  },
  pauseButtonText: {
    color: '#000000', // intentional: black text on PRIMARY (cyan) button — keep
    fontSize: 16,
    fontWeight: '700',
  },
  endButton: {
    flex: 1,
    backgroundColor: colors.ERROR,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  endButtonText: {
    color: '#ffffff', // intentional: white text on ERROR (red) button — keep
    fontSize: 16,
    fontWeight: '700',
  },
  disabledActionButton: {
    opacity: 0.45,
  },
  bgPermissionWarning: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 170,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40,32,0,0.92)', // intentional: semantic amber warning — keep
    borderWidth: 1,
    borderColor: '#FF9F0A', // intentional: amber warning border — keep
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    zIndex: 10,
  },
  bgPermissionWarningText: {
    flex: 1,
    color: '#FFD966', // intentional: amber warning text — keep
    fontSize: 11.5,
    lineHeight: 16,
  },
  mapRetryButton: {
    marginTop: 10,
    alignSelf: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A3A40', // intentional: button inside immersive map area — keep dark
    backgroundColor: '#222229', // intentional: dark button on map area — keep
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  mapRetryButtonText: {
    color: '#E7E7EC', // intentional: light text on dark map area button — keep
    fontSize: 12,
    fontWeight: '600',
  },
  finishModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)', // intentional: standard modal dim — keep
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  finishModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.BORDER,
    backgroundColor: colors.SURFACE,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  finishModalTitle: {
    color: colors.TEXT,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  finishMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  finishMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  finishMetricLabel: {
    color: colors.TEXT_SECONDARY,
    fontSize: 12,
    marginBottom: 4,
  },
  finishMetricValue: {
    color: colors.TEXT,
    fontSize: 20,
    fontWeight: '700',
  },
  finishRouteWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.BORDER,
    backgroundColor: '#101014', // intentional: map preview container, always dark — keep
    height: 172,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  finishRoutePlaceholder: {
    color: colors.TEXT_SECONDARY,
    fontSize: 12,
    textAlign: 'center',
  },
  finishActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  finishActionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishDeleteButton: {
    backgroundColor: colors.CARD,
    borderWidth: 1,
    borderColor: colors.BORDER,
  },
  finishDeleteButtonText: {
    color: colors.TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  finishSaveButton: {
    backgroundColor: colors.PRIMARY,
  },
  finishSaveButtonText: {
    color: '#000000', // intentional: black text on PRIMARY (cyan) button — keep
    fontSize: 14,
    fontWeight: '800',
  },
});

export default RunningTrackerScreen;
