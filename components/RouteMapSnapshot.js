import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, View } from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

// { uri, startDot: {x,y}, endDot: {x,y} } 형태로 캐싱
const snapshotCache = new Map();

// 스크롤 중 피드 아이템이 한꺼번에 많이 마운트돼도 네이티브 MapView가
// 동시에 여러 개 켜지지 않도록 상한을 둔다 (초과분은 대기 후 순차 실행).
// 스냅샷이 끝나면 즉시 정적 이미지로 전환되므로 대기 시간은 짧다.
const MAX_CONCURRENT_LIVE_MAPS = 3;
let activeLiveMapCount = 0;
const liveMapWaitQueue = [];

const acquireLiveMapSlot = () => new Promise((resolve) => {
  if (activeLiveMapCount < MAX_CONCURRENT_LIVE_MAPS) {
    activeLiveMapCount += 1;
    resolve();
  } else {
    liveMapWaitQueue.push(resolve);
  }
});

const releaseLiveMapSlot = () => {
  const next = liveMapWaitQueue.shift();
  if (next) {
    next();
  } else {
    activeLiveMapCount = Math.max(0, activeLiveMapCount - 1);
  }
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const DOT_RADIUS = 6;

const normalizeCoords = (coordinates = []) =>
  (coordinates || [])
    .map((c) => ({
      latitude: Number(c?.latitude ?? c?.lat),
      longitude: Number(c?.longitude ?? c?.lng ?? c?.lon),
    }))
    .filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));

const downsample = (coords, maxPoints = 200) => {
  if (coords.length <= maxPoints) return coords;
  const stride = Math.ceil(coords.length / maxPoints);
  const result = coords.filter((_, i) => i % stride === 0);
  const last = coords[coords.length - 1];
  if (result[result.length - 1] !== last) result.push(last);
  return result;
};

const calcRegion = (coords) => {
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latPad = Math.max(maxLat - minLat, 0.002) * 0.25;
  const lngPad = Math.max(maxLng - minLng, 0.002) * 0.25;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: (maxLat - minLat) + latPad * 2,
    longitudeDelta: (maxLng - minLng) + lngPad * 2,
  };
};

// MapView 외부 오버레이로 렌더링 — takeSnapshot() PNG 캡처 범위 밖이므로
// 커스텀 Marker View의 검은 사각형 버그 없음
const DotOverlay = ({ pos, color }) => {
  if (!pos) return null;
  return (
    <View style={{
      position: 'absolute',
      left: pos.x - DOT_RADIUS,
      top: pos.y - DOT_RADIUS,
      width: DOT_RADIUS * 2,
      height: DOT_RADIUS * 2,
      borderRadius: DOT_RADIUS,
      backgroundColor: color,
      borderWidth: 2,
      borderColor: '#fff',
    }} />
  );
};

const RouteMapSnapshot = React.memo(({ coordinates, workoutId, width = SCREEN_WIDTH }) => {
  const height = width;
  const mapRef = useRef(null);
  const timerRef = useRef(null);
  const [snapshotData, setSnapshotData] = useState(() => snapshotCache.get(workoutId) || null);
  const [hasLiveMapSlot, setHasLiveMapSlot] = useState(false);
  const hasLiveMapSlotRef = useRef(false);

  const displayCoords = useMemo(
    () => downsample(normalizeCoords(coordinates)),
    [coordinates],
  );

  const region = useMemo(
    () => (displayCoords.length >= 2 ? calcRegion(displayCoords) : null),
    [displayCoords],
  );

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // 이미 스냅샷이 있으면 지도를 켤 필요가 없다. 없는 경우에만 "동시 실행 슬롯"을
  // 확보한 뒤 실제 네이티브 MapView를 마운트한다 (초과분은 대기).
  useEffect(() => {
    if (snapshotData || !region) return undefined;

    let cancelled = false;
    acquireLiveMapSlot().then(() => {
      if (cancelled) {
        releaseLiveMapSlot();
        return;
      }
      hasLiveMapSlotRef.current = true;
      setHasLiveMapSlot(true);
    });

    return () => {
      cancelled = true;
      if (hasLiveMapSlotRef.current) {
        hasLiveMapSlotRef.current = false;
        releaseLiveMapSlot();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!region) return null;

  const startCoord = displayCoords[0];
  const endCoord = displayCoords[displayCoords.length - 1];

  const handleMapReady = () => {
    timerRef.current = setTimeout(async () => {
      try {
        // MapView 내부 투영으로 정확한 픽셀 좌표 계산
        const [startDot, endDot] = await Promise.all([
          mapRef.current.pointForCoordinate(startCoord),
          mapRef.current.pointForCoordinate(endCoord),
        ]);

        const uri = await mapRef.current?.takeSnapshot({
          width: Math.round(width),
          height,
          format: 'png',
          quality: 0.85,
          result: 'file',
        });

        if (uri) {
          const data = { uri, startDot, endDot };
          snapshotCache.set(workoutId, data);
          setSnapshotData(data);
          // 정적 이미지로 전환됐으니 더 이상 라이브 지도가 필요 없다.
          // 슬롯을 바로 반납해 대기 중인 다음 아이템이 진행할 수 있게 한다.
          if (hasLiveMapSlotRef.current) {
            hasLiveMapSlotRef.current = false;
            releaseLiveMapSlot();
          }
        }
      } catch {
        // 실패 시 라이브 MapView를 계속 보여줘야 하므로 슬롯은 그대로 유지한다
        // (언마운트 시 정리 이펙트가 반납한다).
      }
    }, 1000);
  };

  // 스냅샷 완료 → Image + pointForCoordinate로 계산한 정확한 위치에 점 오버레이
  if (snapshotData) {
    return (
      <View style={{ width, height }}>
        <Image
          source={{ uri: snapshotData.uri }}
          style={{ width, height }}
          resizeMode="cover"
        />
        <DotOverlay pos={snapshotData.startDot} color="#28C76F" />
        <DotOverlay pos={snapshotData.endDot} color="#FF4D4F" />
      </View>
    );
  }

  // 동시 실행 슬롯 대기 중: 지도를 켜지 않고 로딩 표시만 (동시 라이브 지도 개수 제한)
  if (!hasLiveMapSlot) {
    return (
      <View style={{
        width, height,
        backgroundColor: 'rgba(20,20,24,0.6)',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <ActivityIndicator size="small" color="#3AF8FF" />
      </View>
    );
  }

  // 스냅샷 생성 중: Marker 없이 MapView 렌더링 (PNG 캡처 시 검은 사각형 방지)
  return (
    <View style={{ width, height }} pointerEvents="none">
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={{ width, height }}
        region={region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsTraffic={false}
        toolbarEnabled={false}
        mapType="standard"
        onMapReady={handleMapReady}
      >
        {/* 검은 테두리 레이어 */}
        <Polyline
          coordinates={displayCoords}
          strokeColor="#000000"
          strokeWidth={5}
          lineCap="round"
          lineJoin="round"
        />
        <Polyline
          coordinates={displayCoords}
          strokeColor="#3AF8FF"
          strokeWidth={4}
          lineCap="round"
          lineJoin="round"
        />
      </MapView>
      <View style={{
        position: 'absolute', top: 0, left: 0, width, height,
        backgroundColor: 'rgba(0,0,0,0.15)',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <ActivityIndicator size="small" color="#3AF8FF" />
      </View>
    </View>
  );
});

export default RouteMapSnapshot;
