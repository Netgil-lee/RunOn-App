import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const MeetingCard = ({ meeting, onClose, onJoin }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!meeting) return null;

  const formatDateWithoutYear = (dateString) => {
    if (!dateString) return '';
    if (dateString.includes('(') && dateString.includes(')')) return dateString;
    try {
      let date;
      if (dateString.includes('년')) {
        const cleaned = dateString.replace(/^\d{4}년\s*/, '');
        const match = cleaned.match(/(\d{1,2})월\s*(\d{1,2})일/);
        if (match) {
          date = new Date(new Date().getFullYear(), parseInt(match[1]) - 1, parseInt(match[2]));
        }
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
    return hashtagString
      .split(/\s+/)
      .filter(tag => tag.startsWith('#') && tag.length > 1)
      .map(tag => tag.replace(/[^#\w가-힣]/g, ''))
      .slice(0, 5);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={styles.organizerAvatar}>
            {meeting.organizerImage && !meeting.organizerImage.startsWith('file://') ? (
              <Image source={{ uri: meeting.organizerImage }} style={styles.organizerAvatarImage} />
            ) : (
              <Ionicons name="person" size={16} color="#ffffff" />
            )}
          </View>
          <View style={styles.organizerDetails}>
            <Text style={styles.organizerName}>{meeting.organizer}</Text>
          </View>
          <Text style={styles.title}>{meeting.title}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={colors.TEXT_SECONDARY} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>{meeting.description}</Text>
        <View style={styles.locationDateTimeRow}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={colors.PRIMARY} />
            <Text style={styles.infoText}>
              {formatDateWithoutYear(meeting.date)} {meeting.time}
            </Text>
          </View>
          <View style={[styles.infoRow, styles.participantInfoRow]}>
            <Ionicons name="people-outline" size={16} color={colors.PRIMARY} />
            <Text style={styles.infoText}>
              {(() => {
                const count = Array.isArray(meeting.participants) ? meeting.participants.length : (meeting.participants || 1);
                const max = meeting.maxParticipants ? `/${meeting.maxParticipants}` : '';
                return `${count}${max}`;
              })()}
            </Text>
          </View>
        </View>

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

        {meeting.hashtags && parseHashtags(meeting.hashtags).length > 0 && (
          <View style={styles.tagsContainer}>
            {parseHashtags(meeting.hashtags).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.CARD,
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
    borderBottomColor: colors.SURFACE,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  closeButton: { padding: 4 },
  content: { padding: 16 },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.TEXT,
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
    lineHeight: 20,
    marginBottom: 16,
  },
  locationDateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  participantInfoRow: { flex: 0, alignSelf: 'flex-end' },
  infoText: {
    fontSize: 15,
    color: colors.TEXT,
    marginLeft: 8,
    flexShrink: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: colors.SURFACE,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'stretch',
  },
  statItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.TEXT,
    marginBottom: 2,
    textAlign: 'center',
  },
  dividerContainer: { width: 10, alignItems: 'center', justifyContent: 'center' },
  statDivider: { width: 1, height: 24, backgroundColor: colors.BORDER },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  tag: {
    backgroundColor: colors.SURFACE,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: { fontSize: 14, color: colors.PRIMARY, fontWeight: '500' },
  organizerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  organizerAvatarImage: { width: 28, height: 28, borderRadius: 14 },
  organizerDetails: { marginRight: 8 },
  organizerName: { fontSize: 15, color: colors.TEXT, fontWeight: '500' },
  joinButton: {
    backgroundColor: colors.PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinButtonText: { fontSize: 15, fontWeight: '600', color: colors.BACKGROUND },
  disabledButton: { backgroundColor: colors.TEXT_SECONDARY, opacity: 0.7 },
  disabledButtonText: { color: colors.TEXT_SECONDARY },
});

export default MeetingCard;
