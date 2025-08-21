import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import ENV from '../config/environment';

const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  SECONDARY: '#666666',
  BORDER: '#374151',
  ICON_DEFAULT: '#9CA3AF',
};

const EventDetailScreen = ({ route, navigation }) => {
  const { event: rawEvent, isJoined = false, currentScreen, isCreatedByMe: routeIsCreatedByMe } = route.params;
  const [isJoinedState, setIsJoinedState] = useState(isJoined);
  const { user } = useAuth();
  const { endEvent } = useEvents();
  
  // 디버깅을 위한 로그 추가
  console.log('🔍 EventDetailScreen - rawEvent:', rawEvent);
  console.log('🔍 EventDetailScreen - rawEvent.date:', rawEvent.date, typeof rawEvent.date);
  console.log('🔍 EventDetailScreen - rawEvent.time:', rawEvent.time, typeof rawEvent.time);
  
  // 문자열로 받은 날짜를 Date 객체로 변환
  const event = {
    ...rawEvent,
    createdAt: rawEvent.createdAt && rawEvent.createdAt !== 'null' ? new Date(rawEvent.createdAt) : null,
    date: rawEvent.date && rawEvent.date !== 'null' ? new Date(rawEvent.date) : null,
    updatedAt: rawEvent.updatedAt && rawEvent.updatedAt !== 'null' ? new Date(rawEvent.updatedAt) : null
  };
  
  console.log('🔍 EventDetailScreen - processed event.date:', event.date, typeof event.date);
  console.log('🔍 EventDetailScreen - processed event.time:', event.time, typeof event.time);
  
  // 날짜 포맷팅 함수 추가
  const formatDate = (dateValue) => {
    if (!dateValue) return '날짜 없음';
    
    try {
      let date;
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        // ISO 형식 문자열인 경우
        if (dateValue.includes('T') || dateValue.includes('-')) {
          date = new Date(dateValue);
        } else {
          // 한국어 형식인 경우 (예: "2024년 1월 18일")
          const match = dateValue.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
          if (match) {
            const year = parseInt(match[1]);
            const month = parseInt(match[2]) - 1;
            const day = parseInt(match[3]);
            date = new Date(year, month, day);
          } else {
            return dateValue; // 파싱할 수 없는 경우 원본 반환
          }
        }
      } else {
        return '날짜 없음';
      }
      
      if (date && !isNaN(date.getTime())) {
        return date.toLocaleDateString('ko-KR');
      } else {
        return '날짜 없음';
      }
    } catch (error) {
      console.error('날짜 파싱 오류:', error);
      return '날짜 없음';
    }
  };
  
  // 내가 생성한 일정인지 확인 (route 파라미터 우선, 없으면 UID 비교 사용)
  const isCreatedByMe = routeIsCreatedByMe !== undefined ? routeIsCreatedByMe : (user && event.createdBy && (
    user.uid === event.createdBy || user.uid === event.organizerId ||
    user.displayName === event.organizer || 
    user.email?.split('@')[0] === event.organizer ||
    event.organizer === '나' ||
    event.isCreatedByUser
  ));

  // 디버깅을 위한 로그 추가
  console.log('🔍 EventDetailScreen - isCreatedByMe 확인:', {
    routeIsCreatedByMe,
    userUid: user?.uid,
    eventCreatedBy: event.createdBy,
    userDisplayName: user?.displayName,
    eventOrganizer: event.organizer,
    userEmail: user?.email?.split('@')[0],
    eventIsCreatedByUser: event.isCreatedByUser,
    isCreatedByMe
  });

  // 종료된 모임 여부 확인
  const isEnded = event.status === 'ended';

  const getEventTypeEmoji = (type) => {
    const emojiMap = {
      '한강 러닝': '🏃‍♂️',
      '마라톤': '🏃‍♀️',
      '트레킹': '🥾',
      '자전거': '🚴‍♂️',
      '수영': '🏊‍♂️',
    };
    return emojiMap[type] || '🎯';
  };

  const getDifficultyColor = (difficulty) => {
    const colorMap = {
      '초급': '#C9CD8F',
      '중급': '#DAE26F',
      '고급': '#EEFF00',
    };
    return colorMap[difficulty] || '#666666';
  };

  const parseHashtags = (hashtagString) => {
    if (!hashtagString || !hashtagString.trim()) return [];
    
    const hashtags = hashtagString
      .split(/\s+/)
      .filter(tag => tag.startsWith('#') && tag.length > 1)
      .map(tag => tag.replace(/[^#\w가-힣]/g, '').replace(/^#/, ''))
      .slice(0, 5);
    
    return hashtags;
  };

  const handleJoinPress = () => {
    if (isCreatedByMe) {
      // 내가 생성한 일정인 경우 종료하기
      Alert.alert(
        '모임 종료',
        `"${event.title}" 모임을 종료하시겠습니까?\n\n종료된 모임은 '종료된 모임'에서\n확인할 수 있습니다.`,
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '종료하기', 
            style: 'destructive',
            onPress: () => {
              // 모임 종료 (EventContext에서 알림 생성 포함)
              endEvent(event.id);
              Alert.alert('종료 완료', '모임이 종료되었습니다.\n러닝매너를 작성해보세요!');
              
              // 단순히 뒤로가기만 수행
              navigation.goBack();
            }
          },
        ]
      );
    } else if (isJoinedState) {
      // 참여한 모임에서 나가기
      Alert.alert(
        '모임 나가기',
        '이 모임에서 나가시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '나가기', 
            style: 'destructive',
            onPress: () => {
              setIsJoinedState(false);
              Alert.alert('나가기 완료', '모임에서 나갔습니다.');
            }
          },
        ]
      );
    } else {
      // 모임 참여하기
      Alert.alert(
        '모임 참여',
        `"${event.title}" 모임에 참여하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '참여하기', 
            onPress: () => {
              setIsJoinedState(true);
              Alert.alert(
                '참여 완료', 
                '모임에 참여했습니다!\n채팅방에도 자동으로 입장되었습니다.',
                [{ text: '확인' }]
              );
            }
          },
        ]
      );
    }
  };

  const handleParticipantPress = (participant) => {
    // 호스트가 현재 사용자인 경우 프로필 탭으로 이동
    if (participant.isHost && user && (
      user.displayName === participant.name || 
      user.email?.split('@')[0] === participant.name ||
      participant.name === '나'
    )) {
      navigation.navigate('ProfileTab');
    } else {
      // 다른 참여자인 경우 ParticipantScreen으로 이동
      navigation.navigate('Participant', { participant });
    }
  };

  const renderParticipantsList = () => {
    // 실제 일정의 호스트 정보를 사용하여 참여자 목록 생성
    const hostName = event.organizer || '알 수 없음';
    const currentParticipants = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1); // 현재 참여자 수 (기본값: 호스트 1명)
    
    // 호스트가 현재 사용자인지 확인
    const isCurrentUserHost = user && (
      user.displayName === hostName || 
      user.email?.split('@')[0] === hostName ||
      hostName === '나'
    );
    
    // 호스트 정보 - 현재 사용자인 경우 실제 프로필 정보 사용
    const hostParticipant = isCurrentUserHost ? {
      id: 'participant_0',
      name: user.displayName || user.email?.split('@')[0] || '나',
      profileImage: user.photoURL || null,
      isHost: true,
      level: '초급',
      mannerScore: 5.0,
      totalParticipated: 0,
      thisMonth: 0,
      hostedEvents: 0,
      joinDate: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '.'),
      bio: '자기소개를 입력해주세요.'
    } : {
      id: 'participant_0',
      name: hostName,
      profileImage: null,
      isHost: true,
      level: '초급',
      mannerScore: 5.0,
      totalParticipated: 0,
      thisMonth: 0,
      hostedEvents: 0,
      joinDate: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '.'),
      bio: '자기소개를 입력해주세요.'
    };

    // 추가 참여자들 (호스트 제외) - 빈 배열로 초기화
    const additionalParticipants = [];

    // 실제 참여자 수에 맞춰 참여자 목록 생성 (호스트 + 추가 참여자들)
    const participants = [hostParticipant, ...additionalParticipants.slice(0, currentParticipants - 1)];

    return (
      <View style={styles.participantsGrid}>
        {participants.map((participant, index) => (
          <TouchableOpacity 
            key={participant.id} 
            style={styles.participantItem}
            onPress={() => handleParticipantPress(participant)}
            activeOpacity={0.7}
          >
            <View style={styles.participantAvatar}>
              {participant.profileImage ? (
                <Image source={{ uri: participant.profileImage }} style={styles.participantImage} />
              ) : (
                <View style={styles.participantImagePlaceholder}>
                  <Ionicons name="person" size={16} color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>
                {participant.isHost ? `호스트: ${participant.name}` : participant.name}
              </Text>
              <Text style={styles.participantBio} numberOfLines={2}>
                {participant.bio}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const createInlineMapHTML = () => {
    let latitude, longitude;
    
    if (event.customMarkerCoords) {
      latitude = event.customMarkerCoords.lat || event.customMarkerCoords.latitude;
      longitude = event.customMarkerCoords.lng || event.customMarkerCoords.longitude;
    } else {
      latitude = 37.5172;
      longitude = 126.9881;
    }
    
    // TestFlight에서 API 키 로딩 상태 확인
    const kakaoApiKey = ENV.kakaoMapApiKey;
    console.log('🗺️ EventDetailScreen - 카카오맵 API 키:', kakaoApiKey ? '로드됨' : '로드실패');
    if (!__DEV__) {
      console.log('📍 TestFlight - 카카오맵 API 키 상태:', {
        hasKey: !!kakaoApiKey,
        keyLength: kakaoApiKey?.length || 0,
        environment: 'production'
      });

    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">

          <title>한강 지도</title>
          <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${ENV.kakaoMapApiKey}"></script>
          <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                  background: #1F1F24; 
                  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                  overflow: hidden;
                  height: 180px;
              }
              #map { 
                  width: 100%; 
                  height: 180px; 
                  border: none;
                  border-radius: 12px;
              }
          </style>
      </head>
      <body>
          <div id="map"></div>
          <script>
              function sendMessage(message) {
                  if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage(message);
                  }
              }
              
              try {
                  sendMessage('🗺️ 스크립트 시작');
                  sendMessage('📍 좌표: ${latitude}, ${longitude}');
                  
                  if (typeof kakao === 'undefined') {
                      sendMessage('❌ Kakao SDK 로딩 실패');
                      throw new Error('Kakao SDK not loaded');
                  }
                  sendMessage('✅ Kakao SDK 확인됨');
                  
                  var container = document.getElementById('map');
                  if (!container) {
                      sendMessage('❌ 지도 컨테이너 없음');
                      throw new Error('Map container not found');
                  }
                  sendMessage('✅ 지도 컨테이너 확인됨');
                  
                  var options = {
                      center: new kakao.maps.LatLng(${latitude}, ${longitude}),
                      level: 3,
                      disableDoubleClick: true,
                      disableDoubleClickZoom: true
                  };
                  sendMessage('✅ 지도 옵션 설정됨');
                  
                  var map = new kakao.maps.Map(container, options);
                  sendMessage('✅ 지도 객체 생성됨');
                  
                  var customSvgString = '<svg width="28" height="35" viewBox="0 0 28 35" xmlns="http://www.w3.org/2000/svg">' +
                      '<path d="M14 0C6.3 0 0 6.3 0 14c0 8.4 14 21 14 21s14-12.6 14-21c0-7.7-6.3-14-14-14z" fill="#FF4444"/>' +
                      '<path d="M14 0C6.3 0 0 6.3 0 14c0 8.4 14 21 14 21s14-12.6 14-21c0-7.7-6.3-14-14-14z" fill="none" stroke="#ffffff" stroke-width="2"/>' +
                      '<circle cx="14" cy="14" r="7" fill="#ffffff"/>' +
                      '<circle cx="14" cy="14" r="4" fill="#FF4444"/>' +
                      '</svg>';
                  var imageSrc = 'data:image/svg+xml;base64,' + btoa(customSvgString);
                  var imageSize = new kakao.maps.Size(28, 35);
                  var imageOffset = new kakao.maps.Point(14, 35);
                  
                  var markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, { offset: imageOffset });
                  sendMessage('✅ 마커 이미지 생성됨');
                  
                  var markerPosition = new kakao.maps.LatLng(${latitude}, ${longitude});
                  var marker = new kakao.maps.Marker({
                      position: markerPosition,
                      image: markerImage
                  });
                  marker.setMap(map);
                  sendMessage('✅ 마커 배치됨');
                  
                  map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
                  sendMessage('✅ 지도 타입 설정됨');
                  
                  try {
                      map.removeControl(map.getZoomControl());
                      sendMessage('✅ 줌 컨트롤 제거됨');
                  } catch (e) {
                      sendMessage('⚠️ 줌 컨트롤 제거 실패: ' + e.message);
                  }
                  
                  sendMessage('🎉 지도 초기화 완료!');
                  
              } catch (error) {
                  sendMessage('🚨 지도 로딩 오류: ' + error.message);
              }
          </script>
      </body>
      </html>
    `;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          navigation.goBack();
        }} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>모임 상세</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 65 }}
      >
        {/* 이벤트 제목 */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View style={styles.typeContainer}>
              <Text style={styles.typeEmoji}>{getEventTypeEmoji(event.type)}</Text>
              <Text style={styles.typeText}>{event.type}</Text>
            </View>
          </View>
        </View>

        {/* 기본 정보 */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color={COLORS.ICON_DEFAULT} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>장소</Text>
              <Text style={styles.infoValue}>{event.location}</Text>
              {event.customLocation && (
                <Text style={styles.infoDetailValue}>📍 {event.customLocation}</Text>
              )}
            </View>
          </View>

          {/* 인라인 지도 */}
          <View style={styles.inlineMapContainer}>
            <WebView
              source={{ html: createInlineMapHTML() }}
              style={styles.inlineMapWebView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}

            />
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color={COLORS.ICON_DEFAULT} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>날짜</Text>
              <Text style={styles.infoValue}>
                {formatDate(event.date)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time" size={20} color={COLORS.ICON_DEFAULT} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>시간</Text>
              <Text style={styles.infoValue}>{event.time}</Text>
            </View>
          </View>
        </View>

        {/* 러닝 정보 */}
        <View style={styles.runningInfoSection}>
          <Text style={styles.sectionTitle}>러닝 정보</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>거리</Text>
              <Text style={styles.statValue}>{event.distance}km</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>페이스</Text>
              <Text style={styles.statValue}>{event.pace}</Text>
            </View>
          </View>

          <View style={styles.difficultyContainer}>
            <Text style={styles.difficultyLabel}>난이도</Text>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(event.difficulty) }]}>
              <Text style={styles.difficultyText}>{event.difficulty}</Text>
            </View>
          </View>

          {/* 해시태그를 러닝 정보 카드 내부로 이동 */}
          {event.hashtags && parseHashtags(event.hashtags).length > 0 && (
            <View style={styles.hashtagContainer}>
              {parseHashtags(event.hashtags).map((tag, index) => (
                <View key={index} style={styles.hashtagBadge}>
                  <Text style={styles.hashtagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 참여자 정보 */}
        <View style={styles.participantsSection}>
          <Text style={styles.sectionTitle}>참여자</Text>
          <View style={styles.participantsInfo}>
            <Ionicons name="people" size={20} color={COLORS.ICON_DEFAULT} />
            <Text style={styles.participantsText}>
              {Array.isArray(event.participants) ? event.participants.length : (event.participants || 1)}명
              {event.maxParticipants ? ` / ${event.maxParticipants}명` : ' (제한 없음)'}
            </Text>
            {event.maxParticipants && (
              <View style={styles.participantsBar}>
                <View 
                  style={[
                    styles.participantsProgress, 
                    { width: `${Math.min((Array.isArray(event.participants) ? event.participants.length : (event.participants || 1)) / event.maxParticipants, 1) * 100}%` }
                  ]} 
                />
              </View>
            )}
          </View>
          
          {/* 참여자 목록 */}
          <View style={styles.participantsList}>
            {renderParticipantsList()}
          </View>
        </View>


      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.bottomActions}>
        {isEnded ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.endButton]} 
            onPress={() => {
              // 참여자 목록 데이터 생성
              const hostName = event.organizer || '알 수 없음';
              const currentParticipants = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1);
              
              const isCurrentUserHost = user && (
                user.displayName === hostName || 
                user.email?.split('@')[0] === hostName ||
                hostName === '나'
              );
              
              const hostParticipant = isCurrentUserHost ? {
                id: 'participant_0',
                name: user.displayName || user.email?.split('@')[0] || '나',
                profileImage: user.photoURL || null,
                isHost: true,
                role: 'host',
                bio: user.bio || '새벽 러닝의 매력을 알려드리는 코치입니다!'
              } : {
                id: 'participant_0',
                name: hostName,
                profileImage: null,
                isHost: true,
                role: 'host',
                bio: '새벽 러닝의 매력을 알려드리는 코치입니다!'
              };

              const additionalParticipants = [
                {
                  id: 'participant_1',
                  name: '김새벽',
                  profileImage: null,
                  isHost: false,
                  role: 'participant',
                  bio: '새벽 러닝을 시작한 지 3개월 된 초보입니다.'
                },
                {
                  id: 'participant_2',
                  name: '이모닝',
                  profileImage: null,
                  isHost: false,
                  role: 'participant',
                  bio: '모닝 러닝으로 하루를 시작하는 것이 좋아요!'
                },
                {
                  id: 'participant_3',
                  name: '최한강',
                  profileImage: null,
                  isHost: false,
                  role: 'participant',
                  bio: '한강에서의 러닝이 가장 좋아요!'
                },
                {
                  id: 'participant_4',
                  name: '정조깅',
                  profileImage: null,
                  isHost: false,
                  role: 'participant',
                  bio: '조깅으로 건강을 챙기고 있는 초보 러너입니다.'
                }
              ];

              const participants = [hostParticipant, ...additionalParticipants.slice(0, currentParticipants - 1)];
              navigation.navigate('RunningMeetingReview', { event, participants });
            }}
          >
            <Ionicons name="create-outline" size={24} color="#000000" />
            <Text style={[styles.actionButtonText, styles.endButtonText]}>러닝매너 작성하기</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              isCreatedByMe ? styles.endButton : (isJoinedState ? styles.leaveButton : styles.joinButton)
            ]} 
            onPress={handleJoinPress}
          >
            <Ionicons 
              name={isCreatedByMe ? "checkmark-circle" : (isJoinedState ? "exit" : "add")} 
              size={24} 
              color={isCreatedByMe ? "#000000" : (isJoinedState ? COLORS.TEXT : "#000000")} 
            />
            <Text style={[
              styles.actionButtonText, 
              isCreatedByMe ? styles.endButtonText : (isJoinedState ? styles.leaveButtonText : styles.joinButtonText)
            ]}>
              {isCreatedByMe ? '종료하기' : (isJoinedState ? '나가기' : '참여하기')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
    padding: 16,
  },
  titleSection: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    flex: 1,
    marginRight: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.CARD,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  typeEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  infoSection: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: COLORS.SECONDARY,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  infoDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginTop: 4,
  },
  inlineMapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  inlineMapWebView: {
    flex: 1,
  },
  runningInfoSection: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 16,
    color: COLORS.SECONDARY,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.BORDER,
    marginHorizontal: 20,
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  difficultyLabel: {
    fontSize: 16,
    color: COLORS.TEXT,
    marginRight: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  participantsSection: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  participantsText: {
    fontSize: 16,
    color: COLORS.TEXT,
    marginLeft: 8,
  },
  participantsBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.BORDER,
    borderRadius: 2,
    marginLeft: 12,
  },
  participantsProgress: {
    height: '100%',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 2,
  },
  participantsList: {
    marginTop: 8,
  },
  participantsGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
  },
  participantImage: {
    width: '100%',
    height: '100%',
  },
  participantImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  participantName: {
    fontSize: 16,
    color: COLORS.TEXT,
    fontWeight: '500',
    marginBottom: 4,
  },
  participantBio: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    lineHeight: 18,
  },
  hashtagSection: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  hashtagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtagBadge: {
    backgroundColor: COLORS.PRIMARY + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hashtagText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  bottomActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.BACKGROUND,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 22,
    borderTopWidth: 0.25,
    borderTopColor: '#333333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  joinButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  leaveButton: {
    backgroundColor: '#FF4444',
  },
  endButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  joinButtonText: {
    color: '#000000',
  },
  leaveButtonText: {
    color: COLORS.TEXT,
  },
  endButtonText: {
    color: '#000000',
  },
});

export default EventDetailScreen; 