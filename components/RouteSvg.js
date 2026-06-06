import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Polyline as SvgPolyline } from 'react-native-svg';

const PADDING = 10;

const normalizeCoords = (coordinates = []) =>
  (coordinates || [])
    .map((c) => ({
      latitude: Number(c?.latitude ?? c?.lat),
      longitude: Number(c?.longitude ?? c?.lng ?? c?.lon),
    }))
    .filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));

const RouteSvg = ({ coordinates, width = 170, height = 100 }) => {
  const coords = useMemo(() => normalizeCoords(coordinates), [coordinates]);

  const points = useMemo(() => {
    if (coords.length < 2) return null;

    const lats = coords.map((c) => c.latitude);
    const lngs = coords.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 0.0001;
    const lngRange = maxLng - minLng || 0.0001;

    const drawW = width - PADDING * 2;
    const drawH = height - PADDING * 2;
    const scale = Math.min(drawW / lngRange, drawH / latRange);
    const scaledW = lngRange * scale;
    const scaledH = latRange * scale;
    const ox = PADDING + (drawW - scaledW) / 2;
    const oy = PADDING + (drawH - scaledH) / 2;

    return coords
      .map((c) => {
        const x = ox + (c.longitude - minLng) * scale;
        const y = height - oy - (c.latitude - minLat) * scale;
        return `${x},${y}`;
      })
      .join(' ');
  }, [coords, width, height]);

  if (!points) return null;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <SvgPolyline
          points={points}
          fill="none"
          stroke="#3AF8FF"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

export default RouteSvg;
