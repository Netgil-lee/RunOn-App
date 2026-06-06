import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Polyline as SvgPolyline, Circle } from 'react-native-svg';

// MapView 없이 순수 SVG로 경로 렌더링 — captureRef 공유 이미지 전용
// MapView는 react-native-view-shot 캡처 시 지도 타일이 포함되므로 사용 불가

const PADDING = 10;
const DOT_R = 5;

const normalizeCoords = (coordinates = []) =>
  (coordinates || [])
    .map((c) => ({
      latitude: Number(c?.latitude ?? c?.lat),
      longitude: Number(c?.longitude ?? c?.lng ?? c?.lon),
    }))
    .filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));

const RouteSvg = ({ coordinates, width = 170, height = 100 }) => {
  const coords = useMemo(() => normalizeCoords(coordinates), [coordinates]);

  const { points, startP, endP } = useMemo(() => {
    if (coords.length < 2) return {};

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

    const toXY = (c) => ({
      x: ox + (c.longitude - minLng) * scale,
      y: height - oy - (c.latitude - minLat) * scale,
    });

    return {
      points: coords.map((c) => { const p = toXY(c); return `${p.x},${p.y}`; }).join(' '),
      startP: toXY(coords[0]),
      endP: toXY(coords[coords.length - 1]),
    };
  }, [coords, width, height]);

  if (!points) return null;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <SvgPolyline points={points} fill="none" stroke="#000000" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <SvgPolyline points={points} fill="none" stroke="#3AF8FF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={startP.x} cy={startP.y} r={DOT_R} fill="#28C76F" stroke="#fff" strokeWidth={1.5} />
        <Circle cx={endP.x} cy={endP.y} r={DOT_R} fill="#FF4D4F" stroke="#fff" strokeWidth={1.5} />
      </Svg>
    </View>
  );
};

export default RouteSvg;
