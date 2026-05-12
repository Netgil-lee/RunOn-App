import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ActivityIndicator, AppState, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import appleFitnessService from '../services/appleFitnessService';
import runOnRunningService from '../services/runOnRunningService';
import backgroundLocationService from '../services/backgroundLocationService';
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
  const runningMapWebViewRef = useRef(null);
  const isRunningMapLoadedRef = useRef(false);
  const pendingMapPayloadRef = useRef(null);

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
                '<circle cx="13" cy="13" r="10" fill="' + fillColor + '" stroke="#ffffff" stroke-width="3" />' +
                '</svg>';
              var imageSrc = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
              return new kakao.maps.MarkerImage(imageSrc, new kakao.maps.Size(26, 26));
            }

            function postToRN(message) {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(message);
              }
            }

            function initMap() {
              try {
                if (
                  typeof kakao === 'undefined'
                  || !kakao.maps
                  || typeof kakao.maps.LatLng !== 'function'
                  || typeof kakao.maps.Map !== 'function'
                ) {
                  postToRN('runningMapError:KAKAO_SDK_NOT_READY');
                  return;
                }
                var center = new kakao.maps.LatLng(37.5665, 126.9780);
                map = new kakao.maps.Map(document.getElementById('map'), {
                  center: center,
                  level: 4
                });
                mapReady = true;
                postToRN('runningMapLoaded');
              } catch (error) {
                postToRN('runningMapError:' + (error && error.message ? error.message : 'MAP_INIT_FAILED'));
              }
            }

            function renderRoute(payload) {
              if (!map || !payload) return;
              var coords = Array.isArray(payload.routeCoordinates) ? payload.routeCoordinates : [];
              var isFinished = !!payload.isFinished;
              var shouldFollowCamera = !!payload.shouldFollowCamera;

              var path = coords.map(function(coord) {
                return new kakao.maps.LatLng(coord.latitude, coord.longitude);
              });

              if (path.length >= 2) {
                if (!polyline) {
                  polyline = new kakao.maps.Polyline({
                    path: path,
                    strokeWeight: 5,
                    strokeColor: '#3AF8FF',
                    strokeOpacity: 0.9,
                    strokeStyle: 'solid'
                  });
                  polyline.setMap(map);
                } else {
                  polyline.setPath(path);
                }
              } else if (polyline) {
                polyline.setMap(null);
                polyline = null;
              }

              if (path.length >= 1) {
                if (!startMarker) {
                  startMarker = new kakao.maps.Marker({
                    position: path[0],
                    image: createMarkerImage('#28C76F')
                  });
                  startMarker.setMap(map);
                } else {
                  startMarker.setPosition(path[0]);
                }
              }

              var current = payload.currentLocation;
              if (current && Number.isFinite(current.latitude) && Number.isFinite(current.longitude)) {
                var position = new kakao.maps.LatLng(current.latitude, current.longitude);
                if (!isFinished) {
                  if (!currentMarker) {
                    currentMarker = new kakao.maps.Marker({
                      position: position,
                      image: createMarkerImage('#3AF8FF')
                    });
                    currentMarker.setMap(map);
                  } else {
                    currentMarker.setPosition(position);
                  }
                } else if (currentMarker) {
                  currentMarker.setMap(null);
                  currentMarker = null;
                }

                if (isFinished && path.length >= 1) {
                  var endPosition = path[path.length - 1];
                  if (!endMarker) {
                    endMarker = new kakao.maps.Marker({
                      position: endPosition,
                      image: createMarkerImage('#FF4D4F')
                    });
                    endMarker.setMap(map);
                  } else {
                    endMarker.setPosition(endPosition);
                  }
                }

                if (shouldFollowCamera) {
                  map.panTo(position);
                }
              }
            }

            function handleMessage(event) {
              try {
                var data = JSON.parse(event.data);
                if (data.type === 'updateRunningRoute') {
                  renderRoute(data);
                }
              } catch (e) {
                postToRN('runningMapError:MESSAGE_PARSE_FAILED');
              }
            }

            window.addEventListener('message', handleMessage);
            document.addEventListener('message', handleMessage);

            window.onerror = function(message) {
              postToRN('runningMapError:' + message);
            };

            (function loadKakaoSdk() {
              try {
                var sdk = document.createElement('script');
                sdk.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&autoload=false';
                sdk.async = true;
                sdk.onload = function() {
                  try {
                    if (kakao && kakao.maps && typeof kakao.maps.load === 'function') {
                      kakao.maps.load(function() {
                        initMap();
                      });
                    } else {
                      initMap();
                    }
                  } catch (error) {
                    postToRN('runningMapError:' + (error && error.message ? error.message : 'KAKAO_MAPS_LOAD_FAILED'));
                  }
                };
                sdk.onerror = function() {
                  postToRN('runningMapError:KAKAO_SDK_LOAD_FAILED');
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

    latestGpsCoordRef.current = nextCoord;
    latestGpsTimestampRef.current = nextTimestamp || Date.now();

    if (isPausedRef.current) {
      lastCoordRef.current = nextCoord;
      lastTimestampRef.current = nextTimestamp || Date.now();
      return;
    }

    const previous = lastCoordRef.current;
    const previousTimestamp = lastTimestampRef.current;
    lastCoordRef.current = nextCoord;
    lastTimestampRef.current = nextTimestamp || Date.now();
    routeCoordinatesRef.current = [...routeCoordinatesRef.current, nextCoord];
    setRouteCoordinates(routeCoordinatesRef.current);

    if (!previous) return;
    let delta = calcDistanceMeters(previous, nextCoord);

    if (previousTimestamp) {
      const elapsed = Math.max(((nextTimestamp || Date.now()) - previousTimestamp) / 1000, 1);
      const reportedSpeed = Number(providedSpeed);
      if (Number.isFinite(reportedSpeed) && reportedSpeed > 0.5) {
        const speedBasedDelta = reportedSpeed * elapsed;
        delta = Math.max(delta, speedBasedDelta);
      }
    }

    if (delta < 0.2) return;
    if (delta > 1000) return;
    if (accuracy > 60 && delta > 120) return;
    if (previousTimestamp) {
      const elapsed = Math.max(((nextTimestamp || Date.now()) - previousTimestamp) / 1000, 1);
      const speedMps = delta / elapsed;
      if (speedMps > 12) return;
    }

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
      const elapsed = Math.max(((nextTimestamp || Date.now()) - previousTimestamp) / 1000, 1);
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
      lastCoordRef.current = nextCoord;
      lastTimestampRef.current = nextTimestamp;

      // 경로 배열에는 무조건 추가 (지도 경로 표시용)
      routeCoordinatesRef.current = [...routeCoordinatesRef.current, nextCoord];
      setRouteCoordinates(routeCoordinatesRef.current);

      if (!previous) return;

      const delta = calcDistanceMeters(previous, nextCoord);

      // 완화된 필터 (백그라운드 GPS 특성 반영)
      if (delta < 0.5) return;              // 너무 작은 이동 무시
      if (delta > 1500) return;             // 1.5km 초과 점프는 오류 좌표
      if (accuracy > 100 && delta > 200) return;  // 정확도 낮고 점프 큰 경우만 제거

      // 백그라운드 구간은 elapsed time 기반 속도 계산 신뢰도가 낮으므로
      // 명백히 불가능한 속도(20m/s = 72km/h 초과)만 걸러냄
      if (previousTimestamp) {
        const elapsed = Math.max((nextTimestamp - previousTimestamp) / 1000, 1);
        const speedMps = delta / elapsed;
        if (speedMps > 20) return;
      }

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
        const hasBackgroundPermission = await backgroundLocationService.ensureBackgroundPermission();
        if (hasBackgroundPermission) {
          await backgroundLocationService.start();
        } else {
          console.warn('⚠️ 백그라운드 위치 권한 미허용: 포그라운드 추적만 동작');
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
            <View style={styles.gpsPreparingWrap}>
              <Text style={[styles.mapPlaceholderText, styles.gpsPreparingText]}>GPS 수신 확인중...</Text>
              <Text style={styles.gpsPreparingSubText}>정확한 시작 위치를 확인하고 있어요</Text>
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

      <View style={styles.bottomModal}>
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
  gpsPreparingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsPreparingText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#ECFCFF',
    marginBottom: 6,
  },
  gpsPreparingSubText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#BBD2D6',
    textAlign: 'center',
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
    backgroundColor: COLORS.DANGER,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  endButtonText: {
    color: '#ffffff',
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
