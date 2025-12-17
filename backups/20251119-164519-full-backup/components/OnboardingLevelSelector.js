import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const OnboardingLevelSelector = ({
  value = '',
  onChange,
  colors = {
    TEXT: '#fff',
    PRIMARY: '#3AF8FF',
    CARD: '#171719',
    TEXT_SECONDARY: '#666',
  },
  levels = [
    { id: 'beginner', title: '초보', pace: '7분 이상 페이스', description: '러닝을 시작한 지 얼마 안 되었거나\n천천히 즐기며 달리는 것을 좋아해요' },
    { id: 'intermediate', title: '중급', pace: '5-7분 페이스', description: '어느 정도 러닝에 익숙하고\n꾸준한 페이스로 달릴 수 있어요' },
    { id: 'advanced', title: '고급', pace: '5분 이하 페이스', description: '러닝 경험이 풍부하고\n빠른 속도로 달리는 것을 즐겨요' },
  ],
}) => (
  <View style={styles.stepContainer}>
    <Text style={[styles.stepTitle, { color: colors.TEXT }]}>러닝 레벨을 선택해주세요</Text>
    <Text style={[styles.stepSubtitle, { color: colors.TEXT_SECONDARY }]}>본인의 러닝 실력에 맞는 레벨을 선택하세요</Text>
    <View style={styles.levelOptionsContainer}>
      {levels.map((level) => (
        <TouchableOpacity
          key={level.id}
          style={[
            styles.levelCard,
            value === level.id && { borderColor: colors.PRIMARY, backgroundColor: colors.CARD },
          ]}
          onPress={() => onChange(level.id)}
        >
          <View style={styles.levelHeader}>
            <Text style={[styles.levelTitle, { color: colors.TEXT }]}>{level.title}</Text>
          </View>
          <Text style={[styles.levelDescription, { color: colors.TEXT_SECONDARY }]}>{level.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

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
  levelOptionsContainer: {
    gap: 4,
  },
  levelCard: {
    backgroundColor: '#171719',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 12,
  },
  levelPace: {
    fontSize: 15,
    fontWeight: '600',
  },
  levelDescription: {
    fontSize: 15,
    lineHeight: 20,
  },
});

export default OnboardingLevelSelector; 