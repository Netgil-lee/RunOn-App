import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// NetGill 디자인 시스템
const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  TEXT_SECONDARY: '#666666',
  BORDER: '#374151',
  RED: '#FF6B6B',
};

const TermsPrivacyModal = ({ visible, onClose, type }) => {
  const isTerms = type === 'terms';
  const isChildSafety = type === 'child-safety';
  
  // 모달 오버레이 페이드 애니메이션
  const modalBackdropOpacity = useRef(new Animated.Value(0)).current;
  
  // 모달이 열릴 때 애니메이션
  useEffect(() => {
    if (visible) {
      // 배경 페이드 인 애니메이션
      Animated.timing(modalBackdropOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      // 배경 페이드 아웃 애니메이션
      Animated.timing(modalBackdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, modalBackdropOpacity]);
  
  let title = '개인정보처리방침';
  if (isTerms) title = '이용약관(EULA)';
  if (isChildSafety) title = '아동 안전 정책';
  
  const termsContent = `제1조 (목적)
본 이용약관(EULA: End User License Agreement)은 RunOn 앱(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 RunOn 앱을 통해 제공되는 모든 서비스를 의미합니다.
2. "이용자"란 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 의미합니다.
3. "회원"이란 서비스에 개인정보를 제공하여 회원등록을 한 자로서, 서비스의 정보를 지속적으로 제공받으며, 서비스를 계속적으로 이용할 수 있는 자를 의미합니다.

제3조 (약관의 효력 및 변경)
1. 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.
2. 회사는 합리적인 사유가 발생할 경우에는 본 약관을 변경할 수 있으며, 약관이 변경되는 경우 변경된 약관의 내용과 시행일을 정하여, 시행일로부터 최소 7일 이전에 공지합니다.

제4조 (서비스의 제공 및 변경)
1. 회사는 다음과 같은 업무를 수행합니다:
   - 러닝 코스 추천 서비스
   - 커뮤니티 기능 제공
   - 러닝 기록 및 통계 제공
   - 기타 회사가 정하는 업무

제5조 (서비스의 중단)
1. 회사는 컴퓨터 등 정보통신설비의 보수점검·교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.

제6조 (회원가입)
1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로서 회원가입을 신청합니다.

제7조 (회원 탈퇴 및 자격 상실 등)
1. 회원은 회사에 언제든지 탈퇴를 요청할 수 있으며 회사는 즉시 회원탈퇴를 처리합니다.

제8조 (개인정보보호)
1. 회사는 이용자의 개인정보 수집시 서비스제공을 위하여 필요한 범위에서 최소한의 개인정보를 수집합니다.

제9조 (회사의 의무)
1. 회사는 법령과 이 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며 이 약관이 정하는 바에 따라 지속적이고, 안정적으로 서비스를 제공하는데 최선을 다하여야 합니다.

제10조 (이용자의 의무)
1. 이용자는 다음 행위를 하여서는 안 됩니다:
   - 신청 또는 변경시 허위 내용의 등록
   - 타인의 정보 도용
   - 회사가 게시한 정보의 변경
   - 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위

제11조 (면책 조항)
1. 회원이 본 서비스를 통해 생성한 모임 내부에서 발생한 모든 일(사고, 분쟁, 손해 등 포함)에 대해서는 회사(RunOn)에게 어떠한 책임도 없으며, 모든 책임은 해당 모임을 생성한 회원 및 모임 참여자들에게 있습니다.

제12조 (제로 톨러런스 정책 - 사용자 생성 콘텐츠)
1. 본 서비스는 불쾌한 콘텐츠 및 남용 사용자에 대한 제로 톨러런스 정책을 시행합니다.
2. 이용자는 다음 행위를 절대 하여서는 안 됩니다:
   - 외설적이거나 폭력적인 콘텐츠 게시
   - 타인을 괴롭히거나 괴롭힘을 조장하는 행위
   - 불법적이거나 부적절한 콘텐츠 게시
   - 기타 공서양속에 반하는 행위
3. 위반 행위 발견 시 즉시 신고할 수 있으며, 신고 접수 후 24시간 이내에 조치를 취합니다.
4. 위반 행위가 확인된 경우 다음 조치를 취할 수 있습니다:
   - 해당 콘텐츠 즉시 삭제
   - 위반 사용자 계정 정지 또는 삭제
   - 법적 조치가 필요한 경우 관련 기관에 신고
5. 본 서비스는 콘텐츠 필터링 시스템을 운영하여 부적절한 콘텐츠를 사전에 차단합니다.
6. 신고는 앱 내 신고 기능을 통해 접수할 수 있으며, 신고자 정보는 철저히 보호됩니다.

시행일자: 2025년 8월 1일`;

  const privacyContent = `1. 개인정보의 처리 목적
RunOn 앱은 다음의 목적을 위하여 개인정보를 처리하고 있으며, 다음의 목적 이외의 용도로는 이용하지 않습니다.
- 사용자 계정 관리 및 서비스 제공
- 위치 기반 러닝 코스 추천
- 커뮤니티 기능 제공
- 앱 기능 개선 및 서비스 품질 향상

2. 수집하는 개인정보 항목
필수 수집 항목
- 이메일 주소 (회원가입 시)
- 프로필 정보 (닉네임, 자기소개)
- 위치 정보 (러닝 코스 추천 및 기록)

선택 수집 항목
- 프로필 사진 (카메라 또는 갤러리에서 선택)
- 러닝 기록 및 통계 데이터

3. 개인정보의 처리 및 보유기간
회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
- 회원 탈퇴 시까지 (단, 관련 법령에 따라 보존이 필요한 경우 해당 기간까지)
- 위치 정보: 앱 사용 중에만 수집되며, 앱 종료 시 즉시 삭제

4. 아동 개인정보 보호
4.1 연령 제한
- 만 13세 미만 사용자는 부모 또는 법정대리인의 동의 후 서비스 이용 가능
- 연령 확인을 위해 생년월일 정보를 수집할 수 있음

4.2 아동 보호 조치
- 아동성적학대착취(CSAE) 관련 콘텐츠 엄격 금지
- 아동을 대상으로 한 부적절한 접근 차단
- 아동 관련 신고 접수 시 즉시 조치

4.3 부모/보호자 권리
- 아동의 개인정보 수집·이용·제공에 대한 동의권
- 아동의 개인정보 열람·정정·삭제 요구권
- 개인정보 처리 정지 요구권

4.4 신고 및 문의
- 아동 안전 관련 신고: dlrhdkgml12@gmail.com
- 24시간 신고 접수: 112

5. 개인정보의 제3자 제공
회사는 정보주체의 개인정보를 제1조(개인정보의 처리목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.

6. 개인정보처리 위탁
회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
- Firebase (Google): 사용자 인증 및 데이터 저장

7. 정보주체의 권리·의무 및 그 행사방법
이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다.
- 개인정보 열람요구
- 오류 등이 있을 경우 정정 요구
- 삭제요구
- 처리정지 요구

8. 개인정보의 안전성 확보 조치
회사는 개인정보보호법 제29조에 따라 다음과 같은 안전성 확보 조치를 취하고 있습니다.
- 개인정보의 암호화
- 해킹 등에 대비한 기술적 대책
- 개인정보에 대한 접근 제한

9. 개인정보 보호책임자
회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
- 개인정보 보호책임자
  - 성명: 이광희
  - 연락처: dlrhdkgml12@gmail.com

10. 개인정보 처리방침 변경
이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.

시행일자: 2025년 8월 1일`;

  const childSafetyContent = `아동 안전 정책

RunOn은 아동의 안전과 보호를 최우선으로 합니다.

1. 아동성적학대착취(CSAE) 콘텐츠 금지
• 아동을 대상으로 한 성적 콘텐츠를 절대 허용하지 않습니다.
• 아동의 성적 이미지나 동영상을 업로드, 공유, 저장하는 행위를 금지합니다.
• 아동을 대상으로 한 성적 행위를 묘사하거나 조장하는 콘텐츠를 금지합니다.

2. 만 13세 미만 사용자 보호
• 만 13세 미만 아동은 보호자의 동의 없이 서비스를 이용할 수 없습니다.
• 아동의 개인정보 수집 시 보호자의 동의를 필수로 합니다.
• 아동의 위치 정보 등 민감한 정보는 수집하지 않습니다.

3. 24시간 신고 시스템 운영
• 부적절한 콘텐츠나 행위를 발견하면 즉시 신고할 수 있습니다.
• 신고 접수 시 24시간 이내에 조치를 취합니다.
• 신고자 정보는 철저히 보호됩니다.

4. 부적절한 콘텐츠 자동 필터링
• AI 기반 콘텐츠 필터링 시스템을 운영합니다.
• 아동에게 부적절한 콘텐츠는 자동으로 차단됩니다.
• 지속적인 모니터링을 통해 안전한 환경을 유지합니다.

5. 신고 및 문의
• 일반 신고: safety@runon.app
• 긴급 신고: 02-0000-0000
• 온라인 신고: 앱 내 신고 기능 이용

6. 처벌 및 제재
• 아동 안전 정책 위반 시 즉시 계정 정지 또는 삭제
• 법적 조치가 필요한 경우 관련 기관에 신고
• 재가입 방지를 위한 영구 제재 조치

RunOn은 모든 사용자가 안전하고 즐겁게 이용할 수 있는 환경을 만들기 위해 최선을 다하겠습니다.`;

  const content = isTerms ? termsContent : (isChildSafety ? childSafetyContent : privacyContent);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalBackdrop,
            {
              opacity: modalBackdropOpacity,
            },
          ]}
        />
        <View style={styles.modalContainer}>
          <SafeAreaView style={styles.modalContent}>
            {/* 헤더 */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.TEXT} />
              </TouchableOpacity>
            </View>

            {/* 내용 */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={styles.contentText}>{content}</Text>
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContainer: {
    backgroundColor: COLORS.BACKGROUND,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    fontFamily: 'Pretendard-SemiBold',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  contentText: {
    fontSize: 14,
    color: COLORS.TEXT,
    lineHeight: 22,
    fontFamily: 'Pretendard-Regular',
  },
});

export default TermsPrivacyModal;
