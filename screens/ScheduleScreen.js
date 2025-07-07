import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Animated,
  Platform,
  Keyboard,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import HanRiverMap from '../components/HanRiverMap';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';


// NetGill 디자인 시스템 - 홈화면과 동일한 색상 팔레트
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  SECONDARY: '#666666',
};



const ScheduleScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { userCreatedEvents, userJoinedEvents, endedEvents, addEvent, updateEvent, deleteEvent, joinEvent } = useEvents();
  


  // 탭이 포커스될 때마다 메인 화면으로 리셋
  useFocusEffect(
    React.useCallback(() => {
      setShowCreateFlow(false);
      setShowMyCreated(false);
      setShowMyJoined(false);
      setShowEndedEvents(false);
      setEditingEvent(null);
      setShowLocationDetail(false);
    }, [])
  );

  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [showMyCreated, setShowMyCreated] = useState(false);
  const [showMyJoined, setShowMyJoined] = useState(false);
  const [showEndedEvents, setShowEndedEvents] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showLocationDetail, setShowLocationDetail] = useState(false);




  const handleCreateEvent = () => {
    setEditingEvent(null);
    setShowCreateFlow(true);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setShowCreateFlow(true);
  };

  const handleEventCreated = (newEvent) => {
    if (editingEvent && editingEvent.id) {
      // 수정 모드
      updateEvent(editingEvent.id, newEvent);
      setShowCreateFlow(false);
      setEditingEvent(null);
    } else {
      // 새 모임 생성
      const createdEvent = addEvent(newEvent);
      setShowCreateFlow(false);
      setEditingEvent(null);
      
      // 새 모임 생성 완료 알림
      Alert.alert(
        '모임 생성 완료! 🎉',
        `"${newEvent.title}" 모임이 성공적으로 생성되었습니다.\n\n채팅방을 확인해보세요!`,
        [
          { text: '확인' },
          { 
            text: '채팅방 보기', 
            onPress: () => navigation.navigate('CommunityTab')
          }
        ]
      );
    }
  };

  const handleCloseCreateFlow = () => {
    setShowCreateFlow(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = (eventId) => {
    Alert.alert(
      '모임 삭제',
      '이 모임을 삭제하시겠습니까?\n\n⚠️ 모임을 삭제하면 관련된 채팅방도 함께 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            deleteEvent(eventId);
            Alert.alert(
              '삭제 완료',
              '모임과 관련 채팅방이 삭제되었습니다.',
              [{ text: '확인' }]
            );
          },
        },
      ]
    );
  };

  const handleViewMyCreated = () => {
    setShowMyCreated(true);
  };

  const handleViewMyJoined = () => {
    setShowMyJoined(true);
  };

  const handleBackToMain = () => {
    setShowMyCreated(false);
    setShowMyJoined(false);
    setShowEndedEvents(false);
  };

  const handleViewEndedEvents = () => {
    setShowEndedEvents(true);
  };

  const handleEventPress = (event, currentScreen) => {
    navigation.navigate('EventDetail', { 
      event, 
      isJoined: userJoinedEvents.some(e => e.id === event.id), 
      currentScreen 
    });
  };



  const handleJoinEvent = (eventId) => {
    // 모임 참여 처리 (채팅방 자동 입장 포함)
    joinEvent(eventId);
    Alert.alert(
      '참여 완료', 
      '모임에 참여했습니다!\n채팅방에도 자동으로 입장되었습니다.',
      [
        { text: '확인' }
      ]
    );
  };

  const handleLeaveEvent = (eventId) => {
    Alert.alert('나가기 완료', '모임에서 나갔습니다.');
  };

  const handleParticipantPress = (participant) => {
    // ParticipantScreen으로 네비게이션
    navigation.navigate('Participant', { participant });
  };



  // 모임 생성 플로우 화면
  if (showCreateFlow) {
    return (
      <RunningEventCreationFlow
        onEventCreated={handleEventCreated}
        onClose={handleCloseCreateFlow}
        editingEvent={editingEvent}
      />
    );
  }

  // 내가 생성한 모임 화면
  if (showMyCreated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToMain} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>내가 생성한 모임</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {userCreatedEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="create-outline" size={80} color="#ffffff" />
              <Text style={styles.emptyTitle}>생성한 모임이 없어요</Text>
              <Text style={styles.emptySubtitle}>
                새로운 러닝 모임을 만들어보세요!
              </Text>
              <TouchableOpacity style={styles.createButton} onPress={handleCreateEvent}>
                <Ionicons name="add" size={24} color="#000000" />
                <Text style={styles.createButtonText}>모임 생성하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {userCreatedEvents.map((event, index) => (
                <ScheduleCard
                  key={event.id || index}
                  event={event}
                  onEdit={() => handleEditEvent(event)}
                  onDelete={() => handleDeleteEvent(event.id)}
                  onPress={(e) => handleEventPress(e, 'myCreated')}
                  isCreatedByMe={true}
                  cardIndex={index}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 내가 참여한 모임 화면
  if (showMyJoined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToMain} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>내가 참여한 모임</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {userJoinedEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={80} color="#ffffff" />
              <Text style={styles.emptyTitle}>참여한 모임이 없어요</Text>
              <Text style={styles.emptySubtitle}>
                다른 사람들의 러닝 모임에 참여해보세요!
              </Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {userJoinedEvents.map((event, index) => (
                <ScheduleCard
                  key={event.id}
                  event={event}
                  onEdit={null} // 참여한 모임은 수정 불가
                  onDelete={null} // 참여한 모임은 삭제 불가
                  onPress={(e) => handleEventPress(e, 'myJoined')}
                  isCreatedByMe={false}
                  showOrganizerInfo={true}
                  cardIndex={index}
                  showJoinButton={true} // 참여한 모임에서는 나가기 버튼 표시
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 종료된 모임 화면
  if (showEndedEvents) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToMain} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>종료된 모임</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {endedEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={80} color="#ffffff" />
              <Text style={styles.emptyTitle}>종료된 모임이 없어요</Text>
              <Text style={styles.emptySubtitle}>
                모임이 종료되면 여기에서 확인할 수 있습니다.
              </Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {endedEvents.map((event, index) => (
                <ScheduleCard
                  key={event.id || index}
                  event={event}
                  onEdit={null} // 종료된 모임은 수정 불가
                  onDelete={null} // 종료된 모임은 삭제 불가
                  onPress={(e) => handleEventPress(e, 'endedEvents')}
                  isCreatedByMe={event.isCreatedByUser}
                  showOrganizerInfo={true}
                  cardIndex={index}
                  showJoinButton={false} // 종료된 모임에서는 버튼 숨김
                  isEnded={true}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 메인 모임 화면 (3개 옵션)
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 헤더 섹션 */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>일정</Text>
          <Text style={styles.subtitle}>러닝 모임을 만들고 관리해보세요</Text>
        </View>

        {/* 새 모임 추가 */}
        <TouchableOpacity style={styles.mainOptionCard} onPress={handleCreateEvent}>
          <View style={styles.optionIconContainer}>
            <Ionicons name="add-circle" size={48} color={COLORS.PRIMARY} />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>새 모임 추가</Text>
            <Text style={styles.optionSubtitle}>
              새로운 러닝 모임을 생성하고 다른 사람들과 함께 달려보세요
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#666666" />
        </TouchableOpacity>

        {/* 내가 참여한 모임 */}
        <TouchableOpacity style={styles.mainOptionCard} onPress={handleViewMyJoined}>
          <View style={styles.optionIconContainer}>
            <Ionicons name="people" size={48} color="#ffffff" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>내가 참여한 모임</Text>
            <Text style={styles.optionSubtitle}>
              참여 신청한 러닝 모임들을 확인하고 관리하세요
            </Text>
            <View style={styles.optionBadge}>
              <Text style={styles.optionBadgeText}>{userJoinedEvents.length}개</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#666666" />
        </TouchableOpacity>

        {/* 내가 생성한 모임 */}
        <TouchableOpacity style={styles.mainOptionCard} onPress={handleViewMyCreated}>
          <View style={styles.optionIconContainer}>
            <Ionicons name="create" size={48} color="#ffffff" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>내가 생성한 모임</Text>
            <Text style={styles.optionSubtitle}>
              내가 만든 러닝 모임들을 관리하고 참여자를 확인하세요
            </Text>
            <View style={styles.optionBadge}>
              <Text style={styles.optionBadgeText}>{userCreatedEvents.length}개</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#666666" />
        </TouchableOpacity>

        {/* 종료된 모임 */}
        <TouchableOpacity style={styles.mainOptionCard} onPress={handleViewEndedEvents}>
          <View style={styles.optionIconContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#FFEA00" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>종료된 모임</Text>
            <Text style={styles.optionSubtitle}>
              종료된 모임을 확인하고 <Text style={{ color: COLORS.PRIMARY }}>러닝매너</Text>를 작성하세요
            </Text>
            <View style={styles.optionBadge}>
              <Text style={styles.optionBadgeText}>{endedEvents.length}개</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#666666" />
        </TouchableOpacity>

        {/* 추가 정보 섹션 */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>💡 모임 관리 팁</Text>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.infoText}>모임 생성 시 상세한 정보를 입력하면 더 많은 참여자를 모을 수 있어요</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.infoText}>참여한 모임은 시작 24시간 전까지 취소할 수 있어요</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.infoText}>날씨나 상황 변경 시 참여자들에게 미리 알려주세요</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const ScheduleCard = ({ event, onEdit, onDelete, onPress, isCreatedByMe = false, showOrganizerInfo = false, cardIndex, showJoinButton = true, isEnded = false }) => {
  const [showActionModal, setShowActionModal] = useState(false);
  const [buttonLayout, setButtonLayout] = useState(null);
  const [cardLayout, setCardLayout] = useState(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, right: 16 });
  const [isButtonPressed, setIsButtonPressed] = useState(false);

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
    
    // #으로 시작하는 해시태그들을 추출
    const hashtags = hashtagString
      .split(/\s+/) // 공백으로 분리
      .filter(tag => tag.startsWith('#') && tag.length > 1) // #으로 시작하고 길이가 1보다 큰 것만
      .map(tag => tag.replace(/[^#\w가-힣]/g, '')) // 특수문자 제거 (한글, 영문, 숫자, # 만 허용)
      .slice(0, 5); // 최대 5개까지만
    
    return hashtags;
  };

  const formatDateWithoutYear = (dateString) => {
    if (!dateString) return '';
    
    // 이미 요일이 포함된 형식인 경우 (예: "1월 18일 (목)") 그대로 반환
    if (dateString.includes('(') && dateString.includes(')')) {
      return dateString;
    }
    
    // "2024년 1월 18일" 또는 ISO 형식을 "1월 18일 (요일)" 형식으로 변환
    try {
      let date;
      if (dateString.includes('년')) {
        // 한국어 형식: "2024년 1월 18일"
        const cleaned = dateString.replace(/^\d{4}년\s*/, '');
        const match = cleaned.match(/(\d{1,2})월\s*(\d{1,2})일/);
        if (match) {
          const month = parseInt(match[1]);
          const day = parseInt(match[2]);
          date = new Date(new Date().getFullYear(), month - 1, day);
        }
      } else {
        // ISO 형식: "2024-01-18"
        date = new Date(dateString);
      }
      
      if (date && !isNaN(date.getTime())) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
        return `${month}월 ${day}일 (${dayOfWeek})`;
      }
    } catch (error) {
      // 날짜 파싱 오류 - 기본값 사용
    }
    
    // 파싱 실패 시 연도만 제거하여 반환
    return dateString.replace(/^\d{4}년\s*/, '');
  };

  const handleEditAction = () => {
    setShowActionModal(false);
    onEdit();
  };

  const handleDeleteAction = () => {
    setShowActionModal(false);
    onDelete();
  };

  const handleLeaveEvent = () => {
    setShowActionModal(false);
    Alert.alert(
      '모임 나가기',
      '이 모임에서 나가시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: () => {
            if (onDelete) onDelete();
          },
        },
      ]
    );
  };

  const handleCardPress = () => {
    // 버튼이 눌린 상태가 아닐 때만 카드 클릭 이벤트 실행
    if (!isButtonPressed && onPress) {
      onPress(event);
    }
    // 상태 초기화
    setTimeout(() => setIsButtonPressed(false), 100);
  };

  return (
    <TouchableOpacity 
      style={styles.eventCard}
      onPress={handleCardPress}
      activeOpacity={0.8}
      onLayout={(event) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        setCardLayout({ x, y, width, height });
      }}
    >
      {/* 제목과 난이도, 메뉴 버튼 */}
      <View style={styles.titleRow}>
        <View style={styles.titleWithDifficulty}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          {event.difficulty && (
            <View style={[styles.difficultyBadge, { 
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: getDifficultyColor(event.difficulty),
              marginLeft: 12
            }]}> 
              <Text style={[styles.difficultyText, { color: getDifficultyColor(event.difficulty) }]}>{event.difficulty}</Text>
            </View>
          )}
        </View>
        {isCreatedByMe && !isEnded ? (
          <TouchableOpacity 
            onPress={() => {
              setIsButtonPressed(true);
              setShowActionModal(true);
            }} 
            style={styles.actionButton}
            onLayout={(event) => {
              const { x, y, width, height } = event.nativeEvent.layout;
              setButtonLayout({ x, y, width, height });
              // 모달 위치 계산
              event.target.measure((fx, fy, width, height, px, py) => {
                setModalPosition({
                  top: py + height + 8,
                  right: 16,
                });
              });
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 위치와 날짜/시간을 한 줄로 배치 */}
      <View style={styles.locationDateTimeRow}>
        {/* 위치 */}
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.PRIMARY} />
          <Text style={styles.infoText}>{event.location}</Text>
        </View>

        {/* 날짜/시간 */}
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color={COLORS.PRIMARY} />
          <Text style={styles.infoText}>
            {event.date ? formatDateWithoutYear(event.date) : '날짜 없음'} {event.time || '시간 없음'}
          </Text>
        </View>
      </View>

      {/* 거리/페이스 통계 */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{event.distance ? `${event.distance}km` : '5km'}</Text>
        </View>
        <View style={styles.dividerContainer}>
          <View style={styles.statDivider} />
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{event.pace || '6:00-7:00'}</Text>
        </View>
      </View>

      {/* 태그들 */}
      {event.hashtags && parseHashtags(event.hashtags).length > 0 && (
        <View style={styles.tagsContainer}>
          {parseHashtags(event.hashtags).map((hashtag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{hashtag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 하단 정보 */}
      <View style={styles.footer}>
        <View style={styles.organizerInfo}>
          <View style={styles.organizerAvatar}>
            <Text style={styles.organizerAvatarText}>
              {showOrganizerInfo && event.organizer ? event.organizer.charAt(0) : '나'}
            </Text>
          </View>
          <Text style={styles.organizerName}>
            {showOrganizerInfo && event.organizer ? event.organizer : '내가 생성한 모임'}
          </Text>
        </View>

        <View style={styles.rightSection}>
          {(event.participants || event.maxParticipants) && (
            <Text style={styles.participantInfo}>
              참여자 {event.participants || 0}
              {event.maxParticipants ? `/${event.maxParticipants}` : ' (제한 없음)'}
            </Text>
          )}
          {!isCreatedByMe && showJoinButton && !isEnded && (
            <TouchableOpacity 
              onPress={() => {
                setIsButtonPressed(true);
                handleLeaveEvent();
              }} 
              style={styles.leaveButton}
            >
              <Ionicons name="exit-outline" size={20} color="#F44336" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 액션 모달 */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowActionModal(false)}
        >
          <View 
            style={[
              styles.actionModalContainer,
              {
                position: 'absolute',
                top: modalPosition.top,
                right: modalPosition.right,
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.actionModalButton} 
              onPress={handleEditAction}
            >
              <Ionicons name="pencil" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.actionModalButtonText}>수정</Text>
            </TouchableOpacity>
            <View style={styles.actionModalDivider} />
            <TouchableOpacity 
              style={styles.actionModalButton} 
              onPress={handleDeleteAction}
            >
              <Ionicons name="trash" size={20} color="#F44336" />
              <Text style={[styles.actionModalButtonText, { color: '#F44336' }]}>삭제</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
};

const RunningEventCreationFlow = ({ onEventCreated, onClose, editingEvent }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [eventType, setEventType] = useState(editingEvent?.type || '');
  const [title, setTitle] = useState(editingEvent?.title || '');
  const [location, setLocation] = useState(editingEvent?.location || '');
  const [date, setDate] = useState(() => {
    if (editingEvent?.date) {
      return new Date(editingEvent.date);
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [dateString, setDateString] = useState(editingEvent?.date || '');
  const [time, setTime] = useState(() => {
    if (editingEvent?.time) {
      // 기존 시간 문자열을 Date 객체로 변환
      const [ampm, timeStr] = editingEvent.time.split(' ');
      const [hour, minute] = timeStr.split(':');
      const date = new Date();
      let hour24 = parseInt(hour);
      if (ampm === '오후' && hour24 !== 12) hour24 += 12;
      if (ampm === '오전' && hour24 === 12) hour24 = 0;
      date.setHours(hour24, parseInt(minute), 0, 0);
      return date;
    }
    // 기본값: 오전 9시
    const defaultTime = new Date();
    defaultTime.setHours(9, 0, 0, 0);
    return defaultTime;
  });
  const [timeString, setTimeString] = useState(editingEvent?.time || '');
  const [distance, setDistance] = useState(editingEvent?.distance || '');
  const [minPace, setMinPace] = useState(() => {
    if (editingEvent?.pace && editingEvent.pace.includes(' - ')) {
      return editingEvent.pace.split(' - ')[0];
    }
    return editingEvent?.minPace || '';
  });
  const [maxPace, setMaxPace] = useState(() => {
    if (editingEvent?.pace && editingEvent.pace.includes(' - ')) {
      return editingEvent.pace.split(' - ')[1];
    }
    return editingEvent?.maxPace || '';
  });
  const [difficulty, setDifficulty] = useState(editingEvent?.difficulty || '');
  const [isPublic, setIsPublic] = useState(editingEvent?.isPublic || false);
  const [hashtags, setHashtags] = useState(editingEvent?.hashtags || '');
  const [maxParticipants, setMaxParticipants] = useState(editingEvent?.maxParticipants || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // 장소 선택 관련 상태
  const [selectedLocationType, setSelectedLocationType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocationData, setSelectedLocationData] = useState(null);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false); // 드롭다운 표시 상태
  
  // 커스텀 마커 관련 상태
  const [customLocation, setCustomLocation] = useState('');
  const [hasCustomMarker, setHasCustomMarker] = useState(false);
  const [customMarkerCoords, setCustomMarkerCoords] = useState(null);
  
  const scrollViewRef = useRef(null);
  const titleInputRef = useRef(null);
  const customLocationInputRef = useRef(null);
  const [inputLayout, setInputLayout] = useState(null);
  const [customLocationInputLayout, setCustomLocationInputLayout] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);



  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardVisible(true);
  
      
      // 키보드가 나타나면 자동으로 스크롤
      if (scrollViewRef.current) {
        setTimeout(() => {
          if (currentStep === 1) {
            // 1단계: 모임 제목 입력칸으로 스크롤
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollTo({
                y: 300,
                animated: true,
              });
            }
          } else if (currentStep === 2) {
            // 2단계: 현재 포커스된 입력칸 확인
            const focusedInput = customLocationInputRef.current?.isFocused();
            if (focusedInput && scrollViewRef.current) {
              // 상세 위치 입력칸이 포커스된 경우
              const keyboardHeight = event.endCoordinates.height;
              const scrollY = 550; // 더 큰 지도를 고려한 상세 위치 입력칸이 키보드 위에 잘 보이는 고정 위치
  
              scrollViewRef.current.scrollTo({
                y: scrollY,
                animated: true,
              });
            }
          }
        }, 100);
      }
    });
    
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      // 키보드가 사라지면 적당한 위치로 스크롤 (상세 위치 입력칸이 있는 경우)
      if (scrollViewRef.current) {
        setTimeout(() => {
          if (currentStep === 2 && hasCustomMarker) {
            // 2단계에서 상세 위치 입력칸이 있는 경우, 더 큰 지도와 입력칸이 보이는 위치로
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollTo({
                y: 350,
                animated: true,
              });
            }
          } else {
            // 그 외의 경우 맨 위로
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollTo({
                y: 0,
                animated: true,
              });
            }
          }
        }, 100);
      }
    });

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, [currentStep, hasCustomMarker]);

  // 편집 모드 초기화
  useEffect(() => {
    if (editingEvent?.location) {
      // 기존 장소가 한강공원인지 강변인지 판단
      const hanRiverPark = hanRiverParks.find(park => park.name === editingEvent.location);
      const riverSide = riverSides.find(river => river.name === editingEvent.location);
      
      if (hanRiverPark) {
        setSelectedLocationType('hanriver');
        setSelectedLocation(hanRiverPark.id);
      } else if (riverSide) {
        setSelectedLocationType('riverside');
        setSelectedLocation(riverSide.id);
      }
    }
  }, [editingEvent]);

  // 커스텀 마커 상태 변경 감지
  useEffect(() => {

    
    // 상세 위치 입력칸이 나타나면 자동으로 스크롤
    if (hasCustomMarker && scrollViewRef.current) {
      setTimeout(() => {
        // 상세 위치 입력칸으로 부드럽게 스크롤 (적당한 위치로)
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            y: 650, // 더 큰 지도와 상세 위치 입력칸이 보이는 적당한 위치
            animated: true,
          });
  
        }
      }, 500); // 입력칸이 렌더링된 후 스크롤
    }
  }, [hasCustomMarker, customMarkerCoords]);

  const handleInputFocus = () => {
    // 키보드 이벤트에서 이미 스크롤 처리하므로 여기서는 별도 처리 없음
  };

  const handleInputBlur = () => {
    // 키보드 이벤트에서 이미 스크롤 처리하므로 여기서는 별도 처리 없음
  };

  const eventTypes = [
    { name: '모닝러닝', emoji: '🌅', popular: true },
    { name: '저녁러닝', emoji: '🌃', popular: true },
    { name: 'LSD', emoji: '🏃‍♀️', popular: false },
    { name: '인터벌 훈련', emoji: '⚡', popular: false },
    { name: '슬로우 조깅', emoji: '🐌', popular: false },
    { name: '소셜 러닝', emoji: '👥', popular: false },
  ];

  const difficulties = [
    { name: '초급', description: '편안한 페이스' },
    { name: '중급', description: '적당한 강도' },
    { name: '고급', description: '높은 강도' },
  ];

  // 한강공원 데이터 (가나다순 정렬)
  const hanRiverParks = [
    { id: 'gwangnaru', name: '광나루한강공원', lat: 37.5463, lng: 127.1205, distance: '2.7km', popular: false },
    { id: 'nanji', name: '난지한강공원', lat: 37.5664, lng: 126.8758, distance: '4.2km', popular: false },
    { id: 'ttukseom', name: '뚝섬한강공원', lat: 37.5292, lng: 127.069, distance: '4.8km', popular: true },
    { id: 'mangwon', name: '망원한강공원', lat: 37.5543, lng: 126.8964, distance: '5.4km', popular: false },
    { id: 'banpo', name: '반포한강공원', lat: 37.5110, lng: 126.9975, distance: '8.5km', popular: true },
    { id: 'ichon', name: '이촌한강공원', lat: 37.5175, lng: 126.9700, distance: '4.9km', popular: false },
    { id: 'jamwon', name: '잠원한강공원', lat: 37.5273, lng: 127.0188, distance: '3.8km', popular: false },
    { id: 'jamsil', name: '잠실한강공원', lat: 37.5176, lng: 127.0825, distance: '6.2km', popular: true },
    { id: 'yanghwa', name: '양화한강공원', lat: 37.5365, lng: 126.9039, distance: '2.1km', popular: false },
    { id: 'yeouido', name: '여의도한강공원', lat: 37.5263, lng: 126.9351, distance: '9.8km', popular: true },
  ];

  // 강변 데이터 (가나다순 정렬)
  const riverSides = [
    { id: 'danghyeon', name: '당현천', lat: 37.6497, lng: 127.0672, distance: '6.5km', description: '노원구 대표 생태하천', color: '#FF6B6B' },
    { id: 'dorim', name: '도림천', lat: 37.5076, lng: 126.8930, distance: '8.9km', description: '영등포구 도시하천', color: '#4ECDC4' },
    { id: 'bulgwang', name: '불광천', lat: 37.5900, lng: 126.9140, distance: '11.8km', description: '은평구 대표 하천', color: '#45B7D1' },
    { id: 'seongnae', name: '성내천', lat: 37.5234, lng: 127.1267, distance: '8.3km', description: '강동구 자연하천', color: '#96CEB4' },
    { id: 'anyang', name: '안양천', lat: 37.5200, lng: 126.8800, distance: '13.9km', description: '서남부 주요 하천', color: '#FFEAA7' },
    { id: 'yangjae', name: '양재천', lat: 37.4881, lng: 127.0581, distance: '15.6km', description: '강남구 생태하천', color: '#DDA0DD' },
    { id: 'jungnang', name: '중랑천', lat: 37.5947, lng: 127.0700, distance: '18.0km', description: '서울 동북부 주요 하천', color: '#74B9FF' },
    { id: 'jeongneung', name: '정릉천', lat: 37.5970, lng: 127.0410, distance: '4.2km', description: '북한산 기슭 자연천', color: '#A29BFE' },
    { id: 'cheonggyecheon', name: '청계천', lat: 37.5696, lng: 127.0150, distance: '5.8km', description: '도심 속 생태하천', color: '#FD79A8' },
    { id: 'tan', name: '탄천', lat: 37.5027, lng: 127.0718, distance: '8.3km', description: '서울 구간 생태복원 하천', color: '#FDCB6E' },
    { id: 'hongje', name: '홍제천', lat: 37.5680, lng: 126.9170, distance: '7.8km', description: '서대문구 도심하천', color: '#E17055' },
  ];

  // 강변 이미지 생성 함수 (임시 그라데이션)
  const getRiverImage = (riverColor) => {
    return {
      background: `linear-gradient(135deg, ${riverColor}40, ${riverColor}80)`,
      borderColor: riverColor,
    };
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return eventType && title.trim();
      case 2: return selectedLocation && location && dateString && timeString;
      case 3: return distance && minPace && maxPace && difficulty;
      case 4: return maxParticipants && parseInt(maxParticipants) >= 1 && parseInt(maxParticipants) <= 5; // 호스트 제외 최대 5명
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCreateEvent();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onClose();
    }
  };

  const handleCreateEvent = () => {

    const organizerName = user?.displayName || user?.email?.split('@')[0] || '나';
    
    const newEvent = {
      type: eventType,
      title: title.trim(),
      location: location.trim(),
      date: dateString,
      time: timeString,
      distance,
      pace: `${minPace} - ${maxPace}`,
      difficulty,
      isPublic,
      hashtags: hashtags.trim(),
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
      customMarkerCoords: customMarkerCoords, // 커스텀 마커 좌표 추가
      customLocation: customLocation.trim() || null, // 사용자가 입력한 상세 위치 설명
      organizer: organizerName, // 실제 사용자 정보를 호스트로 설정
    };

    onEventCreated(newEvent);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '날짜 선택';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return '오늘';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return '내일';
    } else {
      return `${date.getMonth() + 1}월 ${date.getDate()}일 (${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]})`;
    }
  };

  const handleDateChange = React.useCallback((event, selectedDate) => {
    if (selectedDate) {
      setDate(selectedDate);
      const dateStr = selectedDate.toISOString().split('T')[0];
      setDateString(dateStr);
    }
  }, []);

  const handleDatePickerConfirm = React.useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const handleDatePickerCancel = React.useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const handleTimeChange = React.useCallback((event, selectedTime) => {
    if (selectedTime) {
      setTime(selectedTime);
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes();
      const ampm = hours >= 12 ? '오후' : '오전';
      const displayHours = hours % 12 || 12;
      const formattedTime = `${ampm} ${displayHours}:${minutes.toString().padStart(2, '0')}`;
      setTimeString(formattedTime);
    }
  }, []);

  const handleTimePickerConfirm = React.useCallback(() => {
    setShowTimePicker(false);
  }, []);

  const handleTimePickerCancel = React.useCallback(() => {
    setShowTimePicker(false);
  }, []);

  const formatTime = (timeString) => {
    return timeString || '시간 선택';
  };

  const formatPaceInput = (value, previousValue) => {
    // 사용자가 삭제하고 있는지 확인 (이전 값보다 길이가 짧아졌는지)
    const isDeleting = previousValue && value.length < previousValue.length;
    
    // 삭제 중이면 포맷팅하지 않고 원본 반환
    if (isDeleting) {
      return value;
    }
    
    // 숫자만 추출
    const numbers = value.replace(/[^0-9]/g, '');
    
    if (numbers.length === 0) return '';
    
    // 이미 포맷팅된 형태라면 그대로 반환
    if (value.includes("'") && value.includes('"')) {
      return value;
    }
    
    // 3자리 또는 4자리 숫자인 경우에만 자동 포맷팅
    if (numbers.length === 3) {
      // 540 -> 5'40"
      const minutes = numbers.charAt(0);
      const seconds = numbers.slice(1);
      
      // 초가 59를 초과하면 59로 제한
      const secondsNum = parseInt(seconds);
      const validSeconds = secondsNum > 59 ? '59' : seconds.padStart(2, '0');
      
      return `${minutes}'${validSeconds}"`;
    } else if (numbers.length === 4) {
      // 1030 -> 10'30"
      const minutes = numbers.slice(0, 2);
      const seconds = numbers.slice(2);
      
      // 초가 59를 초과하면 59로 제한
      const secondsNum = parseInt(seconds);
      const validSeconds = secondsNum > 59 ? '59' : seconds.padStart(2, '0');
      
      return `${minutes}'${validSeconds}"`;
    }
    
    // 그 외의 경우는 원본 반환
    return value;
  };

  // 페이스를 초 단위로 변환하는 함수
  const paceToSeconds = (pace) => {
    if (!pace || !pace.includes("'") || !pace.includes('"')) return 0;
    
    const match = pace.match(/(\d+)'(\d+)"/);
    if (!match) return 0;
    
    const minutes = parseInt(match[1]);
    const seconds = parseInt(match[2]);
    return minutes * 60 + seconds;
  };

  // 페이스 유효성 검사 함수
  const validatePaces = (minPaceValue, maxPaceValue) => {
    if (!minPaceValue || !maxPaceValue) return true; // 둘 중 하나라도 비어있으면 검사하지 않음
    
    const minSeconds = paceToSeconds(minPaceValue);
    const maxSeconds = paceToSeconds(maxPaceValue);
    
    if (minSeconds > 0 && maxSeconds > 0 && minSeconds > maxSeconds) {
      Alert.alert(
        '페이스 입력 오류',
        '최대빠르기는 최소빠르기보다 빨라야 합니다.\n(더 작은 숫자가 더 빠른 페이스입니다)',
        [{ text: '확인' }]
      );
      return false;
    }
    return true;
  };

  const handleMinPaceChange = (value) => {
    const formatted = formatPaceInput(value, minPace);
    setMinPace(formatted);
    
    // 포맷팅이 완료된 경우에만 유효성 검사
    if (formatted.includes("'") && formatted.includes('"')) {
      validatePaces(formatted, maxPace);
    }
  };

  const handleMaxPaceChange = (value) => {
    const formatted = formatPaceInput(value, maxPace);
    setMaxPace(formatted);
    
    // 포맷팅이 완료된 경우에만 유효성 검사
    if (formatted.includes("'") && formatted.includes('"')) {
      validatePaces(minPace, formatted);
    }
  };

  // 커스텀 마커 변경 핸들러
  const handleCustomMarkerChange = (hasMarker, coords) => {
    setHasCustomMarker(hasMarker);
    setCustomMarkerCoords(coords);
  };

  // 장소 선택 렌더링 (인라인 드롭다운 방식)
  const renderLocationSelection = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>장소 선택</Text>
      
      {/* 1단계: 장소 유형 선택 */}
      <View style={styles.locationTypeContainer}>
        <TouchableOpacity
          style={[
            styles.locationTypeButton,
            selectedLocationType === 'hanriver' && styles.locationTypeButtonSelected,
          ]}
          onPress={() => {
            if (selectedLocationType === 'hanriver') {
              // 이미 선택된 경우 초기화
              setSelectedLocationType('');
              setSelectedLocation('');
              setLocation('');
              setSelectedLocationData(null);
              setShowLocationDropdown(false);
            } else {
              // 새로 선택
              setSelectedLocationType('hanriver');
              setSelectedLocation('');
              setLocation('');
              setSelectedLocationData(null);
              setShowLocationDropdown(false);
            }
          }}
        >
          <Text style={styles.locationTypeEmoji}>🌉</Text>
          <Text style={[
            styles.locationTypeText,
            selectedLocationType === 'hanriver' && styles.locationTypeTextSelected,
          ]}>한강공원</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.locationTypeButton,
            selectedLocationType === 'riverside' && styles.locationTypeButtonSelected,
          ]}
          onPress={() => {
            if (selectedLocationType === 'riverside') {
              // 이미 선택된 경우 초기화
              setSelectedLocationType('');
              setSelectedLocation('');
              setLocation('');
              setSelectedLocationData(null);
              setShowLocationDropdown(false);
            } else {
              // 새로 선택
              setSelectedLocationType('riverside');
              setSelectedLocation('');
              setLocation('');
              setSelectedLocationData(null);
              setShowLocationDropdown(false);
            }
          }}
        >
          <Text style={styles.locationTypeEmoji}>🏞️</Text>
          <Text style={[
            styles.locationTypeText,
            selectedLocationType === 'riverside' && styles.locationTypeTextSelected,
          ]}>강변</Text>
        </TouchableOpacity>
      </View>

      {/* 2단계: 구체적 장소 선택 드롭다운 */}
      {selectedLocationType && (
        <View style={styles.specificLocationContainer}>
          <Text style={styles.specificLocationLabel}>
            {selectedLocationType === 'hanriver' ? '한강공원 선택' : '강변 선택'}
          </Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowLocationDropdown(!showLocationDropdown)}
          >
            <Text style={[
              styles.dropdownButtonText,
              selectedLocationData ? styles.dropdownButtonTextSelected : null
            ]}>
              {selectedLocationData ? selectedLocationData.name : 
               `${selectedLocationType === 'hanriver' ? '한강공원을' : '강변을'} 선택해주세요`}
            </Text>
            <Ionicons 
              name={showLocationDropdown ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#666666" 
            />
          </TouchableOpacity>
          
          {/* 드롭다운 목록 */}
          {showLocationDropdown && (
            <View style={styles.dropdownList}>
              <ScrollView 
                style={styles.dropdownScrollView}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {(selectedLocationType === 'hanriver' ? hanRiverParks : riverSides).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.dropdownItem,
                      selectedLocation === item.id && styles.dropdownItemSelected
                    ]}
                    onPress={() => {
                      setSelectedLocation(item.id);
                      setLocation(item.name);
                      setSelectedLocationData(item);
                      setShowLocationDropdown(false);
                    }}
                  >
                    {item.popular && (
                      <View style={styles.popularBadgeSmall}>
                        <Text style={styles.popularBadgeSmallText}>인기</Text>
                      </View>
                    )}
                    <Text style={styles.dropdownItemText}>{item.name}</Text>
                    <Text style={styles.dropdownItemDistance}>{item.distance}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* 3단계: 선택된 장소 정보 및 지도 */}
      {selectedLocationData && (
        <View style={styles.selectedLocationSection}>
          <View style={styles.selectedLocationCard}>
            <View style={styles.selectedLocationInfo}>
              <Text style={styles.selectedLocationName}>{selectedLocationData.name}</Text>
              <Text style={styles.selectedLocationDescription}>
                {selectedLocationType === 'hanriver' ? '한강공원' : selectedLocationData.description}
              </Text>
              <Text style={styles.selectedLocationDistance}>코스 길이: {selectedLocationData.distance}</Text>
            </View>
            <TouchableOpacity
              style={styles.coursePhotoButton}
              onPress={() => {
                Alert.alert('코스 사진', '코스 사진 기능은 곧 업데이트 예정입니다.');
              }}
            >
              <Ionicons name="camera" size={18} color={COLORS.PRIMARY} />
              <Text style={styles.coursePhotoButtonText}>코스 사진</Text>
            </TouchableOpacity>
          </View>
          
          {/* 카카오맵 표시 - 상태 변경 격리 */}
          <React.Fragment>
          <InlineKakaoMapComponent 
            selectedLocation={selectedLocationData}
            locationType={selectedLocationType}
            onCustomMarkerChange={handleCustomMarkerChange}
            hasCustomMarker={hasCustomMarker}
            customMarkerCoords={customMarkerCoords}
          />
          </React.Fragment>
          
          {/* 상세 위치 입력칸 */}
          {hasCustomMarker && (
            <View style={[styles.customLocationInputGroup]}>
              <View style={styles.customLocationHeader}>
                <Ionicons name="location" size={16} color="#3AF8FF" />
                <Text style={styles.customLocationLabel}>상세 위치 설명</Text>
                <View style={styles.customMarkerIndicator}>
                  <Text style={styles.customMarkerIndicatorText}>📍 빨간 마커</Text>
                </View>
              </View>
              <TextInput
                ref={customLocationInputRef}
                style={styles.customLocationInput}
                value={customLocation}
                onChangeText={(text) => {
                  setCustomLocation(text);
                }}
                placeholder="예: 뚝섬한강공원 2번 출입구 근처"
                placeholderTextColor="#666666"
                returnKeyType="done"
                blurOnSubmit={true}
                multiline={true}
                numberOfLines={2}
                onFocus={() => {
                  // 키보드가 나타나면 자동으로 스크롤
                  if (scrollViewRef.current) {
                    setTimeout(() => {
                      // 상세 위치 입력칸이 키보드 위에 보이도록 스크롤
                      const scrollY = 450; // 더 큰 지도를 고려한 상세 위치 입력칸이 키보드 위에 잘 보이는 위치
                      if (scrollViewRef.current) {
                        scrollViewRef.current.scrollTo({
                          y: scrollY,
                          animated: true,
                        });
                      }
                    }, 300); // 키보드 애니메이션 후 스크롤
                  }
                }}
                onLayout={(event) => {
                  const layout = event.nativeEvent.layout;
                  setCustomLocationInputLayout(layout);
                }}
              />
              <Text style={styles.customLocationHint}>
                지도에 표시한 빨간 마커의 구체적인 위치를 설명해주세요
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleOutsideClick = () => {
      if (showLocationDropdown) {
        setShowLocationDropdown(false);
      }
    };
    
    // 키보드 이벤트 처리
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', handleOutsideClick);
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      // 키보드가 사라질 때 WebView가 다시 로드되는 것을 방지하기 위한 처리
      // 상태는 그대로 유지
    });
    
    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, [showLocationDropdown]);

  // 카카오맵 모달 렌더링
  const renderKakaoMapModal = () => (
    <Modal visible={showMapModal} transparent animationType="slide">
      <View style={styles.mapModalOverlay}>
        <View style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <TouchableOpacity onPress={() => setShowMapModal(false)}>
              <Text style={styles.mapModalCancelText}>닫기</Text>
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>
              {selectedLocationData?.name || '위치 확인'}
            </Text>
            <TouchableOpacity onPress={() => {
              // 카카오맵 검색으로 구체적 장소 설정 기능 (추후 구현)
              setShowMapModal(false);
            }}>
              <Text style={styles.mapModalConfirmText}>상세 설정</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.mapModalMapContainer}>
            <InlineKakaoMapComponent 
              selectedLocation={selectedLocationData}
              locationType={selectedLocationType}
              onCustomMarkerChange={handleCustomMarkerChange}
              hasCustomMarker={hasCustomMarker}
              customMarkerCoords={customMarkerCoords}
            />
          </View>
          <View style={styles.mapModalInfo}>
            {selectedLocationData && (
              <>
                <Text style={styles.mapModalLocationName}>{selectedLocationData.name}</Text>
                <Text style={styles.mapModalLocationDescription}>
                  {selectedLocationType === 'hanriver' ? '한강공원' : selectedLocationData.description}
                </Text>
                <Text style={styles.mapModalLocationDistance}>코스 길이: {selectedLocationData.distance}</Text>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );

  // 인라인 카카오맵 컴포넌트를 별도로 분리하여 격리
  const InlineKakaoMapComponent = React.memo(({ selectedLocation, locationType, onCustomMarkerChange, hasCustomMarker, customMarkerCoords }) => {
    // WebView 재렌더링 방지를 위한 안정적인 key 생성
    const stableKey = React.useMemo(() => {
      if (!selectedLocation) return 'no-location';
      return `${selectedLocation.id}-${selectedLocation.name}-${locationType}`;
    }, [selectedLocation?.id, selectedLocation?.name, locationType]);

    // 커스텀 마커 상태를 문자열로 변환하여 비교 최적화
    const customMarkerState = React.useMemo(() => {
      return JSON.stringify({ hasCustomMarker, customMarkerCoords });
    }, [hasCustomMarker, customMarkerCoords]);
    
    if (!selectedLocation) return null;

    // 선택된 장소의 카카오맵 HTML 생성
    const createInlineMapHTML = React.useCallback(() => {
      // 마커 색상 결정 (한강공원: 파란색, 강변: 노란색)
                      const markerColor = locationType === 'hanriver' ? '#3AF8FF' : '#FFD700';
      
      return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
            <title>${selectedLocation.name} 위치</title>
            <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=a4e8824702e29ee6141edab0149ae982"></script>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    background: #171719; 
                    overflow: hidden; 
                    height: 300px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                #map { 
                    width: 100%; 
                    height: 300px; 
                    border: none;
                }
                
                /* 카카오맵 기본 InfoWindow 완전히 숨기기 */
                div[style*="background"] {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                }
                
                /* 모든 InfoWindow 관련 기본 스타일 제거 */
                .infowindow,
                .info-window-container,
                [class*="infowindow"],
                [class*="InfoWindow"] {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                }
                
                /* 홈화면과 동일한 정보창 스타일 */
                .info-window {
                    background: #171719 !important;
                    color: #ffffff !important;
                    padding: 6px 10px !important;
                    border-radius: 4px !important;
                    border: 1px solid #333333 !important;
                    font-size: 11px !important;
                    font-weight: 500 !important;
                    white-space: nowrap !important;
                    text-align: center !important;
                    margin: 0 !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
                    display: inline-block !important;
                    margin-top: -5px !important;
                }
                
                .diagonal-info {
                    transform: translate(70px, 5px) !important;
                }
                
                /* 커스텀 마커 정보창 스타일 */
                .custom-info-window {
                    background: #171719 !important;
                    color: #3AF8FF !important;
                    padding: 6px 10px !important;
                    border-radius: 4px !important;
                    border: 1px solid #3AF8FF !important;
                    font-size: 11px !important;
                    font-weight: 600 !important;
                    white-space: nowrap !important;
                    text-align: center !important;
                    margin: 0 !important;
                    box-shadow: 0 2px 8px rgba(58, 248, 255, 0.3) !important;
                    display: inline-block !important;
                    margin-top: -5px !important;
                }
            </style>
        </head>
        <body>
            <div id="map"></div>
            
            <script>
                var map;
                var customMarker = null;
                var customInfoWindow = null;
                var currentMapCenter = null;
                var currentMapLevel = 4;
                
                function waitForKakaoSDK() {
                    if (typeof kakao === 'undefined' || typeof kakao.maps === 'undefined') {
                        setTimeout(waitForKakaoSDK, 100);
                        return;
                    }
                    initializeMap();
                }
                
                function initializeMap() {
                    try {
                        var mapContainer = document.getElementById('map');
                        
                        // 지도 중심 설정 (커스텀 마커가 있으면 그 위치 중심으로)
                        var mapCenter, mapLevel = 4;
                        var hasCustomMarker = ${customMarkerCoords ? 'true' : 'false'};
                        
                        if (hasCustomMarker) {
                            // 커스텀 마커가 있으면 그 위치를 중심으로
                            mapCenter = new kakao.maps.LatLng(${customMarkerCoords?.lat || selectedLocation.lat}, ${customMarkerCoords?.lng || selectedLocation.lng});
                        } else {
                            // 기본 장소를 중심으로
                            mapCenter = new kakao.maps.LatLng(${selectedLocation.lat}, ${selectedLocation.lng});
                        }
                        
                        var mapOption = {
                            center: mapCenter,
                            level: mapLevel,
                            disableDoubleClick: false,
                            disableDoubleClickZoom: false
                        };
                        
                        map = new kakao.maps.Map(mapContainer, mapOption);
                        map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
                        
                        // 현재 지도 상태 저장
                        currentMapCenter = map.getCenter();
                        currentMapLevel = map.getLevel();
                        
                        // 기본 장소 마커 위치
                        var markerPosition = new kakao.maps.LatLng(${selectedLocation.lat}, ${selectedLocation.lng});
                        
                        // 기본 마커 이미지 생성
                        var svgString = '<svg width="24" height="30" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">' +
                            '<path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 18 12 18s12-10.8 12-18c0-6.6-5.4-12-12-12z" fill="${markerColor}"/>' +
                            '<path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 18 12 18s12-10.8 12-18c0-6.6-5.4-12-12-12z" fill="none" stroke="#ffffff" stroke-width="2"/>' +
                            '<circle cx="12" cy="12" r="6" fill="#ffffff"/>' +
                            '<circle cx="12" cy="12" r="3" fill="${markerColor}"/>' +
                            '</svg>';
                        
                        var markerImageSrc = 'data:image/svg+xml;base64,' + btoa(svgString);
                        var markerImageSize = new kakao.maps.Size(24, 30);
                        var markerImageOffset = new kakao.maps.Point(12, 30);
                        
                        var markerImage = new kakao.maps.MarkerImage(
                            markerImageSrc,
                            markerImageSize,
                            { offset: markerImageOffset }
                        );
                        
                        // 기본 마커 생성
                        var marker = new kakao.maps.Marker({
                            position: markerPosition,
                            image: markerImage,
                            map: map
                        });
                        
                        // 기본 정보창 생성 (홈화면과 동일한 스타일)
                        var infoWindowContent = '<div class="info-window">${selectedLocation.name}</div>';
                        var infoWindow = new kakao.maps.InfoWindow({
                            content: infoWindowContent,
                            removable: false,
                            yAnchor: 1.0
                        });
                        
                        // 정보창 자동 표시
                        infoWindow.open(map, marker);
                        
                        // 기본 마커 클릭 이벤트
                        kakao.maps.event.addListener(marker, 'click', function() {
                            if (infoWindow.getMap()) {
                                infoWindow.close();
                            } else {
                                infoWindow.open(map, marker);
                            }
                        });
                        
                        // 커스텀 마커 이미지 생성 (빨간색)
                        var customSvgString = '<svg width="28" height="35" viewBox="0 0 28 35" xmlns="http://www.w3.org/2000/svg">' +
                            '<path d="M14 0C6.3 0 0 6.3 0 14c0 8.4 14 21 14 21s14-12.6 14-21c0-7.7-6.3-14-14-14z" fill="#FF4444"/>' +
                            '<path d="M14 0C6.3 0 0 6.3 0 14c0 8.4 14 21 14 21s14-12.6 14-21c0-7.7-6.3-14-14-14z" fill="none" stroke="#ffffff" stroke-width="2"/>' +
                            '<circle cx="14" cy="14" r="7" fill="#ffffff"/>' +
                            '<circle cx="14" cy="14" r="4" fill="#FF4444"/>' +
                            '</svg>';
                        
                        var customMarkerImageSrc = 'data:image/svg+xml;base64,' + btoa(customSvgString);
                        var customMarkerImageSize = new kakao.maps.Size(28, 35);
                        var customMarkerImageOffset = new kakao.maps.Point(14, 35);
                        
                        var customMarkerImage = new kakao.maps.MarkerImage(
                            customMarkerImageSrc,
                            customMarkerImageSize,
                            { offset: customMarkerImageOffset }
                        );
                        
                        // 지도 클릭 이벤트 (상세 위치 설정)
                        kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
                            var latlng = mouseEvent.latLng;
    
                            
                            // 기존 커스텀 마커 제거
                            if (customMarker) {
                                customMarker.setMap(null);
  
                            }
                            if (customInfoWindow) {
                                customInfoWindow.close();
                                
                            }
                            
                            // 새 커스텀 마커 생성
                            
                            customMarker = new kakao.maps.Marker({
                                position: latlng,
                                image: customMarkerImage,
                                map: map
                            });
                            
                            
                            // 커스텀 정보창 생성
                            var customInfoContent = '<div class="custom-info-window">상세 위치</div>';
                            customInfoWindow = new kakao.maps.InfoWindow({
                                content: customInfoContent,
                                removable: false,
                                yAnchor: 1.0
                            });
                            
                            // 커스텀 정보창 표시
                            customInfoWindow.open(map, customMarker);
                            
                            
                            // 커스텀 마커 클릭 이벤트
                            kakao.maps.event.addListener(customMarker, 'click', function() {
                                if (customInfoWindow.getMap()) {
                                    customInfoWindow.close();
                                } else {
                                    customInfoWindow.open(map, customMarker);
                                }
                            });
                            
                            // React Native에 커스텀 마커 정보 전송
                            if (window.ReactNativeWebView) {
                                var message = 'customMarkerAdded:' + latlng.getLat() + ',' + latlng.getLng();
                                window.ReactNativeWebView.postMessage(message);
                            }
                            
                            // 현재 지도 중심과 레벨 업데이트 (재렌더링 방지용)
                            currentMapCenter = map.getCenter();
                            currentMapLevel = map.getLevel();
                        });
                        
                        // 커스텀 마커 복원 (있는 경우)
                        if (hasCustomMarker) {
                            var customLat = ${customMarkerCoords?.lat || 'null'};
                            var customLng = ${customMarkerCoords?.lng || 'null'};
                            
                            if (customLat !== null && customLng !== null && !isNaN(customLat) && !isNaN(customLng)) {
                                var customPosition = new kakao.maps.LatLng(customLat, customLng);
                                
                                customMarker = new kakao.maps.Marker({
                                    position: customPosition,
                                    image: customMarkerImage,
                                    map: map
                                });
                                
                                var customInfoContent = '<div class="custom-info-window">상세 위치</div>';
                                customInfoWindow = new kakao.maps.InfoWindow({
                                    content: customInfoContent,
                                    removable: false,
                                    yAnchor: 1.0
                                });
                                
                                customInfoWindow.open(map, customMarker);
                                
                                kakao.maps.event.addListener(customMarker, 'click', function() {
                                    if (customInfoWindow.getMap()) {
                                        customInfoWindow.close();
                                    } else {
                                        customInfoWindow.open(map, customMarker);
                                    }
                                });
                            }
                        }
                        
                        // 로딩 완료 신호
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage('inlineMapLoaded');
                        }
                        
                    } catch (error) {
                        console.error('Inline map error:', error);
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage('inlineMapError: ' + error.message);
                        }
                    }
                }
                
                // SDK 로딩 대기
                waitForKakaoSDK();
            </script>
        </body>
        </html>
      `;
    }, [selectedLocation, locationType, customMarkerCoords]);

    // 메시지 처리 함수를 useCallback으로 최적화
    const handleWebViewMessage = React.useCallback((event) => {
              const { data } = event.nativeEvent;
              
              if (data === 'inlineMapLoaded') {
        // 지도 로딩 완료
              } else if (data.startsWith('inlineMapError')) {
        console.error('인라인 지도 로딩 실패:', data);
              } else if (data.startsWith('customMarkerAdded:')) {
                const coords = data.replace('customMarkerAdded:', '');
                const [lat, lng] = coords.split(',');
                
                // 중복 업데이트 방지
                const newCoords = {
                  lat: parseFloat(lat),
                  lng: parseFloat(lng)
                };
                
                if (!customMarkerCoords || 
                    customMarkerCoords.lat !== newCoords.lat || 
                    customMarkerCoords.lng !== newCoords.lng) {
                  // 부모 컴포넌트에 변경 알림
                  if (onCustomMarkerChange) {
                    onCustomMarkerChange(true, newCoords);
          }
        }
      }
    }, [selectedLocation.name, customMarkerCoords, onCustomMarkerChange]);

    return (
      <View style={styles.inlineMapSection}>
        <View style={styles.inlineMapContainer}>
          <WebView
            key={stableKey}
            source={{ html: createInlineMapHTML() }}
            style={styles.inlineMapWebView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={false}
            scrollEnabled={false}
            bounces={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            onMessage={handleWebViewMessage}
            // WebView 재렌더링 최적화 설정
            cacheEnabled={true}
            incognito={false}
            thirdPartyCookiesEnabled={false}
            sharedCookiesEnabled={false}
          />
        </View>
      </View>
    );
  }, (prevProps, nextProps) => {
    // 더 엄격한 비교 조건 설정
    const locationChanged = prevProps.selectedLocation?.id !== nextProps.selectedLocation?.id ||
                           prevProps.selectedLocation?.name !== nextProps.selectedLocation?.name;
    
    const locationTypeChanged = prevProps.locationType !== nextProps.locationType;
    
    const customMarkerChanged = prevProps.hasCustomMarker !== nextProps.hasCustomMarker ||
                               JSON.stringify(prevProps.customMarkerCoords) !== JSON.stringify(nextProps.customMarkerCoords);
    
    // 지도 관련 props가 변경되지 않았으면 재렌더링하지 않음
    const shouldNotRerender = !locationChanged && !locationTypeChanged && !customMarkerChanged;
    

    
    return shouldNotRerender;
  });

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>어떤 러닝을 계획하고 계신가요?</Text>
      <Text style={styles.stepSubtitle}>러닝 유형을 선택해주세요</Text>
      
      <View style={styles.eventTypesGrid}>
        {eventTypes.map((type) => (
          <TouchableOpacity
            key={type.name}
            style={[
              styles.eventTypeCard,
              eventType === type.name && styles.eventTypeCardSelected,
            ]}
            onPress={() => setEventType(type.name)}
          >
            {type.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>인기</Text>
              </View>
            )}
            <Text style={styles.eventTypeEmoji}>{type.emoji}</Text>
            <Text style={styles.eventTypeName}>{type.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.inputGroup, styles.titleInputGroup]}>
                      <Text style={styles.inputLabel}>모임 제목</Text>
        <TextInput
          ref={titleInputRef}
          style={styles.textInput}
          value={title}
          onChangeText={setTitle}
          placeholder="예: 한강 러닝"
          placeholderTextColor="#666666"
          returnKeyType="done"
          blurOnSubmit={true}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onLayout={(event) => {
            setInputLayout(event.nativeEvent.layout);
          }}
        />
        <Text style={styles.inputHint}>다른 사람들이 쉽게 찾을 수 있는 제목을 입력해주세요</Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>언제, 어디서 만날까요?</Text>
      <Text style={styles.stepSubtitle}>장소와 시간을 설정해주세요</Text>

      {renderLocationSelection()}

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>날짜</Text>
        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={() => setShowDatePicker(true)}
        >
          <View style={styles.dateTimeInfo}>
            <Text style={styles.dateText}>
              {formatDate(dateString)}
            </Text>
          </View>
          <Ionicons name="calendar" size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>시간</Text>
        <TouchableOpacity
          style={styles.timeSelectButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Text style={styles.timeSelectText}>{formatTime(timeString)}</Text>
          <Ionicons name="time" size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      {/* 날짜 선택기 */}
      {showDatePicker && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.datePickerModalOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={handleDatePickerCancel}>
                  <Text style={styles.datePickerCancelText}>취소</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>날짜 선택</Text>
                <TouchableOpacity onPress={handleDatePickerConfirm}>
                  <Text style={styles.datePickerConfirmText}>확인</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={new Date()}
                textColor="#ffffff"
                style={styles.dateTimePicker}
                locale="ko-KR"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* 시간 선택 모달 */}
      {showTimePicker && (
        <Modal visible={showTimePicker} transparent animationType="slide">
          <View style={styles.datePickerModalOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={handleTimePickerCancel}>
                  <Text style={styles.datePickerCancelText}>취소</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>시간 선택</Text>
                <TouchableOpacity onPress={handleTimePickerConfirm}>
                  <Text style={styles.datePickerConfirmText}>확인</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={time}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                textColor="#ffffff"
                style={styles.dateTimePicker}
                locale="ko-KR"
                minuteInterval={15}
              />
            </View>
          </View>
        </Modal>
      )}



      {/* 카카오맵 모달 */}
      {showMapModal && renderKakaoMapModal()}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>러닝 세부사항을 설정해주세요</Text>
      <Text style={styles.stepSubtitle}>거리, 페이스, 난이도를 입력해주세요</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>거리 (km)</Text>
        <TextInput
          style={styles.textInput}
          value={distance}
          onChangeText={setDistance}
          placeholder="예: 5"
          placeholderTextColor="#666666"
          keyboardType="numeric"
          returnKeyType="done"
          blurOnSubmit={true}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>페이스</Text>
        <View style={styles.paceRangeContainer}>
          <View style={styles.paceInputContainer}>
            <Text style={styles.paceLabel}>최대빠르기</Text>
            <TextInput
              style={styles.paceInput}
              value={minPace}
              onChangeText={handleMinPaceChange}
              placeholder="5'30&quot;"
              placeholderTextColor="#666666"
              keyboardType="numeric"
              returnKeyType="done"
              blurOnSubmit={true}
            />
          </View>
          <View style={styles.paceSeparator}>
            <Text style={styles.paceSeparatorText}>-</Text>
          </View>
          <View style={styles.paceInputContainer}>
            <Text style={styles.paceLabel}>최소빠르기</Text>
            <TextInput
              style={styles.paceInput}
              value={maxPace}
              onChangeText={handleMaxPaceChange}
              placeholder="6'30&quot;"
              placeholderTextColor="#666666"
              keyboardType="numeric"
              returnKeyType="done"
              blurOnSubmit={true}
            />
          </View>
        </View>
        <Text style={styles.paceHint}>분'초&quot;/km 형식으로 입력해주세요</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>난이도</Text>
        <View style={styles.difficultyGrid}>
          {difficulties.map((diff) => (
            <TouchableOpacity
              key={diff.name}
              style={[
                styles.difficultyCard,
                difficulty === diff.name && styles.difficultyCardSelected,
              ]}
              onPress={() => setDifficulty(diff.name)}
            >
              <Text style={styles.difficultyName}>{diff.name}</Text>
              <Text style={styles.difficultyDescription}>{diff.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  // 해시태그 자동 변환 함수
  const convertToHashtags = (text) => {
    if (!text.trim()) return '';
    
    // 이미 #으로 시작하는 경우 그대로 반환
    if (text.trim().startsWith('#')) {
      return text;
    }
    
    // 공백으로 구분된 단어들을 해시태그로 변환
    return text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => `#${word}`)
      .join(' ');
  };

  // 해시태그 입력 처리
  const handleHashtagChange = (text) => {
    setHashtags(text);
  };

  // 해시태그 입력 완료 시 자동 변환
  const handleHashtagBlur = () => {
    const convertedHashtags = convertToHashtags(hashtags);
    setHashtags(convertedHashtags);
  };

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>추가사항</Text>
      <Text style={styles.stepSubtitle}>해시태그와 참여 인원을 설정해주세요</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>최대 참여 인원</Text>
        <TextInput
          style={styles.textInput}
          value={maxParticipants}
          onChangeText={(text) => {
            // 숫자만 입력 허용하고 5 이하로 제한
            const numericValue = text.replace(/[^0-9]/g, '');
            if (numericValue === '' || (parseInt(numericValue) >= 1 && parseInt(numericValue) <= 5)) {
              setMaxParticipants(numericValue);
            }
          }}
          placeholder="예: 3 (최대 5명)"
          placeholderTextColor="#666666"
          keyboardType="numeric"
          returnKeyType="done"
          blurOnSubmit={true}
        />
        <Text style={[styles.inputHint, { fontSize: 15 }]}>
          참여할 수 있는 최대 인원수를 설정해주세요.{'\n'}최대 5명까지 설정할 수 있습니다. (호스트 포함 6명)
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>해시태그</Text>
        <TextInput
          style={styles.textInput}
          value={hashtags}
          onChangeText={handleHashtagChange}
          onBlur={handleHashtagBlur}
          placeholder="러닝 초보 환영 (자동으로 #러닝 #초보 #환영으로 변환됩니다)"
          placeholderTextColor="#666666"
          returnKeyType="done"
          blurOnSubmit={true}
        />
        <Text style={[styles.inputHint, { fontSize: 15 }]}>
          단어를 입력하면 자동으로 해시태그로 변환됩니다.{'\n'}(예: 러닝 초보 → #러닝 #초보)
        </Text>
      </View>



      {/* 모임 생성 주의사항 */}
      <View style={styles.noticeSection}>
        <Text style={styles.noticeTitle}>💡 모임 생성 주의사항</Text>
        <View style={styles.noticeItem}>
          <Ionicons name="alert-circle" size={16} color="#FF9800" />
          <Text style={styles.noticeText}>모임 시작 2시간 전까지 수정 및 취소가 가능합니다</Text>
        </View>
        <View style={styles.noticeItem}>
          <Ionicons name="alert-circle" size={16} color="#FF9800" />
          <Text style={styles.noticeText}>참여자가 있는 모임은 함부로 취소하지 마세요</Text>
        </View>
        <View style={styles.noticeItem}>
          <Ionicons name="alert-circle" size={16} color="#FF9800" />
          <Text style={styles.noticeText}>안전을 위해 반드시 적절한 장비를 착용해 주세요</Text>
        </View>
      </View>
    </View>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step, index) => (
        <View key={step} style={styles.stepRow}>
          <View style={[
            styles.stepCircle,
            step <= currentStep ? styles.stepCircleActive : styles.stepCircleInactive
          ]}>
            <Text style={{
              color: step <= currentStep ? '#000000' : '#666666',
              fontWeight: 'bold'
            }}>
              {step}
            </Text>
          </View>
          {index < 3 && (
            <View style={[
              styles.stepLine,
              step < currentStep ? styles.stepLineActive : styles.stepLineInactive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const getCurrentStepContent = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  return (
    <View style={styles.flowContainer}>
      <View style={styles.flowHeader}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.flowTitle}>
          {editingEvent ? '모임 수정' : '새 모임 만들기'}
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.flowContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContentContainer,
          { paddingBottom: keyboardVisible ? 210 : 80 }
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        {renderStepIndicator()}
        {getCurrentStepContent()}
      </ScrollView>

      <View style={styles.fixedBottomNav}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
        >
          <Text style={styles.backButtonText}>
            {currentStep === 1 ? '취소' : '이전'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed() && styles.nextButtonDisabled,
            currentStep === 4 && styles.nextButtonFull,
          ]}
          onPress={handleNext}
          disabled={!canProceed()}
        >
          <Text style={[
            styles.nextButtonText,
            !canProceed() && styles.nextButtonTextDisabled,
          ]}>
            {currentStep === 4 ? (editingEvent ? '수정 완료' : '모임 생성') : '다음'}
          </Text>
          {currentStep < 4 && (
            <Ionicons name="arrow-forward" size={20} color={canProceed() ? "#000000" : "#666666"} />
          )}
        </TouchableOpacity>
      </View>
    </View>
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.SECONDARY,
    textAlign: 'center',
    marginBottom: 32,
  },
  createButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  eventsList: {
    paddingVertical: 20,
    gap: 16,
  },
  eventCard: {
    backgroundColor: COLORS.CARD,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  locationDateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  infoText: {
    fontSize: 15,
    color: '#ffffff',
    marginLeft: 8,
    flexShrink: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#1F1F24',
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'stretch',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerContainer: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#333333',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
    textAlign: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 13,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6B7280', // 회색톤
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  organizerAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  organizerName: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  participantInfo: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleWithDifficulty: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButton: {
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // 헤더 섹션 (러닝 제목과 난이도)
  eventHeaderSection: {
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    position: 'relative',
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    marginRight: 80, // 액션 버튼 공간 확보
    gap: 10,
  },
  eventEmoji: {
    fontSize: 30,
    marginTop: 2,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.TEXT,
    flex: 1,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  eventTitleContainer: {
    flex: 1,
  },
  organizerText: {
    fontSize: 13,
    color: '#999999',
    marginTop: 4,
    fontWeight: '500',
  },
  
  // 난이도 배지 (헤더용)
  difficultyBadgeHeader: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  difficultyTextHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  

  
  eventActions: {
    flexDirection: 'row',
    gap: 8,
    position: 'absolute',
    top: 10,
    right: 16,
  },
  actionButton: {
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // 구분선
  eventDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: -16,
    marginTop: 8,
  },
  
  // 상세 정보 섹션
  eventDetailsSection: {
    padding: 16,
    paddingTop: 12,
    gap: 16,
  },
  eventDetailItem: {
    marginBottom: 4,
  },
  eventDetailItemWithRecruitment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventDetailLabel: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    width: 50,
    textAlign: 'left',
    marginBottom: 2,
  },
  eventDetailText: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
    lineHeight: 22,
  },
  
  // 모집 현황 스타일
  recruitmentStatusContainer: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  recruitmentStatusText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E6C200',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // 하단 배지 섹션
  eventFooter: {
    padding: 16,
    paddingTop: 8,
  },
  eventBadges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  hashtagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.PRIMARY + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY + '40',
  },
  hashtagText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.PRIMARY,
  },
  publicBadge: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.PRIMARY + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY + '40',
  },
  publicText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  addMoreButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginLeft: 8,
  },
  // Flow styles
  flowContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 5,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,

  },
  headerButton: {
    padding: 8,
  },
  flowTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  flowContent: {
    flex: 1,
  },
      scrollContentContainer: {
      paddingTop: 20,
      paddingHorizontal: 20,
      flexGrow: 1,
    },
  bottomNav: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    gap: 12,
    backgroundColor: COLORS.BACKGROUND,
  },
  fixedBottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 16 : 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    gap: 12,
    backgroundColor: COLORS.BACKGROUND,
  },
  backButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#666666',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#cccccc',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#333333',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  nextButtonTextDisabled: {
    color: '#666666',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  stepCircleInactive: {
    backgroundColor: 'transparent',
    borderColor: '#666666',
  },
  stepLine: {
    width: 48,
    height: 2,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  stepLineInactive: {
    backgroundColor: '#666666',
  },
  stepContent: {
    gap: 24,
    paddingBottom: 0,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  eventTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  eventTypeCard: {
    backgroundColor: COLORS.SURFACE,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '47%',
    position: 'relative',
    gap: 8,
  },
  eventTypeCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '20',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  eventTypeEmoji: {
    fontSize: 32,
  },
  eventTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    textAlign: 'center',
  },
  inputGroup: {
    gap: 8,
    marginBottom: 4,
  },
  titleInputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  textInput: {
    backgroundColor: COLORS.SURFACE,
    padding: 12,
    borderRadius: 8,
    color: COLORS.TEXT,
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: 48,
    fontSize: 16,
  },
  inputHint: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    marginTop: 6,
    paddingBottom: 4,
  },
  paceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paceInputContainer: {
    flex: 1,
    gap: 4,
  },
  paceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
  paceInput: {
    backgroundColor: COLORS.SURFACE,
    padding: 12,
    borderRadius: 8,
    color: COLORS.TEXT,
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: 48,
    fontSize: 16,
    textAlign: 'center',
  },
  paceSeparator: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  paceSeparatorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666666',
  },
  paceHint: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    marginTop: 6,
    textAlign: 'center',
  },
  difficultyGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  difficultyCard: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333333',
    alignItems: 'center',
  },
  difficultyCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '20',
  },
  difficultyName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  difficultyDescription: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  dateTimeButton: {
    backgroundColor: COLORS.SURFACE,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTimeInfo: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  timeSelectButton: {
    backgroundColor: COLORS.SURFACE,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeSelectText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },


  dateTimePickerContainer: {
    backgroundColor: COLORS.SURFACE,
    margin: 20,
    borderRadius: 12,
    padding: 20,
    width: '90%',
  },
  datePickerContainer: {
    backgroundColor: COLORS.SURFACE,
    margin: 20,
    borderRadius: 12,
    padding: 0,
    width: '90%',
    overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  datePickerCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  datePickerConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  dateTimePicker: {
    backgroundColor: COLORS.SURFACE,
    height: 200,
  },
  dateTimeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  cancelButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#666666',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  confirmButton: {
    padding: 12,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  shareOption: {
    backgroundColor: COLORS.SURFACE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareOptionSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '20',
  },
  shareOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  shareOptionText: {
    flex: 1,
  },
  shareOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  shareOptionDescription: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  
  // 주의사항 섹션 스타일
  noticeSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#333333' + '30',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 12,
  },
  noticeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  noticeText: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
    flex: 1,
  },
  
  // 장소 선택 관련 스타일
  locationTypeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  locationTypeCard: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333333',
    alignItems: 'center',
  },
  locationTypeCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '20',
  },
  locationTypeEmoji: {
    fontSize: 32,
  },
  locationTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  locationTypeDescription: {
    fontSize: 12,
    color: '#666666',
  },
  
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  locationCard: {
    backgroundColor: COLORS.SURFACE,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333333',
    alignItems: 'center',
    width: '47%',
    position: 'relative',
  },
  locationCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '20',
  },
  locationEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT,
    textAlign: 'center',
    marginBottom: 4,
  },
  locationDistance: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.PRIMARY + '20',
    borderRadius: 6,
  },
  mapButtonText: {
    fontSize: 11,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  
  // 강변 카드 스타일
  riverCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333333',
    marginBottom: 12,
    overflow: 'hidden',
  },
  riverCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '10',
  },
  riverImageArea: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  riverImagePlaceholder: {
    fontSize: 24,
    marginBottom: 4,
  },
  riverImageText: {
    fontSize: 12,
    color: '#666666',
  },
  riverInfo: {
    padding: 12,
  },
  riverName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  riverDescription: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  riverDistance: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  
  // 카카오맵 모달 스타일
  mapModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapModalContainer: {
    backgroundColor: COLORS.SURFACE,
    margin: 20,
    borderRadius: 12,
    width: '90%',
    height: '70%',
    overflow: 'hidden',
  },
  mapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  mapModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  mapModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  mapModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  mapPlaceholder: {
    fontSize: 64,
    marginBottom: 16,
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // 선택된 장소 표시 스타일
  selectedLocationDisplay: {
    backgroundColor: COLORS.SURFACE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedLocationEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  selectedLocationText: {
    flex: 1,
  },
  selectedLocationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 2,
  },
  selectedLocationDescription: {
    fontSize: 12,
    color: '#666666',
  },
  
  // 장소 선택 모달 스타일
  locationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  locationModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  locationModalContainer: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  locationModalHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  locationModalHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#666666',
    borderRadius: 2,
  },
  locationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  locationModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  locationModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  locationModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  locationModalConfirmTextDisabled: {
    color: '#666666',
  },
  locationModalContent: {
    flex: 1,
  },
  locationModalScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  
  // 카카오맵 모달 업데이트
  mapModalMapContainer: {
    flex: 1,
    backgroundColor: COLORS.CARD,
  },
  mapModalInfo: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  mapModalLocationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  mapModalLocationDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  mapModalLocationDistance: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  
  // 카카오맵 WebView 스타일
  kakaoMapContainer: {
    flex: 1,
    backgroundColor: COLORS.CARD,
  },
  kakaoMapWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  
  // 새로운 인라인 장소 선택 스타일
  locationTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  locationTypeButton: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333333',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  locationTypeButtonSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '20',
  },
  locationTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  locationTypeTextSelected: {
    color: COLORS.PRIMARY,
  },
  
  // 구체적 장소 선택 스타일
  specificLocationContainer: {
    marginBottom: 16,
  },
  specificLocationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  dropdownButton: {
    backgroundColor: COLORS.SURFACE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#666666',
    flex: 1,
  },
  dropdownButtonTextSelected: {
    color: COLORS.TEXT,
    fontWeight: '500',
  },
  
  // 드롭다운 목록 스타일
  dropdownList: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    marginTop: 8,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownItemSelected: {
    backgroundColor: COLORS.PRIMARY + '20',
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT,
    flex: 1,
  },
  dropdownItemDistance: {
    fontSize: 12,
    color: '#666666',
  },
  popularBadgeSmall: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  popularBadgeSmallText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  
  // 선택된 장소 섹션 스타일
  selectedLocationSection: {
    marginTop: 8,
  },
  selectedLocationCard: {
    backgroundColor: COLORS.SURFACE,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  selectedLocationDistance: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  coursePhotoButton: {
    backgroundColor: COLORS.PRIMARY + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coursePhotoButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  
  // 인라인 카카오맵 스타일
  inlineMapSection: {
    marginTop: 8,
  },
  inlineMapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: COLORS.CARD,
  },
  inlineMapWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  
  // 상세 위치 입력 스타일
  customLocationInputContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3AF8FF',
  },
  customLocationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    marginBottom: 8,
  },
  customLocationInput: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    fontSize: 16,
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  customLocationHint: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
  },
  
  // 개선된 상세 위치 입력 스타일
  customLocationInputGroup: {
    backgroundColor: '#3AF8FF' + '10',
    borderWidth: 1,
    borderColor: '#3AF8FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  customLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  customLocationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3AF8FF',
    marginLeft: 8,
    flex: 1,
  },
  customMarkerIndicator: {
    backgroundColor: '#FF0000' + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF0000',
  },
  customMarkerIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF0000',
  },
  customLocationInput: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.TEXT,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  customLocationHint: {
    fontSize: 12,
    color: '#3AF8FF',
    marginTop: 8,
    lineHeight: 16,
    fontStyle: 'italic',
  },

  // 메인 옵션 카드 스타일
  mainOptionCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 104,
  },
  optionIconContainer: {
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#999999',
    lineHeight: 20,
    marginBottom: 8,
  },
  optionBadge: {
    backgroundColor: COLORS.PRIMARY + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  optionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },

  // 헤더 섹션 스타일
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
    lineHeight: 15,
  },

  // 헤더 스타일
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 2,
    backgroundColor: COLORS.BACKGROUND,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.TEXT,
    flex: 1,
    textAlign: 'center',
  },
  headerBackButton: {
    padding: 16,
    marginRight: 8,
    marginTop: 8,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  headerRight: {
    width: 40, // 헤더 균형을 위한 빈 공간
  },

  // 정보 섹션 스타일
  infoSection: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },

  // 업데이트된 이벤트 카드 스타일
  eventTitleContainer: {
    flex: 1,
  },
  organizerText: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  creatorBadge: {
    backgroundColor: '#FFD700' + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700' + '40',
  },
  creatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD700',
  },
  joinedBadge: {
    backgroundColor: '#4CAF50' + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50' + '40',
  },
  joinedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4CAF50',
  },
  endedBadge: {
    backgroundColor: '#FF6B35' + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#FF6B35' + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endedBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF6B35',
  },

  // 액션 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  // 날짜/시간 선택 모달 오버레이
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModalContainer: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    minWidth: 200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  actionModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  actionModalDivider: {
    height: 1,
    backgroundColor: '#333333',
    marginHorizontal: 20,
  },
});

export default ScheduleScreen; 