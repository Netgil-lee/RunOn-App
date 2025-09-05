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

import { SEASON_OPTIONS } from '../constants/onboardingOptions';

const OnboardingSeasonSelector = ({ value = [], onChange }) => {
  const toggleArrayItem = (array, item) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    } else {
      return [...array, item];
    }
  };

  return (
    <View style={styles.container}>
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

const styles = StyleSheet.create({
  container: {
    // flex: 1,
  },

  optionsContainer: {
    gap: 16,
  },
  seasonCard: {
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
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  seasonDescription: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'left',
    lineHeight: 22,
  },
});

export default OnboardingSeasonSelector; 