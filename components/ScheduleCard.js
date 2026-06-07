import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const ScheduleCard = ({ event, onJoinPress, onPress, showJoinButton = true, hasNotification = false, id, onMenuPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const participantCount = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1);
  const maxParticipantText = event.maxParticipants ? ` / ${event.maxParticipants}명` : '';
  const finalParticipantText = `참여자 ${participantCount}명${maxParticipantText}`;

  const isFull = (() => {
    const max = Number(event.maxParticipants);
    return Number.isFinite(max) && max > 0 && participantCount >= max;
  })();

  const formatDateWithoutYear = (dateString) => {
    if (!dateString) return '';
    if (dateString.includes('(') && dateString.includes(')')) return dateString;
    try {
      let date;
      if (dateString.includes('년')) {
        const cleaned = dateString.replace(/^\d{4}년\s*/, '');
        const match = cleaned.match(/(\d{1,2})월\s*(\d{1,2})일/);
        if (match) date = new Date(new Date().getFullYear(), parseInt(match[1]) - 1, parseInt(match[2]));
      } else {
        date = new Date(dateString);
      }
      if (date && !isNaN(date.getTime())) {
        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
        return `${date.getMonth() + 1}월 ${date.getDate()}일 (${dayOfWeek})`;
      }
    } catch {}
    return dateString.replace(/^\d{4}년\s*/, '');
  };

  const parseHashtags = (hashtagString) => {
    if (!hashtagString?.trim()) return [];
    return hashtagString.split(/\s+/).filter(t => t.startsWith('#') && t.length > 1)
      .map(t => t.replace(/[^#\w가-힣]/g, '')).slice(0, 5);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress?.(event)} activeOpacity={0.7}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{event.title}</Text>
        {hasNotification && <View style={styles.notificationBadge} />}
      </View>

      <View style={styles.locationDateTimeRow}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={15} color={colors.PRIMARY} />
          <Text style={styles.infoText}>{event.location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={15} color={colors.PRIMARY} />
          <Text style={styles.infoText}>
            {event.date ? formatDateWithoutYear(event.date) : '날짜 없음'} {event.time || ''}
          </Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{event.distance ? `${event.distance}km` : '5km'}</Text>
        </View>
        <View style={styles.statDividerWrap}>
          <View style={styles.statDivider} />
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{event.pace || '6:00-7:00'}</Text>
        </View>
      </View>

      {event.hashtags && parseHashtags(event.hashtags).length > 0 && (
        <View style={styles.tagsContainer}>
          {parseHashtags(event.hashtags).map((tag, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.organizerInfo}>
          <View style={styles.organizerAvatar}>
            {event.organizerImage && !event.organizerImage.startsWith('file://') ? (
              <Image source={{ uri: event.organizerImage }} style={styles.organizerAvatarImage} />
            ) : (
              <Ionicons name="person" size={14} color="#ffffff" />
            )}
          </View>
          <Text style={styles.organizerName}>{event.organizer}</Text>
        </View>
        <View style={styles.rightSection}>
          <Text style={styles.participantInfo}>{finalParticipantText}</Text>
          <View style={styles.buttonContainer}>
            {showJoinButton && (
              <TouchableOpacity
                style={[styles.joinButton, isFull && styles.disabledButton]}
                onPress={() => onJoinPress(event)}
                disabled={isFull}
              >
                <Text style={[styles.joinButtonText, isFull && styles.disabledButtonText]}>
                  {isFull ? '마감' : '참여하기'}
                </Text>
              </TouchableOpacity>
            )}
            {onMenuPress && (
              <TouchableOpacity style={styles.menuButton} onPress={() => onMenuPress(event)}>
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.TEXT_SECONDARY} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER,
    backgroundColor: colors.BACKGROUND,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 17, fontWeight: '600', color: colors.TEXT, flex: 1 },
  notificationBadge: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FF0022', marginLeft: 8,
  },
  locationDateTimeRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 12, gap: 12, flexWrap: 'wrap',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  infoText: { fontSize: 14, color: colors.TEXT_SECONDARY, marginLeft: 6, flexShrink: 1 },
  statsContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, backgroundColor: colors.SURFACE,
    borderRadius: 8, marginBottom: 12, alignSelf: 'stretch',
  },
  statItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 15, fontWeight: '600', color: colors.TEXT, textAlign: 'center' },
  statDividerWrap: { width: 10, alignItems: 'center', justifyContent: 'center' },
  statDivider: { width: 1, height: 22, backgroundColor: colors.BORDER },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  tag: {
    backgroundColor: colors.SURFACE,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    marginRight: 6, marginBottom: 4,
  },
  tagText: { fontSize: 13, color: colors.PRIMARY, fontWeight: '500' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  organizerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  organizerAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#6B7280', alignItems: 'center',
    justifyContent: 'center', marginRight: 8, overflow: 'hidden',
  },
  organizerAvatarImage: { width: 30, height: 30, borderRadius: 15 },
  organizerName: { fontSize: 14, color: colors.TEXT, fontWeight: '500' },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' },
  buttonContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuButton: { padding: 6 },
  participantInfo: { fontSize: 13, color: colors.TEXT_SECONDARY, fontWeight: '500' },
  joinButton: {
    backgroundColor: colors.PRIMARY,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  joinButtonText: { fontSize: 14, fontWeight: '600', color: '#000000' },
  disabledButton: { backgroundColor: colors.BORDER, opacity: 0.7 },
  disabledButtonText: { color: colors.TEXT_SECONDARY },
});

export default ScheduleCard;
