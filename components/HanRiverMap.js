// components/HanRiverMap.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Alert, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

const HanRiverMap = ({ onViewAllPress }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [useKakaoMap, setUseKakaoMap] = useState(true);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('a4e8824702e29ee6141edab0149ae982'); // 기본 키
  const [refreshKey, setRefreshKey] = useState(Date.now()); // 강제 새로고침용
  
  // NetGill 색상 시스템
  const COLORS = {
    PRIMARY: '#3AF8FF',
    BACKGROUND: '#000000',
    SURFACE: '#1F1F24',
    CARD: '#171719'
  };

  // 카카오맵 HTML 생성 함수
  const createKakaoMapHTML = (javascriptKey) => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
        <meta http-equiv="Pragma" content="no-cache">
        <meta http-equiv="Expires" content="0">
        <title>한강 러닝 코스</title>
        <!-- 카카오맵 SDK 로딩 -->
        <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${javascriptKey}&libraries=services,clusterer,drawing"></script>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                background: #0a1a2a; 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                overflow: hidden;
                height: 400px;
            }
            #map { 
                width: 100%; 
                height: 400px; 
                border: none;
            }


            /* 카카오맵 기본 InfoWindow 완전히 숨기기 */
            div[style*="background"] {
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
            }
            
            /* 모든 InfoWindow 관련 기본 스타일 제거 */
            .infowindow,
            .info-window-container,
            [class*="infowindow"],
            [class*="InfoWindow"] {
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
            }
            
            .info-window {
                background: #1a1a1a !important;
                color: #ffffff !important;
                padding: 6px 10px !important;
                border-radius: 4px !important;
                border: 1px solid #333333 !important;
                font-size: 11px !important;
                font-weight: 500 !important;
                white-space: nowrap !important;
                text-align: center !important;
                margin: 0 !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
                display: inline-block !important;
                margin-top: -5px !important;
            }
            
            .diagonal-info {
                transform: translate(70px, 5px) !important;
            }

        </style>
    </head>
    <body>
        <div id="map"></div>
        
        <script>
            function log(message, type = 'info') {
                // 콘솔에만 로그 출력 (화면에는 표시하지 않음)

                
                // React Native로 로그 전송
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage('LOG: ' + type.toUpperCase() + ' - ' + message);
                }
            }

            try {
                log('🗺️ 카카오맵 초기화 시작', 'info');
                
                // 1. 환경 정보 수집
                log('📱 User Agent: ' + navigator.userAgent.substring(0, 50) + '...', 'info');
                log('🌐 현재 URL: ' + window.location.href, 'info');
                log('🔗 도메인: ' + window.location.hostname, 'info');
                log('🚪 포트: ' + window.location.port, 'info');
                
                // 2. 네트워크 상태 체크
                if (!navigator.onLine) {
                    log('❌ 인터넷 연결 없음', 'error');
                    throw new Error('No internet connection');
                }
                log('✅ 인터넷 연결 확인', 'success');
                
                                 // 3. API 키 확인 (콘솔에만 출력)
                 const currentKey = '${javascriptKey}';
                 log('🔑 현재 API 키: ' + currentKey, 'info');
                
                // 4. Kakao SDK 로딩 상태 체크
                log('⏳ Kakao SDK 로딩 확인 중...', 'warning');
                
                function checkKakaoSDK() {
                    if (typeof kakao === 'undefined') {
                        log('❌ Kakao SDK 로딩 실패 - kakao 객체 없음', 'error');
                        log('💡 해결방법: 1) API 키 확인 2) 도메인 등록 3) 네트워크 확인', 'warning');
                        return false;
                    }
                    
                    if (typeof kakao.maps === 'undefined') {
                        log('❌ Kakao Maps API 로딩 실패', 'error');
                        log('💡 해결방법: JavaScript 키 권한 확인 필요', 'warning');
                        return false;
                    }
                    
                    log('✅ Kakao SDK 로딩 성공!', 'success');
                    return true;
                }
                
                // 5. SDK 로딩 대기 (최대 10초)
                let attempts = 0;
                const maxAttempts = 100; // 10초 (100ms * 100)
                
                function waitForKakaoSDK() {
                    attempts++;
                    
                    if (checkKakaoSDK()) {
                        initializeMap();
                    } else if (attempts >= maxAttempts) {
                        log('⏰ Kakao SDK 로딩 타임아웃 (10초)', 'error');
                        log('📋 문제해결 체크리스트:', 'error');
                        log('   1. JavaScript 키가 올바른가?', 'error');
                        log('   2. 웹 플랫폼에 도메인이 등록되었는가?', 'error');
                        log('   3. 인터넷 연결이 안정적인가?', 'error');
                        log('   4. 방화벽이나 보안 소프트웨어가 차단하고 있는가?', 'error');
                        
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage('kakaoMapError: SDK 로딩 타임아웃 - API 키 또는 도메인 설정 확인 필요');
                        }
                        return;
                    } else {
                        if (attempts % 10 === 0) { // 1초마다 로그
                            log('⏳ SDK 로딩 대기... (' + Math.floor(attempts/10) + '/10초)', 'warning');
                        }
                        setTimeout(waitForKakaoSDK, 100);
                    }
                }
                
                

                function initializeMap() {
                    try {
                        log('🗺️ 지도 초기화 시작', 'info');
                        
                        // DOM 요소 확인
                        var mapContainer = document.getElementById('map');
                        if (!mapContainer) {
                            throw new Error('지도 컨테이너를 찾을 수 없음');
                        }
                        log('✅ 지도 컨테이너 확인', 'success');
                        
                                                 // 지도 생성 (모든 마커가 보이도록 조정)
                         var mapOption = {
                             center: new kakao.maps.LatLng(37.5350, 126.9800), // 서울 중심점
                             level: 8, // 많이 확대된 레벨로 조정
                             disableDoubleClick: true,
                             disableDoubleClickZoom: true
                         };
                        
                        var map = new kakao.maps.Map(mapContainer, mapOption);
                        log('✅ 지도 객체 생성 성공', 'success');
                        
                        map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
                        log('✅ 지도 타입 설정 완료', 'success');

                        // Places API 객체 생성 및 권한 확인



        
                                                 // 한강공원 마커 추가 (정확한 위치 좌표)
                         var hanRiverPoints = [
                             { lat: 37.5176, lng: 127.0825, name: '잠실한강공원', distance: '6.2km' },
                             { lat: 37.5292, lng: 127.069, name: '뚝섬한강공원', distance: '4.8km' },
                             { lat: 37.5463, lng: 127.1205, name: '광나루한강공원', distance: '2.7km' },
                             { lat: 37.5110, lng: 126.9975, name: '반포한강공원', distance: '8.5km' },
                             { lat: 37.5175, lng: 126.9700, name: '이촌한강공원', distance: '4.9km' },
                             { lat: 37.5263, lng: 126.9351, name: '여의도한강공원', distance: '9.8km' },
                             { lat: 37.5543, lng: 126.8964, name: '망원한강공원', distance: '5.4km' },
                             { lat: 37.5664, lng: 126.8758, name: '난지한강공원', distance: '4.2km' },
                             { lat: 37.5365, lng: 126.9039, name: '양화한강공원', distance: '2.1km' },
                             { lat: 37.5273, lng: 127.0188, name: '잠원한강공원', distance: '3.8km' }
                         ];

                        // 서울 강변 마커 추가 (서울시 구간 길이 기준)
                        var riverPoints = [
                            { lat: 37.5696, lng: 127.0150, name: '청계천', distance: '5.8km', description: '도심 속 생태하천' },
                            { lat: 37.5970, lng: 127.0410, name: '정릉천', distance: '4.2km', description: '북한산 기슭 자연천' },
                            { lat: 37.5947, lng: 127.0700, name: '중랑천', distance: '18.0km', description: '서울 동북부 주요 하천' },
                            { lat: 37.5900, lng: 126.9140, name: '불광천', distance: '11.8km', description: '은평구 대표 하천' },
                            { lat: 37.5076, lng: 126.8930, name: '도림천', distance: '8.9km', description: '영등포구 도시하천' },
                            { lat: 37.5200, lng: 126.8800, name: '안양천', distance: '13.9km', description: '서남부 주요 하천' },
                            { lat: 37.4881, lng: 127.0581, name: '양재천', distance: '15.6km', description: '강남구 생태하천' },
                            { lat: 37.5234, lng: 127.1267, name: '성내천', distance: '8.3km', description: '강동구 자연하천' },
                            { lat: 37.5027, lng: 127.0718, name: '탄천', distance: '8.3km', description: '서울 구간 생태복원 하천' },
                            { lat: 37.5680, lng: 126.9170, name: '홍제천', distance: '7.8km', description: '서대문구 도심하천' },
                            { lat: 37.6497, lng: 127.0672, name: '당현천', distance: '6.5km', description: '노원구 대표 생태하천' }
                        ];



        
                                                 // 마커 생성s
                         var markers = [];
                         var infoWindows = [];
                         
                         hanRiverPoints.forEach(function(point, index) {
                             try {
                                 var markerPosition = new kakao.maps.LatLng(point.lat, point.lng);
                                 
                                 // 커스텀 마커 이미지 생성 (SVG 문자열)
                                 var svgString = '<svg width="24" height="30" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">' +
                                     '<path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 18 12 18s12-10.8 12-18c0-6.6-5.4-12-12-12z" fill="#3AF8FF"/>' +
                                     '<path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 18 12 18s12-10.8 12-18c0-6.6-5.4-12-12-12z" fill="none" stroke="#ffffff" stroke-width="2"/>' +
                                     '<circle cx="12" cy="12" r="6" fill="#ffffff"/>' +
                                     '<circle cx="12" cy="12" r="3" fill="#3AF8FF"/>' +
                                     '</svg>';
                                 
                                 var markerImageSrc = 'data:image/svg+xml;base64,' + btoa(svgString);
                                 var markerImageSize = new kakao.maps.Size(24, 30);
                                 var markerImageOffset = new kakao.maps.Point(12, 30);
                                 
                                 var markerImage = new kakao.maps.MarkerImage(
                                     markerImageSrc,
                                     markerImageSize,
                                     { offset: markerImageOffset }
                                 );
                                 
                                 // 커스텀 이미지로 마커 생성
                                 var marker = new kakao.maps.Marker({
                                     position: markerPosition,
                                     image: markerImage,
                                     map: map
                                 });
                                 
                                 markers.push(marker);
                                 
                                 // 정보창 생성 (마커와 더 가깝게)
                                 var infoWindowContent = '<div class="info-window';
                                 if (point.name === '망원한강공원' || point.name === '양화한강공원' || point.name === '여의도한강공원') {
                                     infoWindowContent += ' diagonal-info';
                                 }
                                 infoWindowContent += '">' + point.name + '</div>';
                                 
                                 var infoWindow = new kakao.maps.InfoWindow({
                                     content: infoWindowContent,
                                     removable: false,
                                     yAnchor: 1.0
                                 });
                                 
                                 infoWindows.push(infoWindow);
                                 
                                 // 마커 클릭 이벤트 (클로저 사용)
                                 (function(currentMarker, currentInfoWindow, currentIndex) {
                                     kakao.maps.event.addListener(currentMarker, 'click', function() {
                                         // 다른 정보창들 닫기
                                         infoWindows.forEach(function(iw, i) {
                                             if (i !== currentIndex) {
                                                 iw.close();
                                             }
                                         });
                                         
                                         // 현재 정보창 토글
                                         if (currentInfoWindow.getMap()) {
                                             currentInfoWindow.close();
                                         } else {
                                             currentInfoWindow.open(map, currentMarker);
                                         }
                                         
                                         log('📍 마커 클릭: ' + hanRiverPoints[currentIndex].name, 'info');
                                     });
                                 })(marker, infoWindow, index);
                                 
                                 log('📍 마커 생성: ' + point.name, 'success');
                             } catch (markerError) {
                                 log('❌ 마커 실패: ' + point.name, 'error');
                             }
                         });
                         
                         // 지도 클릭 시 모든 정보창 닫기
                         kakao.maps.event.addListener(map, 'click', function() {
                             infoWindows.forEach(function(iw) {
                                 iw.close();
                             });
                         });
        
                                                 // 러닝 경로 라인 제거 (마커만 표시)
                         log('✅ 한강공원 마커 표시 완료', 'success');

                        // 강변 마커 및 경로 표시 기능
                        var riverMarkers = [];
                        var riverInfoWindows = [];


                        riverPoints.forEach(function(point, index) {
                            try {
                                var markerPosition = new kakao.maps.LatLng(point.lat, point.lng);
                                
                                                                                                  // 강변용 커스텀 마커 이미지 생성 (노란색)
                                 var riverSvgString = '<svg width="24" height="30" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">' +
                                     '<path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 18 12 18s12-10.8 12-18c0-6.6-5.4-12-12-12z" fill="#FFD700"/>' +
                                     '<path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 18 12 18s12-10.8 12-18c0-6.6-5.4-12-12-12z" fill="none" stroke="#ffffff" stroke-width="2"/>' +
                                     '<circle cx="12" cy="12" r="6" fill="#ffffff"/>' +
                                     '<circle cx="12" cy="12" r="3" fill="#FFD700"/>' +
                                     '</svg>';
                                 
                                 var riverMarkerImageSrc = 'data:image/svg+xml;base64,' + btoa(riverSvgString);
                                 var riverMarkerImageSize = new kakao.maps.Size(24, 30);
                                 var riverMarkerImageOffset = new kakao.maps.Point(12, 30);
                                 
                                 var riverMarkerImage = new kakao.maps.MarkerImage(
                                     riverMarkerImageSrc,
                                     riverMarkerImageSize,
                                     { offset: riverMarkerImageOffset }
                                 );
                                 
                                 // 강변 마커 생성
                                 var riverMarker = new kakao.maps.Marker({
                                     position: markerPosition,
                                     image: riverMarkerImage,
                                     map: map
                                 });
                                
                                riverMarkers.push(riverMarker);
                                
                                // 강변 정보창 생성
                                var riverInfoWindowContent = '<div class="info-window">' + point.name + '<br/>' + 
                                    '<span style="font-size: 10px; color: #999;">' + point.distance + ' • ' + point.description + '</span></div>';
                                
                                var riverInfoWindow = new kakao.maps.InfoWindow({
                                    content: riverInfoWindowContent,
                                    removable: false,
                                    yAnchor: 1.0
                                });
                                
                                riverInfoWindows.push(riverInfoWindow);
                                

                                
                                // 강변 마커 클릭 이벤트 (정보창만 표시)
                                (function(currentRiverMarker, currentRiverInfoWindow, currentIndex, riverName) {
                                    kakao.maps.event.addListener(currentRiverMarker, 'click', function() {
                                        // 다른 강변 정보창들 닫기
                                        riverInfoWindows.forEach(function(iw, i) {
                                            if (i !== currentIndex) {
                                                iw.close();
                                            }
                                        });
                                        
                                        // 현재 정보창 토글
                                        if (currentRiverInfoWindow.getMap()) {
                                            currentRiverInfoWindow.close();
                                        } else {
                                            currentRiverInfoWindow.open(map, currentRiverMarker);
                                        }
                                        
                                        log('💧 강변 마커 클릭: ' + riverName, 'info');
                                    });
                                })(riverMarker, riverInfoWindow, index, point.name);
                                
                                log('💧 강변 마커 생성: ' + point.name, 'success');
                            } catch (riverMarkerError) {
                                log('❌ 강변 마커 실패: ' + point.name, 'error');
                            }
                        });

                        // 지도 클릭 시 모든 강변 정보창도 닫기
                        kakao.maps.event.addListener(map, 'click', function() {
                            riverInfoWindows.forEach(function(iw) {
                                iw.close();
                            });
                        });

                                                 log('✅ 강변 마커 표시 완료', 'success');

                        // 지도 중심을 서울 중심부로 조정하고 레벨 9 유지
                        try {
                            // 서울 중심부 좌표 (강변 마커들을 고려한 중심점)
                            var seoulCenter = new kakao.maps.LatLng(37.5665, 127.0105);
                            map.setCenter(seoulCenter);
                            map.setLevel(9); // 레벨 9 고정
                            log('✅ 지도 중심 조정 완료 (레벨 9 유지)', 'success');
                        } catch (centerError) {
                            log('❌ 지도 중심 조정 실패: ' + centerError.message, 'error');
                        }
                        
                                                 log('🎉 카카오맵 초기화 완료!', 'success');


                         
                         if (window.ReactNativeWebView) {
                             window.ReactNativeWebView.postMessage('kakaoMapLoaded');
                         }
                        
                    } catch (mapError) {
                        log('❌ 지도 초기화 실패: ' + mapError.message, 'error');
                        throw mapError;
                    }
                }
                
                // SDK 로딩 시작
                waitForKakaoSDK();
                
            } catch (error) {
                log('💥 치명적 오류: ' + error.message, 'error');
                
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage('kakaoMapError: ' + error.message);
                }
            }
        </script>
    </body>
    </html>
  `;

  // 간단한 폴백 지도 HTML (카카오맵 실패 시)
  const fallbackMapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <title>한강 러닝 코스</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                background: linear-gradient(135deg, #0a1a2a 0%, #1a2a3a 100%);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                overflow: hidden;
                height: 280px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            }
            .map-container {
                width: 100%;
                height: 100%;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .center-content {
                text-align: center;
                color: #ffffff;
                z-index: 10;
            }
            .map-icon {
                font-size: 48px;
                color: #3AF8FF;
                margin-bottom: 8px;
            }
            .map-title {
                font-size: 16px;
                font-weight: 500;
                margin-bottom: 4px;
            }
            .map-subtitle {
                font-size: 12px;
                color: #999999;
            }
            .point {
                position: absolute;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background-color: #3AF8FF;
                border: 2px solid #ffffff;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            }
            .point1 { top: 40px; left: 60px; }
            .point2 { top: 80px; right: 80px; }
            .point3 { bottom: 50px; left: 100px; }
            .point4 { top: 60px; left: 50%; transform: translateX(-50%); }
            .point5 { bottom: 70px; right: 60px; }
            
            /* 러닝 경로 라인 */
            .running-line {
                position: absolute;
                top: 30%;
                left: 10%;
                right: 10%;
                height: 2px;
                background: linear-gradient(90deg, #3AF8FF, #66FAFF, #3AF8FF);
                opacity: 0.8;
                border-radius: 1px;
            }
        </style>
    </head>
    <body>
        <div class="map-container">
            <div class="center-content">
                <div class="map-icon">🗺️</div>
                <div class="map-title">한강 러닝 코스 지도</div>
                <div class="map-subtitle">8개 러닝 구간 연결</div>
            </div>
            
            <!-- 한강공원 포인트들 -->
            <div class="point point1"></div>
            <div class="point point2"></div>
            <div class="point point3"></div>
            <div class="point point4"></div>
            <div class="point point5"></div>
            
            <!-- 러닝 경로 라인 -->
            <div class="running-line"></div>
        </div>
        
        <script>
            // 지도 로딩 완료 신호
            setTimeout(function() {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage('fallbackMapLoaded');
                }
            }, 1000);
        </script>
    </body>
    </html>
  `;

  const handleWebViewMessage = (event) => {
    const { data } = event.nativeEvent;
    
    // 상세 로그 처리

    
    if (data === 'kakaoMapLoaded') {

      setIsLoading(false);
      setMapError(false);
    } else if (data.startsWith('kakaoMapError')) {
      const errorMessage = data.substring(14); // 'kakaoMapError: ' 제거
      console.error('❌ 카카오맵 로딩 실패:', errorMessage);
      setMapError(true);
      setUseKakaoMap(false);
      setIsLoading(false);
    } else if (data === 'fallbackMapLoaded') {

      setIsLoading(false);
    }
  };

  const handleLoadEnd = () => {
    // 백업으로 3초 후 로딩 해제
    setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        if (useKakaoMap) {
          setMapError(true);
          setUseKakaoMap(false);
        }
      }
    }, 3000);
  };

  const handleError = (error) => {

    setMapError(true);
    setUseKakaoMap(false);
    setIsLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.CARD }]}>
      {/* 지도 헤더 */}
      <View style={[styles.header, { borderBottomColor: '#374151' }]}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>한강 러닝 코스</Text>
        </View>
        {mapError && (
          <View style={styles.errorContainer}>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={() => {
                setMapError(false);
                setUseKakaoMap(true);
                setIsLoading(true);
                setRefreshKey(Date.now()); // 강제 새로고침
              }}
            >
              <Ionicons name="refresh" size={16} color={COLORS.PRIMARY} />
              <Text style={[styles.retryText, { color: COLORS.PRIMARY }]}>카카오맵 재시도</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.keyButton} 
              onPress={() => setShowKeyInput(!showKeyInput)}
            >
              <Ionicons name="key" size={16} color={COLORS.PRIMARY} />
              <Text style={[styles.retryText, { color: COLORS.PRIMARY }]}>API 키 설정</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.helpButton} 
              onPress={() => {
                Alert.alert(
                  '카카오 개발자 센터 설정',
                  '1. developers.kakao.com 접속\n2. 내 애플리케이션 > 앱 설정 > 플랫폼\n3. Web 플랫폼 등록\n4. 사이트 도메인 추가:\n   - http://localhost:8081\n   - https://localhost:8081\n   - about:blank\n   - file://\n5. JavaScript 키 복사',
                  [
                    { text: '취소', style: 'cancel' },
                    { text: '개발자 센터 열기', onPress: () => Linking.openURL('https://developers.kakao.com/') }
                  ]
                );
              }}
            >
              <Ionicons name="help-circle" size={16} color={COLORS.PRIMARY} />
              <Text style={[styles.retryText, { color: COLORS.PRIMARY }]}>설정 도움말</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {showKeyInput && (
          <View style={styles.keyInputContainer}>
            <Text style={styles.keyInputLabel}>JavaScript 키 입력:</Text>
            <TextInput
              style={styles.keyInput}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="JavaScript 키를 입력하세요"
              placeholderTextColor="#666666"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.keyInputButtons}>
              <TouchableOpacity 
                style={[styles.keyInputButton, { backgroundColor: COLORS.PRIMARY }]}
                onPress={() => {
                  setShowKeyInput(false);
                  setMapError(false);
                  setUseKakaoMap(true);
                  setIsLoading(true);
                  setRefreshKey(Date.now()); // 강제 새로고침
                }}
              >
                <Text style={styles.keyInputButtonText}>적용</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.keyInputButton}
                onPress={() => setShowKeyInput(false)}
              >
                <Text style={[styles.keyInputButtonText, { color: '#999999' }]}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 지도 WebView */}
      <View style={styles.mapContainer}>
        <WebView
          key={`${useKakaoMap ? 'kakao' : 'fallback'}-${refreshKey}`} // 고유한 key로 강제 리렌더링
          source={{ html: useKakaoMap ? createKakaoMapHTML(apiKey) : fallbackMapHTML }}
          style={styles.webview}
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
          onMessage={handleWebViewMessage}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
        />
        
        {/* 로딩 인디케이터 */}
        {isLoading && (
          <View style={[styles.loadingContainer, { backgroundColor: '#0a1a2a' }]}>
            <Ionicons name="map" size={48} color={COLORS.PRIMARY} />
            <Text style={styles.loadingText}>
              {useKakaoMap ? '카카오맵 로딩 중...' : '지도 로딩 중...'}
            </Text>
          </View>
        )}
      </View>

      {/* 지도 하단 정보 삭제됨 */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 0,
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 4,
  },
  retryText: {
    fontSize: 12,
    marginLeft: 4,
  },
  mapContainer: {
    height: 400,
    position: 'relative',
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
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 8,
    fontSize: 14,
  },

  mapStatus: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    padding: 4,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    padding: 4,
  },
  keyInputContainer: {
    padding: 16,
  },
     keyInputContainer: {
     padding: 16,
     backgroundColor: '#1a1a1a',
   },
   keyInputLabel: {
     fontSize: 14,
     fontWeight: '500',
     color: '#ffffff',
     marginBottom: 8,
   },
   keyInput: {
     borderWidth: 1,
     borderColor: '#374151',
     borderRadius: 4,
     padding: 12,
     color: '#ffffff',
     backgroundColor: '#2a2a2a',
     fontSize: 14,
   },
   keyInputButtons: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     marginTop: 12,
   },
   keyInputButton: {
     flex: 1,
     padding: 12,
     borderWidth: 1,
     borderColor: '#374151',
     borderRadius: 4,
     alignItems: 'center',
     marginHorizontal: 4,
   },
   keyInputButtonText: {
     fontSize: 14,
     fontWeight: '500',
     color: '#ffffff',
   },
});

export default HanRiverMap;