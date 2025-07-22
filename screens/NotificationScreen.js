import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useNotificationSettings } from '../contexts/NotificationSettingsContext';
import { useEvents } from '../contexts/EventContext';
import { useCommunity } from '../contexts/CommunityContext';
import weatherAlertService from '../services/weatherAlertService';
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
  const { meetingNotifications, setMeetingNotifications, chatRooms, addChatMessage } = useEvents();
  const { notifications: communityNotifications, markNotificationAsRead, getPostById, createLikeNotification, createCommentNotification, createChatNotification } = useCommunity();
  
  // 탭 상태
  const [activeTab, setActiveTab] = useState('general');
  const slideAnim = useSharedValue(0);
  
  // 알림 데이터
  const [notifications, setNotifications] = useState({
    general: [
      {
        id: 1,
        type: 'system',
        title: '냇길 앱 업데이트',
        message: '새로운 기능이 추가되었습니다. 한강 러닝 코스 지도와 실시간 날씨 정보를 확인해보세요!',
        time: '1시간 전',
        isRead: false,
        icon: 'refresh-circle',
        action: 'update'
      },
      {
        id: 2,
        type: 'weather',
        title: '오늘은 러닝하기 좋은 날씨!',
        message: '기온 18도, 습도 60%로 러닝하기 최적의 날씨입니다. 한강공원에서 러닝을 즐겨보세요.',
        time: '3시간 전',
        isRead: false,
        icon: 'partly-sunny',
        action: 'weather'
      },
      {
        id: 3,
        type: 'event',
        title: '봄맞이 러닝 챌린지 시작!',
        message: '3월 한 달간 100km 달성 챌린지에 참여하고 특별한 뱃지를 받아보세요.',
        time: '1일 전',
        isRead: true,
        icon: 'trophy',
        action: 'challenge'
      },
      {
        id: 4,
        type: 'tip',
        title: '러닝 팁: 올바른 자세',
        message: '러닝 시 허리를 펴고 팔꿈치를 90도로 유지하면 더 효율적으로 달릴 수 있습니다.',
        time: '2일 전',
        isRead: true,
        icon: 'fitness',
        action: 'tip'
      },
      {
        id: 5,
        type: 'safety',
        title: '한강 주변 안전 주의',
        message: '오늘 밤 한강 주변에 안개가 발생할 예정입니다. 러닝 시 주의하세요.',
        time: '30분 전',
        isRead: false,
        icon: 'warning',
        action: 'safety'
      }
    ],
    chat: [
      {
        id: 10,
        type: 'message',
        title: '잠실한강공원 러닝 모임',
        message: '김러너님이 "내일 날씨가 좋을 것 같아요!" 메시지를 보냈습니다.',
        time: '10분 전',
        isRead: false,
        icon: 'chatbubble',
        action: 'chat',
        chatId: 'chat_001'
      },
      {
        id: 11,
        type: 'like',
        title: '게시글 좋아요',
        message: '러닝매니아님이 당신의 "한강 러닝 후기" 게시글에 좋아요를 눌렀습니다.',
        time: '1시간 전',
        isRead: false,
        icon: 'heart',
        action: 'like',
        postId: 'post_001'
      },
      {
        id: 12,
        type: 'comment',
        title: '게시글 댓글',
        message: '초보러너님이 당신의 "러닝화 추천" 게시글에 댓글을 남겼습니다.',
        time: '2시간 전',
        isRead: false,
        icon: 'chatbubble-ellipses',
        action: 'comment',
        postId: 'post_002'
      },
      {
        id: 13,
        type: 'mention',
        title: '게시글에서 언급',
        message: '박러너님이 "오늘 러닝 팁" 게시글에서 당신을 언급했습니다.',
        time: '1일 전',
        isRead: true,
        icon: 'at',
        action: 'mention',
        postId: 'post_003'
      }
    ]
  });

  // 탭 데이터
  const tabs = [
    { id: 'general', name: '일반' },
    { id: 'meeting', name: '모임' },
    { id: 'chat', name: '커뮤니티' }
  ];

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
            eventId: n.event?.id,
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
    
    // 일반 탭의 경우 날씨 알림도 포함
    if (tabType === 'general') {
      const generalNotifications = notifications[tabType].filter(notif => 
        isNotificationTypeEnabled(notif.type)
      );
      
      // 날씨 알림이 활성화되어 있으면 날씨 알림도 추가
      if (settings.notifications.weatherAlert) {
        // 여기서 실제 날씨 데이터를 가져와서 알림을 생성할 수 있습니다
        // 현재는 정적 데이터만 사용
      }
      
      return generalNotifications;
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
    } else {
      // 일반/커뮤니티 알림 읽음 처리
      setNotifications(prev => ({
        ...prev,
        [tabType]: prev[tabType].map(notif => 
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      }));
    }
  };

  // 알림 클릭 처리
  const handleNotificationPress = (notification) => {
    console.log('🖱️ 알림 클릭됨:', notification);
    console.log('📋 알림 타입:', notification.type);
    console.log('🔗 알림 액션:', notification.action);
    console.log('🧭 네비게이션 데이터:', notification.navigationData);
    
    // 읽음 처리 (rating 알림은 제외)
    if (notification.type === 'rating') {
      console.log('📊 rating 알림은 읽음 처리하지 않음');
    } else if (activeTab === 'chat') {
      // 커뮤니티 알림은 CommunityContext에서 처리
      console.log('📖 커뮤니티 알림 읽음 처리:', notification.id);
      markNotificationAsRead(notification.id);
    } else {
      console.log('📖 일반 알림 읽음 처리:', notification.id);
      markAsRead(activeTab, notification.id);
    }
    
    // 액션에 따른 네비게이션
    const action = notification.action || notification.type; // action이 없으면 type 사용
    console.log('🎯 처리할 액션:', action);
    
    switch (action) {
      case 'meeting':
        navigation.navigate('EventDetail', { eventId: notification.meetingId });
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
            
            // Chat 화면으로 이동 (독립적인 스크린)
            navigation.navigate('Chat', { 
              chatRoom: targetChatRoom,
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
          const post = getPostById(Number(postId)); // 문자열을 숫자로 변환
          console.log('📄 찾은 게시글:', post);
          if (post) {
            console.log('✅ 게시글로 이동:', post.title);
            navigation.navigate('PostDetail', { post });
          } else {
            console.log('❌ 게시글을 찾을 수 없음. 전체 게시글 목록:', posts);
            Alert.alert('오류', '해당 게시글을 찾을 수 없습니다.');
          }
        } else {
          console.log('❌ navigationData 또는 postId가 없음:', notification);
        }
        break;
      case 'update':
        Alert.alert('앱 업데이트', '최신 버전으로 업데이트하시겠습니까?');
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
            const post = getPostById(Number(postId));
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
              size={20} 
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
              {notification.time || formatTime(notification.timestamp)}
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
        {/* 테스트 버튼 (커뮤니티 탭에서만 표시) */}
        {activeTab === 'chat' && (
          <View style={styles.testSection}>
            <Text style={styles.testSectionTitle}>테스트 기능</Text>
            <View style={styles.testButtons}>
              <TouchableOpacity 
                style={styles.testButton}
                onPress={() => {
                  console.log('🧪 NotificationScreen - 좋아요 알림 테스트 버튼 클릭');
                  createLikeNotification('1', '한강 러닝 후기 공유합니다!', '테스트 사용자');
                  console.log('✅ 좋아요 알림 생성 완료');
                  Alert.alert('테스트', '좋아요 알림이 생성되었습니다!');
                }}
              >
                <Text style={styles.testButtonText}>좋아요 알림 생성</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.testButton}
                onPress={() => {
                  console.log('🧪 NotificationScreen - 댓글 알림 테스트 버튼 클릭');
                  createCommentNotification('2', '초보자 러닝 팁 질문드려요', '테스트 사용자');
                  console.log('✅ 댓글 알림 생성 완료');
                  Alert.alert('테스트', '댓글 알림이 생성되었습니다!');
                }}
              >
                <Text style={styles.testButtonText}>댓글 알림 생성</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 날씨 알림 테스트 버튼 (일반 탭에서만 표시) */}
        {activeTab === 'general' && (
          <View style={styles.testSection}>
            <Text style={styles.testSectionTitle}>날씨 알림 테스트</Text>
            <View style={styles.testButtons}>
              <TouchableOpacity 
                style={styles.testButton}
                onPress={() => {
                  console.log('🧪 NotificationScreen - 고온 알림 테스트');
                  const testWeatherData = {
                    temperature: 38,
                    feelsLike: 42,
                    humidity: 70,
                    windSpeed: 5,
                    rainVolume: 0
                  };
                  const testLocation = {
                    latitude: 37.5665,
                    longitude: 126.9780,
                    name: '서울시청'
                  };
                  
                  weatherAlertService.checkWeatherAlerts(testWeatherData, testLocation)
                    .then(alerts => {
                      if (alerts.length > 0) {
                        Alert.alert('날씨 알림 테스트', alerts[0].message);
                      } else {
                        Alert.alert('테스트', '알림 조건이 충족되지 않았습니다.');
                      }
                    });
                }}
              >
                <Text style={styles.testButtonText}>고온 알림 테스트</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.testButton}
                onPress={() => {
                  console.log('🧪 NotificationScreen - 강수 알림 테스트');
                  const testWeatherData = {
                    temperature: 20,
                    feelsLike: 22,
                    humidity: 85,
                    windSpeed: 8,
                    rainVolume: 35
                  };
                  const testLocation = {
                    latitude: 37.5665,
                    longitude: 126.9780,
                    name: '서울시청'
                  };
                  
                  weatherAlertService.checkWeatherAlerts(testWeatherData, testLocation)
                    .then(alerts => {
                      if (alerts.length > 0) {
                        Alert.alert('날씨 알림 테스트', alerts[0].message);
                      } else {
                        Alert.alert('테스트', '알림 조건이 충족되지 않았습니다.');
                      }
                    });
                }}
              >
                <Text style={styles.testButtonText}>강수 알림 테스트</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 채팅 알림 테스트 버튼 (커뮤니티 탭에서만 표시) */}
        {activeTab === 'chat' && (
          <View style={styles.testSection}>
            <Text style={styles.testSectionTitle}>채팅 알림 테스트</Text>
            <View style={styles.testButtons}>
              {chatRooms.slice(0, 2).map((chatRoom, index) => (
                <TouchableOpacity 
                  key={chatRoom.id}
                  style={styles.testButton}
                  onPress={() => {
                    console.log(`🧪 NotificationScreen - 채팅 알림 테스트 버튼 클릭 (채팅방 ${index + 1})`);
                    const testMessage = `테스트 메시지 ${Date.now()}`;
                    // 실제 메시지 추가 (EventContext의 addChatMessage 사용)
                    addChatMessage(chatRoom.id, testMessage, '테스트 사용자');
                    // 커뮤니티 탭에 채팅 알림 생성
                    createChatNotification(chatRoom.id.toString(), chatRoom.title, testMessage, '테스트 사용자');
                    console.log(`✅ 채팅방 ${chatRoom.id}에 실제 메시지 추가 및 알림 생성 완료`);
                    Alert.alert('테스트', `채팅방 "${chatRoom.title}"에 실제 메시지가 추가되었습니다!`);
                  }}
                >
                  <Text style={styles.testButtonText}>채팅 {index + 1} 알림</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
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
  },
  unreadNotification: {
    borderLeftColor: COLORS.PRIMARY,
    backgroundColor: COLORS.SURFACE,
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
    color: COLORS.SECONDARY,
  },
  unreadTitle: {
    color: COLORS.TEXT,
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
    color: COLORS.SECONDARY,
  },
  unreadMessage: {
    color: COLORS.TEXT,
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
  testSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    marginBottom: 16,
  },
  testSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 12,
  },
  testButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  testButton: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
});

export default NotificationScreen; 