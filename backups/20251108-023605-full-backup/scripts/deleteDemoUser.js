// Apple 심사 완료 후 데모 사용자 데이터 삭제 스크립트
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';

// Firebase 설정 (실제 프로젝트 설정으로 교체 필요)
const firebaseConfig = {
  // 실제 Firebase 설정으로 교체
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DEMO_USER_ID = 'demo-user-123456789';

async function deleteDemoUser() {
  try {
    console.log('🗑️ Apple 심사용 데모 사용자 데이터 삭제 시작...');
    console.log('🎯 대상 사용자 ID:', DEMO_USER_ID);
    
    const batch = writeBatch(db);
    let deletedCount = 0;
    
    // 1. 사용자 데이터 삭제
    console.log('1️⃣ 사용자 데이터 삭제 중...');
    try {
      const userRef = doc(db, 'users', DEMO_USER_ID);
      await deleteDoc(userRef);
      deletedCount++;
      console.log('✅ 사용자 데이터 삭제 완료');
    } catch (error) {
      console.log('⚠️ 사용자 데이터가 이미 삭제되었거나 존재하지 않음');
    }
    
    // 2. 게시글 관련 데이터 삭제
    console.log('2️⃣ 게시글 관련 데이터 삭제 중...');
    
    // 2-1. 데모 사용자가 작성한 게시글 삭제
    const postsQuery = query(collection(db, 'posts'), where('authorId', '==', DEMO_USER_ID));
    const postsSnapshot = await getDocs(postsQuery);
    
    for (const postDoc of postsSnapshot.docs) {
      await deleteDoc(postDoc.ref);
      deletedCount++;
    }
    console.log(`✅ 작성한 게시글 ${postsSnapshot.docs.length}개 삭제 완료`);
    
    // 2-2. 데모 사용자가 좋아요한 게시글에서 좋아요 제거
    const allPostsQuery = query(collection(db, 'posts'));
    const allPostsSnapshot = await getDocs(allPostsQuery);
    
    for (const postDoc of allPostsSnapshot.docs) {
      const postData = postDoc.data();
      if (postData.likes && Array.isArray(postData.likes) && postData.likes.includes(DEMO_USER_ID)) {
        const updatedLikes = postData.likes.filter(id => id !== DEMO_USER_ID);
        batch.update(postDoc.ref, { likes: updatedLikes });
      }
      
      if (postData.comments && Array.isArray(postData.comments)) {
        const updatedComments = postData.comments.filter(comment => comment.authorId !== DEMO_USER_ID);
        if (updatedComments.length !== postData.comments.length) {
          batch.update(postDoc.ref, { comments: updatedComments });
        }
      }
    }
    console.log('✅ 좋아요 및 댓글 데이터 정리 완료');
    
    // 3. 모임 관련 데이터 삭제
    console.log('3️⃣ 모임 관련 데이터 삭제 중...');
    
    // 3-1. 데모 사용자가 호스트한 모임 삭제
    const eventsQuery = query(collection(db, 'events'), where('organizerId', '==', DEMO_USER_ID));
    const eventsSnapshot = await getDocs(eventsQuery);
    
    for (const eventDoc of eventsSnapshot.docs) {
      await deleteDoc(eventDoc.ref);
      deletedCount++;
    }
    console.log(`✅ 호스트한 모임 ${eventsSnapshot.docs.length}개 삭제 완료`);
    
    // 3-2. 데모 사용자가 참여한 모임에서 참여자 목록 제거
    const allEventsQuery = query(collection(db, 'events'));
    const allEventsSnapshot = await getDocs(allEventsQuery);
    
    for (const eventDoc of allEventsSnapshot.docs) {
      const eventData = eventDoc.data();
      if (eventData.participants && Array.isArray(eventData.participants) && eventData.participants.includes(DEMO_USER_ID)) {
        const updatedParticipants = eventData.participants.filter(id => id !== DEMO_USER_ID);
        batch.update(eventDoc.ref, { participants: updatedParticipants });
      }
    }
    console.log('✅ 참여한 모임에서 참여자 목록 제거 완료');
    
    // 4. 채팅 관련 데이터 삭제
    console.log('4️⃣ 채팅 관련 데이터 삭제 중...');
    
    // 4-1. 데모 사용자가 참여한 채팅방 찾기
    const chatRoomsQuery = query(collection(db, 'chatRooms'), where('participants', 'array-contains', DEMO_USER_ID));
    const chatRoomsSnapshot = await getDocs(chatRoomsQuery);
    
    for (const chatRoomDoc of chatRoomsSnapshot.docs) {
      // 채팅방의 메시지들 삭제
      const messagesQuery = query(collection(db, 'chatRooms', chatRoomDoc.id, 'messages'));
      const messagesSnapshot = await getDocs(messagesQuery);
      
      for (const messageDoc of messagesSnapshot.docs) {
        await deleteDoc(messageDoc.ref);
        deletedCount++;
      }
      
      // 채팅방 삭제
      await deleteDoc(chatRoomDoc.ref);
      deletedCount++;
    }
    console.log(`✅ 참여한 채팅방 ${chatRoomsSnapshot.docs.length}개 삭제 완료`);
    
    // 5. 평가 데이터 삭제
    console.log('5️⃣ 평가 데이터 삭제 중...');
    
    // 5-1. 데모 사용자가 평가한 데이터 삭제
    const evaluationsQuery = query(collection(db, 'evaluations'), where('evaluatorId', '==', DEMO_USER_ID));
    const evaluationsSnapshot = await getDocs(evaluationsQuery);
    
    for (const evaluationDoc of evaluationsSnapshot.docs) {
      await deleteDoc(evaluationDoc.ref);
      deletedCount++;
    }
    console.log(`✅ 평가한 데이터 ${evaluationsSnapshot.docs.length}개 삭제 완료`);
    
    // 5-2. 데모 사용자를 평가한 데이터 삭제
    const evaluatedQuery = query(collection(db, 'evaluations'), where('evaluations.' + DEMO_USER_ID, '!=', null));
    const evaluatedSnapshot = await getDocs(evaluatedQuery);
    
    for (const evaluationDoc of evaluatedSnapshot.docs) {
      const evaluationData = evaluationDoc.data();
      if (evaluationData.evaluations && evaluationData.evaluations[DEMO_USER_ID]) {
        delete evaluationData.evaluations[DEMO_USER_ID];
        batch.update(evaluationDoc.ref, { evaluations: evaluationData.evaluations });
      }
    }
    console.log('✅ 평가받은 데이터 정리 완료');
    
    // 6. 블랙리스트 데이터 삭제
    console.log('6️⃣ 블랙리스트 데이터 삭제 중...');
    
    const blacklistsQuery = query(collection(db, 'blacklists'), where('userId', '==', DEMO_USER_ID));
    const blacklistsSnapshot = await getDocs(blacklistsQuery);
    
    for (const blacklistDoc of blacklistsSnapshot.docs) {
      await deleteDoc(blacklistDoc.ref);
      deletedCount++;
    }
    console.log(`✅ 블랙리스트 데이터 ${blacklistsSnapshot.docs.length}개 삭제 완료`);
    
    // 7. 알림 데이터 삭제
    console.log('7️⃣ 알림 데이터 삭제 중...');
    
    const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', DEMO_USER_ID));
    const notificationsSnapshot = await getDocs(notificationsQuery);
    
    for (const notificationDoc of notificationsSnapshot.docs) {
      await deleteDoc(notificationDoc.ref);
      deletedCount++;
    }
    console.log(`✅ 알림 데이터 ${notificationsSnapshot.docs.length}개 삭제 완료`);
    
    // 8. 배치 업데이트 실행
    console.log('8️⃣ 배치 업데이트 실행 중...');
    await batch.commit();
    console.log('✅ 배치 업데이트 완료');
    
    console.log('🎉 데모 사용자 데이터 삭제 완료!');
    console.log('📊 삭제된 데이터 통계:');
    console.log(`- 총 삭제된 문서: ${deletedCount}개`);
    console.log(`- 사용자 데이터: 1개`);
    console.log(`- 게시글: ${postsSnapshot.docs.length}개`);
    console.log(`- 모임: ${eventsSnapshot.docs.length}개`);
    console.log(`- 채팅방: ${chatRoomsSnapshot.docs.length}개`);
    console.log(`- 평가 데이터: ${evaluationsSnapshot.docs.length}개`);
    console.log(`- 블랙리스트: ${blacklistsSnapshot.docs.length}개`);
    console.log(`- 알림: ${notificationsSnapshot.docs.length}개`);
    
    console.log('\n✅ Apple 심사용 데모 데이터가 완전히 삭제되었습니다.');
    console.log('🔒 이제 프로덕션 환경이 깨끗해졌습니다.');
    
  } catch (error) {
    console.error('❌ 데모 사용자 데이터 삭제 실패:', error);
    throw error;
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  deleteDemoUser()
    .then(() => {
      console.log('🎉 데모 데이터 삭제 스크립트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export { deleteDemoUser };
