import React from 'react';
import { InteractionManager, Dimensions } from 'react-native';

// 성능 최적화 설정
export const PERFORMANCE_CONFIG = {
  // 이미지 최적화
  IMAGE_OPTIMIZATION: {
    // 프로필 이미지 최대 크기
    PROFILE_IMAGE_MAX_SIZE: 500,
    // 썸네일 크기
    THUMBNAIL_SIZE: 150,
    // 이미지 품질 (0-1)
    JPEG_QUALITY: 0.8,
    // 압축 옵션
    COMPRESSION_OPTIONS: {
      width: 500,
      height: 500,
      quality: 0.8,
      format: 'jpeg'
    }
  },

  // 리스트 렌더링 최적화
  LIST_OPTIMIZATION: {
    // 초기 렌더링 아이템 수
    INITIAL_NUM_TO_RENDER: 10,
    // 스크롤 시 추가 렌더링 아이템 수
    MAX_TO_RENDER_PER_BATCH: 5,
    // 뷰포트 밖 아이템 언마운트 임계값
    REMOVE_CLIPPED_SUBVIEWS_THRESHOLD: 50,
    // 스크롤 이벤트 throttle 간격 (ms)
    SCROLL_EVENT_THROTTLE: 16,
    // getItemLayout 사용 여부
    USE_GET_ITEM_LAYOUT: true
  },

  // 네트워크 최적화
  NETWORK_OPTIMIZATION: {
    // 요청 타임아웃 (ms)
    REQUEST_TIMEOUT: 15000,
    // 재시도 횟수
    MAX_RETRIES: 3,
    // 캐시 유효 시간 (ms)
    CACHE_DURATION: 5 * 60 * 1000, // 5분
    // 배치 요청 지연 시간 (ms)
    BATCH_DELAY: 50
  },

  // 메모리 최적화
  MEMORY_OPTIMIZATION: {
    // 이미지 캐시 최대 크기 (MB)
    IMAGE_CACHE_SIZE: 100,
    // 데이터 캐시 최대 항목 수
    DATA_CACHE_MAX_ITEMS: 500,
    // 메모리 정리 간격 (ms)
    CLEANUP_INTERVAL: 30 * 1000, // 30초
    // 백그라운드 처리 지연 시간 (ms)
    BACKGROUND_TASK_DELAY: 100
  },

  // 애니메이션 최적화
  ANIMATION_OPTIMIZATION: {
    // 네이티브 드라이버 사용
    USE_NATIVE_DRIVER: true,
    // 애니메이션 duration (ms)
    DEFAULT_DURATION: 250,
    // 스프링 애니메이션 설정
    SPRING_CONFIG: {
      damping: 15,
      stiffness: 150,
      mass: 1
    }
  }
};

// 성능 유틸리티 함수들
export class PerformanceUtils {
  // 무거운 작업을 다음 프레임으로 지연
  static runAfterInteractions(callback) {
    return InteractionManager.runAfterInteractions(callback);
  }

  // 배치 업데이트를 위한 디바운스
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // 스로틀링
  static throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // 메모이제이션
  static memoize(fn) {
    const cache = new Map();
    return function(...args) {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = fn.apply(this, args);
      cache.set(key, result);
      return result;
    };
  }

  // 이미지 크기 계산
  static calculateImageSize(originalWidth, originalHeight, maxSize = 500) {
    const aspectRatio = originalWidth / originalHeight;
    
    if (originalWidth > originalHeight) {
      return {
        width: Math.min(originalWidth, maxSize),
        height: Math.min(originalWidth, maxSize) / aspectRatio
      };
    } else {
      return {
        width: Math.min(originalHeight, maxSize) * aspectRatio,
        height: Math.min(originalHeight, maxSize)
      };
    }
  }

