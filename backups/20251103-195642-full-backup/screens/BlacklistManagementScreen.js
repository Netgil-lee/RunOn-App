import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import blacklistService from '../services/blacklistService';

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#FF0073',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  TEXT_SECONDARY: '#666666',
  BORDER: '#1F2937',
  RED: '#FF6B6B',
};

const BlacklistManagementScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { onRefresh } = route.params || {};
  
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(true);

  // 블랙리스트 조회
  const fetchBlacklist = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const blacklistData = await blacklistService.getBlacklist(user.uid);
      setBlacklist(blacklistData);
    } catch (error) {
      console.log('블랙리스트 조회 실패 (빈 배열로 처리):', error.message);
      setBlacklist([]); // 빈 배열로 설정
      // 사용자에게 오류 알림을 표시하지 않음 (블랙리스트가 없는 것은 정상)
    } finally {
      setLoading(false);
    }
  };

  // 차단 해제
  const handleUnblockUser = (blockedUser) => {
    Alert.alert(
      '차단 해제',
      `"${blockedUser.blockedUserName}"님의 차단을 해제하시겠습니까?\n\n차단 해제 후에는 해당 사용자의 모임을 다시 볼 수 있습니다.`,
      [
        {
          text: '취소',
          style: 'cancel'
        },
        {
          text: '해제',
          style: 'default',
          onPress: async () => {
            try {
              await blacklistService.unblockUser(user.uid, blockedUser.blockedUserId);
              await fetchBlacklist(); // 블랙리스트 다시 조회
              if (onRefresh) {
                onRefresh(); // 부모 화면 새로고침
              }
              Alert.alert('해제 완료', '차단이 해제되었습니다.');
            } catch (error) {
              console.error('차단 해제 실패:', error);
              Alert.alert('해제 실패', error.message || '차단 해제 중 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  // 날짜 포맷팅
  const formatDate = (date) => {
    if (!date) return '날짜 없음';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return '날짜 없음';
    }
  };

  // 컴포넌트 마운트 시 블랙리스트 조회
  useEffect(() => {
    fetchBlacklist();
  }, [user?.uid]);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>블랙리스트</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 안내 메시지 */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.infoTitle}>차단 기능 안내</Text>
          </View>
          <Text style={styles.infoText}>
            • 차단된 사용자는 최대 3명까지 가능합니다{'\n'}
            • 차단된 사용자가 참여한 모임은 보이지 않습니다{'\n'}
            • 차단된 사용자와 함께 있는 모임에서 자동으로 탈퇴됩니다{'\n'}
            • 차단 해제 시 해당 사용자의 모임을 다시 볼 수 있습니다
          </Text>
        </View>

        {/* 차단된 사용자 목록 */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>로딩 중...</Text>
          </View>
        ) : blacklist.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>차단된 사용자가 없습니다</Text>
            <Text style={styles.emptySubtitle}>
              다른 사용자의 프로필에서 차단 기능을 사용할 수 있습니다
            </Text>
          </View>
        ) : (
          <View style={styles.blacklistContainer}>
            <Text style={styles.sectionTitle}>
              차단된 사용자 ({blacklist.length}/3)
            </Text>
            {blacklist.map((blockedUser, index) => (
              <View key={blockedUser.id || index} style={styles.blockedUserCard}>
                <View style={styles.userInfo}>
                  <View style={styles.profileImageContainer}>
                    {blockedUser.blockedUserProfileImage ? (
                      <Image 
                        source={{ uri: blockedUser.blockedUserProfileImage }} 
                        style={styles.profileImage}
                      />
                    ) : (
                      <View style={styles.profileImagePlaceholder}>
                        <Ionicons name="person" size={24} color={COLORS.TEXT_SECONDARY} />
                      </View>
                    )}
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{blockedUser.blockedUserName}</Text>
                    <Text style={styles.blockDate}>
                      차단일: {formatDate(blockedUser.blockedAt)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.unblockButton}
                  onPress={() => handleUnblockUser(blockedUser)}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.PRIMARY} />
                  <Text style={styles.unblockButtonText}>해제</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    backgroundColor: COLORS.SURFACE,
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-SemiBold',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  infoCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY + '30',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    marginLeft: 8,
    fontFamily: 'Pretendard-SemiBold',
  },
  infoText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
    fontFamily: 'Pretendard-Regular',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    fontFamily: 'Pretendard-Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Pretendard-SemiBold',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Pretendard-Regular',
  },
  blacklistContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 16,
    fontFamily: 'Pretendard-SemiBold',
  },
  blockedUserCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImageContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profileImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 4,
    fontFamily: 'Pretendard-SemiBold',
  },
  blockDate: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    fontFamily: 'Pretendard-Regular',
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.PRIMARY,
    marginLeft: 4,
    fontFamily: 'Pretendard-Medium',
  },
});

export default BlacklistManagementScreen;


