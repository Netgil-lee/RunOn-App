import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const ProfileCard = ({ user }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const userProfile = {
    name: user?.displayName || '사용자',
    level: 'Runner',
    totalRuns: 0,
    totalDistance: 0,
    thisWeekRuns: 0,
    avatar: user?.displayName ? user.displayName.charAt(0) : '사',
    gender: user?.gender || '',
    age: user?.age || '',
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* 왼쪽: 프로필 이미지 */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userProfile.avatar}</Text>
          </View>
        </View>

        {/* 중간: 사용자 정보 + 통계 */}
        <View style={styles.infoSection}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userProfile.name}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{userProfile.level}</Text>
            </View>
          </View>

                     {/* 성별과 나이 정보 */}
           {(userProfile.gender || userProfile.age) && (
             <View style={styles.userDetails}>
               <Text style={styles.userDetailsText}>
                 {userProfile.gender === 'male' ? '남성' : userProfile.gender === 'female' ? '여성' : userProfile.gender}
                 {userProfile.gender && userProfile.age && ' • '}
                 {userProfile.age && `${userProfile.age}세`}
               </Text>
             </View>
           )}

          {/* 3컬럼 통계 */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile.totalRuns}</Text>
              <Text style={styles.statLabel}>총 러닝</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile.totalDistance}km</Text>
              <Text style={styles.statLabel}>총 거리</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile.thisWeekRuns}</Text>
              <Text style={styles.statLabel}>이번 주</Text>
            </View>
          </View>
        </View>


      </View>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.CARD,
    marginHorizontal: 0,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6B7280', // 회색톤 (테마 무관 고정)
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF', // 아바타 배경 위 흰 글자 (항상 고정)
  },
  infoSection: {
    flex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.TEXT,
    marginRight: 8,
  },
  levelBadge: {
    backgroundColor: colors.PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF', // PRIMARY 색 배지 위 흰 글자 (항상 고정)
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.TEXT,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.BORDER,
    marginHorizontal: 8,
  },
  userDetails: {
    marginBottom: 8,
  },
  userDetailsText: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
  },

});

export default ProfileCard;
