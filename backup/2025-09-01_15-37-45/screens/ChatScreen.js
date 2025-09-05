import React, { useState, useRef, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import { useCommunity } from '../contexts/CommunityContext';
import firestoreService from '../services/firestoreService';

// NetGill 디자인 시스템 색상
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  SECONDARY: '#666666',
  MESSAGE_SENT: '#3AF8FF',
  MESSAGE_RECEIVED: '#1F1F24',
};

const ChatScreen = ({ route, navigation }) => {
  const { chatRoom: initialChatRoom, returnToCommunity } = route.params;
  const { user } = useAuth();
  const { addChatMessage, handleChatRoomClick, allEvents, chatRooms } = useEvents();
  
  // 실시간 채팅방 데이터 사용
  const chatRoom = chatRooms.find(room => room.id === initialChatRoom.id) || initialChatRoom;
  
  // 모임 데이터에서 실제 참여자 수 가져오기
  const event = allEvents.find(e => e.id === chatRoom.eventId);
  const actualParticipantCount = event?.participants ? 
    (Array.isArray(event.participants) ? event.participants.length : event.participants) : 
    (Array.isArray(chatRoom.participants) ? chatRoom.participants.length : 1);
  const { createChatNotification } = useCommunity();
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
    
    const unsubscribe = firestoreService.onChatMessagesSnapshot(chatRoom.id, (snapshot) => {
      const firestoreMessages = [];
      snapshot.forEach((doc) => {
        const messageData = doc.data();
        const processedMessage = {
          id: doc.id,
          text: messageData.text || '',
          sender: messageData.sender || '익명',
          senderId: messageData.senderId || '',
          timestamp: messageData.timestamp?.toDate?.() || messageData.timestamp || new Date(),
          type: messageData.senderId === user?.uid ? 'sent' : 'received'
        };
        firestoreMessages.push(processedMessage);
      });
      
      // 시간순으로 정렬
      firestoreMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      setMessages(firestoreMessages);
      setLoadingMessages(false);
      console.log('✅ ChatScreen - 메시지 로드 완료:', firestoreMessages.length, '개');
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

        console.log('🔍 모임 참여자 정보:', event.participants);

        // 각 참여자의 프로필 정보 조회
        const participantProfiles = await Promise.all(
          event.participants.map(async (participantId) => {
            try {
              const userProfile = await firestoreService.getUserProfile(participantId);
              return {
                id: participantId,
                name: userProfile?.profile?.nickname || userProfile?.displayName || '익명',
                profileImage: userProfile?.profileImage || null,
                joinDate: event.createdAt || new Date(),
                isHost: event.organizerId === participantId
              };
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
        console.log('✅ 참여자 목록 로드 완료:', participantProfiles);
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

    const messageData = {
      text: newMessage.trim(),
      sender: user?.displayName || user?.email?.split('@')[0] || '나',
      senderId: user.uid,
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
        
        // 각 참여자에게 알림 전송
        for (const participantId of otherParticipants) {
          try {
            await createChatNotification(
              chatRoom.id,
              chatRoom.title,
              messageData.text,
              messageData.sender,
              participantId
            );
          } catch (error) {
            console.warn('⚠️ 채팅 알림 생성 실패:', error);
          }
        }
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

  const renderMessage = ({ item }) => {
    const isMyMessage = item.type === 'sent';
    
    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer]}>
        {!isMyMessage && (
          <View style={styles.senderInfo}>
            <Text style={styles.senderName}>{item.sender}</Text>
          </View>
        )}
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble]}>
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.text}
          </Text>
        </View>
        <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.otherMessageTime]}>
          {formatTime(item.timestamp)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.SURFACE }]}>
      <StatusBar 
        backgroundColor={COLORS.SURFACE}
        barStyle="light-content"
      />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* 채팅방 정보 헤더 */}
        <View style={styles.chatHeader}>
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
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT} />
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
              <Ionicons name="menu" size={28} color={COLORS.TEXT} />
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
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor={COLORS.SECONDARY}
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
              color={newMessage.trim() ? '#000000' : COLORS.SECONDARY} 
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
                <Ionicons name="close" size={24} color={COLORS.TEXT} />
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
                        {participant.profileImage && !participant.profileImage.startsWith('file://') ? (
                          <Image 
                            source={{ uri: participant.profileImage }} 
                            style={styles.participantAvatarImage}
                          />
                        ) : (
                          <Ionicons name="person" size={16} color="#ffffff" />
                        )}
                      </View>
                      <View style={styles.participantDetails}>
                        <Text style={styles.participantName}>
                          {participant.name}
                          {participant.isHost && <Text style={styles.hostBadge}> (호스트)</Text>}
                        </Text>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: COLORS.SURFACE,
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
    color: COLORS.TEXT,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantsCount: {
    fontSize: 14,
    color: COLORS.SECONDARY,
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
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 12,
    color: COLORS.SECONDARY,
    backgroundColor: COLORS.SURFACE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
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
    color: COLORS.SECONDARY,
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  myMessageBubble: {
    backgroundColor: COLORS.MESSAGE_SENT,
  },
  otherMessageBubble: {
    backgroundColor: COLORS.MESSAGE_RECEIVED,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#000000',
  },
  otherMessageText: {
    color: COLORS.TEXT,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: COLORS.SECONDARY,
    textAlign: 'right',
  },
  otherMessageTime: {
    color: COLORS.SECONDARY,
    textAlign: 'left',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: COLORS.SURFACE,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.CARD,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    color: COLORS.TEXT,
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
    backgroundColor: COLORS.PRIMARY,
  },
  sendButtonInactive: {
    backgroundColor: COLORS.CARD,
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.SURFACE,
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
    borderBottomColor: '#333333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
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
    borderBottomColor: '#333333',
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
  participantInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 2,
  },
  participantStatus: {
    fontSize: 12,
    color: COLORS.SECONDARY,
  },
  participantJoinDate: {
    fontSize: 12,
    color: COLORS.SECONDARY,
  },
  hostBadge: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.SECONDARY,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.SECONDARY,
  },
});

export default ChatScreen; 