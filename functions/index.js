const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const functions = require('firebase-functions/v1');
const { Expo } = require('expo-server-sdk');

// Firebase Admin 초기화
admin.initializeApp();

// Expo Push Notification 클라이언트 초기화
const expo = new Expo();

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

/**
 * 특별상황 삭제 후 매너거리 재계산
 * HTTP 호출로 실행: https://[region]-[project].cloudfunctions.net/recalculateMannerDistance?userId=[userId]
 */
exports.recalculateMannerDistance = functions.https.onRequest(async (req, res) => {
  // CORS 설정
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const userId = req.query.userId || req.body.userId;
    
    if (!userId) {
      res.status(400).json({ error: 'userId가 필요합니다.' });
      return;
    }

    console.log(`🔄 매너거리 재계산 시작: ${userId}`);

    // 1. 사용자 문서 가져오기
    const userRef = admin.firestore().collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      return;
    }

    const userData = userSnap.data();
    const currentMannerDistance = userData.mannerDistance || {};
    const currentDistance = currentMannerDistance.currentDistance || 10.0;

    console.log(`📊 현재 매너거리: ${currentDistance}km`);

    // 2. communityStats 기반으로 기준 거리 계산
    const communityStats = userData.communityStats || {};
    const baseDistance = 10.0;
    const evaluationCount = communityStats.mannerScoreCount || 0;
    const evaluationBonus = Math.min(evaluationCount * 0.1, 2);
    const totalParticipated = communityStats.totalParticipated || 0;
    const participationBonus = totalParticipated >= 10 ? 1.0 : (totalParticipated >= 5 ? 0.5 : 0);
    const hostedEvents = communityStats.hostedEvents || 0;
    const hostingBonus = hostedEvents >= 5 ? 1.0 : (hostedEvents >= 2 ? 0.5 : 0);
    const receivedTags = communityStats.receivedTags || {};
    const totalTags = Object.keys(receivedTags).length;
    const tagBonus = totalTags >= 3 ? 0.2 : 0;
    
    const calculatedBaseDistance = baseDistance + evaluationBonus + participationBonus + hostingBonus + tagBonus;

    // 3. evaluations 컬렉션에서 해당 사용자를 평가한 모든 평가 찾기
    const evaluationsSnapshot = await admin.firestore()
      .collection('evaluations')
      .get();

    // 각 평가의 거리 변화량 계산
    let totalDistanceChange = 0;
    const scoreChanges = {
      5: 1.0,
      4: 0.7,
      3: 0.5,
      2: -0.5,
      1: -0.7
    };
    const situationChanges = {
      "노쇼": -1.0,
      "지각": -0.3,
      "부적절한 행동": -1.0
    };

    let foundEvaluations = 0;

    for (const evalDoc of evaluationsSnapshot.docs) {
      const evalData = evalDoc.data();
      const evaluations = evalData.evaluations || {};
      
      // evaluations 객체에서 해당 사용자 ID 찾기
      if (evaluations[userId]) {
        foundEvaluations++;
        const evaluation = evaluations[userId];
        
        // 매너점수에 따른 변화량
        if (evaluation.mannerScore) {
          totalDistanceChange += scoreChanges[evaluation.mannerScore] || 0;
        }
        
        // 특별상황에 따른 변화량 (evaluations 원본 데이터 기반)
        if (evaluation.specialSituations && Array.isArray(evaluation.specialSituations)) {
          evaluation.specialSituations.forEach(situation => {
            const change = situationChanges[situation] || 0;
            totalDistanceChange += change;
            console.log(`  - 특별상황: ${situation} (${change}km)`);
          });
        }
      }
    }

    console.log(`✅ 평가 데이터 분석 완료: ${foundEvaluations}개의 평가 발견`);
    console.log(`📊 기준 거리: ${calculatedBaseDistance}km`);
    console.log(`📈 총 거리 변화량: ${totalDistanceChange}km`);

    // 4. 매너스코어 재계산
    let totalMannerScore = 0;
    let mannerScoreCount = 0;
    
    for (const evalDoc of evaluationsSnapshot.docs) {
      const evalData = evalDoc.data();
      const evaluations = evalData.evaluations || {};
      
      if (evaluations[userId] && evaluations[userId].mannerScore) {
        totalMannerScore += evaluations[userId].mannerScore;
        mannerScoreCount++;
      }
    }
    
    const newAverageMannerScore = mannerScoreCount > 0 
      ? Math.round((totalMannerScore / mannerScoreCount) * 10) / 10 
      : 5.0;
    
    const oldAverageMannerScore = communityStats.averageMannerScore || 5.0;
    
    console.log(`📊 매너스코어: ${oldAverageMannerScore} → ${newAverageMannerScore} (${mannerScoreCount}개 평가)`);

    // 5. 새로운 거리 계산 (기준 거리 + 모든 변화량)
    const newDistance = Math.max(0, Math.min(42.195, calculatedBaseDistance + totalDistanceChange));
    const distanceChange = newDistance - currentDistance;

    console.log(`📊 거리 변화: ${currentDistance}km → ${newDistance}km (${distanceChange > 0 ? '+' : ''}${distanceChange.toFixed(1)}km)`);

    // 6. 매너거리 및 매너스코어 업데이트
    await userRef.update({
      'mannerDistance.currentDistance': Math.round(newDistance * 10) / 10,
      'mannerDistance.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
      'communityStats.averageMannerScore': newAverageMannerScore,
      'communityStats.mannerScoreCount': mannerScoreCount
    });

    console.log(`✅ 매너거리 재계산 완료: ${userId}`);

    res.status(200).json({
      success: true,
      userId: userId,
      oldDistance: currentDistance,
      newDistance: Math.round(newDistance * 10) / 10,
      distanceChange: Math.round(distanceChange * 10) / 10,
      baseDistance: Math.round(calculatedBaseDistance * 10) / 10,
      totalDistanceChange: Math.round(totalDistanceChange * 10) / 10,
      oldMannerScore: oldAverageMannerScore,
      newMannerScore: newAverageMannerScore,
      mannerScoreCount: mannerScoreCount,
      foundEvaluations: foundEvaluations
    });

  } catch (error) {
    console.error('❌ 매너거리 재계산 실패:', error);
    res.status(500).json({ 
      error: '매너거리 재계산 실패', 
      message: error.message 
    });
  }
});

/**
 * 여러 사용자의 매너거리를 일괄 재계산
 * HTTP 호출로 실행: https://[region]-[project].cloudfunctions.net/recalculateMannerDistanceBatch
 * Body: { userIds: ["userId1", "userId2", ...] }
 */
