import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../contexts/NetworkContext';

const CarrierAuthScreen = ({ navigation }) => {
  const [selectedCarrier, setSelectedCarrier] = useState(null);
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { carrierAuth } = useAuth();
  const { isOnline } = useNetwork();
  
  const scrollViewRef = useRef(null);
  const phoneInputRef = useRef(null);

  const carriers = [
    { id: 'SKT', name: 'SKT', color: '#FF6B35' },
    { id: 'KT', name: 'KT', color: '#FFD700' },
    { id: 'LGU', name: 'LG U+', color: '#FF69B4' },
  ];

  const genders = [
    { id: 'M', name: '남성' },
    { id: 'F', name: '여성' },
  ];

  // 휴대폰번호 포맷팅 (010-1234-5678)
  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  // 생년월일 포맷팅 (YYYY-MM-DD)
  const formatBirthDate = (value) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 4) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    return `${numbers.slice(0, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6, 8)}`;
  };

  // 유효성 검사
  const validateForm = () => {
    if (!selectedCarrier) {
      setError('통신사를 선택해주세요.');
      return false;
    }
    if (!birthDate || birthDate.length !== 10) {
      setError('생년월일을 올바르게 입력해주세요.');
      return false;
    }
    if (!gender) {
      setError('성별을 선택해주세요.');
      return false;
    }
    if (!phoneNumber || phoneNumber.length !== 13) {
      setError('휴대폰번호를 올바르게 입력해주세요.');
      return false;
    }
    return true;
  };

  const handlePhoneNumberChange = (value) => {
    const formatted = formatPhoneNumber(value);
    setPhoneNumber(formatted);
    setError('');
  };

  const handleBirthDateChange = (value) => {
    const formatted = formatBirthDate(value);
    setBirthDate(formatted);
    setError('');
  };

  const handleCarrierAuth = async () => {
    console.log('🚀 통신사 본인인증 시작');
    console.log('📱 입력 정보:', { selectedCarrier, birthDate, gender, phoneNumber });
    console.log('🌐 온라인 상태:', isOnline);
    
    if (!isOnline) {
      Alert.alert('오프라인 상태', '인터넷 연결을 확인해주세요.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      console.log('📞 carrierAuth 호출 중...');
      const result = await carrierAuth({
        carrier: selectedCarrier,
        birthDate,
        gender,
        phoneNumber
      });
      
      console.log('✅ 통신사 본인인증 성공:', result);
      
      // 인증 성공 시 다음 화면으로 이동 (프로필 정보는 온보딩에서 저장)
      navigation.navigate('Onboarding', { 
        isCarrierVerified: true,
        userInfo: {
          birthDate: birthDate,
          gender: gender === 'M' ? '남성' : '여성',
          age: result.userInfo.age,
          carrierVerified: true,
          carrierVerifiedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ CarrierAuthScreen 에러:', error);
      setError(error.message || '본인인증에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const isButtonDisabled = !selectedCarrier || !birthDate || !gender || !phoneNumber || isLoading;

  // 키보드가 나타날 때 스크롤 처리
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        // 휴대폰번호 입력칸이 포커스되었을 때 스크롤
        if (phoneInputRef.current && phoneInputRef.current.isFocused()) {
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>본인인증</Text>
          <View style={styles.placeholder} />
        </View>

        {/* 안내 텍스트 */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>통신사 본인인증</Text>
          <Text style={styles.introSubtitle}>안전하고 신뢰할 수 있는 본인인증을 진행합니다</Text>
        </View>

        {/* 통신사 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>통신사 선택</Text>
          <View style={styles.carrierContainer}>
            {carriers.map((carrier) => (
              <TouchableOpacity
                key={carrier.id}
                style={[
                  styles.carrierButton,
                  selectedCarrier === carrier.id && styles.selectedCarrierButton,
                  selectedCarrier === carrier.id && { borderColor: carrier.color }
                ]}
                onPress={() => {
                  setSelectedCarrier(carrier.id);
                  setError('');
                }}
              >
                <Text style={[
                  styles.carrierText,
                  selectedCarrier === carrier.id && { color: carrier.color }
                ]}>
                  {carrier.name}
                </Text>
                {selectedCarrier === carrier.id && (
                  <Ionicons name="checkmark-circle" size={20} color={carrier.color} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 생년월일 입력 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>생년월일</Text>
          <Text style={styles.sectionDescription}>주민등록번호 앞자리 6자리</Text>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#666"
            value={birthDate}
            onChangeText={handleBirthDateChange}
            keyboardType="numeric"
            maxLength={10}
            editable={!isLoading}
          />
        </View>

        {/* 성별 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>성별</Text>
          <View style={styles.genderContainer}>
            {genders.map((genderOption) => (
              <TouchableOpacity
                key={genderOption.id}
                style={[
                  styles.genderButton,
                  gender === genderOption.id && styles.selectedGenderButton
                ]}
                onPress={() => {
                  setGender(genderOption.id);
                  setError('');
                }}
              >
                <Text style={[
                  styles.genderText,
                  gender === genderOption.id && styles.selectedGenderText
                ]}>
                  {genderOption.name}
                </Text>
                {gender === genderOption.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#3AF8FF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 휴대폰번호 입력 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>휴대폰번호</Text>
          <Text style={styles.sectionDescription}>본인인증할 휴대폰번호를 입력하세요</Text>
          <TextInput
            ref={phoneInputRef}
            style={[styles.input, error && styles.inputError]}
            placeholder="010-0000-0000"
            placeholderTextColor="#666"
            value={phoneNumber}
            onChangeText={handlePhoneNumberChange}
            keyboardType="phone-pad"
            maxLength={13}
            editable={!isLoading}
          />
        </View>

        {/* 에러 메시지 */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* 하단 여백 */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={[styles.authButton, isButtonDisabled && styles.disabledButton]}
          onPress={handleCarrierAuth}
          disabled={isButtonDisabled}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.authButtonText}>본인인증하기</Text>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Pretendard-SemiBold',
  },
  placeholder: {
    width: 34,
  },
  introSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Pretendard-SemiBold',
  },
  introSubtitle: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Pretendard-Regular',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Pretendard-SemiBold',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontFamily: 'Pretendard-Regular',
  },
  carrierContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  carrierButton: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    flexDirection: 'row',
  },
  selectedCarrierButton: {
    borderWidth: 2,
    backgroundColor: '#1a1a1a',
  },
  carrierText: {
    fontSize: 16,
    color: '#fff',
    marginRight: 8,
    fontFamily: 'Pretendard-Regular',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderButton: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    flexDirection: 'row',
  },
  selectedGenderButton: {
    borderColor: '#3AF8FF',
    backgroundColor: '#1a1a1a',
  },
  genderText: {
    fontSize: 16,
    color: '#fff',
    marginRight: 8,
    fontFamily: 'Pretendard-Regular',
  },
  selectedGenderText: {
    color: '#3AF8FF',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    fontFamily: 'Pretendard-Regular',
  },
  inputError: {
    borderColor: '#FF4444',
  },
  errorContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    fontFamily: 'Pretendard-Regular',
  },
  bottomSpacing: {
    height: 20,
  },
  bottomButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: '#000',
  },
  authButton: {
    backgroundColor: '#3AF8FF',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  authButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
});

export default CarrierAuthScreen; 