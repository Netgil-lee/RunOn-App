import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import appleFitnessService from '../services/appleFitnessService';
import runOnRunningService from '../services/runOnRunningService';
import ENV from '../config/environment';

const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  TEXT: '#ffffff',
  SECONDARY: '#9A9AA0',
  DANGER: '#FF4D4F',
};

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

const RunningTrackerScreen = ({ navigation }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [mapRouteCoordinates, setMapRouteCoordinates] = useState([]);
  const [isRunFinished, setIsRunFinished] = useState(false);
  const runningMapWebViewRef = useRef(null);
  const isRunningMapLoadedRef = useRef(false);
  const pendingMapPayloadRef = useRef(null);
  const lastCameraSyncAtRef = useRef(0);

  const startTimeRef = useRef(new Date());
  const locationWatcherRef = useRef(null);
  const lastCoordRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const distanceMetersRef = useRef(0);
  const routeCoordinatesRef = useRef([]);
  const isPausedRef = useRef(false);
  const endedRef = useRef(false);

  const paceText = useMemo(
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
          <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}"></script>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = null;
            var polyline = null;
            var currentMarker = null;
            var startMarker = null;
            var endMarker = null;

            function createMarkerImage(fillColor) {
              var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">' +
                '<circle cx="13" cy="13" r="10" fill="' + fillColor + '" stroke="#ffffff" stroke-width="3" />' +
                '</svg>';
              var imageSrc = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
              return new kakao.maps.MarkerImage(imageSrc, new kakao.maps.Size(26, 26));
            }

            function initMap() {
              if (typeof kakao === 'undefined' || !kakao.maps) {
                setTimeout(initMap, 200);
                return;
              }
              var center = new kakao.maps.LatLng(37.5665, 126.9780);
              map = new kakao.maps.Map(document.getElementById('map'), {
                center: center,
                level: 4
              });
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage('runningMapLoaded');
              }
            }

            function renderRoute(payload) {
              if (!map || !payload) return;
              var coords = Array.isArray(payload.routeCoordinates) ? payload.routeCoordinates : [];
              var isFinished = !!payload.isFinished;
              var shouldFollowCamera = !!payload.shouldFollowCamera;
              var shouldAutoZoom = !!payload.shouldAutoZoom;

              var path = coords.map(function(coord) {
                return new kakao.maps.LatLng(coord.latitude, coord.longitude);
              });

              if (polyline) {
                polyline.setMap(null);
                polyline = null;
              }

              if (path.length >= 2) {
                polyline = new kakao.maps.Polyline({
                  path: path,
                  strokeWeight: 5,
                  strokeColor: '#3AF8FF',
                  strokeOpacity: 0.9,
                  strokeStyle: 'solid'
                });
                polyline.setMap(map);
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

                if (shouldAutoZoom && path.length >= 2) {
                  var bounds = new kakao.maps.LatLngBounds();
                  for (var i = 0; i < path.length; i++) {
                    bounds.extend(path[i]);
                  }
                  map.setBounds(bounds);
                } else if (shouldFollowCamera) {
                  map.setCenter(position);
                }
              }
            }

            function handleMessage(event) {
              try {
                var data = JSON.parse(event.data);
                if (data.type === 'updateRunningRoute') {
                  renderRoute(data);
                }
              } catch (e) {}
            }

            window.addEventListener('message', handleMessage);
            document.addEventListener('message', handleMessage);
            initMap();
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
      : null;
    const now = Date.now();
    const shouldFollowCamera = !isPaused && !isRunFinished;
    const shouldAutoZoom = shouldFollowCamera && now - lastCameraSyncAtRef.current >= 6000;
    if (shouldAutoZoom) {
      lastCameraSyncAtRef.current = now;
    }

    postRunningMapPayload({
      type: 'updateRunningRoute',
      routeCoordinates: normalizedCoords,
      currentLocation,
      isFinished: isRunFinished,
      shouldFollowCamera,
      shouldAutoZoom,
    });
  }, [mapRouteCoordinates, isPaused, isRunFinished]);

  const handleRunningMapMessage = (event) => {
    const data = event?.nativeEvent?.data;
    if (data === 'runningMapLoaded') {
      isRunningMapLoadedRef.current = true;
      if (pendingMapPayloadRef.current && runningMapWebViewRef.current) {
        runningMapWebViewRef.current.postMessage(JSON.stringify(pendingMapPayloadRef.current));
        pendingMapPayloadRef.current = null;
      }
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => (isPaused ? prev : prev + 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    let mounted = true;

    const startTracking = async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) {
        const requested = await Location.requestForegroundPermissionsAsync();
        if (!requested.granted) {
          Alert.alert('권한 필요', '러닝 기록을 위해 위치 권한이 필요합니다.', [
            { text: '확인', onPress: () => navigation.goBack() },
          ]);
          return;
        }
      }

      // 첫 좌표를 먼저 잡아두면 초기 점프/누락으로 인한 거리 0 현상을 줄일 수 있음
      const initialPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const initialCoord = {
        latitude: initialPosition.coords.latitude,
        longitude: initialPosition.coords.longitude,
      };
      lastCoordRef.current = initialCoord;
      lastTimestampRef.current = initialPosition.timestamp || Date.now();
      routeCoordinatesRef.current = [initialCoord];
      setRouteCoordinates([initialCoord]);
      setMapRouteCoordinates([initialCoord]);

      const watcher = await Location.watchPositionAsync(
        {
          // 즉시 반응성을 높이기 위해 샘플링 간격을 더 촘촘하게 설정
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (position) => {
          if (!mounted || endedRef.current || isPausedRef.current) return;
          const nextCoord = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          const nextTimestamp = position.timestamp || Date.now();
          const accuracy = Number(position.coords?.accuracy || 0);

          const previous = lastCoordRef.current;
          const previousTimestamp = lastTimestampRef.current;
          lastCoordRef.current = nextCoord;
          lastTimestampRef.current = nextTimestamp;
          routeCoordinatesRef.current = [...routeCoordinatesRef.current, nextCoord];
          setRouteCoordinates(routeCoordinatesRef.current);

          if (!previous) return;
          let delta = calcDistanceMeters(previous, nextCoord);

          // 속도 센서값이 있으면 좌표 변화량보다 크게 잡히는 경우 보조 반영
          // (초기 측정 구간에서 "거리 0 고정" 현상을 줄이기 위함)
          if (previousTimestamp) {
            const elapsed = Math.max((nextTimestamp - previousTimestamp) / 1000, 1);
            const reportedSpeed = Number(position.coords?.speed);
            if (Number.isFinite(reportedSpeed) && reportedSpeed > 0.5) {
              const speedBasedDelta = reportedSpeed * elapsed;
              delta = Math.max(delta, speedBasedDelta);
            }
          }

          // 1) 매우 작은 흔들림만 제외 (즉시 반응 위해 임계값 하향)
          if (delta < 0.2) return;
          // 2) 아주 큰 점프는 제외 (GPS 튐)
          if (delta > 1000) return;
          // 3) 정확도가 낮은 상태에서 큰 점프는 제외
          if (accuracy > 60 && delta > 120) return;
          // 4) 비현실적인 순간 속도(러닝 기준)를 제외
          if (previousTimestamp) {
            const elapsed = Math.max((nextTimestamp - previousTimestamp) / 1000, 1);
            const speedMps = delta / elapsed;
            if (speedMps > 12) return;
          }

          distanceMetersRef.current += delta;
          setDistanceMeters(distanceMetersRef.current);
        }
      );

      locationWatcherRef.current = watcher;
    };

    startTracking();

    return () => {
      mounted = false;
      locationWatcherRef.current?.remove();
      locationWatcherRef.current = null;
    };
  }, [navigation]);

  const handlePauseResume = () => {
    setIsPaused((prev) => {
      const next = !prev;
      isPausedRef.current = next;
      return next;
    });
  };

  const handleEnd = async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    setIsRunFinished(true);
    locationWatcherRef.current?.remove();
    locationWatcherRef.current = null;

    const endTime = new Date();
    const calories = estimateCalories(elapsedSeconds);
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
    if (finalDistanceMeters < 1 && elapsedSeconds >= 15 && finalRouteCoordinates.length >= 2) {
      const firstCoord = finalRouteCoordinates[0];
      const lastCoord = finalRouteCoordinates[finalRouteCoordinates.length - 1];
      const displacement = calcDistanceMeters(firstCoord, lastCoord);
      if (displacement > 5) {
        finalDistanceMeters = displacement;
      }
    }

    distanceMetersRef.current = finalDistanceMeters;
    setDistanceMeters(finalDistanceMeters);

    const pace = formatPace(finalDistanceMeters, elapsedSeconds);
    const duration = elapsedSeconds;

    const workoutPayload = {
      startDate: startTimeRef.current,
      endDate: endTime,
      distance: Math.max(0, finalDistanceMeters),
      calories,
      routeCoordinates: finalRouteCoordinates,
    };

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

    navigation.replace('RunningResult', {
      result: {
        distance: formatDistance(finalDistanceMeters),
        pace,
        duration: formatDuration(duration),
      },
      workoutPayload: {
        ...workoutPayload,
        startDate: workoutPayload.startDate.toISOString(),
        endDate: workoutPayload.endDate.toISOString(),
      },
      saveStatus,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>러닝 기록 중</Text>
      </View>

      <View style={styles.metricWrap}>
        <Text style={styles.metricLabel}>시간</Text>
        <Text style={styles.metricValue}>{formatDuration(elapsedSeconds)}</Text>
      </View>
      <View style={styles.metricWrap}>
        <Text style={styles.metricLabel}>거리</Text>
        <Text style={styles.metricValue}>{formatDistance(distanceMeters)}</Text>
      </View>
      <View style={styles.metricWrap}>
        <Text style={styles.metricLabel}>페이스</Text>
        <Text style={styles.metricValue}>{paceText}</Text>
      </View>

      <View style={styles.mapSection}>
        <Text style={styles.mapSectionTitle}>실시간 경로</Text>
        <View style={styles.mapCard}>
          <WebView
            ref={runningMapWebViewRef}
            source={{ html: createRunningMapHTML }}
            style={styles.runningMapWebView}
            onMessage={handleRunningMapMessage}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            mixedContentMode="always"
            scrollEnabled={false}
            bounces={false}
          />
          {mapRouteCoordinates.length < 2 && (
            <View style={styles.mapLoadingOverlay}>
              <Text style={styles.mapPlaceholderText}>위치 수집 중...</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.pauseButton} onPress={handlePauseResume}>
          <Ionicons name={isPaused ? 'play' : 'pause'} size={18} color="#000000" />
          <Text style={styles.pauseButtonText}>{isPaused ? '재개' : '일시정지'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.endButton} onPress={handleEnd}>
          <Ionicons name="stop" size={18} color="#ffffff" />
          <Text style={styles.endButtonText}>종료</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    paddingHorizontal: 20,
    paddingTop: 64,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.TEXT,
  },
  metricWrap: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D2D34',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  metricLabel: {
    color: COLORS.SECONDARY,
    fontSize: 14,
    marginBottom: 8,
  },
  metricValue: {
    color: COLORS.TEXT,
    fontSize: 30,
    fontWeight: '700',
  },
  actionRow: {
    marginTop: 'auto',
    marginBottom: 30,
    flexDirection: 'row',
    gap: 12,
  },
  mapSection: {
    marginTop: 8,
    marginBottom: 6,
  },
  mapSectionTitle: {
    color: COLORS.SECONDARY,
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 2,
  },
  mapCard: {
    height: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D2D34',
    backgroundColor: '#101014',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
    backgroundColor: 'rgba(16,16,20,0.45)',
  },
  mapPlaceholderText: {
    color: '#7F7F86',
    fontSize: 14,
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
});

export default RunningTrackerScreen;
