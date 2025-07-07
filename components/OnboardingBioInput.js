import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

const OnboardingBioInput = ({
  nickname = '',
  bio = '',
  onChangeNickname,
  onChangeBio,
  colors = {
    TEXT: '#fff',
    PRIMARY: '#3AF8FF',
    CARD: '#171719',
    TEXT_SECONDARY: '#666',
  },
}) => (
  <View style={styles.stepContainer}>
    <Text style={[styles.stepTitle, { color: colors.TEXT }]}>닉네임과 자기소개를 입력해주세요</Text>
    <Text style={[styles.stepSubtitle, { color: colors.TEXT_SECONDARY }]}>닉네임은 2~8자, 자기소개는 30자 이내로 입력해 주세요</Text>
    <TextInput
      style={[styles.input, { color: colors.TEXT, borderColor: colors.PRIMARY }]}
      placeholder="닉네임"
      placeholderTextColor={colors.TEXT_SECONDARY}
      value={nickname}
      onChangeText={onChangeNickname}
      maxLength={8}
      autoCapitalize="none"
    />
    <TextInput
      style={[styles.input, { color: colors.TEXT, borderColor: colors.PRIMARY, height: 80, textAlignVertical: 'top' }]}
      placeholder="자기소개 (30자 이내)"
      placeholderTextColor={colors.TEXT_SECONDARY}
      value={bio}
      onChangeText={onChangeBio}
      maxLength={30}
      multiline
    />
  </View>
);

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
    fontSize: 15,
    marginBottom: 18,
  },
  input: {
    backgroundColor: '#222',
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 12,
    fontSize: 16,
    marginBottom: 14,
  },
});

export default OnboardingBioInput; 