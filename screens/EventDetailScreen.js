import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import { useGuide } from '../contexts/GuideContext';
import GuideOverlay from '../components/GuideOverlay';
import evaluationService from '../services/evaluationService';
import ENV from '../config/environment';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import firestoreService from '../services/firestoreService';

const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  SECONDARY: '#666666',
  BORDER: '#374151',
  ICON_DEFAULT: '#9CA3AF',
};

const EventDetailScreen = forwardRef(({ route, navigation, onBottomButtonPropsChange, embedInExternalScrollView = false }, ref) => {
  const { event: rawEvent, isJoined = false, currentScreen, isCreatedByMe: routeIsCreatedByMe, returnToScreen, evaluationCompleted = false } = route.params;
  // BottomSheet 내부에서 렌더링되는지 확인 (MapScreen에서 호출될 때)
  const isInBottomSheet = returnToScreen === 'MapScreen';
  // MapScreen 단일 BottomSheetScrollView 안에 넣을 때: 자체 스크롤뷰 없이 내용만 렌더
  const useExternalScrollView = isInBottomSheet && embedInExternalScrollView;
  const [isJoinedState, setIsJoinedState] = useState(isJoined);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [isEvaluationCompleted, setIsEvaluationCompleted] = useState(evaluationCompleted);
  const [isCheckingEvaluation, setIsCheckingEvaluation] = useState(false);
  const { user } = useAuth();
  const { endEvent, joinEvent, leaveEvent, allEvents, chatRooms } = useEvents();
  const { guideStates, currentGuide, currentStep, setCurrentGuide, setCurrentStep, completeGuide } = useGuide();
  
  // 6단계 가이드 관련 상태
  const [hasShownStep6Guide, setHasShownStep6Guide] = useState(false);
  
  // 6단계 가이드 정의
  const step6Guide = {
    id: 'endMeetingButton',
    title: '모임 종료하기',
    description: `러닝 모임이 끝나면 '종료하기' 버튼을 클릭하세요!\n 러닝매너를 작성할 수 있습니다.`,
    targetId: 'endMeetingButton',
    highlightShape: 'rectangle',
    showArrow: false,
    arrowDirection: 'up',
  };
  
  // EventDetailScreen에서는 6단계 가이드를 자동으로 시작하지 않음
  // 6단계는 ScheduleScreen에서 5단계 완료 후 자동으로 시작됨
  

  
  // 문자열로 받은 날짜를 Date 객체로 변환
  const event = {
    ...rawEvent,
    createdAt: rawEvent.createdAt && rawEvent.createdAt !== 'null' ? new Date(rawEvent.createdAt) : null,
    date: rawEvent.date && rawEvent.date !== 'null' ? new Date(rawEvent.date) : null,
    updatedAt: rawEvent.updatedAt && rawEvent.updatedAt !== 'null' ? new Date(rawEvent.updatedAt) : null
  };
  

  
  // 날짜 포맷팅 함수 추가
  const formatDate = (dateValue) => {
    if (!dateValue) return '날짜 없음';
    
    try {
      let date;
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        // ISO 형식 문자열인 경우
        if (dateValue.includes('T') || dateValue.includes('-')) {
          date = new Date(dateValue);
        } else {
          // 한국어 형식인 경우 (예: "2024년 1월 18일")
          const match = dateValue.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
          if (match) {
            const year = parseInt(match[1]);
            const month = parseInt(match[2]) - 1;
            const day = parseInt(match[3]);
            date = new Date(year, month, day);
          } else {
            return dateValue; // 파싱할 수 없는 경우 원본 반환
          }
        }
      } else {
        return '날짜 없음';
      }
      
      if (date && !isNaN(date.getTime())) {
        return date.toLocaleDateString('ko-KR');
      } else {
        return '날짜 없음';
      }
    } catch (error) {
      console.error('날짜 파싱 오류:', error);
      return '날짜 없음';
    }
  };
  
  // 내가 생성한 일정인지 확인 (route 파라미터 우선, 없으면 UID 비교 사용)
  const isCreatedByMe = routeIsCreatedByMe !== undefined ? routeIsCreatedByMe : (user && (
    (event.createdBy && user.uid === event.createdBy) || 
    (event.organizerId && user.uid === event.organizerId)
  ));


  // 현재 사용자가 모임의 참여자인지 확인
  const isCurrentUserParticipant = user && event.participants && Array.isArray(event.participants) && 
    event.participants.includes(user.uid);



  // 참여 상태 업데이트 (route 파라미터가 없으면 참여자 목록에서 확인)
  useEffect(() => {
    if (isJoined === undefined && isCurrentUserParticipant) {
      setIsJoinedState(true);
    }
  }, [isJoined, isCurrentUserParticipant]);

  // 평가 완료 상태 파라미터 처리
  useEffect(() => {
    if (evaluationCompleted) {
      setIsEvaluationCompleted(true);
    }
  }, [evaluationCompleted]);

  // 화면 포커스 시 평가 완료 상태 확인
  useFocusEffect(
    React.useCallback(() => {
      // 화면이 포커스될 때마다 평가 완료 상태를 다시 확인
      if (user?.uid && event.id && event.status === 'ended') {
        checkEvaluationStatus();
      }
    }, [user?.uid, event.id, event.status])
  );

  // 뒤로가기 시 이전 화면으로 복원
  useFocusEffect(
    React.useCallback(() => {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        // 뒤로가기 시 이전 화면 상태로 복원
        if (returnToScreen) {
          // 기본 뒤로가기 동작을 막고 직접 네비게이션
          e.preventDefault();
          navigation.navigate('ScheduleTab', { 
            returnToScreen: returnToScreen,
            forceScreenState: returnToScreen
          });
        }
      });

      return unsubscribe;
    }, [navigation, returnToScreen])
  );



  // 현재 사용자의 프로필 정보 가져오기
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      if (user?.uid) {
        try {
          const db = getFirestore();
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setCurrentUserProfile(userData);

          }
        } catch (error) {
          console.error('❌ EventDetailScreen - 현재 사용자 프로필 로드 실패:', error);
        }
      }
    };
    
    fetchCurrentUserProfile();
  }, [user?.uid]);

  // 평가 완료 여부 확인 함수
  const checkEvaluationStatus = async () => {
    if (!user?.uid || !event.id) {
      console.log('⚠️ checkEvaluationStatus - 필수 데이터 누락:', { 
        userId: user?.uid, 
        eventId: event.id 
      });
      return;
    }
    
    console.log('🔍 EventDetailScreen - 평가 완료 상태 확인 시작:', {
      eventId: event.id,
      userId: user.uid,
      eventTitle: event.title,
      organizer: event.organizer
    });
    
    setIsCheckingEvaluation(true);
    try {
      const completed = await evaluationService.isEvaluationCompleted(event.id, user.uid);
      console.log('🔍 EventDetailScreen - 평가 완료 상태 결과:', {
        eventId: event.id,
        userId: user.uid,
        completed
      });
      setIsEvaluationCompleted(completed);
    } catch (error) {
      console.error('❌ EventDetailScreen - 평가 완료 여부 확인 실패:', error);
      console.error('❌ 오류 상세:', {
        eventId: event.id,
        userId: user.uid,
        errorMessage: error.message,
        errorCode: error.code
      });
      setIsEvaluationCompleted(false);
    } finally {
      setIsCheckingEvaluation(false);
    }
  };

  // 평가 완료 상태 파라미터 처리
  useEffect(() => {
    if (evaluationCompleted) {
      setIsEvaluationCompleted(true);
    }
  }, [evaluationCompleted]);

  // 평가 완료 여부 확인 (파라미터가 없을 때만 Firebase 조회)
  useEffect(() => {
    if (!evaluationCompleted) {
      checkEvaluationStatus();
    }
  }, [user?.uid, event.id, evaluationCompleted]);

  // 종료된 모임 여부 확인 - status가 'ended'인 경우만
  const isEnded = event.status === 'ended';
  

  const getEventTypeEmoji = (type) => {
    const emojiMap = {
      '한강 러닝': '🏃‍♂️',
      '마라톤': '🏃‍♀️',
      '트레킹': '🥾',
      '자전거': '🚴‍♂️',
      '수영': '🏊‍♂️',
    };
    return emojiMap[type] || '🎯';
  };

  const getDifficultyColor = (difficulty) => {
    const colorMap = {
      '초급': '#C9CD8F',
      '중급': '#DAE26F',
      '고급': '#EEFF00',
    };
    return colorMap[difficulty] || '#666666';
  };

  const parseHashtags = (hashtagString) => {
    if (!hashtagString || !hashtagString.trim()) return [];
    
    const hashtags = hashtagString
      .split(/\s+/)
      .filter(tag => tag.startsWith('#') && tag.length > 1)
      .map(tag => tag.replace(/[^#\w가-힣]/g, '').replace(/^#/, ''))
      .slice(0, 5);
    
    return hashtags;
  };

  const handleJoinPress = useCallback(() => {
    if (isCreatedByMe) {
      // 내가 생성한 일정인 경우 종료하기
      Alert.alert(
        '모임 종료',
        `"${event.title}" 모임을 종료하시겠습니까?\n\n종료된 모임은 '종료된 모임'에서\n확인할 수 있습니다.`,
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '종료하기', 
            style: 'destructive',
            onPress: () => {
              // 모임 종료 (EventContext에서 알림 생성 포함)
              endEvent(event.id);
              Alert.alert('종료 완료', '모임이 종료되었습니다.\n러닝매너를 작성해보세요!');
              
              // 단순히 뒤로가기만 수행
              navigation.goBack();
            }
          },
        ]
      );
    } else if (isJoinedState) {
      // 참여한 모임에서 나가기
      Alert.alert(
        '모임 나가기',
        '이 모임에서 나가시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '나가기', 
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('🔍 EventDetailScreen - leaveEvent 호출 시작:', event.id);
                await leaveEvent(event.id);
                console.log('🔍 EventDetailScreen - leaveEvent 호출 완료:', event.id);
                setIsJoinedState(false);
                Alert.alert('나가기 완료', '모임에서 나갔습니다.');
              } catch (error) {
                console.error('❌ EventDetailScreen - leaveEvent 실패:', error);
                Alert.alert(
                  '나가기 실패',
                  '모임에서 나가기에 실패했습니다. 다시 시도해주세요.',
                  [{ text: '확인' }]
                );
              }
            }
          },
        ]
      );
    } else {
      // 모임 참여하기
      Alert.alert(
        '모임 참여',
        `"${event.title}" 모임에 참여하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '참여하기', 
            onPress: async () => {
              try {
                console.log('🔍 EventDetailScreen - joinEvent 호출 시작:', event.id);
                await joinEvent(event.id);
                console.log('🔍 EventDetailScreen - joinEvent 호출 완료:', event.id);
                setIsJoinedState(true);
                Alert.alert(
                  '참여 완료', 
                  '모임에 참여했습니다!\n채팅방에도 자동으로 입장되었습니다.\n채팅방으로 이동하시겠습니까?',
                  [
                    { text: '나중에', style: 'cancel' },
                    { 
                      text: '네', 
                      onPress: async () => {
                        try {
                          // 해당 모임의 채팅방 찾기 (로컬에서 먼저 확인)
                          let chatRoom = chatRooms.find(room => room.eventId === event.id);
                          
                          // 로컬에서 찾을 수 없는 경우 Firestore에서 직접 조회
                          if (!chatRoom) {
                            console.log('🔍 EventDetailScreen - 로컬에서 채팅방을 찾을 수 없음, Firestore에서 조회:', event.id);
                            
                            const { getFirestore, collection, query, where, getDocs } = await import('firebase/firestore');
                            const db = getFirestore();
                            const chatRoomsRef = collection(db, 'chatRooms');
                            const q = query(chatRoomsRef, where('eventId', '==', event.id));
                            const querySnapshot = await getDocs(q);
                            
                            if (!querySnapshot.empty) {
                              const chatRoomDoc = querySnapshot.docs[0];
                              chatRoom = { id: chatRoomDoc.id, ...chatRoomDoc.data() };
                              console.log('✅ EventDetailScreen - Firestore에서 채팅방 찾음:', chatRoom.id);
                            }
                          }
                          
                          if (chatRoom) {
                            console.log('✅ EventDetailScreen - 채팅방으로 직접 이동:', chatRoom.id);
                            // 채팅방으로 직접 이동
                            navigation.navigate('Chat', { 
                              chatRoom: chatRoom,
                              returnToCommunity: true
                            });
                          } else {
                            console.log('⚠️ EventDetailScreen - 채팅방을 찾을 수 없음, 커뮤니티 탭으로 이동');
                            // 채팅방을 찾을 수 없는 경우 커뮤니티 탭으로 이동
                            navigation.navigate('Main', { 
                              screen: 'CommunityTab',
                              params: { activeTab: '채팅' }
                            });
                          }
                        } catch (error) {
                          console.error('❌ EventDetailScreen - 채팅방 이동 실패:', error);
                          // 에러 발생 시 커뮤니티 탭으로 이동
                          navigation.navigate('Main', { 
                            screen: 'CommunityTab',
                            params: { activeTab: '채팅' }
                          });
                        }
                      }
                    }
                  ]
                );
              } catch (error) {
                console.error('❌ EventDetailScreen - joinEvent 실패:', error);
                Alert.alert(
                  '참여 실패',
                  '모임 참여에 실패했습니다. 다시 시도해주세요.',
                  [{ text: '확인' }]
                );
              }
            }
          },
        ]
      );
    }
  }, [
    isCreatedByMe,
    isJoinedState,
    event,
    endEvent,
    navigation,
    leaveEvent,
    joinEvent,
    chatRooms,
    user,
    setIsJoinedState
  ]);

  const handleParticipantPress = (participant) => {
    // 호스트가 현재 사용자인 경우 프로필 탭으로 이동
    if (participant.isHost && user && (
      user.displayName === participant.name || 
      user.email?.split('@')[0] === participant.name ||
      participant.name === '나'
    )) {
      navigation.navigate('ProfileTab');
    } else {
      // 다른 참여자인 경우 ParticipantScreen으로 이동
      navigation.navigate('Participant', { participant });
    }
  };

  const [participantsList, setParticipantsList] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // 참여자 목록 가져오기
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!event.participants || !Array.isArray(event.participants)) {
        return;
      }

      setLoadingParticipants(true);
      try {
        const participantsData = await Promise.all(
          event.participants.map(async (participantId, index) => {
            try {
              // Firestore에서 참여자 프로필 정보 가져오기
              const userProfile = await firestoreService.getUserProfile(participantId);
              
              const isHost = event.organizerId === participantId;
              const hostName = event.organizer || '알 수 없음';
              
              // file:// 로컬 경로는 타 사용자 기기에서 열 수 없어 제외
              const imageCandidates = [
                userProfile?.photoURL,
                userProfile?.profileImage,
                userProfile?.profile?.profileImage
              ];
              const profileImage = imageCandidates.find(
                (url) => typeof url === 'string' && url.startsWith('http')
              ) || null;
              
              
              return {
                id: participantId, // 실제 사용자 ID 사용
                name: isHost ? hostName : (userProfile?.profile?.nickname || userProfile?.displayName),
                profileImage: profileImage,
                instagramId: userProfile?.profile?.instagramId || userProfile?.instagramId || '',
                isHost: isHost,
                level: userProfile?.profile?.level || '초급',
                mannerScore: userProfile?.profile?.mannerScore || 5.0,
                totalParticipated: userProfile?.profile?.totalParticipated || 0,
                thisMonth: userProfile?.profile?.thisMonth || 0,
                hostedEvents: userProfile?.profile?.hostedEvents || 0,
                joinDate: event.createdAt ? new Date(event.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '.') : '날짜 없음',
                bio: userProfile?.profile?.bio || '자기소개를 입력해주세요.',
                runningProfile: userProfile?.profile || null,
                age: userProfile?.profile?.age || null,
                gender: userProfile?.gender || userProfile?.profile?.gender || null,
                userId: participantId
              };
            } catch (error) {
              return {
                id: participantId, // 실제 사용자 ID 사용
                name: null,
                profileImage: null,
                instagramId: '',
                isHost: event.organizerId === participantId,
                level: '초급',
                mannerScore: 5.0,
                totalParticipated: 0,
                thisMonth: 0,
                hostedEvents: 0,
                joinDate: '날짜 없음',
                bio: '자기소개를 입력해주세요.',
                runningProfile: null,
                age: null,
                gender: null,
                userId: participantId
              };
            }
          })
        );

        setParticipantsList(participantsData);
      } catch (error) {
        console.error('❌ 참여자 목록 로드 실패:', error);
      } finally {
        setLoadingParticipants(false);
      }
    };

    fetchParticipants();
  }, [event.id]);

  const renderParticipantsList = () => {
    if (loadingParticipants) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>참여자 목록을 불러오는 중...</Text>
        </View>
      );
    }

    if (participantsList.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>참여자가 없습니다.</Text>
        </View>
      );
    }

    return (
      <View style={styles.participantsGrid}>
        {participantsList.map((participant, index) => (
          <TouchableOpacity 
            key={participant.id} 
            style={styles.participantItem}
            onPress={() => handleParticipantPress(participant)}
            activeOpacity={0.7}
          >
            <View style={styles.participantAvatar}>
              {participant.profileImage && 
               participant.profileImage.trim() !== '' && 
               !participant.profileImage.startsWith('file://') ? (
                <Image 
                  source={{ uri: participant.profileImage }} 
                  style={styles.participantImage}
                  onError={(error) => {
                  }}
                  onLoad={() => {
                  }}
                />
              ) : (
                <View style={styles.participantImagePlaceholder}>
                  <Ionicons name="person" size={16} color="#ffffff" />
                </View>
              )}
            </View>
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>
                {participant.isHost ? `호스트: ${participant.name}` : participant.name}
              </Text>
              <Text style={styles.participantBio} numberOfLines={2}>
                {participant.bio}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const createInlineMapHTML = () => {
    let latitude, longitude;
    
    if (event.customMarkerCoords) {
      latitude = event.customMarkerCoords.lat || event.customMarkerCoords.latitude;
      longitude = event.customMarkerCoords.lng || event.customMarkerCoords.longitude;
    } else {
      latitude = 37.5172;
      longitude = 126.9881;
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">

          <title>한강 지도</title>
          <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${ENV.kakaoMapApiKey}"></script>
          <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                  background: #1F1F24; 
                  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                  overflow: hidden;
                  height: 180px;
              }
              #map { 
                  width: 100%; 
                  height: 180px; 
                  border: none;
                  border-radius: 12px;
              }
          </style>
      </head>
      <body>
          <div id="map"></div>
          <script>
              function sendMessage(message) {
                  if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage(message);
                  }
              }
              
              try {
                  sendMessage('🗺️ 스크립트 시작');
                  sendMessage('📍 좌표: ${latitude}, ${longitude}');
                  
                  if (typeof kakao === 'undefined') {
                      sendMessage('❌ Kakao SDK 로딩 실패');
                      throw new Error('Kakao SDK not loaded');
                  }
                  sendMessage('✅ Kakao SDK 확인됨');
                  
                  var container = document.getElementById('map');
                  if (!container) {
                      sendMessage('❌ 지도 컨테이너 없음');
                      throw new Error('Map container not found');
                  }
                  sendMessage('✅ 지도 컨테이너 확인됨');
                  
                  var options = {
                      center: new kakao.maps.LatLng(${latitude}, ${longitude}),
                      level: 3,
                      disableDoubleClick: true,
                      disableDoubleClickZoom: true
                  };
                  sendMessage('✅ 지도 옵션 설정됨');
                  
                  var map = new kakao.maps.Map(container, options);
                  sendMessage('✅ 지도 객체 생성됨');
                  
                  var customSvgString = '<svg width="28" height="35" viewBox="0 0 28 35" xmlns="http://www.w3.org/2000/svg">' +
                      '<path d="M14 0C6.3 0 0 6.3 0 14c0 8.4 14 21 14 21s14-12.6 14-21c0-7.7-6.3-14-14-14z" fill="#FF4444"/>' +
                      '<path d="M14 0C6.3 0 0 6.3 0 14c0 8.4 14 21 14 21s14-12.6 14-21c0-7.7-6.3-14-14-14z" fill="none" stroke="#ffffff" stroke-width="2"/>' +
                      '<circle cx="14" cy="14" r="7" fill="#ffffff"/>' +
                      '<circle cx="14" cy="14" r="4" fill="#FF4444"/>' +
                      '</svg>';
                  var imageSrc = 'data:image/svg+xml;base64,' + btoa(customSvgString);
                  var imageSize = new kakao.maps.Size(28, 35);
                  var imageOffset = new kakao.maps.Point(14, 35);
                  
                  var markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, { offset: imageOffset });
                  sendMessage('✅ 마커 이미지 생성됨');
                  
                  var markerPosition = new kakao.maps.LatLng(${latitude}, ${longitude});
                  var marker = new kakao.maps.Marker({
                      position: markerPosition,
                      image: markerImage
                  });
                  marker.setMap(map);
                  sendMessage('✅ 마커 배치됨');
                  
                  map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
                  sendMessage('✅ 지도 타입 설정됨');
                  
                  try {
                      map.removeControl(map.getZoomControl());
                      sendMessage('✅ 줌 컨트롤 제거됨');
                  } catch (e) {
                      sendMessage('⚠️ 줌 컨트롤 제거 실패: ' + e.message);
                  }
                  
                  sendMessage('🎉 지도 초기화 완료!');
                  
              } catch (error) {
                  sendMessage('🚨 지도 로딩 오류: ' + error.message);
              }
          </script>
      </body>
      </html>
    `;
  };

  // BottomSheet 내부에서는 View, 일반 화면에서는 SafeAreaView 사용
  const ContainerComponent = isInBottomSheet ? View : SafeAreaView;
  
  const handleEvaluationPress = useCallback(() => {
    const hostName = event.organizer || '알 수 없음';
    const currentParticipants = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1);
    
    const isCurrentUserHost = user && (
      user.displayName === hostName || 
      user.email?.split('@')[0] === hostName ||
      hostName === '나'
    );
    
    const hostParticipant = isCurrentUserHost ? {
      id: user.uid,
      name: user.displayName || user.email?.split('@')[0] || '나',
      profileImage: user.photoURL || null,
      isHost: true,
      role: 'host',
      bio: user.bio || '새벽 러닝의 매력을 알려드리는 코치입니다!'
    } : {
      id: event.organizerId,
      name: hostName,
      profileImage: null,
      isHost: true,
      role: 'host',
      bio: '새벽 러닝의 매력을 알려드리는 코치입니다!'
    };

    const actualParticipants = participantsList.length > 0 
      ? participantsList 
      : [hostParticipant];
    
    const serializableEvent = {
      ...event,
      date: event.date ? event.date.toISOString() : null,
      createdAt: event.createdAt ? event.createdAt.toISOString() : null,
      updatedAt: event.updatedAt ? event.updatedAt.toISOString() : null
    };
    
    navigation.navigate('RunningMeetingReview', { event: serializableEvent, participants: actualParticipants });
  }, [event, participantsList, navigation, user]);

  const bottomButtonProps = useMemo(() => ({
    event,
    user,
    isEnded,
    isEvaluationCompleted,
    isCreatedByMe,
    isJoinedState,
    participantsList,
    handleJoinPress,
    handleEvaluationPress,
    styles
  }), [event, user, isEnded, isEvaluationCompleted, isCreatedByMe, isJoinedState, participantsList, handleJoinPress, handleEvaluationPress, styles]);

  const lastBottomButtonSignatureRef = useRef(null);
  const bottomButtonSignature = useMemo(() => {
    const eventId = event?.id || '';
    const participantsCount = Array.isArray(participantsList) ? participantsList.length : 0;
    return [
      eventId,
      isEnded,
      isEvaluationCompleted,
      isCreatedByMe,
      isJoinedState,
      participantsCount
    ].join('|');
  }, [event?.id, isEnded, isEvaluationCompleted, isCreatedByMe, isJoinedState, participantsList]);

  // footer에서 사용할 props 전달 (BottomSheet 렌더 타이밍 보정)
  useEffect(() => {
    if (!isInBottomSheet || !onBottomButtonPropsChange) return;
    if (lastBottomButtonSignatureRef.current === bottomButtonSignature) return;
    lastBottomButtonSignatureRef.current = bottomButtonSignature;
    onBottomButtonPropsChange(bottomButtonProps);
  }, [isInBottomSheet, onBottomButtonPropsChange, bottomButtonSignature, bottomButtonProps]);

  // ref를 통해 하단 버튼 정보 노출
  useImperativeHandle(ref, () => ({
    getBottomButtonProps: () => bottomButtonProps
  }), [bottomButtonProps]);
  
  return (
    <ContainerComponent style={[styles.container, isInBottomSheet && styles.containerInSheet]}>
      {/* 6단계 가이드 오버레이 */}
      {currentGuide === 'meeting' && currentStep === 5 && (
        <GuideOverlay
          visible={true}
          title={step6Guide.title}
          description={step6Guide.description}
          targetPosition={
            step6Guide.highlightShape === 'none' ? null : 
            { x: Dimensions.get('window').width / 2, y: Dimensions.get('window').height - 50 }
          }
          targetSize={
            step6Guide.highlightShape === 'none' ? null : 
            { width: 370, height: 60 }
          }
          highlightShape={step6Guide.highlightShape}
          showArrow={step6Guide.showArrow}
          arrowDirection={step6Guide.arrowDirection}
          onNext={() => {
            completeGuide('meeting');
          }}
          isLastStep={true}
          targetId={step6Guide.targetId}
        />
      )}
      
      {isInBottomSheet ? (
        // BottomSheet 내부: useExternalScrollView면 상위 BottomSheetScrollView와 함께 스크롤, 아니면 자체 BottomSheetScrollView
        <View style={styles.bottomSheetContainer}>
          {/* 고정 영역: 헤더, 상세위치설명, 모임설명 (외부 스크롤 사용 시에도 함께 스크롤됨) */}
          <View style={styles.fixedHeaderSection}>
            {/* 헤더 */}
            <View style={[styles.header, styles.headerInSheet]}>
              <TouchableOpacity onPress={() => {
                navigation.goBack();
              }} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={1}>{event.title}</Text>
              <View style={styles.headerRightSection}>
                {event.difficulty && (
                  <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(event.difficulty) }]}>
                    <Text style={styles.difficultyText}>{event.difficulty}</Text>
                  </View>
                )}
                <View style={styles.typeContainer}>
                  <Text style={styles.typeText}>{event.type}</Text>
                </View>
              </View>
            </View>

            {/* 상세위치설명 - 헤더 아래 */}
            {event.customLocation && event.customLocation.trim() && (
              <View style={[styles.customLocationContainer, styles.customLocationContainerInSheet]}>
                <Text style={styles.customLocationText} numberOfLines={2}>
                  {event.customLocation}
                </Text>
              </View>
            )}

            {/* 모임설명 - 상세위치설명 아래 */}
            {event.description && event.description.trim() && (
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionText}>{event.description}</Text>
              </View>
            )}
          </View>

          {/* 스크롤 영역: 외부 스크롤 사용 시 View만, 아니면 BottomSheetScrollView */}
          {useExternalScrollView ? (
            <View style={[styles.scrollableSection, { paddingHorizontal: 10, paddingBottom: 120 }]}>
        {/* 기본 정보 */}
        <View style={styles.infoSection}>
          <View style={styles.infoGrid}>
            {/* 첫 번째 행: 날짜 | 시간 */}
            <View style={styles.infoGridRow}>
              <View style={styles.infoGridItem}>
                <Ionicons name="calendar" size={16} color={COLORS.ICON_DEFAULT} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>날짜</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(event.date)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoGridItem}>
                <Ionicons name="time" size={16} color={COLORS.ICON_DEFAULT} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>시간</Text>
                  <Text style={styles.infoValue}>{event.time}</Text>
                </View>
              </View>
            </View>

            {/* 구분선 */}
            <View style={styles.infoGridHorizontalDivider} />

            {/* 두 번째 행: 거리 | 페이스 */}
            <View style={styles.infoGridRow}>
              <View style={styles.infoGridItem}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>거리</Text>
                  <Text style={styles.infoValue}>{event.distance}km</Text>
                </View>
              </View>
              
              <View style={styles.infoGridItem}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>페이스</Text>
                  <Text style={styles.infoValue}>{event.pace}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 러닝 정보 - 해시태그만 */}
        {event.hashtags && parseHashtags(event.hashtags).length > 0 && (
          <View style={styles.runningInfoSection}>
            <Text style={styles.sectionTitle}>러닝 정보</Text>
            <View style={styles.hashtagContainer}>
              {parseHashtags(event.hashtags).map((tag, index) => (
                <View key={index} style={styles.hashtagBadge}>
                  <Text style={styles.hashtagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 참여자 정보 */}
        <View style={styles.participantsSection}>
          <Text style={styles.sectionTitle}>참여자</Text>
          <View style={styles.participantsInfo}>
            <Ionicons name="people" size={20} color={COLORS.ICON_DEFAULT} />
            <Text style={styles.participantsText}>
              {Array.isArray(event.participants) ? event.participants.length : (event.participants || 1)}명
              {event.maxParticipants ? ` / ${event.maxParticipants}명` : ' (제한 없음)'}
            </Text>
            {event.maxParticipants && (
              <View style={styles.participantsBar}>
                <View 
                  style={[
                    styles.participantsProgress, 
                    { width: `${Math.min((Array.isArray(event.participants) ? event.participants.length : (event.participants || 1)) / event.maxParticipants, 1) * 100}%` }
                  ]} 
                />
              </View>
            )}
          </View>
          
          {/* 참여자 목록 */}
          <View style={styles.participantsList}>
            {renderParticipantsList()}
          </View>
        </View>
            </View>
          ) : (
          <BottomSheetScrollView 
            style={styles.scrollableSection}
            contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 120 }}
            showsVerticalScrollIndicator={true}
          >
        {/* 기본 정보 */}
        <View style={styles.infoSection}>
          <View style={styles.infoGrid}>
            {/* 첫 번째 행: 날짜 | 시간 */}
            <View style={styles.infoGridRow}>
              <View style={styles.infoGridItem}>
                <Ionicons name="calendar" size={16} color={COLORS.ICON_DEFAULT} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>날짜</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(event.date)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoGridItem}>
                <Ionicons name="time" size={16} color={COLORS.ICON_DEFAULT} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>시간</Text>
                  <Text style={styles.infoValue}>{event.time}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoGridHorizontalDivider} />

            <View style={styles.infoGridRow}>
              <View style={styles.infoGridItem}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>거리</Text>
                  <Text style={styles.infoValue}>{event.distance}km</Text>
                </View>
              </View>
              
              <View style={styles.infoGridItem}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>페이스</Text>
                  <Text style={styles.infoValue}>{event.pace}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {event.hashtags && parseHashtags(event.hashtags).length > 0 && (
          <View style={styles.runningInfoSection}>
            <Text style={styles.sectionTitle}>러닝 정보</Text>
            <View style={styles.hashtagContainer}>
              {parseHashtags(event.hashtags).map((tag, index) => (
                <View key={index} style={styles.hashtagBadge}>
                  <Text style={styles.hashtagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.participantsSection}>
          <Text style={styles.sectionTitle}>참여자</Text>
          <View style={styles.participantsInfo}>
            <Ionicons name="people" size={20} color={COLORS.ICON_DEFAULT} />
            <Text style={styles.participantsText}>
              {Array.isArray(event.participants) ? event.participants.length : (event.participants || 1)}명
              {event.maxParticipants ? ` / ${event.maxParticipants}명` : ' (제한 없음)'}
            </Text>
            {event.maxParticipants && (
              <View style={styles.participantsBar}>
                <View 
                  style={[
                    styles.participantsProgress, 
                    { width: `${Math.min((Array.isArray(event.participants) ? event.participants.length : (event.participants || 1)) / event.maxParticipants, 1) * 100}%` }
                  ]} 
                />
              </View>
            )}
          </View>
          
          <View style={styles.participantsList}>
            {renderParticipantsList()}
          </View>
        </View>
          </BottomSheetScrollView>
          )}
        </View>
      ) : (
        // 일반 화면: 기존 구조 유지
        <>
          {/* 헤더 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => {
              navigation.goBack();
            }} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{event.title}</Text>
            <View style={styles.headerRightSection}>
              {event.difficulty && (
                <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(event.difficulty) }]}>
                  <Text style={styles.difficultyText}>{event.difficulty}</Text>
                </View>
              )}
              <View style={styles.typeContainer}>
                <Text style={styles.typeText}>{event.type}</Text>
              </View>
            </View>
          </View>

          {/* 상세위치설명 - 헤더 아래 */}
          {event.customLocation && event.customLocation.trim() && (
            <View style={styles.customLocationContainer}>
              <Text style={styles.customLocationText} numberOfLines={2}>
                {event.customLocation}
              </Text>
            </View>
          )}

          {/* 모임설명 - 상세위치설명 아래 */}
          {event.description && event.description.trim() && (
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{event.description}</Text>
            </View>
          )}

          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 65 }}
          >
            {/* 기본 정보 */}
            <View style={styles.infoSection}>
              <View style={styles.infoGrid}>
                {/* 첫 번째 행: 날짜 | 시간 */}
                <View style={styles.infoGridRow}>
                  <View style={styles.infoGridItem}>
                    <Ionicons name="calendar" size={16} color={COLORS.ICON_DEFAULT} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>날짜</Text>
                      <Text style={styles.infoValue}>
                        {formatDate(event.date)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.infoGridItem}>
                    <Ionicons name="time" size={16} color={COLORS.ICON_DEFAULT} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>시간</Text>
                      <Text style={styles.infoValue}>{event.time}</Text>
                    </View>
                  </View>
                </View>

                {/* 구분선 */}
                <View style={styles.infoGridHorizontalDivider} />

                {/* 두 번째 행: 거리 | 페이스 */}
                <View style={styles.infoGridRow}>
                  <View style={styles.infoGridItem}>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>거리</Text>
                      <Text style={styles.infoValue}>{event.distance}km</Text>
                    </View>
                  </View>
                  
                  <View style={styles.infoGridItem}>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>페이스</Text>
                      <Text style={styles.infoValue}>{event.pace}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* 러닝 정보 - 해시태그만 */}
            {event.hashtags && parseHashtags(event.hashtags).length > 0 && (
              <View style={styles.runningInfoSection}>
                <Text style={styles.sectionTitle}>러닝 정보</Text>
                <View style={styles.hashtagContainer}>
                  {parseHashtags(event.hashtags).map((tag, index) => (
                    <View key={index} style={styles.hashtagBadge}>
                      <Text style={styles.hashtagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 참여자 정보 */}
            <View style={styles.participantsSection}>
              <Text style={styles.sectionTitle}>참여자</Text>
              <View style={styles.participantsInfo}>
                <Ionicons name="people" size={20} color={COLORS.ICON_DEFAULT} />
                <Text style={styles.participantsText}>
                  {Array.isArray(event.participants) ? event.participants.length : (event.participants || 1)}명
                  {event.maxParticipants ? ` / ${event.maxParticipants}명` : ' (제한 없음)'}
                </Text>
                {event.maxParticipants && (
                  <View style={styles.participantsBar}>
                    <View 
                      style={[
                        styles.participantsProgress, 
                        { width: `${Math.min((Array.isArray(event.participants) ? event.participants.length : (event.participants || 1)) / event.maxParticipants, 1) * 100}%` }
                      ]} 
                    />
                  </View>
                )}
              </View>
              
              {/* 참여자 목록 */}
              <View style={styles.participantsList}>
                {renderParticipantsList()}
              </View>
            </View>
          </ScrollView>

          {/* 하단 버튼 */}
          <View style={styles.bottomActions}>
            {(() => {
              console.log('🔍 EventDetailScreen - 버튼 표시 조건 확인:', {
                eventId: event.id,
                eventTitle: event.title,
                isEnded,
                isEvaluationCompleted,
                isCheckingEvaluation,
                evaluationCompleted,
                isCreatedByMe,
                isJoinedState
              });
              return null;
            })()}
            {isEnded && !isEvaluationCompleted ? (
              <TouchableOpacity 
                style={[styles.actionButton, styles.endButton]} 
                onPress={() => {
                  // 참여자 목록 데이터 생성
                  const hostName = event.organizer || '알 수 없음';
                  const currentParticipants = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1);
                  
                  const isCurrentUserHost = user && (
                    user.displayName === hostName || 
                    user.email?.split('@')[0] === hostName ||
                    hostName === '나'
                  );
                  
                  const hostParticipant = isCurrentUserHost ? {
                    id: user.uid, // 실제 사용자 ID 사용
                    name: user.displayName || user.email?.split('@')[0] || '나',
                    profileImage: user.photoURL || null,
                    isHost: true,
                    role: 'host',
                    bio: user.bio || '새벽 러닝의 매력을 알려드리는 코치입니다!'
                  } : {
                    id: event.organizerId, // 실제 호스트 ID 사용
                    name: hostName,
                    profileImage: null,
                    isHost: true,
                    role: 'host',
                    bio: '새벽 러닝의 매력을 알려드리는 코치입니다!'
                  };

                  // 더미 데이터 제거 - 실제 참여자 데이터 사용

                  // 실제 모임 참여자 데이터 사용 (더미 데이터 대신)
                  const actualParticipants = participantsList.length > 0 
                    ? participantsList 
                    : [hostParticipant]; // 참여자 데이터가 없으면 호스트만
                  
                  console.log('🔍 EventDetailScreen - 러닝매너 작성 참여자 데이터:', {
                    eventId: event.id,
                    actualParticipantsCount: actualParticipants.length,
                    participantsListCount: participantsList.length,
                    actualParticipants: actualParticipants.map(p => ({ id: p.id, name: p.name, isHost: p.isHost }))
                  });
                  
                  // Date 객체를 문자열로 변환하여 직렬화 가능하게 만듦
                  const serializableEvent = {
                    ...event,
                    date: event.date ? event.date.toISOString() : null,
                    createdAt: event.createdAt ? event.createdAt.toISOString() : null,
                    updatedAt: event.updatedAt ? event.updatedAt.toISOString() : null
                  };
                  
                  navigation.navigate('RunningMeetingReview', { event: serializableEvent, participants: actualParticipants });
                }}
              >
                <Ionicons name="create-outline" size={24} color="#000000" />
                <Text style={[styles.actionButtonText, styles.endButtonText]}>러닝매너 작성하기</Text>
              </TouchableOpacity>
            ) : isEnded && isEvaluationCompleted ? (
              <View style={[styles.actionButton, styles.completedButton]}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.PRIMARY} />
                <Text style={[styles.actionButtonText, styles.completedButtonText]}>러닝매너 작성완료</Text>
              </View>
            ) : (
              <TouchableOpacity 
                id={isCreatedByMe ? 'endMeetingButton' : undefined}
                style={[
                  styles.actionButton, 
                  isCreatedByMe ? styles.endButton : (isJoinedState ? styles.leaveButton : styles.joinButton),
                  // 참여 마감된 경우 버튼 비활성화
                  !isCreatedByMe && !isJoinedState && (() => {
                    const currentParticipants = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1);
                    const maxParticipants = Number(event.maxParticipants);
                    const hasParticipantLimit = Number.isFinite(maxParticipants) && maxParticipants > 0;
                    const isFull = hasParticipantLimit && currentParticipants >= maxParticipants;
                    
                    // 디버깅 로그 추가
                    console.log('🔍 EventDetailScreen - 참여자 수 계산 (UI):', {
                      eventId: event.id,
                      participants: event.participants,
                      participantsType: typeof event.participants,
                      isArray: Array.isArray(event.participants),
                      currentParticipants,
                      maxParticipants,
                      isFull,
                      buttonDisabled: isFull
                    });
                    
                    return isFull ? styles.disabledButton : {};
                  })()
                ]} 
                onPress={handleJoinPress}
                // 참여 마감된 경우 버튼 비활성화
                disabled={!isCreatedByMe && !isJoinedState && (() => {
                  const currentParticipants = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1);
                  const maxParticipants = Number(event.maxParticipants);
                  const hasParticipantLimit = Number.isFinite(maxParticipants) && maxParticipants > 0;
                  return hasParticipantLimit && currentParticipants >= maxParticipants;
                })()}
              >
                {/* 참여 마감 시에는 아이콘을 표시하지 않음 */}
                {(() => {
                  const currentParticipants = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1);
                  const maxParticipants = Number(event.maxParticipants);
                  const hasParticipantLimit = Number.isFinite(maxParticipants) && maxParticipants > 0;
                  const isFull = hasParticipantLimit && currentParticipants >= maxParticipants;
                  
                  // 참여 마감된 경우 아이콘을 표시하지 않음
                  if (!isCreatedByMe && !isJoinedState && isFull) {
                    return null;
                  }
                  
                  // 참여 가능하거나 다른 상태인 경우 기존 아이콘 표시
                  return (
                    <Ionicons 
                      name={isCreatedByMe ? "checkmark-circle" : (isJoinedState ? "exit" : "add")} 
                      size={24} 
                      color={isCreatedByMe ? "#000000" : (isJoinedState ? COLORS.TEXT : "#000000")} 
                    />
                  );
                })()}
                <Text style={[
                  styles.actionButtonText, 
                  isCreatedByMe ? styles.endButtonText : (isJoinedState ? styles.leaveButtonText : styles.joinButtonText),
                  // 참여 마감된 경우 텍스트 스타일 변경
                  !isCreatedByMe && !isJoinedState && (() => {
                    const currentParticipants = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1);
                    const maxParticipants = Number(event.maxParticipants);
                    const hasParticipantLimit = Number.isFinite(maxParticipants) && maxParticipants > 0;
                    return hasParticipantLimit && currentParticipants >= maxParticipants ? styles.disabledButtonText : {};
                  })()
                ]}>
                  {isCreatedByMe ? '종료하기' : (isJoinedState ? '나가기' : (() => {
                    const currentParticipants = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1);
                    const maxParticipants = Number(event.maxParticipants);
                    const hasParticipantLimit = Number.isFinite(maxParticipants) && maxParticipants > 0;
                    return hasParticipantLimit && currentParticipants >= maxParticipants ? '마감되었습니다' : '참여하기';
                  })())}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </ContainerComponent>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    marginTop: -16, // 위로 올리기
  },
  containerInSheet: {
    // BottomSheet 내부: 배경색을 시트와 동일하게
    marginTop: 0,
    backgroundColor: COLORS.SURFACE,
  },
  bottomSheetContainer: {
    // BottomSheet 내부 컨테이너: flexbox 레이아웃
    flex: 1,
    flexDirection: 'column',
    backgroundColor: COLORS.SURFACE,
  },
  fixedHeaderSection: {
    // 고정 헤더 영역 (스크롤되지 않음)
    flexShrink: 0,
    backgroundColor: COLORS.SURFACE, // BottomSheet와 동일
  },
  headerInSheet: {
    backgroundColor: COLORS.SURFACE,
  },
  customLocationContainerInSheet: {
    backgroundColor: COLORS.SURFACE,
  },
  scrollableSection: {
    // 스크롤 가능한 영역 - 하단 버튼 공간 확보
    flex: 1,
    minHeight: 0,
  },
  fixedBottomSection: {
    // 고정 하단 버튼 영역 (스크롤되지 않음)
    flexShrink: 0,
    flexGrow: 0,
    minHeight: 70, // 최소 높이 보장
    zIndex: 10, // 다른 요소 위에 표시
    marginTop: 0, // 상단 여백 제거
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8, // 하단 여백 줄임
    backgroundColor: COLORS.BACKGROUND,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginLeft: 12,
    marginRight: 12,
  },
  customLocationContainer: {
    paddingHorizontal: 16,
    paddingTop: 0, // 상단 여백 제거
    paddingBottom: 4, // 하단 여백 줄임
    backgroundColor: COLORS.BACKGROUND,
  },
  customLocationText: {
    fontSize: 15,
    color: COLORS.PRIMARY,
    lineHeight: 21,
  },
  descriptionCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 10, // 러닝정보 카드와 동일한 좌우 여백
    marginTop: 4, // 상단 여백 줄임
    marginBottom: 12, // 하단 여백
  },
  descriptionText: {
    fontSize: 16,
    color: COLORS.TEXT,
    lineHeight: 24,
  },
  headerRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    flex: 1,
    padding: 10,
    backgroundColor: COLORS.BACKGROUND,
  },
  typeContainer: {
    backgroundColor: '#FF0073CC', // 구독서비스 하단버튼 색상 투명도 80% (CC = 204/255 ≈ 80%)
    paddingHorizontal: 12,
    paddingVertical: 5, // 위아래 여백 감소
    borderRadius: 20,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  infoSection: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12, // 모든 카드 사이 여백 통일
    marginHorizontal: 0, // ScrollView의 paddingHorizontal 사용
  },
  infoGrid: {
    flexDirection: 'column',
  },
  infoGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoGridItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoGridHorizontalDivider: {
    height: 1,
    width: '100%',
    backgroundColor: COLORS.BORDER,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  infoContent: {
    flex: 1,
    marginLeft: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.SECONDARY,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  infoDetailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginTop: 4,
  },
  inlineMapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  inlineMapWebView: {
    flex: 1,
  },
  runningInfoSection: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12, // 모든 카드 사이 여백 통일
    marginHorizontal: 0, // ScrollView의 paddingHorizontal 사용
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.SECONDARY,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.BORDER,
    marginHorizontal: 20,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  participantsSection: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12, // 모든 카드 사이 여백 통일
    marginHorizontal: 0, // ScrollView의 paddingHorizontal 사용
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantsText: {
    fontSize: 14,
    color: COLORS.TEXT,
    marginLeft: 8,
  },
  participantsBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.BORDER,
    borderRadius: 2,
    marginLeft: 12,
  },
  participantsProgress: {
    height: '100%',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 2,
  },
  participantsList: {
    marginTop: 8,
  },
  participantsGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
  },
  participantImage: {
    width: '100%',
    height: '100%',
  },
  participantImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  participantInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  participantInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  participantName: {
    fontSize: 14,
    color: COLORS.TEXT,
    fontWeight: '500',
    marginBottom: 4,
  },
  participantBio: {
    fontSize: 12,
    color: COLORS.SECONDARY,
    lineHeight: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  hashtagSection: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  hashtagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtagBadge: {
    backgroundColor: COLORS.PRIMARY + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hashtagText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  bottomActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.BACKGROUND,
    paddingHorizontal: 10, // 카드와 동일한 좌우 여백
    paddingTop: 12,
    paddingBottom: 22,
    borderTopWidth: 0.25,
    borderTopColor: '#333333',
  },
  bottomActionsInSheet: {
    // BottomSheet 내부에서는 absolute 제거, flexbox로 자연스럽게 하단 배치
    position: 'relative',
    width: '100%',
    backgroundColor: COLORS.SURFACE, // BottomSheet와 동일
    // 명시적으로 높이 보장
    minHeight: 70,
    paddingHorizontal: 10, // 카드와 동일한 좌우 여백
    paddingBottom: 22, // 하단 여백
    paddingTop: 0, // 상단 여백 제거 (ScrollView와 바로 연결)
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  joinButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  leaveButton: {
    backgroundColor: '#FF4444',
  },
  endButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedButton: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  completedButtonText: {
    color: COLORS.PRIMARY,
  },
  joinButtonText: {
    color: '#000000',
  },
  leaveButtonText: {
    color: COLORS.TEXT,
  },
  endButtonText: {
    color: '#000000',
  },
  disabledButton: {
    opacity: 0.7,
    backgroundColor: COLORS.BORDER,
    paddingVertical: 18, // 기본 16에서 18로 증가 (위아래 여백 추가)
  },
  disabledButtonText: {
    color: '#CCCCCC', // 더 밝은 회색으로 변경
  },
});

