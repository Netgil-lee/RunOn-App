import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotificationSettings } from '../contexts/NotificationSettingsContext';
import { useEvents } from '../contexts/EventContext';
import { useCommunity } from '../contexts/CommunityContext';
import weatherAlertService from '../services/weatherAlertService';
import updateService from '../services/updateService';
import Animated, { 
  useSharedValue, 
  withTiming,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';

// NetGill 디자인 시스템 - 기존 색상 팔레트 유지
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  SECONDARY: '#666666',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  ERROR: '#FF0022',
};

const NotificationScreen = () => {
  const navigation = useNavigation();
  const { isTabEnabled, isNotificationTypeEnabled, settings } = useNotificationSettings();
  const { meetingNotifications, setMeetingNotifications, chatRooms, addChatMessage, setUpdateNotification: setEventUpdateNotification, clearUpdateNotification, checkUpdateNotificationStatus, checkMeetingNotifications } = useEvents();
  const { notifications: communityNotifications, markNotificationAsRead, getPostById, createLikeNotification, createCommentNotification, createChatNotification, handleChatTabClick, handleBoardTabClick } = useCommunity();
  
  // 탭 상태
  const [activeTab, setActiveTab] = useState('general');
  const slideAnim = useSharedValue(0);
  
  // 알림 데이터
  const [notifications, setNotifications] = useState({
    general: [],
    chat: []
  });

  // 업데이트 알림 상태
  const [updateNotification, setUpdateNotification] = useState(null);
  const [updateReadStatus, setUpdateReadStatus] = useState(false);

  // 탭 데이터
  const tabs = [
    { id: 'general', name: '일반' },
    { id: 'meeting', name: '모임' },
    { id: 'chat', name: '커뮤니티' }
  ];

  // 앱 업데이트 체크
  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        // AsyncStorage에서 업데이트 읽음 상태 확인
        const updateRead = await AsyncStorage.getItem('updateNotificationRead');
        if (updateRead === 'true') {
          setUpdateReadStatus(true);
          return; // 이미 읽었으면 업데이트 알림을 표시하지 않음
        }

        const updateInfo = await updateService.checkForUpdate();
        if (updateInfo.showNotification) {
          setUpdateNotification({
            id: 'update_notification',
            type: 'update',
            title: '앱 업데이트',
            message: updateInfo.message || '새로운 업데이트가 있습니다.',
            isRead: false,
            timestamp: new Date()
          });
          // EventContext에도 업데이트 알림 상태 설정
          setEventUpdateNotification(true);
          console.log('🔔 업데이트 알림 설정됨:', updateInfo);
        }
      } catch (error) {
        console.error('❌ 업데이트 체크 실패:', error);
      }
    };

    checkForUpdate();
  }, []);

  // 화면 포커스 시 알림 상태 동기화
  useFocusEffect(
    useCallback(() => {
      const syncNotificationStatus = async () => {
        try {
          // EventContext 상태 동기화
          await checkUpdateNotificationStatus();
          checkMeetingNotifications();
          
          // AsyncStorage에서 업데이트 읽음 상태 확인
          const updateRead = await AsyncStorage.getItem('updateNotificationRead');
          
          if (updateRead === 'true') {
            // 이미 읽었으면 읽음 상태로 알림 유지
            setUpdateReadStatus(true);
            const updateInfo = await updateService.checkForUpdate();
            if (updateInfo.showNotification) {
              setUpdateNotification({
                id: 'update_notification',
                type: 'update',
                title: '앱 업데이트',
                message: updateInfo.message || '새로운 업데이트가 있습니다.',
                isRead: true,
                timestamp: new Date()
              });
            }
          }
          
          console.log('🔄 화면 포커스 - 알림 상태 동기화 완료');
        } catch (error) {
          console.error('❌ 화면 포커스 - 알림 동기화 실패:', error);
        }
      };

      syncNotificationStatus();
    }, [])
  );

  // 설정에 따라 필터링된 알림 가져오기
  const getFilteredNotifications = (tabType) => {
    if (!isTabEnabled(tabType)) {
      return [];
    }
    
    if (tabType === 'meeting') {
      // 모임 알림은 EventContext에서 가져온 데이터 사용
      const filteredNotifications = meetingNotifications.filter(notif => 
        isNotificationTypeEnabled(notif.type)
      );
      
      // 디버깅: rating 알림 상태 확인
      const ratingNotifications = filteredNotifications.filter(notif => notif.type === 'rating');
      if (ratingNotifications.length > 0) {
        console.log('📊 NotificationScreen - rating 알림 상태:', 
          ratingNotifications.map(n => ({
            id: n.id,
            eventId: n.eventId || n.event?.id || 'N/A',
            isRead: n.isRead,
            title: n.title
          }))
        );
      }
      
      return filteredNotifications;
    }
    
    if (tabType === 'chat') {
      // 커뮤니티 알림은 CommunityContext에서 가져온 데이터 사용
      return communityNotifications.filter(notif => 
        isNotificationTypeEnabled(notif.type)
      );
    }
    
    // 일반 탭의 경우 날씨 알림과 업데이트 알림 포함
    if (tabType === 'general') {
      const generalNotifications = notifications[tabType].filter(notif => 
        isNotificationTypeEnabled(notif.type)
      );
      
      // 업데이트 알림 추가 (읽음 상태와 관계없이 표시)
      const notificationsWithUpdate = [...generalNotifications];
      if (updateNotification) {
        notificationsWithUpdate.unshift(updateNotification);
      }
      
      // 날씨 알림이 활성화되어 있으면 날씨 알림도 추가
      if (settings.notifications.weatherAlert) {
        // 여기서 실제 날씨 데이터를 가져와서 알림을 생성할 수 있습니다
        // 현재는 정적 데이터만 사용
      }
      
      return notificationsWithUpdate;
    }
    
    return notifications[tabType].filter(notif => 
      isNotificationTypeEnabled(notif.type)
    );
  };

  // 읽지 않은 알림 카운트 계산 (필터링된 알림 기준)
  const getUnreadCount = (tabType) => {
    return getFilteredNotifications(tabType).filter(notif => !notif.isRead).length;
  };

  const getTotalUnreadCount = () => {
    return Object.keys(notifications).reduce((total, tabType) => {
      return total + getUnreadCount(tabType);
    }, 0) + getUnreadCount('meeting');
  };

  // 슬라이딩 언더라인 애니메이션 스타일
  const slidingUnderlineStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: interpolate(
            slideAnim.value,
            [0, 1, 2],
            [0, 128, 260]
          )
        }
      ]
    };
  });

  // 탭 변경 함수
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    
    // 슬라이딩 애니메이션
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    slideAnim.value = withTiming(tabIndex, {
      duration: 300,
    });

    // 탭 클릭 시 자동 읽음 처리 제거 - 개별 알림 클릭 시에만 읽음 처리
    console.log(`📋 ${tabId} 탭 클릭 - 자동 읽음 처리 없음, 개별 알림 클릭 필요`);
  };

  // 알림 읽음 처리
  const markAsRead = (tabType, notificationId) => {
    if (tabType === 'meeting') {
      // 모임 알림 읽음 처리
      setMeetingNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      // EventContext의 알림 상태 업데이트
      checkMeetingNotifications();
      console.log('✅ 모임 알림 읽음 처리 완료:', notificationId);
    } else {
      // 일반/커뮤니티 알림 읽음 처리
      setNotifications(prev => ({
        ...prev,
        [tabType]: prev[tabType].map(notif => 
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      }));
      console.log('✅ 일반/커뮤니티 알림 읽음 처리 완료:', notificationId);
    }
  };

  // 알림 클릭 처리
  const handleNotificationPress = async (notification) => {
    console.log('🖱️ 알림 클릭됨:', notification);
    console.log('📋 알림 타입:', notification.type);
    console.log('🔗 알림 액션:', notification.action);
    console.log('🧭 네비게이션 데이터:', notification.navigationData);
    
    // 개별 알림 클릭 시 읽음 처리 (탭 클릭 자동 처리 제거됨)
    if (notification.type === 'update') {
      console.log('🔄 update 알림은 별도 처리 (클릭 시에만 읽음 처리)');
    } else if (notification.type === 'rating') {
      console.log('📊 rating 알림은 읽음 처리하지 않음');
    } else {
      // 일반 알림들은 개별 클릭 시 읽음 처리
      console.log('📖 개별 알림 클릭 - 읽음 처리 실행');
      
      // 알림 타입에 따라 읽음 처리
      if (notification.type === 'like' || notification.type === 'comment') {
        // 커뮤니티 알림 읽음 처리
        markNotificationAsRead(notification.id);
        console.log('✅ 커뮤니티 알림 읽음 처리:', notification.id);
      } else if (notification.type === 'cancel' || notification.type === 'reminder' || notification.type === 'new_participant') {
        // 모임 알림 읽음 처리
        setMeetingNotifications(prev => 
          prev.map(notif => 
            notif.id === notification.id ? { ...notif, isRead: true } : notif
          )
        );
        checkMeetingNotifications();
        console.log('✅ 모임 알림 읽음 처리:', notification.id);
      }
    }
    
    // 액션에 따른 네비게이션
    const action = notification.action || notification.type; // action이 없으면 type 사용
    console.log('🎯 처리할 액션:', action);
    
    switch (action) {
      case 'update':
        // 업데이트 알림 클릭 시 확인만
        Alert.alert(
          '앱 업데이트',
          notification.message || '새로운 업데이트가 있습니다.',
          [
            { 
              text: '확인', 
              onPress: () => {
                // 업데이트 알림을 읽음 처리 (삭제하지 않고 상태만 변경)
                setUpdateReadStatus(true);
                setUpdateNotification(prev => prev ? { ...prev, isRead: true } : null);
                // EventContext의 업데이트 알림 해제 (AppNavigator 아이콘 제거)
                clearUpdateNotification();
                // AsyncStorage에 업데이트 읽음 상태 저장
                AsyncStorage.setItem('updateNotificationRead', 'true');
                // 현재 업데이트 메시지와 타임스탬프도 저장
                AsyncStorage.setItem('lastUpdateMessage', notification.message);
                AsyncStorage.setItem('lastUpdateTimestamp', notification.timestamp.toISOString());
                console.log('✅ 업데이트 알림 읽음 처리 완료 (알림 유지)');
              }
            }
          ]
        );
        break;
      case 'meeting':
        navigation.navigate('EventDetail', { eventId: notification.meetingId });
        break;
      case 'new_participant':
        // 새로운 참여자 입장 알림 클릭 시 해당 모임 상세 화면으로 이동
        navigation.navigate('EventDetail', { eventId: notification.eventId });
        break;
      case 'chat':
        // 채팅 알림 클릭 시 해당 채팅방으로 이동
        if (notification.chatId) {
          const targetChatRoom = chatRooms.find(chatRoom => chatRoom.id.toString() === notification.chatId);
          if (targetChatRoom) {
            console.log('✅ 채팅방으로 이동:', targetChatRoom.title);
            
            // 같은 채팅방의 모든 알림을 읽음 처리
            const sameChatNotifications = communityNotifications.filter(n => 
              n.type === 'message' && n.chatId === notification.chatId.toString() && !n.isRead
            );
            
            console.log(`📖 같은 채팅방 알림 ${sameChatNotifications.length}개 읽음 처리`);
            sameChatNotifications.forEach(chatNotification => {
              markNotificationAsRead(chatNotification.id);
            });
            
            // Date 객체를 문자열로 직렬화
            const serializedChatRoom = {
              ...targetChatRoom,
              createdAt: targetChatRoom.createdAt && typeof targetChatRoom.createdAt.toISOString === 'function' ? targetChatRoom.createdAt.toISOString() : targetChatRoom.createdAt,
              lastMessageTime: targetChatRoom.lastMessageTime && typeof targetChatRoom.lastMessageTime.toISOString === 'function' ? targetChatRoom.lastMessageTime.toISOString() : targetChatRoom.lastMessageTime,
              updatedAt: targetChatRoom.updatedAt && typeof targetChatRoom.updatedAt.toISOString === 'function' ? targetChatRoom.updatedAt.toISOString() : targetChatRoom.updatedAt
            };
            
            // Chat 화면으로 이동 (독립적인 스크린)
            navigation.navigate('Chat', { 
              chatRoom: serializedChatRoom,
              returnToCommunity: true // 뒤로가기 시 CommunityTab으로 돌아가기 위한 플래그
            });
          } else {
            console.log('❌ 채팅방을 찾을 수 없음:', notification.chatId);
            Alert.alert('오류', '해당 채팅방을 찾을 수 없습니다.');
          }
        } else {
          console.log('❌ chatId가 없음:', notification);
          Alert.alert('오류', '채팅방 정보를 찾을 수 없습니다.');
        }
        break;
      case 'post':
        navigation.navigate('PostDetail', { postId: notification.postId });
        break;
      case 'like':
      case 'comment':
        // 커뮤니티 알림의 네비게이션 처리
        console.log('💬 커뮤니티 알림 처리 중...');
        if (notification.navigationData && notification.navigationData.params.postId) {
          const postId = notification.navigationData.params.postId;
          console.log('🔍 알림 클릭 - postId:', postId, '타입:', typeof postId);
          // getPostById는 이제 async 함수이므로 await 사용
          const post = await getPostById(postId); // postId는 문자열 또는 숫자 모두 가능
          console.log('📄 찾은 게시글:', post);
          if (post) {
            console.log('✅ 게시글로 이동:', post.title);
            navigation.navigate('PostDetail', { post });
          } else {
            console.log('❌ 게시글을 찾을 수 없음:', postId);
            Alert.alert('오류', '해당 게시글을 찾을 수 없습니다.');
          }
        } else {
          console.log('❌ navigationData 또는 postId가 없음:', notification);
        }
        break;

      case 'weather':
        // 날씨 알림은 단순히 읽음 처리만 (복잡한 네비게이션 없음)
        break;
      case 'safety':
        // 안전 알림은 단순히 읽음 처리만 (복잡한 네비게이션 없음)
        break;
      case 'challenge':
        Alert.alert('챌린지', '봄맞이 러닝 챌린지 페이지로 이동합니다.');
        break;
      case 'tip':
        Alert.alert('러닝 팁', '러닝 팁 페이지로 이동합니다.');
        break;
      case 'rating':
        console.log('📊 러닝매너점수 알림 클릭 - 종료된 모임 화면으로 이동');
        // rating 알림은 읽음 처리하지 않고 종료된 모임 화면으로 이동
        navigation.navigate('ScheduleTab', { 
          screen: 'EndedEvents',
          params: { showEndedEvents: true }
        });
        break;
      case 'reminder':
        Alert.alert('모임 알림', '모임 시작 1시간 전입니다. 준비하세요!');
        break;
      case 'cancel':
        console.log('❌ 모임 삭제 알림 클릭 - 읽음 처리만');
        // 모임 삭제 알림은 읽음 처리만 (화면 이동 없음)
        break;
      default:
        console.log('❓ 알 수 없는 알림 액션:', action);
        // 기본적으로 커뮤니티 알림으로 처리
        if (notification.type === 'like' || notification.type === 'comment') {
          console.log('🔄 기본 커뮤니티 알림 처리로 전환');
          if (notification.navigationData && notification.navigationData.params.postId) {
            const postId = notification.navigationData.params.postId;
            console.log('🔍 기본 처리 - postId:', postId);
            const post = await getPostById(postId);
            console.log('📄 기본 처리 - 찾은 게시글:', post);
            if (post) {
              console.log('✅ 기본 처리 - 게시글로 이동:', post.title);
              navigation.navigate('PostDetail', { post });
            } else {
              console.log('❌ 기본 처리 - 게시글을 찾을 수 없음');
              Alert.alert('오류', '해당 게시글을 찾을 수 없습니다.');
            }
          }
        }
        break;
    }
  };

  // 알림 아이템 컴포넌트
  const NotificationItem = ({ notification }) => {
    // 시간 표시 함수
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      
      const now = new Date();
      const notificationTime = new Date(timestamp);
      const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
      
      if (diffInMinutes < 1) return '방금 전';
      if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
      return `${Math.floor(diffInMinutes / 1440)}일 전`;
    };

    // 아이콘 결정
    const getIcon = (type) => {
      switch (type) {
        case 'like':
          return 'heart';
        case 'comment':
          return 'chatbubble-ellipses';
        case 'update':
          return 'rocket';
        default:
          return notification.icon || 'notifications';
      }
    };

    return (
      <TouchableOpacity 
        style={[
          styles.notificationItem,
          notification.isRead ? styles.readNotification : styles.unreadNotification
        ]}
        onPress={() => handleNotificationPress(notification)}
      >
        <View style={styles.notificationHeader}>
          <View style={styles.notificationIconContainer}>
            <Ionicons 
              name={getIcon(notification.type)} 
              size={28} 
              color={notification.isRead ? COLORS.SECONDARY : COLORS.PRIMARY} 
            />
          </View>
          <View style={styles.notificationContent}>
            <Text style={[
              styles.notificationTitle,
              notification.isRead ? styles.readTitle : styles.unreadTitle
            ]}>
              {notification.title}
            </Text>
            <Text style={styles.notificationTime}>
              {notification.time ? (notification.time instanceof Date ? notification.time.toLocaleDateString('ko-KR') : notification.time) : formatTime(notification.timestamp)}
            </Text>
          </View>
        </View>
        <Text style={[
          styles.notificationMessage,
          notification.isRead ? styles.readMessage : styles.unreadMessage
        ]} numberOfLines={2}>
          {notification.message}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>알림</Text>
        </View>
      </View>

      {/* 탭 네비게이션 */}
      <View style={styles.tabContainer}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => handleTabChange(tab.id)}
          >
            <View style={styles.tabContent}>
              <Text style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText
              ]}>
                {tab.name}
              </Text>
              {getUnreadCount(tab.id) > 0 && (
                <View style={styles.tabUnreadBadge}>
                  <Text style={styles.tabUnreadCount}>{getUnreadCount(tab.id)}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
        
        {/* 슬라이딩 언더라인 */}
        <Animated.View 
          style={[styles.slidingUnderline, slidingUnderlineStyle]}
        />
      </View>

      {/* 알림 목록 */}
      <ScrollView 
        style={styles.notificationList}
        showsVerticalScrollIndicator={false}
      >



        
        {getFilteredNotifications(activeTab).length > 0 ? (
          getFilteredNotifications(activeTab).map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="notifications-off" size={48} color={COLORS.SECONDARY} />
            </View>
            <Text style={styles.emptyTitle}>
              {isTabEnabled(activeTab) ? '알림이 없습니다' : '알림이 비활성화되어 있습니다'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isTabEnabled(activeTab) 
                ? '새로운 알림이 도착하면 여기에 표시됩니다.'
                : '설정에서 알림을 활성화하세요.'
              }
            </Text>
          </View>
        )}
        
        {/* 하단 여백 */}
        <View style={styles.bottomSpacing} />
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
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    position: 'relative',
  },
  backButton: {
    padding: 4,
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.TEXT,
  },
  unreadBadge: {
    backgroundColor: COLORS.ERROR,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  settingsButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    zIndex: 2,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.SECONDARY,
  },
  activeTabText: {
    color: COLORS.TEXT,
    fontWeight: '700',
  },
  tabUnreadBadge: {
    backgroundColor: '#FF0022',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabUnreadCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  slidingUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 127,
    height: 2,
    backgroundColor: COLORS.PRIMARY,
    zIndex: 1,
  },
  notificationList: {
    flex: 1,
    marginTop: 16,
  },
  notificationItem: {
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  readNotification: {
    borderLeftColor: COLORS.SURFACE,
    backgroundColor: COLORS.CARD,
    opacity: 0.85,  // 0.6에서 0.85로 증가하여 더 밝게
  },
  unreadNotification: {
    borderLeftColor: COLORS.PRIMARY,
    backgroundColor: COLORS.SURFACE,
    opacity: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  readTitle: {
    color: '#AAAAAA',  // COLORS.SECONDARY(#666666)에서 더 밝은 회색으로 변경
    fontWeight: '500',  // 400에서 500으로 증가하여 더 굵게
  },
  unreadTitle: {
    color: COLORS.TEXT,
    fontWeight: '600',
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.SECONDARY,
  },
  notificationMessage: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '250',
  },
  readMessage: {
    color: '#AAAAAA',  // COLORS.SECONDARY(#666666)에서 더 밝은 회색으로 변경
    fontWeight: '400',  // 300에서 400으로 증가하여 더 굵게
  },
  unreadMessage: {
    color: COLORS.TEXT,
    fontWeight: '400',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 100,
  },

});

export default NotificationScreen; 