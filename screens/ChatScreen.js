import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Modal,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import { useCommunity } from '../contexts/CommunityContext';
import { useNotificationSettings } from '../contexts/NotificationSettingsContext';
import firestoreService from '../services/firestoreService';
import pushNotificationService from '../services/pushNotificationService';
import { useTheme } from '../contexts/ThemeContext';

const ChatScreen = ({ route, navigation }) => {
  const { chatRoom: initialChatRoom, returnToCommunity } = route.params;
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const statusBarPadding = Platform.OS === 'android' ? insets.top : 0;
  const {
    addChatMessage,
    handleChatRoomClick,
    allEvents,
    chatRooms,
    addConsecutiveInfoToMessages
  } = useEvents();

  // 실시간 채팅방 데이터 사용
  const chatRoom = chatRooms.find(room => room.id === initialChatRoom.id) || initialChatRoom;

  // 모임 데이터에서 실제 참여자 수 가져오기
  const event = allEvents.find(e => e.id === chatRoom.eventId);
  const actualParticipantCount = event?.participants ?
    (Array.isArray(event.participants) ? event.participants.length : event.participants) :
    (Array.isArray(chatRoom.participants) ? chatRoom.participants.length : 1);
  const { createChatNotification } = useCommunity();
  const { isNotificationTypeEnabled } = useNotificationSettings();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const flatListRef = useRef(null);

  // 채팅방 진입 시 알림 해제 (한 번만 실행)
  useEffect(() => {
    handleChatRoomClick(chatRoom.id);
    console.log(`✅ ChatScreen 진입 - 채팅방 ${chatRoom.id} 알림 해제`);
  }, [chatRoom.id]); // chatRoom.id만 의존성으로 사용

  // Firestore에서 메시지 실시간 불러오기
  useEffect(() => {
    if (!chatRoom.id) {
      console.log('⚠️ 채팅방 ID가 없음');
      setLoadingMessages(false);
      return;
    }

    console.log('🔍 ChatScreen - 메시지 실시간 구독 시작:', chatRoom.id);

    const unsubscribe = firestoreService.onChatMessagesSnapshot(chatRoom.id, async (snapshot) => {
      const firestoreMessages = [];

      // 각 메시지에 발신자 프로필 정보 추가
      for (const doc of snapshot.docs) {
        const messageData = doc.data();

        // 발신자 프로필 정보 가져오기 - '나'인 경우 실제 닉네임으로 교체
        let senderProfileImage = null;
        let senderName = messageData.sender || '익명';

        try {
          if (messageData.senderId) {
            const userProfile = await firestoreService.getUserProfile(messageData.senderId);
            if (userProfile) {
              senderProfileImage = userProfile.profileImage || null;

              // '나'인 경우 실제 닉네임으로 교체
              if (messageData.sender === '나') {
                senderName = userProfile.profile?.nickname ||
                            userProfile.profile?.displayName ||
                            userProfile.displayName ||
                            '사용자';
                console.log('🔍 ChatScreen - 기존 메시지 sender 교체:', {
                  original: messageData.sender,
                  new: senderName,
                  uid: messageData.senderId,
                  messageId: doc.id
                });
              } else {
                senderName = userProfile.profile?.nickname ||
                            userProfile.profile?.displayName ||
                            messageData.sender ||
                            '익명';
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ 메시지 발신자 프로필 조회 실패:', messageData.senderId, error);
        }

        const processedMessage = {
          id: doc.id,
          text: messageData.text || '',
          sender: senderName,
          senderId: messageData.senderId || '',
          senderProfileImage: senderProfileImage,
          timestamp: messageData.timestamp?.toDate?.() || messageData.timestamp || new Date(),
          type: messageData.senderId === user?.uid ? 'sent' : 'received'
        };

        firestoreMessages.push(processedMessage);
      }

      // 시간순으로 정렬
      firestoreMessages.sort((a, b) => a.timestamp - b.timestamp);

      // 메시지 연속성 정보 추가
      const messagesWithConsecutiveInfo = addConsecutiveInfoToMessages(firestoreMessages);

      setMessages(messagesWithConsecutiveInfo);
      setLoadingMessages(false);
      console.log('✅ ChatScreen - 메시지 로드 완료:', {
        total: firestoreMessages.length,
        messages: firestoreMessages.map(msg => ({
          id: msg.id,
          sender: msg.sender,
          senderId: msg.senderId,
          hasProfileImage: !!msg.senderProfileImage
        }))
      });
    });

    return () => {
      console.log('🔍 ChatScreen - 메시지 실시간 구독 해제:', chatRoom.id);
      unsubscribe();
    };
  }, [chatRoom.id, user?.uid]);

  // 참여자 목록 가져오기
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // 모임 데이터에서 참여자 정보 가져오기
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!chatRoom.eventId) {
        console.log('⚠️ 채팅방에 eventId가 없음');
        return;
      }

      setLoadingParticipants(true);
      try {
        // EventContext에서 해당 모임 찾기
        const event = allEvents.find(e => e.id === chatRoom.eventId);
        if (!event) {
          console.log('⚠️ 해당 모임을 찾을 수 없음:', chatRoom.eventId);
          return;
        }

        console.log('🔍 모임 참여자 정보:', {
          eventId: event.id,
          participants: event.participants,
          organizerId: event.organizerId,
          participantsType: typeof event.participants,
          isArray: Array.isArray(event.participants)
        });

        // 참여자 배열이 없거나 비어있는 경우 처리
        if (!event.participants || (Array.isArray(event.participants) && event.participants.length === 0)) {
          console.log('⚠️ 모임에 참여자가 없음');
          setParticipants([]);
          return;
        }

        // 참여자 ID 배열 생성 (문자열이 아닌 배열인 경우 처리)
        const baseParticipantIds = Array.isArray(event.participants) ? event.participants : [event.participants];
        const participantIds = Array.from(new Set([...(baseParticipantIds || []), event.organizerId].filter(Boolean)));

        // 각 참여자의 프로필 정보 조회
        const participantProfiles = await Promise.all(
          participantIds.map(async (participantId) => {
            try {
              console.log('🔍 참여자 프로필 조회 중:', participantId);
              const userProfile = await firestoreService.getUserProfile(participantId);

              if (userProfile) {
                const participantInfo = {
                  id: participantId,
                  name: userProfile.profile?.nickname || userProfile.displayName || '익명',
                  profileImage: userProfile.profileImage || null,
                  joinDate: event.createdAt || new Date(),
                  isHost: event.organizerId === participantId
                };

                console.log('✅ 참여자 프로필 조회 성공:', {
                  participantId,
                  name: participantInfo.name,
                  isHost: participantInfo.isHost,
                  organizerId: event.organizerId
                });

                return participantInfo;
              } else {
                console.warn('⚠️ 참여자 프로필을 찾을 수 없음:', participantId);
                return {
                  id: participantId,
                  name: '익명',
                  profileImage: null,
                  joinDate: event.createdAt || new Date(),
                  isHost: event.organizerId === participantId
                };
              }
            } catch (error) {
              console.error('❌ 참여자 프로필 조회 실패:', participantId, error);
              return {
                id: participantId,
                name: '익명',
                profileImage: null,
                joinDate: event.createdAt || new Date(),
                isHost: event.organizerId === participantId
              };
            }
          })
        );

        setParticipants(participantProfiles);
        console.log('✅ 참여자 목록 로드 완료:', {
          total: participantProfiles.length,
          participants: participantProfiles.map(p => ({
            id: p.id,
            name: p.name,
            isHost: p.isHost
          }))
        });
      } catch (error) {
        console.error('❌ 참여자 목록 로드 실패:', error);
      } finally {
        setLoadingParticipants(false);
      }
    };

    fetchParticipants();
  }, [chatRoom.eventId, allEvents]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatRoom.id || !user?.uid) {
      return;
    }

    // 사용자 프로필 정보 가져오기
    let senderName = '사용자';  // 기본값을 '나'에서 '사용자'로 변경
    let senderProfileImage = null;

    try {
      console.log('🔍 ChatScreen - sendMessage에서 사용자 프로필 조회 시작:', user.uid);
      const userProfile = await firestoreService.getUserProfile(user.uid);
      if (userProfile) {
        // 온보딩/프로필에서 입력한 닉네임을 우선적으로 사용
        senderName = userProfile.profile?.nickname ||
                    userProfile.profile?.displayName ||
                    userProfile.displayName ||
                    user?.email?.split('@')[0] ||
                    '사용자';
        senderProfileImage = userProfile.profileImage || null;

        console.log('✅ ChatScreen - sendMessage에서 senderName 결정:', {
          uid: user.uid,
          profileNickname: userProfile.profile?.nickname,
          profileDisplayName: userProfile.profile?.displayName,
          userDisplayName: userProfile.displayName,
          userEmail: user?.email,
          finalSenderName: senderName
        });
      }
    } catch (error) {
      console.error('❌ ChatScreen - sendMessage에서 사용자 프로필 조회 실패, 기본값 사용:', error);
      senderName = user?.displayName || user?.email?.split('@')[0] || '사용자';
    }

    const messageData = {
      text: newMessage.trim(),
      sender: senderName,
      senderId: user.uid,
      senderProfileImage: senderProfileImage,
      timestamp: new Date()
    };

    try {
      console.log('🔍 ChatScreen - 메시지 전송 시작:', messageData);

      // Firestore에 메시지 저장
      await firestoreService.sendMessage(chatRoom.id, messageData);

      // 채팅방의 다른 참여자들에게 알림 전송
      if (chatRoom.participants && Array.isArray(chatRoom.participants)) {
        const otherParticipants = chatRoom.participants.filter(participantId =>
          participantId !== user.uid
        );

        // 서버에서 푸시 알림을 전송하므로 클라이언트에서는 전송하지 않음
        // Firestore에 메시지가 저장되면 Cloud Function이 자동으로 알림을 전송합니다.
      }

      console.log('✅ ChatScreen - 메시지 전송 완료');
      setNewMessage('');

      // 자동 스크롤
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('❌ ChatScreen - 메시지 전송 실패:', error);
      // 에러 처리 (사용자에게 알림 등)
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));

    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return messageTime.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const renderMessage = ({ item, index }) => {
    // item.sender는 이미 onChatMessagesSnapshot에서 처리된 정확한 닉네임
    const displaySender = item.sender;
    const isMyMessage = item.type === 'sent';
    const isSystemMessage = item.isSystemMessage || item.senderId === 'system';

    // EventContext의 연속성 정보 사용
    const showAvatarAndName = !isMyMessage && item.isFirstInGroup; // 그룹의 첫 번째 메시지에만 표시
    const showTime = item.showTimestamp; // EventContext에서 결정한 시간 표시 여부

    // 시스템 메시지 렌더링
    if (isSystemMessage) {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>
            {item.text}
          </Text>
        </View>
      );
    }

    if (isMyMessage) {
      // 내 메시지 (기존 스타일 유지)
      return (
        <View style={[styles.messageContainer, styles.myMessageContainer, item.isConsecutive ? styles.groupedMessageTight : null]}>
          <View style={[styles.messageBubble, styles.myMessageBubble]}>
            <Text style={[styles.messageText, styles.myMessageText]}>
              {item.text}
            </Text>
          </View>
          {showTime ? (
            <Text style={[styles.messageTime, styles.myMessageTime]}>
              {formatTime(item.timestamp)}
            </Text>
          ) : null}
        </View>
      );
    } else {
      // 다른 사용자 메시지 (카카오톡 스타일)
      return (
        <View style={[styles.otherMessageWrapper, item.isConsecutive ? styles.otherMessageWrapperTight : null]}>
          {/* 프로필사진 */}
          {showAvatarAndName ? (
            <View style={styles.profileImageContainer}>
              {item.senderProfileImage ? (
                <Image
                  source={{ uri: item.senderProfileImage }}
                  style={styles.largeProfileImage}
                  onError={() => console.warn('⚠️ 발신자 프로필 이미지 로딩 실패:', item.senderProfileImage)}
                />
              ) : (
                <View style={styles.largeProfilePlaceholder}>
                  <Ionicons name="person" size={20} color="#ffffff" />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.avatarSpacer} />
          )}

          {/* 메시지 콘텐츠 */}
          <View style={styles.messageContentContainer}>
            {/* 발신자 이름 */}
            {showAvatarAndName ? (
              <Text style={styles.senderNameKakao}>{displaySender}</Text>
            ) : null}

            {/* 메시지와 시간 */}
            <View style={styles.messageAndTimeRow}>
              <View style={[styles.messageBubble, styles.otherMessageBubble]}>
                <Text style={[styles.messageText, styles.otherMessageText]}>
                  {item.text}
                </Text>
              </View>
              {showTime ? (
                <Text style={styles.otherMessageTimeKakao}>
                  {formatTime(item.timestamp)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.SURFACE }]}>
      <StatusBar
        backgroundColor={colors.SURFACE}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* 채팅방 정보 헤더 */}
        <View style={[styles.chatHeader, { paddingTop: 4 + statusBarPadding }]}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => {
              if (returnToCommunity) {
                // CommunityTab으로 이동
                navigation.navigate('Main', {
                  screen: 'CommunityTab',
                  params: { activeTab: '채팅' }
                });
              } else {
                // 기본 뒤로가기
                navigation.goBack();
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.TEXT} />
          </TouchableOpacity>
          <View style={styles.chatInfo}>
            <Text style={styles.chatTitle}>{chatRoom.title}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.participantsCount}>{actualParticipantCount}명 참여 중</Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowParticipantsModal(true)}
            >
              <Ionicons name="menu" size={28} color={colors.TEXT} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 메시지 목록 */}
        {loadingMessages ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>메시지를 불러오는 중...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* 메시지 입력 */}
        <View style={[styles.inputContainer, { paddingBottom: 6 + insets.bottom }]}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor={colors.TEXT_SECONDARY}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, newMessage.trim() ? styles.sendButtonActive : styles.sendButtonInactive]}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={newMessage.trim() ? '#000000' : colors.TEXT_SECONDARY}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 참여자 목록 모달 */}
      <Modal
        visible={showParticipantsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowParticipantsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>참여자 목록</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowParticipantsModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.TEXT} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.participantsList}>
              {loadingParticipants ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>참여자 목록을 불러오는 중...</Text>
                </View>
              ) : participants.length > 0 ? (
                participants.map((participant) => (
                  <View key={participant.id} style={styles.participantItem}>
                    <View style={styles.participantInfo}>
                      <View style={styles.participantAvatar}>
                        {participant.profileImage ? (
                          <Image
                            source={{ uri: participant.profileImage }}
                            style={styles.participantAvatarImage}
                            resizeMode="cover"
                            onError={() => console.warn('⚠️ 참여자 프로필 이미지 로딩 실패:', participant.profileImage)}
                          />
                        ) : (
                          <View style={styles.participantAvatarPlaceholder}>
                            <Ionicons name="person" size={20} color="#ffffff" />
                          </View>
                        )}
                      </View>
                      <View style={styles.participantDetails}>
                          <View style={styles.hostNameRow}>
                            {participant.isHost && (
                              <MaterialCommunityIcons name="crown" size={16} color="#FFD700" style={styles.hostCrownAbsolute} />
                            )}
                            <Text style={[styles.participantName, participant.isHost && styles.participantNameWithCrown]}>
                              {participant.name}
                            </Text>
                          </View>
                        </View>
                    </View>
                    <Text style={styles.participantJoinDate}>
                      {participant.joinDate.toLocaleDateString('ko-KR')} 참여
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>참여자가 없습니다.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: colors.SURFACE,
  },
  headerBackButton: {
    padding: 8,
    marginRight: 8,
  },
  chatInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.TEXT,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantsCount: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
    marginRight: 6,
  },
  infoButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  systemMessageText: {
    fontSize: 13,
    color: colors.PRIMARY,
    backgroundColor: 'rgba(58, 248, 255, 0.1)',
    borderColor: colors.PRIMARY,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    textAlign: 'center',
    fontWeight: '500',
    maxWidth: '90%',
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  groupedMessageTight: {
    marginTop: 2,
    marginBottom: 2,
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  senderInfo: {
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
  },
  myMessageBubble: {
    backgroundColor: colors.PRIMARY,
  },
  otherMessageBubble: {
    backgroundColor: colors.SURFACE,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#000000',
  },
  otherMessageText: {
    color: colors.TEXT,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: colors.TEXT_SECONDARY,
    textAlign: 'right',
  },
  otherMessageTime: {
    color: colors.TEXT_SECONDARY,
    textAlign: 'left',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.SURFACE,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.CARD,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    color: colors.TEXT,
    fontSize: 16,
    maxHeight: 100,
  },

  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: colors.PRIMARY,
  },
  sendButtonInactive: {
    backgroundColor: colors.CARD,
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.SURFACE,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.TEXT,
  },
  closeButton: {
    padding: 4,
  },
  participantsList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  participantAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  participantAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantInitial: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.TEXT,
    marginBottom: 2,
  },
  hostNameRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostCrownAbsolute: {
    position: 'absolute',
    left: 0,
    top: -1,
  },
  participantNameWithCrown: {
    paddingLeft: 22,
  },
  hostEmoji: {
    marginRight: 6,
    fontSize: 16,
  },
  participantStatus: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
  },
  participantJoinDate: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
  },
  hostBadge: {
    fontSize: 12,
    color: colors.PRIMARY,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.TEXT_SECONDARY,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.TEXT_SECONDARY,
  },
  senderProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderProfileImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  senderProfilePlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.TEXT_SECONDARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  // 카카오톡 스타일 레이아웃
  otherMessageWrapper: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 1,
    alignItems: 'flex-start',
  },
  otherMessageWrapperTight: {
    marginTop: 2,
  },
  profileImageContainer: {
    marginRight: 12,
  },
  avatarSpacer: {
    width: 44, // largeProfileImage width
    marginRight: 12,
  },
  largeProfileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  largeProfilePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.TEXT_SECONDARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContentContainer: {
    flex: 1,
    maxWidth: '75%',
  },
  senderNameKakao: {
    fontSize: 13,
    color: colors.TEXT,
    marginBottom: 4,
    fontWeight: '500',
  },
  messageAndTimeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  otherMessageTimeKakao: {
    fontSize: 11,
    color: colors.TEXT_SECONDARY,
    marginLeft: 8,
    marginBottom: 2,
  },
});

export default ChatScreen;
