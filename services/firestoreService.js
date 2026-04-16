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
  increment,
  GeoPoint
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firestore } from '../config/firebase';
import getGeoFirestore from './geofirestoreService';

class FirestoreService {
  constructor() {
    // firebase.js에서 이미 생성한 firestore 인스턴스 재사용
    this.db = firestore;
    this.auth = getAuth();
  }

  // 로컬(file://) 경로는 다른 사용자 디바이스에서 열 수 없어 제외
  isRemoteImageUrl(url) {
    return typeof url === 'string' && url.startsWith('http');
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

  // 휴대전화번호 중복 체크 (회원가입용)
  async checkPhoneNumberAvailability(phoneNumber) {
    try {
      if (!phoneNumber) {
        return { available: false, reason: '휴대전화번호를 입력해주세요.' };
      }

      // 한국 전화번호를 국제 형식으로 변환 (010-1234-5678 → +821012345678)
      const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
      const fullPhoneNumber = `+82${cleanNumber}`;
      
      const usersRef = collection(this.db, 'users');
      
      // 두 가지 형식으로 모두 검색 (기존 데이터와 새 데이터 모두 고려)
      const queries = [
        query(usersRef, where('phoneNumber', '==', fullPhoneNumber)), // 국제 형식
        query(usersRef, where('phoneNumber', '==', phoneNumber))      // 한국 형식 (기존 데이터)
      ];
      
      // 두 쿼리를 병렬로 실행
      const [internationalQuerySnapshot, koreanQuerySnapshot] = await Promise.all([
        getDocs(queries[0]),
        getDocs(queries[1])
      ]);
      
      // 둘 중 하나라도 결과가 있으면 중복
      if (!internationalQuerySnapshot.empty || !koreanQuerySnapshot.empty) {
        return { available: false, reason: '이미 가입된 휴대전화번호입니다.' };
      } else {
        return { available: true, reason: '사용 가능한 휴대전화번호입니다.' };
      }
    } catch (error) {
      console.error('휴대전화번호 중복 체크 실패:', error);
      return { available: false, reason: '휴대전화번호 확인 중 오류가 발생했습니다.' };
    }
  }

  // 휴대전화번호 회원가입 여부 확인 (로그인용)
  async checkPhoneNumberExists(phoneNumber) {
    try {
      if (!phoneNumber) {
        return { exists: false, reason: '휴대전화번호를 입력해주세요.' };
      }

      // 한국 전화번호를 국제 형식으로 변환 (010-1234-5678 → +821012345678)
      const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
      const fullPhoneNumber = `+82${cleanNumber}`;
      
      const usersRef = collection(this.db, 'users');
      
      // 두 가지 형식으로 모두 검색 (기존 데이터와 새 데이터 모두 고려)
      const queries = [
        query(usersRef, where('phoneNumber', '==', fullPhoneNumber)), // 국제 형식
        query(usersRef, where('phoneNumber', '==', phoneNumber))      // 한국 형식 (기존 데이터)
      ];
      
      // 두 쿼리를 병렬로 실행
      const [internationalQuerySnapshot, koreanQuerySnapshot] = await Promise.all([
        getDocs(queries[0]),
        getDocs(queries[1])
      ]);
      
      // 둘 중 하나라도 결과가 있으면 회원가입된 번호
      if (!internationalQuerySnapshot.empty || !koreanQuerySnapshot.empty) {
        return { exists: true, reason: '회원가입된 휴대전화번호입니다.' };
      } else {
        return { exists: false, reason: '회원가입한 휴대전화번호가 아닙니다. 다시 확인해주세요.' };
      }
    } catch (error) {
      console.error('휴대전화번호 회원가입 여부 확인 실패:', error);
      return { exists: false, reason: '휴대전화번호 확인 중 오류가 발생했습니다.' };
    }
  }

  // 닉네임 중복 체크
  async checkNicknameAvailability(nickname, excludeUserId = null) {
    try {
      if (!nickname || nickname.trim().length < 2) {
        return { available: false, reason: '닉네임은 2자 이상이어야 합니다.' };
      }

      const usersRef = collection(this.db, 'users');
      const q = query(usersRef, where('profile.nickname', '==', nickname.trim()));
      const querySnapshot = await getDocs(q);

      // excludeUserId가 있으면 해당 사용자는 제외 (닉네임 수정 시 사용)
      const existingUsers = querySnapshot.docs.filter(doc => {
        if (excludeUserId && doc.id === excludeUserId) {
          return false; // 자신의 기존 닉네임은 제외
        }
        return true;
      });

      const isAvailable = existingUsers.length === 0;

      return {
        available: isAvailable,
        reason: isAvailable ? null : '이미 사용 중인 닉네임입니다.'
      };
    } catch (error) {
      return { available: false, reason: '닉네임 확인 중 오류가 발생했습니다.' };
    }
  }

  async getUserProfile(userId) {
    try {
      const userRef = doc(this.db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        // 프로필 이미지 URL 통합 처리 (원격 URL만 허용)
        const profileImageCandidates = [
          userData.profileImage,
          userData.profile?.profileImage,
          userData.photoURL
        ];
        const profileImage = profileImageCandidates.find((url) => this.isRemoteImageUrl(url)) || null;
        const photoURL = this.isRemoteImageUrl(userData.photoURL) ? userData.photoURL : null;
        
        // 기본 프로필 이미지는 서비스 레이어에서 강제하지 않음
        // UI 컴포넌트에서 아이콘 또는 로컬 기본 이미지를 처리하도록 null 유지
        
        
        // Firestore Timestamp 객체를 안전하게 처리
        return {
          ...userData,
          photoURL,
          profileImage: profileImage, // 통합된 프로필 이미지로 덮어쓰기
          createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
          onboardingCompletedAt: userData.onboardingCompletedAt?.toDate?.() || userData.onboardingCompletedAt,
        };
      } else {
        return null;
      }
    } catch (error) {
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
        // GeoFirestore 사용 (새 모임은 새 형식만 사용)
        const geofirestore = getGeoFirestore();
        const geocollection = geofirestore.collection('events');
        
        // customMarkerCoords가 있으면 GeoPoint로 변환하여 coordinates에 저장
        let coordinates = null;
        if (eventData.customMarkerCoords) {
          // lat/lng 또는 latitude/longitude 둘 다 지원
          const lat = eventData.customMarkerCoords.latitude || eventData.customMarkerCoords.lat;
          const lng = eventData.customMarkerCoords.longitude || eventData.customMarkerCoords.lng;
          
          if (lat != null && lng != null) {
            coordinates = new GeoPoint(lat, lng);
          } else {
            console.error('❌ customMarkerCoords에 유효한 좌표가 없습니다:', eventData.customMarkerCoords);
            throw new Error('유효한 좌표가 필요합니다.');
          }
        }
        
        // customMarkerCoords 제거하고 coordinates만 저장
        const { customMarkerCoords, ...eventDataWithoutCustomCoords } = eventData;
        
        // 저장할 데이터 로그 출력 (디버깅용)
        console.log('📝 저장할 이벤트 데이터:', {
          location: eventDataWithoutCustomCoords.location,
          customLocation: eventDataWithoutCustomCoords.customLocation,
          coordinates: coordinates ? { lat: coordinates.latitude, lng: coordinates.longitude } : null,
          title: eventDataWithoutCustomCoords.title,
          type: eventDataWithoutCustomCoords.type
        });
        
        const docRef = await geocollection.add({
          ...eventDataWithoutCustomCoords,
          coordinates: coordinates,  // GeoPoint로 저장 (새 필드)
          status: eventDataWithoutCustomCoords.status || 'active', // status 필드 명시적 설정
          // customMarkerCoords는 저장하지 않음 (새 모임은 새 형식만 사용)
          // GeoFirestore가 자동으로 'g', 'l' 필드 추가
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log('✅ 이벤트 저장 완료, ID:', docRef.id);
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

  // 종료되지 않은 모든 모임 조회 (반경 제한 없음)
  async getAllActiveEvents() {
    try {
      const eventsRef = collection(this.db, 'events');
      // status 필드가 없는 구버전 문서도 포함하기 위해 전체 조회 후 클라이언트 필터링
      const eventsQuery = query(eventsRef);
      
      const querySnapshot = await getDocs(eventsQuery);
      const events = [];
      querySnapshot.forEach((doc) => {
        const eventData = doc.data();
        const processedEvent = {
          id: doc.id,
          ...eventData,
          createdAt: eventData.createdAt?.toDate?.() || eventData.createdAt,
          updatedAt: eventData.updatedAt?.toDate?.() || eventData.updatedAt,
        };
        
        // 종료된 모임은 제외 (status가 없는 경우는 active로 간주)
        if (processedEvent.status === 'ended') {
          return;
        }

        // 디버깅: location 필드 확인
        if (!processedEvent.location) {
          console.warn('⚠️ location 필드가 없는 이벤트:', doc.id, processedEvent);
        }
        
        events.push(processedEvent);
      });
      
      // 클라이언트 측에서 생성일 기준 내림차순 정렬
      events.sort((a, b) => {
        const aDate = a.createdAt?.getTime?.() || 0;
        const bDate = b.createdAt?.getTime?.() || 0;
        return bDate - aDate;
      });
      
      console.log('✅ 전체 활성 모임 조회 완료:', events.length, '개');
      // 디버깅: location 필드가 있는 이벤트 수 확인
      const eventsWithLocation = events.filter(e => e.location);
      console.log('📍 location 필드가 있는 모임:', eventsWithLocation.length, '개');
      return events;
    } catch (error) {
      console.error('전체 활성 모임 조회 실패:', error);
      throw error;
    }
  }

  async joinEvent(eventId, userId) {
    try {
      // 1. 먼저 이벤트 정보를 가져와서 참여 가능 여부 확인
      const eventRef = doc(this.db, 'events', eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (!eventDoc.exists()) {
        throw new Error('이벤트를 찾을 수 없습니다.');
      }
      
      const eventData = eventDoc.data();
      const currentParticipants = Array.isArray(eventData.participants) ? eventData.participants.length : 0;
      const maxParticipants = Number(eventData.maxParticipants);
      const hasParticipantLimit = Number.isFinite(maxParticipants) && maxParticipants > 0;
      
      // 디버깅 로그 추가
      console.log('🔍 FirestoreService - 참여자 수 계산 (백엔드):', {
        eventId,
        userId,
        participants: eventData.participants,
        participantsType: typeof eventData.participants,
        isArray: Array.isArray(eventData.participants),
        currentParticipants,
        maxParticipants,
        canJoin: !hasParticipantLimit || currentParticipants < maxParticipants
      });
      
      // 2. 참여 가능 인원수 체크
      if (hasParticipantLimit && currentParticipants >= maxParticipants) {
        throw new Error('참여 가능 인원수가 마감되었습니다.');
      }
      
      // 3. 이미 참여한 사용자인지 확인
      if (Array.isArray(eventData.participants) && eventData.participants.includes(userId)) {
        throw new Error('이미 참여한 모임입니다.');
      }
      
      // 4. 참여자 추가
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
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // 모임 상태 업데이트
  async updateEventStatus(eventId, status) {
    try {
      const eventRef = doc(this.db, 'events', eventId);
      await updateDoc(eventRef, {
        status: status,
        updatedAt: serverTimestamp(),
        ...(status === 'ended' && { endedAt: serverTimestamp() })
      });
      
      console.log('✅ 모임 상태 업데이트 성공:', eventId, status);
      return { success: true };
    } catch (error) {
      console.error('❌ 모임 상태 업데이트 실패:', eventId, status, error);
      throw error;
    }
  }

  // 모임 생성
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

  // ========== GeoFirestore 반경 쿼리 함수 ==========
  
  /**
   * 두 좌표 간 거리 계산 (Haversine 공식)
   * @param {number} lat1 - 첫 번째 좌표의 위도
   * @param {number} lon1 - 첫 번째 좌표의 경도
   * @param {number} lat2 - 두 번째 좌표의 위도
   * @param {number} lon2 - 두 번째 좌표의 경도
   * @returns {number} 거리 (km)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 이벤트 좌표 추출 (하위 호환성 유지)
   * @param {Object} eventData - 이벤트 데이터
   * @returns {GeoPoint|null} GeoPoint 객체 또는 null
   */
  getEventCoordinates(eventData) {
    if (eventData.coordinates) {
      // GeoFirestore 형식 (새 모임, 우선)
      return eventData.coordinates;
    } else if (eventData.customMarkerCoords) {
      // 기존 형식 (기존 모임, 하위 호환)
      return new GeoPoint(
        eventData.customMarkerCoords.latitude,
        eventData.customMarkerCoords.longitude
      );
    }
    return null;
  }

  /**
   * 반경 내 모임 검색 (하위 호환성 포함)
   * 기존 모임(customMarkerCoords)과 새 모임(coordinates) 모두 검색
   * @param {number} latitude - 중심 위도
   * @param {number} longitude - 중심 경도
   * @param {number} radiusInKm - 반경 (km), 기본값 3km
   * @returns {Promise<Array>} 모임 배열
   */
  async getEventsNearbyHybrid(latitude, longitude, radiusInKm = 3) {
    try {
      console.log('🔍 getEventsNearbyHybrid 시작:', { latitude, longitude, radiusInKm });
      const nearbyEvents = [];

      // 1. GeoFirestore 쿼리 (새 모임 - coordinates 필드가 있는 모임)
      const geofirestore = getGeoFirestore();
      const geocollection = geofirestore.collection('events');
      const center = new GeoPoint(latitude, longitude);
      const geoQuery = geocollection.near({
        center: center,
        radius: radiusInKm
      });
      const geoSnapshot = await geoQuery.get();

      console.log('🔍 GeoFirestore 쿼리 결과:', geoSnapshot.size, '개');

      // GeoFirestore 결과 추가
      geoSnapshot.forEach((doc) => {
        const eventData = doc.data();
        console.log('🔍 GeoFirestore 모임:', doc.id, {
          hasCoordinates: !!eventData.coordinates,
          hasCustomMarkerCoords: !!eventData.customMarkerCoords,
          status: eventData.status,
          title: eventData.title
        });
        // 종료된 모임(status: 'ended')은 제외
        if (eventData.status !== 'ended') {
          nearbyEvents.push({ id: doc.id, ...eventData });
        }
      });

      // 2. 일반 Firestore 쿼리 (기존 모임 - customMarkerCoords만 있는 모임)
      // status 필드가 없는 구버전 문서도 포함하기 위해 전체 조회 후 필터링
      const eventsRef = collection(this.db, 'events');
      const eventsQuery = query(eventsRef);
      const allEventsSnapshot = await getDocs(eventsQuery);

      console.log('🔍 종료되지 않은 Firestore 모임 수:', allEventsSnapshot.size, '개');

      // 기존 모임 중 반경 내 모임 추가
      allEventsSnapshot.forEach((doc) => {
        const eventData = doc.data();
        if (eventData.status === 'ended') {
          return;
        }

        const hasCoordinates = !!eventData.coordinates;
        const hasCustomMarkerCoords = !!eventData.customMarkerCoords;
        
        console.log('🔍 Firestore 모임:', doc.id, {
          hasCoordinates,
          hasCustomMarkerCoords,
          status: eventData.status,
          title: eventData.title,
          customMarkerCoords: eventData.customMarkerCoords
        });
        
        // coordinates가 없고 customMarkerCoords만 있는 모임
        if (!hasCoordinates && hasCustomMarkerCoords) {
          const distance = this.calculateDistance(
            latitude,
            longitude,
            eventData.customMarkerCoords.latitude,
            eventData.customMarkerCoords.longitude
          );
          console.log('🔍 거리 계산:', doc.id, distance, 'km');
          if (distance <= radiusInKm) {
            nearbyEvents.push({ id: doc.id, ...eventData });
            console.log('✅ 반경 내 모임 추가:', doc.id);
          }
        }
      });

      console.log('✅ 최종 반경 내 모임 수:', nearbyEvents.length, '개');
      return nearbyEvents;
    } catch (error) {
      console.error('반경 내 모임 검색 실패:', error);
      throw error;
    }
  }

  /**
   * 반경 내 카페 검색
   * @param {number} latitude - 중심 위도
   * @param {number} longitude - 중심 경도
   * @param {number} radiusInKm - 반경 (km), 기본값 0.7km (700m)
   * @returns {Promise<Array>} 카페 배열
   */
  async getCafesNearby(latitude, longitude, radiusInKm = 0.7) {
    try {
      console.log('🔍 [getCafesNearby] 시작:', { latitude, longitude, radiusInKm });
      const geofirestore = getGeoFirestore();
      const geocollection = geofirestore.collection('cafes');
      const center = new GeoPoint(latitude, longitude);
      
      console.log('🔍 [getCafesNearby] GeoFirestore 컬렉션 준비 완료');
      
      const query = geocollection.near({
        center: center,
        radius: radiusInKm
      });
      
      console.log('🔍 [getCafesNearby] 쿼리 실행 중...');
      const snapshot = await query.get();
      const cafes = [];
      
      console.log('🔍 [getCafesNearby] GeoFirestore 쿼리 결과:', snapshot.size, '개');
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📍 [getCafesNearby] 카페 발견:', {
          id: doc.id,
          name: data.name,
          hasG: !!data.g,
          gType: typeof data.g,
          hasL: !!data.l,
          hasCoordinates: !!data.coordinates
        });
        cafes.push({ id: doc.id, ...data });
      });
      
      console.log('✅ [getCafesNearby] 반경 내 카페 수:', cafes.length, '개');
      return cafes;
    } catch (error) {
      // 권한 오류 또는 기타 오류 시 빈 배열 반환 (카페가 없을 수도 있음)
      console.error('❌ [getCafesNearby] 카페 검색 실패:', {
        errorCode: error.code,
        errorMessage: error.message,
        errorStack: error.stack,
        latitude,
        longitude,
        radiusInKm
      });
      
      if (error.code === 'permission-denied') {
        console.warn('⚠️ [getCafesNearby] 카페 검색 권한 오류:', error.message);
        return [];
      }
      // 다른 오류도 빈 배열 반환 (앱이 계속 작동하도록)
      return [];
    }
  }

  /**
   * 모든 카페 조회 (반경 제한 없음)
   * @returns {Promise<Array>} 카페 배열
   */
  async getAllCafes() {
    try {
      console.log('🔍 [getAllCafes] 모든 카페 조회 시작');
      
      // 일반 Firestore 쿼리로 모든 카페 가져오기
      const cafesRef = collection(this.db, 'cafes');
      const snapshot = await getDocs(cafesRef);
      const cafes = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        cafes.push({ id: doc.id, ...data });
      });
      
      console.log('✅ [getAllCafes] 모든 카페 조회 완료:', cafes.length, '개');
      return cafes;
    } catch (error) {
      console.error('❌ [getAllCafes] 카페 조회 실패:', {
        errorCode: error.code,
        errorMessage: error.message,
        errorStack: error.stack
      });
      
      if (error.code === 'permission-denied') {
        console.warn('⚠️ [getAllCafes] 카페 조회 권한 오류:', error.message);
        return [];
      }
      return [];
    }
  }

  /**
   * 카페 ID로 개별 조회 (최신 데이터)
   * @param {string} cafeId - 카페 ID
   * @returns {Promise<Object|null>} 카페 데이터
   */
  async getCafeById(cafeId) {
    try {
      console.log('🔍 [getCafeById] 카페 조회 시작:', cafeId);
      
      const cafeRef = doc(this.db, 'cafes', cafeId);
      const cafeDoc = await getDoc(cafeRef);
      
      if (!cafeDoc.exists()) {
        console.warn('⚠️ [getCafeById] 카페를 찾을 수 없음:', cafeId);
        return null;
      }
      
      const cafeData = {
        id: cafeDoc.id,
        ...cafeDoc.data()
      };
      
      console.log('✅ [getCafeById] 카페 조회 완료:', cafeData.name);
      return cafeData;
    } catch (error) {
      console.error('❌ [getCafeById] 카페 조회 실패:', {
        errorCode: error.code,
        errorMessage: error.message,
        cafeId
      });
      
      if (error.code === 'permission-denied') {
        console.warn('⚠️ [getCafeById] 카페 조회 권한 오류:', error.message);
        return null;
      }
      return null;
    }
  }

  /**
   * 신규 입점 카페 조회 (최근 1개월)
   * @param {number} maxCount - 최대 개수, 기본값 10
   * @returns {Promise<Array>} 카페 배열
   */
  async getNewCafes(maxCount = 10) {
    try {
      console.log('🔍 getNewCafes 시작');
      
      // 1개월 전 날짜 계산
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const cafesRef = collection(this.db, 'cafes');
      const q = query(
        cafesRef,
        where('createdAt', '>=', oneMonthAgo),
        orderBy('createdAt', 'desc'),
        limit(maxCount)
      );
      
      const snapshot = await getDocs(q);
      const cafes = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        cafes.push({
          id: doc.id,
          name: data.name || '알 수 없는 카페',
          location: data.address || data.location || '위치 정보 없음',
          representativeImage: data.representativeImage || data.images?.[0] || null,
          createdAt: data.createdAt,
        });
      });
      
      console.log('✅ 신규 카페 조회 완료:', cafes.length, '개');
      return cafes;
    } catch (error) {
      // 권한 오류 또는 기타 오류 시 빈 배열 반환
      if (error.code === 'permission-denied') {
        console.warn('⚠️ 신규 카페 조회 권한 오류 (카페가 없거나 권한 없음)');
        return [];
      }
      console.error('❌ 신규 카페 조회 실패:', error);
      return [];
    }
  }