exports.recalculateMannerDistanceBatch = functions.https.onRequest(async (req, res) => {
  // CORS 설정
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const userIds = req.body.userIds || [];
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ error: 'userIds 배열이 필요합니다.' });
      return;
    }

    console.log(`🔄 매너거리 일괄 재계산 시작: ${userIds.length}명`);

    const results = [];

    for (const userId of userIds) {
      try {
        // 개별 재계산 함수 로직 재사용
        const userRef = admin.firestore().collection('users').doc(userId);
        const userSnap = await userRef.get();
        
        if (!userSnap.exists) {
          results.push({ userId, success: false, error: '사용자를 찾을 수 없습니다.' });
          continue;
        }

        const userData = userSnap.data();
        const currentMannerDistance = userData.mannerDistance || {};
        const currentDistance = currentMannerDistance.currentDistance || 10.0;

        // communityStats 기반으로 기준 거리 계산
        const communityStats = userData.communityStats || {};
        const baseDistance = 10.0;
        const evaluationCount = communityStats.mannerScoreCount || 0;
        const evaluationBonus = Math.min(evaluationCount * 0.1, 2);
        const totalParticipated = communityStats.totalParticipated || 0;
        const participationBonus = totalParticipated >= 10 ? 1.0 : (totalParticipated >= 5 ? 0.5 : 0);
        const hostedEvents = communityStats.hostedEvents || 0;
        const hostingBonus = hostedEvents >= 5 ? 1.0 : (hostedEvents >= 2 ? 0.5 : 0);
        const receivedTags = communityStats.receivedTags || {};
        const totalTags = Object.keys(receivedTags).length;
        const tagBonus = totalTags >= 3 ? 0.2 : 0;
        
        const calculatedBaseDistance = baseDistance + evaluationBonus + participationBonus + hostingBonus + tagBonus;

        // evaluations 컬렉션에서 해당 사용자를 평가한 모든 평가 찾기
        const evaluationsSnapshot = await admin.firestore()
          .collection('evaluations')
          .get();

        // 각 평가의 거리 변화량 계산
        let totalDistanceChange = 0;
        const scoreChanges = {
          5: 1.0,
          4: 0.7,
          3: 0.5,
          2: -0.5,
          1: -0.7
        };
        const situationChanges = {
          "노쇼": -1.0,
          "지각": -0.3,
          "부적절한 행동": -1.0
        };

        let foundEvaluations = 0;

        for (const evalDoc of evaluationsSnapshot.docs) {
          const evalData = evalDoc.data();
          const evaluations = evalData.evaluations || {};
          
          if (evaluations[userId]) {
            foundEvaluations++;
            const evaluation = evaluations[userId];
            
            // 매너점수에 따른 변화량
            if (evaluation.mannerScore) {
              totalDistanceChange += scoreChanges[evaluation.mannerScore] || 0;
            }
            
            // 특별상황에 따른 변화량
            if (evaluation.specialSituations && Array.isArray(evaluation.specialSituations)) {
              evaluation.specialSituations.forEach(situation => {
                const change = situationChanges[situation] || 0;
                totalDistanceChange += change;
              });
            }
          }
        }

        // 매너스코어 재계산
        let totalMannerScore = 0;
        let mannerScoreCount = 0;
        
        for (const evalDoc of evaluationsSnapshot.docs) {
          const evalData = evalDoc.data();
          const evaluations = evalData.evaluations || {};
          
          if (evaluations[userId] && evaluations[userId].mannerScore) {
            totalMannerScore += evaluations[userId].mannerScore;
            mannerScoreCount++;
          }
        }
        
        const newAverageMannerScore = mannerScoreCount > 0 
          ? Math.round((totalMannerScore / mannerScoreCount) * 10) / 10 
          : 5.0;
        
        const oldAverageMannerScore = communityStats.averageMannerScore || 5.0;

        const newDistance = Math.max(0, Math.min(42.195, calculatedBaseDistance + totalDistanceChange));
        const distanceChange = newDistance - currentDistance;

        await userRef.update({
          'mannerDistance.currentDistance': Math.round(newDistance * 10) / 10,
          'mannerDistance.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
          'communityStats.averageMannerScore': newAverageMannerScore,
          'communityStats.mannerScoreCount': mannerScoreCount
        });

        results.push({
          userId,
          success: true,
          oldDistance: currentDistance,
          newDistance: Math.round(newDistance * 10) / 10,
          distanceChange: Math.round(distanceChange * 10) / 10,
          oldMannerScore: oldAverageMannerScore,
          newMannerScore: newAverageMannerScore
        });

        console.log(`✅ ${userId}: ${currentDistance}km → ${Math.round(newDistance * 10) / 10}km`);

      } catch (error) {
        console.error(`❌ ${userId} 재계산 실패:`, error);
        results.push({ userId, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`✅ 일괄 재계산 완료: 성공 ${successCount}명, 실패 ${failCount}명`);

    res.status(200).json({
      success: true,
      total: userIds.length,
      successCount: successCount,
      failCount: failCount,
      results: results
    });

  } catch (error) {
    console.error('❌ 매너거리 일괄 재계산 실패:', error);
    res.status(500).json({ 
      error: '매너거리 일괄 재계산 실패', 
      message: error.message 
    });
  }
});

// ============================================
// 푸시 알림 관련 공통 유틸리티 함수
// ============================================

/**
 * 사용자 알림 설정 가져오기
 */
async function getUserNotificationSettings(userId) {
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.warn(`⚠️ 사용자를 찾을 수 없음: ${userId}`);
      return null;
    }

    const userData = userDoc.data();
    
    // notificationSettings 필드 확인
    if (userData.notificationSettings) {
      return userData.notificationSettings;
    }

    // 기본 설정 반환 (모든 알림 ON)
    return {
      notifications: {
        newsNotification: true,
        meetingReminder: true,
        newMember: true,
        weatherAlert: true,
        safetyAlert: true,
        chatNotification: true
      }
    };
  } catch (error) {
    console.error('❌ 알림 설정 가져오기 실패:', error);
    return null;
  }
}

/**
 * 알림 타입별 설정 확인
 */
function isNotificationTypeEnabled(settings, notificationType) {
  if (!settings || !settings.notifications) {
    return true; // 기본값: 알림 허용
  }

  const { notifications } = settings;

  switch (notificationType) {
    case 'system':
    case 'event':
    case 'tip':
      return notifications.newsNotification !== false;
    case 'weather':
    case 'temperature_high':
    case 'temperature_low':
    case 'rain_heavy':
    case 'rain_moderate':
    case 'wind_strong':
    case 'humidity_high':
    case 'air_very_unhealthy':
    case 'air_unhealthy':
    case 'air_moderate':
      return notifications.weatherAlert !== false;
    case 'safety':
    case 'flood_risk_rain':
    case 'flood_warning':
      return notifications.safetyAlert !== false;
    case 'reminder':
    case 'rating':
    case 'cancel':
    case 'new_participant':
      return notifications.meetingReminder !== false;
    case 'message':
      return notifications.chatNotification !== false;
    case 'like':
    case 'comment':
    case 'mention':
      return notifications.newMember !== false;
    default:
      return true;
  }
}

/**
 * 사용자 정보 가져오기
 */
async function getUserInfo(userId) {
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    return {
      uid: userId,
      displayName: userData.displayName || userData.profile?.nickname || '사용자',
      nickname: userData.profile?.nickname || userData.displayName || '사용자',
      email: userData.email || '',
      profileImage: userData.profileImage || userData.profile?.profileImage || null,
      expoPushToken: userData.expoPushToken || null
    };
  } catch (error) {
    console.error('❌ 사용자 정보 가져오기 실패:', error);
    return null;
  }
}

/**
 * Expo Push API를 통해 알림 전송
 */
