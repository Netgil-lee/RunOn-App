import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { PERIOD_MONTH, PERIOD_YEAR, formatKm } from '../utils/runningStats';

const CHART_HEIGHT = 170;
const BAR_MIN_HEIGHT = 3; // 기록이 있는데 막대가 안 보이는 것을 막는 최소 높이
const BAR_RADIUS = 3;

/**
 * 구간 수에 맞는 막대 굵기 비율을 정한다.
 * 월간(28~31개)은 얇게, 주간(7개)은 굵게 그린다.
 */
const getBarWidthRatio = (bucketCount) => {
  if (bucketCount >= 28) return 0.55;
  if (bucketCount >= 12) return 0.5;
  return 0.42;
};

/**
 * x축 구간에 무엇을 그릴지 정한다.
 *
 * 월간은 31개를 모두 숫자로 적으면 슬롯 폭(약 11px)보다 넓어 겹친다.
 * 1일과 말일만 숫자로 남기고 그 사이 날짜는 모두 점으로 눈금을 찍는다.
 *
 * @returns {'number'|'dot'} 그릴 라벨 종류
 */
const getLabelKind = (period, index, bucketCount) => {
  if (period !== PERIOD_MONTH) return 'number';
  const day = index + 1;
  return day === 1 || day === bucketCount ? 'number' : 'dot';
};

/**
 * 기간별 러닝 거리 막대 차트
 *
 * @param {object} stats - buildPeriodStats 결과
 * @param {number|null} selectedIndex - 선택된 구간 인덱스
 * @param {function} onSelectBucket - 구간 선택 콜백
 */
const RunningStatsChart = ({ stats, selectedIndex, onSelectBucket }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const buckets = stats?.buckets || [];
  const period = stats?.period;
  const maxDistanceMeters = stats?.maxDistanceMeters || 0;
  const bucketCount = buckets.length;

  // 기록이 없으면 빈 축만 그린다 (막대 없이 바닥선만)
  const hasData = maxDistanceMeters > 0;
  const barWidthRatio = getBarWidthRatio(bucketCount);

  return (
    <View style={styles.container}>
      <View style={styles.chartArea}>
        <Svg width="100%" height={CHART_HEIGHT}>
          {/* 바닥선 */}
          <Line
            x1="0"
            y1={CHART_HEIGHT - 1}
            x2="100%"
            y2={CHART_HEIGHT - 1}
            stroke={colors.BORDER}
            strokeWidth={1}
          />
          {buckets.map((bucket, index) => {
            const slotWidthPercent = 100 / bucketCount;
            const barWidthPercent = slotWidthPercent * barWidthRatio;
            const xPercent = slotWidthPercent * index + (slotWidthPercent - barWidthPercent) / 2;

            const ratio = hasData ? bucket.distanceMeters / maxDistanceMeters : 0;
            const barHeight = bucket.distanceMeters > 0
              ? Math.max(BAR_MIN_HEIGHT, ratio * (CHART_HEIGHT - 8))
              : 0;
            const isSelected = selectedIndex === index;

            if (barHeight === 0) {
              // 기록이 없는 구간은 바닥에 옅은 점만 남겨 축 간격을 읽게 한다
              return (
                <Rect
                  key={bucket.key}
                  x={`${xPercent}%`}
                  y={CHART_HEIGHT - 3}
                  width={`${barWidthPercent}%`}
                  height={2}
                  rx={1}
                  fill={colors.BORDER}
                />
              );
            }

            return (
              <Rect
                key={bucket.key}
                x={`${xPercent}%`}
                y={CHART_HEIGHT - barHeight - 1}
                width={`${barWidthPercent}%`}
                height={barHeight}
                rx={BAR_RADIUS}
                fill={colors.PRIMARY}
                opacity={selectedIndex === null || isSelected ? 1 : 0.35}
              />
            );
          })}
        </Svg>

        {/* 막대는 얇아서 터치가 어려우므로 구간 전체 폭을 터치 영역으로 덮는다 */}
        <View style={styles.touchOverlay} pointerEvents="box-none">
          {buckets.map((bucket, index) => (
            <TouchableOpacity
              key={`touch-${bucket.key}`}
              style={styles.touchSlot}
              activeOpacity={0.7}
              onPress={() => onSelectBucket?.(selectedIndex === index ? null : index)}
            />
          ))}
        </View>
      </View>

      <View style={styles.labelRow}>
        {buckets.map((bucket, index) => {
          const labelKind = getLabelKind(period, index, bucketCount);
          const isSelected = selectedIndex === index;

          return (
            <View key={`label-${bucket.key}`} style={styles.labelSlot}>
              {labelKind === 'number' && (
                <Text
                  style={[styles.labelText, isSelected && styles.labelTextSelected]}
                  numberOfLines={1}
                >
                  {period === PERIOD_YEAR ? bucket.label.replace('월', '') : bucket.label}
                </Text>
              )}
              {labelKind === 'dot' && (
                <View style={[styles.labelDot, isSelected && styles.labelDotSelected]} />
              )}
            </View>
          );
        })}
      </View>

      {selectedIndex !== null && buckets[selectedIndex] && (
        <View style={styles.selectionCard}>
          <Text style={styles.selectionTitle}>
            {period === PERIOD_MONTH
              ? `${stats.rangeStart.getMonth() + 1}월 ${buckets[selectedIndex].label}일`
              : buckets[selectedIndex].label}
          </Text>
          <Text style={styles.selectionValue}>
            {buckets[selectedIndex].runCount > 0
              ? `${formatKm(buckets[selectedIndex].distanceMeters)}km · ${buckets[selectedIndex].runCount}회`
              : '기록 없음'}
          </Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    marginTop: 4,
  },
  chartArea: {
    height: CHART_HEIGHT,
    position: 'relative',
  },
  touchOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  touchSlot: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  labelSlot: {
    flex: 1,
    alignItems: 'center',
  },
  labelText: {
    fontSize: 11,
    color: colors.TEXT_SECONDARY,
    fontFamily: 'Pretendard',
    // 월간 슬롯은 폭이 약 11px라 두 자리 숫자가 잘린다("30"→"3").
    // 슬롯보다 넓게 잡아 좌우로 넘쳐 그려지게 한다 (slot의 alignItems:center로 중심은 유지)
    width: 28,
    textAlign: 'center',
  },
  labelTextSelected: {
    color: colors.PRIMARY,
    fontFamily: 'Pretendard-SemiBold',
  },
  labelDot: {
    // 숫자 라벨과 세로 중심을 맞추기 위해 라벨 높이(11pt) 안에서 중앙에 놓는다
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginVertical: 5,
    backgroundColor: colors.TEXT_SECONDARY,
    opacity: 0.6,
  },
  labelDotSelected: {
    backgroundColor: colors.PRIMARY,
    opacity: 1,
  },
  selectionCard: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.CARD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionTitle: {
    fontSize: 13,
    color: colors.TEXT_SECONDARY_STRONG,
    fontFamily: 'Pretendard-Medium',
  },
  selectionValue: {
    fontSize: 14,
    color: colors.TEXT,
    fontFamily: 'Pretendard-SemiBold',
  },
});

export default RunningStatsChart;
