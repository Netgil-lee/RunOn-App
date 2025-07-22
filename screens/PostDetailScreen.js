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
  const { toggleLike, addComment, updatePost, deletePost, createLikeNotification, createCommentNotification } = useCommunity();
  
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState(post.comments || []);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [currentPost, setCurrentPost] = useState({
    ...post,
    likes: Array.isArray(post.likes) ? post.likes : [],
    comments: Array.isArray(post.comments) ? post.comments : []
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return '어제';
      if (diffDays <= 7) return `${diffDays}일 전`;
      
      return `${date.getMonth() + 1}월 ${date.getDate()}일`;
    } catch (error) {
      return dateString;
    }
  };

  // 해시태그 파싱 함수
  const parseHashtags = (hashtagString) => {
    if (!hashtagString || !hashtagString.trim()) return [];
    
    // 이미 배열인 경우 그대로 반환
    if (Array.isArray(hashtagString)) {
      return hashtagString;
    }
    
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

  const handleLike = () => {
    if (!user?.uid) return;
    
    toggleLike(currentPost.id, user.uid);
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
      createLikeNotification(
        currentPost.id, 
        currentPost.title, 
        user?.displayName || user?.email?.split('@')[0] || '사용자'
      );
    }
  };

  const handleComment = () => {
    if (commentInput.trim() && user?.uid) {
      const newComment = {
        id: Date.now().toString(),
        text: commentInput.trim(),
        author: user?.displayName || user?.email?.split('@')[0] || '사용자',
        authorId: user.uid,
        createdAt: new Date().toISOString(),
      };
      
      addComment(currentPost.id, newComment);
      
      // 현재 포스트 상태도 즉시 업데이트
      setCurrentPost(prev => ({
        ...prev,
        comments: [newComment, ...(Array.isArray(prev.comments) ? prev.comments : [])]
      }));
      
      // 댓글 작성자가 게시글 작성자가 아닐 때만 알림 생성
      if (currentPost.authorId && currentPost.authorId !== user.uid) {
        createCommentNotification(
          currentPost.id, 
          currentPost.title, 
          user?.displayName || user?.email?.split('@')[0] || '사용자'
        );
      }
      
      setCommentInput('');
      Keyboard.dismiss(); // 키보드 숨기기
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
          onPress: () => {
            deletePost(currentPost.id);
            navigation.goBack();
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
              <Text style={styles.categoryText}>{getCategoryName(post.category)}</Text>
            </View>
          </View>

          {/* 제목 */}
          <Text style={styles.title}>{post.title}</Text>

          {/* 작성 정보 */}
          <View style={styles.authorInfo}>
            <View style={styles.authorSection}>
              <View style={styles.authorAvatar}>
                <Ionicons name="person" size={20} color={COLORS.TEXT_SECONDARY} />
              </View>
              <View style={styles.authorDetails}>
                <Text style={styles.authorText}>
                  {post.isAnonymous ? '익명' : (post.author || '작성자')}
                </Text>
                <Text style={styles.dateText}>{formatDate(post.createdAt)}</Text>
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
            <Text style={styles.contentText}>{post.content}</Text>
          </View>

          {/* 이미지들 */}
          {post.images && post.images.length > 0 && (
            <View style={styles.imagesSection}>
              <View style={styles.imageGrid}>
                {post.images.map((image, index) => (
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
          {post.hashtags && post.hashtags.length > 0 && (
            <View style={styles.hashtagSection}>
              <View style={styles.hashtagContainer}>
                {parseHashtags(post.hashtags).map((tag, index) => (
                  <View key={index} style={styles.hashtagBadge}>
                    <Text style={styles.hashtagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 위치 */}
          {post.location && (
            <View style={styles.locationSection}>
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={16} color={COLORS.PRIMARY} />
                <Text style={styles.locationText}>{post.location}</Text>
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
            
            {/* 테스트 버튼들 */}
            <View style={styles.testButtons}>
              <TouchableOpacity 
                style={styles.testButton}
                onPress={() => {
                  console.log('🧪 좋아요 알림 테스트 버튼 클릭');
                  if (currentPost.authorId && currentPost.authorId !== user?.uid) {
                    console.log('📝 테스트 알림 생성 중...');
                    createLikeNotification(
                      currentPost.id, 
                      currentPost.title, 
                      '테스트 사용자'
                    );
                    Alert.alert('테스트', '좋아요 알림이 생성되었습니다!');
                  } else {
                    console.log('❌ 자신의 게시글에는 알림 생성 안됨');
                    Alert.alert('테스트', '자신의 게시글에는 알림이 생성되지 않습니다.');
                  }
                }}
              >
                <Text style={styles.testButtonText}>좋아요 알림 테스트</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.testButton}
                onPress={() => {
                  console.log('🧪 댓글 알림 테스트 버튼 클릭');
                  if (currentPost.authorId && currentPost.authorId !== user?.uid) {
                    console.log('📝 테스트 댓글 알림 생성 중...');
                    createCommentNotification(
                      currentPost.id, 
                      currentPost.title, 
                      '테스트 사용자'
                    );
                    Alert.alert('테스트', '댓글 알림이 생성되었습니다!');
                  } else {
                    console.log('❌ 자신의 게시글에는 알림 생성 안됨');
                    Alert.alert('테스트', '자신의 게시글에는 알림이 생성되지 않습니다.');
                  }
                }}
              >
                <Text style={styles.testButtonText}>댓글 알림 테스트</Text>
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
                      <Text style={styles.commentAuthor}>{comment.author}</Text>
                      <Text style={styles.commentDate}>
                        {formatDate(comment.createdAt)}
                      </Text>
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
  testButtons: {
    marginTop: 16,
    gap: 8,
  },
  testButton: {
    backgroundColor: COLORS.PRIMARY + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: '600',
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
});

export default PostDetailScreen; 