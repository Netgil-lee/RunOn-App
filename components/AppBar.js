import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
};

const AppBar = ({ user, profile, onProfilePress, onNotificationPress, onSettingsPress, onSearchPress, hideProfile, title, unreadCount = 0, transparent = false }) => {
  const displayName = user?.displayName || user?.email?.split('@')[0] || '사용자';
  
  return (
    <SafeAreaView style={[styles.safeArea, transparent && styles.transparentSafeArea]}>
      <View style={[styles.container, transparent && styles.transparentContainer]}>
        {/* 왼쪽: 제목 또는 프로필 사진 */}
        <View style={styles.leftSection}>
          {title ? (
            <Text style={styles.title}>{title}</Text>
          ) : !hideProfile ? (
            <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
              {(user?.photoURL || profile?.profileImage) ? (
                <Image source={{ uri: user.photoURL || profile?.profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Ionicons name="person" size={20} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 오른쪽: 검색, 알림, 설정 */}
        <View style={styles.rightSection}>
          <TouchableOpacity style={styles.iconButton} onPress={onSearchPress}>
            <Ionicons name="search-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onNotificationPress}>
            <Ionicons name="notifications-outline" size={22} color="#ffffff" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onSettingsPress}>
            <Ionicons name="settings-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.SURFACE,
  },
  transparentSafeArea: {
    backgroundColor: 'transparent',
  },
  container: {
    height: 56,
    backgroundColor: COLORS.SURFACE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  transparentContainer: {
    backgroundColor: 'transparent',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#ffffff',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    fontFamily: 'Pretendard-Bold',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Pretendard-SemiBold',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF0022',
    borderRadius: 10,
    minWidth: 1,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default AppBar; 