  // 화면 크기별 최적화된 설정 반환
  static getOptimizedSettings() {
    const { width, height } = Dimensions.get('window');
    const isSmallScreen = width < 375;
    const isTablet = width > 768;

    return {
      initialNumToRender: isSmallScreen ? 5 : isTablet ? 15 : 10,
      maxToRenderPerBatch: isSmallScreen ? 3 : isTablet ? 8 : 5,
      imageQuality: isSmallScreen ? 0.7 : 0.8,
      cacheSize: isSmallScreen ? 50 : isTablet ? 200 : 100
    };
  }

  // 메모리 사용량 모니터링 (개발 모드에서만)
  static monitorMemory() {
    if (__DEV__ && global.performance && global.performance.memory) {
      const memory = global.performance.memory;
      console.log('📊 메모리 사용량:', {
        used: `${Math.round(memory.usedJSHeapSize / 1048576)} MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1048576)} MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1048576)} MB`
      });
    }
  }

  // 렌더링 성능 측정
  static measureRenderPerformance(componentName, renderFunction) {
    if (__DEV__) {
      const startTime = Date.now();
      const result = renderFunction();
      const endTime = Date.now();
      
      if (endTime - startTime > 16) { // 60fps 기준
        console.warn(`⚠️ ${componentName} 렌더링 시간: ${endTime - startTime}ms`);
      }
      
      return result;
    }
    return renderFunction();
  }

  // 큰 리스트를 청크로 분할
  static chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // 백그라운드에서 무거운 작업 처리
  static async processInBackground(data, processor, batchSize = 10) {
    const chunks = this.chunkArray(data, batchSize);
    const results = [];

    for (const chunk of chunks) {
      await new Promise(resolve => {
        setTimeout(async () => {
          const chunkResults = await Promise.all(
            chunk.map(item => processor(item))
          );
          results.push(...chunkResults);
          resolve();
        }, PERFORMANCE_CONFIG.MEMORY_OPTIMIZATION.BACKGROUND_TASK_DELAY);
      });
    }

    return results;
  }

  // 리소스 정리
  static cleanup() {
    // 이미지 캐시 정리
    if (global.Image && global.Image.clearCache) {
      global.Image.clearCache();
    }

    // 강제 가비지 컬렉션 (개발 모드에서만)
    if (__DEV__ && global.gc) {
      global.gc();
    }

    console.log('🧹 리소스 정리 완료');
  }

  // 네트워크 상태에 따른 설정 조정
  static getNetworkOptimizedSettings(connectionType) {
    const baseConfig = PERFORMANCE_CONFIG.NETWORK_OPTIMIZATION;
    
    switch (connectionType) {
      case 'wifi':
        return {
          ...baseConfig,
          REQUEST_TIMEOUT: 10000,
          BATCH_DELAY: 25
        };
      case 'cellular':
        return {
          ...baseConfig,
          REQUEST_TIMEOUT: 20000,
          BATCH_DELAY: 100
        };
      case 'slow':
        return {
          ...baseConfig,
          REQUEST_TIMEOUT: 30000,
          BATCH_DELAY: 200,
          MAX_RETRIES: 5
        };
      default:
        return baseConfig;
    }
  }
}

// React Native 성능 최적화 HOC
export const withPerformanceOptimization = (WrappedComponent) => {
  return React.memo(WrappedComponent, (prevProps, nextProps) => {
    // 얕은 비교로 불필요한 리렌더링 방지
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);
    
    if (prevKeys.length !== nextKeys.length) {
      return false;
    }
    
    for (let key of prevKeys) {
      if (prevProps[key] !== nextProps[key]) {
        return false;
      }
    }
    
    return true;
  });
};

// 전역 성능 모니터링 설정
export const setupPerformanceMonitoring = () => {
  if (__DEV__) {
    // 메모리 모니터링 간격 설정
    setInterval(() => {
      PerformanceUtils.monitorMemory();
    }, PERFORMANCE_CONFIG.MEMORY_OPTIMIZATION.CLEANUP_INTERVAL);

    // 렌더링 성능 추적
    console.log('📊 성능 모니터링 활성화');
  }
};

export default PERFORMANCE_CONFIG; 