import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import storageService from '../services/storageService';

const ImageUploader = ({
  onImageUploaded,
  onImageRemoved,
  maxImages = 1,
  imageType = 'profile', // 'profile', 'event', 'post'
  userId = null,
  eventId = null,
  postId = null,
  style,
  buttonText = '이미지 선택',
  placeholderText = '이미지를 선택해주세요'
}) => {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // 권한 요청
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '권한 필요',
          '이미지를 선택하려면 갤러리 접근 권한이 필요합니다.',
          [{ text: '확인' }]
        );
        return false;
      }
    }
    return true;
  };

  // 이미지 선택
  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: maxImages > 1,
        selectionLimit: maxImages,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          type: 'image/jpeg',
          name: `image_${Date.now()}.jpg`
        }));

        if (maxImages === 1) {
          setImages(newImages);
          await uploadImages(newImages);
        } else {
          const updatedImages = [...images, ...newImages].slice(0, maxImages);
          setImages(updatedImages);
          await uploadImages(newImages);
        }
      }
    } catch (error) {
      console.error('이미지 선택 실패:', error);
      Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
    }
  };

  // 이미지 업로드
  const uploadImages = async (imageFiles) => {
    setUploading(true);
    
    try {
      const uploadPromises = imageFiles.map(async (imageFile, index) => {
        // 파일 검증
        const sizeValidation = storageService.validateFileSize(imageFile);
        if (!sizeValidation.valid) {
          throw new Error(sizeValidation.error);
        }

        const typeValidation = storageService.validateFileType(imageFile);
        if (!typeValidation.valid) {
          throw new Error(typeValidation.error);
        }

        // 이미지 압축 (웹에서만)
        let fileToUpload = imageFile;
        if (Platform.OS === 'web') {
          fileToUpload = await storageService.compressImage(imageFile);
        }

        // 업로드 타입에 따른 처리
        let uploadResult;
        switch (imageType) {
          case 'profile':
            if (!userId) throw new Error('사용자 ID가 필요합니다.');
            uploadResult = await storageService.uploadProfileImage(userId, fileToUpload);
            break;
          case 'event':
            if (!eventId) throw new Error('이벤트 ID가 필요합니다.');
            uploadResult = await storageService.uploadEventImage(eventId, fileToUpload);
            break;
          case 'post':
            if (!postId) throw new Error('게시글 ID가 필요합니다.');
            uploadResult = await storageService.uploadPostImage(postId, fileToUpload, index);
            break;
          default:
            uploadResult = await storageService.uploadTempFile(fileToUpload);
        }

        if (!uploadResult.success) {
          throw new Error(uploadResult.error);
        }

        return {
          localUri: imageFile.uri,
          downloadURL: uploadResult.url,
          storagePath: uploadResult.path
        };
      });

      const uploadedImages = await Promise.all(uploadPromises);
      
      // 콜백 호출
      if (onImageUploaded) {
        if (maxImages === 1) {
          onImageUploaded(uploadedImages[0]);
        } else {
          onImageUploaded(uploadedImages);
        }
      }

    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      Alert.alert('업로드 실패', error.message);
    } finally {
      setUploading(false);
    }
  };

  // 이미지 제거
  const removeImage = async (index) => {
    try {
      const imageToRemove = images[index];
      const updatedImages = images.filter((_, i) => i !== index);
      setImages(updatedImages);

      // Storage에서 파일 삭제 (업로드된 경우)
      if (imageToRemove.storagePath) {
        await storageService.deleteFile(imageToRemove.storagePath);
      }

      if (onImageRemoved) {
        onImageRemoved(imageToRemove, index);
      }
    } catch (error) {
      console.error('이미지 제거 실패:', error);
      Alert.alert('오류', '이미지를 제거하는 중 오류가 발생했습니다.');
    }
  };

  // 이미지 미리보기 렌더링
  const renderImagePreview = () => {
    if (images.length === 0) {
      return (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{placeholderText}</Text>
        </View>
      );
    }

    if (maxImages === 1) {
      return (
        <View style={styles.singleImageContainer}>
          <Image source={{ uri: images[0].uri }} style={styles.singleImage} />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeImage(0)}
          >
            <Text style={styles.removeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.multipleImagesContainer}>
        {images.map((image, index) => (
          <View key={index} style={styles.imageItem}>
            <Image source={{ uri: image.uri }} style={styles.multipleImage} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(index)}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        {images.length < maxImages && (
          <TouchableOpacity
            style={styles.addImageButton}
            onPress={pickImage}
            disabled={uploading}
          >
            <Text style={styles.addImageButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {renderImagePreview()}
      
      {maxImages === 1 && images.length === 0 && (
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={pickImage}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.uploadButtonText}>{buttonText}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  placeholder: {
    width: 120,
    height: 120,
    backgroundColor: '#f0f0f0',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  placeholderText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
  singleImageContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  singleImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  multipleImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  imageItem: {
    position: 'relative',
  },
  multipleImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addImageButton: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  addImageButtonText: {
    fontSize: 24,
    color: '#999',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ImageUploader; 