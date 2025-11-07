/**
 * 콘텐츠 필터링 서비스
 * 부적절한 단어 및 욕설을 감지하여 차단 또는 경고를 제공합니다.
 * 
 * 필터링 레벨:
 * - Level 1 (심각): 즉시 차단 (욕설, 성적 표현, 폭력 등)
 * - Level 2 (경미): 경고 후 선택 허용 (경미한 부적절한 표현)
 */

class ContentFilterService {
  constructor() {
    // Level 1 (심각) - 즉시 차단되는 키워드
    this.blockKeywords = [
      // 심각한 욕설
      '시발', '씨발', '개새끼', '병신', '좆',
      // 성적 표현
      '섹스', '성교', '자지', '보지',
      // 폭력 관련
      '죽여', '죽일', '때려', '패서', '참수',
      // 혐오 표현
      '한남충', '김치녀',
    ];

    // Level 2 (경미) - 경고 후 선택 허용되는 키워드
    this.warningKeywords = [
      // 경미한 표현
      '바보', '멍청이', '등신', '찐따', '호구', '젠장', '미친',
      // 경미한 혐오 표현
      '한남', '한녀',
    ];

    // Level 1 (심각) - 즉시 차단되는 패턴
    this.blockPatterns = [
      /씨[발벌]/gi,
      /[시씨]발/gi,
      /[병빙]신/gi,
      /미친[놈년]/gi,
    ];

    // Level 2 (경미) - 경고 후 선택 허용되는 패턴
    this.warningPatterns = [];
  }

  /**
   * 텍스트에서 부적절한 단어 검사
   * @param {string} text - 검사할 텍스트
   * @returns {Object} 검사 결과
   * {
   *   hasProfanity: boolean,
   *   severity: 'block' | 'warning' | null,
   *   blocked: boolean,
   *   keywords: string[],
   *   warning: string | null
   * }
   */
  checkContent(text) {
    if (!text || typeof text !== 'string') {
      return {
        hasProfanity: false,
        severity: null,
        blocked: false,
        keywords: [],
        warning: null,
      };
    }

    const normalizedText = text.toLowerCase();
    const foundBlockKeywords = [];
    const foundWarningKeywords = [];

    // Level 1 (심각) 키워드 검사 - 즉시 차단
    for (const keyword of this.blockKeywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        foundBlockKeywords.push(keyword);
      }
    }

    // Level 1 (심각) 패턴 검사
    for (const pattern of this.blockPatterns) {
      if (pattern.test(text)) {
        foundBlockKeywords.push('부적절한 표현');
      }
    }

    // Level 2 (경미) 키워드 검사 - 경고 후 선택 허용
    for (const keyword of this.warningKeywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        foundWarningKeywords.push(keyword);
      }
    }

    // Level 2 (경미) 패턴 검사
    for (const pattern of this.warningPatterns) {
      if (pattern.test(text)) {
        foundWarningKeywords.push('부적절한 표현');
      }
    }

    // Level 1 (심각) 키워드가 있으면 즉시 차단
    if (foundBlockKeywords.length > 0) {
      return {
        hasProfanity: true,
        severity: 'block',
        blocked: true,
        keywords: [...new Set(foundBlockKeywords)], // 중복 제거
        warning: '부적절한 콘텐츠가 포함되어 있어 게시할 수 없습니다.',
      };
    }

    // Level 2 (경미) 키워드가 있으면 경고
    if (foundWarningKeywords.length > 0) {
      return {
        hasProfanity: true,
        severity: 'warning',
        blocked: false,
        keywords: [...new Set(foundWarningKeywords)], // 중복 제거
        warning: '부적절한 단어가 포함되어 있습니다. 계속 작성하시겠습니까?',
      };
    }

    // 부적절한 콘텐츠 없음
    return {
      hasProfanity: false,
      severity: null,
      blocked: false,
      keywords: [],
      warning: null,
    };
  }

  /**
   * 게시글 제목 및 내용 검사
   * @param {string} title - 게시글 제목
   * @param {string} content - 게시글 내용
   * @returns {Object} 검사 결과
   * {
   *   hasProfanity: boolean,
   *   severity: 'block' | 'warning' | null,
   *   blocked: boolean,
   *   keywords: string[],
   *   warning: string | null
   * }
   */
  checkPost(title = '', content = '') {
    const titleCheck = this.checkContent(title);
    const contentCheck = this.checkContent(content);

    const allKeywords = [...titleCheck.keywords, ...contentCheck.keywords];
    const hasProfanity = titleCheck.hasProfanity || contentCheck.hasProfanity;
    
    // Level 1 (심각)이 하나라도 있으면 즉시 차단
    const blocked = titleCheck.blocked || contentCheck.blocked;
    const severity = blocked ? 'block' : (hasProfanity ? 'warning' : null);

    // 경고 메시지 결정
    let warning = null;
    if (blocked) {
      warning = '부적절한 콘텐츠가 포함되어 있어 게시할 수 없습니다.';
    } else if (hasProfanity) {
      warning = '부적절한 단어가 포함되어 있습니다. 계속 작성하시겠습니까?';
    }

    return {
      hasProfanity,
      severity,
      blocked,
      keywords: [...new Set(allKeywords)],
      warning,
    };
  }

  /**
   * 댓글 검사
   * @param {string} comment - 댓글 텍스트
   * @returns {Object} 검사 결과
   */
  checkComment(comment = '') {
    return this.checkContent(comment);
  }

  /**
   * Level 1 (심각) 키워드 추가 (동적 업데이트용)
   * @param {Array<string>} keywords - 추가할 키워드 리스트
   */
  addBlockKeywords(keywords) {
    if (Array.isArray(keywords)) {
      this.blockKeywords = [...this.blockKeywords, ...keywords];
    }
  }

  /**
   * Level 2 (경미) 키워드 추가 (동적 업데이트용)
   * @param {Array<string>} keywords - 추가할 키워드 리스트
   */
  addWarningKeywords(keywords) {
    if (Array.isArray(keywords)) {
      this.warningKeywords = [...this.warningKeywords, ...keywords];
    }
  }

  /**
   * Level 1 (심각) 키워드 제거
   * @param {string} keyword - 제거할 키워드
   */
  removeBlockKeyword(keyword) {
    this.blockKeywords = this.blockKeywords.filter(k => k !== keyword);
  }

  /**
   * Level 2 (경미) 키워드 제거
   * @param {string} keyword - 제거할 키워드
   */
  removeWarningKeyword(keyword) {
    this.warningKeywords = this.warningKeywords.filter(k => k !== keyword);
  }
}

// Singleton 인스턴스
const contentFilterService = new ContentFilterService();
export default contentFilterService;


