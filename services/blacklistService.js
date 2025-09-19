import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  updateDoc,
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firestoreService from './firestoreService';

class BlacklistService {
  constructor() {
    this.db = getFirestore();
    this.auth = getAuth();
  }

  // 사용자 차단 (양방향 차단)
  async blockUser(currentUserId, targetUserId, targetUserName, targetUserProfileImage) {
    try {
      console.log('🔍 BlacklistService.blockUser 호출됨:', {
        currentUserId,
        targetUserId,
        targetUserName,
        environment: __DEV__ ? 'development' : 'production'
      });

      // 1. 현재 사용자의 차단 목록 확인 (3명 제한)
      const currentBlacklist = await this.getBlacklist(currentUserId);
      if (currentBlacklist.length >= 3) {
        throw new Error('차단 가능한 사용자는 최대 3명입니다.');
      }

      // 2. 이미 차단된 사용자인지 확인
      const isAlreadyBlocked = currentBlacklist.some(blocked => blocked.blockedUserId === targetUserId);
      if (isAlreadyBlocked) {
        throw new Error('이미 차단된 사용자입니다.');
      }

      // 3. 양방향 차단 처리
      // 3-1. 현재 사용자의 블랙리스트에 대상 사용자 추가
      await this.addToBlacklist(currentUserId, targetUserId, targetUserName, targetUserProfileImage);
      
      // 3-2. 대상 사용자의 블랙리스트에 현재 사용자 추가
      const currentUser = this.auth.currentUser;
      const currentUserName = currentUser?.displayName || currentUser?.email?.split('@')[0] || '사용자';
      const currentUserProfileImage = currentUser?.photoURL || null;
      
      await this.addToBlacklist(targetUserId, currentUserId, currentUserName, currentUserProfileImage);

      // 4. 차단한 사용자가 대상 사용자와 함께 있는 모든 모임에서 자동 탈퇴
      await this.leaveEventsWithUser(currentUserId, targetUserId);

      console.log('✅ 사용자 차단 완료:', {
        currentUserId,
        targetUserId,
        environment: __DEV__ ? 'development' : 'production'
      });

      return { success: true };
    } catch (error) {
      console.error('❌ 사용자 차단 실패:', error);
      throw error;
    }
  }

  // 블랙리스트에 사용자 추가
  async addToBlacklist(userId, blockedUserId, blockedUserName, blockedUserProfileImage) {
    try {
      const blacklistRef = collection(this.db, 'users', userId, 'blacklist');
      await addDoc(blacklistRef, {
        blockedUserId,
        blockedUserName,
        blockedUserProfileImage,
        blockedAt: serverTimestamp(),
        isActive: true
      });
      
      console.log('✅ 블랙리스트에 사용자 추가 완료:', {
        userId,
        blockedUserId,
        blockedUserName
      });
    } catch (error) {
      console.error('❌ 블랙리스트 추가 실패:', error);
      throw error;
    }
  }

  // 사용자 차단 해제 (양방향 해제)
  async unblockUser(currentUserId, targetUserId) {
    try {
      console.log('🔍 BlacklistService.unblockUser 호출됨:', {
        currentUserId,
        targetUserId,
        environment: __DEV__ ? 'development' : 'production'
      });

      // 1. 양방향 차단 해제
      await this.removeFromBlacklist(currentUserId, targetUserId);
      await this.removeFromBlacklist(targetUserId, currentUserId);

      console.log('✅ 사용자 차단 해제 완료:', {
        currentUserId,
        targetUserId,
        environment: __DEV__ ? 'development' : 'production'
      });

      return { success: true };
    } catch (error) {
      console.error('❌ 사용자 차단 해제 실패:', error);
      throw error;
    }
  }

