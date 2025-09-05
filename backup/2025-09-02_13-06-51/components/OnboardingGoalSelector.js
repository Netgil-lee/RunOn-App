import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  TEXT_SECONDARY: '#666666',
  ERROR: '#FF4444',
  SUCCESS: '#00FF88',
};

import { GOAL_OPTIONS } from '../constants/onboardingOptions';

const OnboardingGoalSelector = ({ value = [], onChange }) => {
  const toggleArrayItem = (array, item) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    } else {
      return [...array, item];
    }
  };

  console.log('🎯 OnboardingGoalSelector - 현재 선택된 값:', value);
  console.log('🎯 GOAL_OPTIONS:', GOAL_OPTIONS);

  return (
    <View style={styles.container}>
      <View style={styles.optionsContainer}>
        {GOAL_OPTIONS.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={[
              styles.goalCard,
              value.includes(goal.id) && styles.selectedCard
            ]}
            onPress={() => {
              console.log('🎯 목표 선택됨:', goal.id);
              const newValue = toggleArrayItem(value, goal.id);
              console.log('🎯 새로운 값:', newValue);
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

const styles = StyleSheet.create({
  container: {
    // flex: 1,
  },

  optionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  goalCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#333333',
  },
  selectedCard: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.SURFACE,
  },
  goalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
});

export default OnboardingGoalSelector; 