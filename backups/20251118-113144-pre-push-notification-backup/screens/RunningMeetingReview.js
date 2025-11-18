import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import evaluationService from '../services/evaluationService';

const COLORS = {
  PRIMARY: '#3AF8FF',
  BACKGROUND: '#000000',
  SURFACE: '#1F1F24',
  CARD: '#171719',
  TEXT: '#ffffff',
  SECONDARY: '#666666',
  BORDER: '#374151',
  ICON_DEFAULT: '#9CA3AF',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
};

const RunningMeetingReview = ({ route, navigation }) => {
  const { event: rawEvent, participants: eventParticipants, onEvaluationComplete } = route.params;
  const { user } = useAuth();

  // 문자열로 받은 날짜를 Date 객체로 변환
  const event = {
    ...rawEvent,
    date: rawEvent.date ? new Date(rawEvent.date) : null,
    createdAt: rawEvent.createdAt ? new Date(rawEvent.createdAt) : null,
    updatedAt: rawEvent.updatedAt ? new Date(rawEvent.updatedAt) : null
  };

  
  // 현재 사용자 본인을 제외한 참여자 목록 (자신은 자신을 평가할 수 없음)
  const [participants] = useState(() => {
    if (!eventParticipants) return [];
    
    return eventParticipants.filter(participant => {
      // 현재 사용자 본인인지 확인
      const isCurrentUser = (
        participant.id === user?.uid ||
        participant.name === user?.displayName ||
        participant.name === user?.email?.split('@')[0] ||
        // 예전 모임들을 위한 추가 조건들
        (user?.displayName && participant.name && participant.name.includes(user.displayName)) ||
        (user?.email && participant.name && participant.name.includes(user.email.split('@')[0]))
      );
      
      console.log('🔍 RunningMeetingReview - 참여자 필터링:', {
        participantName: participant.name,
        participantId: participant.id,
        userDisplayName: user?.displayName,
        userEmail: user?.email,
        userUid: user?.uid,
        isCurrentUser,
        willInclude: !isCurrentUser
      });
      
      return !isCurrentUser; // 현재 사용자 본인은 제외
    });
  });

  // 평가 상태 관리
  const [evaluations, setEvaluations] = useState({});
  const [completedCount, setCompletedCount] = useState(0);

  // 태그 옵션
  const tagOptions = {
    positive: [
      "같이 달리고 싶어요",
      "분위기 메이커에요", 
      "열정 러너에요",
      "페이스메이커에요",
      "러닝지식이 많아요",
      "러닝코스를 많이 알아요"
    ],
    negative: [
      "페이스가 맞지 않았어요",
      "소통이 부족했어요",
      "약속을 지키지 않았어요",
      "러닝 예티켓이 부족했어요",
      "일정 변경을 미리 알려주지 않았어요"
    ]
  };

  // 특별 상황 옵션
  const specialSituations = [
    "노쇼",
    "지각",
    "부적절한 행동"
  ];

  // 하트 점수 메시지
  const getHeartMessage = (score) => {
    const messages = {
      1: { emoji: "😐", text: "아쉬워요" },
      2: { emoji: "🙂", text: "보통이에요" },
      3: { emoji: "😊", text: "좋아요" },
      4: { emoji: "😍", text: "정말 좋아요" },
      5: { emoji: "🤩", text: "최고예요" }
    };
    return messages[score] || null;
  };

  // 평가 완료 여부 확인
  const isEvaluationComplete = (participantId) => {
    const evaluation = evaluations[participantId];
    // 매너점수(하트평가)를 선택하면 평가 완료로 간주 (카드 펼침 상태와 무관)
    return evaluation && evaluation.mannerScore > 0;
  };

  // 전체 완료 여부 확인
  const isAllComplete = () => {
    return participants.every(participant => isEvaluationComplete(participant.id));
  };

  // 완료된 평가 수 업데이트
  useEffect(() => {
    const completed = participants.filter(participant => isEvaluationComplete(participant.id)).length;
    setCompletedCount(completed);
  }, [evaluations, participants]);

  // 하트 점수 설정
  const setMannerScore = (participantId, score) => {
    setEvaluations(prev => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        mannerScore: score,
        selectedTags: prev[participantId]?.selectedTags || [],
        negativeTags: prev[participantId]?.negativeTags || [],
        specialSituations: prev[participantId]?.specialSituations || [],
        isExpanded: prev[participantId]?.isExpanded || false
      }
    }));
  };

  // 긍정적 태그 선택/해제
  const togglePositiveTag = (participantId, tag) => {
    setEvaluations(prev => {
      const current = prev[participantId] || {};
      const currentTags = current.selectedTags || [];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag];
      
      console.log('🔍 긍정적 태그 선택/해제:', {
        participantId,
        tag,
        currentTags,
        newTags,
        isSelected: !currentTags.includes(tag)
      });
      
      return {
        ...prev,
        [participantId]: {
          ...current,
          selectedTags: newTags,
          mannerScore: current.mannerScore || 0,
          negativeTags: current.negativeTags || [],
          specialSituations: current.specialSituations || [],
          isExpanded: current.isExpanded || false
        }
      };
    });
  };

  // 부정적 태그 선택/해제
  const toggleNegativeTag = (participantId, tag) => {
    setEvaluations(prev => {
      const current = prev[participantId] || {};
      const currentTags = current.negativeTags || [];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag];
      
      console.log('🔍 부정적 태그 선택/해제:', {
        participantId,
        tag,
        currentTags,
        newTags,
        isSelected: !currentTags.includes(tag)
      });
      
      return {
        ...prev,
        [participantId]: {
          ...current,
          selectedTags: current.selectedTags || [],
          negativeTags: newTags,
          mannerScore: current.mannerScore || 0,
          specialSituations: current.specialSituations || [],
          isExpanded: current.isExpanded || false
        }
      };
    });
  };

  // 특별 상황 선택/해제
  const toggleSpecialSituation = (participantId, situation) => {
    setEvaluations(prev => {
      const current = prev[participantId] || {};
      const currentSituations = current.specialSituations || [];
      const newSituations = currentSituations.includes(situation)
        ? currentSituations.filter(s => s !== situation)
        : [...currentSituations, situation];
      
      console.log('🔍 특별 상황 선택/해제:', {
        participantId,
        situation,
        currentSituations,
        newSituations,
        isSelected: !currentSituations.includes(situation)
      });
      
      return {
        ...prev,
        [participantId]: {
          ...current,
          selectedTags: current.selectedTags || [],
          negativeTags: current.negativeTags || [],
          specialSituations: newSituations,
          mannerScore: current.mannerScore || 0,
          isExpanded: current.isExpanded || false
        }
      };
    });
  };



  // 접기/펴기 토글
  const toggleExpanded = (participantId) => {
    setEvaluations(prev => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        isExpanded: !prev[participantId]?.isExpanded,
        selectedTags: prev[participantId]?.selectedTags || [],
        mannerScore: prev[participantId]?.mannerScore || 0
      }
    }));
  };

  // 제출 처리
  const handleSubmit = async () => {
    if (!isAllComplete()) {
      Alert.alert('평가 미완료', '모든 참여자의 평가를 완료해주세요.');
      return;
    }

    try {
      console.log('🔍 평가 제출 시작:', {
        eventId: event.id,
        evaluatorId: user.uid,
        evaluations,
        participants: participants.map(p => ({ id: p.id, name: p.name }))
      });

      // 각 평가 데이터 상세 확인
      Object.entries(evaluations).forEach(([participantId, evaluation]) => {
        console.log('🔍 평가 데이터 상세:', {
          participantId,
          mannerScore: evaluation.mannerScore,
          selectedTags: evaluation.selectedTags,
          tagsCount: evaluation.selectedTags?.length || 0
        });
      });

      // 평가 결과를 Firebase에 저장
      await evaluationService.saveEvaluationResults(
        event.id, // event.id 사용
        evaluations,
        user.uid
      );
    
    Alert.alert(
      '평가 완료',
      '러닝매너가 성공적으로 제출되었습니다!',
      [
        {
          text: '확인',
          onPress: () => {
            // 콜백 함수가 있으면 호출 (ScheduleCard에서 전달된 경우)
            if (onEvaluationComplete) {
              onEvaluationComplete();
            }
            
            // 러닝매너 작성 완료 후 모임탭으로 이동
            navigation.navigate('ScheduleTab');
          }
        }
      ]
    );
    } catch (error) {
      console.error('평가 저장 실패:', error);
      Alert.alert(
        '저장 실패',
        '평가 저장 중 오류가 발생했습니다. 다시 시도해주세요.',
        [
          {
            text: '확인'
          }
        ]
      );
    }
  };

  // 하트 컴포넌트
  const HeartRating = ({ participantId, currentScore, onScoreChange }) => {
    return (
      <View style={styles.heartContainer}>
        <View style={styles.heartsRow}>
          {[1, 2, 3, 4, 5].map((score) => (
            <TouchableOpacity
              key={score}
              onPress={() => onScoreChange(score)}
              style={styles.heartButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name="heart"
                size={36}
                color={score <= currentScore ? "#FF0073" : COLORS.BORDER}
              />
            </TouchableOpacity>
          ))}
        </View>
        {currentScore > 0 && (
          <View style={styles.heartMessage}>
            <Text style={styles.heartEmoji}>{getHeartMessage(currentScore).emoji}</Text>
            <Text style={styles.heartText}>{getHeartMessage(currentScore).text}</Text>
          </View>
        )}
      </View>
    );
  };

  // 긍정적 태그 선택 컴포넌트
  const PositiveTagSelector = ({ participantId, selectedTags, onTagToggle }) => {
    return (
      <View style={styles.tagContainer}>
        <Text style={styles.tagTitle}>좋았던 점 (선택사항)</Text>
        <View style={styles.tagGrid}>
          {tagOptions.positive.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagButton,
                selectedTags.includes(tag) && styles.tagButtonSelected
              ]}
              onPress={() => onTagToggle(tag)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tagText,
                selectedTags.includes(tag) && styles.tagTextSelected
              ]}>
                {tag}
              </Text>
              {selectedTags.includes(tag) && (
                <Ionicons name="checkmark" size={16} color={COLORS.PRIMARY} style={styles.tagCheck} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.tagCount}>
          {selectedTags.length}개 선택됨
        </Text>
      </View>
    );
  };

  // 부정적 태그 선택 컴포넌트
  const NegativeTagSelector = ({ participantId, selectedTags, onTagToggle }) => {
    return (
      <View style={styles.tagContainer}>
        <Text style={styles.tagTitle}>아쉬웠던 점 (선택사항)</Text>
        <View style={styles.tagGrid}>
          {tagOptions.negative.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.negativeTagButton,
                selectedTags.includes(tag) && styles.negativeTagButtonSelected
              ]}
              onPress={() => onTagToggle(tag)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.negativeTagText,
                selectedTags.includes(tag) && styles.negativeTagTextSelected
              ]}>
                {tag}
              </Text>
              {selectedTags.includes(tag) && (
                <Ionicons name="checkmark" size={16} color="#FF6B6B" style={styles.tagCheck} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.tagCount}>
          {selectedTags.length}개 선택됨
        </Text>
      </View>
    );
  };

  // 특별 상황 선택 컴포넌트
  const SpecialSituationSelector = ({ participantId, selectedSituations, onSituationToggle }) => {
    return (
      <View style={styles.tagContainer}>
        <Text style={styles.tagTitle}>특별 상황 (선택사항)</Text>
        <View style={styles.tagGrid}>
          {specialSituations.map((situation) => (
            <TouchableOpacity
              key={situation}
              style={[
                styles.specialSituationButton,
                selectedSituations.includes(situation) && styles.specialSituationButtonSelected
              ]}
              onPress={() => onSituationToggle(situation)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.specialSituationText,
                selectedSituations.includes(situation) && styles.specialSituationTextSelected
              ]}>
                {situation}
              </Text>
              {selectedSituations.includes(situation) && (
                <Ionicons name="checkmark" size={16} color="#FF6B6B" style={styles.tagCheck} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.tagCount}>
          {selectedSituations.length}개 선택됨
        </Text>
      </View>
    );
  };



  // 참여여자 평가 컴포넌트
  const ParticipantEvaluation = ({ participant }) => {
    const evaluation = evaluations[participant.id] || {};
    const isComplete = isEvaluationComplete(participant.id);
    const isExpanded = evaluation.isExpanded || false;

    return (
      <View style={styles.participantCard}>
        <TouchableOpacity
          style={styles.participantHeader}
          onPress={() => toggleExpanded(participant.id)}
          activeOpacity={0.7}
        >
          <View style={styles.participantInfo}>
            <View style={styles.participantAvatar}>
              {participant.profileImage ? (
                <Image source={{ uri: participant.profileImage }} style={styles.participantImage} />
              ) : (
                <View style={styles.participantImagePlaceholder}>
                  <Ionicons name="person" size={16} color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.participantDetails}>
              <View style={styles.participantNameRow}>
                <Text style={styles.participantName}>{participant.name}</Text>
                {participant.role === 'host' && (
                  <View style={styles.hostBadge}>
                    <MaterialCommunityIcons name="crown" size={20} color="#FFEA00" />
                  </View>
                )}
              </View>
              <Text style={styles.participantBio} numberOfLines={2}>
                {participant.bio || '자기소개가 없습니다.'}
              </Text>
            </View>
          </View>
          <View style={styles.participantStatus}>
            {isComplete && (
              <View style={styles.completeBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.PRIMARY} />
                <Text style={styles.completeText}>완료</Text>
              </View>
            )}
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={COLORS.ICON_DEFAULT}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.evaluationForm}>
            <View style={styles.evaluationSection}>
              <Text style={styles.evaluationTitle}>매너 점수</Text>
              <HeartRating
                participantId={participant.id}
                currentScore={evaluation.mannerScore || 0}
                onScoreChange={(score) => setMannerScore(participant.id, score)}
              />
            </View>

            <View style={styles.evaluationSection}>
              <PositiveTagSelector
                participantId={participant.id}
                selectedTags={evaluation.selectedTags || []}
                onTagToggle={(tag) => togglePositiveTag(participant.id, tag)}
              />
            </View>

            <View style={styles.evaluationSection}>
              <NegativeTagSelector
                participantId={participant.id}
                selectedTags={evaluation.negativeTags || []}
                onTagToggle={(tag) => toggleNegativeTag(participant.id, tag)}
              />
            </View>

            <View style={styles.evaluationSection}>
              <SpecialSituationSelector
                participantId={participant.id}
                selectedSituations={evaluation.specialSituations || []}
                onSituationToggle={(situation) => toggleSpecialSituation(participant.id, situation)}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>러닝매너 작성</Text>
          <Text style={styles.headerSubtitle}>함께한 러닝메이트들을 평가해주세요</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="never"
        keyboardDismissMode="none"
      >
        {/* 모임 정보 카드 */}
        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <View style={styles.eventInfo}>
            <View style={styles.eventInfoRow}>
              <Ionicons name="location" size={16} color={COLORS.ICON_DEFAULT} />
              <Text style={styles.eventInfoText}>{event.location}</Text>
            </View>
            <View style={styles.eventInfoRow}>
              <Ionicons name="calendar" size={16} color={COLORS.ICON_DEFAULT} />
              <Text style={styles.eventInfoText}>
                {event.date ? (event.date instanceof Date ? event.date.toLocaleDateString('ko-KR') : event.date) : '날짜 없음'} {event.time || '시간 없음'}
              </Text>
            </View>
            <View style={styles.eventInfoRow}>
              <Ionicons name="people" size={16} color={COLORS.ICON_DEFAULT} />
              <Text style={styles.eventInfoText}>참여자 {participants.length}명</Text>
            </View>
          </View>
          <View style={styles.anonymousNotice}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.anonymousText}>익명으로 평가됩니다</Text>
          </View>
        </View>

        {/* 진행 상황 */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>평가 진행 상황</Text>
            <Text style={styles.progressCount}>
              {completedCount} / {participants.length}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(completedCount / participants.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* 참여자 목록 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={20} color={COLORS.ICON_DEFAULT} />
            <Text style={styles.sectionTitle}>참여자 평가</Text>
          </View>
          {participants.map(participant => (
            <ParticipantEvaluation key={participant.id} participant={participant} />
          ))}
        </View>
      </ScrollView>

      {/* 하단 제출 버튼 */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            isAllComplete() ? styles.submitButtonActive : styles.submitButtonInactive
          ]}
          onPress={handleSubmit}
          disabled={!isAllComplete()}
        >
          <Ionicons 
            name="checkmark-circle" 
            size={24} 
            color={isAllComplete() ? "#000000" : COLORS.SECONDARY} 
          />
          <Text style={[
            styles.submitButtonText,
            isAllComplete() ? styles.submitButtonTextActive : styles.submitButtonTextInactive
          ]}>
            러닝매너 제출하기
          </Text>
        </TouchableOpacity>
        {!isAllComplete() && (
          <Text style={styles.submitNotice}>
            {participants.length - completedCount}명의 평가가 남았습니다
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.SECONDARY,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 100, // 하단 버튼을 위한 여백
  },
  eventCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 16,
  },
  eventInfo: {
    gap: 8,
    marginBottom: 16,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventInfoText: {
    fontSize: 14,
    color: COLORS.TEXT,
  },
  anonymousNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  anonymousText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
  },
  progressSection: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  progressCount: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.BORDER,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  participantCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    overflow: 'hidden',
  },
  participantImage: {
    width: '100%',
    height: '100%',
  },
  participantImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantDetails: {
    flex: 1,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
    transform: [{ translateY: -2 }],
  },
  participantBio: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    lineHeight: 18,
  },
  participantStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completeText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
  },
  evaluationForm: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    gap: 24,
  },
  evaluationSection: {
    gap: 12,
  },
  evaluationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  heartContainer: {
    alignItems: 'center',
  },
  heartsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heartButton: {
    padding: 4,
  },
  heartMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  heartEmoji: {
    fontSize: 18,
  },
  heartText: {
    fontSize: 18,
    color: COLORS.TEXT,
  },
  tagContainer: {
    gap: 12,
  },
  tagTitle: {
    fontSize: 16,
    color: COLORS.TEXT,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
    minWidth: '48%',
  },
  tagButtonSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '20',
  },
  tagText: {
    fontSize: 14,
    color: COLORS.TEXT,
    flex: 1,
  },
  tagTextSelected: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
  },
  tagCheck: {
    marginLeft: 'auto',
    fontSize: 14,
  },
  tagCount: {
    fontSize: 14,
    color: COLORS.SECONDARY,
  },

  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: COLORS.BACKGROUND,
    borderTopWidth: 0.25,
    borderTopColor: COLORS.BORDER,
    gap: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  submitButtonInactive: {
    backgroundColor: COLORS.BORDER,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitButtonTextActive: {
    color: '#000000',
  },
  submitButtonTextInactive: {
    color: COLORS.SECONDARY,
  },
  submitNotice: {
    fontSize: 14,
    color: COLORS.SECONDARY,
    textAlign: 'center',
  },

  // 부정적 태그 스타일
  negativeTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
    minWidth: '48%',
  },
  negativeTagButtonSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FF6B6B20',
  },
  negativeTagText: {
    fontSize: 14,
    color: COLORS.TEXT,
    flex: 1,
  },
  negativeTagTextSelected: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },

  // 특별 상황 스타일
  specialSituationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
    minWidth: '48%',
  },
  specialSituationButtonSelected: {
    borderColor: '#FFA500',
    backgroundColor: '#FFA50020',
  },
  specialSituationText: {
    fontSize: 14,
    color: COLORS.TEXT,
    flex: 1,
  },
  specialSituationTextSelected: {
    color: '#FFA500',
    fontWeight: 'bold',
  },
});

export default RunningMeetingReview; 