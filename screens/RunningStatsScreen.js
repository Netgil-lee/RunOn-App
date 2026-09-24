import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import runningStatsService from '../services/runningStatsService';
import RunningStatsChart from '../components/RunningStatsChart';
import {
  PERIOD_WEEK,
  PERIOD_MONTH,
  PERIOD_YEAR,
  buildPeriodStats,
  shiftAnchorDate,
  isCurrentPeriod,
  formatKm,
  formatPaceLabel,
  formatDurationLabel,
} from '../utils/runningStats';

const PERIOD_TABS = [
  { key: PERIOD_WEEK, label: '주' },
  { key: PERIOD_MONTH, label: '월' },
  { key: PERIOD_YEAR, label: '년' },
];

const RunningStatsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // 엣지 투 엣지 환경에서 마지막 내용이 하단 내비게이션 바에 가리지 않도록 여백을 더한다
  const insets = useSafeAreaInsets();

  const [period, setPeriod] = useState(PERIOD_WEEK);
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [workouts, setWorkouts] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorCode, setErrorCode] = useState('');

  const loadWorkouts = useCallback(async (options = {}) => {
    const force = options?.force === true;
    if (force) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const result = await runningStatsService.loadAllWorkouts({ force });
      setWorkouts(result.workouts);
      setErrorCode(result.errorCode);
    } catch (error) {
      setWorkouts([]);
      setErrorCode(error?.code || 'UNKNOWN');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  const stats = useMemo(
    () => buildPeriodStats(workouts, { period, anchorDate }),
    [workouts, period, anchorDate],
  );

  // 기간이 바뀌면 선택 상태를 초기화한다 (구간 수가 달라져 인덱스가 어긋난다)
  const handlePeriodChange = (nextPeriod) => {
    if (nextPeriod === period) return;
    setPeriod(nextPeriod);
    setAnchorDate(new Date());
    setSelectedIndex(null);
  };

  const handleShift = (step) => {
    setAnchorDate((prev) => shiftAnchorDate(period, prev, step));
    setSelectedIndex(null);
  };

  const isAtCurrentPeriod = isCurrentPeriod(period, anchorDate);
  const { summary } = stats;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.TEXT} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>러닝 통계</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadWorkouts({ force: true })}
            colors={[colors.PRIMARY]}
            progressBackgroundColor={colors.SURFACE}
            tintColor={colors.PRIMARY}
          />
        )}
      >
        {/* 기간 단위 선택 */}
        <View style={styles.periodTabs}>
          {PERIOD_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.periodTab, period === tab.key && styles.periodTabActive]}
              activeOpacity={0.8}
              onPress={() => handlePeriodChange(tab.key)}
            >
              <Text style={[styles.periodTabText, period === tab.key && styles.periodTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 기간 이동 */}
        <View style={styles.periodNav}>
          <TouchableOpacity style={styles.periodNavButton} onPress={() => handleShift(-1)}>
            <Ionicons name="chevron-back" size={20} color={colors.TEXT} />
          </TouchableOpacity>
          <Text style={styles.periodLabel}>{stats.label}</Text>
          <TouchableOpacity
            style={styles.periodNavButton}
            onPress={() => handleShift(1)}
            disabled={isAtCurrentPeriod}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isAtCurrentPeriod ? colors.BORDER : colors.TEXT}
            />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.placeholderCard}>
            <ActivityIndicator size="small" color={colors.PRIMARY} />
            <Text style={styles.placeholderTitle}>러닝 기록을 불러오는 중</Text>
          </View>
        ) : errorCode ? (
          <View style={styles.placeholderCard}>
            <Ionicons name="warning-outline" size={34} color={colors.WARNING} />
            <Text style={styles.placeholderTitle}>러닝 기록을 불러오지 못했어요</Text>
            <Text style={styles.placeholderText}>
              {errorCode === 'NO_PERMISSION'
                ? 'Health Connect에서 RunOn의 운동 기록 권한을 확인해주세요.'
                : '잠시 후 다시 시도해주세요.'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadWorkouts({ force: true })}
            >
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 요약 지표 */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>총 거리</Text>
                  <View style={styles.summaryValueRow}>
                    <Text style={styles.summaryValue}>{formatKm(summary.totalDistanceMeters)}</Text>
                    <Text style={styles.summaryUnit}>km</Text>
                  </View>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>러닝</Text>
                  <View style={styles.summaryValueRow}>
                    <Text style={styles.summaryValue}>{summary.runCount}</Text>
                    <Text style={styles.summaryUnit}>회</Text>
                  </View>
                </View>
              </View>

              <View style={styles.summaryRowDivider} />

              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>평균 거리</Text>
                  <View style={styles.summaryValueRow}>
                    <Text style={styles.summaryValueSmall}>
                      {formatKm(summary.avgDistanceMeters, 2)}
                    </Text>
                    <Text style={styles.summaryUnit}>km</Text>
                  </View>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>평균 페이스</Text>
                  <View style={styles.summaryValueRow}>
                    <Text style={styles.summaryValueSmall}>
                      {formatPaceLabel(summary.avgPaceSecPerKm)}
                    </Text>
                    <Text style={styles.summaryUnit}>/km</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 거리 차트 */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>
                {period === PERIOD_WEEK ? '요일별 거리' : period === PERIOD_MONTH ? '일별 거리' : '월별 거리'}
              </Text>
              <RunningStatsChart
                stats={stats}
                selectedIndex={selectedIndex}
                onSelectBucket={setSelectedIndex}
              />
            </View>

            {/* 부가 정보 */}
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>총 러닝 시간</Text>
                <Text style={styles.detailValue}>
                  {formatDurationLabel(summary.totalDurationSeconds)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>러닝한 날</Text>
                <Text style={styles.detailValue}>{summary.activeDays}일</Text>
              </View>
            </View>

            {summary.runCount === 0 && (
              <Text style={styles.emptyHint}>이 기간에는 러닝 기록이 없어요.</Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
  },
  header: {
    backgroundColor: colors.SURFACE,
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.TEXT,
    fontFamily: 'Pretendard-SemiBold',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: colors.CARD,
    borderRadius: 10,
    padding: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: colors.PRIMARY,
  },
  periodTabText: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
    fontFamily: 'Pretendard-Medium',
  },
  periodTabTextActive: {
    // 시안 배경 위 텍스트 — colors.BACKGROUND는 라이트모드에서 흰색이라 대비가 무너진다
    color: '#000000',
    fontFamily: 'Pretendard-SemiBold',
  },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 14,
  },
  periodNavButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodLabel: {
    fontSize: 17,
    color: colors.TEXT,
    fontFamily: 'Pretendard-SemiBold',
  },
  summaryCard: {
    backgroundColor: colors.SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.BORDER,
    paddingVertical: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.BORDER,
  },
  summaryRowDivider: {
    height: 1,
    backgroundColor: colors.BORDER,
    marginVertical: 16,
    marginHorizontal: 18,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
    fontFamily: 'Pretendard',
    marginBottom: 6,
  },
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  summaryValue: {
    fontSize: 28,
    color: colors.PRIMARY,
    fontFamily: 'Pretendard-Bold',
  },
  summaryValueSmall: {
    fontSize: 22,
    color: colors.TEXT,
    fontFamily: 'Pretendard-SemiBold',
  },
  summaryUnit: {
    fontSize: 13,
    color: colors.TEXT_SECONDARY,
    fontFamily: 'Pretendard',
    marginLeft: 3,
  },
  chartCard: {
    backgroundColor: colors.SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.BORDER,
    padding: 18,
    marginTop: 14,
  },
  chartTitle: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY_STRONG,
    fontFamily: 'Pretendard-Medium',
    marginBottom: 10,
  },
  detailCard: {
    backgroundColor: colors.SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.BORDER,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginTop: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
    fontFamily: 'Pretendard',
  },
  detailValue: {
    fontSize: 15,
    color: colors.TEXT,
    fontFamily: 'Pretendard-SemiBold',
  },
  placeholderCard: {
    backgroundColor: colors.SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.BORDER,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: 15,
    color: colors.TEXT,
    fontFamily: 'Pretendard-SemiBold',
    marginTop: 12,
  },
  placeholderText: {
    fontSize: 13,
    color: colors.TEXT_SECONDARY,
    fontFamily: 'Pretendard',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: colors.PRIMARY,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#000000',
    fontFamily: 'Pretendard-SemiBold',
  },
  emptyHint: {
    fontSize: 13,
    color: colors.TEXT_SECONDARY,
    fontFamily: 'Pretendard',
    textAlign: 'center',
    marginTop: 18,
  },
});

export default RunningStatsScreen;
