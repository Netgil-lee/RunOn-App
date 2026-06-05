import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, View } from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

const snapshotCache = new Map();

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

// 위경도 → 이미지 픽셀 좌표 변환 (등장방형 투영 — 러닝 거리 범위에서 충분히 정확)
const coordToPixel = (coord, region, width, height) => {
  const x = ((coord.longitude - (region.longitude - region.longitudeDelta / 2)) / region.longitudeDelta) * width;
  const y = ((region.latitude + region.latitudeDelta / 2 - coord.latitude) / region.latitudeDelta) * height;
  return { x: Math.round(x), y: Math.round(y) };
};

// takeSnapshot()이 PNG로 저장할 때 커스텀 Marker View의 투명 배경이
// 검은 픽셀로 렌더링되는 iOS 버그를 피하기 위해 MapView 외부에 오버레이로 렌더링
const DotOverlay = ({ coord, region, width, height, color }) => {
  if (!coord || !region) return null;
  const { x, y } = coordToPixel(coord, region, width, height);
  return (
    <View style={{
      position: 'absolute',
      left: x - DOT_RADIUS,
      top: y - DOT_RADIUS,
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

  const startCoord = displayCoords[0];
  const endCoord = displayCoords[displayCoords.length - 1];

  const handleMapReady = () => {
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

  // 스냅샷 완료 → Image + 좌표 계산 오버레이 점으로 표시 (MapView 언마운트)
  if (snapshotUri) {
    return (
      <View style={{ width, height }}>
        <Image
          source={{ uri: snapshotUri }}
          style={{ width, height }}
          resizeMode="cover"
        />
        <DotOverlay coord={startCoord} region={region} width={width} height={height} color="#28C76F" />
        <DotOverlay coord={endCoord} region={region} width={width} height={height} color="#FF4D4F" />
      </View>
    );
  }

  // 스냅샷 생성 중: MapView + Marker 없이 렌더링, 점은 외부 오버레이로 표시
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
          strokeColor="#000000"
          strokeWidth={3}
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
      {/* 로딩 오버레이 */}
      <View style={{
        position: 'absolute', top: 0, left: 0, width, height,
        backgroundColor: 'rgba(0,0,0,0.15)',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <ActivityIndicator size="small" color="#3AF8FF" />
      </View>
      {/* 점은 MapView 외부에 렌더링 — takeSnapshot() 캡처 범위 밖 */}
      <DotOverlay coord={startCoord} region={region} width={width} height={height} color="#28C76F" />
      <DotOverlay coord={endCoord} region={region} width={width} height={height} color="#FF4D4F" />
    </View>
  );
});

export default RouteMapSnapshot;
