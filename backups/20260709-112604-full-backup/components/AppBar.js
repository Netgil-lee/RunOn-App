import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const AppBar = ({ user, profile, onProfilePress, onNotificationPress, onSettingsPress, onSearchPress, hideProfile, title, unreadCount = 0, transparent = false }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const nickname = profile?.profile?.nickname || profile?.nickname || user?.displayName;
  const [imageLoadFailed, setImageLoadFailed] = React.useState(false);

  React.useEffect(() => {
    setImageLoadFailed(false);
  }, [profile?.profile?.profileImage, profile?.profileImage]);

  const profileImageUri = !imageLoadFailed && (
    profile?.profile?.profileImage || profile?.profileImage
  );

  return (
    <SafeAreaView style={transparent ? styles.transparentSafeArea : styles.safeArea}>
      <View style={[styles.container, transparent && styles.transparentContainer]}>
        <View style={styles.leftSection}>
          {!hideProfile && (
            <View style={styles.profileSection}>
              <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
                {profileImageUri ? (
                  <Image
                    source={{ uri: profileImageUri }}
                    style={styles.profileImage}
                    onError={() => setImageLoadFailed(true)}
                  />
                ) : (
                  <View style={styles.profilePlaceholder}>
                    <Ionicons name="person" size={18} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
              {nickname && (
                <Text style={styles.nicknameText} numberOfLines={1}>{nickname}</Text>
              )}
            </View>
          )}
          {title && <Text style={styles.title}>{title}</Text>}
          {!title && !hideProfile && !nickname && (
            <Text style={styles.logo}>RunOn</Text>
          )}
        </View>
        <View style={styles.rightSection}>
          {onSearchPress && (
            <TouchableOpacity style={styles.iconButton} onPress={onSearchPress}>
              <Ionicons name="search-outline" size={22} color={colors.TEXT} />
            </TouchableOpacity>
          )}
          {onNotificationPress && (
            <TouchableOpacity style={styles.iconButton} onPress={onNotificationPress}>
              <Ionicons name="notifications-outline" size={22} color={colors.TEXT} />
              {unreadCount > 0 && <View style={styles.notificationBadge} />}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconButton} onPress={onSettingsPress}>
            <Ionicons name="settings-outline" size={22} color={colors.TEXT} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  safeArea: {
    backgroundColor: colors.SURFACE,
  },
  transparentSafeArea: {
    backgroundColor: 'transparent',
  },
  container: {
    height: 56,
    backgroundColor: colors.SURFACE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  transparentContainer: {
    backgroundColor: 'transparent',
  },
  leftSection: { flexDirection: 'row', alignItems: 'center' },
  profileSection: { flexDirection: 'row', alignItems: 'center' },
  rightSection: { flexDirection: 'row', alignItems: 'center' },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colors.BORDER,
  },
  profileImage: { width: '100%', height: '100%' },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  nicknameText: {
    color: colors.TEXT,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    maxWidth: 120,
    fontFamily: 'Pretendard-SemiBold',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.TEXT,
    letterSpacing: 2,
    fontFamily: 'Pretendard-Bold',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.TEXT,
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
    minWidth: 8,
    height: 8,
  },
  notificationCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default AppBar;
