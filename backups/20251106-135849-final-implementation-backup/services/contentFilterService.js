/**
 * 콘텐츠 필터링 서비스
 * 부적절한 단어 및 욕설을 감지하여 경고를 제공합니다.
 */

class ContentFilterService {
  constructor() {
    // 기본 필터링 키워드 리스트
    // 주의: 실제 앱에서는 더 포괄적인 리스트를 사용하거나, 외부 API를 활용할 수 있습니다.
    this.profanityKeywords = [
      // 욕설 및 혐오 표현
      '시발', '씨발', '개새끼', '병신', '미친', '좆', '젠장',
      '바보', '멍청이', '등신', '찐따', '찐따', '호구',
      // 성적 표현
      '섹스', '성교', '자위', '자지', '보지',
      // 폭력 관련
      '죽여', '죽일', '때려', '패서', '참수',
      // 혐오 표현
      '한남', '한녀', '김치녀', '한남충',
    ];

    // 추가 필터링 패턴 (변형된 욕설 감지용)
    this.profanityPatterns = [
      /씨[발벌]/gi,
      /[시씨]발/gi,
      /[병빙]신/gi,
      /미친[놈년]/gi,
    ];
  }

  /**
   * 텍스트에서 부적절한 단어 검사
   * @param {string} text - 검사할 텍스트
   * @returns {Object} 검사 결과
   */
  checkContent(text) {
    if (!text || typeof text !== 'string') {
      return {
        hasProfanity: false,
        keywords: [],
        warning: null,
      };
    }

    const normalizedText = text.toLowerCase();
    const foundKeywords = [];

    // 키워드 리스트 검사
    for (const keyword of this.profanityKeywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
      }
    }

    // 패턴 검사
    for (const pattern of this.profanityPatterns) {
      if (pattern.test(text)) {
        foundKeywords.push('부적절한 표현');
      }
    }

    if (foundKeywords.length > 0) {
      return {
        hasProfanity: true,
        keywords: [...new Set(foundKeywords)], // 중복 제거
        warning: '부적절한 단어가 포함되어 있습니다. 계속 작성하시겠습니까?',
      };
    }

    return {
      hasProfanity: false,
      keywords: [],
      warning: null,
    };
  }

  /**
   * 게시글 제목 및 내용 검사
   * @param {string} title - 게시글 제목
   * @param {string} content - 게시글 내용
   * @returns {Object} 검사 결과
   */
  checkPost(title = '', content = '') {
    const titleCheck = this.checkContent(title);
    const contentCheck = this.checkContent(content);

    const allKeywords = [...titleCheck.keywords, ...contentCheck.keywords];
    const hasProfanity = titleCheck.hasProfanity || contentCheck.hasProfanity;

    return {
      hasProfanity,
      keywords: [...new Set(allKeywords)],
      warning: hasProfanity ? '부적절한 단어가 포함되어 있습니다. 계속 작성하시겠습니까?' : null,
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
   * 키워드 리스트 추가 (동적 업데이트용)
   * @param {Array<string>} keywords - 추가할 키워드 리스트
   */
  addKeywords(keywords) {
    if (Array.isArray(keywords)) {
      this.profanityKeywords = [...this.profanityKeywords, ...keywords];
    }
  }

  /**
   * 키워드 리스트 제거
   * @param {string} keyword - 제거할 키워드
   */
  removeKeyword(keyword) {
    this.profanityKeywords = this.profanityKeywords.filter(k => k !== keyword);
  }
}

// Singleton 인스턴스
const contentFilterService = new ContentFilterService();
export default contentFilterService;

