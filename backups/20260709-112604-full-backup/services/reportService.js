import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

class ReportService {
  constructor() {
    this.db = getFirestore();
    this.auth = getAuth();
  }

  /**
   * 신고하기
   * @param {Object} reportData - 신고 데이터
   * @param {string} reportData.contentType - 'post' | 'comment' | 'user'
   * @param {string} reportData.contentId - 신고 대상 콘텐츠 ID
   * @param {string} reportData.reason - 신고 사유
   * @param {string} reportData.description - 추가 설명 (선택)
   * @param {string} reportData.reportedUserId - 신고 대상 사용자 ID (선택)
   * @returns {Promise<{success: boolean, id?: string, error?: string}>}
   */
  async submitReport(reportData) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      const { contentType, contentId, reason, description, reportedUserId } = reportData;

      if (!contentType || !contentId || !reason) {
        throw new Error('필수 정보가 누락되었습니다.');
      }

      // 신고 데이터 생성
      const report = {
        reportedBy: user.uid,
        contentType, // 'post' | 'comment' | 'user'
        contentId,
        reason,
        description: description || '',
        reportedUserId: reportedUserId || null,
        postId: reportData.postId || null, // 댓글 신고 시 게시글 ID
        status: 'pending', // 'pending' | 'reviewed' | 'action_taken' | 'dismissed'
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Firestore에 신고 저장
      const reportsRef = collection(this.db, 'reports');
      const docRef = await addDoc(reportsRef, report);

      console.log('✅ 신고 제출 완료:', docRef.id);

      return {
        success: true,
        id: docRef.id,
      };
    } catch (error) {
      console.error('❌ 신고 제출 실패:', error);
      return {
        success: false,
        error: error.message || '신고 제출에 실패했습니다.',
      };
    }
  }

  /**
   * 게시글 신고
   */
  async reportPost(postId, postAuthorId, reason, description = '') {
    return await this.submitReport({
      contentType: 'post',
      contentId: postId,
      reason,
      description,
      reportedUserId: postAuthorId,
    });
  }

  /**
   * 댓글 신고
   */
  async reportComment(commentId, postId, commentAuthorId, reason, description = '') {
    return await this.submitReport({
      contentType: 'comment',
      contentId: commentId,
      reason,
      description,
      reportedUserId: commentAuthorId,
      postId, // 게시글 ID도 함께 저장
    });
  }

  /**
   * 사용자 신고
   */
  async reportUser(userId, reason, description = '') {
    return await this.submitReport({
      contentType: 'user',
      contentId: userId,
      reason,
      description,
      reportedUserId: userId,
    });
  }
}

const reportService = new ReportService();
export default reportService;

