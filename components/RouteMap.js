import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

const DOT_RADIUS = 5;

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

const coordToPixel = (coord, region, width, height) => {
  const x = ((coord.longitude - (region.longitude - region.longitudeDelta / 2)) / region.longitudeDelta) * width;
  const y = ((region.latitude + region.latitudeDelta / 2 - coord.latitude) / region.latitudeDelta) * height;
  return { x: Math.round(x), y: Math.round(y) };
};

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
      borderWidth: 1.5,
      borderColor: '#fff',
    }} />
  );
};

const RouteMap = ({
  coordinates,
  width = 200,
  height = 100,
}) => {
  const normalizedCoordinates = useMemo(
    () => normalizeCoordinates(coordinates),
    [coordinates]
  );

  const region = useMemo(
    () => (normalizedCoordinates.length >= 2 ? calcRegion(normalizedCoordinates) : null),
    [normalizedCoordinates]
  );

  if (!region) return null;

  const start = normalizedCoordinates[0];
  const end = normalizedCoordinates[normalizedCoordinates.length - 1];

  return (
    <View style={[styles.container, { width, height }]}>
      <MapView
        provider={PROVIDER_DEFAULT}
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
          strokeColor="#000000"
          strokeWidth={5}
          lineCap="round"
          lineJoin="round"
        />
        <Polyline
          coordinates={normalizedCoordinates}
          strokeColor="#3AF8FF"
          strokeWidth={3}
          lineCap="round"
          lineJoin="round"
        />
      </MapView>
      <DotOverlay coord={start} region={region} width={width} height={height} color="#28C76F" />
      <DotOverlay coord={end} region={region} width={width} height={height} color="#FF4D4F" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 8,
  },
});

export default RouteMap;
