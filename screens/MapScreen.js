// screens/MapScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Linking, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import ENV from '../config/environment';

const MapScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const webViewRef = useRef(null);

  // Runon 색상 시스템
  const COLORS = {
    PRIMARY: '#3AF8FF',
    BACKGROUND: '#000000',
    SURFACE: '#1F1F24',
  };

  // 기본 위치 (서울 중심)
  const DEFAULT_LOCATION = {
    latitude: 37.5665,
    longitude: 126.9780,
  };

  // 카카오맵 HTML 생성 (HanRiverMap.js의 createKakaoMapHTML을 그대로 사용, 높이만 화면 전체로 조정)
  const createKakaoMapHTML = (javascriptKey, initialLat, initialLng) => {
    // 화면 전체 높이를 계산 (WebView에서 사용 가능한 최대 높이)
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
        <meta http-equiv="Pragma" content="no-cache">
        <meta http-equiv="Expires" content="0">
        <title>러논 지도</title>
        <!-- 카카오맵 SDK 로딩 -->
        <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${javascriptKey}&libraries=services,clusterer,drawing"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background: #0a1a2a; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
            height: 100vh;
            width: 100vw;
          }
          #map { 
            width: 100vw; 
            height: 100vh; 
            border: none;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        
        <script>
          var map;
          var currentLocationMarker = null;
          var currentLocationCircle = null;
          
          function log(message, type = 'info') {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage('LOG: ' + type.toUpperCase() + ' - ' + message);
            }
          }
          
          // 현재 위치 마커 생성 함수 (HanRiverMap.js와 동일)
          function createCurrentLocationMarker(lat, lng) {
            if (currentLocationMarker) {
              currentLocationMarker.setMap(null);
            }
            if (currentLocationCircle) {
              currentLocationCircle.setMap(null);
            }
            
            var currentPosition = new kakao.maps.LatLng(lat, lng);
            
            var currentLocationSvg = '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">' +
              '<circle cx="10" cy="10" r="8" fill="#FF3A3A" stroke="#ffffff" stroke-width="2"/>' +
              '<circle cx="10" cy="10" r="3" fill="#ffffff"/>' +
              '</svg>';
            
            var currentLocationImageSrc = 'data:image/svg+xml;base64,' + btoa(currentLocationSvg);
            var currentLocationImageSize = new kakao.maps.Size(20, 20);
            var currentLocationImageOffset = new kakao.maps.Point(10, 10);
            
            var currentLocationImage = new kakao.maps.MarkerImage(
              currentLocationImageSrc,
              currentLocationImageSize,
              { offset: currentLocationImageOffset }
            );
            
            currentLocationMarker = new kakao.maps.Marker({
              position: currentPosition,
              image: currentLocationImage,
              map: map,
              zIndex: 1000
            });
            
            currentLocationCircle = new kakao.maps.Circle({
              center: currentPosition,
              radius: 50,
              strokeWeight: 1,
              strokeColor: '#FF3A3A',
              strokeOpacity: 0.3,
              strokeStyle: 'dashed',
              fillColor: '#FF3A3A',
              fillOpacity: 0.1,
              map: map
            });
            
            log('📍 현재 위치 마커 생성: ' + lat + ', ' + lng, 'success');
          }
          
          // React Native에서 메시지 수신 (HanRiverMap.js와 동일)
          window.addEventListener('message', function(event) {
            try {
              var data = JSON.parse(event.data);
              if (data.type === 'updateCurrentLocation') {
                createCurrentLocationMarker(data.latitude, data.longitude);
              } else if (data.type === 'moveToCurrentLocation') {
                if (map) {
                  var currentPosition = new kakao.maps.LatLng(data.latitude, data.longitude);
                  map.setCenter(currentPosition);
                  map.setLevel(5);
                  log('📍 현재 위치로 지도 이동', 'info');
                }
              }
            } catch (parseError) {
              console.error('❌ WebView 메시지 파싱 오류:', parseError, '원본 데이터:', event.data);
            }
          });

          try {
            log('🗺️ 카카오맵 초기화 시작', 'info');
            
            function checkKakaoSDK() {
              if (typeof kakao === 'undefined') {
                log('❌ Kakao SDK 로딩 실패 - kakao 객체 없음', 'error');
                return false;
              }
              
              if (typeof kakao.maps === 'undefined') {
                log('❌ Kakao Maps API 로딩 실패', 'error');
                return false;
              }
              
              log('✅ Kakao SDK 로딩 성공!', 'success');
              return true;
            }
            
            let attempts = 0;
            const maxAttempts = 100;
            
            function waitForKakaoSDK() {
              attempts++;
              
              if (checkKakaoSDK()) {
                initializeMap();
              } else if (attempts >= maxAttempts) {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage('kakaoMapError: SDK 로딩 타임아웃 - API 키 또는 도메인 설정 확인 필요');
                }
                return;
              } else {
                setTimeout(waitForKakaoSDK, 100);
              }
            }

            function initializeMap() {
              try {
                log('🗺️ 지도 초기화 시작', 'info');
                
                if (typeof kakao === 'undefined' || typeof kakao.maps === 'undefined') {
                  throw new Error('Kakao Maps API가 로드되지 않음');
                }
                
                if (typeof kakao.maps.LatLng !== 'function') {
                  throw new Error('kakao.maps.LatLng 생성자를 찾을 수 없음');
                }
                
                var mapContainer = document.getElementById('map');
                if (!mapContainer) {
                  throw new Error('지도 컨테이너를 찾을 수 없음');
                }
                
                var mapOption = {
                  center: new kakao.maps.LatLng(${initialLat}, ${initialLng}),
                  level: 9,
                  disableDoubleClick: true,
                  disableDoubleClickZoom: true
                };
                
                window.map = new kakao.maps.Map(mapContainer, mapOption);
                map = window.map;
                map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
                
                // 지도 크기 재계산 (타일 로딩을 위해 필수)
                setTimeout(function() {
                  if (map) {
                    map.relayout();
                    log('🔄 지도 크기 재계산 완료', 'info');
                  }
                }, 100);
                
                log('✅ 지도 초기화 완료', 'success');
                
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage('mapLoaded');
                }
                
              } catch (initError) {
                log('❌ 지도 초기화 실패: ' + initError.message, 'error');
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage('kakaoMapError: ' + initError.message);
                }
              }
            }
            
            waitForKakaoSDK();
            
          } catch (error) {
            log('❌ 전체 스크립트 오류: ' + error.message, 'error');
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage('kakaoMapError: ' + error.message);
            }
          }
        </script>
      </body>
      </html>
    `;
  };

  // 현재 위치 가져오기 함수
  const getCurrentLocation = async () => {
    try {
      setIsLocationLoading(true);
      
      // 위치 권한 요청
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'GPS 설정이 필요합니다',
          '현재 위치를 표시하려면 위치 권한이 필요합니다.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Linking.openSettings() }
          ]
        );
        setLocationPermission(false);
        setIsLocationLoading(false);
        return null;
      }
      
      setLocationPermission(true);
      
      // 현재 위치 가져오기
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setCurrentLocation(locationData);
      setIsLocationLoading(false);
      
      return locationData;
    } catch (error) {
      console.error('현재 위치 가져오기 실패:', error);
      setIsLocationLoading(false);
      return null;
    }
  };

  // 초기 위치 설정
  useEffect(() => {
    const initializeLocation = async () => {
      // GPS 권한 승인 시 현재 위치 사용, 거부 시 서울 중심 사용
      const location = await getCurrentLocation();
      // getCurrentLocation이 null을 반환하면 기본 위치 사용
    };
    
    initializeLocation();
  }, []);

  // 화면 포커스 시 StatusBar 설정 및 위치 업데이트
  useFocusEffect(
    React.useCallback(() => {
      // StatusBar 설정 (iOS)
      StatusBar.setBarStyle('dark-content', true);
      
      // 화면 포커스 시 위치 권한 확인 및 위치 업데이트
      const checkAndUpdateLocation = async () => {
        try {
          // 현재 권한 상태 확인
          const { status } = await Location.getForegroundPermissionsAsync();
          
          if (status === 'granted' && !currentLocation) {
            // 권한이 있는데 위치가 없으면 위치 가져오기
            await getCurrentLocation();
          } else if (status === 'granted' && currentLocation) {
            // 권한이 있고 위치도 있으면 위치 업데이트
            await getCurrentLocation();
          }
        } catch (error) {
          console.error('위치 권한 확인 실패:', error);
        }
      };
      
      checkAndUpdateLocation();
      
      return () => {
        // 화면을 벗어날 때 원래 설정으로 복원
        StatusBar.setBarStyle('light-content', true);
      };
    }, [currentLocation])
  );

  // WebView 메시지 핸들러 (HanRiverMap.js의 handleWebViewMessage 기반)
  const handleWebViewMessage = (event) => {
    const { data } = event.nativeEvent;
    
    if (data.includes('LOG:')) {
      console.log(data);
      return;
    }
    
    if (data === 'mapLoaded') {
      console.log('✅ mapLoaded 메시지 수신');
      setIsLoading(false);
      
      // 지도 로드 완료 후 현재 위치 전송
      if (currentLocation && webViewRef.current) {
        setTimeout(() => {
          const locationMessage = JSON.stringify({
            type: 'updateCurrentLocation',
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude
          });
          webViewRef.current.postMessage(locationMessage);
          console.log('🗺️ 지도 로드 후 현재 위치 전송:', locationMessage);
        }, 500);
      } else {
        console.log('🗺️ 지도 로드 완료, 현재 위치 없음');
      }
    } else if (data.startsWith('kakaoMapError')) {
      const errorMessage = data.substring(14);
      console.error('❌ 카카오맵 로딩 실패:', errorMessage);
      Alert.alert('지도 로딩 실패', '지도를 불러올 수 없습니다. 네트워크 연결을 확인해주세요.');
      setIsLoading(false);
    } else {
      try {
        const parsedData = JSON.parse(data);
        console.log('📨 WebView 메시지:', parsedData);
      } catch (parseError) {
        console.error('메시지 파싱 오류:', parseError);
      }
    }
  };

  // WebView 로드 완료 핸들러 (HanRiverMap.js와 동일)
  const handleLoadEnd = () => {
    // HTML 로드 완료 (지도 초기화는 mapLoaded 메시지로 처리)
  };

  // WebView 에러 핸들러 (HanRiverMap.js와 동일)
  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('❌ WebView 오류:', nativeEvent);
    setIsLoading(false);
  };

  // 한국 지역인지 확인하는 함수
  const isInKorea = (lat, lng) => {
    // 한국 경계: 대략적인 범위
    // 위도: 33.0 ~ 38.6 (제주도 ~ DMZ)
    // 경도: 124.5 ~ 132.0 (서해 ~ 동해)
    return lat >= 33.0 && lat <= 38.6 && lng >= 124.5 && lng <= 132.0;
  };

  // 초기 위치 결정 (현재 위치가 한국 지역이면 사용, 아니면 기본 위치)
  const initialLocation = (currentLocation && isInKorea(currentLocation.latitude, currentLocation.longitude)) 
    ? currentLocation 
    : DEFAULT_LOCATION;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent={true} />
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        </View>
      )}
      
      <WebView
        ref={webViewRef}
        key={`map-${initialLocation.latitude}-${initialLocation.longitude}`}
        source={{ html: createKakaoMapHTML(ENV.kakaoMapApiKey, initialLocation.latitude, initialLocation.longitude) }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={false}
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        cacheEnabled={false}
        incognito={true}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
});

export default MapScreen;
