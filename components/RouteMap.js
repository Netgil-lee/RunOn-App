import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';

const normalizeCoordinates = (coordinates = []) => (
  (coordinates || [])
    .map((coord) => ({
      latitude: Number(coord?.latitude ?? coord?.lat),
      longitude: Number(coord?.longitude ?? coord?.lng ?? coord?.lon),
    }))
    .filter((coord) => Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude))
);

const RouteMap = ({
  coordinates,
  width = 200,
  height = 100,
}) => {
  const normalizedCoordinates = useMemo(
    () => normalizeCoordinates(coordinates),
    [coordinates]
  );

  const region = useMemo(() => {
    if (normalizedCoordinates.length < 2) return null;
    const lats = normalizedCoordinates.map((c) => c.latitude);
    const lngs = normalizedCoordinates.map((c) => c.longitude);
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
  }, [normalizedCoordinates]);

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
          strokeWidth={7}
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
        <Marker coordinate={start} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={{ backgroundColor: 'transparent' }}>
            <View style={[styles.dot, styles.dotStart]} />
          </View>
        </Marker>
        <Marker coordinate={end} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={{ backgroundColor: 'transparent' }}>
            <View style={[styles.dot, styles.dotEnd]} />
          </View>
        </Marker>
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  dotStart: {
    backgroundColor: '#28C76F',
  },
  dotEnd: {
    backgroundColor: '#FF4D4F',
  },
});

export default RouteMap;
