// 기존 채팅 메시지의 sender 필드를 수정하는 스크립트
// 사용법: node scripts/fixChatSenderNames.js

import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

// Firebase 설정 (실제 프로젝트의 config 사용)
const firebaseConfig = {
  // 여기에 실제 Firebase 설정을 넣으세요
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixChatSenderNames() {
  try {
    console.log('🔧 채팅 메시지 sender 필드 수정 시작...');
    
    // 모든 채팅방 조회
    const chatRoomsRef = collection(db, 'chatRooms');
    const chatRoomsSnapshot = await getDocs(chatRoomsRef);
    
    let totalFixed = 0;
    
    for (const chatRoomDoc of chatRoomsSnapshot.docs) {
      const chatRoom = chatRoomDoc.data();
      console.log(`🔍 채팅방 확인: ${chatRoom.title} (${chatRoom.id})`);
      
      // 각 채팅방의 메시지 하위 컬렉션 조회
      const messagesRef = collection(db, 'chatRooms', chatRoomDoc.id, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      
      for (const messageDoc of messagesSnapshot.docs) {
        const message = messageDoc.data();
        
        // sender가 '나'인 메시지 찾기
        if (message.sender === '나') {
          console.log(`⚠️ '나'로 설정된 메시지 발견: ${message.text.substring(0, 20)}...`);
          
          try {
            // 사용자 프로필에서 실제 이름 가져오기
            const userRef = doc(db, 'users', message.senderId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              const userData = userSnap.data();
              const realName = userData.profile?.nickname || 
                              userData.displayName || 
                              userData.email?.split('@')[0] || 
                              '사용자';
              
              // 메시지 sender 필드 업데이트
              await updateDoc(messageDoc.ref, {
                sender: realName
              });
              
              console.log(`✅ 메시지 sender 수정: '나' → '${realName}'`);
              totalFixed++;
            } else {
              console.log(`⚠️ 사용자 프로필을 찾을 수 없음: ${message.senderId}`);
            }
          } catch (error) {
            console.error(`❌ 메시지 수정 실패: ${messageDoc.id}`, error);
          }
        }
      }
    }
    
    console.log(`🎉 완료! 총 ${totalFixed}개의 메시지 sender 필드를 수정했습니다.`);
    
  } catch (error) {
    console.error('❌ 스크립트 실행 실패:', error);
  }
}

// 스크립트 실행
fixChatSenderNames();
