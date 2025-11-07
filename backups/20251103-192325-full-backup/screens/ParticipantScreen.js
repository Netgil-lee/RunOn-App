import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  getCourseName, 
  getSeasonTitle, 
  getGoalTitle,
  getLevelInfo,
  getTimeTitle,
  getStyleTitle
} from '../constants/onboardingOptions';
import evaluationService from '../services/evaluationService';
import mannerDistanceService from '../services/mannerDistanceService';
import MannerDistanceDisplay from '../components/MannerDistanceDisplay';
import blacklistService from '../services/blacklistService';
import { useAuth } from '../contexts/AuthContext';

const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  SECONDARY: '#666666',
  BORDER: '#374151',
  ICON_DEFAULT: '#9CA3AF',
  TAG_GREEN: '#B6F5C9',
  TAG_YELLOW: '#FFF6B2',
  TAG_PURPLE: '#E2D6FF',
  TAG_PINK: '#FFD6E7',
  TAG_BLUE: '#B6E6F5',
  BADGE: '#1EB8C6',
};

const ParticipantScreen = ({ route, navigation }) => {
  const { participant } = route.params;
  const { user } = useAuth();
  
  const [communityStats, setCommunityStats] = useState({
    totalParticipated: 0,
    thisMonth: 0,
    hostedEvents: 0,
    mannerScore: 5.0, // 초기값 5.0
    tags: [],
  });
  const [mannerDistance, setMannerDistance] = useState(null);
  const [isBlocking, setIsBlocking] = useState(false);

  const getLevelInfo = (level) => {
    const levelMap = {
      '초급': { title: '초급', subtitle: '러닝 입문자' },
      '중급': { title: '중급', subtitle: '러닝 중급자' },
      '고급': { title: '고급', subtitle: '러닝 고급자' },
    };
    return levelMap[level] || { title: '미설정', subtitle: '레벨 미설정' };
  };

  // 사용자 차단 함수
  const handleBlockUser = () => {
    if (!user || !participant) {
      Alert.alert('오류', '사용자 정보를 찾을 수 없습니다.');
      return;
    }

    // 자기 자신을 차단하려는 경우
    if (user.uid === participant.id) {
      Alert.alert('오류', '자기 자신을 차단할 수 없습니다.');
      return;
    }

    Alert.alert(
      '사용자 차단',
      `"${participant.name}"님을 차단하시겠습니까?\n\n차단된 사용자는 최대 3명까지 가능합니다.`,
      [
        {
          text: '취소',
          style: 'cancel'
        },
        {
          text: '차단',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsBlocking(true);
              
              await blacklistService.blockUser(
                user.uid,
                participant.id,
                participant.name,
                participant.profileImage
              );
              
              Alert.alert(
                '차단 완료',
                `"${participant.name}"님을 차단했습니다.`,
                [
                  {
                    text: '확인',
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            } catch (error) {
              console.error('사용자 차단 실패:', error);
              Alert.alert('차단 실패', error.message || '사용자 차단 중 오류가 발생했습니다.');
            } finally {
              setIsBlocking(false);
            }
          }
        }
      ]
    );
  };

  // 참여자의 커뮤니티 통계 가져오기
  useEffect(() => {
    const fetchCommunityStats = async () => {
      if (!participant?.id) return;
      
      try {
        const stats = await evaluationService.getUserCommunityStats(participant.id);
        
        
        // 긍정적 태그를 형식에 맞게 변환
        const formattedTags = Object.entries(stats.receivedTags || {})
          .map(([tag, count]) => `[${count} #${tag}]`)
          .sort((a, b) => {
            const countA = parseInt(a.match(/\[(\d+)/)[1]);
            const countB = parseInt(b.match(/\[(\d+)/)[1]);
            return countB - countA; // 내림차순 정렬
          });

        // 부정적 태그를 형식에 맞게 변환
        const formattedNegativeTags = Object.entries(stats.receivedNegativeTags || {})
          .map(([tag, count]) => `[${count} #${tag}]`)
          .sort((a, b) => {
            const countA = parseInt(a.match(/\[(\d+)/)[1]);
            const countB = parseInt(b.match(/\[(\d+)/)[1]);
            return countB - countA; // 내림차순 정렬
          });

        // 특별상황을 형식에 맞게 변환
        const formattedSpecialSituations = Object.entries(stats.receivedSpecialSituations || {})
          .map(([situation, count]) => `[${count} #${situation}]`)
          .sort((a, b) => {
            const countA = parseInt(a.match(/\[(\d+)/)[1]);
            const countB = parseInt(b.match(/\[(\d+)/)[1]);
            return countB - countA; // 내림차순 정렬
          });

        setCommunityStats({
          totalParticipated: stats.totalParticipated || 0,
          thisMonth: stats.thisMonthParticipated || 0,
          hostedEvents: stats.hostedEvents || 0,
          mannerScore: stats.averageMannerScore || 5.0, // 기본값 5.0
          tags: formattedTags,
          negativeTags: formattedNegativeTags,
          specialSituations: formattedSpecialSituations,
        });

        // 매너거리 데이터 가져오기
        try {
          const distanceData = await mannerDistanceService.getUserMannerDistance(participant.id);
          if (distanceData) {
            setMannerDistance(distanceData);
          } else {
            // 매너거리 데이터가 없으면 마이그레이션 시도
            const migratedData = await mannerDistanceService.migrateUserToMannerDistance(participant.id);
            if (migratedData) {
              setMannerDistance(migratedData);
            }
          }
        } catch (error) {
          console.error('매너거리 데이터 로딩 오류:', error);
        }
      } catch (error) {
        console.error('커뮤니티 통계 로딩 오류:', error);
      }
    };

    fetchCommunityStats();
  }, [participant?.id]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 프로필 카드 */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.profileImageWrap}>
              {(() => {
                if (participant && 
                    participant.profileImage && 
                    participant.profileImage.trim() !== '' && 
                    !participant.profileImage.startsWith('file://')) {
                  // Firebase Storage URL인 경우만 표시
                  return (
                    <Image 
                      source={{ uri: participant.profileImage }} 
                      style={styles.profileImage}
                      onError={(error) => {
                        // 이미지 로드 실패 시 기본 아이콘으로 대체
                      }}
                      onLoad={() => {
                        // 이미지 로드 성공
                      }}
                    />
                  );
                } else {
                  // 로컬 파일이거나 이미지가 없는 경우 기본 아이콘 표시
                  return (
                    <View style={styles.profileImagePlaceholder}>
                      <Ionicons name="person" size={60} color="#fff" />
                    </View>
                  );
                }
              })()}
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{participant ? participant.name : null}</Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>{participant ? getLevelInfo(participant.level).title : '미설정'}</Text>
                </View>
              </View>
              <Text style={styles.joinDate}>
                가입일: {participant ? (participant.joinDate instanceof Date ? participant.joinDate.toLocaleDateString('ko-KR') : participant.joinDate) : '미설정'}
              </Text>
              {(participant?.age || participant?.gender) && (
                <Text style={styles.basicInfo}>
                  {participant?.age && `${participant.age}세`}
                  {participant?.age && participant?.gender && ' • '}
                  {participant?.gender && (participant.gender === 'male' ? '남성' : participant.gender === 'female' ? '여성' : participant.gender)}
                </Text>
              )}
              <Text style={styles.bio}>{participant ? participant.bio : null}</Text>
            </View>
          </View>
        </View>

        {/* 매너거리 */}
        {mannerDistance && (
          <View style={styles.mannerDistanceCard}>
            <MannerDistanceDisplay 
              currentDistance={mannerDistance.currentDistance}
              animated={true}
              showGoal={true}
              size="medium"
              titleSize="large"
            />
          </View>
        )}

        {/* 커뮤니티 활동 */}
        {participant && (
          <View style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <Ionicons name="people" size={24} color={COLORS.PRIMARY} style={{ marginRight: 8 }} />
              <Text style={styles.activityTitle}>커뮤니티 활동</Text>
            </View>
            <View style={styles.activityRowGrid}>
              <View style={styles.activityItemGrid}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="heart" size={22} color="#FF0073" style={{ marginRight: 2 }} />
                  <Text style={styles.activityNumPrimary}>{communityStats.mannerScore}</Text>
                </View>
                <Text style={styles.activityLabel}>러닝 매너</Text>
              </View>
              <View style={styles.activityItemGrid}>
                <Text style={styles.activityNumWhite}>{communityStats.totalParticipated}</Text>
                <Text style={styles.activityLabel}>총 참여</Text>
              </View>
              <View style={styles.activityItemGrid}>
                <Text style={styles.activityNumWhite}>{communityStats.thisMonth}</Text>
                <Text style={styles.activityLabel}>이번 달</Text>
              </View>
              <View style={styles.activityItemGrid}>
                <Text style={styles.activityNumWhite}>{communityStats.hostedEvents}</Text>
                <Text style={styles.activityLabel}>주최 모임</Text>
              </View>
            </View>
            {/* 긍정적 태그 */}
            <View style={styles.tagSection}>
              <View style={styles.tagSectionHeader}>
                <Ionicons name="star" size={16} color={COLORS.PRIMARY} />
                <Text style={styles.tagSectionTitle}>좋았던 점</Text>
                <Text style={styles.tagCountText}>({communityStats.tags.length}개)</Text>
              </View>
              <View style={styles.tagRow}>
                {communityStats.tags.length > 0 ? (
                  communityStats.tags.map((tag, i) => {
                    // [1 #태그명] 형태에서 태그명과 개수 추출
                    const match = tag.match(/^\[(\d+)\s*#\s*(.+)\]$/);
                    const count = match ? match[1] : '1';
                    const cleanTag = match ? match[2] : tag.replace(/^\[\d+\s*#\s*/, '').replace(/\]$/, '');
                    return (
                      <View key={i} style={styles.tagOutline}> 
                        <Text style={styles.tagTextOutline}>{cleanTag}</Text>
                        <Text style={styles.tagCountBadge}>{count}</Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.noTagsText}>아직 받은 긍정적 태그가 없습니다</Text>
                )}
              </View>
            </View>

          </View>
        )}

        {/* 러닝 매칭 정보 */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardTitleRow}>
            <Ionicons name="extension-puzzle" size={22} color={COLORS.PRIMARY} style={{ marginRight: 8 }} />
            <Text style={styles.infoCardTitle}>러닝 매칭 정보</Text>
          </View>
          {/* 선호 코스 */}
          <View style={styles.infoRowCol}>
            <View style={styles.infoRowIconTitle}>
              <Ionicons name="location-outline" size={18} color={'#fff'} style={{ marginRight: 6 }} />
              <Text style={styles.infoLabelWhite}>선호 코스</Text>
            </View>
            <View style={styles.tagRow}>
              {(participant?.runningProfile?.preferredCourses || ['반포한강공원', '여의도한강공원']).map((c, i) => (
                <View key={i} style={styles.tagOutline}> 
                  <Text style={styles.tagTextOutline}>{getCourseName(c) || c}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* 선호 시간 */}
          <View style={styles.infoRowCol}>
            <View style={styles.infoRowIconTitle}>
              <Ionicons name="time-outline" size={18} color={'#fff'} style={{ marginRight: 6 }} />
              <Text style={styles.infoLabelWhite}>선호 시간</Text>
            </View>
            <View style={styles.tagRow}>
              {(participant?.runningProfile?.preferredTimes || ['morning', 'evening']).map((t, i) => (
                <View key={i} style={styles.tagOutline}> 
                  <Text style={styles.tagTextOutline}>{getTimeTitle(t) || t}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* 러닝 스타일 */}
          <View style={styles.infoRowCol}>
            <View style={styles.infoRowIconTitle}>
              <Ionicons name="flash-outline" size={18} color={'#fff'} style={{ marginRight: 6 }} />
              <Text style={styles.infoLabelWhite}>러닝 스타일</Text>
            </View>
            <View style={styles.tagRow}>
              {(participant?.runningProfile?.runningStyles || ['steady', 'social']).map((s, i) => (
                <View key={i} style={styles.tagOutline}> 
                  <Text style={styles.tagTextOutline}>{getStyleTitle(s) || s}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* 선호 계절 */}
          <View style={styles.infoRowCol}>
            <View style={styles.infoRowIconTitle}>
              <Ionicons name="cloud-outline" size={18} color={'#fff'} style={{ marginRight: 6 }} />
              <Text style={styles.infoLabelWhite}>선호 계절</Text>
            </View>
            <View style={styles.tagRow}>
              {(participant?.runningProfile?.favoriteSeasons || ['spring', 'autumn']).map((s, i) => (
                <View key={i} style={styles.tagOutline}> 
                  <Text style={styles.tagTextOutline}>{getSeasonTitle(s) || s}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* 러닝 목표 */}
          <View style={styles.infoRowCol}>
            <View style={styles.infoRowIconTitle}>
              <Ionicons name="trophy-outline" size={18} color={'#fff'} style={{ marginRight: 6 }} />
              <Text style={styles.infoLabelWhite}>러닝 목표</Text>
            </View>
            <View style={styles.tagRow}>
              {(participant?.runningProfile?.currentGoals || ['health', 'marathon']).map((g, i) => (
                <View key={i} style={styles.tagOutline}> 
                  <Text style={styles.tagTextOutline}>{getGoalTitle(g) || g}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 차단 버튼 섹션 */}
        {user && participant && user.uid !== participant.id && (
          <View style={styles.blockSection}>
            <TouchableOpacity 
              style={[styles.blockButton, isBlocking && styles.blockButtonDisabled]}
              onPress={handleBlockUser}
              disabled={isBlocking}
            >
              <Ionicons 
                name="ban-outline" 
                size={20} 
                color={isBlocking ? COLORS.SECONDARY : "#FF6B6B"} 
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.blockButtonText, isBlocking && styles.blockButtonTextDisabled]}>
                {isBlocking ? '차단 중...' : '사용자 차단'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 추가 정보 섹션 */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>💡 이 사용자와 함께 뛰어보세요!</Text>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.infoText}>러닝 매너가 좋은 사용자입니다</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.infoText}>활발한 커뮤니티 활동을 보여줍니다</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.infoText}>함께 러닝하면서 새로운 친구를 만들어보세요</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  profileCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profileImageWrap: {
    marginRight: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginRight: 12,
  },
  levelBadge: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  levelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  joinDate: {
    fontSize: 16,
    color: COLORS.SECONDARY,
    marginBottom: 12,
  },
  basicInfo: {
    fontSize: 16,
    color: COLORS.SECONDARY,
    marginBottom: 12,
  },
  bio: {
    fontSize: 16,
    color: COLORS.TEXT,
    lineHeight: 24,
  },
  mannerDistanceCard: {
    marginBottom: 16,
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 8,
  },
  activityCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.TEXT,
    marginLeft: 12,
    flex: 1,
  },
  // 러닝 매칭 정보 스타일
  infoCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  infoCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  infoRowCol: {
    marginBottom: 16,
  },
  infoRowIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabelWhite: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#97DCDE',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  tagTextOutline: {
    fontSize: 15,
    fontWeight: '200',
    color: '#fff',
  },
  tagSection: {
    marginTop: 16,
  },
  tagSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  tagSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  tagCountText: {
    fontSize: 12,
    color: COLORS.SECONDARY,
    marginLeft: 4,
  },
  tagCountBadge: {
    fontSize: 10,
    color: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '20',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  noTagsText: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    fontStyle: 'italic',
  },
  negativeTagOutline: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  negativeTagTextOutline: {
    fontSize: 15,
    fontWeight: '200',
    color: '#FF6B6B',
  },
  specialSituationTagOutline: {
    borderWidth: 1,
    borderColor: '#FFA500',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  specialSituationTagTextOutline: {
    fontSize: 15,
    fontWeight: '200',
    color: '#FFA500',
  },
  activityNumPrimary: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 2,
  },
  activityLabel: {
    fontSize: 15,
    color: COLORS.SECONDARY,
    marginBottom: 2,
  },
  activityRowGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    marginTop: 8,
    width: '100%',
  },
  activityItemGrid: {
    alignItems: 'center',
    flex: 1,
    marginBottom: 10,
    minWidth: 60,
    maxWidth: 80,
  },
  activityNumWhite: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  // 차단 버튼 스타일
  blockSection: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  blockButtonDisabled: {
    borderColor: COLORS.SECONDARY,
    opacity: 0.6,
  },
  blockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  blockButtonTextDisabled: {
    color: COLORS.SECONDARY,
  },
});

export default ParticipantScreen; 