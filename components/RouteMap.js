import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Svg, { Polyline as SvgPolyline } from 'react-native-svg';

const normalizeCoordinates = (coordinates = []) => (
  (coordinates || [])
    .map((coord) => ({
      latitude: Number(coord?.latitude ?? coord?.lat),
      longitude: Number(coord?.longitude ?? coord?.lng ?? coord?.lon),
    }))
    .filter((coord) => Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude))
);

const calcRegion = (coords) => {
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latPad = Math.max(maxLat - minLat, 0.001) * 0.35;
  const lngPad = Math.max(maxLng - minLng, 0.001) * 0.35;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: (maxLat - minLat) + latPad * 2,
    longitudeDelta: (maxLng - minLng) + lngPad * 2,
  };
};

// 공유 이미지(view-shot) 캡처용 SVG 경로 렌더러
// 라이브 구글맵은 스냅샷 캡처에 잡히지 않으므로 공유 카드에서는 이 경로를 사용 (provider="svg")
const RouteMapSvg = ({ coordinates, width, height }) => {
  const minLat = Math.min(...coordinates.map((coord) => coord.latitude));
  const maxLat = Math.max(...coordinates.map((coord) => coord.latitude));
  const minLng = Math.min(...coordinates.map((coord) => coord.longitude));
  const maxLng = Math.max(...coordinates.map((coord) => coord.longitude));
  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;
  const margin = 15;
  const svgWidth = width - (margin * 2);
  const svgHeight = height - (margin * 2);
  const scaleX = svgWidth / Math.max(lngRange, 0.001);
  const scaleY = svgHeight / Math.max(latRange, 0.001);
  const svgCoordinates = coordinates.map((coord) => {
    const x = margin + ((coord.longitude - minLng) * scaleX);
    const y = margin + ((maxLat - coord.latitude) * scaleY);
    return `${x},${y}`;
  }).join(' ');

  return (
    <Svg width={width} height={height}>
      <SvgPolyline
        points={svgCoordinates}
        fill="none"
        stroke="#3AF8FF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

const RouteMap = ({
  coordinates,
  width = 200,
  height = 100,
  provider = 'google',
}) => {
  const normalizedCoordinates = useMemo(
    () => normalizeCoordinates(coordinates),
    [coordinates]
  );

  const region = useMemo(
    () => (normalizedCoordinates.length >= 2 ? calcRegion(normalizedCoordinates) : null),
    [normalizedCoordinates]
  );

  if (normalizedCoordinates.length < 2 || !region) {
    return null;
  }

  // 공유 카드 등 캡처 컨텍스트에서는 SVG로 렌더 (구글맵은 view-shot에 안 잡힘)
  if (provider === 'svg') {
    return (
      <View style={[styles.container, { width, height }]}>
        <RouteMapSvg coordinates={normalizedCoordinates} width={width} height={height} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        region={region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        pointerEvents="none"
        mapType="standard"
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsTraffic={false}
        showsBuildings={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
      >
        <Polyline
          coordinates={normalizedCoordinates}
          strokeColor="#3AF8FF"
          strokeWidth={4}
          lineCap="round"
          lineJoin="round"
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RouteMap;
