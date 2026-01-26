/**
 * 사용자 활동 데이터 수집 서비스
 * - 자주 찾아가는 러닝카페 (마커 클릭 횟수 기준)
 * - 자주 개설하는 모임장소 (모임 생성 횟수 기준)
 */

import { getFirestore, doc, getDoc, updateDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';

const db = getFirestore();

/**
 * 카페 방문 기록 저장 (마커 클릭 시)
 * @param {string} userId - 사용자 UID
 * @param {object} cafeData - 카페 정보 { cafeId, cafeName, representativeImage }
 */
export const recordCafeVisit = async (userId, cafeData) => {
  if (!userId || !cafeData?.cafeId) {
    console.warn('⚠️ [userActivityService] recordCafeVisit: userId 또는 cafeId가 없습니다.');
    return false;
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.warn('⚠️ [userActivityService] 사용자 문서가 존재하지 않습니다.');
      return false;
    }

    const userData = userSnap.data();
    const { cafeId, cafeName, representativeImage } = cafeData;

    // frequentCafes 필드가 없으면 초기화
    if (!userData.frequentCafes) {
      await updateDoc(userRef, {
        frequentCafes: {}
      });
    }

    // 기존 방문 횟수 확인
    const existingCafe = userData.frequentCafes?.[cafeId];
    const currentVisitCount = existingCafe?.visitCount || 0;

    // frequentCafes 맵 업데이트
    await updateDoc(userRef, {
      [`frequentCafes.${cafeId}`]: {
        cafeName: cafeName || '알 수 없는 카페',
        representativeImage: representativeImage || null,
        visitCount: currentVisitCount + 1,  // increment 대신 직접 계산
        lastVisit: serverTimestamp()
      }
    });

    console.log('✅ [userActivityService] 카페 방문 기록 저장 완료:', cafeName, `(방문 횟수: ${currentVisitCount + 1})`);
    return true;
  } catch (error) {
    console.error('❌ [userActivityService] 카페 방문 기록 저장 실패:', error);
    return false;
  }
};

/**
 * 모임 장소 개설 기록 저장 (모임 생성 완료 시)
 * @param {string} userId - 사용자 UID
 * @param {object} locationData - 장소 정보 { location, customLocation }
 */
export const recordMeetingLocation = async (userId, locationData) => {
  if (!userId || !locationData?.location) {
    console.warn('⚠️ [userActivityService] recordMeetingLocation: userId 또는 location이 없습니다.');
    return false;
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.warn('⚠️ [userActivityService] 사용자 문서가 존재하지 않습니다.');
      return false;
    }

    const userData = userSnap.data();
    const { location, customLocation } = locationData;

    // frequentMeetingLocations 필드가 없으면 초기화
    if (!userData.frequentMeetingLocations) {
      await updateDoc(userRef, {
        frequentMeetingLocations: {}
      });
    }

    // location + customLocation 조합으로 고유 키 생성
    // 특수문자 및 공백을 언더스코어로 치환하여 Firestore 필드명으로 사용 가능하게 함
    const locationKey = `${location}_${customLocation || 'default'}`
      .replace(/[.#$[\]/]/g, '_') // Firestore 필드명에 사용 불가한 문자 치환
      .replace(/\s+/g, '_')       // 공백을 언더스코어로
      .substring(0, 100);          // 최대 길이 제한

    // 기존 개설 횟수 확인
    const existingLocation = userData.frequentMeetingLocations?.[locationKey];
    const currentCount = existingLocation?.count || 0;

    // frequentMeetingLocations 맵 업데이트
    await updateDoc(userRef, {
      [`frequentMeetingLocations.${locationKey}`]: {
        location: location,
        customLocation: customLocation || '',
        count: currentCount + 1,  // increment 대신 직접 계산
        lastCreated: serverTimestamp()
      }
    });

    console.log('✅ [userActivityService] 모임 장소 기록 저장 완료:', location, customLocation, `(개설 횟수: ${currentCount + 1})`);
    return true;
  } catch (error) {
    console.error('❌ [userActivityService] 모임 장소 기록 저장 실패:', error);
    return false;
  }
};

/**
 * 사용자의 자주 찾아가는 카페 목록 조회
 * @param {string} userId - 사용자 UID
 * @param {number} minVisits - 최소 방문 횟수 (기본: 2)
 * @param {number} limit - 최대 반환 개수 (기본: 3)
 * @returns {Array} 카페 목록 [{ cafeId, cafeName, representativeImage, visitCount, lastVisit }]
 */
export const getFrequentCafes = async (userId, minVisits = 2, limit = 3) => {
  if (!userId) {
    console.warn('⚠️ [userActivityService] getFrequentCafes: userId가 없습니다.');
    return [];
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.log('📋 [userActivityService] 사용자 문서가 존재하지 않습니다.');
      return [];
    }

    const userData = userSnap.data();
    const frequentCafes = userData.frequentCafes || {};

    console.log('📋 [userActivityService] frequentCafes 데이터:', Object.keys(frequentCafes).length, '개');

    // 맵을 배열로 변환하고 정렬
    const cafesArray = Object.entries(frequentCafes)
      .map(([cafeId, data]) => {
        // visitCount가 숫자인지 확인 (increment로 저장된 경우 대비)
        const visitCount = typeof data.visitCount === 'number' ? data.visitCount : (data.visitCount?.toNumber?.() || 0);
        return {
          cafeId,
          cafeName: data.cafeName,
          representativeImage: data.representativeImage,
          visitCount: visitCount,
          lastVisit: data.lastVisit
        };
      })
      .filter(cafe => {
        const meetsMinVisits = cafe.visitCount >= minVisits;
        if (!meetsMinVisits) {
          console.log(`📋 [userActivityService] 카페 ${cafe.cafeName} 필터링됨 (방문 횟수: ${cafe.visitCount} < ${minVisits})`);
        }
        return meetsMinVisits;
      })  // 최소 방문 횟수 필터
      .sort((a, b) => b.visitCount - a.visitCount)   // 방문 횟수 내림차순
      .slice(0, limit);                               // 상위 N개

    console.log('📋 [userActivityService] 필터링 후 카페 개수:', cafesArray.length);

    // 삭제된 카페 필터링 (카페가 실제로 존재하는지 확인)
    const validCafes = [];
    for (const cafe of cafesArray) {
      try {
        const cafeRef = doc(db, 'cafes', cafe.cafeId);
        const cafeSnap = await getDoc(cafeRef);
        if (cafeSnap.exists()) {
          // 최신 카페 정보로 업데이트
          const cafeData = cafeSnap.data();
          validCafes.push({
            ...cafe,
            cafeName: cafeData.name || cafe.cafeName,
            representativeImage: cafeData.representativeImage || cafeData.images?.[0] || cafe.representativeImage,
            runningCertificationBenefit: cafeData.runningCertificationBenefit || null,
            address: cafeData.address || null
          });
        } else {
          console.log(`📋 [userActivityService] 카페 ${cafe.cafeId}는 삭제되었습니다.`);
        }
        // 존재하지 않는 카페는 자동 제외
      } catch (error) {
        console.warn('⚠️ [userActivityService] 카페 존재 확인 실패:', cafe.cafeId, error);
      }
    }

    console.log('✅ [userActivityService] 최종 반환 카페 개수:', validCafes.length);
    return validCafes;
  } catch (error) {
    console.error('❌ [userActivityService] 자주 찾는 카페 조회 실패:', error);
    return [];
  }
};