async function getUnreadBadgeCount(userId) {
  try {
    if (!userId) {
      return 0;
    }

    const [communitySnapshot, meetingSnapshot] = await Promise.all([
      admin.firestore().collection('notifications')
        .where('userId', '==', userId)
        .where('isRead', '==', false)
        .get(),
      admin.firestore().collection('meetingNotifications')
        .where('targetUserId', '==', userId)
        .where('isRead', '==', false)
        .get(),
    ]);

    return communitySnapshot.size + meetingSnapshot.size;
  } catch (error) {
    console.error(`❌ 배지 카운트 조회 실패: ${userId}`, error);
    return 0;
  }
}

async function sendExpoPushNotification(expoPushToken, title, body, data = {}, options = {}) {
  try {
    const { recipientId = null, includeCurrentNotification = false } = options;

    // 토큰 유효성 검사
    if (!Expo.isExpoPushToken(expoPushToken)) {
      console.error('❌ 유효하지 않은 Expo Push Token:', expoPushToken);
      return { success: false, error: 'Invalid token' };
    }

    let badgeCount = null;
    if (recipientId) {
      const unreadCount = await getUnreadBadgeCount(recipientId);
      badgeCount = includeCurrentNotification ? unreadCount + 1 : unreadCount;
    }

    // 알림 메시지 생성
    const messages = [{
      to: expoPushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      priority: 'high',
      channelId: 'runon-notifications'
    }];

    if (badgeCount != null) {
      messages[0].badge = Math.max(0, badgeCount);
    }

    // 알림 전송
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('❌ 알림 전송 실패:', error);
        return { success: false, error: error.message };
      }
    }

    // 결과 확인
    for (const ticket of tickets) {
      if (ticket.status === 'error') {
        console.error('❌ 알림 전송 에러:', ticket.message);
        if (ticket.details && ticket.details.error) {
          console.error('❌ 에러 상세:', ticket.details.error);
        }
        return { success: false, error: ticket.message };
      }
    }

    console.log('✅ 푸시 알림 전송 성공');
    return { success: true };
  } catch (error) {
    console.error('❌ 푸시 알림 전송 실패:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 모임 시작 시각(Date) 파싱
 */
function parseEventStartDateTime(eventData) {
  const rawDate = eventData?.date;
  const rawTime = eventData?.time;

  if (!rawDate || !rawTime) {
    return null;
  }

  let baseDate = null;

  if (rawDate instanceof Date) {
    baseDate = new Date(rawDate);
  } else if (rawDate && typeof rawDate.toDate === 'function') {
    baseDate = rawDate.toDate();
  } else if (typeof rawDate === 'string') {
    const dateText = rawDate.trim();

    const isoMatch = dateText.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]) - 1;
      const day = Number(isoMatch[3]);
      baseDate = new Date(year, month, day);
    } else {
      const koreanMatch = dateText.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
      if (koreanMatch) {
        const year = Number(koreanMatch[1]);
        const month = Number(koreanMatch[2]) - 1;
        const day = Number(koreanMatch[3]);
        baseDate = new Date(year, month, day);
      } else {
        const parsed = new Date(dateText);
        if (!Number.isNaN(parsed.getTime())) {
          baseDate = parsed;
        }
      }
    }
  }

  if (!baseDate || Number.isNaN(baseDate.getTime())) {
    return null;
  }

  let hours = null;
  let minutes = null;

  if (typeof rawTime === 'string') {
    const timeText = rawTime.trim();
    const koreanTimeMatch = timeText.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/);

    if (koreanTimeMatch) {
      const isPm = koreanTimeMatch[1] === '오후';
      hours = Number(koreanTimeMatch[2]);
      minutes = Number(koreanTimeMatch[3]);

      if (isPm && hours !== 12) {
        hours += 12;
      }
      if (!isPm && hours === 12) {
        hours = 0;
      }
    } else {
      const plainTimeMatch = timeText.match(/^(\d{1,2}):(\d{2})$/);
      if (plainTimeMatch) {
        hours = Number(plainTimeMatch[1]);
        minutes = Number(plainTimeMatch[2]);
      }
    }
  } else if (typeof rawTime === 'number') {
    hours = rawTime;
    minutes = 0;
  }

  if (hours == null || minutes == null || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  const eventStart = new Date(baseDate);
  eventStart.setHours(hours, minutes, 0, 0);

  if (Number.isNaN(eventStart.getTime())) {
    return null;
  }

  return eventStart;
}

// ============================================
// 모임 24시간 전 리마인더 알림 스케줄러
// ============================================

/**
 * 모임 시작 24시간 전에 참여자에게 리마인더 푸시 알림 전송
 */
exports.sendMeetingReminder24h = functions.pubsub
  .schedule('*/5 * * * *') // 5분마다 실행
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    console.log('🕐 모임 24시간 전 리마인더 스케줄러 실행 시작');

    try {
      const now = new Date();
      const DAY_MS = 24 * 60 * 60 * 1000;
      const TOLERANCE_MS = 10 * 60 * 1000; // 스케줄 오차 보정 (±10분)
      const windowStart = new Date(now.getTime() + DAY_MS - TOLERANCE_MS);
      const windowEnd = new Date(now.getTime() + DAY_MS + TOLERANCE_MS);

      const eventsSnapshot = await admin.firestore().collection('events').get();
      console.log(`📋 전체 모임 조회 완료: ${eventsSnapshot.size}개`);

      const results = [];

      for (const eventDoc of eventsSnapshot.docs) {
        const eventId = eventDoc.id;
        const eventData = eventDoc.data();

        try {
          if (eventData.status === 'ended') {
            continue;
          }

          if (eventData.reminder24hSentAt) {
            continue;
          }

          const eventStart = parseEventStartDateTime(eventData);
          if (!eventStart) {
            continue;
          }

          if (eventStart < windowStart || eventStart > windowEnd) {
            continue;
          }

          const participants = Array.isArray(eventData.participants) ? eventData.participants : [];
          const organizerId = eventData.organizerId;
          // 주최자도 리마인더를 받도록 수신자에 포함 (중복 제거)
          const recipientSet = new Set(participants.filter(Boolean));
          if (organizerId) {
            recipientSet.add(organizerId);
          }
          const recipients = Array.from(recipientSet);

          if (recipients.length === 0) {
            await eventDoc.ref.update({
              reminder24hSentAt: admin.firestore.FieldValue.serverTimestamp(),
              reminder24hTargetStartAt: admin.firestore.Timestamp.fromDate(eventStart),
            });
            console.log(`ℹ️ 리마인더 수신 대상 없음: ${eventId}`);
            continue;
          }

          const eventTitle = eventData.title || '모임';
          const eventTime = eventData.time || '';
          const eventLocation = eventData.location || '지정 장소';
          const notificationTitle = `내일 ${eventTitle}`;
          const notificationBody = `${eventTime} ${eventLocation}에서 시작됩니다. 미리 준비해주세요!`;

          let successCount = 0;
          const recipientResults = [];

          for (const recipientId of recipients) {
            try {
              const recipientInfo = await getUserInfo(recipientId);
              if (!recipientInfo || !recipientInfo.expoPushToken) {
                recipientResults.push({ recipientId, success: false, reason: 'missing_token' });
                continue;
              }

              const settings = await getUserNotificationSettings(recipientId);
              if (!isNotificationTypeEnabled(settings, 'reminder')) {
                recipientResults.push({ recipientId, success: false, reason: 'notification_off' });
                continue;
              }

              const pushResult = await sendExpoPushNotification(
                recipientInfo.expoPushToken,
                notificationTitle,
                notificationBody,
                {
                  type: 'meeting_reminder',
                  meetingId: eventId,
                  eventId: eventId,
                  navigationTarget: 'EventDetail',
                },
                {
                  recipientId,
                  includeCurrentNotification: true,
                }
              );

              if (pushResult.success) {
                successCount += 1;
                recipientResults.push({ recipientId, success: true });
              } else {
                recipientResults.push({
                  recipientId,
                  success: false,
                  reason: pushResult.error || 'push_failed',
                });
              }
            } catch (error) {
              recipientResults.push({ recipientId, success: false, reason: error.message });
            }
          }

          if (successCount > 0) {
            await eventDoc.ref.update({
              reminder24hSentAt: admin.firestore.FieldValue.serverTimestamp(),
              reminder24hTargetStartAt: admin.firestore.Timestamp.fromDate(eventStart),
            });
            console.log(`✅ 모임 리마인더 전송 완료: ${eventId} (${successCount}/${recipients.length})`);
          } else {
            console.warn(`⚠️ 모임 리마인더 전송 실패/보류: ${eventId} (성공 0건)`);
          }

          results.push({
            eventId,
            recipients: recipients.length,
            successCount,
            details: recipientResults,
          });
        } catch (error) {
          console.error(`❌ 모임 리마인더 처리 실패: ${eventId}`, error);
          results.push({ eventId, success: false, error: error.message });
        }
      }

      console.log('✅ 모임 24시간 전 리마인더 스케줄러 실행 완료', {
        totalProcessed: results.length,
      });

      return { success: true, results };
    } catch (error) {
      console.error('❌ 모임 24시간 전 리마인더 스케줄러 실패:', error);
      return null;
    }
  });

