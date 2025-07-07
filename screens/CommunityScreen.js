import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import ScheduleCard from '../components/ScheduleCard';


// NetGill 디자인 시스템 - 최종 색상 팔레트
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  SECONDARY: '#666666',
};

const CommunityScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { allEvents, chatRooms, joinEvent } = useEvents();


  
  // 검색 및 필터 상태
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('전체');
  const [selectedDifficulty, setSelectedDifficulty] = useState('전체');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('전체');
  
  // 탭 상태
  const [activeTab, setActiveTab] = useState('모임'); // '모임', '채팅', '게시판'
  const [posts, setPosts] = useState([
    {
      id: 1,
      title: '한강 러닝 후기 공유합니다!',
      content: '어제 한강공원에서 5km 뛰었는데 정말 좋았어요. 날씨도 좋고...',
      author: '러닝매니아',
      createdAt: '2024-01-15',
      likes: 12,
      comments: 3,
      category: '후기'
    },
    {
      id: 2,
      title: '초보자 러닝 팁 질문드려요',
      content: '러닝을 시작한지 한 달 정도 됐는데, 무릎이 아픈 경우가 있어서...',
      author: '초보러너',
      createdAt: '2024-01-14',
      likes: 8,
      comments: 7,
      category: '질문'
    },
    {
      id: 3,
      title: '러닝화 추천 부탁드립니다',
      content: '발볼이 넓은 편인데 어떤 러닝화가 좋을까요?',
      author: '발넓이',
      createdAt: '2024-01-13',
      likes: 15,
      comments: 12,
      category: '추천'
    }
  ]);
  


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
    navigation.navigate('EventDetail', { event, isJoined: false });
  };



  const handleParticipantPress = (participant) => {
    // ParticipantScreen으로 네비게이션
    navigation.navigate('Participant', { participant });
  };



  // 필터링된 이벤트 가져오기
  const getFilteredEvents = () => {

    
    return allEvents.filter(event => {
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
    Alert.alert(post.title, post.content);
  };

  const handleCreatePost = () => {
    Alert.alert('게시글 작성', '게시글 작성 기능이 곧 추가됩니다!');
  };

  // 채팅 핸들러
  const handleChatRoomPress = (chatRoom) => {
    navigation.navigate('Chat', { chatRoom });
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
        <View style={styles.headerSection}>
        <Text style={styles.title}>커뮤니티</Text>
          <Text style={styles.subtitle}>러너들과 함께 소통하고 달려보세요</Text>
        </View>

        {/* 탭 선택 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === '모임' && styles.activeTab]}
            onPress={() => setActiveTab('모임')}
          >
            <Text style={[styles.tabText, activeTab === '모임' && styles.activeTabText]}>
              러닝모임
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === '채팅' && styles.activeTab]}
            onPress={() => setActiveTab('채팅')}
          >
            <Text style={[styles.tabText, activeTab === '채팅' && styles.activeTabText]}>
              채팅
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === '게시판' && styles.activeTab]}
            onPress={() => setActiveTab('게시판')}
          >
            <Text style={[styles.tabText, activeTab === '게시판' && styles.activeTabText]}>
              자유게시판
            </Text>
          </TouchableOpacity>
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
                {getFilteredEvents().map((event) => (
                  <ScheduleCard
                    key={event.id}
                    event={event}
                    onJoinPress={handleJoinEvent}
                    onPress={handleEventPress}
                  />
                ))}
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
              {chatRooms.length > 0 ? (
                <>
                  {/* 내가 생성한 일정 */}
                  {chatRooms.filter(chatRoom => chatRoom.isCreatedByUser).length > 0 && (
                    <>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>내가 생성한 일정</Text>
                      </View>
                      {chatRooms.filter(chatRoom => chatRoom.isCreatedByUser).map((chatRoom) => (
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
                              <Text style={styles.chatRoomTime}>{chatRoom.lastMessageTime}</Text>
                              {chatRoom.unreadCount > 0 && (
                                <View style={styles.unreadBadge}>
                                  <Text style={styles.unreadCount}>{chatRoom.unreadCount}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          
                          <Text style={styles.lastMessage} numberOfLines={1}>
                            {chatRoom.lastMessage}
                          </Text>
                          
                          <View style={styles.chatRoomFooter}>
                            <View style={styles.participantsInfo}>
                              <Ionicons name="people" size={14} color={COLORS.SECONDARY} />
                              <Text style={styles.participantsCount}>{chatRoom.participants}명</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={COLORS.SECONDARY} />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}

                  {/* 구분선 */}
                  {chatRooms.filter(chatRoom => chatRoom.isCreatedByUser).length > 0 && 
                   chatRooms.filter(chatRoom => !chatRoom.isCreatedByUser).length > 0 && (
                    <View style={styles.divider} />
                  )}

                  {/* 내가 참여한 일정 */}
                  {chatRooms.filter(chatRoom => !chatRoom.isCreatedByUser).length > 0 && (
                    <>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>내가 참여한 일정</Text>
                      </View>
                      {chatRooms.filter(chatRoom => !chatRoom.isCreatedByUser).map((chatRoom) => (
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
                              <Text style={styles.chatRoomTime}>{chatRoom.lastMessageTime}</Text>
                              {chatRoom.unreadCount > 0 && (
                                <View style={styles.unreadBadge}>
                                  <Text style={styles.unreadCount}>{chatRoom.unreadCount}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          
                          <Text style={styles.lastMessage} numberOfLines={1}>
                            {chatRoom.lastMessage}
                          </Text>
                          
                          <View style={styles.chatRoomFooter}>
                            <View style={styles.participantsInfo}>
                              <Ionicons name="people" size={14} color={COLORS.SECONDARY} />
                              <Text style={styles.participantsCount}>{chatRoom.participants}명</Text>
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
                  <Text style={styles.emptyTitle}>참여한 채팅방이 없어요</Text>
                  <Text style={styles.emptySubtitle}>
                    러닝 모임에 참여하면 자동으로 채팅방이 생성됩니다
                  </Text>
                </View>
              )}
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

            {/* 게시글 목록 */}
            <View style={styles.postsSection}>
              {posts.map((post) => (
                <TouchableOpacity 
                  key={post.id} 
                  style={styles.postCard}
                  onPress={() => handlePostPress(post)}
                >
                  <View style={styles.postHeader}>
                    <View style={styles.postCategory}>
                      <Text style={styles.postCategoryText}>{post.category}</Text>
                    </View>
                    <Text style={styles.postDate}>{post.createdAt}</Text>
                  </View>
                  <Text style={styles.postTitle}>{post.title}</Text>
                  <Text style={styles.postContent} numberOfLines={2}>
                    {post.content}
                  </Text>
                  <View style={styles.postFooter}>
                    <Text style={styles.postAuthor}>by {post.author}</Text>
                    <View style={styles.postStats}>
                      <View style={styles.postStat}>
                        <Ionicons name="heart" size={14} color={COLORS.PRIMARY} />
                        <Text style={styles.postStatText}>{post.likes}</Text>
                      </View>
                      <View style={styles.postStat}>
                        <Ionicons name="chatbubble" size={14} color={COLORS.SECONDARY} />
                        <Text style={styles.postStatText}>{post.comments}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.SECONDARY,
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
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSpacing: {
    height: 100, // BottomTab 네비게이션을 위한 여백
  },
  
  // 탭 스타일
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 0,
    marginBottom: 16,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.PRIMARY,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.SECONDARY,
  },
  activeTabText: {
    color: '#000000',
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
    paddingHorizontal: 0,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.TEXT,
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
  
  // 채팅 스타일
  chatSection: {
    paddingHorizontal: 0,
    gap: 12,
  },
  sectionHeader: {
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.SURFACE,
    marginVertical: 8,
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