/**
 * 사용자의 자주 개설하는 모임장소 목록 조회
 * @param {string} userId - 사용자 UID
 * @param {number} minCount - 최소 개설 횟수 (기본: 2)
 * @param {number} limit - 최대 반환 개수 (기본: 3)
 * @returns {Array} 장소 목록 [{ locationKey, location, customLocation, count, lastCreated }]
 */
export const getFrequentMeetingLocations = async (userId, minCount = 2, limit = 3) => {
  if (!userId) {
    console.warn('⚠️ [userActivityService] getFrequentMeetingLocations: userId가 없습니다.');
    return [];
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.log('📋 [userActivityService] 사용자 문서가 존재하지 않습니다.');
      return [];
    }

    const userData = userSnap.data();
    const frequentLocations = userData.frequentMeetingLocations || {};

    console.log('📋 [userActivityService] frequentMeetingLocations 데이터:', Object.keys(frequentLocations).length, '개');

    // 맵을 배열로 변환하고 정렬
    const locationsArray = Object.entries(frequentLocations)
      .map(([locationKey, data]) => {
        // count가 숫자인지 확인 (increment로 저장된 경우 대비)
        const count = typeof data.count === 'number' ? data.count : (data.count?.toNumber?.() || 0);
        return {
          locationKey,
          location: data.location,
          customLocation: data.customLocation,
          count: count,
          lastCreated: data.lastCreated
        };
      })
      .filter(loc => {
        const meetsMinCount = loc.count >= minCount;
        if (!meetsMinCount) {
          console.log(`📋 [userActivityService] 장소 ${loc.location} 필터링됨 (개설 횟수: ${loc.count} < ${minCount})`);
        }
        return meetsMinCount;
      })  // 최소 개설 횟수 필터
      .sort((a, b) => b.count - a.count)     // 개설 횟수 내림차순
      .slice(0, limit);                       // 상위 N개

    console.log('✅ [userActivityService] 최종 반환 장소 개수:', locationsArray.length);
    return locationsArray;
  } catch (error) {
    console.error('❌ [userActivityService] 자주 개설하는 장소 조회 실패:', error);
    return [];
  }
};

/**
 * 사용자 활동 데이터 초기화 (users 문서에 필드 추가)
 * 신규 사용자 또는 기존 사용자에게 frequentCafes, frequentMeetingLocations 필드가 없는 경우 초기화
 * @param {string} userId - 사용자 UID
 */
export const initializeUserActivityData = async (userId) => {
  if (!userId) return false;

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return false;
    }

    const userData = userSnap.data();

    // 이미 필드가 있으면 초기화하지 않음
    if (userData.frequentCafes !== undefined && userData.frequentMeetingLocations !== undefined) {
      return true;
    }

    // 없는 필드만 초기화
    const updates = {};
    if (userData.frequentCafes === undefined) {
      updates.frequentCafes = {};
    }
    if (userData.frequentMeetingLocations === undefined) {
      updates.frequentMeetingLocations = {};
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(userRef, updates);
      console.log('✅ [userActivityService] 사용자 활동 데이터 필드 초기화 완료');
    }

    return true;
  } catch (error) {
    console.error('❌ [userActivityService] 사용자 활동 데이터 초기화 실패:', error);
    return false;
  }
};

export default {
  recordCafeVisit,
  recordMeetingLocation,
  getFrequentCafes,
  getFrequentMeetingLocations,
  initializeUserActivityData
};
