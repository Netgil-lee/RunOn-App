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
        
        // 프로필 이미지 URL 통합 처리
        let profileImage = null;
        if (userData.profileImage) {
          profileImage = userData.profileImage;
        } else if (userData.profile?.profileImage) {
          profileImage = userData.profile.profileImage;
        } else if (userData.photoURL) {
          profileImage = userData.photoURL;
        }
        
        // 기본 프로필 이미지는 서비스 레이어에서 강제하지 않음
        // UI 컴포넌트에서 아이콘 또는 로컬 기본 이미지를 처리하도록 null 유지
        
        console.log('✅ FirestoreService.getUserProfile 성공:', {
          userId,
          displayName: userData.displayName,
          profileImage: profileImage,
          originalProfileImage: userData.profileImage,
          profileProfileImage: userData.profile?.profileImage,
          photoURL: userData.photoURL,
          profile: userData.profile,
          allUserDataKeys: Object.keys(userData)
        });
        
        // Firestore Timestamp 객체를 안전하게 처리
        return {
          ...userData,
          profileImage: profileImage, // 통합된 프로필 이미지로 덮어쓰기
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
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log('🔍 FirestoreService.createEvent 호출됨 (시도:', retryCount + 1, ')');
        console.log('🔍 FirestoreService.createEvent - eventData:', eventData);
        console.log('🔍 FirestoreService.createEvent - eventData.date:', eventData.date, typeof eventData.date);
        console.log('🔍 환경:', __DEV__ ? 'development' : 'production');
        
        const eventsRef = collection(this.db, 'events');
        const docRef = await addDoc(eventsRef, {
          ...eventData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log('✅ Firebase에 이벤트 저장 완료 (시도:', retryCount + 1, ') - ID:', docRef.id);
        return { success: true, id: docRef.id };
        
      } catch (error) {
        retryCount++;
        console.error('❌ 이벤트 생성 실패 (시도:', retryCount, '):', error);
        console.error('❌ 에러 상세:', {
          code: error.code,
          message: error.message,
          environment: __DEV__ ? 'development' : 'production'
        });
        
        if (retryCount >= maxRetries) {
          console.error('❌ 최대 재시도 횟수 초과');
          throw error;
        }
        
        // 1초 대기 후 재시도
        console.log('⏳ 재시도 대기 중... (1초)');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
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
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log('🔍 FirestoreService.updateEvent 호출됨 (시도:', retryCount + 1, ')');
        console.log('🔍 이벤트 ID:', eventId);
        console.log('🔍 업데이트 데이터:', eventData);
        console.log('🔍 환경:', __DEV__ ? 'development' : 'production');
        
        const eventRef = doc(this.db, 'events', eventId);
        await updateDoc(eventRef, {
          ...eventData,
          updatedAt: serverTimestamp()
        });
        
        console.log('✅ 이벤트 업데이트 완료 (시도:', retryCount + 1, ')');
        return { success: true };
        
      } catch (error) {
        retryCount++;
        console.error('❌ 이벤트 업데이트 실패 (시도:', retryCount, '):', error);
        console.error('❌ 에러 상세:', {
          code: error.code,
          message: error.message,
          environment: __DEV__ ? 'development' : 'production'
        });
        
        if (retryCount >= maxRetries) {
          console.error('❌ 최대 재시도 횟수 초과');
          throw error;
        }
        
        // 1초 대기 후 재시도
        console.log('⏳ 재시도 대기 중... (1초)');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async deleteEvent(eventId) {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log('🔍 FirestoreService.deleteEvent 호출됨 (시도:', retryCount + 1, ')');
        console.log('🔍 이벤트 ID:', eventId);
        console.log('🔍 환경:', __DEV__ ? 'development' : 'production');
        
        const eventRef = doc(this.db, 'events', eventId);
        await deleteDoc(eventRef);
        
        console.log('✅ 이벤트 삭제 완료 (시도:', retryCount + 1, ')');
        return { success: true };
        
      } catch (error) {
        retryCount++;
        console.error('❌ 이벤트 삭제 실패 (시도:', retryCount, '):', error);
        console.error('❌ 에러 상세:', {
          code: error.code,
          message: error.message,
          environment: __DEV__ ? 'development' : 'production'
        });
        
        if (retryCount >= maxRetries) {
          console.error('❌ 최대 재시도 횟수 초과');
          throw error;
        }
        
        // 1초 대기 후 재시도
        console.log('⏳ 재시도 대기 중... (1초)');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
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
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log('🔍 FirestoreService.createChatRoom 호출됨 (시도:', retryCount + 1, ')');
        console.log('🔍 채팅방 데이터:', chatRoomData);
        console.log('🔍 환경:', __DEV__ ? 'development' : 'production');
        
        const chatRoomsRef = collection(this.db, 'chatRooms');
        const docRef = await addDoc(chatRoomsRef, {
          ...chatRoomData,
          createdAt: serverTimestamp(),
          lastMessageTime: serverTimestamp()
        });
        
        console.log('✅ 채팅방 생성 완료 (시도:', retryCount + 1, ') - ID:', docRef.id);
        return { success: true, id: docRef.id };
        
      } catch (error) {
        retryCount++;
        console.error('❌ 채팅방 생성 실패 (시도:', retryCount, '):', error);
        console.error('❌ 에러 상세:', {
          code: error.code,
          message: error.message,
          environment: __DEV__ ? 'development' : 'production'
        });
        
        if (retryCount >= maxRetries) {
          console.error('❌ 최대 재시도 횟수 초과');
          throw error;
        }
        
        // 1초 대기 후 재시도
        console.log('⏳ 재시도 대기 중... (1초)');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async sendMessage(chatRoomId, messageData) {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log('🔍 FirestoreService.sendMessage 호출됨 (시도:', retryCount + 1, ')');
        console.log('🔍 채팅방 ID:', chatRoomId);
        console.log('🔍 메시지 데이터:', messageData);
        console.log('🔍 환경:', __DEV__ ? 'development' : 'production');
        
        const messagesRef = collection(this.db, 'chatRooms', chatRoomId, 'messages');
        await addDoc(messagesRef, {
          ...messageData,
          timestamp: serverTimestamp()
        });
        
        console.log('✅ 메시지 저장 완료 (시도:', retryCount + 1, ')');
        
        // 채팅방의 마지막 메시지 시간 업데이트
        const chatRoomRef = doc(this.db, 'chatRooms', chatRoomId);
        await updateDoc(chatRoomRef, {
          lastMessage: messageData.text,
          lastMessageTime: serverTimestamp()
        });
        
        console.log('✅ 채팅방 업데이트 완료 (시도:', retryCount + 1, ')');
        return { success: true };
        
      } catch (error) {
        retryCount++;
        console.error('❌ 메시지 전송 실패 (시도:', retryCount, '):', error);
        console.error('❌ 에러 상세:', {
          code: error.code,
          message: error.message,
          environment: __DEV__ ? 'development' : 'production'
        });
        
        if (retryCount >= maxRetries) {
          console.error('❌ 최대 재시도 횟수 초과');
          throw error;
        }
        
        // 1초 대기 후 재시도
        console.log('⏳ 재시도 대기 중... (1초)');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // 채팅방 제목 업데이트
  async updateChatRoomTitle(chatRoomId, newTitle) {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log('🔍 FirestoreService.updateChatRoomTitle 호출됨 (시도:', retryCount + 1, ')');
        console.log('🔍 채팅방 ID:', chatRoomId);
        console.log('🔍 새 제목:', newTitle);
        console.log('🔍 환경:', __DEV__ ? 'development' : 'production');
        
        const chatRoomRef = doc(this.db, 'chatRooms', chatRoomId);
        await updateDoc(chatRoomRef, {
          title: newTitle,
          updatedAt: serverTimestamp()
        });
        
        console.log('✅ 채팅방 제목 업데이트 완료 (시도:', retryCount + 1, ')');
        return { success: true };
        
      } catch (error) {
        retryCount++;
        console.error('❌ 채팅방 제목 업데이트 실패 (시도:', retryCount, '):', error);
        console.error('❌ 에러 상세:', {
          code: error.code,
          message: error.message,
          environment: __DEV__ ? 'development' : 'production'
        });
        
        if (retryCount >= maxRetries) {
          console.error('❌ 최대 재시도 횟수 초과');
          throw error;
        }
        
        // 1초 대기 후 재시도
        console.log('⏳ 재시도 대기 중... (1초)');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // 알림 관련
  async createNotification(notificationData) {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log('🔍 FirestoreService.createNotification 호출됨 (시도:', retryCount + 1, ')');
        console.log('🔍 알림 데이터:', notificationData);
        console.log('🔍 환경:', __DEV__ ? 'development' : 'production');
        
        const notificationsRef = collection(this.db, 'notifications');
        const docRef = await addDoc(notificationsRef, {
          ...notificationData,
          timestamp: serverTimestamp(),
          isRead: false
        });
        
        console.log('✅ 알림 생성 완료 (시도:', retryCount + 1, ') - ID:', docRef.id);
        return { success: true, id: docRef.id };
        
      } catch (error) {
        retryCount++;
        console.error('❌ 알림 생성 실패 (시도:', retryCount, '):', error);
        console.error('❌ 에러 상세:', {
          code: error.code,
          message: error.message,
          environment: __DEV__ ? 'development' : 'production'
        });
        
        if (retryCount >= maxRetries) {
          console.error('❌ 최대 재시도 횟수 초과');
          throw error;
        }
        
        // 1초 대기 후 재시도
        console.log('⏳ 재시도 대기 중... (1초)');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async markNotificationAsRead(notificationId) {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log('🔍 FirestoreService.markNotificationAsRead 호출됨 (시도:', retryCount + 1, ')');
        console.log('🔍 알림 ID:', notificationId);
        console.log('🔍 환경:', __DEV__ ? 'development' : 'production');
        
        const notificationRef = doc(this.db, 'notifications', notificationId);
        await updateDoc(notificationRef, {
          isRead: true,
          readAt: serverTimestamp()
        });
        
        console.log('✅ 알림 읽음 처리 완료 (시도:', retryCount + 1, ')');
        return { success: true };
        
      } catch (error) {
        retryCount++;
        console.error('❌ 알림 읽음 처리 실패 (시도:', retryCount, '):', error);
        console.error('❌ 에러 상세:', {
          code: error.code,
          message: error.message,
          environment: __DEV__ ? 'development' : 'production'
        });
        
        if (retryCount >= maxRetries) {
          console.error('❌ 최대 재시도 횟수 초과');
          throw error;
        }
        
        // 1초 대기 후 재시도
        console.log('⏳ 재시도 대기 중... (1초)');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // 실시간 리스너 설정
  onEventsSnapshot(callback, filters = {}, errorCallback) {
    const eventsRef = collection(this.db, 'events');
    let eventsQuery = query(eventsRef, orderBy('createdAt', 'desc'));
    
    if (filters.organizerId) {
      eventsQuery = query(eventsRef, where('organizerId', '==', filters.organizerId));
    }
    
    return onSnapshot(eventsQuery, callback, errorCallback);
  }

  onPostsSnapshot(callback, filters = {}, errorCallback) {
    const postsRef = collection(this.db, 'posts');
    let postsQuery = query(postsRef, orderBy('createdAt', 'desc'));
    
    if (filters.category) {
      postsQuery = query(postsRef, where('category', '==', filters.category), orderBy('createdAt', 'desc'));
    }
    
    return onSnapshot(postsQuery, callback, errorCallback);
  }

  onNotificationsSnapshot(userId, callback, errorCallback) {
    console.log('🔍 onNotificationsSnapshot 호출됨:', userId);
    
    const notificationsRef = collection(this.db, 'notifications');
    const notificationsQuery = query(
      notificationsRef, 
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    return onSnapshot(notificationsQuery, callback, errorCallback);
  }

  onChatRoomsSnapshot(userId, callback, errorCallback) {
    console.log('🔍 onChatRoomsSnapshot 호출됨:', userId);
    
    const chatRoomsRef = collection(this.db, 'chatRooms');
    const chatQuery = query(
      chatRoomsRef, 
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc')
    );
    
    return onSnapshot(chatQuery, callback, errorCallback);
  }

  onChatMessagesSnapshot(chatRoomId, callback, errorCallback) {
    console.log('🔍 onChatMessagesSnapshot 호출됨:', chatRoomId);
    
    const messagesRef = collection(this.db, 'chatRooms', chatRoomId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
    
    return onSnapshot(messagesQuery, callback, errorCallback);
  }

  // 모임 종료 시 모든 관련 데이터 삭제
  async endEvent(eventId) {
    try {
      console.log('🔍 FirestoreService.endEvent 호출됨:', eventId);
      
      // 1. 해당 모임의 채팅방 찾기
      const chatRoomsRef = collection(this.db, 'chatRooms');
      const chatQuery = query(chatRoomsRef, where('eventId', '==', eventId));
      const chatSnapshot = await getDocs(chatQuery);
      
      if (!chatSnapshot.empty) {
        const chatRoom = chatSnapshot.docs[0];
        const chatRoomId = chatRoom.id;
        
        // 2. 채팅방의 모든 메시지 삭제
        const messagesRef = collection(this.db, 'chatRooms', chatRoomId, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);
        
        const messageDeletePromises = messagesSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        await Promise.all(messageDeletePromises);
        
        console.log(`✅ 채팅방 메시지 삭제 완료: ${messagesSnapshot.size}개 메시지`);
        
        // 3. 채팅방 문서 삭제
        await deleteDoc(chatRoom.ref);
        console.log('✅ 채팅방 문서 삭제 완료');
      }
      
      // 4. 모임 문서 삭제
      const eventRef = doc(this.db, 'events', eventId);
      await deleteDoc(eventRef);
      console.log('✅ 모임 문서 삭제 완료');
      
      return { success: true };
    } catch (error) {
      console.error('❌ 모임 종료 실패:', error);
      throw error;
    }
  }
}

const firestoreService = new FirestoreService();
export default firestoreService; 