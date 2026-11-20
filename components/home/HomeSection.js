import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

/** 홈 섹션 제목 줄: 왼쪽 제목, 오른쪽 '더보기 ›' */
export const SectionHeader = ({ title, onMorePress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.header}>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {onMorePress && (
        <TouchableOpacity
          onPress={onMorePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={`${title} 더보기`}
        >
          <Text style={styles.more}>더보기 ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/** 칩 필터 한 줄. chips: [{ key, label }] */
export const FilterChips = ({ chips, selectedKey, onSelect }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {chips.map((chip) => {
        const selected = chip.key === selectedKey;
        return (
          <TouchableOpacity
            key={chip.key}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onSelect(chip.key)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

/**
 * 섹션에 보여줄 내용이 없을 때 그 자리에 놓는 안내 카드.
 * 섹션을 숨기지 않고, 무엇을 하면 채워지는지와 바로 갈 수 있는 버튼을 보여준다.
 */
export const EmptyCard = ({ message, actionLabel, onActionPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionLabel && (
        <TouchableOpacity style={styles.emptyAction} onPress={onActionPress} accessibilityRole="button">
          <Text style={styles.emptyActionText} numberOfLines={1}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/** 데이터를 불러오는 동안 카드 자리에 놓는 회색 상자 */
export const SkeletonBox = ({ style }) => {
  const { colors } = useTheme();
  return <View style={[{ backgroundColor: colors.CARD, borderRadius: 12 }, style]} />;
};

const createStyles = (colors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontFamily: 'Pretendard-SemiBold',
    color: colors.TEXT,
  },
  more: {
    fontSize: 13,
    fontFamily: 'Pretendard-Regular',
    color: colors.TEXT_SECONDARY,
  },
  chips: {
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.BORDER,
  },
  chipSelected: {
    backgroundColor: colors.PRIMARY,
    borderColor: colors.PRIMARY,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Pretendard-Medium',
    color: colors.TEXT_SECONDARY,
  },
  chipTextSelected: {
    color: colors.ON_PRIMARY,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.CARD,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.BORDER,
  },
  emptyMessage: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Pretendard-Regular',
    color: colors.TEXT_SECONDARY_STRONG,
  },
  emptyAction: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: colors.PRIMARY,
  },
  emptyActionText: {
    fontSize: 13,
    fontFamily: 'Pretendard-SemiBold',
    color: colors.ON_PRIMARY,
  },
});
