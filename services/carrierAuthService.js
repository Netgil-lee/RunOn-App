// 통신사 본인인증 서비스
// 실제 구현 시에는 각 통신사의 공식 API를 사용해야 합니다.

class CarrierAuthService {
  constructor() {
    // 각 통신사의 API 엔드포인트 (실제 구현 시 변경 필요)
    this.endpoints = {
      SKT: 'https://api.skt.com/auth/verify',
      KT: 'https://api.kt.com/auth/verify', 
      LGU: 'https://api.lguplus.co.kr/auth/verify'
    };
  }

  // 통신사별 본인인증 실행
  async verifyIdentity(authData) {
    const { carrier, birthDate, gender, phoneNumber } = authData;
    
    console.log('🔐 통신사 본인인증 시작:', {
      carrier,
      birthDate,
      gender,
      phoneNumber
    });

    try {
      // 개발/테스트 모드 (실제 API 호출 대신 시뮬레이션)
      if (this.isTestMode(authData)) {
        return await this.simulateCarrierAuth(authData);
      }

      // 실제 통신사 API 호출
      return await this.callCarrierAPI(authData);
      
    } catch (error) {
      console.error('❌ 통신사 본인인증 실패:', error);
      throw new Error(this.getErrorMessage(error, carrier));
    }
  }

  // 테스트 모드 확인
  isTestMode(authData) {
    const { phoneNumber } = authData;
    // 테스트용 번호들
    const testNumbers = [
      '010-0000-0000',
      '010-1111-1111', 
      '010-2222-2222'
    ];
    return testNumbers.includes(phoneNumber);
  }

  // 테스트 모드 시뮬레이션
  async simulateCarrierAuth(authData) {
    const { carrier, birthDate, gender, phoneNumber } = authData;
    
    console.log('🧪 테스트 모드: 통신사 본인인증 시뮬레이션');
    
    // 인증 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 유효성 검사
    if (!this.validateTestData(authData)) {
      throw new Error('입력 정보가 올바르지 않습니다.');
    }

    // 성공 응답 시뮬레이션
    const calculatedAge = this.calculateAge(birthDate);
    console.log('🧪 테스트 모드: 계산된 나이:', calculatedAge, '생년월일:', birthDate);
    
    const result = {
      success: true,
      carrier: carrier,
      phoneNumber: phoneNumber,
      birthDate: birthDate,
      gender: gender,
      verifiedAt: new Date().toISOString(),
      transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userInfo: {
        name: '테스트 사용자',
        age: calculatedAge,
        gender: gender === 'M' ? '남성' : '여성',
        phoneNumber: phoneNumber
      }
    };

    console.log('✅ 테스트 모드 인증 성공:', result);
    return result;
  }

  // 테스트 데이터 유효성 검사
  validateTestData(authData) {
    const { birthDate, gender, phoneNumber } = authData;
    
    // 생년월일 형식 검사 (YYYY-MM-DD)
    const birthRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!birthRegex.test(birthDate)) {
      return false;
    }

    // 성별 검사
    if (!['M', 'F'].includes(gender)) {
      return false;
    }

