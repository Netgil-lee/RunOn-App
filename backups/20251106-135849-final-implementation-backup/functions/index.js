const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const functions = require('firebase-functions/v1');

// Firebase Admin 초기화
admin.initializeApp();

// 이메일 전송 설정
// Gmail SMTP 사용 (환경 변수로 설정)
const createTransporter = () => {
  const emailUser = functions.config().email?.user || process.env.EMAIL_USER;
  const emailPassword = functions.config().email?.password || process.env.EMAIL_PASSWORD;
  const emailService = functions.config().email?.service || process.env.EMAIL_SERVICE || 'gmail';

  if (!emailUser || !emailPassword) {
    console.error('❌ 이메일 설정이 누락되었습니다.');
    return null;
  }

  return nodemailer.createTransport({
    service: emailService,
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
};

// 관리자 이메일 주소
const ADMIN_EMAIL = functions.config().admin?.email || process.env.ADMIN_EMAIL || 'dlrhdkgml12@gmail.com';

/**
 * 신고 데이터로부터 이메일 내용 생성
 */
const generateEmailContent = async (reportData, reportId) => {
  const { contentType, contentId, reason, description, reportedBy, reportedUserId, postId } = reportData;

  // 신고자 정보 가져오기
  let reporterInfo = null;
  try {
    const reporterDoc = await admin.firestore().collection('users').doc(reportedBy).get();
    if (reporterDoc.exists) {
      const reporterData = reporterDoc.data();
      reporterInfo = {
        displayName: reporterData.displayName || reporterData.profile?.nickname || '알 수 없음',
        email: reporterData.email || '알 수 없음',
        uid: reportedBy,
      };
    }
  } catch (error) {
    console.error('신고자 정보 가져오기 실패:', error);
  }

  // 신고 대상 정보 가져오기
  let targetInfo = null;
  try {
    if (contentType === 'post') {
      const postDoc = await admin.firestore().collection('posts').doc(contentId).get();
      if (postDoc.exists) {
        const postData = postDoc.data();
        targetInfo = {
          type: '게시글',
          title: postData.title || '제목 없음',
          content: postData.content?.substring(0, 200) || '내용 없음',
          authorId: postData.authorId || '알 수 없음',
        };
      }
    } else if (contentType === 'comment') {
      const postDoc = await admin.firestore().collection('posts').doc(postId).get();
      if (postDoc.exists) {
        const comments = postDoc.data().comments || [];
        const comment = comments.find(c => c.id === contentId);
        if (comment) {
          targetInfo = {
            type: '댓글',
            content: comment.text?.substring(0, 200) || '내용 없음',
            authorId: comment.authorId || '알 수 없음',
            postId: postId,
          };
        }
      }
    } else if (contentType === 'user') {
      const userDoc = await admin.firestore().collection('users').doc(contentId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        targetInfo = {
          type: '사용자',
          displayName: userData.displayName || userData.profile?.nickname || '알 수 없음',
          email: userData.email || '알 수 없음',
          uid: contentId,
        };
      }
    }
  } catch (error) {
    console.error('신고 대상 정보 가져오기 실패:', error);
  }

  // 이메일 제목
  const subject = `[RunOn 신고] ${targetInfo?.type || contentType} 신고 접수`;

  // 이메일 본문
  const emailBody = `
새로운 신고가 접수되었습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 신고 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
신고 ID: ${reportId}
신고 타입: ${targetInfo?.type || contentType}
신고 사유: ${reason}
신고 시간: ${reportData.createdAt ? (reportData.createdAt.toDate ? new Date(reportData.createdAt.toDate()).toLocaleString('ko-KR') : new Date(reportData.createdAt).toLocaleString('ko-KR')) : '알 수 없음'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 신고자 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
이름: ${reporterInfo?.displayName || '알 수 없음'}
이메일: ${reporterInfo?.email || '알 수 없음'}
사용자 ID: ${reportedBy}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 신고 대상 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${targetInfo ? Object.entries(targetInfo).map(([key, value]) => `${key}: ${value}`).join('\n') : '정보를 가져올 수 없습니다.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 추가 설명
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${description || '(추가 설명 없음)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 Firestore 콘솔
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Firebase 콘솔에서 신고를 확인하고 조치하세요:
https://console.firebase.google.com/project/${admin.app().options.projectId}/firestore/data/~2Freports~2F${reportId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 중요
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
신고 접수 후 24시간 이내에 조치를 취해야 합니다.
Apple Guideline 1.2 준수를 위해 신속한 대응이 필요합니다.
`;

  return {
    subject,
    text: emailBody,
    html: emailBody.replace(/\n/g, '<br>').replace(/━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━/g, '<hr>'),
  };
};

/**
 * 신고가 생성될 때 트리거되는 Cloud Function
 */
exports.onReportCreated = functions.firestore
  .document('reports/{reportId}')
  .onCreate(async (snap, context) => {
    const reportId = context.params.reportId;
    const reportData = snap.data();

    console.log('📧 신고 접수 알림 전송 시작:', reportId);

    try {
      // 이메일 내용 생성
      const emailContent = await generateEmailContent(reportData, reportId);

      // 이메일 전송기 생성
      const transporter = createTransporter();
      if (!transporter) {
        console.error('❌ 이메일 전송기 생성 실패');
        return null;
      }

      // 이메일 전송
      const mailOptions = {
        from: `"RunOn 신고 시스템" <${functions.config().email?.user || process.env.EMAIL_USER}>`,
        to: ADMIN_EMAIL,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('✅ 이메일 전송 완료:', result.messageId);
      console.log('📧 수신자:', ADMIN_EMAIL);

      return result;
    } catch (error) {
      console.error('❌ 이메일 전송 실패:', error);
      console.error('신고 ID:', reportId);
      console.error('에러 상세:', error.message);
      throw error;
    }
  });

