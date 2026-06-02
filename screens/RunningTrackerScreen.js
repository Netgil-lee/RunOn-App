import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ActivityIndicator, AppState, Linking, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import appleFitnessService from '../services/appleFitnessService';
import runOnRunningService from '../services/runOnRunningService';
import nativeRunningService from '../services/nativeRunningService';
import runningTrackingSessionService from '../services/runningTrackingSessionService';
import RouteMap from '../components/RouteMap';
import ENV from '../config/environment';

const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  TEXT: '#ffffff',
  SECONDARY: '#9A9AA0',
  DANGER: '#FF4D4F',
};

const GPS_START_CACHE_MAX_AGE_MS = 15000;
const START_COUNTDOWN_INTERVAL_MS = 700;

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

const estimateCalories = (durationSeconds, weightKg = 70) => {
  const MET = 9.0;
  const hours = durationSeconds / 3600;
  return Math.max(0, Math.round(MET * weightKg * hours));
};

const calcPathDistanceMeters = (coordinates = []) => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
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

const GPS_READY_BEEP_URI_1S = 'data:audio/wav;base64,UklGRmQfAABXQVZFZm10IBAAAAABAAEAoA8AAEAfAAACABAAZGF0YUAfAAAAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00wAAzCwAADTTAADMLAAANNMAAMwsAAA00w==';

