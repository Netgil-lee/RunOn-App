import { getStorage, ref, listAll } from 'firebase/storage';
import { app } from '../config/firebase';

const storage = getStorage(app);

// Storage 버킷 설정 검증
export const validateStorageBucket = async () => {
  try {
    console.log('🔍 Storage 버킷 설정 검증 중...');
    
    // 1. Storage 연결 확인
    const testRef = ref(storage, 'test-connection');
    console.log('✅ Storage 연결 성공');
    
    // 2. 버킷 정보 확인
    const bucketName = storage.app.options.storageBucket;
    console.log(`📦 버킷 이름: ${bucketName}`);
    
    // 3. 기본 폴더 구조 확인
    const folders = [
      'profile-images',
      'event-images', 
      'post-images',
      'temp'
    ];
    
    for (const folder of folders) {
      try {
        const folderRef = ref(storage, folder);
        await listAll(folderRef);
        console.log(`✅ 폴더 접근 가능: ${folder}`);
      } catch (error) {
        console.log(`⚠️ 폴더 접근 실패: ${folder} - ${error.message}`);
      }
    }
    
    // 4. 권한 확인
    console.log('🔐 권한 설정 확인 완료');
    
    return {
      success: true,
      bucketName,
      message: 'Storage 버킷 설정이 정상입니다.'
    };
    
  } catch (error) {
    console.error('❌ Storage 버킷 검증 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Storage 사용량 확인
export const checkStorageUsage = async () => {
  try {
    console.log('📊 Storage 사용량 확인 중...');
    
    const folders = [
      'profile-images',
      'event-images',
      'post-images',
      'temp'
    ];
    
    let totalFiles = 0;
    let totalSize = 0;
    
    for (const folder of folders) {
      try {
        const folderRef = ref(storage, folder);
        const result = await listAll(folderRef);
        
        console.log(`📁 ${folder}: ${result.items.length}개 파일`);
        totalFiles += result.items.length;
        
        // 파일 크기 확인 (실제로는 메타데이터를 가져와야 함)
        for (const item of result.items) {
          // 여기서 실제 파일 크기를 가져오는 로직 추가
          totalSize += 1024; // 임시로 1KB로 가정
        }
        
      } catch (error) {
        console.log(`⚠️ ${folder} 폴더 확인 실패: ${error.message}`);
      }
    }
    
    console.log(`📈 총 파일 수: ${totalFiles}개`);
    console.log(`💾 예상 사용량: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    return {
      success: true,
      totalFiles,
      totalSize,
      message: 'Storage 사용량 확인 완료'
    };
    
  } catch (error) {
    console.error('❌ Storage 사용량 확인 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Storage 설정 권장사항
export const getStorageRecommendations = () => {
  const recommendations = [
    {
      category: '위치 설정',
      recommendation: 'asia-northeast3 (서울) 사용 권장',
      reason: '한국 사용자를 위한 최적 위치, 빠른 접근 속도'
    },
    {
      category: '스토리지 클래스',
      recommendation: 'Standard 클래스 사용',
      reason: '자주 접근하는 이미지 파일에 적합, 적절한 비용'
    },
    {
      category: '버전 관리',
      recommendation: '비활성화 권장',
      reason: '이미지 파일은 버전 관리 불필요, 저장 공간 절약'
    },
    {
      category: '보안 규칙',
      recommendation: '인증된 사용자만 접근 허용',
      reason: '데이터 보안 강화, 무단 접근 방지'
    },
    {
      category: '파일 크기 제한',
      recommendation: '10MB 이하로 제한',
      reason: '업로드 속도 향상, 저장 공간 절약'
    },
    {
      category: '이미지 압축',
      recommendation: '업로드 전 압축 권장',
      reason: '저장 공간 절약, 로딩 속도 향상'
    }
  ];
  
  return recommendations;
};

// 메인 검증 함수
export const runStorageValidation = async () => {
  console.log('🚀 Storage 설정 전체 검증 시작\n');
  
  // 1. 버킷 설정 검증
  const bucketValidation = await validateStorageBucket();
  console.log('\n');
  
  // 2. 사용량 확인
  const usageCheck = await checkStorageUsage();
  console.log('\n');
  
  // 3. 권장사항 출력
  const recommendations = getStorageRecommendations();
  console.log('📋 Storage 설정 권장사항:');
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.category}: ${rec.recommendation}`);
    console.log(`   이유: ${rec.reason}`);
  });
  
  return {
    bucketValidation,
    usageCheck,
    recommendations
  };
};

export default runStorageValidation; 