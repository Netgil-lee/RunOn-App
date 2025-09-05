import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  SECONDARY: '#666666',
};

const MeetingCard = ({ meeting, onClose, onJoin }) => {
  if (!meeting) return null;

  // 디버깅을 위한 로그
  console.log('🔍 MeetingCard - 모임 데이터:', {
    organizer: meeting.organizer,
    organizerImage: meeting.organizerImage,
    organizerLevel: meeting.organizerLevel
  });

  // 연도를 제거하고 요일을 추가하는 함수 (ScheduleCard와 동일)
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
      // 파싱 실패 시 무시
    }
    
    // 파싱 실패 시 연도만 제거하여 반환
    return dateString.replace(/^\d{4}년\s*/, '');
  };

  // 해시태그 파싱 함수 (ScheduleCard와 동일)
  const parseHashtags = (hashtagString) => {
    if (!hashtagString || !hashtagString.trim()) return [];
    
    return hashtagString
      .split(/\s+/)
      .filter(tag => tag.startsWith('#') && tag.length > 1)
      .map(tag => tag.replace(/[^#\w가-힣]/g, ''))
      .slice(0, 5); // 최대 5개까지만 표시
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="location" size={16} color={COLORS.PRIMARY} />
          <Text style={styles.locationName}>{meeting.location}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={COLORS.SECONDARY} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* 제목 */}
        <Text style={styles.title}>{meeting.title}</Text>
        
        {/* 설명 */}
        <Text style={styles.description}>{meeting.description}</Text>
        
        {/* 위치와 날짜/시간을 한 줄로 배치 (ScheduleCard 스타일) */}
        <View style={styles.locationDateTimeRow}>
          {/* 날짜/시간 */}
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.infoText}>
              {formatDateWithoutYear(meeting.date)} {meeting.time}
            </Text>
          </View>
        </View>

        {/* 거리/페이스 통계 (ScheduleCard 스타일) */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{meeting.distance}km</Text>
          </View>
          <View style={styles.dividerContainer}>
            <View style={styles.statDivider} />
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{meeting.pace}</Text>
          </View>
        </View>

        {/* 해시태그 (ScheduleCard 스타일) */}
        {meeting.hashtags && parseHashtags(meeting.hashtags).length > 0 && (
          <View style={styles.tagsContainer}>
            {parseHashtags(meeting.hashtags).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 하단 정보 (ScheduleCard 스타일) */}
        <View style={styles.footer}>
          <View style={styles.organizerInfo}>
            <View style={styles.organizerAvatar}>
              {meeting.organizerImage && !meeting.organizerImage.startsWith('file://') ? (
                <Image 
                  source={{ uri: meeting.organizerImage }} 
                  style={styles.organizerAvatarImage}
                  onError={(error) => console.error('❌ 프로필 이미지 로드 실패:', error)}
                  onLoad={() => console.log('✅ 프로필 이미지 로드 성공:', meeting.organizerImage)}
                />
              ) : (
                <Ionicons name="person" size={14} color="#ffffff" />
              )}
            </View>
            <View style={styles.organizerDetails}>
              <Text style={styles.organizerName}>
                {meeting.organizer || '익명'}
              </Text>
              <Text style={styles.organizerLevel}>
                {meeting.organizerLevel || '러너'}
              </Text>
            </View>
          </View>

          <View style={styles.rightSection}>
            <Text style={[styles.participantInfo, { color: '#ffffff' }]}>
              {(() => {
                const participantCount = Array.isArray(meeting.participants) ? meeting.participants.length : (meeting.participants || 1);
                const maxParticipantText = meeting.maxParticipants ? `/${meeting.maxParticipants}` : '';
                const finalParticipantText = `참여자 ${participantCount}${maxParticipantText}`;
                return finalParticipantText;
              })()}
            </Text>
            <TouchableOpacity
              style={[
                styles.joinButton, 
                { backgroundColor: meeting.canJoin ? COLORS.PRIMARY : COLORS.SECONDARY }
              ]}
              onPress={onJoin}
              disabled={!meeting.canJoin}
            >
              <Text style={[
                styles.joinButtonText,
                { color: meeting.canJoin ? COLORS.BACKGROUND : COLORS.TEXT }
              ]}>
                {meeting.canJoin ? '참여하기' : '참여 마감'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.CARD,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.SURFACE,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    marginLeft: 6,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    lineHeight: 20,
    marginBottom: 16,
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
    color: COLORS.TEXT,
    marginLeft: 8,
    flexShrink: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: COLORS.SURFACE,
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
    color: COLORS.TEXT,
    marginBottom: 2,
    textAlign: 'center',
  },
  dividerContainer: {
    width: 10,
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
  },
  organizerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6B7280',
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
  organizerDetails: {
    flex: 1,
  },
  organizerName: {
    fontSize: 15,
    color: COLORS.TEXT,
    fontWeight: '500',
  },
  organizerLevel: {
    fontSize: 12,
    color: COLORS.SECONDARY,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  participantInfo: {
    fontSize: 13,
    color: COLORS.TEXT,
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
    color: COLORS.BACKGROUND,
  },
});

export default MeetingCard; 