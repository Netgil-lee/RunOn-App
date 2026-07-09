// ⚠️ APPLE 심사용 데모 모드 - 심사 완료 후 삭제 필요
// 제거 가이드: DEMO_MODE_REMOVAL_GUIDE.md 참조
// 
// Apple 심사용 샘플 데이터 생성 스크립트
// 커뮤니티 기능 테스트를 위한 샘플 게시글, 채팅방, 메시지 생성

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  setDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

// Firebase 설정 (실제 프로젝트 설정으로 교체 필요)
// 프로덕션 환경의 Firebase 설정을 직접 입력하세요
const firebaseConfig = {
  apiKey: "AIzaSyDq24FyKrDTtomyNMcC3gZB7eqpr0OGZCg",
  authDomain: "runon-production-app.firebaseapp.com",
  projectId: "runon-production-app",
  storageBucket: "runon-production-app.firebasestorage.app",
  messagingSenderId: "936820129286",
  appId: "1:936820129286:ios:1edd25b1f1cef603b14d87",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 데모 사용자 ID
const DEMO_USER_ID = 'demo-user-123456789';

// 샘플 게시글 데이터
const samplePosts = [
  {
    title: '한강공원 러닝 코스 추천해요! 🏃‍♀️',
    content: '안녕하세요! 한강공원에서 러닝을 시작한 지 3개월이 되었는데, 정말 좋은 코스들을 발견했어요. 특히 여의도한강공원에서 반포대교까지 이어지는 코스가 정말 좋습니다. 바람도 시원하고 경치도 좋아서 러닝하기 최고예요! 혹시 다른 좋은 코스 아시는 분 계신가요?',
    category: 'course',
    author: 'Apple 심사팀',
    authorId: DEMO_USER_ID,
    authorProfile: {
      displayName: 'Apple 심사팀',
      profileImage: null
    },
    isAnonymous: false,
    likes: [],
    comments: [
      {
        id: 'comment-1',
        author: '러너1',
        authorId: 'demo-user-2',
        content: '저도 그 코스 좋아해요! 특히 저녁에 달리면 한강 야경이 정말 예뻐요 🌃',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        likes: []
      }
    ],
    hashtags: ['#한강공원', '#러닝코스', '#추천'],
    location: '한강공원 🌉',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  },
  {
    title: '초보 러너를 위한 팁 공유 💪',
    content: '러닝을 시작한 지 얼마 안 된 초보 러너분들을 위해 팁을 공유하고 싶어요!\n\n1. 처음에는 무리하지 말고 천천히 시작하세요\n2. 적절한 러닝화를 신는 것이 중요해요\n3. 충분한 수분 섭취를 잊지 마세요\n4. 스트레칭은 필수입니다!\n\n다른 분들도 좋은 팁 있으면 공유해주세요!',
    category: 'tips',
    author: 'Apple 심사팀',
    authorId: DEMO_USER_ID,
    authorProfile: {
      displayName: 'Apple 심사팀',
      profileImage: null
    },
    isAnonymous: false,
    likes: ['demo-user-2', 'demo-user-3'],
    comments: [
      {
        id: 'comment-2',
        author: '러너2',
        authorId: 'demo-user-2',
        content: '정말 도움되는 팁이에요! 감사합니다 🙏',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        likes: []
      },
      {
        id: 'comment-3',
        author: '러너3',
        authorId: 'demo-user-3',
        content: '저도 초보인데 정말 유용해요!',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        likes: []
      }
    ],
    hashtags: ['#초보러너', '#러닝팁'],
    location: '전체',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  {
    title: '오늘 모임 후기 - 정말 즐거웠어요! 🎉',
    content: '오늘 아침 한강공원에서 진행된 러닝 모임에 참여했는데, 정말 즐거웠어요! 날씨도 좋고 함께 달리는 분들도 모두 친절하셔서 시간 가는 줄 몰랐습니다. 다음에도 꼭 참여하고 싶어요!',
    category: 'review',
    author: 'Apple 심사팀',
    authorId: DEMO_USER_ID,
    authorProfile: {
      displayName: 'Apple 심사팀',
      profileImage: null
    },
    isAnonymous: false,
    likes: ['demo-user-2'],
    comments: [],
    hashtags: ['#모임후기', '#한강공원'],
    location: '한강공원 🌉',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  },
  {
    title: '러닝화 추천 부탁드려요 👟',
    content: '러닝을 시작하려고 하는데 러닝화를 고르는 게 어렵네요. 발이 넓은 편이라서 신발 선택이 까다로운데, 좋은 러닝화 추천해주실 분 계신가요? 가격대는 10만원 이하로 생각하고 있어요.',
    category: 'gear',
    author: 'Apple 심사팀',
    authorId: DEMO_USER_ID,
    authorProfile: {
      displayName: 'Apple 심사팀',
      profileImage: null
    },
    isAnonymous: false,
    likes: [],
    comments: [
      {
        id: 'comment-4',
        author: '러너4',
        authorId: 'demo-user-4',
        content: '나이키 에어맥스 시리즈 추천드려요! 발이 넓으시면 와이드 모델도 있어요',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        likes: []
      }
    ],
    hashtags: ['#러닝화', '#추천'],
    location: '전체',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    title: '자유롭게 이야기해요 💬',
    content: '오늘 날씨가 정말 좋네요! 러닝하기 딱 좋은 날씨예요. 다들 오늘 러닝 하셨나요? 저는 아침에 한강공원에서 5km 달렸는데 정말 상쾌했어요!',
    category: 'free',
    author: 'Apple 심사팀',
    authorId: DEMO_USER_ID,
    authorProfile: {
      displayName: 'Apple 심사팀',
      profileImage: null
    },
    isAnonymous: false,
    likes: ['demo-user-2', 'demo-user-3', 'demo-user-4'],
    comments: [
      {
        id: 'comment-5',
        author: '러너5',
        authorId: 'demo-user-5',
        content: '저도 오늘 아침에 달렸어요! 날씨가 정말 좋았죠?',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        likes: []
      }
    ],
    hashtags: ['#자유토크'],
    location: '전체',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
  }
];

// 샘플 이벤트 데이터
const sampleEvents = [
  {
    title: '한강공원 아침 러닝 모임',
    description: '한강공원에서 함께 달려요! 초보자도 환영합니다.',
    location: '한강공원 🌉',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2일 후
    time: '오전 7:00',
    difficulty: '초급',
    maxParticipants: 10,
    participants: [DEMO_USER_ID, 'demo-user-2', 'demo-user-3'],
    organizerId: DEMO_USER_ID,
    organizer: 'Apple 심사팀',
    status: 'active',
    hashtags: '#한강공원 #아침러닝',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  {
    title: '올림픽공원 저녁 러닝',
    description: '올림픽공원에서 저녁에 함께 달려요!',
    location: '공원 🌳',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5일 후
    time: '오후 7:00',
    difficulty: '중급',
    maxParticipants: 8,
    participants: [DEMO_USER_ID, 'demo-user-4'],
    organizerId: 'demo-user-4',
    organizer: '러너4',
    status: 'active',
    hashtags: '#올림픽공원 #저녁러닝',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  }
];

// 샘플 채팅 메시지 데이터
const sampleMessages = [
  {
    text: '안녕하세요! 오늘 모임 참여하시는 분들 모두 환영합니다! 🎉',
    sender: 'Apple 심사팀',
    senderId: DEMO_USER_ID,
    senderProfileImage: null,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    isSystemMessage: false
  },
  {
    text: '네! 저도 참여할게요. 기대되네요!',
    sender: '러너2',
    senderId: 'demo-user-2',
    senderProfileImage: null,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
    isSystemMessage: false
  },
  {
    text: '저도 함께 달릴게요! 처음인데 괜찮을까요?',
    sender: '러너3',
    senderId: 'demo-user-3',
    senderProfileImage: null,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
    isSystemMessage: false
  },
  {
    text: '당연히 괜찮아요! 초보자도 환영합니다. 함께 즐겁게 달려요!',
    sender: 'Apple 심사팀',
    senderId: DEMO_USER_ID,
    senderProfileImage: null,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
    isSystemMessage: false
  },
  {
    text: '모임 장소는 한강공원 정문 맞죠?',
    sender: '러너2',
    senderId: 'demo-user-2',
    senderProfileImage: null,
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    isSystemMessage: false
  },
  {
    text: '네 맞습니다! 한강공원 정문에서 7시에 만나요!',
    sender: 'Apple 심사팀',
    senderId: DEMO_USER_ID,
    senderProfileImage: null,
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
    isSystemMessage: false
  }
];

async function createReviewSampleData() {
  try {
    console.log('🎯 Apple 심사용 샘플 데이터 생성 시작...');
    
    // 1. 샘플 게시글 생성
    console.log('\n📝 샘플 게시글 생성 중...');
    const postIds = [];
    for (const post of samplePosts) {
      const postRef = await addDoc(collection(db, 'posts'), {
        ...post,
        createdAt: Timestamp.fromDate(post.createdAt),
        updatedAt: Timestamp.fromDate(post.updatedAt)
      });
      postIds.push(postRef.id);
      console.log(`✅ 게시글 생성: ${post.title.substring(0, 30)}...`);
    }
    console.log(`✅ 총 ${postIds.length}개의 게시글 생성 완료`);
    
    // 2. 샘플 이벤트 생성
    console.log('\n📅 샘플 이벤트 생성 중...');
    const eventIds = [];
    for (const event of sampleEvents) {
      const eventRef = await addDoc(collection(db, 'events'), {
        ...event,
        date: Timestamp.fromDate(event.date),
        createdAt: Timestamp.fromDate(event.createdAt),
        updatedAt: Timestamp.fromDate(event.updatedAt)
      });
      eventIds.push(eventRef.id);
      console.log(`✅ 이벤트 생성: ${event.title}`);
    }
    console.log(`✅ 총 ${eventIds.length}개의 이벤트 생성 완료`);
    
    // 3. 샘플 채팅방 생성 (이벤트와 연결)
    console.log('\n💬 샘플 채팅방 생성 중...');
    const chatRoomIds = [];
    for (let i = 0; i < sampleEvents.length; i++) {
      const event = sampleEvents[i];
      const eventId = eventIds[i];
      
      const chatRoomRef = await addDoc(collection(db, 'chatRooms'), {
        eventId: eventId,
        title: event.title,
        lastMessage: sampleMessages[sampleMessages.length - 1].text,
        participants: event.participants,
        unreadCount: 0,
        type: '러닝모임',
        createdBy: event.organizerId,
        organizerId: event.organizerId,
        isCreatedByUser: event.organizerId === DEMO_USER_ID,
        status: 'active',
        createdAt: Timestamp.fromDate(event.createdAt),
        lastMessageTime: Timestamp.fromDate(new Date())
      });
      
      chatRoomIds.push(chatRoomRef.id);
      console.log(`✅ 채팅방 생성: ${event.title}`);
      
      // 4. 샘플 채팅 메시지 생성
      console.log(`   💬 채팅 메시지 생성 중...`);
      for (const message of sampleMessages) {
        await addDoc(collection(db, 'chatRooms', chatRoomRef.id, 'messages'), {
          ...message,
          timestamp: Timestamp.fromDate(message.timestamp)
        });
      }
      console.log(`   ✅ ${sampleMessages.length}개의 메시지 생성 완료`);
    }
    console.log(`✅ 총 ${chatRoomIds.length}개의 채팅방 생성 완료`);
    
    console.log('\n🎉 샘플 데이터 생성 완료!');
    console.log('\n📊 생성된 데이터 요약:');
    console.log(`- 게시글: ${postIds.length}개`);
    console.log(`- 이벤트: ${eventIds.length}개`);
    console.log(`- 채팅방: ${chatRoomIds.length}개`);
    console.log(`- 채팅 메시지: ${chatRoomIds.length * sampleMessages.length}개`);
    
    console.log('\n🎯 Apple 심사팀이 다음 정보로 테스트할 수 있습니다:');
    console.log('📱 휴대폰번호: 010-0000-0000');
    console.log('🔢 인증번호: 아무 숫자나 입력 (123456 등)');
    console.log('✅ 커뮤니티 탭에서 게시글과 채팅방을 확인할 수 있습니다.');
    
  } catch (error) {
    console.error('❌ 샘플 데이터 생성 실패:', error);
    throw error;
  }
}

// 스크립트 실행
// Node.js에서 직접 실행할 때
if (typeof require !== 'undefined' && require.main === module) {
  // CommonJS 환경
  createReviewSampleData()
    .then(() => {
      console.log('\n🎉 샘플 데이터 생성 스크립트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 스크립트 실행 실패:', error);
      process.exit(1);
    });
} else if (import.meta.url === `file://${process.argv[1]}`) {
  // ES Module 환경
  createReviewSampleData()
    .then(() => {
      console.log('\n🎉 샘플 데이터 생성 스크립트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export { createReviewSampleData };

