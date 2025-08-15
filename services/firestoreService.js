import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';

class FirestoreService {
  constructor() {
    this.db = getFirestore();
  }

  // 사용자 프로필 관련
  async createUserProfile(userId, profileData) {
    try {
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, {
        ...profileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('사용자 프로필 생성 실패:', error);
      throw error;
    }
  }

  async getUserProfile(userId) {
    try {
      const userRef = doc(this.db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        // Firestore Timestamp 객체를 안전하게 처리
        return {
          ...userData,
          createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
          onboardingCompletedAt: userData.onboardingCompletedAt?.toDate?.() || userData.onboardingCompletedAt,
        };
      }
      return null;
    } catch (error) {
      console.error('사용자 프로필 조회 실패:', error);
      throw error;
    }
  }

  async updateUserProfile(userId, profileData) {
    try {
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, {
        ...profileData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('사용자 프로필 업데이트 실패:', error);
      throw error;
    }
  }

  // 이벤트/모임 관련
  async createEvent(eventData) {
    try {
      console.log('🔍 FirestoreService.createEvent 호출됨 - eventData:', eventData);
      console.log('🔍 FirestoreService.createEvent - eventData.date:', eventData.date, typeof eventData.date);
      
      const eventsRef = collection(this.db, 'events');
      const docRef = await addDoc(eventsRef, {
        ...eventData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Firebase에 이벤트 저장 완료 - ID:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('이벤트 생성 실패:', error);
      throw error;
    }
  }

  async getEvents(filters = {}) {
    try {
      const eventsRef = collection(this.db, 'events');
      let eventsQuery = query(eventsRef, orderBy('createdAt', 'desc'));
      
      if (filters.organizerId) {
        eventsQuery = query(eventsRef, where('organizerId', '==', filters.organizerId));
      }
      
      const querySnapshot = await getDocs(eventsQuery);
      const events = [];
      querySnapshot.forEach((doc) => {
        const eventData = doc.data();
        // Firestore Timestamp 객체를 안전하게 처리
        const processedEvent = {
          id: doc.id,
          ...eventData,
          createdAt: eventData.createdAt?.toDate?.() || eventData.createdAt,
          updatedAt: eventData.updatedAt?.toDate?.() || eventData.updatedAt,
        };
        events.push(processedEvent);
      });
      return events;
    } catch (error) {
      console.error('이벤트 조회 실패:', error);
      throw error;
    }
  }

  async joinEvent(eventId, userId) {
    try {
      const eventRef = doc(this.db, 'events', eventId);
      await updateDoc(eventRef, {
        participants: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('이벤트 참여 실패:', error);
      throw error;
    }
  }

  async leaveEvent(eventId, userId) {
    try {
      const eventRef = doc(this.db, 'events', eventId);
      await updateDoc(eventRef, {
        participants: arrayRemove(userId),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('이벤트 탈퇴 실패:', error);
      throw error;
    }
  }

  async updateEvent(eventId, eventData) {
    try {
      const eventRef = doc(this.db, 'events', eventId);
      await updateDoc(eventRef, {
        ...eventData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('이벤트 업데이트 실패:', error);
      throw error;
    }
  }

  async deleteEvent(eventId) {
    try {
      console.log('🔍 FirestoreService.deleteEvent 호출됨 - eventId:', eventId);
      const eventRef = doc(this.db, 'events', eventId);
      await deleteDoc(eventRef);
      console.log('✅ Firebase에서 이벤트 삭제 완료');
      return { success: true };
    } catch (error) {
      console.error('이벤트 삭제 실패:', error);
      throw error;
    }
  }

  async deleteChatRoom(eventId) {
    try {
      console.log('🔍 FirestoreService.deleteChatRoom 호출됨 - eventId:', eventId);
      
      // 해당 이벤트의 채팅방을 찾아서 삭제
      const chatRoomsRef = collection(this.db, 'chatRooms');
      const q = query(chatRoomsRef, where('eventId', '==', eventId));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log('✅ Firebase에서 채팅방 삭제 완료');
      return { success: true };
    } catch (error) {
      console.error('채팅방 삭제 실패:', error);
      throw error;
    }
  }

  // 커뮤니티 게시글 관련
  async createPost(postData) {
    try {
      const postsRef = collection(this.db, 'posts');
      const docRef = await addDoc(postsRef, {
        ...postData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('게시글 생성 실패:', error);
      throw error;
    }
  }

  async getPosts(filters = {}) {
    try {
      const postsRef = collection(this.db, 'posts');
      let postsQuery = query(postsRef, orderBy('createdAt', 'desc'));
      
      if (filters.category) {
        postsQuery = query(postsRef, where('category', '==', filters.category), orderBy('createdAt', 'desc'));
      }
      
      if (filters.authorId) {
        postsQuery = query(postsRef, where('authorId', '==', filters.authorId), orderBy('createdAt', 'desc'));
      }
      
      const querySnapshot = await getDocs(postsQuery);
      const posts = [];
      querySnapshot.forEach((doc) => {
        const postData = doc.data();
        // Firestore Timestamp 객체를 안전하게 처리
        const processedPost = {
          id: doc.id,
          ...postData,
          createdAt: postData.createdAt?.toDate?.() || postData.createdAt,
          updatedAt: postData.updatedAt?.toDate?.() || postData.updatedAt,
        };
        posts.push(processedPost);
      });
      return posts;
    } catch (error) {
      console.error('게시글 조회 실패:', error);
      throw error;
    }
  }

  async updatePost(postId, postData) {
    try {
      const postRef = doc(this.db, 'posts', postId);
      await updateDoc(postRef, {
        ...postData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('게시글 업데이트 실패:', error);
      throw error;
    }
  }

  async deletePost(postId) {
    try {
      const postRef = doc(this.db, 'posts', postId);
      await deleteDoc(postRef);
      return { success: true };
    } catch (error) {
      console.error('게시글 삭제 실패:', error);
      throw error;
    }
  }

  // 채팅방 관련
  async createChatRoom(chatRoomData) {
    try {
      const chatRoomsRef = collection(this.db, 'chatRooms');
      const docRef = await addDoc(chatRoomsRef, {
        ...chatRoomData,
        createdAt: serverTimestamp(),
        lastMessageTime: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
      throw error;
    }
  }

  async sendMessage(chatRoomId, messageData) {
    try {
      const messagesRef = collection(this.db, 'chatRooms', chatRoomId, 'messages');
      await addDoc(messagesRef, {
        ...messageData,
        timestamp: serverTimestamp()
      });
      
      // 채팅방의 마지막 메시지 시간 업데이트
      const chatRoomRef = doc(this.db, 'chatRooms', chatRoomId);
      await updateDoc(chatRoomRef, {
        lastMessage: messageData.text,
        lastMessageTime: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      throw error;
    }
  }

  // 알림 관련
  async createNotification(notificationData) {
    try {
      const notificationsRef = collection(this.db, 'notifications');
      const docRef = await addDoc(notificationsRef, {
        ...notificationData,
        timestamp: serverTimestamp(),
        isRead: false
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('알림 생성 실패:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId) {
    try {
      const notificationRef = doc(this.db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
      throw error;
    }
  }

  // 실시간 리스너 설정
  onEventsSnapshot(callback, filters = {}) {
    const eventsRef = collection(this.db, 'events');
    let eventsQuery = query(eventsRef, orderBy('createdAt', 'desc'));
    
    if (filters.organizerId) {
      eventsQuery = query(eventsRef, where('organizerId', '==', filters.organizerId));
    }
    
    return onSnapshot(eventsQuery, callback);
  }

  onPostsSnapshot(callback, filters = {}) {
    const postsRef = collection(this.db, 'posts');
    let postsQuery = query(postsRef, orderBy('createdAt', 'desc'));
    
    if (filters.category) {
      postsQuery = query(postsRef, where('category', '==', filters.category), orderBy('createdAt', 'desc'));
    }
    
    return onSnapshot(postsQuery, callback);
  }

  onNotificationsSnapshot(userId, callback) {
    const notificationsRef = collection(this.db, 'notifications');
    const notificationsQuery = query(
      notificationsRef, 
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    return onSnapshot(notificationsQuery, callback);
  }

  onChatRoomsSnapshot(userId, callback) {
    const chatRoomsRef = collection(this.db, 'chatRooms');
    const chatQuery = query(
      chatRoomsRef, 
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc')
    );
    
    return onSnapshot(chatQuery, callback);
  }

  onChatMessagesSnapshot(chatRoomId, callback) {
    const messagesRef = collection(this.db, 'chatRooms', chatRoomId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
    
    return onSnapshot(messagesQuery, callback);
  }
}

const firestoreService = new FirestoreService();
export default firestoreService; 