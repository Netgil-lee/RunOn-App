import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useEvents } from '../../contexts/EventContext';
import { getUpcomingEvents, formatDdayLabel, formatEventWhen } from '../../utils/eventDateTime';
import { EmptyCard } from './HomeSection';

// 화면 이동 파라미터에 Date 객체를 넣지 않도록 문자열로 바꾼다 (ScheduleScreen과 같은 방식)
const toSerializable = (value) =>
  value && typeof value.toISOString === 'function' ? value.toISOString() : value;

/**
 * 다가오는 내 모임 (한 줄 띠)
 * 내가 만들었거나 참여한 모임 중 가장 먼저 시작하는 1개. 없으면 모임 만들기 안내를 보여준다.
 */
const UpcomingEventStrip = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { userJoinedEvents, userCreatedEvents, chatRooms } = useEvents();

  const next = useMemo(
    () => getUpcomingEvents([...(userCreatedEvents || []), ...(userJoinedEvents || [])])[0] || null,
    [userCreatedEvents, userJoinedEvents]
  );

  if (!next) {
    return (
      <View style={styles.emptyWrap}>
        <EmptyCard
          message={'예정된 모임이 없어요.\n함께 달릴 모임을 만들어보세요'}
          actionLabel="모임 만들기"
          onActionPress={() => navigation.navigate('ScheduleTab', { openCreateFlow: true })}
        />
      </View>
    );
  }

  const { event, start } = next;
  const isCreatedByMe = !!event.isCreatedByUser;

  // 모임 채팅방: 내 채팅방 목록에서 찾고, 없으면 모임 문서의 chatRoomId 사용
  const chatRoom =
    (chatRooms || []).find((room) => room.eventId === event.id)
    || (event.chatRoomId ? { id: event.chatRoomId, title: event.title } : null);

  const openDetail = () => {
    navigation.navigate('EventDetail', {
      event: {
        ...event,
        createdAt: toSerializable(event.createdAt),
        updatedAt: toSerializable(event.updatedAt),
        date: toSerializable(event.date),
      },
      isJoined: !isCreatedByMe,
      isCreatedByMe,
    });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={openDetail} activeOpacity={0.8}>
      <View style={styles.dday}>
        <Text style={styles.ddayText} allowFontScaling={false}>{formatDdayLabel(start)}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[formatEventWhen(start), event.location].filter(Boolean).join(' · ')}
        </Text>
      </View>

      {chatRoom && (
        <TouchableOpacity
          onPress={() => navigation.navigate('Chat', { chatRoom })}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="모임 채팅방 열기"
        >
          <Text style={styles.chat}>채팅 ›</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (colors) => StyleSheet.create({
  emptyWrap: {
    marginTop: 16,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.CARD,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.BORDER,
  },
  dday: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: colors.PRIMARY,
  },
  ddayText: {
    fontSize: 13,
    fontFamily: 'Pretendard-Bold',
    color: colors.ON_PRIMARY,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Pretendard-SemiBold',
    color: colors.TEXT,
  },
  meta: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: 'Pretendard-Regular',
    color: colors.TEXT_SECONDARY,
  },
  chat: {
    fontSize: 13,
    fontFamily: 'Pretendard-Medium',
    color: colors.PRIMARY,
  },
});

export default UpcomingEventStrip;
