import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Keyboard, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firestoreService from '../services/firestoreService';

const OnboardingBioInput = ({
  nickname = '',
  bio = '',
  onChangeNickname,
  onChangeBio,
  isNicknameImmutable = false, // 닉네임 변경불가능 여부
  isProfileEdit = false, // 프로필 편집 모달 여부
  colors = {
    TEXT: '#fff',
    PRIMARY: '#3AF8FF',
    CARD: '#171719',
    TEXT_SECONDARY: '#666',
    ERROR: '#FF4444',
    SUCCESS: '#00FF88',
  },
}) => {
  const nicknameRef = useRef(null);
  const bioRef = useRef(null);
  const debounceTimer = useRef(null);
  
  // 닉네임 검증 상태
  const [nicknameStatus, setNicknameStatus] = useState({
    isValid: false,
    isChecking: false,
    message: '',
    type: 'default' // 'default', 'success', 'error', 'warning'
  });

  // 디바운싱을 통한 실시간 닉네임 중복 체크
  const checkNicknameAvailability = async (nicknameValue) => {
    if (!nicknameValue || nicknameValue.trim().length < 2) {
      setNicknameStatus({
        isValid: false,
        isChecking: false,
        message: '닉네임은 2자 이상 입력해주세요.',
        type: 'warning'
      });
      return;
    }

    if (nicknameValue.trim().length > 8) {
      setNicknameStatus({
        isValid: false,
        isChecking: false,
        message: '닉네임은 8자 이하로 입력해주세요.',
        type: 'error'
      });
      return;
    }

    setNicknameStatus(prev => ({ ...prev, isChecking: true }));

    try {
      const result = await firestoreService.checkNicknameAvailability(nicknameValue);
      
      setNicknameStatus({
        isValid: result.available,
        isChecking: false,
        message: result.available ? '사용 가능한 닉네임입니다.' : result.reason,
        type: result.available ? 'success' : 'error'
      });
    } catch (error) {
      setNicknameStatus({
        isValid: false,
        isChecking: false,
        message: '닉네임 확인 중 오류가 발생했습니다.',
        type: 'error'
      });
    }
  };

  // 닉네임 변경 핸들러 (디바운싱 적용)
  const handleNicknameChange = (value) => {
    onChangeNickname(value);
    
    // 기존 타이머 클리어
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // 500ms 후에 중복 체크 실행
    debounceTimer.current = setTimeout(() => {
      checkNicknameAvailability(value);
    }, 500);
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // 닉네임 상태에 따른 스타일 결정
  const getNicknameInputStyle = () => {
    // 기본 테두리 색상 사용
    const defaultBorderColor = '#333';
    return [styles.input, { color: colors.TEXT, borderColor: defaultBorderColor }];
  };

  // 닉네임 상태 메시지 색상
  const getStatusMessageColor = () => {
    switch (nicknameStatus.type) {
      case 'success': return colors.SUCCESS;
      case 'error': return colors.ERROR;
      case 'warning': return '#FFA500';
      default: return colors.TEXT_SECONDARY;
    }
  };
  
  return (
  <View style={styles.stepContainer}>
    <Text style={[styles.stepTitle, { color: colors.TEXT }]}>닉네임과 자기소개를 입력해주세요</Text>
    <Text style={[styles.stepSubtitle, { color: colors.TEXT_SECONDARY }]}>
      {isProfileEdit 
        ? '자기소개는 30자 이내로 입력해 주세요'
        : isNicknameImmutable 
          ? '닉네임은 한 번 설정하면 변경할 수 없습니다. 신중하게 입력해주세요.' 
          : '닉네임은 2~8자, 자기소개는 30자 이내로 입력해 주세요'
      }
    </Text>
    
    {/* 닉네임 입력 필드 */}
    <View style={styles.nicknameContainer}>
      <TextInput
        ref={nicknameRef}
        style={getNicknameInputStyle()}
        placeholder={isNicknameImmutable ? "닉네임 (변경불가)" : "닉네임"}
        placeholderTextColor={colors.TEXT_SECONDARY}
        value={nickname}
        onChangeText={handleNicknameChange}
        maxLength={8}
        autoCapitalize="none"
        returnKeyType="next"
        blurOnSubmit={false}
        editable={!isNicknameImmutable}
        onSubmitEditing={() => {
          bioRef.current?.focus();
        }}
      />
      
      {/* 닉네임 상태 표시 */}
      <View style={styles.nicknameStatusContainer}>
        {nicknameStatus.isChecking && (
          <View style={styles.statusIndicator}>
            <ActivityIndicator size="small" color={colors.PRIMARY} />
            <Text style={[styles.statusText, { color: colors.TEXT_SECONDARY }]}>확인 중...</Text>
          </View>
        )}
        
        {!nicknameStatus.isChecking && nicknameStatus.message && (
          <View style={styles.statusIndicator}>
            <Ionicons 
              name={
                nicknameStatus.type === 'success' ? 'checkmark-circle' :
                nicknameStatus.type === 'error' ? 'close-circle' :
                nicknameStatus.type === 'warning' ? 'warning' : 'information-circle'
              } 
              size={16} 
              color={getStatusMessageColor()} 
            />
            <Text style={[styles.statusText, { color: getStatusMessageColor() }]}>
              {nicknameStatus.message}
            </Text>
          </View>
        )}
        
        {isNicknameImmutable && nickname && (
          <View style={styles.statusIndicator}>
            <Ionicons name="lock-closed" size={16} color={colors.TEXT_SECONDARY} />
            <Text style={[styles.statusText, { color: colors.TEXT_SECONDARY }]}>
              닉네임은 변경할 수 없습니다
            </Text>
          </View>
        )}
      </View>
    </View>
    
    {/* 자기소개 입력 필드 */}
    <TextInput
      ref={bioRef}
      style={[
        styles.input, 
        { 
          color: colors.TEXT, 
          borderColor: '#333', 
          height: 80, 
          textAlignVertical: 'top', 
          marginBottom: 0 
        }
      ]}
      placeholder="자기소개 (30자 이내)"
      placeholderTextColor={colors.TEXT_SECONDARY}
      value={bio}
      onChangeText={onChangeBio}
      maxLength={30}
      multiline
      returnKeyType="done"
      blurOnSubmit={true}
      onSubmitEditing={() => {
        Keyboard.dismiss();
      }}
    />
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
  nicknameContainer: {
    marginBottom: 14,
  },
  input: {
    backgroundColor: '#222',
    borderRadius: 10,
    borderWidth: 0.5,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  nicknameStatusContainer: {
    minHeight: 20,
    marginBottom: 6,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
});

export default OnboardingBioInput; 