import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

import { SEASON_OPTIONS } from '../constants/onboardingOptions';

const OnboardingSeasonSelector = ({ value = [], onChange }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const toggleArrayItem = (array, item) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    } else {
      return [...array, item];
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>선호하는 계절을 선택해주세요</Text>
      <Text style={styles.stepSubtitle}>여러 개 선택 가능해요</Text>
      <View style={styles.optionsContainer}>
        {SEASON_OPTIONS.map((season) => (
          <TouchableOpacity
            key={season.id}
            style={[
              styles.seasonCard,
              value.includes(season.id) && styles.selectedCard
            ]}
            onPress={() => {
              onChange(toggleArrayItem(value, season.id));
            }}
          >
            <View style={styles.seasonHeader}>
              <Text style={styles.seasonEmoji}>{season.emoji}</Text>
              <View style={styles.seasonInfo}>
                <Text style={styles.seasonTitle}>{season.title}</Text>
                <Text style={styles.seasonDescription}>{season.description}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    width: '85%',
    alignSelf: 'center',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
    color: colors.TEXT,
  },
  stepSubtitle: {
    fontSize: 15,
    marginBottom: 30,
    color: colors.TEXT_SECONDARY,
  },

  optionsContainer: {
    gap: 12,
  },
  seasonCard: {
    backgroundColor: colors.CARD,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.BORDER,
  },
  selectedCard: {
    borderColor: colors.PRIMARY,
    backgroundColor: colors.SURFACE,
  },
  seasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seasonInfo: {
    marginLeft: 16,
    flex: 1,
  },
  seasonEmoji: {
    fontSize: 32,
  },
  seasonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.TEXT,
    marginBottom: 4,
  },
  seasonDescription: {
    fontSize: 16,
    color: colors.TEXT_SECONDARY,
    textAlign: 'left',
    lineHeight: 22,
  },
});

export default OnboardingSeasonSelector;