    // 휴대폰번호 형식 검사 (010-XXXX-XXXX)
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return false;
    }

    // 생년월일 유효성 검사
    const birthDateObj = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDateObj.getFullYear();
    
    if (age < 14 || age > 100) {
      return false;
    }

    return true;
  }

  // 나이 계산
  calculateAge(birthDate) {
    const birthDateObj = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    
    return age;
  }

  // 실제 통신사 API 호출
  async callCarrierAPI(authData) {
    const { carrier } = authData;
    const endpoint = this.endpoints[carrier];
    
    if (!endpoint) {
      throw new Error('지원하지 않는 통신사입니다.');
    }

    console.log(`📞 ${carrier} API 호출 중...`);
    
    // 실제 구현 시에는 각 통신사의 공식 SDK나 API를 사용해야 합니다
    // 여기서는 예시 코드만 제공합니다
    
    const requestData = this.formatRequestData(authData);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getCarrierAPIKey(carrier)}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '본인인증에 실패했습니다.');
      }

      return result;
      
    } catch (error) {
      console.error(`❌ ${carrier} API 호출 실패:`, error);
      throw error;
    }
  }

  // API 요청 데이터 포맷팅
  formatRequestData(authData) {
    const { carrier, birthDate, gender, phoneNumber } = authData;
    
    // 통신사별 요청 데이터 형식 (실제 API 문서에 따라 수정 필요)
    const baseData = {
      phoneNumber: phoneNumber.replace(/[^\d]/g, ''),
      birthDate: birthDate,
      gender: gender,
      timestamp: new Date().toISOString(),
      appId: this.getAppId(),
      deviceId: this.getDeviceId()
    };

    // 통신사별 특별한 요구사항 추가
    switch (carrier) {
      case 'SKT':
        return {
          ...baseData,
          carrier: 'SKT',
          apiVersion: '2.0'
        };
      case 'KT':
        return {
          ...baseData,
          carrier: 'KT',
          apiVersion: '1.5'
        };
      case 'LGU':
        return {
          ...baseData,
          carrier: 'LGU',
          apiVersion: '2.1'
        };
      default:
        return baseData;
    }
  }

  // 앱 ID 가져오기 (실제 구현 시 환경변수나 설정에서 가져옴)
  getAppId() {
    return 'netgill-app-id';
  }

  // 디바이스 ID 가져오기 (실제 구현 시 디바이스 정보에서 가져옴)
  getDeviceId() {
    return 'device-id-' + Date.now();
  }

  // 통신사별 API 키 가져오기 (실제 구현 시 보안 저장소에서 가져옴)
  getCarrierAPIKey(carrier) {
    const apiKeys = {
      SKT: process.env.SKT_API_KEY || 'skt-api-key',
      KT: process.env.KT_API_KEY || 'kt-api-key', 
      LGU: process.env.LGU_API_KEY || 'lgu-api-key'
    };
    
    return apiKeys[carrier];
  }

  // 에러 메시지 처리
  getErrorMessage(error, carrier) {
    const errorMessages = {
      'INVALID_PHONE_NUMBER': '유효하지 않은 휴대폰번호입니다.',
      'INVALID_BIRTH_DATE': '유효하지 않은 생년월일입니다.',
      'INVALID_GENDER': '유효하지 않은 성별입니다.',
      'AUTH_FAILED': '본인인증에 실패했습니다.',
      'CARRIER_MISMATCH': '입력한 휴대폰번호와 선택한 통신사가 일치하지 않습니다.',
      'SERVICE_UNAVAILABLE': '서비스가 일시적으로 이용할 수 없습니다.',
      'NETWORK_ERROR': '네트워크 연결을 확인해주세요.',
      'TIMEOUT': '인증 시간이 초과되었습니다. 다시 시도해주세요.'
    };

    // 통신사별 특별한 에러 메시지
    const carrierSpecificMessages = {
      SKT: {
        'SKT_SERVICE_DOWN': 'SKT 서비스가 일시적으로 중단되었습니다.',
        'SKT_AUTH_FAILED': 'SKT 본인인증에 실패했습니다.'
      },
      KT: {
        'KT_SERVICE_DOWN': 'KT 서비스가 일시적으로 중단되었습니다.',
        'KT_AUTH_FAILED': 'KT 본인인증에 실패했습니다.'
      },
      LGU: {
        'LGU_SERVICE_DOWN': 'LG U+ 서비스가 일시적으로 중단되었습니다.',
        'LGU_AUTH_FAILED': 'LG U+ 본인인증에 실패했습니다.'
      }
    };

    // 통신사별 에러 메시지 확인
    const carrierMessages = carrierSpecificMessages[carrier] || {};
    const allMessages = { ...errorMessages, ...carrierMessages };

    return allMessages[error.code] || error.message || '본인인증 중 오류가 발생했습니다.';
  }

  // 통신사별 지원 여부 확인
  isCarrierSupported(carrier) {
    return ['SKT', 'KT', 'LGU'].includes(carrier);
  }

  // 통신사별 서비스 상태 확인 (실제 구현 시 각 통신사 API로 확인)
  async checkCarrierServiceStatus(carrier) {
    if (!this.isCarrierSupported(carrier)) {
      return { available: false, message: '지원하지 않는 통신사입니다.' };
    }

    // 실제 구현 시에는 각 통신사의 서비스 상태 API를 호출
    // 여기서는 항상 사용 가능하다고 가정
    return { available: true, message: '서비스 정상' };
  }
}

// 싱글톤 인스턴스 생성
const carrierAuthService = new CarrierAuthService();

export default carrierAuthService; 