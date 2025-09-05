import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { TIME_OPTIONS } from '../constants/onboardingOptions';

const OnboardingTimeSelector = ({
  value = [],
  onChange,
  colors = {
    TEXT: '#fff',
    PRIMARY: '#3AF8FF',
    CARD: '#171719',
    TEXT_SECONDARY: '#666',
  },
}) => {
  const toggle = (id) => {
    if (!onChange) return;
    if (value.includes(id)) {
      onChange(value.filter(x => x !== id));
    } else {
      onChange([...value, id]);
    }
  };
  
  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.TEXT }]}>선호하는 시간을 선택해주세요</Text>
      <Text style={[styles.stepSubtitle, { color: colors.TEXT_SECONDARY }]}>여러 개 선택 가능해요</Text>
      <View style={styles.timeGrid}>
        {TIME_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.id}
            style={[
              styles.timeCard,
              value.includes(opt.id) && { borderColor: colors.PRIMARY, backgroundColor: colors.CARD },
            ]}
            onPress={() => toggle(opt.id)}
          >
            <Text style={[styles.timeTitle, { color: colors.TEXT }]}>{opt.title}</Text>
            <Text style={[styles.timeText, { color: colors.TEXT_SECONDARY }]}>({opt.time})</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stepContainer: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 18,
    marginBottom: 18,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeCard: {
    backgroundColor: '#171719',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
    marginRight: 8,
    minWidth: 120,
  },
  timeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 15,
  },
});

export default OnboardingTimeSelector; 