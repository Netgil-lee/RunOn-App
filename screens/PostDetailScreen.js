import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  Keyboard,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCommunity } from '../contexts/CommunityContext';
import { useAuth } from '../contexts/AuthContext';
import { formatRelativeTime } from '../utils/timestampUtils';
import reportService from '../services/reportService';
import contentFilterService from '../services/contentFilterService';
import blacklistService from '../services/blacklistService';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

const PostDetailScreen = ({ route, navigation }) => {
  const { post } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { toggleLike, addComment, updateComment, deleteComment, updatePost, deletePost } = useCommunity();
  
  // 안전한 데이터 처리 - post가 없거나 잘못된 경우 처리
  const safePost = post || {};
  
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(safePost.likes?.length || 0);
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState(safePost.comments || []);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showCommentMenuModal, setShowCommentMenuModal] = useState(false);
  const [showCommentEditModal, setShowCommentEditModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [showPostReportModal, setShowPostReportModal] = useState(false);
  const [showCommentReportModal, setShowCommentReportModal] = useState(false);
  
  // 모달 오버레이 페이드 애니메이션
  const menuModalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const commentMenuModalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const commentEditModalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const postReportModalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const commentReportModalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const [selectedReportReason, setSelectedReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [shouldBlockPostAuthor, setShouldBlockPostAuthor] = useState(false);
  const [shouldBlockCommentAuthor, setShouldBlockCommentAuthor] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [currentPost, setCurrentPost] = useState({
    id: safePost.id || '',
    title: safePost.title || '',
    content: safePost.content || '',
    author: safePost.author || '작성자',
    authorId: safePost.authorId || '',
    createdAt: safePost.createdAt || new Date().toISOString(),
    category: safePost.category || 'free',
    isAnonymous: safePost.isAnonymous || false,
    likes: Array.isArray(safePost.likes) ? safePost.likes : [],
    comments: Array.isArray(safePost.comments) ? safePost.comments : [],
    images: Array.isArray(safePost.images) ? safePost.images : [],
    hashtags: safePost.hashtags || [],
    location: safePost.location || ''
  });

  // 작성자 프로필 정보 상태
  const [authorProfile, setAuthorProfile] = useState(null);
  
  // 차단된 사용자 목록 상태
  const [blacklist, setBlacklist] = useState([]);

  // 디버깅 로그 (필요시에만 활성화)
  // console.log('🔍 PostDetailScreen - 받은 post 데이터:', post);
  // console.log('🔍 PostDetailScreen - 안전 처리된 post:', safePost);

  // 차단된 사용자 목록 가져오기
  useEffect(() => {
    if (!user) {
      setBlacklist([]);
      return;
    }

    const fetchBlacklist = async () => {
      try {
        const blacklistData = await blacklistService.getBlacklist(user.uid);
        setBlacklist(blacklistData);
      } catch (error) {
        console.error('차단 목록 조회 실패:', error);
        setBlacklist([]);
      }
    };

    fetchBlacklist();
  }, [user]);

  // 모달 애니메이션 효과
  useEffect(() => {
    if (showMenuModal) {
      Animated.timing(menuModalBackdropOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(menuModalBackdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showMenuModal, menuModalBackdropOpacity]);

  useEffect(() => {
    if (showCommentMenuModal) {
      Animated.timing(commentMenuModalBackdropOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(commentMenuModalBackdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showCommentMenuModal, commentMenuModalBackdropOpacity]);

  useEffect(() => {
    if (showCommentEditModal) {
      Animated.timing(commentEditModalBackdropOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(commentEditModalBackdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showCommentEditModal, commentEditModalBackdropOpacity]);

  useEffect(() => {
    if (showPostReportModal) {
      Animated.timing(postReportModalBackdropOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(postReportModalBackdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showPostReportModal, postReportModalBackdropOpacity]);

  useEffect(() => {
    if (showCommentReportModal) {
      Animated.timing(commentReportModalBackdropOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(commentReportModalBackdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showCommentReportModal, commentReportModalBackdropOpacity]);

  // 차단된 사용자의 게시글이면 뒤로 가기
  useEffect(() => {
    if (!user || !currentPost.authorId || blacklist.length === 0) return;

    const blockedUserIds = blacklist.map(blocked => blocked.blockedUserId);
    if (blockedUserIds.includes(currentPost.authorId)) {
      Alert.alert(
        '차단된 사용자',
        '차단한 사용자의 게시글은 볼 수 없습니다.',
        [
          {
            text: '확인',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  }, [currentPost.authorId, blacklist, user, navigation]);

  // 작성자 프로필 정보 가져오기
  useEffect(() => {
    const fetchAuthorProfile = async () => {
      if (!currentPost.authorId || currentPost.isAnonymous) {
        return;
      }

      try {
        const firestoreService = require('../services/firestoreService').default;
        const userProfile = await firestoreService.getUserProfile(currentPost.authorId);
        
        if (userProfile) {
          setAuthorProfile({
            displayName: userProfile.displayName || userProfile.profile?.nickname || '사용자',
            profileImage: userProfile.photoURL || userProfile.profileImage || null
          });
        }
      } catch (error) {
        console.error('작성자 프로필 가져오기 실패:', error);
      }
    };

    fetchAuthorProfile();
  }, [currentPost.authorId, currentPost.isAnonymous]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      // Firebase Timestamp 객체인 경우
      if (dateString && typeof dateString === 'object' && dateString.seconds) {
        return formatRelativeTime(dateString);
      }
      
      // 일반 날짜 문자열인 경우
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // 유효하지 않은 날짜인 경우 원본 반환
      }
      
      return formatRelativeTime(date);
    } catch (error) {
      console.warn('날짜 변환 오류:', error);
      return dateString;
    }
  };

  // 해시태그 파싱 함수
  const parseHashtags = (hashtagString) => {
    // undefined, null, 빈 문자열 체크
    if (!hashtagString) return [];
    
    // 이미 배열인 경우 그대로 반환
    if (Array.isArray(hashtagString)) {
      return hashtagString;
    }
    
    // 문자열이 아닌 경우 빈 배열 반환
    if (typeof hashtagString !== 'string') {
      console.warn('⚠️ hashtagString이 문자열이 아님:', hashtagString);
      return [];
    }
    
    // trim() 함수가 없는 경우 처리
    if (typeof hashtagString.trim !== 'function') {
      console.warn('⚠️ hashtagString.trim이 함수가 아님:', hashtagString);
      return [];
    }
    
    if (!hashtagString.trim()) return [];
    
    // 문자열인 경우 파싱
    const hashtags = hashtagString
      .split(/\s+/)
      .filter(tag => tag.startsWith('#') && tag.length > 1)
      .map(tag => {
        const cleanTag = tag.replace(/[^#\w가-힣]/g, '');
        const tagWithoutHash = cleanTag.replace(/^#+/, '');
        return tagWithoutHash;
      });
    
    return hashtags;
  };

  const getCategoryName = (categoryId) => {
    const categoryMap = {
      'free': '자유토크',
      'tips': '러닝 팁',
      'review': '모임 후기',
      'question': '질문답변',
      'course': '코스 추천',
      'gear': '러닝 용품',
    };
    return categoryMap[categoryId] || categoryId;
  };

  // 현재 사용자가 게시글 작성자인지 확인
  const isAuthor = user?.uid === currentPost.authorId;

  // 신고 사유 리스트
  const reportReasons = [
    { id: 'spam', label: '스팸/광고' },
    { id: 'profanity', label: '욕설/혐오 발언' },
    { id: 'sexual', label: '성적/부적절한 콘텐츠' },
    { id: 'violence', label: '폭력적인 콘텐츠' },
    { id: 'harassment', label: '괴롭힘/따돌림' },
    { id: 'false_info', label: '허위 정보' },
    { id: 'privacy', label: '개인정보 유출' },
    { id: 'illegal', label: '불법적 콘텐츠' },
    { id: 'copyright', label: '저작권 침해' },
    { id: 'other', label: '기타' },
  ];

  // 좋아요 상태 초기화
  useEffect(() => {
    if (currentPost.likes && Array.isArray(currentPost.likes) && user?.uid) {
      setIsLiked(currentPost.likes.includes(user.uid));
    }
  }, [currentPost.likes, user?.uid]);

  // 댓글 상태 동기화
  useEffect(() => {
    if (Array.isArray(currentPost.comments)) {
      setComments(currentPost.comments);
    } else {
      setComments([]);
    }
  }, [currentPost.comments]);

  const handleLike = async () => {
    if (!user?.uid) return;
    
    try {
      await toggleLike(currentPost.id, user.uid);
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
      
      // 현재 포스트 상태 업데이트
      setCurrentPost(prev => ({
        ...prev,
        likes: isLiked 
          ? (prev.likes || []).filter(id => id !== user.uid)
          : [...(prev.likes || []), user.uid]
      }));

      // 서버에서 푸시 알림을 전송하므로 클라이언트에서는 알림을 생성하지 않음
      // Firestore에 좋아요가 추가되면 Cloud Function이 자동으로 알림을 전송합니다.
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
    }
  };

  const handleComment = async () => {
    if (commentInput.trim() && user?.uid) {
      // 콘텐츠 필터링 검사
      const filterResult = contentFilterService.checkComment(commentInput.trim());
      
      // Level 1 (심각) - 즉시 차단
      if (filterResult.blocked) {
        // 차단 시도 기록 (로그)
        console.log('🚫 댓글 차단됨:', {
          userId: user?.uid,
          postId: currentPost.id,
          comment: commentInput.trim().substring(0, 100),
          keywords: filterResult.keywords,
          timestamp: new Date().toISOString(),
        });
        
        Alert.alert(
          '차단됨',
          filterResult.warning || '부적절한 콘텐츠가 포함되어 있어 게시할 수 없습니다.',
          [
            { text: '확인', style: 'default' }
          ]
        );
        return;
      }
      
      // Level 2 (경미) - 경고 후 선택 허용
      if (filterResult.hasProfanity && filterResult.severity === 'warning') {
        Alert.alert(
          '경고',
          filterResult.warning,
          [
            { text: '취소', style: 'cancel' },
            { 
              text: '계속 작성', 
              onPress: async () => {
                await submitComment();
              }
            }
          ]
        );
        return;
      }
      
      // 필터링 통과 시 바로 제출
      await submitComment();
    }
  };

  // 댓글 제출 로직 (실제 저장)
  const submitComment = async () => {
    if (commentInput.trim() && user?.uid) {
      try {
        // Firestore에서 사용자 프로필 정보 가져오기
        const { getFirestore, doc, getDoc } = await import('firebase/firestore');
        const db = getFirestore();
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        let authorName = '사용자';
        if (userDoc.exists()) {
          const userData = userDoc.data();
          authorName = userData.displayName || userData.nickname || userData.profile?.nickname || userData.email?.split('@')[0] || user?.email?.split('@')[0] || '사용자';
        } else {
          authorName = user?.email?.split('@')[0] || '사용자';
        }
        

        
                const newComment = {
          id: Date.now().toString(),
          text: commentInput.trim(),
          author: authorName,
          authorId: user.uid,
          createdAt: new Date().toISOString(),
        };
        
        await addComment(currentPost.id, newComment);
        
        // 현재 포스트 상태도 즉시 업데이트
        setCurrentPost(prev => ({
          ...prev,
          comments: [newComment, ...(Array.isArray(prev.comments) ? prev.comments : [])]
        }));
        
        // 서버에서 푸시 알림을 전송하므로 클라이언트에서는 알림을 생성하지 않음
        // Firestore에 댓글이 추가되면 Cloud Function이 자동으로 알림을 전송합니다.
        
        setCommentInput('');
        Keyboard.dismiss(); // 키보드 숨기기
      } catch (error) {
        console.error('댓글 추가 실패:', error);
      }
    }
  };

  const handleEditPost = () => {
    setShowMenuModal(false);
    // 게시글 수정 화면으로 이동 (기존 게시글 데이터 전달)
    navigation.navigate('PostCreate', {
      editPost: {
        id: currentPost.id,
        category: currentPost.category,
        title: currentPost.title,
        content: currentPost.content,
        images: currentPost.images || [],
        hashtags: currentPost.hashtags || [],
        location: currentPost.location || '',
        isAnonymous: currentPost.isAnonymous || false,
      }
    });
  };

  const handleDeletePost = () => {
    setShowMenuModal(false);
    Alert.alert(
      '게시글 삭제',
      '정말로 이 게시글을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(currentPost.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert('오류', '게시글 삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  // 댓글 메뉴 열기
  const handleCommentMenu = (comment) => {
    setSelectedComment(comment);
    setShowCommentMenuModal(true);
  };

  // 댓글 수정 모달 열기
  const handleEditComment = () => {
    setShowCommentMenuModal(false);
    setEditCommentText(selectedComment.text);
    setShowCommentEditModal(true);
  };

  // 댓글 수정 완료
  const handleUpdateComment = async () => {
    if (!editCommentText.trim() || !selectedComment) return;

    try {
      const updatedComment = {
        ...selectedComment,
        text: editCommentText.trim(),
        updatedAt: new Date().toISOString()
      };

      // CommunityContext에서 댓글 업데이트 함수 호출
      await updateComment(currentPost.id, selectedComment.id, updatedComment);

      // 로컬 상태 업데이트
      setCurrentPost(prev => ({
        ...prev,
        comments: prev.comments.map(comment => 
          comment.id === selectedComment.id ? updatedComment : comment
        )
      }));

      setShowCommentEditModal(false);
      setSelectedComment(null);
      setEditCommentText('');
      Keyboard.dismiss();
    } catch (error) {
      console.error('댓글 수정 실패:', error);
      Alert.alert('오류', '댓글 수정에 실패했습니다.');
    }
  };

  // 댓글 삭제
  const handleDeleteComment = () => {
    setShowCommentMenuModal(false);
    Alert.alert(
      '댓글 삭제',
      '정말로 이 댓글을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            try {
              // CommunityContext에서 댓글 삭제 함수 호출
              await deleteComment(currentPost.id, selectedComment.id);

              // 로컬 상태 업데이트
              setCurrentPost(prev => ({
                ...prev,
                comments: prev.comments.filter(comment => comment.id !== selectedComment.id)
              }));

              setSelectedComment(null);
            } catch (error) {
              console.error('댓글 삭제 실패:', error);
              Alert.alert('오류', '댓글 삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  // 게시글 신고 모달 열기
  const handlePostReport = () => {
    setShowPostReportModal(true);
    setSelectedReportReason('');
    setReportDescription('');
    setShouldBlockPostAuthor(false);
  };

  // 댓글 작성자 프로필로 이동
  const handleCommentAuthorPress = async (comment) => {
    if (!comment.authorId || comment.authorId === user?.uid) {
      return; // 익명이거나 본인 댓글인 경우 처리하지 않음
    }

    try {
      // Firestore에서 사용자 프로필 정보 가져오기
      const firestoreService = require('../services/firestoreService').default;
      const userProfile = await firestoreService.getUserProfile(comment.authorId);
      
      if (userProfile) {
        const participant = {
          id: comment.authorId,
          name: comment.author || userProfile.displayName || '사용자',
          profileImage: userProfile.photoURL || userProfile.profileImage || null,
          level: userProfile.level || 'beginner',
          joinDate: userProfile.createdAt || new Date(),
          age: userProfile.age || null,
          gender: userProfile.gender || null,
          bio: userProfile.bio || null,
          runningProfile: userProfile.runningProfile || null,
        };
        
        navigation.navigate('Participant', { participant });
      } else {
        // 프로필 정보가 없는 경우 기본 정보로 이동
        const participant = {
          id: comment.authorId,
          name: comment.author || '사용자',
          profileImage: null,
          level: 'beginner',
          joinDate: new Date(),
        };
        
        navigation.navigate('Participant', { participant });
      }
    } catch (error) {
      console.error('댓글 작성자 프로필 가져오기 실패:', error);
      // 에러가 발생해도 기본 정보로 프로필 화면으로 이동
      const participant = {
        id: comment.authorId,
        name: comment.author || '사용자',
        profileImage: null,
        level: 'beginner',
        joinDate: new Date(),
      };
      
      navigation.navigate('Participant', { participant });
    }
  };

  // 댓글 신고 모달 열기
  const handleCommentReport = (comment) => {
    setSelectedComment(comment);
    setShowCommentReportModal(true);
    setSelectedReportReason('');
    setReportDescription('');
    setShouldBlockCommentAuthor(false);
  };

  // 게시글 신고 제출
  const handleSubmitPostReport = async () => {
    if (!selectedReportReason) {
      Alert.alert('알림', '신고 사유를 선택해주세요.');
      return;
    }

    try {
      // 신고 제출
      const result = await reportService.reportPost(
        currentPost.id,
        currentPost.authorId,
        selectedReportReason,
        reportDescription
      );

      if (result.success) {
        // 차단 옵션이 선택된 경우 사용자 차단
        if (shouldBlockPostAuthor && currentPost.authorId && user?.uid && currentPost.authorId !== user.uid) {
          try {
            setIsBlocking(true);
            
            // Firestore에서 작성자 프로필 정보 가져오기
            const firestoreService = require('../services/firestoreService').default;
            const authorProfile = await firestoreService.getUserProfile(currentPost.authorId);
            
            const authorName = authorProfile?.displayName || currentPost.author || '사용자';
            const authorProfileImage = authorProfile?.photoURL || authorProfile?.profileImage || null;
            
            await blacklistService.blockUser(
              user.uid,
              currentPost.authorId,
              authorName,
              authorProfileImage
            );
            
            Alert.alert(
              '신고 및 차단 완료',
              '신고가 접수되었고 해당 사용자를 차단했습니다.',
              [{ text: '확인' }]
            );
          } catch (blockError) {
            console.error('사용자 차단 실패:', blockError);
            Alert.alert(
              '신고 완료',
              '신고가 접수되었습니다. 검토 후 조치하겠습니다.\n(차단 처리 중 오류가 발생했습니다.)',
              [{ text: '확인' }]
            );
          } finally {
            setIsBlocking(false);
          }
        } else {
          Alert.alert('신고 완료', '신고가 접수되었습니다. 검토 후 조치하겠습니다.');
        }
        
        setShowPostReportModal(false);
        setSelectedReportReason('');
        setReportDescription('');
        setShouldBlockPostAuthor(false);
      } else {
        Alert.alert('오류', result.error || '신고 제출에 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 신고 실패:', error);
      Alert.alert('오류', '신고 제출에 실패했습니다.');
    }
  };

  // 댓글 신고 제출
  const handleSubmitCommentReport = async () => {
    if (!selectedReportReason || !selectedComment) {
      Alert.alert('알림', '신고 사유를 선택해주세요.');
      return;
    }

    try {
      // 신고 제출
      const result = await reportService.reportComment(
        selectedComment.id,
        currentPost.id,
        selectedComment.authorId,
        selectedReportReason,
        reportDescription
      );

      if (result.success) {
        // 차단 옵션이 선택된 경우 사용자 차단
        if (shouldBlockCommentAuthor && selectedComment.authorId && user?.uid && selectedComment.authorId !== user.uid) {
          try {
            setIsBlocking(true);
            
            // Firestore에서 댓글 작성자 프로필 정보 가져오기
            const firestoreService = require('../services/firestoreService').default;
            const commentAuthorProfile = await firestoreService.getUserProfile(selectedComment.authorId);
            
            const commentAuthorName = commentAuthorProfile?.displayName || selectedComment.author || '사용자';
            const commentAuthorProfileImage = commentAuthorProfile?.photoURL || commentAuthorProfile?.profileImage || null;
            
            await blacklistService.blockUser(
              user.uid,
              selectedComment.authorId,
              commentAuthorName,
              commentAuthorProfileImage
            );
            
            Alert.alert(
              '신고 및 차단 완료',
              '신고가 접수되었고 해당 사용자를 차단했습니다.',
              [{ text: '확인' }]
            );
          } catch (blockError) {
            console.error('사용자 차단 실패:', blockError);
            Alert.alert(
              '신고 완료',
              '신고가 접수되었습니다. 검토 후 조치하겠습니다.\n(차단 처리 중 오류가 발생했습니다.)',
              [{ text: '확인' }]
            );
          } finally {
            setIsBlocking(false);
          }
        } else {
          Alert.alert('신고 완료', '신고가 접수되었습니다. 검토 후 조치하겠습니다.');
        }
        
        setShowCommentReportModal(false);
        setSelectedComment(null);
        setSelectedReportReason('');
        setReportDescription('');
        setShouldBlockCommentAuthor(false);
      } else {
        Alert.alert('오류', result.error || '신고 제출에 실패했습니다.');
      }
    } catch (error) {
      console.error('댓글 신고 실패:', error);
      Alert.alert('오류', '신고 제출에 실패했습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.TEXT} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>게시글</Text>
        </View>
        {!isAuthor ? (
          <TouchableOpacity style={styles.shareButton} onPress={handlePostReport}>
            <Ionicons name="alert-circle-outline" size={24} color={colors.TEXT} />
          </TouchableOpacity>
        ) : (
          <View style={styles.shareButton} />
        )}
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 카테고리 */}
          <View style={styles.categoryContainer}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{getCategoryName(currentPost.category)}</Text>
            </View>
          </View>

          {/* 제목 */}
          <Text style={styles.title}>{currentPost.title}</Text>

          {/* 작성 정보 */}
          <View style={styles.authorInfo}>
            <View style={styles.authorSection}>
              <View style={styles.authorAvatar}>
                {currentPost.isAnonymous ? (
                  <Ionicons name="person" size={20} color={colors.TEXT} />
                ) : authorProfile?.profileImage ? (
                  <Image
                    source={{ uri: authorProfile.profileImage }}
                    style={styles.authorProfileImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={20} color={colors.TEXT} />
                )}
              </View>
              <View style={styles.authorDetails}>
                <Text style={styles.authorText}>
                  {currentPost.isAnonymous ? '익명' : (currentPost.author || '작성자')}
                </Text>
                <Text style={styles.dateText}>{formatDate(currentPost.createdAt)}</Text>
              </View>
            </View>
            {isAuthor && (
              <TouchableOpacity 
                style={styles.moreButton}
                onPress={() => setShowMenuModal(true)}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.TEXT_SECONDARY} />
              </TouchableOpacity>
            )}
          </View>

          {/* 내용 */}
          <View style={styles.contentSection}>
            <Text style={styles.contentText}>{currentPost.content}</Text>
          </View>

          {/* 이미지들 - 작성자가 본인 게시글을 볼 때만 표시 */}
          {isAuthor && currentPost.images && currentPost.images.length > 0 && (
            <View style={styles.imagesSection}>
              <View style={styles.imageGrid}>
                {currentPost.images.map((image, index) => (
                  <Image 
                    key={index} 
                    source={{ uri: image }} 
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                ))}
              </View>
            </View>
          )}

          {/* 해시태그 */}
          {currentPost.hashtags && currentPost.hashtags.length > 0 && (
            <View style={styles.hashtagSection}>
              <View style={styles.hashtagContainer}>
                {parseHashtags(currentPost.hashtags).map((tag, index) => (
                  <View key={index} style={styles.hashtagBadge}>
                    <Text style={styles.hashtagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 위치 */}
          {currentPost.location && (
            <View style={styles.locationSection}>
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={16} color={colors.PRIMARY} />
                <Text style={styles.locationText}>{currentPost.location}</Text>
              </View>
            </View>
          )}

          {/* 액션 버튼들 */}
          <View style={styles.actionSection}>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                <Ionicons 
                  name={isLiked ? "heart" : "heart-outline"} 
                  size={24} 
                  color={isLiked ? colors.ERROR : colors.TEXT_SECONDARY} 
                />
                <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
                  {currentPost.likes?.length || 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="chatbubble-outline" size={24} color={colors.TEXT_SECONDARY} />
                <Text style={styles.actionText}>{Array.isArray(currentPost.comments) ? currentPost.comments.length : 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="bookmark-outline" size={24} color={colors.TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            

          </View>

          {/* 댓글 섹션 */}
          <View style={styles.commentsSection}>
            {(() => {
              // 차단된 사용자의 댓글 필터링
              const blockedUserIds = blacklist.map(blocked => blocked.blockedUserId);
              const filteredComments = (currentPost.comments || []).filter(comment => {
                if (comment.authorId && blockedUserIds.includes(comment.authorId)) {
                  return false; // 차단된 사용자의 댓글 제거
                }
                return true;
              });
              
              return (
                <>
                  <Text style={styles.commentsTitle}>댓글 {filteredComments.length}개</Text>
                  
                  {filteredComments.length > 0 ? (
                    <View style={styles.commentsList}>
                      {filteredComments.map((comment) => (
                  <TouchableOpacity
                    key={comment.id}
                    style={styles.commentItem}
                    onLongPress={() => handleCommentReport(comment)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.commentHeader}>
                      <View style={styles.commentAuthorSection}>
                        {comment.authorId && comment.authorId !== user?.uid ? (
                          <TouchableOpacity
                            onPress={() => handleCommentAuthorPress(comment)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.commentAuthor}>{comment.author}</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.commentAuthor}>{comment.author}</Text>
                        )}
                        <Text style={styles.commentDate}>
                          {formatDate(comment.createdAt)}
                        </Text>
                      </View>
                      {comment.authorId === user?.uid && (
                        <TouchableOpacity 
                          style={styles.commentMenuButton}
                          onPress={() => handleCommentMenu(comment)}
                        >
                          <Ionicons name="ellipsis-horizontal" size={16} color={colors.TEXT_SECONDARY} />
                        </TouchableOpacity>
                      )}
                    </View>
                        <Text style={styles.commentText}>{comment.text}</Text>
                      </TouchableOpacity>
                    ))}
                    </View>
                  ) : (
                    <View style={styles.emptyComments}>
                      <Ionicons name="chatbubble-outline" size={48} color={colors.TEXT_SECONDARY} />
                      <Text style={styles.emptyCommentsText}>아직 댓글이 없습니다</Text>
                      <Text style={styles.emptyCommentsSubtext}>첫 번째 댓글을 남겨보세요!</Text>
                    </View>
                  )}
                </>
              );
            })()}
          </View>

          {/* 하단 여백 */}
          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* 댓글 입력창 */}
        <View style={styles.commentInputContainer}>
          <View style={styles.commentInputWrapper}>
            <TextInput
              style={styles.commentInput}
              placeholder="댓글을 입력하세요..."
              placeholderTextColor={colors.TEXT_SECONDARY}
              value={commentInput}
              onChangeText={setCommentInput}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.commentButton, !commentInput.trim() && styles.commentButtonDisabled]}
              onPress={handleComment}
              disabled={!commentInput.trim()}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={commentInput.trim() ? colors.PRIMARY : colors.TEXT_SECONDARY} 
              />
            </TouchableOpacity>
          </View>
                  </View>
        </KeyboardAvoidingView>

        {/* 3점 메뉴 모달 */}
        <Modal
          visible={showMenuModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowMenuModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.modalBackdrop,
                {
                  opacity: menuModalBackdropOpacity,
                },
              ]}
            >
              <TouchableOpacity 
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => setShowMenuModal(false)}
              />
            </Animated.View>
            <View style={styles.bottomModalContainer}>
              <View style={styles.bottomModal}>
                <TouchableOpacity 
                  style={styles.bottomMenuItem}
                  onPress={handleEditPost}
                >
                  <Text style={styles.bottomMenuItemText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.bottomMenuItem}
                  onPress={handleDeletePost}
                >
                  <Text style={[styles.bottomMenuItemText, styles.bottomMenuItemTextDelete]}>삭제</Text>
                </TouchableOpacity>
                <View style={styles.bottomModalSeparator} />
                <TouchableOpacity 
                  style={styles.bottomMenuItem}
                  onPress={() => setShowMenuModal(false)}
                >
                  <Text style={styles.bottomMenuItemText}>닫기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 댓글 메뉴 모달 */}
        <Modal
          visible={showCommentMenuModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowCommentMenuModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.modalBackdrop,
                {
                  opacity: commentMenuModalBackdropOpacity,
                },
              ]}
            >
              <TouchableOpacity 
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => setShowCommentMenuModal(false)}
              />
            </Animated.View>
            <View style={styles.bottomModalContainer}>
              <View style={styles.bottomModal}>
                <TouchableOpacity 
                  style={styles.bottomMenuItem}
                  onPress={handleEditComment}
                >
                  <Text style={styles.bottomMenuItemText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.bottomMenuItem}
                  onPress={handleDeleteComment}
                >
                  <Text style={[styles.bottomMenuItemText, styles.bottomMenuItemTextDelete]}>삭제</Text>
                </TouchableOpacity>
                <View style={styles.bottomModalSeparator} />
                <TouchableOpacity 
                  style={styles.bottomMenuItem}
                  onPress={() => setShowCommentMenuModal(false)}
                >
                  <Text style={styles.bottomMenuItemText}>닫기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 댓글 수정 모달 */}
        <Modal
          visible={showCommentEditModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowCommentEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.modalBackdrop,
                {
                  opacity: commentEditModalBackdropOpacity,
                },
              ]}
            />
            <View style={styles.editCommentModal}>
            <View style={styles.editCommentHeader}>
              <Text style={styles.editCommentTitle}>댓글 수정</Text>
            </View>
            <TextInput
              style={styles.editCommentInput}
              placeholder="댓글을 입력하세요..."
              placeholderTextColor={colors.TEXT_SECONDARY}
              value={editCommentText}
              onChangeText={setEditCommentText}
              multiline
              maxLength={500}
              autoFocus
            />
            <View style={styles.editCommentActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowCommentEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.updateButton, !editCommentText.trim() && styles.updateButtonDisabled]}
                onPress={handleUpdateComment}
                disabled={!editCommentText.trim()}
              >
                <Text style={[styles.updateButtonText, !editCommentText.trim() && styles.updateButtonTextDisabled]}>
                  수정
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </Modal>

        {/* 게시글 신고 모달 */}
        <Modal
          visible={showPostReportModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowPostReportModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.modalBackdrop,
                {
                  opacity: postReportModalBackdropOpacity,
                },
              ]}
            >
              <TouchableOpacity 
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => setShowPostReportModal(false)}
              />
            </Animated.View>
            <View style={styles.bottomModalContainer}>
              <View style={styles.reportModal} onStartShouldSetResponder={() => true}>
                <View style={styles.reportModalHeader}>
                  <Text style={styles.reportModalTitle}>신고하기</Text>
                  <TouchableOpacity onPress={() => setShowPostReportModal(false)}>
                    <Ionicons name="close" size={24} color={colors.TEXT} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.reportModalContent} showsVerticalScrollIndicator={false}>
                  <Text style={styles.reportModalSubtitle}>신고 사유를 선택해주세요</Text>
                  {reportReasons.map((reason) => (
                    <TouchableOpacity
                      key={reason.id}
                      style={[
                        styles.reportReasonItem,
                        selectedReportReason === reason.id && styles.reportReasonItemSelected
                      ]}
                      onPress={() => setSelectedReportReason(reason.id)}
                    >
                      <Text style={[
                        styles.reportReasonText,
                        selectedReportReason === reason.id && styles.reportReasonTextSelected
                      ]}>
                        {reason.label}
                      </Text>
                      {selectedReportReason === reason.id && (
                        <Ionicons name="checkmark-circle" size={20} color={colors.PRIMARY} />
                      )}
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.reportDescriptionLabel}>추가 설명 (선택)</Text>
                  <TextInput
                    style={styles.reportDescriptionInput}
                    placeholder="신고 사유에 대한 추가 설명을 입력해주세요"
                    placeholderTextColor={colors.TEXT_SECONDARY}
                    value={reportDescription}
                    onChangeText={setReportDescription}
                    multiline
                    maxLength={500}
                  />
                  {currentPost.authorId && currentPost.authorId !== user?.uid && (
                    <TouchableOpacity
                      style={styles.blockOptionContainer}
                      onPress={() => setShouldBlockPostAuthor(!shouldBlockPostAuthor)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.blockOptionCheckbox}>
                        {shouldBlockPostAuthor && (
                          <Ionicons name="checkmark" size={18} color={colors.PRIMARY} />
                        )}
                      </View>
                      <Text style={styles.blockOptionText}>이 사용자 차단하기</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
                <View style={styles.reportModalActions}>
                  <TouchableOpacity 
                    style={styles.reportCancelButton}
                    onPress={() => setShowPostReportModal(false)}
                  >
                    <Text style={styles.reportCancelButtonText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.reportSubmitButton, (!selectedReportReason || isBlocking) && styles.reportSubmitButtonDisabled]}
                    onPress={handleSubmitPostReport}
                    disabled={!selectedReportReason || isBlocking}
                  >
                    <Text style={[styles.reportSubmitButtonText, (!selectedReportReason || isBlocking) && styles.reportSubmitButtonTextDisabled]}>
                      {isBlocking ? '처리 중...' : '신고하기'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* 댓글 신고 모달 */}
        <Modal
          visible={showCommentReportModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowCommentReportModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.modalBackdrop,
                {
                  opacity: commentReportModalBackdropOpacity,
                },
              ]}
            >
              <TouchableOpacity 
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => setShowCommentReportModal(false)}
              />
            </Animated.View>
            <View style={styles.bottomModalContainer}>
              <View style={styles.reportModal} onStartShouldSetResponder={() => true}>
                <View style={styles.reportModalHeader}>
                  <Text style={styles.reportModalTitle}>댓글 신고하기</Text>
                  <TouchableOpacity onPress={() => setShowCommentReportModal(false)}>
                    <Ionicons name="close" size={24} color={colors.TEXT} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.reportModalContent} showsVerticalScrollIndicator={false}>
                  <Text style={styles.reportModalSubtitle}>신고 사유를 선택해주세요</Text>
                  {reportReasons.map((reason) => (
                    <TouchableOpacity
                      key={reason.id}
                      style={[
                        styles.reportReasonItem,
                        selectedReportReason === reason.id && styles.reportReasonItemSelected
                      ]}
                      onPress={() => setSelectedReportReason(reason.id)}
                    >
                      <Text style={[
                        styles.reportReasonText,
                        selectedReportReason === reason.id && styles.reportReasonTextSelected
                      ]}>
                        {reason.label}
                      </Text>
                      {selectedReportReason === reason.id && (
                        <Ionicons name="checkmark-circle" size={20} color={colors.PRIMARY} />
                      )}
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.reportDescriptionLabel}>추가 설명 (선택)</Text>
                  <TextInput
                    style={styles.reportDescriptionInput}
                    placeholder="신고 사유에 대한 추가 설명을 입력해주세요"
                    placeholderTextColor={colors.TEXT_SECONDARY}
                    value={reportDescription}
                    onChangeText={setReportDescription}
                    multiline
                    maxLength={500}
                  />
                  {selectedComment && selectedComment.authorId && selectedComment.authorId !== user?.uid && (
                    <TouchableOpacity
                      style={styles.blockOptionContainer}
                      onPress={() => setShouldBlockCommentAuthor(!shouldBlockCommentAuthor)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.blockOptionCheckbox}>
                        {shouldBlockCommentAuthor && (
                          <Ionicons name="checkmark" size={18} color={colors.PRIMARY} />
                        )}
                      </View>
                      <Text style={styles.blockOptionText}>이 사용자 차단하기</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
                <View style={styles.reportModalActions}>
                  <TouchableOpacity 
                    style={styles.reportCancelButton}
                    onPress={() => setShowCommentReportModal(false)}
                  >
                    <Text style={styles.reportCancelButtonText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.reportSubmitButton, (!selectedReportReason || isBlocking) && styles.reportSubmitButtonDisabled]}
                    onPress={handleSubmitCommentReport}
                    disabled={!selectedReportReason || isBlocking}
                  >
                    <Text style={[styles.reportSubmitButtonText, (!selectedReportReason || isBlocking) && styles.reportSubmitButtonTextDisabled]}>
                      {isBlocking ? '처리 중...' : '신고하기'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  };

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.25,
    borderBottomColor: colors.BORDER,
    position: 'relative',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.TEXT,
  },
  shareButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  categoryContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.PRIMARY + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
    color: colors.PRIMARY,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.TEXT,
    marginHorizontal: 16,
    marginBottom: 20,
    lineHeight: 32,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.CARD,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  authorProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorDetails: {
    flex: 1,
  },
  authorText: {
    fontSize: 16,
    color: colors.TEXT,
    fontWeight: '500',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
  },
  moreButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  contentText: {
    fontSize: 16,
    color: colors.TEXT,
    lineHeight: 24,
  },
  imagesSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  postImage: {
    width: (screenWidth - 64) / 2,
    height: 120,
    borderRadius: 12,
  },
  hashtagSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  hashtagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtagBadge: {
    backgroundColor: colors.PRIMARY + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hashtagText: {
    fontSize: 14,
    color: colors.PRIMARY,
    fontWeight: '500',
  },
  locationSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.CARD,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationText: {
    fontSize: 16,
    color: colors.TEXT,
    marginLeft: 8,
  },
  actionSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 0.25,
    borderTopColor: colors.BORDER,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 16,
    color: colors.TEXT_SECONDARY,
    fontWeight: '500',
  },
  actionTextActive: {
    color: colors.ERROR,
  },

  commentsSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.TEXT,
    marginBottom: 16,
  },
  commentsList: {
    gap: 16,
  },
  commentItem: {
    backgroundColor: colors.CARD,
    borderRadius: 12,
    padding: 16,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 14,
    color: colors.TEXT,
    fontWeight: '500',
  },
  commentDate: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
    marginTop: 2,
    opacity: 0.8,
  },
  commentText: {
    fontSize: 14,
    color: colors.TEXT,
    lineHeight: 20,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCommentsText: {
    fontSize: 16,
    color: colors.TEXT_SECONDARY,
    marginTop: 12,
    fontWeight: '500',
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
    marginTop: 4,
  },
  commentInputContainer: {
    backgroundColor: colors.BACKGROUND,
    borderTopWidth: 0.25,
    borderTopColor: colors.BORDER,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.CARD,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 16,
    color: colors.TEXT,
    maxHeight: 100,
    paddingVertical: 8,
  },
  commentButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentButtonDisabled: {
    opacity: 0.5,
  },
  bottomSpacing: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomModalContainer: {
    justifyContent: 'flex-end',
  },
  bottomModal: {
    backgroundColor: colors.CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // 하단 안전 영역 고려
  },
  bottomMenuItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  bottomMenuItemText: {
    fontSize: 18,
    color: colors.TEXT,
    fontWeight: '500',
  },
  bottomMenuItemTextDelete: {
    color: colors.ERROR,
  },
  bottomModalSeparator: {
    height: 8,
    backgroundColor: colors.BACKGROUND,
  },
  commentAuthorSection: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  commentMenuButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCommentModal: {
    backgroundColor: colors.BACKGROUND,
    marginTop: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  editCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.25,
    borderBottomColor: colors.BORDER,
  },
  editCommentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.TEXT,
  },
  editCommentInput: {
    fontSize: 16,
    color: colors.TEXT,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  editCommentActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.BORDER,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.TEXT,
    fontWeight: '500',
  },
  updateButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.PRIMARY,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    backgroundColor: colors.BORDER,
  },
  updateButtonText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
  },
  updateButtonTextDisabled: {
    color: colors.TEXT_SECONDARY,
  },
  // 신고 모달 스타일
  reportModal: {
    backgroundColor: colors.CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 34,
  },
  reportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.25,
    borderBottomColor: colors.BORDER,
  },
  reportModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.TEXT,
  },
  reportModalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: 400,
  },
  reportModalSubtitle: {
    fontSize: 16,
    color: colors.TEXT_SECONDARY,
    marginBottom: 16,
  },
  reportReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.BORDER,
  },
  reportReasonItemSelected: {
    backgroundColor: colors.PRIMARY + '20',
    borderColor: colors.PRIMARY,
  },
  reportReasonText: {
    fontSize: 16,
    color: colors.TEXT,
    fontWeight: '500',
  },
  reportReasonTextSelected: {
    color: colors.PRIMARY,
    fontWeight: '600',
  },
  reportDescriptionLabel: {
    fontSize: 16,
    color: colors.TEXT,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 12,
  },
  reportDescriptionInput: {
    backgroundColor: colors.SURFACE,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.TEXT,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.BORDER,
  },
  blockOptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.BORDER,
  },
  blockOptionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.PRIMARY,
    backgroundColor: colors.CARD,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  blockOptionText: {
    fontSize: 16,
    color: colors.TEXT,
    fontWeight: '500',
    flex: 1,
  },
  reportModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 0.25,
    borderTopColor: colors.BORDER,
  },
  reportCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportCancelButtonText: {
    fontSize: 16,
    color: colors.TEXT,
    fontWeight: '500',
  },
  reportSubmitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSubmitButtonDisabled: {
    backgroundColor: colors.BORDER,
    opacity: 0.5,
  },
  reportSubmitButtonText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
  },
  reportSubmitButtonTextDisabled: {
    color: colors.TEXT_SECONDARY,
  },
});

export default PostDetailScreen; 