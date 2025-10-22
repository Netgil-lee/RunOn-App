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

import { RUNNING_STYLE_OPTIONS } from '../constants/onboardingOptions';

const OnboardingStyleSelector = ({ value = [], onChange }) => {
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

const styles = StyleSheet.create({
  container: {
    width: '85%',
    alignSelf: 'center',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#ffffff',
  },
  stepSubtitle: {
    fontSize: 15,
    marginBottom: 30,
    color: '#666666',
  },

  optionsContainer: {
    gap: 12,
  },
  styleCard: {
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
  styleContent: {
    flex: 1,
  },
  styleTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  styleDescription: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'left',
    lineHeight: 22,
  },
});

export default OnboardingStyleSelector; 