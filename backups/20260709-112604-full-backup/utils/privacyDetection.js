/**
 * 개인정보 감지 유틸리티
 * 전화번호, 이메일, 주민등록번호, 카카오톡, 라인 등 개인정보 노출을 감지합니다.
 */

// 개인정보 패턴 정의
const PRIVACY_PATTERNS = {
  // 전화번호 패턴 (010-0000-0000, 0100000000, 010 0000 0000 등)
  PHONE: /(010|011|016|017|018|019)[\s\-]?[0-9]{3,4}[\s\-]?[0-9]{4}/g,
  
  // 8자리 숫자 패턴 (계좌번호 등)
  EIGHT_DIGITS: /\b[0-9]{8}\b/g,
  
  // 이메일 패턴
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  
  // 주민등록번호 패턴 (901201-1234567, 9012011234567 등)
  SOCIAL_SECURITY: /[0-9]{6}[\s\-]?[0-9]{7}/g,
  
  // 카카오톡 관련 키워드
  KAKAO: /카카오톡|카톡|ㅋr톡/gi,
  
  // 라인 관련 키워드
  LINE: /라인|ㄹr인/gi,
  
  // 은행명 키워드
  BANK: /국민은행|우리은행|신한은행|농협|케이뱅크|카카오뱅크|하나은행|기업은행|새마을금고|신협|우체국|수협|대구은행|부산은행|경남은행|광주은행|전북은행|제주은행|산업은행|수출입은행|한국은행|국민|우리|신한|농협|케이뱅크|카카오뱅크|하나|기업|새마을|신협|우체국|수협|대구|부산|경남|광주|전북|제주|산업|수출입|한국은행/gi,
  
  // 인스타그램 관련 키워드
  INSTAGRAM: /인스타그램|인스타|인별|디엠|DM|dm/gi,
};

/**
 * 메시지에서 개인정보를 감지합니다.
 * @param {string} message - 검사할 메시지
 * @returns {Object} 감지 결과
 */
export const detectPrivacyViolation = (message) => {
  if (!message || typeof message !== 'string') {
    return { hasViolation: false, violations: [] };
  }

  const violations = [];
  const detectedTypes = new Set();

  // 각 패턴별로 검사
  Object.entries(PRIVACY_PATTERNS).forEach(([type, pattern]) => {
    const matches = message.match(pattern);
    if (matches && matches.length > 0) {
      violations.push({
        type,
        matches,
        pattern: pattern.toString()
      });
      detectedTypes.add(type);
    }
  });

  return {
    hasViolation: violations.length > 0,
    violations,
    detectedTypes: Array.from(detectedTypes)
  };
};

/**
 * 감지된 개인정보 유형에 따른 경고 메시지를 생성합니다.
 * @param {Array} detectedTypes - 감지된 개인정보 유형 배열
 * @returns {string} 경고 메시지
 */
export const generatePrivacyWarningMessage = (detectedTypes) => {
  if (!detectedTypes || detectedTypes.length === 0) {
    return "개인정보 노출 우려가 감지되었습니다.";
  }

  const typeMessages = {
    PHONE: "전화번호",
    EIGHT_DIGITS: "계좌번호",
    EMAIL: "이메일 주소",
    SOCIAL_SECURITY: "주민등록번호",
    KAKAO: "카카오톡 관련 정보",
    LINE: "라인 관련 정보",
    BANK: "은행 관련 정보",
    INSTAGRAM: "인스타그램 관련 정보"
  };

  const detectedTypeNames = detectedTypes
    .map(type => typeMessages[type])
    .filter(Boolean);

  if (detectedTypeNames.length === 1) {
    return `${detectedTypeNames[0]} 노출 우려가 감지되었습니다.`;
  } else if (detectedTypeNames.length === 2) {
    return `${detectedTypeNames[0]} 및 ${detectedTypeNames[1]} 노출 우려가 감지되었습니다.`;
  } else {
    return "개인정보 노출 우려가 감지되었습니다.";
  }
};

/**
 * 개인정보가 포함된 메시지를 마스킹 처리합니다.
 * @param {string} message - 원본 메시지
 * @returns {string} 마스킹된 메시지
 */
export const maskPrivacyViolations = (message) => {
  if (!message || typeof message !== 'string') {
    return message;
  }

  let maskedMessage = message;

  // 전화번호 마스킹 (010-1234-5678 -> 010-****-****)
  maskedMessage = maskedMessage.replace(PRIVACY_PATTERNS.PHONE, (match) => {
    const cleaned = match.replace(/[\s\-]/g, '');
    if (cleaned.length >= 10) {
      return cleaned.substring(0, 3) + '-****-****';
    }
    return '***-****-****';
  });

  // 이메일 마스킹 (abc@domain.com -> a**@domain.com)
  maskedMessage = maskedMessage.replace(PRIVACY_PATTERNS.EMAIL, (match) => {
    const [local, domain] = match.split('@');
    if (local.length > 1) {
      return local[0] + '*'.repeat(local.length - 1) + '@' + domain;
    }
    return '***@' + domain;
  });

  // 주민등록번호 마스킹 (901201-1234567 -> 901201-*******)
  maskedMessage = maskedMessage.replace(PRIVACY_PATTERNS.SOCIAL_SECURITY, (match) => {
    const cleaned = match.replace(/[\s\-]/g, '');
    if (cleaned.length >= 13) {
      return cleaned.substring(0, 6) + '-*******';
    }
    return '******-*******';
  });

  // 카카오톡/라인 키워드 마스킹
  maskedMessage = maskedMessage.replace(PRIVACY_PATTERNS.KAKAO, '***');
  maskedMessage = maskedMessage.replace(PRIVACY_PATTERNS.LINE, '***');

  return maskedMessage;
};

export default {
  detectPrivacyViolation,
  generatePrivacyWarningMessage,
  maskPrivacyViolations,
  PRIVACY_PATTERNS
};