// ============================================
// 채팅 메시지 알림 함수
// ============================================

/**
 * 채팅 메시지 생성 시 알림 전송
 */
exports.onChatMessageCreated = functions.firestore
  .document('chatRooms/{chatRoomId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const { chatRoomId, messageId } = context.params;
    const messageData = snap.data();

    console.log('📱 채팅 메시지 알림 전송 시작:', { chatRoomId, messageId });

    try {
      // 시스템 메시지는 알림 전송 안 함
      if (messageData.isSystemMessage) {
        console.log('⚠️ 시스템 메시지이므로 알림 전송 안 함');
        return null;
      }

      // 채팅방 정보 가져오기
      const chatRoomDoc = await admin.firestore().collection('chatRooms').doc(chatRoomId).get();
      if (!chatRoomDoc.exists) {
        console.warn('⚠️ 채팅방을 찾을 수 없음:', chatRoomId);
        return null;
      }

      const chatRoom = chatRoomDoc.data();
      const participants = chatRoom.participants || [];
      const senderId = messageData.senderId;

      // 발신자 제외한 참여자 확인
      const recipients = participants.filter(participantId => participantId !== senderId);

      if (recipients.length === 0) {
        console.log('⚠️ 알림을 받을 참여자가 없음');
        return null;
      }

      // 발신자 정보 가져오기
      const senderInfo = await getUserInfo(senderId);
      if (!senderInfo) {
        console.warn('⚠️ 발신자 정보를 찾을 수 없음:', senderId);
        return null;
      }

      // 모임 제목 가져오기
      let meetingTitle = chatRoom.title || '채팅방';
      if (chatRoom.eventId) {
        const eventDoc = await admin.firestore().collection('events').doc(chatRoom.eventId).get();
        if (eventDoc.exists) {
          const eventData = eventDoc.data();
          meetingTitle = eventData.title || meetingTitle;
        }
      }

      // 메시지 내용 (최대 50자)
      const messageText = messageData.text || '';
      const messagePreview = messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText;

      // 각 수신자에게 알림 전송
      const results = [];
      for (const recipientId of recipients) {
        try {
          // 수신자 정보 가져오기
          const recipientInfo = await getUserInfo(recipientId);
          if (!recipientInfo || !recipientInfo.expoPushToken) {
            console.warn(`⚠️ 수신자의 Push Token이 없음: ${recipientId}`);
            continue;
          }

          // 알림 설정 확인
          const settings = await getUserNotificationSettings(recipientId);
          if (!isNotificationTypeEnabled(settings, 'message')) {
            console.log(`📵 채팅 알림이 OFF되어 있음: ${recipientId}`);
            continue;
          }

          // 알림 전송
          const notificationTitle = meetingTitle;
          const notificationBody = `${senderInfo.nickname}\n${messagePreview}`;

          // Firestore에 알림 저장
          try {
            await admin.firestore().collection('notifications').add({
              userId: recipientId,
              type: 'message',
              title: notificationTitle,
              message: `${senderInfo.nickname}: ${messagePreview}`,
              chatId: chatRoomId,
              senderId: senderId,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              isRead: false,
              showAlert: false,
              navigationData: {
                screen: 'Chat',
                params: { chatRoomId }
              }
            });
            console.log(`✅ Firestore에 채팅 알림 저장 완료: ${recipientId}`);
          } catch (error) {
            console.error(`❌ Firestore 알림 저장 실패: ${recipientId}`, error);
          }

          // 푸시 알림 전송
          const result = await sendExpoPushNotification(
            recipientInfo.expoPushToken,
            notificationTitle,
            notificationBody,
            {
              type: 'new_message',
              chatRoomId: chatRoomId,
              navigationTarget: 'Chat'
            },
            {
              recipientId,
              includeCurrentNotification: false,
            }
          );

          if (result.success) {
            console.log(`✅ 채팅 알림 전송 성공: ${recipientId}`);
            results.push({ recipientId, success: true });
          } else {
            console.error(`❌ 채팅 알림 전송 실패: ${recipientId}`, result.error);
            results.push({ recipientId, success: false, error: result.error });
          }
        } catch (error) {
          console.error(`❌ 알림 전송 중 에러: ${recipientId}`, error);
          results.push({ recipientId, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ 채팅 알림 전송 완료: ${successCount}/${recipients.length}명`);

      return { success: true, results };
    } catch (error) {
      console.error('❌ 채팅 메시지 알림 전송 실패:', error);
      return null;
    }
  });

// ============================================
// 모임 취소 알림 함수
// ============================================

/**
 * 모임 삭제 시 참여자에게 알림 전송
 */
exports.onEventDeleted = functions.firestore
  .document('events/{eventId}')
  .onDelete(async (snap, context) => {
    const { eventId } = context.params;
    const eventData = snap.data();

    console.log('📱 모임 취소 알림 전송 시작:', eventId);

    try {
      const participants = eventData.participants || [];
      const organizerId = eventData.organizerId;

      // 주최자 제외한 참여자 확인
      const recipients = participants.filter(participantId => participantId !== organizerId);

      if (recipients.length === 0) {
        console.log('⚠️ 알림을 받을 참여자가 없음');
        return null;
      }

      const eventTitle = eventData.title || '모임';

      // 각 참여자에게 알림 전송
      const results = [];
      for (const recipientId of recipients) {
        try {
          // 수신자 정보 가져오기
          const recipientInfo = await getUserInfo(recipientId);
          if (!recipientInfo || !recipientInfo.expoPushToken) {
            console.warn(`⚠️ 수신자의 Push Token이 없음: ${recipientId}`);
            continue;
          }

          // 알림 설정 확인
          const settings = await getUserNotificationSettings(recipientId);
          if (!isNotificationTypeEnabled(settings, 'cancel')) {
            console.log(`📵 모임 알림이 OFF되어 있음: ${recipientId}`);
            continue;
          }

          // 알림 전송
          const notificationTitle = '모임이 취소되었습니다';
          const notificationBody = `"${eventTitle}" 모임이 주최자에 의해 취소되었습니다.`;

          // Firestore에 알림 저장 (EventContext에서 관리하므로 주석 처리)
          // 모임 관련 알림은 EventContext에서 별도로 관리합니다.

          // 푸시 알림 전송
          const result = await sendExpoPushNotification(
            recipientInfo.expoPushToken,
            notificationTitle,
            notificationBody,
            {
              type: 'meeting_cancelled',
              meetingId: eventId,
              navigationTarget: 'Home'
            },
            {
              recipientId,
              includeCurrentNotification: true,
            }
          );

          if (result.success) {
            console.log(`✅ 모임 취소 알림 전송 성공: ${recipientId}`);
            results.push({ recipientId, success: true });
          } else {
            console.error(`❌ 모임 취소 알림 전송 실패: ${recipientId}`, result.error);
            results.push({ recipientId, success: false, error: result.error });
          }
        } catch (error) {
          console.error(`❌ 알림 전송 중 에러: ${recipientId}`, error);
          results.push({ recipientId, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ 모임 취소 알림 전송 완료: ${successCount}/${recipients.length}명`);

      return { success: true, results };
    } catch (error) {
      console.error('❌ 모임 취소 알림 전송 실패:', error);
      return null;
    }
  });

// ============================================
// 모임 참여 알림 함수
// ============================================

/**
 * 모임 참여자 추가 시 주최자에게 알림 전송
 */
exports.onEventParticipantAdded = functions.firestore
  .document('events/{eventId}')
  .onUpdate(async (change, context) => {
    const { eventId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    console.log('📱 모임 참여 알림 확인 시작:', eventId);

    try {
      const beforeParticipants = beforeData.participants || [];
      const afterParticipants = afterData.participants || [];
      const organizerId = afterData.organizerId;

      // 새로 추가된 참여자 확인
      const newParticipants = afterParticipants.filter(
        participantId => !beforeParticipants.includes(participantId)
      );

      if (newParticipants.length === 0) {
        console.log('⚠️ 새 참여자가 없음');
        return null;
      }

      // 주최자 정보 가져오기
      const organizerInfo = await getUserInfo(organizerId);
      if (!organizerInfo || !organizerInfo.expoPushToken) {
        console.warn('⚠️ 주최자의 Push Token이 없음:', organizerId);
        return null;
      }

      // 알림 설정 확인
      const settings = await getUserNotificationSettings(organizerId);
      if (!isNotificationTypeEnabled(settings, 'new_participant')) {
        console.log('📵 모임 알림이 OFF되어 있음:', organizerId);
        return null;
      }

      const eventTitle = afterData.title || '모임';

      // 각 새 참여자마다 개별 알림 전송
      const results = [];
      for (const participantId of newParticipants) {
        try {
          // 참여자 정보 가져오기
          const participantInfo = await getUserInfo(participantId);
          if (!participantInfo) {
            console.warn('⚠️ 참여자 정보를 찾을 수 없음:', participantId);
            continue;
          }

          // 알림 전송
          const notificationTitle = '새 참여자';
          const notificationBody = `"${participantInfo.nickname}"님이 "${eventTitle}" 모임에 참여했습니다.`;

          const result = await sendExpoPushNotification(
            organizerInfo.expoPushToken,
            notificationTitle,
            notificationBody,
            {
              type: 'new_participant',
              eventId: eventId,
              participantId: participantId,
              navigationTarget: 'EventDetail'
            },
            {
              recipientId: organizerId,
              includeCurrentNotification: true,
            }
          );

          if (result.success) {
            console.log(`✅ 모임 참여 알림 전송 성공: ${participantId}`);
            results.push({ participantId, success: true });
          } else {
            console.error(`❌ 모임 참여 알림 전송 실패: ${participantId}`, result.error);
            results.push({ participantId, success: false, error: result.error });
          }
        } catch (error) {
          console.error(`❌ 알림 전송 중 에러: ${participantId}`, error);
          results.push({ participantId, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ 모임 참여 알림 전송 완료: ${successCount}/${newParticipants.length}명`);

      return { success: true, results };
    } catch (error) {
      console.error('❌ 모임 참여 알림 전송 실패:', error);
      return null;
    }
  });

// ============================================
// 게시글 좋아요 알림 함수
// ============================================

/**
 * 게시글 좋아요 추가 시 작성자에게 알림 전송
 */
exports.onPostLikeAdded = functions.firestore
  .document('posts/{postId}')
  .onUpdate(async (change, context) => {
    const { postId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    console.log('📱 게시글 좋아요 알림 확인 시작:', postId);

    try {
      const beforeLikes = beforeData.likes || [];
      const afterLikes = afterData.likes || [];
      const authorId = afterData.authorId;

      // 새로 추가된 좋아요 확인
      const newLikes = afterLikes.filter(likeId => !beforeLikes.includes(likeId));

      if (newLikes.length === 0) {
        console.log('⚠️ 새 좋아요가 없음');
        return null;
      }

      // 작성자와 좋아요를 누른 사용자가 같은 경우 알림 전송 안 함
      if (newLikes.includes(authorId)) {
        console.log('⚠️ 작성자가 자신의 게시글에 좋아요를 눌렀으므로 알림 전송 안 함');
        return null;
      }

      // 작성자 정보 가져오기
      const authorInfo = await getUserInfo(authorId);
      if (!authorInfo || !authorInfo.expoPushToken) {
        console.warn('⚠️ 작성자의 Push Token이 없음:', authorId);
        return null;
      }

      // 알림 설정 확인
      const settings = await getUserNotificationSettings(authorId);
      if (!isNotificationTypeEnabled(settings, 'like')) {
        console.log('📵 커뮤니티 알림이 OFF되어 있음:', authorId);
        return null;
      }

      const postTitle = afterData.title || '게시글';

      // 각 좋아요마다 개별 알림 전송 (같은 사용자가 여러 번 좋아요를 눌러도 한 번만)
      const uniqueLikers = [...new Set(newLikes)];
      const results = [];

      for (const likerId of uniqueLikers) {
        try {
          // 좋아요를 누른 사용자 정보 가져오기
          const likerInfo = await getUserInfo(likerId);
          if (!likerInfo) {
            console.warn('⚠️ 좋아요를 누른 사용자 정보를 찾을 수 없음:', likerId);
            continue;
          }

          // 알림 전송
          const notificationTitle = '좋아요를 받았습니다';
          const notificationBody = `"${likerInfo.nickname}"님이 "${postTitle}" 게시글에 좋아요를 눌렀습니다.`;

          // Firestore에 알림 저장
          try {
            await admin.firestore().collection('notifications').add({
              userId: authorId,
              type: 'like',
              title: notificationTitle,
              message: `${likerInfo.nickname}님이 당신의 게시글 "${postTitle}"에 좋아요를 눌렀습니다`,
              postId: postId,
              likerId: likerId,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              isRead: false,
              showAlert: false,
              navigationData: {
                screen: 'PostDetail',
                params: { postId }
              }
            });
            console.log(`✅ Firestore에 좋아요 알림 저장 완료: ${likerId}`);
          } catch (error) {
            console.error(`❌ Firestore 알림 저장 실패: ${likerId}`, error);
          }

          // 푸시 알림 전송
          const result = await sendExpoPushNotification(
            authorInfo.expoPushToken,
            notificationTitle,
            notificationBody,
            {
              type: 'like',
              postId: postId,
              likerId: likerId,
              navigationTarget: 'PostDetail'
            },
            {
              recipientId: authorId,
              includeCurrentNotification: false,
            }
          );

          if (result.success) {
            console.log(`✅ 좋아요 알림 전송 성공: ${likerId}`);
            results.push({ likerId, success: true });
          } else {
            console.error(`❌ 좋아요 알림 전송 실패: ${likerId}`, result.error);
            results.push({ likerId, success: false, error: result.error });
          }
        } catch (error) {
          console.error(`❌ 알림 전송 중 에러: ${likerId}`, error);
          results.push({ likerId, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ 좋아요 알림 전송 완료: ${successCount}/${uniqueLikers.length}명`);

      return { success: true, results };
    } catch (error) {
      console.error('❌ 좋아요 알림 전송 실패:', error);
      return null;
    }
  });

// ============================================
// 게시글 댓글 알림 함수
// ============================================

/**
 * 게시글 댓글 추가 시 작성자에게 알림 전송
 */
exports.onPostCommentAdded = functions.firestore
  .document('posts/{postId}')
  .onUpdate(async (change, context) => {
    const { postId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    console.log('📱 게시글 댓글 알림 확인 시작:', postId);

    try {
      const beforeComments = beforeData.comments || [];
      const afterComments = afterData.comments || [];
      const authorId = afterData.authorId;

      // 새로 추가된 댓글 확인
      const newComments = afterComments.filter(
        comment => !beforeComments.some(beforeComment => beforeComment.id === comment.id)
      );

      if (newComments.length === 0) {
        console.log('⚠️ 새 댓글이 없음');
        return null;
      }

      // 작성자 정보 가져오기
      const authorInfo = await getUserInfo(authorId);
      if (!authorInfo || !authorInfo.expoPushToken) {
        console.warn('⚠️ 작성자의 Push Token이 없음:', authorId);
        return null;
      }

      // 알림 설정 확인
      const settings = await getUserNotificationSettings(authorId);
      if (!isNotificationTypeEnabled(settings, 'comment')) {
        console.log('📵 커뮤니티 알림이 OFF되어 있음:', authorId);
        return null;
      }

      const postTitle = afterData.title || '게시글';

      // 각 댓글마다 개별 알림 전송
      const results = [];
      for (const comment of newComments) {
        try {
          // 작성자와 댓글 작성자가 같은 경우 알림 전송 안 함
          if (comment.authorId === authorId) {
            console.log('⚠️ 작성자가 자신의 게시글에 댓글을 남겼으므로 알림 전송 안 함');
            continue;
          }

          // 댓글 작성자 정보 가져오기
          const commenterInfo = await getUserInfo(comment.authorId);
          if (!commenterInfo) {
            console.warn('⚠️ 댓글 작성자 정보를 찾을 수 없음:', comment.authorId);
            continue;
          }

          // 댓글 내용 (최대 50자)
          const commentText = comment.text || '';
          const commentPreview = commentText.length > 50 ? commentText.substring(0, 50) + '...' : commentText;

          // 알림 전송
          const notificationTitle = '새로운 댓글이 달렸습니다';
          const notificationBody = `"${commenterInfo.nickname}"님이 "${postTitle}" 게시글에 댓글을 남겼습니다: ${commentPreview}`;

          // Firestore에 알림 저장
          try {
            await admin.firestore().collection('notifications').add({
              userId: authorId,
              type: 'comment',
              title: notificationTitle,
              message: `${commenterInfo.nickname}님이 당신의 게시글 "${postTitle}"에 댓글을 달았습니다`,
              postId: postId,
              commentId: comment.id,
              commenterId: comment.authorId,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              isRead: false,
              showAlert: false,
              navigationData: {
                screen: 'PostDetail',
                params: { postId }
              }
            });
            console.log(`✅ Firestore에 댓글 알림 저장 완료: ${comment.authorId}`);
          } catch (error) {
            console.error(`❌ Firestore 알림 저장 실패: ${comment.authorId}`, error);
          }

          // 푸시 알림 전송
          const result = await sendExpoPushNotification(
            authorInfo.expoPushToken,
            notificationTitle,
            notificationBody,
            {
              type: 'comment',
              postId: postId,
              commentId: comment.id,
              commenterId: comment.authorId,
              navigationTarget: 'PostDetail'
            },
            {
              recipientId: authorId,
              includeCurrentNotification: false,
            }
          );

          if (result.success) {
            console.log(`✅ 댓글 알림 전송 성공: ${comment.id}`);
            results.push({ commentId: comment.id, success: true });
          } else {
            console.error(`❌ 댓글 알림 전송 실패: ${comment.id}`, result.error);
            results.push({ commentId: comment.id, success: false, error: result.error });
          }
        } catch (error) {
          console.error(`❌ 알림 전송 중 에러: ${comment.id}`, error);
          results.push({ commentId: comment.id, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ 댓글 알림 전송 완료: ${successCount}/${newComments.length}개`);

      return { success: true, results };
    } catch (error) {
      console.error('❌ 댓글 알림 전송 실패:', error);
      return null;
    }
  });

// ============================================
// Garmin Connect Activity API - Ping 수신
// ============================================

const SUMMARY_TYPES = ['activities', 'activityDetails', 'activityFiles', 'manuallyUpdatedActivities', 'moveIQActivities'];

/**
 * Garmin Ping 수신 엔드포인트
 * PDF 요구: 수신 후 즉시 HTTP 200 반환, 그 다음 비동기로 callbackURL 호출
 */
exports.garminPing = functions
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    // 1. 즉시 HTTP 200 응답 (30초 이내 필수 - PDF Section 4.1)
    res.status(200).send('OK');

    // 2. 비동기 처리 (res.send() 후 실행)
    if (req.method !== 'POST' || !req.body) {
      console.log('⚠️ [garminPing] POST가 아니거나 body 없음');
      return;
    }

    const body = req.body;
    console.log('📥 [garminPing] 수신:', Object.keys(body));

    for (const summaryType of SUMMARY_TYPES) {
      const items = body[summaryType];
      if (!Array.isArray(items) || items.length === 0) continue;

      for (const item of items) {
        const garminUserId = item.userId || item.userAccessToken;
        const callbackURL = item.callbackURL;

        if (callbackURL) {
          // Ping 형식: callbackURL 호출 후 데이터 Pull
          processGarminCallback(garminUserId, callbackURL, summaryType).catch((err) => {
            console.error(`❌ [garminPing] ${summaryType} callback 처리 실패:`, err);
          });
        } else if (item.summaryId || item.activityId) {
          // Push 형식: 데이터가 본문에 직접 포함됨 (Data Generator 등)
          saveGarminActivityToFirestore(garminUserId, item, summaryType).catch((err) => {
            console.error(`❌ [garminPing] ${summaryType} Push 저장 실패:`, err);
          });
        } else {
          console.log(`⚠️ [garminPing] ${summaryType} - callbackURL 및 activity 데이터 없음 (deregistration?)`);
        }
      }
    }
  });

/**
 * Push 형식: 본문에 포함된 활동 데이터를 Firestore에 저장
 */
async function saveGarminActivityToFirestore(garminUserId, activity, summaryType) {
  const summaryId = activity.summaryId || activity.activityId || activity.id;
  if (!summaryId) return;

  const db = admin.firestore();
  const docId = `${garminUserId}_${summaryId}`;
  const docData = {
    garminUserId,
    runonUserId: null,
    summaryId: String(summaryId),
    activityType: activity.activityType || 'UNKNOWN',
    startTimeInSeconds: activity.startTimeInSeconds || 0,
    durationInSeconds: activity.durationInSeconds || 0,
    distanceInMeters: activity.distanceInMeters || 0,
    averagePaceInMinutesPerKilometer: activity.averagePaceInMinutesPerKilometer || 0,
    activeKilocalories: activity.activeKilocalories || 0,
    deviceName: activity.deviceName || 'unknown',
    summaryType,
    rawData: activity,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('garminActivities').doc(docId).set(docData, { merge: true });
  console.log(`✅ [garminPing] ${summaryType} Push 저장 완료: ${summaryId} (garminUserId: ${garminUserId})`);
}

/**
 * Garmin callbackURL 호출 후 Firestore에 저장
 */
async function processGarminCallback(garminUserId, callbackURL, summaryType) {
  try {
    console.log(`🔗 [garminPing] ${summaryType} callback 호출:`, callbackURL.substring(0, 80) + '...');

    const response = await fetch(callbackURL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const activities = Array.isArray(data) ? data : (data.data || data.activities || []);

    if (!Array.isArray(activities)) {
      console.log(`⚠️ [garminPing] ${summaryType} - 예상치 못한 응답 구조`);
      return;
    }

    const db = admin.firestore();
    let savedCount = 0;

    for (const activity of activities) {
      const summaryId = activity.summaryId || activity.activityId || activity.id;
      if (!summaryId) continue;

      const docId = `${garminUserId}_${summaryId}`;
      const docData = {
        garminUserId,
        runonUserId: null,
        summaryId: String(summaryId),
        activityType: activity.activityType || 'UNKNOWN',
        startTimeInSeconds: activity.startTimeInSeconds || 0,
        durationInSeconds: activity.durationInSeconds || 0,
        distanceInMeters: activity.distanceInMeters || 0,
        averagePaceInMinutesPerKilometer: activity.averagePaceInMinutesPerKilometer || 0,
        activeKilocalories: activity.activeKilocalories || 0,
        deviceName: activity.deviceName || 'unknown',
        summaryType,
        rawData: activity,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('garminActivities').doc(docId).set(docData, { merge: true });
      savedCount++;
    }

    console.log(`✅ [garminPing] ${summaryType} 저장 완료: ${savedCount}건 (garminUserId: ${garminUserId})`);
  } catch (error) {
    console.error(`❌ [garminPing] processGarminCallback 실패:`, error);
    throw error;
  }
}

// ============================================
// Garmin Connect - 앱용 활동 조회 API
// ============================================

/**
 * 앱에서 Garmin 활동 데이터 조회
 * GET /garminGetActivities?garminUserId=xxx&startTime=xxx&endTime=xxx
 * - garminUserId: Garmin User ID (Eval 테스트용, OAuth 연동 전)
 * - startTime, endTime: Unix timestamp (초, UTC)
 */
exports.garminGetActivities = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const garminUserId = req.query.garminUserId;
    const startTime = parseInt(req.query.startTime, 10);
    const endTime = parseInt(req.query.endTime, 10);

    if (!garminUserId) {
      res.status(400).json({ error: 'garminUserId가 필요합니다.' });
      return;
    }
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      res.status(400).json({ error: 'startTime, endTime (Unix 초)이 필요합니다.' });
      return;
    }
    if (endTime - startTime > 24 * 60 * 60) {
      res.status(400).json({ error: '조회 범위는 24시간 이내여야 합니다.' });
      return;
    }

    const db = admin.firestore();
    const snapshot = await db.collection('garminActivities')
      .where('garminUserId', '==', garminUserId)
      .where('startTimeInSeconds', '>=', startTime)
      .where('startTimeInSeconds', '<=', endTime)
      .get();

    const activities = snapshot.docs.map((doc) => doc.data());
    console.log(`✅ [garminGetActivities] 조회 완료: ${activities.length}건 (garminUserId: ${garminUserId})`);

    res.status(200).json({ activities });
  } catch (error) {
    console.error('❌ [garminGetActivities] 실패:', error);
    res.status(500).json({ error: '활동 조회 실패', message: error.message });
  }
});

// ============================================
// Garmin Connect - User Deregistration / User Permission (프로덕션 요건)
// ============================================
// OAuth2 PKCE 문서: Garmin이 사용자 연동 해제/권한 변경 시 우리 서버로 POST
// Endpoint Configuration에 URL 등록 필요

/**
 * User Deregistration: 사용자가 Garmin Connect에서 연동 해제 시 Garmin이 호출
 * POST 수신 → 즉시 200 → users에서 garminUserId 제거
 */
exports.garminUserDeregistration = functions.https.onRequest(async (req, res) => {
  res.status(200).send('OK');

  if (req.method !== 'POST' || !req.body) return;

  try {
    const userId = req.body.userId || req.body.userAccessToken;
    if (!userId) {
      console.log('⚠️ [garminUserDeregistration] userId 없음:', Object.keys(req.body));
      return;
    }

    const db = admin.firestore();
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('garminUserId', '==', userId).get();

    for (const doc of snapshot.docs) {
      await doc.ref.update({ garminUserId: admin.firestore.FieldValue.delete() });
      console.log(`✅ [garminUserDeregistration] 연동 해제: ${doc.id} (garminUserId: ${userId})`);
    }
  } catch (err) {
    console.error('❌ [garminUserDeregistration] 실패:', err);
  }
});

/**
 * User Permission: 사용자가 Garmin Connect에서 권한 변경 시 Garmin이 호출
 * POST 수신 → 즉시 200 → 로그 및 필요 시 처리
 */
exports.garminUserPermission = functions.https.onRequest(async (req, res) => {
  res.status(200).send('OK');

  if (req.method !== 'POST' || !req.body) return;

  try {
    const userId = req.body.userId || req.body.userAccessToken;
    console.log('📥 [garminUserPermission] 수신:', userId, JSON.stringify(req.body).substring(0, 200));
    // 권한 변경 시 추가 처리 필요 시 여기에 로직 추가
  } catch (err) {
    console.error('❌ [garminUserPermission] 실패:', err);
  }
});

/**
 * 모임 카드형 공유 이미지 엔드포인트 (SVG)
 */
exports.eventShareImage = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const eventId = (req.query.eventId || '').toString().trim();
  if (!eventId) {
    res.status(400).send('eventId is required');
    return;
  }

  const escapeSvg = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const truncate = (value = '', max = 28) => {
    const str = String(value || '');
    return str.length > max ? `${str.slice(0, max - 1)}…` : str;
  };

  try {
    const eventDoc = await admin.firestore().collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      res.status(404).send('Event not found');
      return;
    }

    const event = eventDoc.data() || {};
    const title = truncate(event.title || 'RunOn 러닝 모임', 30);
    const location = truncate(event.location || '장소 미정', 16);
    const dateTime = truncate(`${event.date || ''} ${event.time || ''}`.trim() || '일정 미정', 24);
    const distance = truncate(event.distance ? `${event.distance}km` : '거리 미정', 10);
    const pace = truncate(event.pace || '페이스 미정', 14);
    const rawTags = String(event.hashtags || '')
      .split(/\s+/)
      .filter((tag) => tag.startsWith('#'))
      .slice(0, 3);
    const tags = rawTags.length > 0 ? rawTags : ['#런온', '#러닝모임', '#함께달려요'];

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" style="background:#0E0F12">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0E0F12" />
      <stop offset="100%" stop-color="#12131A" />
    </linearGradient>
    <clipPath id="paceClip">
      <rect x="620" y="280" width="488" height="100" rx="0" ry="0" />
    </clipPath>
  </defs>
  <rect x="0" y="0" width="1200" height="630" fill="#0E0F12"/>
  <rect x="0" y="0" width="1200" height="630" fill="url(#bg)"/>
  <rect x="34" y="34" width="1132" height="562" rx="28" fill="url(#bg)" stroke="#1E2028" stroke-width="2"/>

  <text x="84" y="130" fill="#FFFFFF" font-size="62" font-family="Arial, sans-serif" font-weight="700">${escapeSvg(title)}</text>

  <circle cx="88" cy="207" r="10" fill="#3AF8FF"/>
  <text x="116" y="217" fill="#D3D3D3" font-size="42" font-family="Arial, sans-serif">${escapeSvg(location)}</text>

  <circle cx="615" cy="207" r="10" fill="#3AF8FF"/>
  <text x="643" y="217" fill="#D3D3D3" font-size="40" font-family="Arial, sans-serif">${escapeSvg(dateTime)}</text>

  <rect x="84" y="258" width="1032" height="126" rx="22" fill="#1F2230"/>
  <text x="290" y="336" fill="#FFFFFF" font-size="58" font-family="Arial, sans-serif" font-weight="700">${escapeSvg(distance)}</text>
  <rect x="598" y="280" width="2" height="82" fill="#3A3D4A"/>
  <text x="864" y="336" text-anchor="middle" clip-path="url(#paceClip)" fill="#FFFFFF" font-size="58" font-family="Arial, sans-serif" font-weight="700">${escapeSvg(pace)}</text>

  <rect x="84" y="430" width="190" height="70" rx="35" fill="#123B45"/>
  <text x="179" y="475" text-anchor="middle" fill="#3AF8FF" font-size="38" font-family="Arial, sans-serif" font-weight="700">${escapeSvg(tags[0] || '#런온')}</text>
  <rect x="294" y="430" width="260" height="70" rx="35" fill="#123B45"/>
  <text x="424" y="475" text-anchor="middle" fill="#3AF8FF" font-size="38" font-family="Arial, sans-serif" font-weight="700">${escapeSvg(tags[1] || '#러닝모임')}</text>
  <rect x="574" y="430" width="210" height="70" rx="35" fill="#123B45"/>
  <text x="679" y="475" text-anchor="middle" fill="#3AF8FF" font-size="38" font-family="Arial, sans-serif" font-weight="700">${escapeSvg(tags[2] || '#함께달려요')}</text>

  <text x="84" y="568" fill="#5B6072" font-size="28" font-family="Arial, sans-serif">RunOn</text>
</svg>`.trim();

    res.set('Content-Type', 'image/svg+xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    res.status(200).send(svg);
  } catch (error) {
    console.error('❌ eventShareImage 처리 실패:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * 모임 공유 링크 엔드포인트
 * - 웹 링크 미리보기(OG 메타) 제공
 * - 앱 설치 사용자는 커스텀 스킴으로 자동 이동
 */
exports.eventShare = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const escapeHtml = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const eventId = (req.query.eventId || '').toString().trim();
  const version = (req.query.v || '2').toString().trim();
  if (!eventId) {
    res.status(400).send('eventId is required');
    return;
  }

  try {
    const eventDoc = await admin.firestore().collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      res.status(404).send('Event not found');
      return;
    }

    const event = eventDoc.data() || {};
    const title = event.title || 'RunOn 러닝 모임';
    const location = event.location || '장소 미정';
    const date = event.date || '';
    const time = event.time || '';
    const description = `${location}${date || time ? ` · ${date} ${time}` : ''}`.trim();

    const projectId = admin.app().options.projectId || 'runon-production-app';
    const shareUrl = `https://us-central1-${projectId}.cloudfunctions.net/eventShare?eventId=${encodeURIComponent(eventId)}&v=${encodeURIComponent(version)}`;
    const ogImage = `https://us-central1-${projectId}.cloudfunctions.net/eventShareImage?eventId=${encodeURIComponent(eventId)}&v=${encodeURIComponent(version)}`;
    const deepLinkUrl = `com.runon.app://event/${encodeURIComponent(eventId)}`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapeHtml(shareUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <style>
    body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#0a0a0a; color:#fff; }
    .wrap { max-width:480px; margin:0 auto; min-height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:16px; padding:24px; text-align:center; }
    .title { font-size:22px; font-weight:700; }
    .desc { color:#b3b3b3; font-size:14px; }
    .btn { display:inline-block; padding:12px 16px; border-radius:10px; text-decoration:none; font-weight:600; }
    .open { background:#3AF8FF; color:#000; }
    .install { background:#1f1f24; color:#fff; border:1px solid #333; }
    .hidden { display:none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="title">${escapeHtml(title)}</div>
    <div class="desc">${escapeHtml(description)}</div>
    <a class="btn open" id="openAppBtn" href="${escapeHtml(deepLinkUrl)}">러논 앱에서 열기</a>
    <a class="btn install hidden" id="installBtn" href="https://apps.apple.com/" target="_blank" rel="noreferrer">앱 설치하기</a>
    <div class="desc hidden" id="installHint">앱이 설치되어 있지 않다면 설치 후 다시 열어주세요.</div>
  </div>
  <script>
    (function() {
      var deepLink = ${JSON.stringify(deepLinkUrl)};
      var installBtn = document.getElementById('installBtn');
      var installHint = document.getElementById('installHint');
      var opened = false;

      var timeout = setTimeout(function() {
        if (!opened) {
          installBtn.classList.remove('hidden');
          installHint.classList.remove('hidden');
        }
      }, 1800);

      window.addEventListener('pagehide', function() {
        opened = true;
        clearTimeout(timeout);
      });

      // 사용자 클릭 없이도 앱 실행 시도
      window.location.href = deepLink;
    })();
  </script>
</body>
</html>`);
  } catch (error) {
    console.error('❌ eventShare 처리 실패:', error);
    res.status(500).send('Internal Server Error');
  }
});

