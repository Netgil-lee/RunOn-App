import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#181818',
  CARD: '#171719',
};

const ScheduleCard = ({ event, onJoinPress, onPress, showJoinButton = true, hasNotification = false }) => {
  // 디버깅을 위한 로그
  console.log('🔍 Community ScheduleCard - 모임 데이터:', {
    organizer: event.organizer,
    organizerImage: event.organizerImage,
    participants: event.participants,
    participantsType: typeof event.participants,
    isArray: Array.isArray(event.participants),
    participantsLength: Array.isArray(event.participants) ? event.participants.length : 'N/A',
    maxParticipants: event.maxParticipants,
    showJoinButton,
    hasNotification
  });
  
  // 참여자수 계산 결과 로그
  const participantCount = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1);
  const maxParticipantText = event.maxParticipants ? ` / ${event.maxParticipants}명` : '';
  const finalParticipantText = `참여자 ${participantCount}명${maxParticipantText}`;
  
  console.log('🔍 참여자수 계산 결과:', {
    participantCount,
    maxParticipantText,
    finalParticipantText
  });

  // 연도를 제거하고 요일을 추가하는 함수
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

    }
    
    // 파싱 실패 시 연도만 제거하여 반환
    return dateString.replace(/^\d{4}년\s*/, '');
  };

  // 해시태그 파싱 함수
  const parseHashtags = (hashtagString) => {
    if (!hashtagString || !hashtagString.trim()) return [];
    
    return hashtagString
      .split(/\s+/)
      .filter(tag => tag.startsWith('#') && tag.length > 1)
      .map(tag => tag.replace(/[^#\w가-힣]/g, ''))
      .slice(0, 5); // 최대 5개까지만 표시
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress && onPress(event)}
      activeOpacity={0.8}
    >
      {/* 제목과 알림표시 */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>{event.title}</Text>
        {hasNotification && (
          <View style={styles.notificationBadge} />
        )}
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
          {parseHashtags(event.hashtags).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 하단 정보 */}
      <View style={styles.footer}>
        <View style={styles.organizerInfo}>
          <View style={styles.organizerAvatar}>
            {event.organizerImage && !event.organizerImage.startsWith('file://') ? (
              <Image 
                source={{ uri: event.organizerImage }} 
                style={styles.organizerAvatarImage}
              />
            ) : (
              <Ionicons name="person" size={14} color="#ffffff" />
            )}
          </View>
          <Text style={styles.organizerName}>{event.organizer || '익명'}</Text>
        </View>

        <View style={styles.rightSection}>
          {console.log('🔍 ScheduleCard - rightSection 렌더링 시작')}
          {console.log('🔍 ScheduleCard - 참여자수 렌더링:', {
            participants: event.participants,
            participantsLength: Array.isArray(event.participants) ? event.participants.length : (event.participants || 1),
            maxParticipants: event.maxParticipants,
            showJoinButton,
            finalParticipantText
          })}
                   <Text style={[styles.participantInfo, { color: '#ffffff', fontSize: 15 }]}>
           {finalParticipantText}
         </Text>
          {console.log('🔍 ScheduleCard - 참여자수 텍스트 렌더링 완료')}
          {showJoinButton && (
            <TouchableOpacity 
              style={styles.joinButton} 
              onPress={() => onJoinPress(event)}
            >
              <Text style={styles.joinButtonText}>참여하기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.CARD,
    marginHorizontal: 0,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  notificationBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0022',
    marginLeft: 8,
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
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  dividerContainer: {
    width: 10, // 중간 공간 너비
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#333333',
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
    flex: 1, // 왼쪽 공간 차지
  },
  organizerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6B7280', // 회색톤
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  organizerAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    minWidth: 80, // 최소 너비 설정
    justifyContent: 'flex-end', // 오른쪽 정렬
  },
  participantInfo: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
  },
  joinButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
});

export default ScheduleCard; 