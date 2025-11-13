import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HAN_RIVER_PARKS, RIVER_SIDES } from '../constants/onboardingOptions';

const OnboardingCourseSelector = ({
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
      <Text style={[styles.stepTitle, { color: colors.TEXT }]}>선호하는 코스를 선택해주세요</Text>
      <Text style={[styles.stepSubtitle, { color: colors.TEXT_SECONDARY }]}>여러 개 선택 가능해요</Text>
      {/* 한강공원 */}
      <View style={styles.courseSection}>
        <Text style={[styles.courseSectionTitle, { color: colors.TEXT }]}>한강공원</Text>
        <View style={styles.courseGrid}>
          {HAN_RIVER_PARKS.map((park) => (
            <TouchableOpacity
              key={park.id}
              style={[
                styles.courseCard,
                value.includes(park.id) && { borderColor: colors.PRIMARY, backgroundColor: colors.CARD },
              ]}
              onPress={() => toggle(park.id)}
            >
              <Text style={[styles.courseName, { color: colors.TEXT }]}>{park.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {/* 강변 */}
      <View style={styles.courseSection}>
        <Text style={[styles.courseSectionTitle, { color: colors.TEXT }]}>강변</Text>
        <View style={styles.courseGrid}>
          {RIVER_SIDES.map((river) => (
            <TouchableOpacity
              key={river.id}
              style={[
                styles.courseCard,
                value.includes(river.id) && { borderColor: colors.PRIMARY, backgroundColor: colors.CARD },
              ]}
              onPress={() => toggle(river.id)}
            >
              <Text style={[styles.courseName, { color: colors.TEXT }]}>{river.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stepContainer: {
    marginBottom: 24,
    marginTop: 20,
    width: '85%',
    alignSelf: 'center',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 15,
    marginBottom: 30,
  },
  courseSection: {
    marginBottom: 18,
    marginTop: 24,
  },
  courseSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  courseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  courseCard: {
    width: '48%',
    backgroundColor: '#171719',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseName: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  courseDescription: {
    fontSize: 13,
    color: '#666',
  },
});

export default OnboardingCourseSelector; 