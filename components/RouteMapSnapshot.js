import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

// 앱 생명주기 내 스냅샷을 메모리에 캐싱 (workout.id → file URI)
const snapshotCache = new Map();

const SCREEN_WIDTH = Dimensions.get('window').width;

const normalizeCoords = (coordinates = []) =>
  (coordinates || [])
    .map((c) => ({
      latitude: Number(c?.latitude ?? c?.lat),
      longitude: Number(c?.longitude ?? c?.lng ?? c?.lon),
    }))
    .filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));

// 시각적 표시 전용 다운샘플링 — 원본 데이터 변경 없음
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

const DotMarker = ({ color }) => (
  <View style={{
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: color,
    borderWidth: 1.5, borderColor: '#fff',
  }} />
);

const RouteMapSnapshot = React.memo(({ coordinates, workoutId, width = SCREEN_WIDTH }) => {
  const height = Math.round(width * 0.44);
  const mapRef = useRef(null);
  const timerRef = useRef(null);
  const [snapshotUri, setSnapshotUri] = useState(() => snapshotCache.get(workoutId) || null);

  const displayCoords = useMemo(
    () => downsample(normalizeCoords(coordinates)),
    [coordinates],
  );

  const region = useMemo(
    () => (displayCoords.length >= 2 ? calcRegion(displayCoords) : null),
    [displayCoords],
  );

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!region) return null;

  const handleMapReady = () => {
    // 타일 로딩 완료 대기 후 스냅샷 촬영
    timerRef.current = setTimeout(async () => {
      try {
        const uri = await mapRef.current?.takeSnapshot({
          width: Math.round(width),
          height,
          format: 'png',
          quality: 0.85,
          result: 'file',
        });
        if (uri) {
          snapshotCache.set(workoutId, uri);
          setSnapshotUri(uri);
        }
      } catch {
        // 실패 시 라이브 MapView 유지
      }
    }, 1000);
  };

  // 스냅샷 완료 → 메모리 효율적인 정적 이미지로 교체 (MapView 언마운트)
  if (snapshotUri) {
    return (
      <Image
        source={{ uri: snapshotUri }}
        style={{ width, height }}
        resizeMode="cover"
      />
    );
  }

  // 스냅샷 생성 중: 실제 MapView가 직접 표시되다가 스냅샷 완료 후 Image로 전환
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
        <Polyline
          coordinates={displayCoords}
          strokeColor="#3AF8FF"
          strokeWidth={4}
          lineCap="round"
          lineJoin="round"
        />
        <Marker coordinate={displayCoords[0]} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }}>
          <DotMarker color="#28C76F" />
        </Marker>
        <Marker coordinate={displayCoords[displayCoords.length - 1]} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }}>
          <DotMarker color="#FF4D4F" />
        </Marker>
      </MapView>
      {/* 타일 로딩 중 반투명 오버레이 */}
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
