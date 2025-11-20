import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import { useCommunity } from '../contexts/CommunityContext';
import ScheduleCard from '../components/ScheduleCard';
import { formatTimestamp, sanitizeTimestamps } from '../utils/timestampUtils';


// NetGill 디자인 시스템 - 최종 색상 팔레트
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  SECONDARY: '#666666',
};

const CommunityScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { allEvents, chatRooms, joinEvent, userJoinedEvents } = useEvents();
  const { hasChatNotification, hasBoardNotification, notifications, markNotificationAsRead, handleChatTabClick, handleChatRoomClick, handleBoardTabClick } = useCommunity();
  const insets = useSafeAreaInsets();
  
  // Android에서 상태바 높이만큼 여백 추가
  const statusBarPadding = Platform.OS === 'android' ? insets.top : 0;
  
  // 디버깅: 알림 상태 확인
  useEffect(() => {
    console.log('🔍 CommunityScreen - hasChatNotification:', hasChatNotification);
    console.log('🔍 CommunityScreen - hasBoardNotification:', hasBoardNotification);
    console.log('🔍 CommunityScreen - notifications count:', notifications.length);
    console.log('🔍 CommunityScreen - unread chat notifications:', notifications.filter(n => n.type === 'message' && !n.isRead).length);
    console.log('🔍 CommunityScreen - unread board notifications:', notifications.filter(n => (n.type === 'like' || n.type === 'comment') && !n.isRead).length);
  }, [hasChatNotification, hasBoardNotification, notifications]);

  // 특정 채팅방의 읽지 않은 알림 개수 계산
  const getUnreadCountForChatRoom = (chatRoomId) => {
    // chatRoomId를 문자열로 변환하여 비교
    const chatRoomIdStr = chatRoomId.toString();
    
    // 모든 알림 타입 확인
    const allNotificationTypes = [...new Set(notifications.map(n => n.type))];
    
    // message 타입 알림만 필터링
    const messageNotifications = notifications.filter(n => n.type === 'message');
    
    // chatId가 일치하는 알림 필터링
    const matchingNotifications = messageNotifications.filter(n => n.chatId === chatRoomIdStr);
    
    // 읽지 않은 알림만 필터링
    const unreadCount = matchingNotifications.filter(n => !n.isRead).length;
    
    console.log(`🔍 getUnreadCountForChatRoom(${chatRoomId}):`, {
      chatRoomId,
      chatRoomIdType: typeof chatRoomId,
      chatRoomIdStr,
      totalNotifications: notifications.length,
      allNotificationTypes,
      messageNotificationsCount: messageNotifications.length,
      matchingNotificationsCount: matchingNotifications.length,
      unreadCount,
      sampleNotifications: notifications.slice(0, 3).map(n => ({
        id: n.id,
        type: n.type,
        chatId: n.chatId,
        isRead: n.isRead
      }))
    });
    
    return unreadCount;
  };
  // 검색 및 필터 상태
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('전체');
  const [selectedDifficulty, setSelectedDifficulty] = useState('전체');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('전체');
  
  // 탭 상태
  const [activeTab, setActiveTab] = useState('모임'); // '모임', '채팅', '게시판'
  
  // 탭 레이아웃 측정을 위한 상태
  const [tabLayouts, setTabLayouts] = useState({});
  const tabRefs = useRef({});
  
  // route.params에서 activeTab을 받아서 설정
  useEffect(() => {
    if (route.params?.activeTab) {
      setActiveTab(route.params.activeTab);
      // 채팅 탭으로 이동하는 경우 슬라이딩 애니메이션 실행
      if (route.params.activeTab === '채팅') {
        const tabIndex = ['모임', '채팅', '게시판'].indexOf('채팅');
        Animated.timing(slideAnim, {
          toValue: tabIndex,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    }
  }, [route.params?.activeTab]);
  
  // 슬라이딩 애니메이션 값
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // 탭 레이아웃 측정 핸들러
  const handleTabLayout = (tabId, event) => {
    const { x, width } = event.nativeEvent.layout;
    setTabLayouts(prev => ({
      ...prev,
      [tabId]: { x, width }
    }));
  };
  
  // 게시판 카테고리 필터 상태
  const [selectedPostCategory, setSelectedPostCategory] = useState('전체');
  


  const { posts } = useCommunity();
  const 자유게시판글 = Array.isArray(posts) ? posts : [];

  // 카테고리를 한글로 변환하는 함수
  const getCategoryName = (categoryId) => {
    const categoryMap = {
      'free': '자유 토크',
      'tips': '러닝 팁',
      'review': '모임 후기',
      'question': '질문 답변',
      'course': '코스 추천',
      'gear': '러닝 용품',
    };
    return categoryMap[categoryId] || categoryId;
  };
  
  // 카테고리별 게시글 필터링
  const getFilteredPosts = () => {
    if (selectedPostCategory !== '전체') {
      // 한글 카테고리명을 영어 ID로 변환
      const categoryIdMap = {
        '자유토크': 'free',
        '러닝 팁': 'tips',
        '모임 후기': 'review',
        '질문답변': 'question',
        '코스 추천': 'course',
        '러닝 용품': 'gear',
      };
      
      const categoryId = categoryIdMap[selectedPostCategory];
      
      if (categoryId) {
        return 자유게시판글.filter(post => post.category === categoryId);
      }
    }
    
    return 자유게시판글;
  };

  // 필터링된 게시글 표시
  const displayPosts = getFilteredPosts();
  


  const handleJoinEvent = (event) => {
    Alert.alert(
      '참여하기',
      `"${event.title}" 모임에 참여하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { text: '참여하기', onPress: () => {
          // 일정 참여 처리 (채팅방 자동 입장 포함)
          joinEvent(event.id);
          Alert.alert(
            '참여 완료', 
            '모임 참여가 완료되었습니다!\n채팅방에도 자동으로 입장되었습니다.',
            [
              { text: '확인' },
              { text: '채팅방 보기', onPress: () => setActiveTab('채팅') }
            ]
          );
        }}
      ]
    );
  };

  const handleEventPress = (event) => {
    // 내가 만든 모임인지 확인
    const isCreatedByMe = event.isCreatedByUser || false;
    
    // 참여 상태 확인
    const isJoined = userJoinedEvents.some(e => e.id === event.id);
    
    // 디버깅: 커뮤니티 모임 클릭 정보
    console.log('🔍 CommunityScreen - 모임 클릭 정보:', {
      eventId: event.id,
      eventOrganizerId: event.organizerId,
      eventCreatedBy: event.createdBy,
      eventIsCreatedByUser: event.isCreatedByUser,
      isCreatedByMe,
      isJoined,
      userUid: user?.uid
    });
    
    // Date 객체를 문자열로 직렬화
    const serializedEvent = {
      ...event,
      createdAt: event.createdAt && typeof event.createdAt.toISOString === 'function' ? event.createdAt.toISOString() : event.createdAt,
      date: event.date && typeof event.date.toISOString === 'function' ? event.date.toISOString() : event.date,
      updatedAt: event.updatedAt && typeof event.updatedAt.toISOString === 'function' ? event.updatedAt.toISOString() : event.updatedAt
    };
    
    navigation.navigate('EventDetail', { 
      event: serializedEvent, 
      isJoined,
      isCreatedByMe
    });
  };



  const handleParticipantPress = (participant) => {
    // ParticipantScreen으로 네비게이션
    navigation.navigate('Participant', { participant });
  };



  // 필터링된 이벤트 가져오기
  const getFilteredEvents = () => {
    return allEvents.filter(event => {
      // 종료된 모임 제외 - 커뮤니티탭에서는 종료된 모임을 표시하지 않음
      if (event.status === 'ended') {
        return false;
      }
      
      // 검색어 필터 - 해시태그 검색 개선
      let matchesSearch = !searchText;
      
      if (searchText) {
        const searchLower = searchText.toLowerCase().trim();

        
        // 제목 검색
        const titleMatch = event.title.toLowerCase().includes(searchLower);
        
        
        // 해시태그 검색 개선
        let hashtagMatch = false;
        if (event.hashtags) {

          
          // 해시태그 문자열을 개별 해시태그로 분리
          const eventHashtags = event.hashtags
            .split(/\s+/)
            .filter(tag => tag.startsWith('#'))
            .map(tag => tag.toLowerCase().replace('#', ''));
          
          
          
          // 검색어가 #으로 시작하는 경우
          if (searchLower.startsWith('#')) {
            const searchTag = searchLower.replace('#', '');
            hashtagMatch = eventHashtags.some(tag => tag.includes(searchTag));
            
          } else {
            // #없이 검색하는 경우도 해시태그에서 찾기
            hashtagMatch = eventHashtags.some(tag => tag.includes(searchLower));
            
          }
        }
        
        matchesSearch = titleMatch || hashtagMatch;
        
      }
      
      // 위치 필터
      const matchesLocation = selectedLocation === '전체' || event.location === selectedLocation;
      
      // 난이도 필터
      const matchesDifficulty = selectedDifficulty === '전체' || event.difficulty === selectedDifficulty;
      
      // 시간대 필터
      let matchesTimeSlot = true;
      if (selectedTimeSlot !== '전체' && event.time) {
        const hour = parseInt(event.time.split(':')[0]);
        const isAM = event.time.includes('오전');
        const isPM = event.time.includes('오후');
        
        if (selectedTimeSlot === '오전' && !isAM) matchesTimeSlot = false;
        if (selectedTimeSlot === '오후' && !isPM) matchesTimeSlot = false;
        if (selectedTimeSlot === '저녁' && !(isPM && hour >= 6)) matchesTimeSlot = false;
      }
      
      const finalResult = matchesSearch && matchesLocation && matchesDifficulty && matchesTimeSlot;
      
      
      return finalResult;
    });
  };

  // 필터 초기화
  const resetFilters = () => {
    setSearchText('');
    setSelectedLocation('전체');
    setSelectedDifficulty('전체');
    setSelectedTimeSlot('전체');
  };

  // 게시글 핸들러
  const handlePostPress = (post) => {
    try {
      // 안전한 데이터 전달을 위해 필요한 필드만 추출
      const safePost = {
        id: post.id || '',
        title: post.title || '',
        content: post.content || '',
        author: post.isAnonymous ? '익명' : post.author,
        authorId: post.authorId || '',
        createdAt: post.createdAt ? 
          (post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt) : 
          new Date().toISOString(),
        category: post.category || 'free',
        isAnonymous: post.isAnonymous || false,
        likes: Array.isArray(post.likes) ? post.likes : [],
        comments: Array.isArray(post.comments) ? post.comments : [],
        images: Array.isArray(post.images) ? post.images : [],
        hashtags: post.hashtags || [],
        location: post.location || ''
      };
      
      console.log('🔍 CommunityScreen - 게시글 클릭:', safePost);
      navigation.navigate('PostDetail', { post: safePost });
    } catch (error) {
      console.error('❌ 게시글 클릭 오류:', error);
      Alert.alert('오류', '게시글을 불러오는 중 오류가 발생했습니다.');
    }
  };

  const handleCreatePost = () => {
    navigation.navigate('PostCreate');
  };

  // 내가 작성한 게시글 필터링
  const getMyPosts = () => {
    return 자유게시판글.filter(post => post.author === user?.displayName);
  };

  // 내가 작성한 게시글과 전체 게시글 분리
  const myPosts = getMyPosts();
  const otherPosts = displayPosts.filter(post => 
    !myPosts.some(myPost => myPost.id === post.id)
  );

  // 작성자 표시 함수
  const getDisplayAuthor = (post) => {
    return post.isAnonymous ? '익명' : post.author;
  };

  // 채팅 핸들러
  const handleChatRoomPress = (chatRoom) => {
    console.log('🔍 handleChatRoomPress 호출됨:', {
      chatRoomId: chatRoom.id,
      eventId: chatRoom.eventId,
      title: chatRoom.title
    });
    
    handleChatRoomClick(chatRoom.id); // 채팅방 클릭 시 알림 해제
    
    // Date 객체를 문자열로 직렬화
    const serializedChatRoom = {
      ...chatRoom,
      createdAt: chatRoom.createdAt && typeof chatRoom.createdAt.toISOString === 'function' ? chatRoom.createdAt.toISOString() : chatRoom.createdAt,
      lastMessageTime: chatRoom.lastMessageTime && typeof chatRoom.lastMessageTime.toISOString === 'function' ? chatRoom.lastMessageTime.toISOString() : chatRoom.lastMessageTime,
      updatedAt: chatRoom.updatedAt && typeof chatRoom.updatedAt.toISOString === 'function' ? chatRoom.updatedAt.toISOString() : chatRoom.updatedAt
    };
    
    navigation.navigate('Chat', { 
      chatRoom: serializedChatRoom,
      returnToCommunity: true
    });
  };



  return (
    <SafeAreaView style={styles.container}>
      {/* 스크롤 가능한 컨텐츠 */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: 0 }]}
      >
        {/* 헤더 섹션 */}
        <View style={[styles.headerSection, { paddingTop: 20 + statusBarPadding }]}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>커뮤니티</Text>
          </View>
          <Text style={styles.subtitle}>러너들과 함께 소통하고 달려보세요</Text>
        </View>

        {/* 탭 선택 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            ref={ref => tabRefs.current['모임'] = ref}
            style={styles.tab}
            onPress={() => {
              setActiveTab('모임');
              Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
              }).start();
            }}
            onLayout={(event) => handleTabLayout('모임', event)}
          >
            <Text style={[styles.tabText, activeTab === '모임' && styles.activeTabText]}>
              러닝모임
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            ref={ref => tabRefs.current['채팅'] = ref}
            style={styles.tab}
            onPress={() => {
              setActiveTab('채팅');
              handleChatTabClick(); // 채팅 탭 클릭 시 알림 해제
              Animated.timing(slideAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }).start();
            }}
            onLayout={(event) => handleTabLayout('채팅', event)}
          >
            <View style={styles.tabTextContainer}>
              <Text style={[styles.tabText, activeTab === '채팅' && styles.activeTabText]}>
                채팅
              </Text>
              {hasChatNotification && (
                <View style={styles.chatNotificationBadge} />
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            ref={ref => tabRefs.current['게시판'] = ref}
            style={styles.tab}
            onPress={() => {
              setActiveTab('게시판');
              handleBoardTabClick(); // 자유게시판 탭 클릭 시 알림 해제
              Animated.timing(slideAnim, {
                toValue: 2,
                duration: 300,
                useNativeDriver: false,
              }).start();
            }}
            onLayout={(event) => handleTabLayout('게시판', event)}
          >
            <View style={styles.tabTextContainer}>
              <Text style={[styles.tabText, activeTab === '게시판' && styles.activeTabText, { paddingLeft: 10 }]}>
                자유게시판
              </Text>
              {hasBoardNotification && (
                <View style={styles.chatNotificationBadge} />
              )}
            </View>
          </TouchableOpacity>
          
          {/* 슬라이딩 언더라인 */}
          <Animated.View 
            style={[
              styles.slidingUnderline,
              {
                transform: [
                  {
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [
                        tabLayouts['모임']?.x || 0,
                        (tabLayouts['채팅']?.x || 0) - 4, // 채팅 탭에서 약간 왼쪽으로 이동
                        tabLayouts['게시판']?.x || 0
                      ]
                    })
                  }
                ],
                width: slideAnim.interpolate({
                  inputRange: [0, 1, 2],
                  outputRange: [
                    tabLayouts['모임']?.width || 0,
                    tabLayouts['채팅']?.width || 0,
                    tabLayouts['게시판']?.width || 0
                  ]
                })
              }
            ]}
          />
        </View>

        {/* 러닝 모임 탭 */}
        {activeTab === '모임' && (
          <>
            {/* 검색 및 필터 */}
            <View style={styles.searchSection}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.SECONDARY} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="모임 제목이나 태그로 검색..."
                  placeholderTextColor={COLORS.SECONDARY}
                  value={searchText}
                  onChangeText={setSearchText}
                />
                <TouchableOpacity 
                  style={styles.filterButton}
                  onPress={() => setShowFilters(true)}
                >
                  <Ionicons name="filter" size={20} color={COLORS.PRIMARY} />
                </TouchableOpacity>
              </View>
              
              {/* 활성 필터 표시 */}
              {(selectedLocation !== '전체' || selectedDifficulty !== '전체' || selectedTimeSlot !== '전체') && (
                <View style={styles.activeFilters}>
                  {selectedLocation !== '전체' && (
                    <View style={styles.filterTag}>
                      <Text style={styles.filterTagText}>{selectedLocation}</Text>
                      <TouchableOpacity onPress={() => setSelectedLocation('전체')}>
                        <Ionicons name="close" size={16} color={COLORS.PRIMARY} />
                      </TouchableOpacity>
                    </View>
                  )}
                  {selectedDifficulty !== '전체' && (
                    <View style={styles.filterTag}>
                      <Text style={styles.filterTagText}>{selectedDifficulty}</Text>
                      <TouchableOpacity onPress={() => setSelectedDifficulty('전체')}>
                        <Ionicons name="close" size={16} color={COLORS.PRIMARY} />
                      </TouchableOpacity>
                    </View>
                  )}
                  {selectedTimeSlot !== '전체' && (
                    <View style={styles.filterTag}>
                      <Text style={styles.filterTagText}>{selectedTimeSlot}</Text>
                      <TouchableOpacity onPress={() => setSelectedTimeSlot('전체')}>
                        <Ionicons name="close" size={16} color={COLORS.PRIMARY} />
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity style={styles.resetFiltersButton} onPress={resetFilters}>
                    <Text style={styles.resetFiltersText}>전체 초기화</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 러닝 일정 섹션 */}
            {getFilteredEvents().length > 0 ? (
              <View style={styles.eventsSection}>
                {getFilteredEvents().map((event) => {
                  // 내가 만든 모임인지 확인
                  const isCreatedByMe = event.isCreatedByUser || 
                    event.organizer === user?.displayName || 
                    event.organizer === user?.email?.split('@')[0] ||
                    event.organizer === '나';
                  
                  return (
                  <ScheduleCard
                    key={event.id}
                    event={event}
                    onJoinPress={handleJoinEvent}
                    onPress={handleEventPress}
                    showJoinButton={false} // 커뮤니티에서는 참여하기 버튼 숨김
                  />
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search" size={60} color={COLORS.SECONDARY} />
                <Text style={styles.emptyTitle}>
                  {searchText || selectedLocation !== '전체' || selectedDifficulty !== '전체' || selectedTimeSlot !== '전체' 
                    ? '검색 조건에 맞는 모임이 없어요' 
                    : '아직 생성된 러닝 모임이 없어요'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchText || selectedLocation !== '전체' || selectedDifficulty !== '전체' || selectedTimeSlot !== '전체'
                    ? '다른 조건으로 검색해보세요'
                    : '일정 탭에서 새로운 러닝 모임을 만들어보세요!'}
                </Text>
              </View>
            )}
          </>
        )}

        {/* 채팅 탭 */}
        {activeTab === '채팅' && (
          <>
                        {/* 채팅방 목록 */}
            <View style={styles.chatSection}>
              {(() => {
                // 종료된 모임의 채팅방 제외 (채팅방 상태와 모임 상태 모두 확인)
                const activeChatRooms = chatRooms.filter(chatRoom => {
                  // 1. 채팅방 자체가 'ended' 상태인지 확인
                  if (chatRoom.status === 'ended') {
                    console.log('🔍 CommunityScreen - 종료된 채팅방 제외 (status):', chatRoom.title);
                    return false;
                  }
                  
                  // 2. 관련 모임이 종료된 상태인지 확인
                  const relatedEvent = allEvents.find(event => event.id === chatRoom.eventId);
                  if (relatedEvent && relatedEvent.status === 'ended') {
                    console.log('🔍 CommunityScreen - 종료된 모임의 채팅방 제외:', chatRoom.title);
                    return false;
                  }
                  
                  
                  
                  // 3. 채팅방 제목에 "(종료됨)"이 포함되어 있는지 확인
                  if (chatRoom.title && chatRoom.title.includes('(종료됨)')) {
                    console.log('🔍 CommunityScreen - 종료됨 표시가 있는 채팅방 제외:', chatRoom.title);
                    return false;
                  }
                  
                  // 4. 관련 모임이 존재하지 않는 경우도 제외 (삭제된 모임)
                  if (!relatedEvent) {
                    console.log('🔍 CommunityScreen - 관련 모임이 없는 채팅방 제외:', chatRoom.title);
                    return false;
                  }
                  
                  return true;
                });
                
                // 채팅방 구분 로직
                const myCreatedChatRooms = activeChatRooms.filter(chatRoom => 
                  chatRoom.isCreatedByUser || 
                  chatRoom.createdBy === user?.uid || 
                  chatRoom.organizerId === user?.uid
                );
                const otherCreatedChatRooms = activeChatRooms.filter(chatRoom => 
                  !chatRoom.isCreatedByUser && 
                  chatRoom.createdBy !== user?.uid && 
                  chatRoom.organizerId !== user?.uid
                );
                
                return activeChatRooms.length > 0 ? (
                  <>
                    {/* 내가 생성한 모임 */}
                    {myCreatedChatRooms.length > 0 && (
                      <>
                        <View style={styles.sectionHeader}>
                          <Text style={styles.sectionTitle}>내가 생성한 모임</Text>
                        </View>
                        {myCreatedChatRooms.map((chatRoom) => (
                          <TouchableOpacity 
                            key={chatRoom.id} 
                            style={styles.chatRoomCard}
                            onPress={() => handleChatRoomPress(chatRoom)}
                          >
                            <View style={styles.chatRoomHeader}>
                              <View style={styles.chatRoomTitleContainer}>
                                <Text style={styles.chatRoomTitle}>{chatRoom.title}</Text>
                              </View>
                              <View style={styles.chatRoomMeta}>
                                                              <Text style={styles.chatRoomTime}>
                                {formatTimestamp(chatRoom.lastMessageTime)}
                              </Text>
                                {(() => {
                                  const unreadCount = getUnreadCountForChatRoom(chatRoom.id);
                                  return unreadCount > 0 ? (
                                    <View style={styles.unreadBadge}>
                                      <Text style={styles.unreadCount}>
                                        {unreadCount >= 3 ? '+3' : unreadCount}
                                      </Text>
                                    </View>
                                  ) : null;
                                })()}
                              </View>
                            </View>
                            
                            <Text style={styles.lastMessage} numberOfLines={1}>
                              {chatRoom.lastMessage}
                            </Text>
                            
                            <View style={styles.chatRoomFooter}>
                              <View style={styles.participantsInfo}>
                                <Ionicons name="people" size={14} color={COLORS.SECONDARY} />
                                <Text style={[styles.participantsCount, { color: '#666666' }]}>
                                  {(() => {
                                    const participants = chatRoom.participants;
                                    console.log('🔍 참여자수 계산:', {
                                      participants,
                                      type: typeof participants,
                                      isArray: Array.isArray(participants),
                                      length: Array.isArray(participants) ? participants.length : 'N/A'
                                    });
                                    
                                    if (Array.isArray(participants)) {
                                      return `${participants.length}명`;
                                    } else if (participants && typeof participants === 'number') {
                                      return `${participants}명`;
                                    } else if (chatRoom.maxParticipants) {
                                      return `1/${chatRoom.maxParticipants}명`;
                                    } else {
                                      return '1명';
                                    }
                                  })()}
                                </Text>
                              </View>
                              {console.log('🔍 CommunityScreen - 첫 번째 chatRoom 데이터:', {
                                chatRoomId: chatRoom.id,
                                participants: chatRoom.participants,
                                participantsType: typeof chatRoom.participants,
                                isArray: Array.isArray(chatRoom.participants),
                                participantsLength: Array.isArray(chatRoom.participants) ? chatRoom.participants.length : 1,
                                isCreatedByUser: chatRoom.isCreatedByUser,
                                maxParticipants: chatRoom.maxParticipants
                              })}
                              <Ionicons name="chevron-forward" size={16} color={COLORS.SECONDARY} />
                            </View>
                          </TouchableOpacity>
                        ))}
                    </>
                  )}

                  {/* 구분선 */}
                  {myCreatedChatRooms.length > 0 && otherCreatedChatRooms.length > 0 && (
                    <View style={styles.divider} />
                  )}

                  {/* 다른 사용자가 생성한 모임 */}
                  {otherCreatedChatRooms.length > 0 && (
                    <>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>다른 사용자가 생성한 모임</Text>
                      </View>
                      {otherCreatedChatRooms.map((chatRoom) => (
                        <TouchableOpacity 
                          key={chatRoom.id} 
                          style={styles.chatRoomCard}
                          onPress={() => handleChatRoomPress(chatRoom)}
                        >
                          <View style={styles.chatRoomHeader}>
                            <View style={styles.chatRoomTitleContainer}>
                              <Text style={styles.chatRoomTitle}>{chatRoom.title}</Text>
                            </View>
                            <View style={styles.chatRoomMeta}>
                              <Text style={styles.chatRoomTime}>
                                {formatTimestamp(chatRoom.lastMessageTime)}
                              </Text>
                              {(() => {
                                const unreadCount = getUnreadCountForChatRoom(chatRoom.id);
                                return unreadCount > 0 ? (
                                  <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadCount}>
                                      {unreadCount >= 3 ? '+3' : unreadCount}
                                    </Text>
                                  </View>
                                ) : null;
                              })()}
                            </View>
                          </View>
                          
                          <Text style={styles.lastMessage} numberOfLines={1}>
                            {chatRoom.lastMessage}
                          </Text>
                          
                          <View style={styles.chatRoomFooter}>
                            <View style={styles.participantsInfo}>
                              <Ionicons name="people" size={14} color={COLORS.SECONDARY} />
                              <Text style={[styles.participantsCount, { color: '#666666' }]}>
                                {(() => {
                                  const participants = chatRoom.participants;
                                  console.log('🔍 참여자수 계산 (참여한 일정):', {
                                    participants,
                                    type: typeof participants,
                                    isArray: Array.isArray(participants),
                                    length: Array.isArray(participants) ? participants.length : 'N/A'
                                  });
                                  
                                  if (Array.isArray(participants)) {
                                    return `${participants.length}명`;
                                  } else if (participants && typeof participants === 'number') {
                                    return `${participants}명`;
                                  } else if (chatRoom.maxParticipants) {
                                    return `1/${chatRoom.maxParticipants}명`;
                                  } else {
                                    return '1명';
                                  }
                                })()}
                              </Text>
                              {console.log('🔍 CommunityScreen - chatRoom 데이터 (참여한 일정):', {
                                chatRoomId: chatRoom.id,
                                participants: chatRoom.participants,
                                participantsType: typeof chatRoom.participants,
                                isArray: Array.isArray(chatRoom.participants),
                                participantsLength: Array.isArray(chatRoom.participants) ? chatRoom.participants.length : 1,
                                isCreatedByUser: chatRoom.isCreatedByUser,
                                maxParticipants: chatRoom.maxParticipants
                              })}
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={COLORS.SECONDARY} />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={60} color={COLORS.SECONDARY} />
                  <Text style={styles.emptyTitle}>활성 채팅방이 없어요</Text>
                  <Text style={styles.emptySubtitle}>
                    진행 중인 러닝 모임에 참여하면 자동으로 채팅방이 생성됩니다
                  </Text>
                </View>
              );
            })()}
            </View>
          </>
        )}

        {/* 게시판 탭 */}
        {activeTab === '게시판' && (
          <>
            {/* 게시글 작성 버튼 */}
            <View style={styles.createPostSection}>
              <TouchableOpacity style={styles.createPostButton} onPress={handleCreatePost}>
                <Ionicons name="add" size={20} color="#000000" />
                <Text style={styles.createPostText}>새 글 작성</Text>
              </TouchableOpacity>
            </View>

            {/* 카테고리 검색 바 */}
            <View style={styles.categorySearchSection}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categorySearchContainer}
              >
                {['전체', '자유 토크', '러닝 팁', '모임 후기', '질문 답변', '코스 추천', '러닝 용품'].map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categorySearchItem,
                      selectedPostCategory === category && styles.categorySearchItemActive
                    ]}
                    onPress={() => setSelectedPostCategory(category)}
                  >
                    <Text style={[
                      styles.categorySearchText,
                      selectedPostCategory === category && styles.categorySearchTextActive
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 게시글 목록 */}
            <View style={styles.postsSection}>
              {/* 내가 작성한 게시글 섹션 */}
              {myPosts.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>내가 작성한 게시글</Text>
                    <Text style={styles.sectionSubtitle}>{myPosts.length}개</Text>
                  </View>
                  {myPosts.map((post) => (
                    <TouchableOpacity 
                      key={`my-${post.id}`} 
                      style={[styles.postCard, styles.myPostCard]}
                      onPress={() => handlePostPress(post)}
                    >
                      <View style={styles.postHeader}>
                        <View style={styles.postCategory}>
                          <Text style={styles.postCategoryText}>{getCategoryName(post.category)}</Text>
                        </View>
                        <Text style={styles.postDate}>
                          {formatTimestamp(post.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.postTitle}>{post.title}</Text>
                      <Text style={styles.postContent} numberOfLines={2}>
                        {post.content}
                      </Text>
                      <View style={styles.postFooter}>
                        <View style={styles.postAuthorSection}>
                          {post.isAnonymous ? (
                            <View style={styles.postAuthorAvatar}>
                              <Ionicons name="person" size={16} color="#ffffff" />
                            </View>
                          ) : post.authorProfile?.profileImage ? (
                            <Image 
                              source={{ uri: post.authorProfile.profileImage }} 
                              style={styles.postAuthorProfileImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.postAuthorAvatar}>
                              <Ionicons name="person" size={16} color="#ffffff" />
                            </View>
                          )}
                          <Text style={styles.postAuthor}>by {getDisplayAuthor(post)}</Text>
                        </View>
                        <View style={styles.postStats}>
                          <View style={styles.postStat}>
                            <Ionicons name="heart" size={14} color={COLORS.PRIMARY} />
                            <Text style={styles.postStatText}>{Array.isArray(post.likes) ? post.likes.length : 0}</Text>
                          </View>
                          <View style={styles.postStat}>
                            <Ionicons name="chatbubble" size={14} color={COLORS.SECONDARY} />
                            <Text style={styles.postStatText}>{Array.isArray(post.comments) ? post.comments.length : 0}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                  
                  {/* 구분선 */}
                  {otherPosts.length > 0 && (
                    <View style={styles.divider} />
                  )}
                </>
              )}

              {/* 전체 게시글 섹션 */}
              {otherPosts.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>전체 게시글</Text>
                  </View>
                  {otherPosts.map((post) => (
                    <TouchableOpacity 
                      key={post.id} 
                      style={styles.postCard}
                      onPress={() => handlePostPress(post)}
                    >
                      <View style={styles.postHeader}>
                        <View style={styles.postCategory}>
                          <Text style={styles.postCategoryText}>{getCategoryName(post.category)}</Text>
                        </View>
                        <Text style={styles.postDate}>
                          {formatTimestamp(post.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.postTitle}>{post.title}</Text>
                      <Text style={styles.postContent} numberOfLines={2}>
                        {post.content}
                      </Text>
                      <View style={styles.postFooter}>
                        <View style={styles.postAuthorSection}>
                          {post.isAnonymous ? (
                            <View style={styles.postAuthorAvatar}>
                              <Ionicons name="person" size={16} color="#ffffff" />
                            </View>
                          ) : post.authorProfile?.profileImage ? (
                            <Image 
                              source={{ uri: post.authorProfile.profileImage }} 
                              style={styles.postAuthorProfileImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.postAuthorAvatar}>
                              <Ionicons name="person" size={16} color="#ffffff" />
                            </View>
                          )}
                          <Text style={styles.postAuthor}>by {getDisplayAuthor(post)}</Text>
                        </View>
                        <View style={styles.postStats}>
                          <View style={styles.postStat}>
                            <Ionicons name="heart" size={14} color={COLORS.PRIMARY} />
                            <Text style={styles.postStatText}>{Array.isArray(post.likes) ? post.likes.length : 0}</Text>
                          </View>
                          <View style={styles.postStat}>
                            <Ionicons name="chatbubble" size={14} color={COLORS.SECONDARY} />
                            <Text style={styles.postStatText}>{Array.isArray(post.comments) ? post.comments.length : 0}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* 빈 상태 */}
              {myPosts.length === 0 && otherPosts.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={60} color={COLORS.SECONDARY} />
                  <Text style={styles.emptyTitle}>
                    {selectedPostCategory !== '전체' 
                      ? `${selectedPostCategory} 카테고리의 게시글이 없어요` 
                      : '아직 작성된 게시글이 없어요'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {selectedPostCategory !== '전체'
                      ? '다른 카테고리를 선택하거나 첫 번째 게시글을 작성해보세요!'
                      : '새 글 작성 버튼을 눌러 첫 번째 게시글을 작성해보세요!'}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* 하단 여백 */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* 필터 모달 */}
      <Modal
        visible={showFilters}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>필터 설정</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={COLORS.TEXT} />
              </TouchableOpacity>
            </View>

            {/* 위치 필터 */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>위치</Text>
              <View style={styles.filterOptions}>
                {['전체', '한강공원 🌉', '강변 🏞️', '공원 🌳', '트랙 🏃'].map((location) => (
                  <TouchableOpacity
                    key={location}
                    style={[
                      styles.filterOption,
                      selectedLocation === location && styles.selectedFilterOption
                    ]}
                    onPress={() => setSelectedLocation(location)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedLocation === location && styles.selectedFilterOptionText
                    ]}>
                      {location}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 난이도 필터 */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>난이도</Text>
              <View style={styles.filterOptions}>
                {['전체', '초급', '중급', '고급'].map((difficulty) => (
                  <TouchableOpacity
                    key={difficulty}
                    style={[
                      styles.filterOption,
                      selectedDifficulty === difficulty && styles.selectedFilterOption
                    ]}
                    onPress={() => setSelectedDifficulty(difficulty)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedDifficulty === difficulty && styles.selectedFilterOptionText
                    ]}>
                      {difficulty}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 시간대 필터 */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>시간대</Text>
              <View style={styles.filterOptions}>
                {['전체', '오전', '오후', '저녁'].map((timeSlot) => (
                  <TouchableOpacity
                    key={timeSlot}
                    style={[
                      styles.filterOption,
                      selectedTimeSlot === timeSlot && styles.selectedFilterOption
                    ]}
                    onPress={() => setSelectedTimeSlot(timeSlot)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedTimeSlot === timeSlot && styles.selectedFilterOptionText
                    ]}>
                      {timeSlot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 필터 액션 버튼 */}
            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>초기화</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyButton} 
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>적용</Text>
              </TouchableOpacity>
            </View>
          </View>
      </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // BottomTab을 위한 여백
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-Bold',
  },
  notificationBadge: {
    width: 10,
    height: 10,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 5,
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.SECONDARY,
    fontFamily: 'Pretendard-Regular',
  },
  eventsSection: {
    paddingBottom: 20,
    paddingHorizontal: 0,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Pretendard-SemiBold',
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Pretendard-Regular',
  },
  bottomSpacing: {
    height: 100, // BottomTab 네비게이션을 위한 여백
  },
  
  // 탭 스타일
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 0,
    marginBottom: 16,
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
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.SECONDARY,
    fontFamily: 'Pretendard-SemiBold',
  },
  tabTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingRight: 8,
  },
  chatNotificationBadge: {
    position: 'absolute',
    top: -2,
    right: -8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0022',
    zIndex: 10,
  },
  activeTabText: {
    color: COLORS.TEXT,
    fontWeight: '700',
    fontFamily: 'Pretendard-SemiBold',
  },
  slidingUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    backgroundColor: COLORS.PRIMARY,
    zIndex: 1,
  },
  
  // 검색 및 필터 스타일
  searchSection: {
    paddingHorizontal: 0,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-Regular',
  },
  filterButton: {
    padding: 4,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY + '20',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  filterTagText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '500',
    fontFamily: 'Pretendard-Medium',
  },
  resetFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.SECONDARY,
  },
  resetFiltersText: {
    fontSize: 14,
    color: COLORS.SECONDARY,
  },
  
  // 게시판 스타일
  createPostSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categorySearchSection: {
    marginBottom: 16,
  },
  categorySearchContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categorySearchItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categorySearchItemActive: {
    backgroundColor: COLORS.PRIMARY + '20',
    borderColor: COLORS.PRIMARY,
  },
  categorySearchText: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    fontWeight: '500',
  },
  categorySearchTextActive: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  createPostText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  postsSection: {
    paddingHorizontal: 0,
    gap: 12,
  },
  postCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 0,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  postCategory: {
    backgroundColor: COLORS.PRIMARY + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  postCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  postDate: {
    fontSize: 12,
    color: COLORS.SECONDARY,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    lineHeight: 20,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postAuthorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postAuthorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAuthorProfileImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  postAuthor: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    fontWeight: '500',
  },
  postStats: {
    flexDirection: 'row',
    gap: 16,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postStatText: {
    fontSize: 12,
    color: COLORS.SECONDARY,
  },
  myPostCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.PRIMARY,
  },
  
  // 채팅 스타일
  chatSection: {
    paddingHorizontal: 0,
    gap: 12,
  },
  sectionHeader: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.SURFACE,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerText: {
    fontSize: 12,
    color: COLORS.SECONDARY,
    backgroundColor: COLORS.BACKGROUND,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '500',
  },
  chatRoomCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 0,
  },
  chatRoomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  chatRoomTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatRoomTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT,
    flex: 1,
  },

  chatRoomMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  chatRoomTime: {
    fontSize: 12,
    color: COLORS.SECONDARY,
  },
  unreadBadge: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    marginBottom: 12,
    lineHeight: 20,
  },
  chatRoomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantsCount: {
    fontSize: 12,
    color: COLORS.SECONDARY,
    fontWeight: '500',
  },
  
  // 필터 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: COLORS.BACKGROUND,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.SURFACE,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.TEXT,
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.SURFACE,
  },
  selectedFilterOption: {
    backgroundColor: COLORS.PRIMARY + '20',
    borderColor: COLORS.PRIMARY,
  },
  filterOptionText: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    fontWeight: '500',
  },
  selectedFilterOptionText: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.SECONDARY,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.SECONDARY,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});

export default CommunityScreen; 