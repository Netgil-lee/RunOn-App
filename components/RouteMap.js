import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

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

const RouteMap = ({ coordinates, width = 200, height = 100 }) => {
  const normalizedCoordinates = useMemo(
    () => normalizeCoordinates(coordinates),
    [coordinates]
  );

  const region = useMemo(
    () => (normalizedCoordinates.length >= 2 ? calcRegion(normalizedCoordinates) : null),
    [normalizedCoordinates]
  );

  if (!region) return null;

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
  },
});

export default RouteMap;