  /**
   * 신규 입점 러닝푸드 조회 (최근 1개월)
   * @param {number} maxCount - 최대 개수, 기본값 10
   * @returns {Promise<Array>} 러닝푸드 배열
   */
  async getNewFoods(maxCount = 10) {
    try {
      console.log('🔍 getNewFoods 시작');

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const foodsRef = collection(this.db, 'foods');
      const q = query(
        foodsRef,
        where('createdAt', '>=', oneMonthAgo),
        orderBy('createdAt', 'desc'),
        limit(maxCount)
      );

      const snapshot = await getDocs(q);
      const foods = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        foods.push({
          id: doc.id,
          name: data.name || '알 수 없는 러닝푸드',
          location: data.address || data.location || '위치 정보 없음',
          representativeImage: data.representativeImage || data.images?.[0] || null,
          createdAt: data.createdAt,
        });
      });

      console.log('✅ 신규 러닝푸드 조회 완료:', foods.length, '개');
      return foods;
    } catch (error) {
      if (error.code === 'permission-denied') {
        console.warn('⚠️ 신규 러닝푸드 조회 권한 오류 (러닝푸드가 없거나 권한 없음)');
        return [];
      }
      console.error('❌ 신규 러닝푸드 조회 실패:', error);
      return [];
    }
  }

  /**
   * 모든 러닝푸드 조회 (반경 제한 없음)
   * @returns {Promise<Array>} 러닝푸드 배열
   */
  async getAllFoods() {
    try {
      console.log('🔍 [getAllFoods] 모든 러닝푸드 조회 시작');

      const foodsRef = collection(this.db, 'foods');
      const snapshot = await getDocs(foodsRef);
      const foods = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        foods.push({ id: doc.id, ...data });
      });

      console.log('✅ [getAllFoods] 모든 러닝푸드 조회 완료:', foods.length, '개');
      return foods;
    } catch (error) {
      console.error('❌ [getAllFoods] 러닝푸드 조회 실패:', {
        errorCode: error.code,
        errorMessage: error.message,
        errorStack: error.stack
      });

      if (error.code === 'permission-denied') {
        console.warn('⚠️ [getAllFoods] 러닝푸드 조회 권한 오류:', error.message);
        return [];
      }
      return [];
    }
  }

  /**
   * 러닝푸드 ID로 개별 조회 (최신 데이터)
   * @param {string} foodId - 러닝푸드 ID
   * @returns {Promise<Object|null>} 러닝푸드 데이터
   */
  async getFoodById(foodId) {
    try {
      console.log('🔍 [getFoodById] 러닝푸드 조회 시작:', foodId);

      const foodRef = doc(this.db, 'foods', foodId);
      const foodDoc = await getDoc(foodRef);

      if (!foodDoc.exists()) {
        console.warn('⚠️ [getFoodById] 러닝푸드를 찾을 수 없음:', foodId);
        return null;
      }

      const foodData = {
        id: foodDoc.id,
        ...foodDoc.data()
      };

      console.log('✅ [getFoodById] 러닝푸드 조회 완료:', foodData.name);
      return foodData;
    } catch (error) {
      console.error('❌ [getFoodById] 러닝푸드 조회 실패:', {
        errorCode: error.code,
        errorMessage: error.message,
        foodId
      });

      if (error.code === 'permission-denied') {
        console.warn('⚠️ [getFoodById] 러닝푸드 조회 권한 오류:', error.message);
        return null;
      }
      return null;
    }
  }

  /**
   * 모임/카페/러닝푸드 검색 (제목, 상호명, 태그)
   * @param {string} searchQuery - 검색어
   * @returns {Promise<Array>} 검색 결과 배열 (최대 5개)
   */
  async searchEventsAndCafes(searchQuery) {
    try {
      if (!searchQuery || searchQuery.trim().length === 0) {
        return [];
      }

      const queryLower = searchQuery.toLowerCase().trim();
      const results = [];

      // 1. 모임 검색 (제목, 태그)
      const eventsRef = collection(this.db, 'events');
      const eventsQuery = query(
        eventsRef,
        where('status', '!=', 'ended') // 종료된 모임 제외
      );
      const eventsSnapshot = await getDocs(eventsQuery);

      eventsSnapshot.forEach((doc) => {
        const data = doc.data();
        const titleMatch = data.title?.toLowerCase().includes(queryLower);
        const tagMatch = data.hashtags?.toLowerCase().includes(queryLower) || 
                        data.tags?.some(tag => tag.toLowerCase().includes(queryLower));
        
        if (titleMatch || tagMatch) {
          results.push({ 
            type: 'event', 
            id: doc.id, 
            ...data 
          });
        }
      });

      // 2. 카페 검색 (상호명)
      const cafesRef = collection(this.db, 'cafes');
      const cafesSnapshot = await getDocs(cafesRef);

      cafesSnapshot.forEach((doc) => {
        const data = doc.data();
        const nameMatch = data.name?.toLowerCase().includes(queryLower);
        
        if (nameMatch) {
          results.push({ 
            type: 'cafe', 
            id: doc.id, 
            ...data 
          });
        }
      });

      // 3. 러닝푸드 검색 (상호명)
      const foodsRef = collection(this.db, 'foods');
      const foodsSnapshot = await getDocs(foodsRef);

      foodsSnapshot.forEach((doc) => {
        const data = doc.data();
        const nameMatch = data.name?.toLowerCase().includes(queryLower);

        if (nameMatch) {
          results.push({
            type: 'food',
            id: doc.id,
            ...data
          });
        }
      });

      // 최대 5개 결과 반환
      return results.slice(0, 5);
    } catch (error) {
      // 권한 오류 또는 기타 오류 시 빈 배열 반환 (검색이 계속 진행되도록)
      if (error.code === 'permission-denied') {
        console.warn('⚠️ 모임/카페/러닝푸드 검색 권한 오류:', error.message);
        return [];
      }
      console.error('모임/카페/러닝푸드 검색 실패:', error);
      // 다른 오류도 빈 배열 반환하여 검색이 계속 진행되도록 함
      return [];
    }
  }

  // 모임 종료 시 상태를 'ended'로 변경 (채팅방 데이터 삭제)
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
        
        console.log('🔍 FirestoreService.endEvent - 채팅방 정보:', {
          chatRoomId,
          chatRoomData: chatRoom.data(),
          currentUser: this.auth.currentUser?.uid
        });
        
        // 2. 채팅방의 모든 메시지 삭제
        console.log('🔍 FirestoreService.endEvent - 채팅방 메시지 삭제 시작');
        const messagesRef = collection(this.db, 'chatRooms', chatRoomId, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);
        
        const deleteMessagePromises = messagesSnapshot.docs.map(messageDoc => 
          deleteDoc(messageDoc.ref)
        );
        await Promise.all(deleteMessagePromises);
        console.log('✅ 채팅방 메시지 삭제 완료');
        
        // 3. 채팅방 삭제
        console.log('🔍 FirestoreService.endEvent - 채팅방 삭제 시작');
        await deleteDoc(chatRoom.ref);
        console.log('✅ 채팅방 삭제 완료');
      } else {
        console.log('🔍 FirestoreService.endEvent - 해당 모임의 채팅방이 없음');
      }
      
      // 4. 모임 상태를 'ended'로 변경 (삭제 안함)
      console.log('🔍 FirestoreService.endEvent - 모임 상태 변경 시작');
      const eventRef = doc(this.db, 'events', eventId);
      await updateDoc(eventRef, {
        status: 'ended',
        endedAt: serverTimestamp()
      });
      console.log('✅ 모임 상태 변경 완료: ended');
      
      return { success: true };
    } catch (error) {
      console.error('❌ 모임 종료 실패:', error);
      console.error('❌ 모임 종료 실패 상세:', {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        currentUser: this.auth.currentUser?.uid,
        eventId
      });
      throw error;
    }
  }
}

const firestoreService = new FirestoreService();
export default firestoreService; 