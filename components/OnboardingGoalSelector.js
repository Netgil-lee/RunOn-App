import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

import { GOAL_OPTIONS } from '../constants/onboardingOptions';

const OnboardingGoalSelector = ({ value = [], onChange }) => {
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
      <Text style={styles.stepTitle}>현재 목표를 선택해주세요</Text>
      <Text style={styles.stepSubtitle}>여러 개 선택 가능해요</Text>
      <View style={styles.optionsContainer}>
        {GOAL_OPTIONS.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={[
              styles.goalCard,
              value.includes(goal.id) && styles.selectedCard
            ]}
            onPress={() => {
              const newValue = toggleArrayItem(value, goal.id);
              onChange(newValue);
            }}
          >
            <Text style={styles.goalTitle}>{goal.title}</Text>
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
    marginBottom: 32,
  },
  goalCard: {
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
  goalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.TEXT,
  },
});

export default OnboardingGoalSelector;