  // 블랙리스트에서 사용자 제거 (isActive를 false로 설정)
  async removeFromBlacklist(userId, blockedUserId) {
    try {
      const blacklistRef = collection(this.db, 'users', userId, 'blacklist');
      const q = query(blacklistRef, where('blockedUserId', '==', blockedUserId), where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      
      const updatePromises = querySnapshot.docs.map(doc => 
        updateDoc(doc.ref, { isActive: false })
      );
      await Promise.all(updatePromises);
      
      console.log('✅ 블랙리스트에서 사용자 제거 완료:', {
        userId,
        blockedUserId
      });
    } catch (error) {
      console.error('❌ 블랙리스트 제거 실패:', error);
      throw error;
    }
  }

  // 사용자의 블랙리스트 조회
  async getBlacklist(userId) {
    try {
      const blacklistRef = collection(this.db, 'users', userId, 'blacklist');
      const q = query(blacklistRef, where('isActive', '==', true), orderBy('blockedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const blacklist = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        blacklist.push({
          id: doc.id,
          ...data,
          blockedAt: data.blockedAt?.toDate?.() || data.blockedAt
        });
      });
      
      console.log('✅ 블랙리스트 조회 완료:', {
        userId,
        count: blacklist.length
      });
      
      return blacklist;
    } catch (error) {
      console.log('ℹ️ 블랙리스트 조회 실패 (빈 배열 반환):', error.message);
      // 블랙리스트 조회 실패 시 빈 배열 반환 (오류로 처리하지 않음)
      return [];
    }
  }

  // 사용자가 차단된 사용자인지 확인
  async isUserBlocked(currentUserId, targetUserId) {
    try {
      const blacklist = await this.getBlacklist(currentUserId);
      return blacklist.some(blocked => blocked.blockedUserId === targetUserId);
    } catch (error) {
      console.error('❌ 차단 상태 확인 실패:', error);
      return false;
    }
  }

  // 차단한 사용자가 대상 사용자와 함께 있는 모든 모임에서 자동 탈퇴
  async leaveEventsWithUser(currentUserId, targetUserId) {
    try {
      console.log('🔍 차단한 사용자의 모임 탈퇴 시작:', {
        currentUserId,
        targetUserId
      });

      // 1. 대상 사용자가 참여한 모든 모임 조회
      const eventsWithTargetUser = await this.getEventsWithParticipant(targetUserId);
      
      // 2. 차단한 사용자가 참여한 모임 중에서 대상 사용자와 함께 있는 모임 찾기
      const eventsToLeave = eventsWithTargetUser.filter(event => 
        event.participants && event.participants.includes(currentUserId)
      );

      console.log('🔍 탈퇴할 모임 목록:', {
        totalEvents: eventsToLeave.length,
        eventIds: eventsToLeave.map(e => e.id)
      });

      // 3. 해당 모임들에서 차단한 사용자만 탈퇴
      const leavePromises = eventsToLeave.map(event => 
        firestoreService.leaveEvent(event.id, currentUserId)
      );
      
      await Promise.all(leavePromises);

      console.log('✅ 차단한 사용자의 모임 탈퇴 완료:', {
        currentUserId,
        targetUserId,
        leftEventsCount: eventsToLeave.length
      });
    } catch (error) {
      console.error('❌ 모임 탈퇴 실패:', error);
      throw error;
    }
  }

  // 특정 사용자가 참여한 모든 모임 조회
  async getEventsWithParticipant(userId) {
    try {
      const eventsRef = collection(this.db, 'events');
      const q = query(eventsRef, where('participants', 'array-contains', userId));
      const querySnapshot = await getDocs(q);
      
      const events = [];
      querySnapshot.forEach((doc) => {
        const eventData = doc.data();
        events.push({
          id: doc.id,
          ...eventData,
          createdAt: eventData.createdAt?.toDate?.() || eventData.createdAt,
          updatedAt: eventData.updatedAt?.toDate?.() || eventData.updatedAt,
        });
      });
      
      return events;
    } catch (error) {
      console.error('❌ 사용자 참여 모임 조회 실패:', error);
      throw error;
    }
  }

  // 실시간 블랙리스트 리스너
  onBlacklistSnapshot(userId, callback, errorCallback) {
    console.log('🔍 onBlacklistSnapshot 호출됨:', userId);
    
    const blacklistRef = collection(this.db, 'users', userId, 'blacklist');
    const blacklistQuery = query(
      blacklistRef, 
      where('isActive', '==', true),
      orderBy('blockedAt', 'desc')
    );
    
    return onSnapshot(blacklistQuery, callback, errorCallback);
  }

  // 모임 목록에서 차단된 사용자 필터링
  filterEventsByBlacklist(events, blacklist) {
    if (!blacklist || blacklist.length === 0) {
      return events;
    }

    const blockedUserIds = blacklist.map(blocked => blocked.blockedUserId);
    
    return events.filter(event => {
      // 모임 참여자 중에 차단된 사용자가 있는지 확인
      const hasBlockedUser = event.participants?.some(participantId => 
        blockedUserIds.includes(participantId)
      );
      
      // 차단된 사용자가 있으면 모임을 숨김
      return !hasBlockedUser;
    });
  }
}

const blacklistService = new BlacklistService();
export default blacklistService;

