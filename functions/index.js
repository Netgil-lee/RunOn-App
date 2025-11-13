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
      // 게시글/댓글 신고인 경우에만 actionDeadline 설정 (24시간 후)
      if (reportData.contentType === 'post' || reportData.contentType === 'comment') {
        const actionDeadline = new Date();
        actionDeadline.setHours(actionDeadline.getHours() + 24); // 24시간 후
        
        // 신고 문서에 actionDeadline 필드 추가
        await admin.firestore().collection('reports').doc(reportId).update({
          actionDeadline: admin.firestore.Timestamp.fromDate(actionDeadline),
          autoActionTaken: false,
        });
        
        console.log('✅ actionDeadline 설정 완료:', actionDeadline.toISOString());
      }

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

/**
 * 24시간 경과한 신고를 자동으로 처리하는 스케줄러
 * 1시간마다 실행하여 24시간 내 조치를 보장
 * Apple Guideline 2.1 준수: 신고 접수 후 24시간 내 콘텐츠 제거 및 사용자 추방
 */
exports.checkPendingReports = functions.pubsub
  .schedule('0 * * * *') // 매시간 정각 (00분) 실행
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    console.log('🕐 신고 자동 처리 스케줄러 실행 시작');

    try {
      const now = admin.firestore.Timestamp.now();
      const reportsRef = admin.firestore().collection('reports');
      
      // 24시간 경과한 미처리 신고 찾기 (게시글/댓글만)
      const pendingReportsQuery = await reportsRef
        .where('status', '==', 'pending')
        .where('contentType', 'in', ['post', 'comment'])
        .where('actionDeadline', '<=', now)
        .where('autoActionTaken', '==', false)
        .get();

      console.log(`📋 처리할 신고 개수: ${pendingReportsQuery.size}`);

      const results = [];
      
      for (const reportDoc of pendingReportsQuery.docs) {
        const reportId = reportDoc.id;
        const reportData = reportDoc.data();
        
        try {
          console.log(`🔄 신고 처리 시작: ${reportId} (${reportData.contentType})`);
          
          let result;
          if (reportData.contentType === 'post') {
            result = await autoRemovePost(reportId, reportData);
          } else if (reportData.contentType === 'comment') {
            result = await autoRemoveComment(reportId, reportData);
          }
          
          results.push({ reportId, success: true, result });
          console.log(`✅ 신고 처리 완료: ${reportId}`);
        } catch (error) {
          console.error(`❌ 신고 처리 실패: ${reportId}`, error);
          results.push({ reportId, success: false, error: error.message });
        }
      }

      console.log(`✅ 신고 자동 처리 완료: ${results.length}개 처리`);
      return { processed: results.length, results };
    } catch (error) {
      console.error('❌ 신고 자동 처리 스케줄러 실패:', error);
      throw error;
    }
  });

/**
 * 게시글 자동 제거
 */
async function autoRemovePost(reportId, reportData) {
  const { contentId, reportedUserId } = reportData;
  
  try {
    // 1. 게시글 삭제
    const postRef = admin.firestore().collection('posts').doc(contentId);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      console.log(`⚠️ 게시글이 이미 삭제됨: ${contentId}`);
    } else {
      // 게시글 이미지 삭제 (Storage)
      try {
        const bucket = admin.storage().bucket();
        const postImagesPath = `post-images/posts/${contentId}`;
        const [files] = await bucket.getFiles({ prefix: postImagesPath });
        
        if (files.length > 0) {
          await Promise.all(files.map(file => file.delete()));
          console.log(`✅ 게시글 이미지 삭제 완료: ${contentId}`);
        }
      } catch (storageError) {
        console.error('⚠️ 게시글 이미지 삭제 실패 (무시):', storageError);
      }
      
      // 게시글 삭제
      await postRef.delete();
      console.log(`✅ 게시글 삭제 완료: ${contentId}`);
    }
    
    // 2. 신고 상태 업데이트
    await admin.firestore().collection('reports').doc(reportId).update({
      status: 'action_taken',
      autoActionTaken: true,
      actionTakenAt: admin.firestore.FieldValue.serverTimestamp(),
      actionType: 'auto_removed',
    });
    
    // 3. 사용자 신고 횟수 증가
    if (reportedUserId) {
      await incrementUserReportCount(reportedUserId);
    }
    
    // 4. 작성자에게 알림 생성 (Alert용)
    if (reportedUserId) {
      await createContentRemovedNotification(reportedUserId, 'post', contentId);
    }
    
    return { success: true, postId: contentId };
  } catch (error) {
    console.error('❌ 게시글 자동 제거 실패:', error);
    throw error;
  }
}

/**
 * 댓글 자동 제거
 */
