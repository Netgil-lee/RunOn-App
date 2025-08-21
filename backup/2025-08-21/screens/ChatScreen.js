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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';

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
  const { chatRoom, returnToCommunity } = route.params;
  const { user } = useAuth();
  const { addChatMessage, handleChatRoomClick } = useEvents();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: `${chatRoom.title} 채팅방에 오신 것을 환영합니다!`,
      sender: 'system',
      timestamp: new Date(Date.now() - 3600000),
      type: 'system'
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      title: chatRoom.title,
      headerStyle: {
        backgroundColor: COLORS.SURFACE,
      },
      headerTintColor: COLORS.TEXT,
      headerTitleStyle: {
        fontWeight: 'bold',
      },
      // 뒤로가기 버튼 클릭 시 CommunityTab으로 이동
      headerLeft: () => (
        <TouchableOpacity
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
          style={{ marginLeft: 16 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, chatRoom, returnToCommunity]);

  // 채팅방 진입 시 알림 해제 (한 번만 실행)
  useEffect(() => {
    handleChatRoomClick(chatRoom.id);
    console.log(`✅ ChatScreen 진입 - 채팅방 ${chatRoom.id} 알림 해제`);
  }, [chatRoom.id]); // chatRoom.id만 의존성으로 사용

  // 참여자 목록 가져오기
  const getParticipants = () => {
    if (!chatRoom.participants || !Array.isArray(chatRoom.participants)) {
      return [];
    }
    
    // 실제 구현에서는 Firestore에서 참여자 정보를 가져와야 합니다
    // 현재는 기본 정보만 반환
    return chatRoom.participants.map((participantId, index) => ({
      id: participantId,
      name: `참여자 ${index + 1}`,
      isOnline: Math.random() > 0.5, // 임시 온라인 상태
      joinDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // 임시 가입일
    }));
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        text: newMessage.trim(),
        sender: user?.name || '나',
        timestamp: new Date(),
        type: 'sent'
      };
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // 자동 스크롤
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
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
    if (item.type === 'system') {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{item.text}</Text>
        </View>
      );
    }

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
          <View style={styles.chatInfo}>
            <Text style={styles.chatTitle}>{chatRoom.title}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.participantsCount}>{Array.isArray(chatRoom.participants) ? chatRoom.participants.length : 1}명 참여 중</Text>
            <TouchableOpacity 
              style={styles.infoButton}
              onPress={() => setShowParticipantsModal(true)}
            >
              <Ionicons name="menu" size={28} color={COLORS.TEXT} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 메시지 목록 */}
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
              {getParticipants().map((participant) => (
                <View key={participant.id} style={styles.participantItem}>
                  <View style={styles.participantInfo}>
                    <View style={styles.participantAvatar}>
                      <Text style={styles.participantInitial}>
                        {participant.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.participantDetails}>
                      <Text style={styles.participantName}>{participant.name}</Text>
                      <Text style={styles.participantStatus}>
                        {participant.isOnline ? '🟢 온라인' : '⚪ 오프라인'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.participantJoinDate}>
                    {participant.joinDate.toLocaleDateString('ko-KR')} 참여
                  </Text>
                </View>
              ))}
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
    fontSize: 16,
    color: COLORS.SECONDARY,
    marginRight: 12,
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
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  participantInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
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
});

export default ChatScreen; 