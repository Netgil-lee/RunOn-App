import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCommunity } from '../contexts/CommunityContext';
import { useAuth } from '../contexts/AuthContext';
import { formatRelativeTime } from '../utils/timestampUtils';

const { width: screenWidth } = Dimensions.get('window');

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  TEXT_SECONDARY: '#666666',
  BORDER: '#333333',
  ERROR: '#FF4444',
  SUCCESS: '#00FF88',
};

const PostDetailScreen = ({ route, navigation }) => {
  const { post } = route.params;
  const { user } = useAuth();
  const { toggleLike, addComment, updateComment, deleteComment, updatePost, deletePost, createLikeNotification, createCommentNotification } = useCommunity();
  
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

  // 디버깅 로그 (필요시에만 활성화)
  // console.log('🔍 PostDetailScreen - 받은 post 데이터:', post);
  // console.log('🔍 PostDetailScreen - 안전 처리된 post:', safePost);

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

      // 좋아요를 눌렀을 때만 알림 생성 (좋아요 취소가 아닐 때)
      if (!isLiked && currentPost.authorId && currentPost.authorId !== user.uid) {
        try {
          await createLikeNotification(
            currentPost.id, 
            currentPost.title, 
            user?.displayName || user?.email?.split('@')[0] || '사용자',
            currentPost.authorId // 게시글 작성자에게 알림
          );
        } catch (error) {
          console.warn('⚠️ 좋아요 알림 생성 실패:', error);
        }
      }
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
    }
  };

  const handleComment = async () => {
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
        
        // 댓글 작성자가 게시글 작성자가 아닐 때만 알림 생성
        if (currentPost.authorId && currentPost.authorId !== user.uid) {
          try {
            await createCommentNotification(
              currentPost.id, 
              currentPost.title, 
              authorName,
              currentPost.authorId // 게시글 작성자에게 알림
            );
          } catch (error) {
            console.warn('⚠️ 댓글 알림 생성 실패:', error);
          }
        }
        
        setCommentInput('');
        Keyboard.dismiss(); // 키보드 숨기기
      } catch (error) {
        console.error('댓글 추가 실패:', error);
      }
    }
  };

  const handleEditPost = () => {
    setShowMenuModal(false);
    // TODO: 게시글 수정 화면으로 이동
    Alert.alert('수정', '게시글 수정 기능은 준비 중입니다.');
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

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>게시글</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color={COLORS.TEXT} />
        </TouchableOpacity>
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
                  <Ionicons name="person" size={20} color={COLORS.TEXT_SECONDARY} />
                ) : authorProfile?.profileImage ? (
                  <Image 
                    source={{ uri: authorProfile.profileImage }} 
                    style={styles.authorProfileImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={20} color={COLORS.TEXT_SECONDARY} />
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
                <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>
            )}
          </View>

          {/* 내용 */}
          <View style={styles.contentSection}>
            <Text style={styles.contentText}>{currentPost.content}</Text>
          </View>

          {/* 이미지들 */}
          {currentPost.images && currentPost.images.length > 0 && (
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
                <Ionicons name="location" size={16} color={COLORS.PRIMARY} />
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
                  color={isLiked ? COLORS.ERROR : COLORS.TEXT_SECONDARY} 
                />
                <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
                  {currentPost.likes?.length || 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="chatbubble-outline" size={24} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.actionText}>{Array.isArray(currentPost.comments) ? currentPost.comments.length : 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="bookmark-outline" size={24} color={COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            

          </View>

          {/* 댓글 섹션 */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>댓글 {Array.isArray(currentPost.comments) ? currentPost.comments.length : 0}개</Text>
            
            {currentPost.comments && Array.isArray(currentPost.comments) && currentPost.comments.length > 0 ? (
              <View style={styles.commentsList}>
                {currentPost.comments.map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <View style={styles.commentAuthorSection}>
                        <Text style={styles.commentAuthor}>{comment.author}</Text>
                        <Text style={styles.commentDate}>
                          {formatDate(comment.createdAt)}
                        </Text>
                      </View>
                      {comment.authorId === user?.uid && (
                        <TouchableOpacity 
                          style={styles.commentMenuButton}
                          onPress={() => handleCommentMenu(comment)}
                        >
                          <Ionicons name="ellipsis-horizontal" size={16} color={COLORS.TEXT_SECONDARY} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyComments}>
                <Ionicons name="chatbubble-outline" size={48} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.emptyCommentsText}>아직 댓글이 없습니다</Text>
                <Text style={styles.emptyCommentsSubtext}>첫 번째 댓글을 남겨보세요!</Text>
              </View>
            )}
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
              placeholderTextColor={COLORS.TEXT_SECONDARY}
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
                color={commentInput.trim() ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY} 
              />
            </TouchableOpacity>
          </View>
                  </View>
        </KeyboardAvoidingView>

        {/* 3점 메뉴 모달 */}
        <Modal
          visible={showMenuModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMenuModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMenuModal(false)}
          >
            <View style={styles.menuModal}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={handleEditPost}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.TEXT} />
                <Text style={styles.menuItemText}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={handleDeletePost}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.ERROR} />
                <Text style={[styles.menuItemText, styles.menuItemTextDelete]}>삭제</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 댓글 메뉴 모달 */}
        <Modal
          visible={showCommentMenuModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCommentMenuModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCommentMenuModal(false)}
          >
            <View style={styles.commentMenuModal}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={handleEditComment}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.TEXT} />
                <Text style={styles.menuItemText}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={handleDeleteComment}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.ERROR} />
                <Text style={[styles.menuItemText, styles.menuItemTextDelete]}>삭제</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 댓글 수정 모달 */}
        <Modal
          visible={showCommentEditModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCommentEditModal(false)}
        >
          <View style={styles.editCommentModal}>
            <View style={styles.editCommentHeader}>
              <Text style={styles.editCommentTitle}>댓글 수정</Text>
            </View>
            <TextInput
              style={styles.editCommentInput}
              placeholder="댓글을 입력하세요..."
              placeholderTextColor={COLORS.TEXT_SECONDARY}
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
        </Modal>
      </SafeAreaView>
    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.25,
    borderBottomColor: COLORS.BORDER,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.TEXT,
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
    backgroundColor: COLORS.PRIMARY + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
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
    backgroundColor: COLORS.CARD,
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
    color: COLORS.TEXT,
    fontWeight: '500',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
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
    color: COLORS.TEXT,
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
    backgroundColor: COLORS.PRIMARY + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hashtagText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  locationSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationText: {
    fontSize: 16,
    color: COLORS.TEXT,
    marginLeft: 8,
  },
  actionSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 0.25,
    borderTopColor: COLORS.BORDER,
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
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  actionTextActive: {
    color: COLORS.ERROR,
  },

  commentsSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 16,
  },
  commentsList: {
    gap: 16,
  },
  commentItem: {
    backgroundColor: COLORS.CARD,
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
    color: COLORS.TEXT,
    fontWeight: '500',
  },
  commentDate: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
    opacity: 0.8,
  },
  commentText: {
    fontSize: 14,
    color: COLORS.TEXT,
    lineHeight: 20,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCommentsText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 12,
    fontWeight: '500',
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
  commentInputContainer: {
    backgroundColor: COLORS.BACKGROUND,
    borderTopWidth: 0.25,
    borderTopColor: COLORS.BORDER,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.CARD,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.TEXT,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 20,
  },
  menuModal: {
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    padding: 8,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: COLORS.TEXT,
    fontWeight: '500',
  },
  menuItemTextDelete: {
    color: COLORS.ERROR,
  },
  commentMenuModal: {
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    padding: 8,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignSelf: 'flex-end',
    marginRight: 40,
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
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
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
    borderBottomColor: COLORS.BORDER,
  },
  editCommentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
  },
  editCommentInput: {
    fontSize: 16,
    color: COLORS.TEXT,
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
    borderColor: COLORS.BORDER,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.TEXT,
    fontWeight: '500',
  },
  updateButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    backgroundColor: COLORS.BORDER,
  },
  updateButtonText: {
    fontSize: 16,
    color: COLORS.BACKGROUND,
    fontWeight: '600',
  },
  updateButtonTextDisabled: {
    color: COLORS.TEXT_SECONDARY,
  },
});

export default PostDetailScreen; 