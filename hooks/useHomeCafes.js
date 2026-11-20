import { useState, useEffect, useCallback } from 'react';
import firestoreService from '../services/firestoreService';
import { getFrequentCafes, getFrequentFoods } from '../services/userActivityService';

// Firestore Timestamp / Date / 문자열 → ms (정렬용)
const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * 홈 '러닝카페·푸드' 섹션 데이터
 *
 * - newPlaces: 최근 1개월 신규 입점 카페 + 푸드, 입점일 최신순
 * - frequentPlaces: 내가 자주 가는 카페 + 푸드, 방문 횟수 많은 순
 *
 * 각 항목은 { id, type: 'cafe'|'food', name, image, createdAt?, visitCount? } 로 통일한다.
 * 바로가기의 러닝카페 'N' 배지도 이 결과(newPlaces)를 같이 쓴다.
 */
const useHomeCafes = (user) => {
  const [state, setState] = useState({ newPlaces: [], frequentPlaces: [], loading: true });
  const uid = user?.uid;

  const load = useCallback(async () => {
    if (!uid) return;

    const [newCafes, newFoods, frequentCafes, frequentFoods] = await Promise.all([
      firestoreService.getNewCafes(10),
      firestoreService.getNewFoods(10),
      getFrequentCafes(uid, 2, 5),
      getFrequentFoods(uid, 2, 5),
    ].map((promise) => promise.catch(() => [])));

    const newPlaces = [
      ...newCafes.map((cafe) => ({ ...cafe, type: 'cafe' })),
      ...newFoods.map((food) => ({ ...food, type: 'food' })),
    ]
      .map((place) => ({
        id: place.id,
        type: place.type,
        name: place.name,
        image: place.representativeImage || null,
        createdAt: place.createdAt,
      }))
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

    const frequentPlaces = [
      ...frequentCafes.map((cafe) => ({
        id: cafe.cafeId, type: 'cafe', name: cafe.cafeName, image: cafe.representativeImage || null, visitCount: cafe.visitCount,
      })),
      ...frequentFoods.map((food) => ({
        id: food.foodId, type: 'food', name: food.foodName, image: food.representativeImage || null, visitCount: food.visitCount,
      })),
    ].sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));

    setState({ newPlaces, frequentPlaces, loading: false });
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
};

export default useHomeCafes;
