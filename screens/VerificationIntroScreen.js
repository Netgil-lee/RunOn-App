import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const VerificationIntroScreen = ({ navigation }) => {
  const handleStartVerification = () => {
    navigation.navigate('PhoneAuth');
  };

  const handleStartCarrierAuth = () => {
    navigation.navigate('CarrierAuth');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >


        {/* 본인인증 안내 섹션 */}
        <View style={styles.introSection}>
          {/* 방패 아이콘 */}
          <View style={styles.checkmarkContainer}>
            <Ionicons name="shield-checkmark" size={60} color="#6B7280" />
          </View>

          {/* 안내 텍스트 */}
          <View style={styles.introTextContainer}>
            <Text style={styles.introTitle}>본인인증을 완료하고</Text>
            <Text style={styles.introSubtitle}>검증된 회원만 만나세요</Text>
            <Text style={styles.introDescription}>통신사 본인인증으로 더욱 안전하고 신뢰할 수 있는 인증을 진행합니다</Text>
          </View>
        </View>

        {/* 프로필 카드 섹션 */}
        <View style={styles.profileSection}>
          <View style={styles.profileCardsContainer}>
            {/* 왼쪽 카드 */}
            <View style={styles.profileCardLeft}>
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={30} color="#666" />
              </View>
              <View style={styles.verificationBadge}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            </View>

            {/* 중앙 카드 (메인) */}
            <View style={styles.profileCardMain}>
              <View style={styles.profileImageMain}>
                <Ionicons name="person" size={50} color="#fff" />
              </View>
              <View style={styles.verificationInfo}>
                <Ionicons name="checkmark-circle" size={24} color="#3AF8FF" />
                <Text style={styles.verificationText}>나이, 성별 인증완료</Text>
              </View>
            </View>

            {/* 오른쪽 카드 */}
            <View style={styles.profileCardRight}>
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={30} color="#666" />
              </View>
              <View style={styles.verificationBadge}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            </View>
          </View>
        </View>

        {/* 인증 방식 안내 섹션 */}
        <View style={styles.verificationMethodsSection}>
          {/* 국가 인증 */}
          <View style={styles.methodItem}>
            <View style={styles.methodIconContainer}>
              <View style={styles.kccIcon}>
                <Text style={styles.kccText}>KCC</Text>
              </View>
            </View>
            <View style={styles.methodTextContainer}>
              <Text style={styles.methodTitle}>휴대폰 본인인증</Text>
              <Text style={styles.methodDescription}>내 휴대폰 번호를 입력하여 본인을 검증해요.</Text>
            </View>
          </View>

          {/* 통신사 인증 */}
          <View style={styles.methodItem}>
            <View style={styles.methodIconContainer}>
              <View style={styles.telecomIcon}>
                <Ionicons name="person" size={20} color="#fff" />
                <Ionicons name="card" size={20} color="#fff" style={styles.cardIcon} />
              </View>
            </View>
            <View style={styles.methodTextContainer}>
              <Text style={styles.methodTitle}>나이와 성별, 정확하게 확인</Text>
              <Text style={styles.methodDescription}>나이와 성별을 정확하게 확인해요.</Text>
            </View>
          </View>
        </View>

        {/* 하단 여백 */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

              {/* 하단 버튼 */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={styles.verificationButton}
            onPress={handleStartCarrierAuth}
          >
            <Text style={styles.verificationButtonText}>통신사 본인인증하기</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.alternativeButton}
            onPress={handleStartVerification}
          >
            <Text style={styles.alternativeButtonText}>SMS 인증으로 진행</Text>
          </TouchableOpacity>
        </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 20,
  },

  introSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
  },
  checkmarkContainer: {
    marginBottom: 20,
  },

  introTextContainer: {
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Pretendard-SemiBold',
  },
  introSubtitle: {
    fontSize: 26,
    color: '#fff',
    fontFamily: 'Pretendard-SemiBold',
    marginBottom: 8,
  },
  introDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Pretendard-Regular',
  },
  profileSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  profileCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCardLeft: {
    width: 100,
    height: 120,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    position: 'relative',
  },
  profileCardMain: {
    width: 150,
    height: 170,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  profileCardRight: {
    width: 100,
    height: 120,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 15,
    position: 'relative',
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageMain: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 20,
    height: 20,
    borderRadius: 12,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationInfo: {
    position: 'absolute',
    bottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 6,
    marginTop: 4,
    fontFamily: 'Pretendard-Regular',
  },
  verificationMethodsSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  methodIconContainer: {
    width: 50,
    height: 50,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kccIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kccText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Pretendard-Bold',
  },
  telecomIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  methodTextContainer: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
    fontFamily: 'Pretendard-SemiBold',
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
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
  verificationButton: {
    backgroundColor: '#3AF8FF',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  verificationButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
  alternativeButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  alternativeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Pretendard-SemiBold',
  },
});

export default VerificationIntroScreen; 