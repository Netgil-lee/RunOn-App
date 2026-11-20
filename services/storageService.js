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

  // 모임 대표 사진 업로드 (기기에서 고른 사진의 로컬 주소를 받아 올린다)
  // 저장 규칙상 모임 문서가 먼저 있어야 하고, 주최자만 올릴 수 있다.
  // 파일명에 시각을 붙여 사진을 바꿨을 때 예전 사진이 캐시로 남아 보이지 않게 한다.
  async uploadEventPhoto(eventId, localUri) {
    try {
      const response = await fetch(localUri);
      const blob = await response.blob();
      const storageRef = ref(storage, `event-images/events/${eventId}/cover_${Date.now()}.jpg`);
      const snapshot = await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const downloadURL = await getDownloadURL(snapshot.ref);
      return { success: true, url: downloadURL, path: snapshot.ref.fullPath };
    } catch (error) {
      console.error('모임 사진 업로드 실패:', error);
      return { success: false, error: error.message };
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
      console.log('🔍 StorageService.deleteEventFiles 호출됨 - eventId:', eventId);
      
      const eventRef = ref(storage, `event-images/events/${eventId}`);
      const eventFiles = await listAll(eventRef);
      
      console.log('🔍 찾은 이벤트 파일 개수:', eventFiles.items.length);
      
      if (eventFiles.items.length === 0) {
        console.log('✅ 삭제할 이벤트 파일이 없습니다');
        return { success: true };
      }
      
      const deletePromises = eventFiles.items.map(item => {
        console.log('🔍 삭제할 파일:', item.fullPath);
        return deleteObject(item);
      });
      
      await Promise.all(deletePromises);
      
      console.log('✅ Firebase Storage에서 이벤트 파일 삭제 완료');
      return { success: true };
    } catch (error) {
      console.error('❌ 이벤트 파일 삭제 실패:', error);
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

  // 프로필 이미지 URL 가져오기 (fallback 포함)
  async getProfileImageURLWithFallback(userId) {
    try {
      console.log('🔍 StorageService.getProfileImageURLWithFallback 호출됨 - userId:', userId);
      
      const extensions = ['jpg', 'jpeg', 'png', 'webp'];
      
      for (const ext of extensions) {
        try {
          const imagePath = `profile-images/users/${userId}/profile.${ext}`;
          console.log('🔍 이미지 경로 시도:', imagePath);
          
          const imageRef = ref(storage, imagePath);
          const url = await getDownloadURL(imageRef);
          
          console.log('✅ 프로필 이미지 URL 가져오기 성공:', url);
          return url;
        } catch (error) {
          console.log('⚠️ 이미지 경로 실패:', `profile-images/users/${userId}/profile.${ext}`, error.code);
          // 해당 확장자로 파일이 없으면 다음 확장자 시도
          continue;
        }
      }
      
      console.log('❌ 모든 확장자로 시도했지만 프로필 이미지를 찾을 수 없음');
      return null;
    } catch (error) {
      console.error('❌ 프로필 이미지 URL 가져오기 실패:', error);
      return null;
    }
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

  // 모임 종료 시 관련 파일 삭제
  async deleteEventFiles(eventId) {
    try {
      console.log('🔍 StorageService.deleteEventFiles 호출됨:', eventId);
      
      const eventImagesPath = `event-images/events/${eventId}`;
      const eventImagesRef = ref(storage, eventImagesPath);
      
      // 해당 경로의 모든 파일 목록 가져오기
      const result = await listAll(eventImagesRef);
      
      if (result.items.length === 0) {
        console.log('✅ 삭제할 파일이 없음:', eventImagesPath);
        return { success: true, deletedCount: 0 };
      }
      
      // 모든 파일 삭제
      const deletePromises = result.items.map(itemRef => deleteObject(itemRef));
      await Promise.all(deletePromises);
      
      console.log(`✅ Firebase Storage 파일 삭제 완료: ${result.items.length}개 파일`);
      return { success: true, deletedCount: result.items.length };
    } catch (error) {
      console.error('❌ Firebase Storage 파일 삭제 실패:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new StorageService(); 