const RunningTrackerScreen = ({ navigation }) => {
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
  const [runningMapStatus, setRunningMapStatus] = useState('loading');
  const [runningMapError, setRunningMapError] = useState('');
  const [runningMapReloadKey, setRunningMapReloadKey] = useState(0);
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false);
  const [pendingFinishData, setPendingFinishData] = useState(null);
  const [isSavingRun, setIsSavingRun] = useState(false);
  const [startCountdownNumber, setStartCountdownNumber] = useState(null);
  const [bgPermissionGranted, setBgPermissionGranted] = useState(true);

  const runningMapWebViewRef = useRef(null);
  const isRunningMapLoadedRef = useRef(false);
  const pendingMapPayloadRef = useRef(null);

  const startTimeRef = useRef(new Date());
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
  const gpsDotAnimValuesRef = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);
  const gpsDotLoopsRef = useRef([]);
  const startTransitionAnimRef = useRef(new Animated.Value(0));
  const activeSessionIdRef = useRef(null);
  const sessionSaveTimerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const isRecoveryActiveRef = useRef(false);

  const averagePaceText = useMemo(
    () => formatPace(distanceMeters, elapsedSeconds),
    [distanceMeters, elapsedSeconds]
  );
  const startTransitionAnim = startTransitionAnimRef.current;

  // ─── 지도 경로 2초 주기 업데이트 ─────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      const nextRoute = routeCoordinatesRef.current || [];
      setMapRouteCoordinates(nextRoute.length > 0 ? [...nextRoute] : []);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const createRunningMapHTML = useMemo(() => {
    const kakaoApiKey = ENV.kakaoMapApiKey;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <style>
            html, body, #map {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              background: #101014;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = null;
            var polyline = null;
            var currentMarker = null;
            var startMarker = null;
            var endMarker = null;
            var mapReady = false;

            function createMarkerImage(fillColor) {
              var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">' +
                '<circle cx="13" cy="13" r="10" fill="' + fillColor + '" stroke="#fff" stroke-width="3"/>' +
                '</svg>';
              return new kakao.maps.MarkerImage(
                'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
                new kakao.maps.Size(26, 26),
                { offset: new kakao.maps.Point(13, 13) }
              );
            }

            function initMap() {
              try {
                var container = document.getElementById('map');
                var options = {
                  center: new kakao.maps.LatLng(37.5665, 126.9780),
                  level: 4,
                };
                map = new kakao.maps.Map(container, options);
                map.setZoomable(false);
                mapReady = true;
                postToRN('runningMapLoaded');
              } catch (error) {
                postToRN('runningMapError:MAP_INIT_FAILED');
              }
            }

            function postToRN(msg) {
              try {
                window.ReactNativeWebView.postMessage(msg);
              } catch(e) {}
            }

            document.addEventListener('message', handleMessage);
            window.addEventListener('message', handleMessage);

            function handleMessage(event) {
              try {
                var payload = JSON.parse(event.data);
                if (!mapReady || !map) return;

                if (payload.type === 'updateRunningRoute') {
                  var coords = payload.routeCoordinates || [];
                  var currentLoc = payload.currentLocation;
                  var isFinished = payload.isFinished;
                  var shouldFollow = payload.shouldFollowCamera;

                  if (coords.length >= 2) {
                    var path = coords.map(function(c) {
                      return new kakao.maps.LatLng(c.latitude, c.longitude);
                    });

                    if (!polyline) {
                      polyline = new kakao.maps.Polyline({
                        map: map,
                        path: path,
                        strokeWeight: 5,
                        strokeColor: '#3AF8FF',
                        strokeOpacity: 0.95,
                        strokeStyle: 'solid',
                      });
                    } else {
                      polyline.setPath(path);
                    }

                    if (!startMarker) {
                      startMarker = new kakao.maps.Marker({
                        map: map,
                        position: path[0],
                        image: createMarkerImage('#00C853'),
                      });
                    }

                    if (isFinished && !endMarker && coords.length >= 1) {
                      var lastCoord = coords[coords.length - 1];
                      endMarker = new kakao.maps.Marker({
                        map: map,
                        position: new kakao.maps.LatLng(lastCoord.latitude, lastCoord.longitude),
                        image: createMarkerImage('#FF3B30'),
                      });
                    }
                  }

                  if (currentLoc) {
                    var currentLatLng = new kakao.maps.LatLng(currentLoc.latitude, currentLoc.longitude);
                    if (!currentMarker) {
                      currentMarker = new kakao.maps.Marker({
                        map: map,
                        position: currentLatLng,
                        image: createMarkerImage('#3AF8FF'),
                      });
                    } else {
                      currentMarker.setPosition(currentLatLng);
                    }
                    if (shouldFollow) {
                      map.setCenter(currentLatLng);
                    }
                  }
                }
              } catch(e) {}
            }

            (function() {
              try {
                var sdk = document.createElement('script');
                sdk.type = 'text/javascript';
                sdk.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&autoload=false';
                sdk.onload = function() {
                  kakao.maps.load(initMap);
                };
                sdk.onerror = function() {
                  postToRN('runningMapError:SDK_LOAD_FAILED');
                };
                document.head.appendChild(sdk);
              } catch (error) {
                postToRN('runningMapError:' + (error && error.message ? error.message : 'SDK_LOAD_EXCEPTION'));
              }
            })();

            setTimeout(function() {
              if (!mapReady) {
                postToRN('runningMapError:MAP_LOAD_TIMEOUT');
              }
            }, 7000);
          </script>
        </body>
      </html>
    `;
  }, []);

  const postRunningMapPayload = (payload) => {
    if (!runningMapWebViewRef.current) return;
    if (!isRunningMapLoadedRef.current) {
      pendingMapPayloadRef.current = payload;
      return;
    }
    runningMapWebViewRef.current.postMessage(JSON.stringify(payload));
  };

  useEffect(() => {
    const normalizedCoords = toMapCoords(mapRouteCoordinates);
    const currentLocation = normalizedCoords.length > 0
      ? normalizedCoords[normalizedCoords.length - 1]
      : (!hasStartedRun ? preStartCurrentLocation : null);
    const shouldFollowCamera = !isPaused && !isRunFinished;

    postRunningMapPayload({
      type: 'updateRunningRoute',
      routeCoordinates: normalizedCoords,
      currentLocation,
      isFinished: isRunFinished,
      shouldFollowCamera,
    });
  }, [mapRouteCoordinates, isPaused, isRunFinished, hasStartedRun, preStartCurrentLocation]);

  const handleRunningMapMessage = (event) => {
    const data = event?.nativeEvent?.data;
    if (data === 'runningMapLoaded') {
      isRunningMapLoadedRef.current = true;
      setRunningMapStatus('ready');
      setRunningMapError('');
      if (pendingMapPayloadRef.current && runningMapWebViewRef.current) {
        runningMapWebViewRef.current.postMessage(JSON.stringify(pendingMapPayloadRef.current));
        pendingMapPayloadRef.current = null;
      }
      return;
    }
    if (typeof data === 'string' && data.startsWith('runningMapError:')) {
      const errorMessage = data.replace('runningMapError:', '').trim() || 'MAP_UNKNOWN_ERROR';
      setRunningMapStatus('error');
      setRunningMapError(errorMessage);
    }
  };

  const playGpsReadyBeep = async () => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: GPS_READY_BEEP_URI_1S },
        { shouldPlay: true, volume: 1.0, isLooping: false }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status?.didJustFinish) sound.unloadAsync().catch(() => {});
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
    if (gpsReadyFeedbackTimerRef.current) clearTimeout(gpsReadyFeedbackTimerRef.current);
    gpsReadyFeedbackTimerRef.current = setTimeout(() => {
      setShowGpsReadyFeedback(false);
      gpsReadyFeedbackTimerRef.current = null;
    }, 1400);
  };

  // ─── 타이머 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      if (!hasStartedRun) {
        setElapsedSeconds(0);
        return;
      }
      if (isPausedRef.current) return;
      const now = Date.now();
      const started = runStartedAtMsRef.current || now;
      const rawElapsed = now - started - totalPausedMsRef.current;
      setElapsedSeconds(Math.max(0, Math.floor(rawElapsed / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStartedRun]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // ─── 시작 전환 애니메이션 ─────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(startTransitionAnim, {
      toValue: hasStartedRun ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [hasStartedRun, startTransitionAnim]);

  // ─── GPS 준비 중 점 애니메이션 ────────────────────────────────────────────
  useEffect(() => {
    gpsDotLoopsRef.current.forEach((loop) => loop?.stop?.());
    gpsDotLoopsRef.current = [];

    if (!isGpsPreparing) {
      gpsDotAnimValuesRef.current.forEach((value) => value.setValue(0));
      return undefined;
    }

    const makeLoop = (animatedValue, delayMs) => Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(animatedValue, { toValue: 1, duration: 210, useNativeDriver: false }),
        Animated.timing(animatedValue, { toValue: 0, duration: 210, useNativeDriver: false }),
      ])
    );

    const loops = gpsDotAnimValuesRef.current.map((value, index) => makeLoop(value, index * 120));
    gpsDotLoopsRef.current = loops;
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [isGpsPreparing]);

  // ─── 네이티브 러닝 이벤트 구독 ────────────────────────────────────────────
  useEffect(() => {
    if (!hasStartedRun) return undefined;

    const locationSub = nativeRunningService.onLocationUpdate((event) => {
      if (endedRef.current) return;
      const { latitude, longitude, deltaMeters = 0, currentPaceText: paceText } = event;
      const coord = { latitude, longitude };

      if (!isPausedRef.current && deltaMeters > 0) {
        distanceMetersRef.current += deltaMeters;
        setDistanceMeters(distanceMetersRef.current);
        setCurrentPaceText(paceText || '--:--/km');

        routeCoordinatesRef.current = [...routeCoordinatesRef.current, coord];
        setRouteCoordinates(routeCoordinatesRef.current);

        // 5초 debounce 세션 저장
        if (sessionSaveTimerRef.current) clearTimeout(sessionSaveTimerRef.current);
        sessionSaveTimerRef.current = setTimeout(() => {
          runningTrackingSessionService.update({
            distanceMeters: distanceMetersRef.current,
            totalPausedMs: totalPausedMsRef.current,
            isPaused: isPausedRef.current,
            pauseStartedAtMs: pauseStartedAtMsRef.current,
            lastCoord: coord,
          }).catch(() => {});
          sessionSaveTimerRef.current = null;
        }, 5000);
      }
    });

    const errorSub = nativeRunningService.onTrackingError((event) => {
      console.warn('⚠️ 네이티브 러닝 추적 오류:', event?.message);
    });

    return () => {
      locationSub.remove();
      errorSub.remove();
    };
  }, [hasStartedRun]);

  // ─── 화면 진입 시 중단된 세션 복구 ──────────────────────────────────────
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
              await nativeRunningService.stopTracking().catch(() => {});
            },
          },
          {
            text: '이어서 기록',
            onPress: async () => {
              isRecoveryActiveRef.current = true;

              activeSessionIdRef.current = sessionId;
              runStartedAtMsRef.current = startedAtMs;
              startTimeRef.current = new Date(startedAtMs);
              totalPausedMsRef.current = totalPausedMs;
              distanceMetersRef.current = savedDistance;
              setDistanceMeters(savedDistance);
              endedRef.current = false;
              setIsRunFinished(false);
              isPausedRef.current = wasPaused;
              setIsPaused(wasPaused);
              pauseStartedAtMsRef.current = wasPaused ? Date.now() : null;

              if (lastCoord) {
                routeCoordinatesRef.current = [lastCoord];
                setRouteCoordinates([lastCoord]);
                setMapRouteCoordinates([lastCoord]);
                setPreStartCurrentLocation(lastCoord);
              }

              await nativeRunningService.startTracking();
              if (wasPaused) await nativeRunningService.pauseTracking();

              setIsGpsPreparing(false);
              setHasStartedRun(true);
            },
          },
        ]
      );
    };

    checkForRecovery().catch(() => {});
  }, []);

  // ─── GPS 준비 ─────────────────────────────────────────────────────────────
  useEffect(() => {
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

      if (isRecoveryActiveRef.current) {
        setIsGpsPreparing(false);
        return;
      }

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
      if (gpsReadyFeedbackTimerRef.current) {
        clearTimeout(gpsReadyFeedbackTimerRef.current);
        gpsReadyFeedbackTimerRef.current = null;
      }
      if (sessionSaveTimerRef.current) {
        clearTimeout(sessionSaveTimerRef.current);
        sessionSaveTimerRef.current = null;
      }
      nativeRunningService.stopTracking().catch(() => {});
    };
  }, [navigation]);

  // ─── 러닝 시작 ────────────────────────────────────────────────────────────
  const startRunTracking = async () => {
    if (hasStartedRun || isGpsPreparing || isStartingRun) return;
    setIsStartingRun(true);
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
        } catch {
          // 짧은 재조회 실패 시 마지막 알려진 좌표 사용
        }
      }

      if (!initialCoord) {
        const fallbackPosition = await Location.getLastKnownPositionAsync({
          maxAge: 20000,
          requiredAccuracy: 120,
        });
        if (fallbackPosition?.coords) {
          initialCoord = {
            latitude: fallbackPosition.coords.latitude,
            longitude: fallbackPosition.coords.longitude,
          };
        }
      }

      if (!initialCoord) throw new Error('START_POSITION_UNAVAILABLE');

      // 백그라운드 권한 확인 (네이티브 모듈의 allowsBackgroundLocationUpdates 에 필요)
      const bgPermission = await Location.getBackgroundPermissionsAsync();
      if (!bgPermission?.granted) {
        setBgPermissionGranted(false);
        Alert.alert(
          '백그라운드 위치 권한 필요',
          '화면이 꺼진 상태에서도 정확한 거리/경로 측정을 위해 위치 권한을 "항상 허용"으로 설정해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      setBgPermissionGranted(true);

      // 상태 초기화
      endedRef.current = false;
      setIsRunFinished(false);
      setIsPaused(false);
      isPausedRef.current = false;
      setElapsedSeconds(0);
      setDistanceMeters(0);
      setCurrentPaceText('--:--/km');
      distanceMetersRef.current = 0;
      totalPausedMsRef.current = 0;
      pauseStartedAtMsRef.current = null;
      runStartedAtMsRef.current = sessionStartMs;
      startTimeRef.current = new Date(sessionStartMs);
      routeCoordinatesRef.current = [initialCoord];
      setRouteCoordinates([initialCoord]);
      setMapRouteCoordinates([initialCoord]);
      setPreStartCurrentLocation(initialCoord);
      activeSessionIdRef.current = `run-${sessionStartMs}`;

      await runningTrackingSessionService.save({
        sessionId: activeSessionIdRef.current,
        startedAtMs: sessionStartMs,
        totalPausedMs: 0,
        distanceMeters: 0,
        isPaused: false,
        pauseStartedAtMs: null,
        lastCoord: initialCoord,
      });

      // 네이티브 모듈 시작 (포그라운드+백그라운드 CLLocationManager)
      await nativeRunningService.startTracking();
      setHasStartedRun(true);
    } catch (error) {
      console.error('❌ 러닝 시작 실패:', error);
      Alert.alert('오류', '러닝 시작에 실패했습니다. GPS 상태를 확인 후 다시 시도해주세요.');
    } finally {
      setIsStartingRun(false);
    }
  };

  const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleStartRun = async () => {
    if (hasStartedRun || isGpsPreparing || isStartingRun || startCountdownNumber !== null) return;
    for (let value = 3; value >= 1; value -= 1) {
      setStartCountdownNumber(value);
      await waitMs(START_COUNTDOWN_INTERVAL_MS);
    }
    setStartCountdownNumber(null);
    await startRunTracking();
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
        setCurrentPaceText('--:--/km');
        nativeRunningService.pauseTracking().catch(() => {});
      } else {
        if (pauseStartedAtMsRef.current) {
          totalPausedMsRef.current += Date.now() - pauseStartedAtMsRef.current;
          pauseStartedAtMsRef.current = null;
        }
        nativeRunningService.resumeTracking().catch(() => {});
      }
      runningTrackingSessionService.update({
        isPaused: next,
        pauseStartedAtMs: next ? pauseStartedAtMsRef.current : null,
        totalPausedMs: totalPausedMsRef.current,
      }).catch(() => {});
      return next;
    });
  };

  const handleRetryRunningMap = () => {
    isRunningMapLoadedRef.current = false;
    pendingMapPayloadRef.current = null;
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
    } catch {
      // 마지막 좌표 확보 실패 시 기존 추적값 사용
    }

    const refDistance = Math.max(0, Number(distanceMetersRef.current || 0));
    const pathDistance = calcPathDistanceMeters(finalRouteCoordinates);
    let finalDistanceMeters = Math.max(refDistance, pathDistance);

    if (finalDistanceMeters < 1 && duration >= 15 && finalRouteCoordinates.length >= 2) {
      const firstCoord = finalRouteCoordinates[0];
      const lastCoord = finalRouteCoordinates[finalRouteCoordinates.length - 1];
      const displacement = calcDistanceMeters(firstCoord, lastCoord);
      if (displacement > 5) finalDistanceMeters = displacement;
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

    const { endTime, duration, pace, finalDistanceMeters, calories, finalRouteCoordinates, workoutPayload, result } = pendingFinishData;

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

    try {
      await appleFitnessService.saveWorkout(workoutPayload);
    } catch (error) {
      console.error('❌ HealthKit 저장 실패:', error);
      saveStatus = 'failed';
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
    if (sessionSaveTimerRef.current) {
      clearTimeout(sessionSaveTimerRef.current);
      sessionSaveTimerRef.current = null;
    }
    await nativeRunningService.stopTracking().catch(() => {});
    await runningTrackingSessionService.clear().catch(() => {});
    const finalizedData = await buildFinalizedRunData();
    setPendingFinishData(finalizedData);
    setShowFinishConfirmModal(true);
  };

  const finishMapCoordinates = toMapCoords(pendingFinishData?.finalRouteCoordinates || []);
  const preStartControlsOpacity = startTransitionAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const runningControlsOpacity = startTransitionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const preStartControlsTranslateY = startTransitionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] });
  const runningControlsTranslateY = startTransitionAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  const bottomModalTranslateY = startTransitionAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });
  const bottomModalOpacity = startTransitionAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  return (
    <View style={styles.container}>
      <View style={styles.fullMapWrap}>
        <WebView
          key={`running-map-${runningMapReloadKey}`}
          ref={runningMapWebViewRef}
          source={{ html: createRunningMapHTML }}
          style={styles.runningMapWebView}
          onMessage={handleRunningMapMessage}
          onError={() => {
            setRunningMapStatus('error');
            setRunningMapError('WEBVIEW_LOAD_ERROR');
          }}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
          scrollEnabled={false}
          bounces={false}
        />
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
            <View style={styles.gpsPreparingGlassCard}>
              <Text style={styles.gpsPreparingText}>위치 확인 중</Text>
              <View style={styles.gpsLoadingDotsRow}>
                {gpsDotAnimValuesRef.current.map((value, index) => (
                  <Animated.View
                    key={`gps-loading-dot-${index}`}
                    style={[
                      styles.gpsLoadingDot,
                      {
                        transform: [{
                          scale: value.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.35],
                          }),
                        }],
                        backgroundColor: value.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['#FFFFFF', COLORS.PRIMARY],
                        }),
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : showGpsReadyFeedback ? (
            <View style={styles.gpsReadyFeedbackWrap}>
              <Ionicons name="checkmark-circle" size={42} color={COLORS.PRIMARY} />
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

      <Animated.View
        style={[
          styles.bottomModal,
          {
            opacity: bottomModalOpacity,
            transform: [{ translateY: bottomModalTranslateY }],
          },
        ]}
      >
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
          <Animated.View
            pointerEvents={hasStartedRun ? 'none' : 'auto'}
            style={[
              styles.actionLayer,
              {
                opacity: preStartControlsOpacity,
                transform: [{ translateY: preStartControlsTranslateY }],
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.startButton,
                (isGpsPreparing || isStartingRun || startCountdownNumber !== null) && styles.disabledActionButton,
              ]}
              onPress={handleStartRun}
              disabled={isGpsPreparing || isStartingRun || startCountdownNumber !== null}
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
              disabled={startCountdownNumber !== null}
            >
              <Ionicons name="stop" size={18} color="#000000" />
              <Text style={styles.endButtonText}>러닝 종료</Text>
            </TouchableOpacity>
          </Animated.View>
          <Animated.View
            pointerEvents={hasStartedRun ? 'auto' : 'none'}
            style={[
              styles.actionLayer,
              {
                opacity: runningControlsOpacity,
                transform: [{ translateY: runningControlsTranslateY }],
              },
            ]}
          >
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
              <Ionicons name="stop" size={18} color="#000000" />
              <Text style={styles.endButtonText}>종료</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
        {runningMapStatus === 'error' && !isGpsPreparing && (
          <TouchableOpacity style={styles.mapRetryButton} onPress={handleRetryRunningMap}>
            <Text style={styles.mapRetryButtonText}>지도 다시 시도</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {startCountdownNumber !== null && (
        <View style={styles.startCountdownOverlay} pointerEvents="auto">
          <View style={styles.startCountdownCard}>
            <Text style={styles.startCountdownNumber}>{startCountdownNumber}</Text>
          </View>
        </View>
      )}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  fullMapWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#101014',
  },
  bottomModal: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D34',
    backgroundColor: 'rgba(20,20,24,0.94)',
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
    color: COLORS.SECONDARY,
    fontSize: 11,
    marginBottom: 6,
  },
  metricValue: {
    color: COLORS.TEXT,
    fontSize: 19,
    fontWeight: '700',
  },
  actionRow: {
    position: 'relative',
    minHeight: 56,
  },
  actionLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    gap: 12,
  },
  runningMapWebView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#101014',
  },
  mapLoadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,16,20,0.5)',
    zIndex: 7,
    paddingHorizontal: 18,
  },
  mapErrorOverlay: {
    backgroundColor: 'rgba(16,16,20,0.18)',
  },
  mapPlaceholderText: {
    color: '#C8C8CF',
    fontSize: 13,
    textAlign: 'center',
  },
  gpsPreparingGlassCard: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 190,
    minHeight: 76,
    borderRadius: 20,
    backgroundColor: 'rgba(20,20,24,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  gpsPreparingText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ECFCFF',
    marginBottom: 10,
  },
  gpsLoadingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gpsLoadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  gpsReadyFeedbackWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsReadyFeedbackText: {
    marginTop: 6,
    color: '#D8FCFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  pauseButton: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  startButton: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  startButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  pauseButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  endButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  endButtonText: {
    color: '#000000',
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
    backgroundColor: 'rgba(40,32,0,0.92)',
    borderWidth: 1,
    borderColor: '#FF9F0A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    zIndex: 10,
  },
  bgPermissionWarningText: {
    flex: 1,
    color: '#FFD966',
    fontSize: 11.5,
    lineHeight: 16,
  },
  mapRetryButton: {
    marginTop: 10,
    alignSelf: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A3A40',
    backgroundColor: '#222229',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  mapRetryButtonText: {
    color: '#E7E7EC',
    fontSize: 12,
    fontWeight: '600',
  },
  startCountdownOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,12,0.42)',
    zIndex: 11,
  },
  startCountdownCard: {
    width: 104,
    height: 104,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,20,24,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  startCountdownNumber: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  finishModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  finishModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#303038',
    backgroundColor: '#17171C',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  finishModalTitle: {
    color: '#FFFFFF',
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
    color: '#9A9AA0',
    fontSize: 12,
    marginBottom: 4,
  },
  finishMetricValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  finishRouteWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E2E35',
    backgroundColor: '#101014',
    height: 172,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  finishRoutePlaceholder: {
    color: '#8A8A90',
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
    backgroundColor: '#2A2A31',
    borderWidth: 1,
    borderColor: '#3A3A43',
  },
  finishDeleteButtonText: {
    color: '#D8D8DE',
    fontSize: 14,
    fontWeight: '700',
  },
  finishSaveButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  finishSaveButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default RunningTrackerScreen;