// 하단 버튼 컴포넌트를 별도로 export (BottomSheet footerComponent에서 사용)
export const EventDetailBottomButton = ({ 
  event, 
  user, 
  isEnded, 
  isEvaluationCompleted, 
  isCreatedByMe, 
  isJoinedState, 
  participantsList,
  onJoinPress,
  onEvaluationPress,
  navigation,
  styles: componentStyles
}) => {
  return (
    <View style={[componentStyles.bottomActions, componentStyles.bottomActionsInSheet]}>
      {isEnded && !isEvaluationCompleted ? (
        <TouchableOpacity 
          style={[componentStyles.actionButton, componentStyles.endButton]} 
          onPress={onEvaluationPress}
        >
          <Ionicons name="create-outline" size={24} color="#000000" />
          <Text style={[componentStyles.actionButtonText, componentStyles.endButtonText]}>러닝매너 작성하기</Text>
        </TouchableOpacity>
      ) : isEnded && isEvaluationCompleted ? (
        <View style={[componentStyles.actionButton, componentStyles.completedButton]}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.PRIMARY} />
          <Text style={[componentStyles.actionButtonText, componentStyles.completedButtonText]}>러닝매너 작성완료</Text>
        </View>
      ) : (
        <TouchableOpacity 
          id={isCreatedByMe ? 'endMeetingButton' : undefined}
          style={[
            componentStyles.actionButton, 
            isCreatedByMe ? componentStyles.endButton : (isJoinedState ? componentStyles.leaveButton : componentStyles.joinButton),
            !isCreatedByMe && !isJoinedState && (() => {
              const currentParticipants = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1);
              const maxParticipants = Number(event.maxParticipants);
              const hasParticipantLimit = Number.isFinite(maxParticipants) && maxParticipants > 0;
              const isFull = hasParticipantLimit && currentParticipants >= maxParticipants;
              return isFull ? componentStyles.disabledButton : {};
            })()
          ]} 
          onPress={onJoinPress}
          disabled={!isCreatedByMe && !isJoinedState && (() => {
            const currentParticipants = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1);
            const maxParticipants = Number(event.maxParticipants);
            const hasParticipantLimit = Number.isFinite(maxParticipants) && maxParticipants > 0;
            return hasParticipantLimit && currentParticipants >= maxParticipants;
          })()}
        >
          {(() => {
            const currentParticipants = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1);
            const maxParticipants = Number(event.maxParticipants);
            const hasParticipantLimit = Number.isFinite(maxParticipants) && maxParticipants > 0;
            const isFull = hasParticipantLimit && currentParticipants >= maxParticipants;
            
            if (!isCreatedByMe && !isJoinedState && isFull) {
              return null;
            }
            
            return (
              <Ionicons 
                name={isCreatedByMe ? "checkmark-circle" : (isJoinedState ? "exit" : "add")} 
                size={24} 
                color={isCreatedByMe ? "#000000" : (isJoinedState ? COLORS.TEXT : "#000000")} 
              />
            );
          })()}
          <Text style={[
            componentStyles.actionButtonText, 
            isCreatedByMe ? componentStyles.endButtonText : (isJoinedState ? componentStyles.leaveButtonText : componentStyles.joinButtonText),
            !isCreatedByMe && !isJoinedState && (() => {
              const currentParticipants = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1);
              const maxParticipants = Number(event.maxParticipants);
              const hasParticipantLimit = Number.isFinite(maxParticipants) && maxParticipants > 0;
              return hasParticipantLimit && currentParticipants >= maxParticipants ? componentStyles.disabledButtonText : {};
            })()
          ]}>
            {isCreatedByMe ? '종료하기' : (isJoinedState ? '나가기' : (() => {
              const currentParticipants = Array.isArray(event.participants) ? event.participants.length : (event.participants || 1);
              const maxParticipants = Number(event.maxParticipants);
              const hasParticipantLimit = Number.isFinite(maxParticipants) && maxParticipants > 0;
              return hasParticipantLimit && currentParticipants >= maxParticipants ? '마감되었습니다' : '참여하기';
            })())}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default EventDetailScreen; 