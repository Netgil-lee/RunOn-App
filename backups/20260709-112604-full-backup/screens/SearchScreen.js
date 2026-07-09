import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  Keyboard,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useEvents } from '../contexts/EventContext';
import { useAuth } from '../contexts/AuthContext';
import { useCommunity } from '../contexts/CommunityContext';
import MeetingCard from '../components/MeetingCard';
import blacklistService from '../services/blacklistService';
import { useTheme } from '../contexts/ThemeContext';

const SearchScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { userCreatedEvents, userJoinedEvents, endedEvents } = useEvents();
  const { posts: communityPosts } = useCommunity(); // 실제 커뮤니티 데이터 사용
  const [blacklist, setBlacklist] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'events', 'posts'
  const [recentSearches, setRecentSearches] = useState([]);
  const [showRecentSearches, setShowRecentSearches] = useState(true);
  
  const searchInputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 화면 포커스 시 검색바 자동 포커스
  useFocusEffect(
    React.useCallback(() => {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }, [])
  );

  // 애니메이션 효과
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // 블랙리스트 가져오기
  useEffect(() => {
    if (!user?.uid) return;

    const fetchBlacklist = async () => {
      try {
        const blacklistData = await blacklistService.getBlacklist(user.uid);
        setBlacklist(blacklistData);
      } catch (error) {
        console.log('블랙리스트 조회 실패 (빈 배열로 처리):', error.message);
        setBlacklist([]); // 빈 배열로 설정
      }
    };

    fetchBlacklist();
  }, [user?.uid]);


  // 모든 모임 데이터 통합 (중복 제거 및 종료된 모임 제외)
  const allEvents = [
    ...userCreatedEvents,
    ...userJoinedEvents,
    ...endedEvents,
  ];
  
  // 중복 제거: event.id를 기준으로 중복 제거
  const uniqueEvents = allEvents.filter((event, index, self) =>
    index === self.findIndex((e) => e.id === event.id)
  );
  
  // 종료된 모임 제외
  const activeEvents = uniqueEvents.filter(event => event.status !== 'ended');

  // 검색 실행
  const performSearch = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // 검색어를 소문자로 변환
    const searchTerm = query.toLowerCase().trim();
    
    // 모임 검색 결과 (블랙리스트 필터링 적용)
    const filteredEvents = blacklistService.filterEventsByBlacklist(activeEvents, blacklist);
    const eventResults = filteredEvents.filter(event => {
      // 제목 검색
      const titleMatch = event.title?.toLowerCase().includes(searchTerm);
      
      // 태그 검색 - hashtags가 문자열인지 확인
      let hashtags = '';
      if (event.hashtags) {
        if (typeof event.hashtags === 'string') {
          hashtags = event.hashtags.toLowerCase();
        } else if (Array.isArray(event.hashtags)) {
          // 배열인 경우 문자열로 변환
          hashtags = event.hashtags.join(' ').toLowerCase();
        }
      }
      const tagMatch = hashtags.includes(searchTerm);
      
      // 장소 검색 (한강공원, 강변)
      const locationMatch = event.location?.toLowerCase().includes(searchTerm);
      
      // 상세 위치 검색
      const customLocationMatch = event.customLocation?.toLowerCase().includes(searchTerm);
      
      // 모임 유형 검색
      const typeMatch = event.type?.toLowerCase().includes(searchTerm);
      
      return titleMatch || tagMatch || locationMatch || customLocationMatch || typeMatch;
    }).map(event => ({ ...event, resultType: 'event' }));

    // 게시글 검색 결과
    const postResults = communityPosts.filter(post => {
      // 제목 검색
      const titleMatch = post.title?.toLowerCase().includes(searchTerm);
      
      // 내용 검색
      const contentMatch = post.content?.toLowerCase().includes(searchTerm);
      
      // 태그 검색 - hashtags가 문자열인지 확인
      let hashtags = '';
      if (post.hashtags) {
        if (typeof post.hashtags === 'string') {
          hashtags = post.hashtags.toLowerCase();
        } else if (Array.isArray(post.hashtags)) {
          // 배열인 경우 문자열로 변환
          hashtags = post.hashtags.join(' ').toLowerCase();
        }
      }
      const tagMatch = hashtags.includes(searchTerm);
      
      // 카테고리 검색
      const categoryMatch = post.category?.toLowerCase().includes(searchTerm);
      
      // 작성자 검색
      const authorMatch = post.author?.toLowerCase().includes(searchTerm);
      
      return titleMatch || contentMatch || tagMatch || categoryMatch || authorMatch;
    }).map(post => ({ ...post, resultType: 'post' }));

    // 모든 결과를 저장 (탭 필터링은 별도로 처리)
    const allResults = [...eventResults, ...postResults];
    setSearchResults(allResults);
    setIsSearching(false);
    
    // 최근 검색어에 추가
    if (query.trim() && !recentSearches.includes(query.trim())) {
      const newRecentSearches = [query.trim(), ...recentSearches.slice(0, 4)];
      setRecentSearches(newRecentSearches);
    }
  };

  // 현재 탭에 따른 필터링된 결과 계산
  const getFilteredResults = () => {
    if (activeTab === 'all') {
      return searchResults;
    } else if (activeTab === 'events') {
      return searchResults.filter(item => item.resultType === 'event');
    } else if (activeTab === 'posts') {
      return searchResults.filter(item => item.resultType === 'post');
    }
    return searchResults;
  };

  // 탭 변경 핸들러
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    // performSearch를 다시 호출하지 않음 - 이미 검색된 결과에서 필터링만 함
  };

  // 검색어 변경 시 실시간 검색
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
        setShowRecentSearches(false);
      } else {
        setSearchResults([]);
        setShowRecentSearches(true);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 검색어 제출
  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    performSearch(searchQuery);
    setShowRecentSearches(false);
  };

  // 최근 검색어 클릭
  const handleRecentSearchClick = (searchTerm) => {
    setSearchQuery(searchTerm);
    performSearch(searchTerm);
    setShowRecentSearches(false);
  };

  // 검색어 삭제
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowRecentSearches(true);
    searchInputRef.current?.focus();
  };

  // 검색 결과 카드 렌더링
  const renderSearchResult = (item, index) => {
    // 게시글인 경우
    if (item.resultType === 'post') {
      return renderPostResult(item, index);
    }
    
    // 모임인 경우 (기존 로직)
    return renderEventResult(item, index);
  };

  // 게시글 검색 결과 렌더링
  const renderPostResult = (post, index) => {
    const parseHashtags = (hashtagString) => {
      // undefined, null, 빈 문자열 체크
      if (!hashtagString) return [];
      
      // 이미 배열인 경우 그대로 반환
      if (Array.isArray(hashtagString)) {
        return hashtagString;
      }
      
      // 문자열이 아닌 경우 빈 배열 반환
      if (typeof hashtagString !== 'string') {
        return [];
      }
      
      // trim() 함수가 없는 경우 처리
      if (typeof hashtagString.trim !== 'function') {
        return [];
      }
      
      if (!hashtagString.trim()) return [];
      
      // 문자열인 경우 파싱
      const hashtags = hashtagString
        .split(/\s+/)
        .filter(tag => tag.startsWith('#') && tag.length > 1)
        .map(tag => {
          const cleanTag = tag.replace(/[^#\w가-힣]/g, '');
          const tagWithoutHash = cleanTag.replace(/^#+/, '');
          return `#${tagWithoutHash}`;
        })
        .slice(0, 3);
      
      return hashtags;
    };

    const formatDate = (dateString) => {
      if (!dateString) return '';
      
      try {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return '어제';
        if (diffDays <= 7) return `${diffDays}일 전`;
        
        return `${date.getMonth() + 1}월 ${date.getDate()}일`;
      } catch (error) {
        return dateString;
      }
    };

    return (
      <TouchableOpacity
        style={styles.searchResultCard}
        onPress={() => {
          // 게시글 상세 화면으로 이동 (PostDetailScreen이 있다고 가정)
          navigation.navigate('PostDetail', { post });
        }}
      >
        {/* 제목과 카테고리 */}
        <View style={styles.resultTitleRow}>
          <View style={styles.resultTitleWithDifficulty}>
            <Text style={styles.resultTitle}>{post.title}</Text>
            <View style={styles.postCategoryBadge}>
              <Text style={styles.postCategoryText}>{post.category}</Text>
            </View>
          </View>
          <View style={styles.resultTypeBadge}>
            <Text style={styles.resultTypeText}>게시글</Text>
          </View>
        </View>

        {/* 내용 미리보기 */}
        <Text style={styles.postContentPreview} numberOfLines={2}>
          {post.content}
        </Text>

        {/* 태그들 */}
        {post.hashtags && parseHashtags(post.hashtags).length > 0 && (
          <View style={styles.resultTagsContainer}>
            {parseHashtags(post.hashtags).map((hashtag, tagIndex) => (
              <View key={tagIndex} style={styles.resultTag}>
                <Text style={styles.resultTagText}>{hashtag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 하단 정보 */}
        <View style={styles.resultFooter}>
          <View style={styles.resultOrganizerInfo}>
            <View style={styles.resultOrganizerAvatar}>
              {post.authorImage && !post.authorImage.startsWith('file://') ? (
                <Image 
                  source={{ uri: post.authorImage }} 
                  style={styles.resultOrganizerAvatarImage}
                  resizeMode="cover"
                />
              ) : post.authorProfile?.profileImage && !post.authorProfile.profileImage.startsWith('file://') ? (
                <Image 
                  source={{ uri: post.authorProfile.profileImage }} 
                  style={styles.resultOrganizerAvatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.resultOrganizerAvatarText}>
                  {post.author ? post.author.charAt(0) : '작'}
                </Text>
              )}
            </View>
            <Text style={styles.resultOrganizerName}>
              {post.author || '작성자'}
            </Text>
            <Text style={styles.postDateText}>
              {formatDate(post.createdAt)}
            </Text>
          </View>

          <View style={styles.resultRightSection}>
            <View style={styles.postStats}>
              <Ionicons name="heart-outline" size={14} color={colors.TEXT_SECONDARY} />
              <Text style={styles.postStatsText}>{post.likes}</Text>
              <Ionicons name="chatbubble-outline" size={14} color={colors.TEXT_SECONDARY} style={{ marginLeft: 8 }} />
              <Text style={styles.postStatsText}>{post.comments}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // 모임 검색 결과 렌더링 (기존 함수명 변경)
  const renderEventResult = (event, index) => {
    const getDifficultyColor = (difficulty) => {
      const colorMap = {
        '초급': '#C9CD8F',
        '중급': '#DAE26F',
        '고급': '#EEFF00',
      };
      return colorMap[difficulty] || '#666666';
    };

    const parseHashtags = (hashtagString) => {
      // undefined, null, 빈 문자열 체크
      if (!hashtagString) return [];
      
      // 이미 배열인 경우 그대로 반환
      if (Array.isArray(hashtagString)) {
        return hashtagString;
      }
      
      // 문자열이 아닌 경우 빈 배열 반환
      if (typeof hashtagString !== 'string') {
        return [];
      }
      
      // trim() 함수가 없는 경우 처리
      if (typeof hashtagString.trim !== 'function') {
        return [];
      }
      
      if (!hashtagString.trim()) return [];
      
      // 문자열인 경우 파싱
      const hashtags = hashtagString
        .split(/\s+/)
        .filter(tag => tag.startsWith('#') && tag.length > 1)
        .map(tag => {
          const cleanTag = tag.replace(/[^#\w가-힣]/g, '');
          const tagWithoutHash = cleanTag.replace(/^#+/, '');
          return `#${tagWithoutHash}`;
        })
        .slice(0, 3);
      
      return hashtags;
    };

    const formatDateWithoutYear = (dateString) => {
      if (!dateString) return '';
      
      if (dateString.includes('(') && dateString.includes(')')) {
        return dateString;
      }
      
      try {
        let date;
        if (dateString.includes('년')) {
          const cleaned = dateString.replace(/^\d{4}년\s*/, '');
          const match = cleaned.match(/(\d{1,2})월\s*(\d{1,2})일/);
          if (match) {
            const month = parseInt(match[1]);
            const day = parseInt(match[2]);
            date = new Date(new Date().getFullYear(), month - 1, day);
          }
        } else {
          date = new Date(dateString);
        }
        
        if (date && !isNaN(date.getTime())) {
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
          return `${month}월 ${day}일 (${dayOfWeek})`;
        }
      } catch (error) {
        // 날짜 파싱 오류
      }
      
      return dateString.replace(/^\d{4}년\s*/, '');
    };

    return (
      <TouchableOpacity
        style={styles.searchResultCard}
        onPress={() => {
          // Date 객체를 문자열로 변환하여 직렬화 문제 해결
          const serializedEvent = {
            ...event,
            createdAt: event.createdAt && typeof event.createdAt.toISOString === 'function' ? event.createdAt.toISOString() : event.createdAt,
            date: event.date && typeof event.date.toISOString === 'function' ? event.date.toISOString() : event.date,
            updatedAt: event.updatedAt && typeof event.updatedAt.toISOString === 'function' ? event.updatedAt.toISOString() : event.updatedAt
          };
          
          navigation.navigate('EventDetail', { 
            event: serializedEvent, 
            isJoined: userJoinedEvents.some(e => e.id === event.id)
          });
        }}
      >
        {/* 제목과 난이도 */}
        <View style={styles.resultTitleRow}>
          <View style={styles.resultTitleWithDifficulty}>
            <Text style={styles.resultTitle}>{event.title}</Text>
            {event.difficulty && (
              <View style={[styles.difficultyBadge, { 
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: getDifficultyColor(event.difficulty),
                marginLeft: 12
              }]}> 
                <Text style={[styles.difficultyText, { color: getDifficultyColor(event.difficulty) }]}>
                  {event.difficulty}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.resultTypeBadge}>
            <Text style={styles.resultTypeText}>모임</Text>
          </View>
        </View>

        {/* 위치와 날짜/시간 */}
        <View style={styles.resultInfoRow}>
          <View style={styles.resultInfoItem}>
            <Ionicons name="location-outline" size={14} color={colors.PRIMARY} />
            <Text style={styles.resultInfoText}>{event.location}</Text>
          </View>
          <View style={styles.resultInfoItem}>
            <Ionicons name="time-outline" size={14} color={colors.PRIMARY} />
            <Text style={styles.resultInfoText}>
              {event.date ? formatDateWithoutYear(event.date) : '날짜 없음'} {event.time || '시간 없음'}
            </Text>
          </View>
        </View>

        {/* 거리/페이스 통계 */}
        <View style={styles.resultStatsContainer}>
          <View style={styles.resultStatItem}>
            <Text style={styles.resultStatValue}>
              {event.distance ? `${event.distance}km` : '5km'}
            </Text>
          </View>
          <View style={styles.resultStatDivider} />
          <View style={styles.resultStatItem}>
            <Text style={styles.resultStatValue}>{event.pace || '6:00-7:00'}</Text>
          </View>
        </View>

        {/* 태그들 */}
        {event.hashtags && parseHashtags(event.hashtags).length > 0 && (
          <View style={styles.resultTagsContainer}>
            {parseHashtags(event.hashtags).map((hashtag, tagIndex) => (
              <View key={tagIndex} style={styles.resultTag}>
                <Text style={styles.resultTagText}>{hashtag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 하단 정보 */}
        <View style={styles.resultFooter}>
          <View style={styles.resultOrganizerInfo}>
            <View style={styles.resultOrganizerAvatar}>
              {event.organizerImage && !event.organizerImage.startsWith('file://') ? (
                <Image 
                  source={{ uri: event.organizerImage }} 
                  style={styles.resultOrganizerAvatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.resultOrganizerAvatarText}>
                  {event.organizer ? event.organizer.charAt(0) : '나'}
                </Text>
              )}
            </View>
            <Text style={styles.resultOrganizerName}>
              {event.organizer || '내가 만든 모임'}
            </Text>
          </View>

          <View style={styles.resultRightSection}>
            {(event.participants || event.maxParticipants) && (
              <Text style={styles.resultParticipantInfo}>
                참여자 {Array.isArray(event.participants) ? event.participants.length : (event.participants || 0)}
                {event.maxParticipants ? `/${event.maxParticipants}` : ' (제한 없음)'}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // 추천 검색어
  const suggestedSearches = [
    { type: 'tag', text: '#러닝', icon: '🏃‍♀️' },
    { type: 'tag', text: '#모닝러닝', icon: '🌅' },
    { type: 'location', text: '뚝섬한강공원', icon: '🌉' },
    { type: 'location', text: '반포한강공원', icon: '🌉' },
    { type: 'location', text: '청계천', icon: '🏞️' },
    { type: 'location', text: '양재천', icon: '🏞️' },
    { type: 'category', text: '후기', icon: '📝' },
    { type: 'category', text: '코스추천', icon: '🗺️' },
    { type: 'category', text: '팁', icon: '💡' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.TEXT} />
          </TouchableOpacity>
          
          {/* 검색바 */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={colors.TEXT_SECONDARY} style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                placeholder="태그, 한강공원, 강변, 후기, 코스추천으로 검색"
                placeholderTextColor={colors.TEXT_SECONDARY}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color={colors.TEXT_SECONDARY} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* 검색 결과 또는 추천 */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {showRecentSearches ? (
            // 최근 검색어 및 추천 검색어
            <View style={styles.suggestionsContainer}>
              {/* 최근 검색어 */}
              {recentSearches.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>최근 검색어</Text>
                  <View style={styles.recentSearchesContainer}>
                    {recentSearches.map((search, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.recentSearchItem}
                        onPress={() => handleRecentSearchClick(search)}
                      >
                        <Ionicons name="time-outline" size={16} color={colors.TEXT_SECONDARY} />
                        <Text style={styles.recentSearchText}>{search}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* 추천 검색어 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>추천 검색어</Text>
                <View style={styles.suggestedSearchesContainer}>
                  {suggestedSearches.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestedSearchItem}
                      onPress={() => handleRecentSearchClick(suggestion.text)}
                    >
                      <Text style={styles.suggestedSearchIcon}>{suggestion.icon}</Text>
                      <Text style={styles.suggestedSearchText}>{suggestion.text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            // 검색 결과
            <View style={styles.resultsContainer}>
              {isSearching ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>검색 중...</Text>
                </View>
              ) : searchQuery.trim() ? (
                <>
                  {/* 검색 결과 탭 */}
                  <View style={styles.tabContainer}>
                    <TouchableOpacity
                      style={[styles.tabButton, activeTab === 'all' && styles.activeTabButton]}
                      onPress={() => handleTabChange('all')}
                    >
                      <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
                        전체 ({searchResults.length})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tabButton, activeTab === 'events' && styles.activeTabButton]}
                      onPress={() => handleTabChange('events')}
                    >
                      <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>
                        모임 ({searchResults.filter(item => item.resultType === 'event').length})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tabButton, activeTab === 'posts' && styles.activeTabButton]}
                      onPress={() => handleTabChange('posts')}
                    >
                      <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
                        게시글 ({searchResults.filter(item => item.resultType === 'post').length})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.resultsHeader}>
                    <Text style={styles.resultsTitle}>
                      "{searchQuery}" 검색 결과
                    </Text>
                    <Text style={styles.resultsCount}>
                      {activeTab === 'all' && `${searchResults.length}개의 결과`}
                      {activeTab === 'events' && `${searchResults.filter(item => item.resultType === 'event').length}개의 모임`}
                      {activeTab === 'posts' && `${searchResults.filter(item => item.resultType === 'post').length}개의 게시글`}
                    </Text>
                  </View>
                  
                  {getFilteredResults().length > 0 ? (
                    <View style={styles.resultsList}>
                      {getFilteredResults().map((item, index) => (
                        <View key={item.id ? `${item.resultType}-${item.id}` : `${item.resultType}-${index}`}>
                          {renderSearchResult(item, index)}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.noResultsContainer}>
                      <Ionicons name="search-outline" size={64} color={colors.TEXT_SECONDARY} />
                      <Text style={styles.noResultsTitle}>검색 결과가 없습니다</Text>
                      <Text style={styles.noResultsSubtitle}>
                        다른 키워드로 검색해보세요
                      </Text>
                    </View>
                  )}
                </>
              ) : null}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomColor: colors.BORDER,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  searchContainer: {
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.SURFACE,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderColor: colors.BORDER,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.TEXT,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  suggestionsContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.TEXT,
    marginBottom: 12,
  },
  recentSearchesContainer: {
    gap: 8,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.SURFACE,
    borderRadius: 12,
    gap: 12,
  },
  recentSearchText: {
    fontSize: 15,
    color: colors.TEXT,
  },
  suggestedSearchesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestedSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.PRIMARY + '20',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.PRIMARY + '40',
    gap: 6,
  },
  suggestedSearchIcon: {
    fontSize: 16,
  },
  suggestedSearchText: {
    fontSize: 14,
    color: colors.PRIMARY,
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.TEXT_SECONDARY,
  },
  resultsHeader: {
    padding: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.TEXT,
    marginBottom: 4,
  },
  resultsCount: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
  },
  resultsList: {
    padding: 16,
    gap: 16,
  },
  searchResultCard: {
    backgroundColor: colors.CARD,
    borderRadius: 12,
    padding: 16,
    borderColor: colors.BORDER,
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultTitleWithDifficulty: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.TEXT,
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultTypeBadge: {
    backgroundColor: colors.PRIMARY + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.PRIMARY + '40',
  },
  resultTypeText: {
    fontSize: 11,
    color: colors.PRIMARY,
    fontWeight: '600',
  },
  resultInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
    flexWrap: 'wrap',
  },
  resultInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  resultInfoText: {
    fontSize: 14,
    color: colors.TEXT,
    marginLeft: 6,
    flexShrink: 1,
  },
  resultStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: colors.SURFACE,
    borderRadius: 8,
    marginBottom: 12,
  },
  resultStatItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.BORDER,
  },
  resultStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.TEXT,
  },
  resultTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  resultTag: {
    borderWidth: 1,
    borderColor: colors.PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resultTagText: {
    fontSize: 12,
    color: colors.PRIMARY,
    fontWeight: '500',
  },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultOrganizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultOrganizerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  resultOrganizerAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  resultOrganizerAvatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.TEXT,
  },
  resultOrganizerName: {
    fontSize: 14,
    color: colors.TEXT,
    fontWeight: '500',
  },
  resultRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultParticipantInfo: {
    fontSize: 14,
    color: colors.TEXT,
    fontWeight: '500',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.TEXT,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
    textAlign: 'center',
  },
  postCategoryBadge: {
    backgroundColor: colors.PRIMARY + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.PRIMARY + '40',
  },
  postCategoryText: {
    fontSize: 11,
    color: colors.PRIMARY,
    fontWeight: '600',
  },
  postContentPreview: {
    fontSize: 14,
    color: colors.TEXT,
    marginBottom: 12,
    lineHeight: 20,
  },
  postDateText: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
    marginLeft: 8,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postStatsText: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.SURFACE,
    borderRadius: 12,
    paddingVertical: 4,
    marginHorizontal: 16,
    marginBottom: 8,
    borderColor: colors.BORDER,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeTabButton: {
    backgroundColor: colors.PRIMARY + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.PRIMARY + '40',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.TEXT_SECONDARY,
  },
  activeTabText: {
    color: colors.PRIMARY,
  },
});

export default SearchScreen; 