import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { app } from '../config/firebase';

const storage = getStorage(app);
const auth = getAuth(app);

class StorageService {
  // 프로필 이미지 업로드
  async uploadProfileImage(userId, imageFile) {
    try {
      console.log('📤 StorageService - 업로드 시작:', { userId, imageFile });
      
      // React Native에서 파일을 Blob으로 변환
      const response = await fetch(imageFile.uri);
      const blob = await response.blob();
      
      const fileExtension = imageFile.name.split('.').pop() || 'jpg';
      const fileName = `profile.${fileExtension}`;
      const storageRef = ref(storage, `profile-images/users/${userId}/${fileName}`);
      
      console.log('📤 StorageService - Blob 생성 완료:', { fileName, blobSize: blob.size });
      
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ StorageService - 업로드 성공:', { downloadURL });
      
      return {
        success: true,
        url: downloadURL,
        path: snapshot.ref.fullPath
      };
    } catch (error) {
      console.error('❌ StorageService - 프로필 이미지 업로드 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 이벤트 이미지 업로드
  async uploadEventImage(eventId, imageFile, imageType = 'cover') {
    try {
      const fileExtension = imageFile.name.split('.').pop();
      const fileName = `${imageType}.${fileExtension}`;
      const storageRef = ref(storage, `event-images/events/${eventId}/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        success: true,
        url: downloadURL,
        path: snapshot.ref.fullPath
      };
    } catch (error) {
      console.error('이벤트 이미지 업로드 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 게시글 이미지 업로드
  async uploadPostImage(postId, imageFile, imageIndex = 0) {
    try {
      const fileExtension = imageFile.name.split('.').pop();
      const fileName = `image${imageIndex}.${fileExtension}`;
      const storageRef = ref(storage, `post-images/posts/${postId}/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        success: true,
        url: downloadURL,
        path: snapshot.ref.fullPath
      };
    } catch (error) {
      console.error('게시글 이미지 업로드 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 임시 파일 업로드 (썸네일 생성 등)
  async uploadTempFile(file, folder = 'uploads') {
    try {
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${timestamp}.${fileExtension}`;
      const storageRef = ref(storage, `temp/${folder}/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        success: true,
        url: downloadURL,
        path: snapshot.ref.fullPath
      };
    } catch (error) {
      console.error('임시 파일 업로드 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 파일 삭제
  async deleteFile(filePath) {
    try {
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('파일 삭제 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 사용자 관련 파일 모두 삭제
  async deleteUserFiles(userId) {
    try {
      const profileRef = ref(storage, `profile-images/users/${userId}`);
      const profileFiles = await listAll(profileRef);
      
      const deletePromises = profileFiles.items.map(item => deleteObject(item));
      await Promise.all(deletePromises);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('사용자 파일 삭제 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 이벤트 관련 파일 모두 삭제
  async deleteEventFiles(eventId) {
    try {
      const eventRef = ref(storage, `event-images/events/${eventId}`);
      const eventFiles = await listAll(eventRef);
      
      const deletePromises = eventFiles.items.map(item => deleteObject(item));
      await Promise.all(deletePromises);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('이벤트 파일 삭제 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 게시글 관련 파일 모두 삭제
  async deletePostFiles(postId) {
    try {
      const postRef = ref(storage, `post-images/posts/${postId}`);
      const postFiles = await listAll(postRef);
      
      const deletePromises = postFiles.items.map(item => deleteObject(item));
      await Promise.all(deletePromises);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('게시글 파일 삭제 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 파일 크기 검증 (10MB 제한)
  validateFileSize(file, maxSize = 10 * 1024 * 1024) {
    if (file.size > maxSize) {
      return {
        valid: false,
        error: '파일 크기가 10MB를 초과합니다.'
      };
    }
    return {
      valid: true
    };
  }

  // 파일 타입 검증
  validateFileType(file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) {
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: '지원하지 않는 파일 형식입니다. (JPEG, PNG, GIF만 가능)'
      };
    }
    return {
      valid: true
    };
  }

  // 이미지 압축 (선택사항)
  async compressImage(file, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 캔버스 크기 설정 (최대 1024px)
        const maxSize = 1024;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 이미지 그리기
        ctx.drawImage(img, 0, 0, width, height);
        
        // 압축된 이미지 생성
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, file.type, quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
}

export default new StorageService(); 