async function autoRemoveComment(reportId, reportData) {
  const { contentId, postId, reportedUserId } = reportData;
  
  try {
    // 1. 게시글에서 댓글 제거
    const postRef = admin.firestore().collection('posts').doc(postId);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      console.log(`⚠️ 게시글이 이미 삭제됨: ${postId}`);
    } else {
      const postData = postDoc.data();
      const comments = postData.comments || [];
      const updatedComments = comments.filter(comment => comment.id !== contentId);
      
      await postRef.update({ comments: updatedComments });
      console.log(`✅ 댓글 제거 완료: ${contentId} (게시글: ${postId})`);
    }
    
    // 2. 신고 상태 업데이트
    await admin.firestore().collection('reports').doc(reportId).update({
      status: 'action_taken',
      autoActionTaken: true,
      actionTakenAt: admin.firestore.FieldValue.serverTimestamp(),
      actionType: 'auto_removed',
    });
    
    // 3. 사용자 신고 횟수 증가
    if (reportedUserId) {
      await incrementUserReportCount(reportedUserId);
    }
    
    // 4. 작성자에게 알림 생성 (Alert용)
    if (reportedUserId) {
      await createContentRemovedNotification(reportedUserId, 'comment', contentId, postId);
    }
    
    return { success: true, commentId: contentId, postId };
  } catch (error) {
    console.error('❌ 댓글 자동 제거 실패:', error);
    throw error;
  }
}

/**
 * 사용자 신고 횟수 증가
 */
async function incrementUserReportCount(userId) {
  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log(`⚠️ 사용자를 찾을 수 없음: ${userId}`);
      return;
    }
    
    const userData = userDoc.data();
    const currentReportCount = userData.reportCount || 0;
    const newReportCount = currentReportCount + 1;
    
    await userRef.update({
      reportCount: newReportCount,
      lastReportedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log(`✅ 사용자 신고 횟수 증가: ${userId} (${currentReportCount} → ${newReportCount})`);
    
    // 3회 이상이면 계정 정지
    if (newReportCount >= 3) {
      await banUser(userId, `반복적인 정책 위반 (신고 횟수: ${newReportCount})`);
    }
    
    return newReportCount;
  } catch (error) {
    console.error('❌ 사용자 신고 횟수 증가 실패:', error);
    throw error;
  }
}

/**
 * 사용자 계정 정지
 */
async function banUser(userId, reason) {
  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    
    await userRef.update({
      isBanned: true,
      bannedAt: admin.firestore.FieldValue.serverTimestamp(),
      banReason: reason,
    });
    
    console.log(`✅ 사용자 계정 정지: ${userId} (사유: ${reason})`);
    
    // 계정 정지 알림 생성
    await createAccountBannedNotification(userId, reason);
    
    return { success: true, userId };
  } catch (error) {
    console.error('❌ 사용자 계정 정지 실패:', error);
    throw error;
  }
}

/**
 * 콘텐츠 제거 알림 생성 (Alert용)
 */
async function createContentRemovedNotification(userId, contentType, contentId, postId = null) {
  try {
    const notificationRef = admin.firestore().collection('notifications');
    
    // 사용자 정보 가져오기 (신고 횟수 확인)
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const reportCount = userData.reportCount || 0;
    
    const contentTypeText = contentType === 'post' ? '게시글' : '댓글';
    const title = `${contentTypeText}이 삭제되었습니다`;
    const message = `${contentTypeText}이 정책 위반으로 삭제되었습니다.\n신고 횟수: ${reportCount}/3 (3회 시 계정이 정지됩니다)`;
    
    await notificationRef.add({
      userId: userId,
      type: 'content_removed',
      title: title,
      message: message,
      contentType: contentType,
      contentId: contentId,
      postId: postId,
      reportCount: reportCount,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      isRead: false,
      showAlert: true, // Alert 표시 플래그
    });
    
    console.log(`✅ 콘텐츠 제거 알림 생성: ${userId} (${contentType})`);
  } catch (error) {
    console.error('❌ 콘텐츠 제거 알림 생성 실패:', error);
  }
}

/**
 * 계정 정지 알림 생성 (Alert용)
 */
async function createAccountBannedNotification(userId, reason) {
  try {
    const notificationRef = admin.firestore().collection('notifications');
    
    await notificationRef.add({
      userId: userId,
      type: 'account_banned',
      title: '계정이 정지되었습니다',
      message: `반복적인 정책 위반으로 계정이 정지되었습니다.\n사유: ${reason}\n문의: dlrhdkgml12@gmail.com`,
      reason: reason,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      isRead: false,
      showAlert: true, // Alert 표시 플래그
    });
    
    console.log(`✅ 계정 정지 알림 생성: ${userId}`);
  } catch (error) {
    console.error('❌ 계정 정지 알림 생성 실패:', error);
  }
}

