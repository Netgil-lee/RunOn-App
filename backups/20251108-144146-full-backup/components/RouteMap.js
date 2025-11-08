import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

const RouteMap = ({ coordinates, width = 200, height = 100 }) => {
  if (!coordinates || coordinates.length < 2) {
    return null;
  }

  // 좌표를 SVG 좌표계로 변환
  const minLat = Math.min(...coordinates.map(coord => coord.latitude));
  const maxLat = Math.max(...coordinates.map(coord => coord.latitude));
  const minLng = Math.min(...coordinates.map(coord => coord.longitude));
  const maxLng = Math.max(...coordinates.map(coord => coord.longitude));

  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;

  // SVG 좌표로 변환 (여백 포함)
  const margin = 15; // 여백 증가
  const svgWidth = width - (margin * 2);
  const svgHeight = height - (margin * 2);

  // 경로가 컨테이너에 맞도록 스케일링
  const scaleX = svgWidth / Math.max(lngRange, 0.001); // 0으로 나누기 방지
  const scaleY = svgHeight / Math.max(latRange, 0.001);

  const svgCoordinates = coordinates.map(coord => {
    const x = margin + ((coord.longitude - minLng) * scaleX);
    const y = margin + ((maxLat - coord.latitude) * scaleY);
    return `${x},${y}`;
  }).join(' ');

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Polyline
          points={svgCoordinates}
          fill="none"
          stroke="#3AF8FF" // 프라이머리 색상
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RouteMap;
