import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { doc, getDoc } from 'firebase/firestore';

import { firestore } from '../config/firebase';

/**
 * 강제 업데이트(Force Update) 체크 서비스
 *
 * Firestore 문서 `app_config/appVersion` 에서 플랫폼별 최소 지원 버전을 읽어와
 * 현재 설치된 앱 버전과 비교한다. 현재 버전이 최소 지원 버전보다 낮으면
 * 강제 업데이트가 필요한 것으로 판단한다.
 *
 * Firestore 문서 구조 예시 (app_config/appVersion):
 * {
 *   android: {
 *     minSupportedVersion: "1.0.10",
 *     storeUrl: "https://play.google.com/store/apps/details?id=com.runon.app"
 *   },
 *   ios: {
 *     minSupportedVersion: "1.0.0",
 *     storeUrl: "https://apps.apple.com/app/id000000000"
 *   }
 * }
 *
 * - 문서가 없거나 필드가 비어 있으면 강제 업데이트를 트리거하지 않는다(fail-open).
 * - 비교는 "x.y.z" 형식을 세그먼트별 숫자로 비교한다.
 */

// 스토어 기본 링크 (Firestore에 storeUrl이 없을 때 폴백)
const DEFAULT_STORE_URLS = {
  android: 'https://play.google.com/store/apps/details?id=com.runon.app',
  ios: 'https://apps.apple.com/app/runon',
};

/**
 * 시맨틱 버전 비교.
 * @returns {number} a < b → -1, a === b → 0, a > b → 1
 */
export function compareVersions(a, b) {
  const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

/**
 * 강제 업데이트 필요 여부를 확인한다.
 * @returns {Promise<{required: boolean, storeUrl?: string, currentVersion?: string, minVersion?: string}>}
 */
export async function checkForceUpdate() {
  try {
    const currentVersion = Application.nativeApplicationVersion || '0.0.0';
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    const snap = await getDoc(doc(firestore, 'app_config', 'appVersion'));
    if (!snap.exists()) {
      return { required: false, currentVersion };
    }

    const data = snap.data() || {};
    const platformConfig = data[platform];
    if (!platformConfig || !platformConfig.minSupportedVersion) {
      return { required: false, currentVersion };
    }

    const minVersion = String(platformConfig.minSupportedVersion);
    const storeUrl = platformConfig.storeUrl || DEFAULT_STORE_URLS[platform];
    const required = compareVersions(currentVersion, minVersion) < 0;

    return { required, storeUrl, currentVersion, minVersion };
  } catch (error) {
    // 네트워크/권한 오류 등으로 체크 실패 시 앱을 막지 않는다(fail-open).
    console.warn('강제 업데이트 체크 실패:', error);
    return { required: false };
  }
}

export default { checkForceUpdate, compareVersions };
