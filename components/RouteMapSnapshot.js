import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, View } from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

const snapshotCache = new Map();

const SCREEN_WIDTH = Dimensions.get('window').width;

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

  if (snapshotUri) {
    return (
      <Image
        source={{ uri: snapshotUri }}
        style={{ width, height }}
        resizeMode="cover"
      />
    );
  }

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
