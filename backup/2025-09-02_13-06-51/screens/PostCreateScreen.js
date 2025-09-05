import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { HAN_RIVER_PARKS, RIVER_SIDES } from '../constants/onboardingOptions';
import { useCommunity } from '../contexts/CommunityContext';
import { useAuth } from '../contexts/AuthContext';

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  TEXT_SECONDARY: '#666666',
  ERROR: '#FF4444',
  SUCCESS: '#00FF88',
  BORDER: '#333333',
  BORDER_LIGHT: '#444444',
};

const { width: screenWidth } = Dimensions.get('window');

const PostCreateScreen = ({ navigation }) => {
  const { addPost } = useCommunity();
  const { user } = useAuth();
  const [postData, setPostData] = useState({
    category: '',
    title: '',
    content: '',
    images: [],
    hashtags: [],
    location: '',
    isAnonymous: false,
    isDraft: false,
  });

  const [hashtagInput, setHashtagInput] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [activeLocationTab, setActiveLocationTab] = useState('parks'); // 'parks' | 'rivers'


  const titleInputRef = useRef(null);
  const contentInputRef = useRef(null);
  const hashtagInputRef = useRef(null);
  const scrollViewRef = useRef(null);

  // 카테고리 옵션
  const categories = [
    { id: 'free', name: '자유토크', icon: '💬', color: '#3AF8FF' },
    { id: 'tips', name: '러닝 팁', icon: '💡', color: '#00FF88' },
    { id: 'review', name: '모임 후기', icon: '⭐', color: '#FFD700' },
    { id: 'question', name: '질문답변', icon: '❓', color: '#FF6B9D' },
    { id: 'course', name: '코스 추천', icon: '🗺️', color: '#FF4444' },
    { id: 'gear', name: '러닝 용품', icon: '👟', color: '#FF8C00' },
  ];



  // 키보드 이벤트 리스너
  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);

  // 카테고리 선택
  const handleCategorySelect = (categoryId) => {
    setPostData(prev => ({ ...prev, category: categoryId }));
  };

  // 제목 입력
  const handleTitleChange = (text) => {
    if (text.length <= 100) {
      setPostData(prev => ({ ...prev, title: text }));
    }
  };

  // 제목 입력 포커스 시 스크롤
  const handleTitleFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: 200, // 내용 입력 칸까지 스크롤
        animated: true
      });
    }, 100);
  };

  // 내용 입력
  const handleContentChange = (text) => {
    if (text.length <= 1000) {
      setPostData(prev => ({ ...prev, content: text }));
    }
  };

  // 이미지 첨부
  const handleImagePicker = async (type) => {
    try {
      let result;
      
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && postData.images.length < 5) {
        setPostData(prev => ({
          ...prev,
          images: [...prev.images, result.assets[0].uri]
        }));
      } else if (postData.images.length >= 5) {
        Alert.alert('이미지 제한', '최대 5장까지 첨부할 수 있습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '이미지 선택 중 오류가 발생했습니다.');
    }
  };

  // 이미지 삭제
  const handleImageRemove = (index) => {
    setPostData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // 해시태그 추가 (직접 입력용)
  const addHashtag = (tag) => {
    const cleanTag = tag.replace(/[#\s]/g, '');
    if (cleanTag && cleanTag.length <= 20 && postData.hashtags.length < 3) {
      if (!postData.hashtags.includes(cleanTag)) {
        setPostData(prev => ({
          ...prev,
          hashtags: [...prev.hashtags, cleanTag]
        }));
      }
    } else if (postData.hashtags.length >= 3) {
      Alert.alert('해시태그 제한', '해시태그는 최대 3개까지 입력할 수 있습니다.');
    }
    setHashtagInput('');
  };



  // 해시태그 삭제
  const removeHashtag = (tagToRemove) => {
    setPostData(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter(tag => tag !== tagToRemove)
    }));
  };

  // 해시태그 키 입력 처리
  const handleHashtagKeyPress = (e) => {
    if (e.nativeEvent.key === 'Enter' || e.nativeEvent.key === ' ') {
      e.preventDefault();
      addHashtag(hashtagInput.trim());
    }
  };

  // 위치 선택
  const handleLocationSelect = (location) => {
    setPostData(prev => ({ ...prev, location }));
    setShowLocationPicker(false);
  };

  // 위치태그 선택 시 스크롤
  const handleLocationPickerOpen = () => {
    setShowLocationPicker(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // 위치 카테고리 데이터
  const locationCategories = {
    parks: HAN_RIVER_PARKS.map(park => ({
      id: park.id,
      name: park.name
    })),
    rivers: RIVER_SIDES.map(river => ({
      id: river.id,
      name: river.name
    }))
  };

  // 익명 작성 토글
  const toggleAnonymous = () => {
    setPostData(prev => ({ ...prev, isAnonymous: !prev.isAnonymous }));
  };

  // 유효성 검증
  const isPostValid = () => {
    return postData.category && postData.title.trim() && postData.content.trim();
  };

  // 게시글 제출
  const handleSubmit = async () => {
    if (isPostValid()) {
      try {
        // 사용자 프로필 정보 가져오기
        let authorName = '사용자';
        let fetchedUserProfile = null;
        try {
          const firestoreService = require('../services/firestoreService').default;
          fetchedUserProfile = await firestoreService.getUserProfile(user?.uid);
          authorName = fetchedUserProfile?.profile?.nickname || fetchedUserProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || '사용자';
        } catch (error) {
          console.error('사용자 프로필 가져오기 실패:', error);
          authorName = user?.displayName || user?.email?.split('@')[0] || '사용자';
        }

        const newPost = {
          ...postData,
          createdAt: new Date().toISOString(),
          author: authorName,
          authorId: user?.uid || 'anonymous',
          authorProfile: {
            displayName: authorName,
            profileImage: user?.photoURL || fetchedUserProfile?.profileImage || fetchedUserProfile?.profile?.profileImage || null
          },
          likes: [],
          comments: []
        };
        
        console.log('🔍 PostCreateScreen - 게시글 작성:', {
          author: authorName,
          authorId: user?.uid,
          userDisplayName: user?.displayName,
          userEmail: user?.email
        });
        
        // Firestore에 게시글 저장
        const firestoreService = require('../services/firestoreService').default;
        const result = await firestoreService.createPost(newPost);
        
        if (result.success) {
          // 로컬 상태에도 추가
          addPost({ ...newPost, id: result.id });
          Alert.alert('완료', '게시글이 작성되었습니다!', [
            { text: '확인', onPress: () => navigation.goBack() }
          ]);
        } else {
          Alert.alert('오류', '게시글 저장에 실패했습니다.');
        }
      } catch (error) {
        console.error('게시글 작성 오류:', error);
        Alert.alert('오류', '게시글 작성 중 오류가 발생했습니다.');
      }
    } else {
      Alert.alert('입력 오류', '필수 항목을 모두 입력해주세요.');
    }
  };



  // 뒤로가기
  const handleBack = () => {
    if (postData.title || postData.content) {
      Alert.alert(
        '작성 중단',
        '작성 중인 내용이 있습니다. 정말 나가시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { text: '나가기', onPress: () => navigation.goBack() }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>새 글 작성</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 카테고리 선택 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              카테고리 <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    postData.category === category.id && styles.categoryItemSelected
                  ]}
                  onPress={() => handleCategorySelect(category.id)}
                >
                  <View style={styles.categoryContent}>
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <Text style={[
                      styles.categoryName,
                      postData.category === category.id && styles.categoryNameSelected
                    ]}>
                      {category.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 제목 입력 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              제목 <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                ref={titleInputRef}
                style={styles.titleInput}
                placeholder="제목을 입력해주세요"
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                value={postData.title}
                onChangeText={handleTitleChange}
                onFocus={handleTitleFocus}
                maxLength={100}
              />
              <Text style={styles.charCount}>
                {postData.title.length}/100
              </Text>
            </View>
          </View>

          {/* 내용 입력 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              내용 <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                ref={contentInputRef}
                style={styles.contentInput}
                placeholder="러닝 경험, 팁, 질문 등을 자유롭게 작성해주세요"
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                value={postData.content}
                onChangeText={handleContentChange}
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.charCount}>
                {postData.content.length}/1000
              </Text>
            </View>
          </View>

          {/* 이미지 첨부 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>사진 첨부</Text>
            <View style={styles.imageSection}>
              <View style={styles.imageButtons}>
                <TouchableOpacity 
                  style={styles.imageButton}
                  onPress={() => handleImagePicker('camera')}
                >
                  <Ionicons name="camera" size={24} color={COLORS.PRIMARY} />
                  <Text style={styles.imageButtonText}>촬영</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.imageButton}
                  onPress={() => handleImagePicker('gallery')}
                >
                  <Ionicons name="images" size={24} color={COLORS.PRIMARY} />
                  <Text style={styles.imageButtonText}>갤러리</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.imageHelper}>
                최대 5장까지 첨부할 수 있습니다
              </Text>
              
              {/* 첨부된 이미지들 */}
              {postData.images.length > 0 && (
                <View style={styles.imageList}>
                  {postData.images.map((image, index) => (
                    <View key={index} style={styles.imageItem}>
                      <Image source={{ uri: image }} style={styles.attachedImage} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => handleImageRemove(index)}
                      >
                        <Ionicons name="close-circle" size={20} color={COLORS.ERROR} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* 해시태그 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>해시태그</Text>
            <View style={styles.hashtagContainer}>
              <TextInput
                ref={hashtagInputRef}
                style={styles.hashtagInput}
                placeholder="해시태그를 입력하세요 (엔터로 추가)"
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                value={hashtagInput}
                onChangeText={setHashtagInput}
                onSubmitEditing={() => addHashtag(hashtagInput.trim())}
                maxLength={20}
              />
            </View>
            
            {/* 선택된 해시태그들 */}
            {postData.hashtags.length > 0 && (
              <View style={styles.selectedTags}>
                {postData.hashtags.map((tag, index) => (
                  <View key={index} style={styles.selectedTag}>
                    <Text style={styles.selectedTagText}>#{tag}</Text>
                    <TouchableOpacity onPress={() => removeHashtag(tag)}>
                      <Ionicons name="close" size={16} color={COLORS.TEXT} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 위치 태그 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>위치 태그</Text>
            <TouchableOpacity 
              style={styles.locationButton}
              onPress={handleLocationPickerOpen}
            >
              <Ionicons name="location" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.locationButtonText}>
                {postData.location || '위치를 선택하세요'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
            
            {/* 위치 선택 액티브탭 */}
            {showLocationPicker && (
              <View style={styles.locationPickerContainer}>
                {/* 탭 버튼들 */}
                <View style={styles.locationTabs}>
                  <TouchableOpacity
                    style={[
                      styles.locationTab,
                      activeLocationTab === 'parks' && styles.locationTabActive
                    ]}
                    onPress={() => setActiveLocationTab('parks')}
                  >
                    <Text style={[
                      styles.locationTabText,
                      activeLocationTab === 'parks' && styles.locationTabTextActive
                    ]}>
                      한강공원
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.locationTab,
                      activeLocationTab === 'rivers' && styles.locationTabActive
                    ]}
                    onPress={() => setActiveLocationTab('rivers')}
                  >
                    <Text style={[
                      styles.locationTabText,
                      activeLocationTab === 'rivers' && styles.locationTabTextActive
                    ]}>
                      강변
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {/* 하위항목 그리드 */}
                <View style={styles.locationGrid}>
                  {locationCategories[activeLocationTab].map((location) => (
                    <TouchableOpacity
                      key={location.id}
                      style={styles.locationGridItem}
                      onPress={() => handleLocationSelect(location.name)}
                    >
                      <Text style={styles.locationGridItemText}>{location.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* 추가 옵션 */}
          <View style={styles.section}>
            <View style={styles.optionItem}>
              <View style={styles.optionInfo}>
                <Ionicons 
                  name={postData.isAnonymous ? "eye-off" : "eye"} 
                  size={20} 
                  color={COLORS.TEXT_SECONDARY} 
                />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>익명 작성</Text>
                  <Text style={styles.optionDescription}>프로필이 공개되지 않습니다</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[
                  styles.toggleSwitch,
                  postData.isAnonymous && styles.toggleSwitchActive
                ]}
                onPress={toggleAnonymous}
              >
                <View style={[
                  styles.toggleThumb,
                  postData.isAnonymous && styles.toggleThumbActive
                ]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 하단 여백 */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 하단 제출 버튼 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={[styles.submitButton, !isPostValid() && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isPostValid()}
        >
          <Ionicons name="send" size={24} color={!isPostValid() ? COLORS.TEXT_SECONDARY : '#000000'} />
          <Text style={[styles.submitButtonText, !isPostValid() && styles.submitButtonTextDisabled]}>
            게시글 작성
          </Text>
        </TouchableOpacity>
      </View>


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
    paddingVertical: 12,
    backgroundColor: COLORS.BACKGROUND,
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
  headerSpacer: {
    width: 44,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 12,
  },
  required: {
    color: COLORS.ERROR,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryItem: {
    width: (screenWidth - 64) / 2,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryItemSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.CARD,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    color: COLORS.TEXT,
    fontWeight: '500',
  },
  categoryNameSelected: {
    color: COLORS.PRIMARY,
  },
  inputContainer: {
    position: 'relative',
  },
  titleInput: {
    backgroundColor: COLORS.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.TEXT,
  },
  contentInput: {
    backgroundColor: COLORS.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.TEXT,
    minHeight: 120,
  },
  charCount: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  imageSection: {
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  imageButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  imageHelper: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  imageList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  imageItem: {
    position: 'relative',
  },
  attachedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 10,
  },
  hashtagContainer: {
    position: 'relative',
  },
  hashtagInput: {
    backgroundColor: COLORS.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.TEXT,
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 20,
  },
  selectedTagText: {
    fontSize: 14,
    color: COLORS.BACKGROUND,
    marginRight: 6,
    fontWeight: '500',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  locationButtonText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.TEXT,
    marginLeft: 12,
  },
  locationPickerContainer: {
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginTop: 12,
    overflow: 'hidden',
  },
  locationTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  locationTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: COLORS.CARD,
  },
  locationTabActive: {
    backgroundColor: COLORS.SURFACE,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.PRIMARY,
  },
  locationTabText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  locationTabTextActive: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
    justifyContent: 'center',
  },
  locationGridItem: {
    width: (screenWidth - 96) / 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationGridItemText: {
    fontSize: 14,
    color: COLORS.TEXT,
    fontWeight: '500',
    textAlign: 'center',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    color: COLORS.TEXT,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    backgroundColor: COLORS.BORDER,
    borderRadius: 12,
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    backgroundColor: COLORS.TEXT,
    borderRadius: 10,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  bottomSpacing: {
    height: 80,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.BACKGROUND,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 22,
    borderTopWidth: 0.25,
    borderTopColor: '#333333',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 10,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.BORDER,
  },
  submitButtonText: {
    fontSize: 18,
    color: '#000000',
    fontWeight: 'bold',
  },
  submitButtonTextDisabled: {
    color: COLORS.TEXT_SECONDARY,
  },

});

export default PostCreateScreen; 