import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, View } from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

// { uri, startDot: {x,y}, endDot: {x,y} } 형태로 캐싱
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
        // MapView 내부 투영으로 정확한 픽셀 좌표 계산 (수동 수식 불필요)
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
        }
      } catch {
        // 실패 시 라이브 MapView 유지
      }
    }, 1000);
  };

  // 스냅샷 완료 → Image + pointForCoordinate로 얻은 정확한 위치에 점 오버레이
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

  // 스냅샷 생성 중: MapView에 Marker 없이 렌더링 (PNG 캡처 시 검은 사각형 방지)
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
