import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

import { RUNNING_STYLE_OPTIONS } from '../constants/onboardingOptions';

const OnboardingStyleSelector = ({ value = [], onChange }) => {
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
      <Text style={styles.stepTitle}>러닝 스타일을 선택해주세요</Text>
      <Text style={styles.stepSubtitle}>여러 개 선택 가능해요</Text>
      <View style={styles.optionsContainer}>
        {RUNNING_STYLE_OPTIONS.map((style) => (
          <TouchableOpacity
            key={style.id}
            style={[
              styles.styleCard,
              value.includes(style.id) && styles.selectedCard
            ]}
            onPress={() => {
              onChange(toggleArrayItem(value, style.id));
            }}
          >
            <View style={styles.styleContent}>
              <Text style={styles.styleTitle}>{style.title}</Text>
              <Text style={styles.styleDescription}>{style.description}</Text>
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
  styleCard: {
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
  styleContent: {
    flex: 1,
  },
  styleTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.TEXT,
    marginBottom: 4,
  },
  styleDescription: {
    fontSize: 16,
    color: colors.TEXT_SECONDARY,
    textAlign: 'left',
    lineHeight: 22,
  },
});

export default OnboardingStyleSelector;
