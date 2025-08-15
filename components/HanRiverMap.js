// components/HanRiverMap.js
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Alert, Linking, ScrollView, Animated } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MeetingCard from './MeetingCard';
import { useEvents } from '../contexts/EventContext';

const HanRiverMap = ({ navigation }) => {
  const { allEvents } = useEvents(); // EventContext에서 모임 데이터 가져오기
  
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [useKakaoMap, setUseKakaoMap] = useState(true);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('a4e8824702e29ee6141edab0149ae982'); // 기본 키
  const [refreshKey, setRefreshKey] = useState(Date.now()); // 강제 새로고침용
  
  // 탭 및 모임카드 상태
  const [activeTab, setActiveTab] = useState('hanriver'); // 'hanriver' | 'riverside'
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null); // 선택된 위치
  const [showLocationList, setShowLocationList] = useState(true); // 위치 목록 표시 여부
  const [selectedLocationItem, setSelectedLocationItem] = useState(null); // 선택된 위치 아이템
  
  // 현재 위치 상태
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  
  // 슬라이딩 애니메이션 값
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Runon 색상 시스템
  const COLORS = {
    PRIMARY: '#3AF8FF',
    BACKGROUND: '#000000',
    SURFACE: '#1F1F24',
    CARD: '#171719',
    CURRENT_LOCATION: '#FF3A3A' // 현재 위치 마커 색상
  };

  // EventContext의 데이터를 기반으로 동적 모임 데이터 생성
  const generateMeetingsData = () => {
    const hanriverMeetings = {};
    const riversideMeetings = {};

    allEvents.forEach(event => {
      // 한강공원과 강변 구분
      const isHanRiver = event.location && (
        event.location.includes('한강공원') || 
        event.location.includes('여의도') ||
        event.location.includes('잠실') ||
        event.location.includes('반포') ||
        event.location.includes('뚝섬') ||
        event.location.includes('망원') ||
        event.location.includes('광나루') ||
        event.location.includes('이촌') ||
        event.location.includes('잠원') ||
        event.location.includes('양화') ||
        event.location.includes('난지')
      );

      const meetingData = {
        id: event.id,
        location: event.location,
        title: event.title,
        type: event.type,
        description: `${event.type} - ${event.distance}km ${event.pace} 페이스`,
        date: event.date,
        time: event.time,
        participants: Array.isArray(event.participants) ? event.participants.length : (event.participants || 1),
        maxParticipants: event.maxParticipants || 6,
        distance: event.distance,
        pace: event.pace,
        difficulty: event.difficulty,
        hashtags: event.hashtags,
        organizer: event.organizer || '나',
        organizerLevel: '중급자 • 2년차', // 기본값
        canJoin: (Array.isArray(event.participants) ? event.participants.length : (event.participants || 1)) < (event.maxParticipants || 6),
        status: (Array.isArray(event.participants) ? event.participants.length : (event.participants || 1)) >= (event.maxParticipants || 6) ? 'full' : 'recruiting',
        customMarkerCoords: event.customMarkerCoords,
        customLocation: event.customLocation,
        isPublic: event.isPublic,
        isCreatedByUser: event.isCreatedByUser,
        isJoined: event.isJoined
      };

      if (isHanRiver) {
        hanriverMeetings[event.location] = meetingData;
      } else {
        riversideMeetings[event.location] = meetingData;
      }
    });

    return {
      hanriver: hanriverMeetings,
      riverside: riversideMeetings
    };
  };

  // 동적 모임 데이터 생성
  const meetingsData = generateMeetingsData();

  // allEvents가 변경될 때마다 WebView 새로고침
  useEffect(() => {
    console.log('🔄 HanRiverMap - allEvents 변경 감지, WebView 새로고침');
    setRefreshKey(Date.now()); // WebView 강제 새로고침
  }, [allEvents]);

  // 현재 위치 가져오기 함수
  const getCurrentLocation = async () => {
    try {
      setIsLocationLoading(true);
      
      // 위치 권한 요청
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '위치 권한 필요',
          '현재 위치를 표시하려면 위치 권한이 필요합니다.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Linking.openSettings() }
          ]
        );
        setLocationPermission(false);
        return;
      }
      
      setLocationPermission(true);
      
      // 현재 위치 가져오기
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
      });
      
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy
      });
      
      // 웹뷰에 현재 위치 전송
      if (webViewRef.current && !isLoading) {
        const locationMessage = JSON.stringify({
          type: 'updateCurrentLocation',
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        webViewRef.current.postMessage(locationMessage);
        console.log('📍 현재 위치 전송:', locationMessage);
      } else {
        console.log('📍 웹뷰 준비 안됨 또는 로딩 중');
      }
      
    } catch (error) {
      console.error('현재 위치 가져오기 실패:', error);
      Alert.alert('위치 오류', '현재 위치를 가져올 수 없습니다.');
    } finally {
      setIsLocationLoading(false);
    }
  };

  // 위치 목록 클릭 시 지도 이동 함수
  const moveToLocation = (location) => {
    if (webViewRef.current) {
      const moveMessage = JSON.stringify({
        type: 'moveToLocation',
        latitude: location.lat,
        longitude: location.lng,
        level: 5  // 8에서 5로 변경하여 더 확대
      });
      webViewRef.current.postMessage(moveMessage);
      console.log('🗺️ 위치로 이동:', location.name, moveMessage);
      
      // 선택된 아이템 설정 (목록은 유지)
      setSelectedLocationItem(location.name);
      
      // 이전 데이터 정리
      setSelectedMeeting(null);
      setSelectedLocation(null);
      
      // 해당 위치의 모임 데이터 찾기
      const allMeetings = { ...meetingsData.hanriver, ...meetingsData.riverside };
      const locationMeetings = Object.values(allMeetings).filter(meeting => meeting.location === location.name);
      
      // 웹뷰에 마커 클릭 이벤트 시뮬레이션하여 정보창 표시 (모임 데이터 유무와 관계없이)
      setTimeout(() => {
        const markerClickMessage = JSON.stringify({
          type: 'simulateMarkerClick',
          location: location.name,
          category: activeTab
        });
        webViewRef.current.postMessage(markerClickMessage);
        console.log('📍 마커 클릭 시뮬레이션:', markerClickMessage);
      }, 500); // 지도 이동 후 0.5초 뒤에 마커 클릭 시뮬레이션
      
      // 모임 데이터가 있는 경우에만 simpleMeetingCard와 확장된 정보창 표시
      if (locationMeetings.length > 0) {
        // 첫 번째 모임을 선택하여 simpleMeetingCard 표시
        setSelectedMeeting(locationMeetings[0]);
        setSelectedLocation(location.name); // 확장된 정보창 표시
        

      }
    }
  };

  // 현재 위치로 지도 이동 함수
  const moveToCurrentLocation = () => {
    if (currentLocation && webViewRef.current) {
      const moveMessage = JSON.stringify({
        type: 'moveToCurrentLocation',
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      });
      webViewRef.current.postMessage(moveMessage);
      console.log('📍 현재 위치로 이동:', moveMessage);
      
      // 현재 위치 마커도 다시 표시
      const locationMessage = JSON.stringify({
        type: 'updateCurrentLocation',
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      });
      webViewRef.current.postMessage(locationMessage);
      console.log('📍 현재 위치 마커 재표시:', locationMessage);
    } else {
      console.log('📍 현재 위치 없음, 새로 가져오기');
      getCurrentLocation();
    }
  };

  // 컴포넌트 마운트 시 현재 위치 가져오기
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // 모임 통계 계산 함수
  const calculateMeetingStats = (location) => {
    const allMeetings = { ...meetingsData.hanriver, ...meetingsData.riverside };
    const locationMeetings = Object.values(allMeetings).filter(meeting => meeting.location === location);
    
    const stats = {
      recruiting: 0,
      full: 0,
      ended: 0
    };
    
    locationMeetings.forEach(meeting => {
      if (meeting.status === 'recruiting') {
        stats.recruiting++;
      } else if (meeting.status === 'full') {
        stats.full++;
      } else if (meeting.status === 'ended') {
        stats.ended++;
      }
    });
    
    return stats;
  };

  // 가나다순 정렬된 위치 데이터
  const locationData = {
    hanriver: [
      { name: '광나루한강공원', lat: 37.5463, lng: 127.1205, distance: '2.7km' },
      { name: '난지한강공원', lat: 37.5664, lng: 126.8758, distance: '4.2km' },
      { name: '망원한강공원', lat: 37.5543, lng: 126.8964, distance: '5.4km' },
      { name: '반포한강공원', lat: 37.5110, lng: 126.9975, distance: '8.5km' },
      { name: '뚝섬한강공원', lat: 37.5292, lng: 127.069, distance: '4.8km' },
      { name: '양화한강공원', lat: 37.5365, lng: 126.9039, distance: '2.1km' },
      { name: '여의도한강공원', lat: 37.5263, lng: 126.9351, distance: '9.8km' },
      { name: '이촌한강공원', lat: 37.5175, lng: 126.9700, distance: '4.9km' },
      { name: '잠실한강공원', lat: 37.5176, lng: 127.0825, distance: '6.2km' },
      { name: '잠원한강공원', lat: 37.5273, lng: 127.0188, distance: '3.8km' }
    ],
    riverside: [
      { name: '당현천', lat: 37.6497, lng: 127.0672, distance: '6.5km' },
      { name: '도림천', lat: 37.5076, lng: 126.8930, distance: '8.9km' },
      { name: '불광천', lat: 37.5900, lng: 126.9140, distance: '11.8km' },
      { name: '성내천', lat: 37.5234, lng: 127.1267, distance: '8.3km' },
      { name: '안양천', lat: 37.5200, lng: 126.8800, distance: '13.9km' },
      { name: '양재천', lat: 37.4881, lng: 127.0581, distance: '15.6km' },
      { name: '정릉천', lat: 37.5970, lng: 127.0410, distance: '4.2km' },
      { name: '중랑천', lat: 37.5947, lng: 127.0700, distance: '18.0km' },
      { name: '청계천', lat: 37.5696, lng: 127.0150, distance: '5.8km' },
      { name: '탄천', lat: 37.5027, lng: 127.0718, distance: '8.3km' },
      { name: '홍제천', lat: 37.5680, lng: 126.9170, distance: '7.8km' }
    ]
  };

  // 현재 모집중인 모임 필터링 함수
  const getRecruitingMeetings = (location) => {
    const allMeetings = { ...meetingsData.hanriver, ...meetingsData.riverside };
    return Object.values(allMeetings)
      .filter(meeting => meeting.location === location && meeting.status === 'recruiting')
      .slice(0, 5); // 최대 5개만
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
                height: 250px; 
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
            var currentTab = '${activeTab}';
            var hanRiverMarkers = [];
            var riverMarkers = [];
            var allInfoWindows = [];
            var currentLocationMarker = null;
            var currentLocationCircle = null;
            
            // 서울시 경계 좌표 (5km 추가 축소)
            var SEOUL_BOUNDARY = {
                north: 37.6650,  // 최북단 (도봉구 - 5km 추가 축소)
                south: 37.4580,  // 최남단 (서초구 - 5km 추가 축소)
                east: 127.1450,  // 최동단 (강동구 - 5km 추가 축소)
                west: 126.8250   // 최서단 (강서구 - 5km 추가 축소)
            };
            
            // 서울시 경계 내부인지 확인하는 함수
            function isWithinSeoulBoundary(lat, lng) {
                var withinBoundary = lat >= SEOUL_BOUNDARY.south && 
                                   lat <= SEOUL_BOUNDARY.north && 
                                   lng >= SEOUL_BOUNDARY.west && 
                                   lng <= SEOUL_BOUNDARY.east;
                                   
                log('🔍 경계 체크 - 위도: ' + lat + ' (범위: ' + SEOUL_BOUNDARY.south + ' ~ ' + SEOUL_BOUNDARY.north + ')', 'debug');
                log('🔍 경계 체크 - 경도: ' + lng + ' (범위: ' + SEOUL_BOUNDARY.west + ' ~ ' + SEOUL_BOUNDARY.east + ')', 'debug');
                log('🔍 경계 체크 결과: ' + withinBoundary, 'debug');
                
                return withinBoundary;
            }
            
            // 서울 경계 벗어남 알림 함수
            function notifyOutOfSeoulBoundary() {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage('outOfSeoulBoundary');
                }
            }
            
            // 마커 데이터를 전역 변수로 정의
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

            function log(message, type = 'info') {
                // React Native로 로그 전송
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage('LOG: ' + type.toUpperCase() + ' - ' + message);
                }
            }

            // 탭 변경 함수
            function switchTab(tab) {
                currentTab = tab;
                showMarkersForTab(currentTab);
            }

            // 탭에 따른 마커 표시
            function showMarkersForTab(tab) {
                // 모든 정보창 닫기
                allInfoWindows.forEach(function(iw) {
                    iw.close();
                });

                if (tab === 'hanriver') {
                    // 한강공원 마커만 표시
                    hanRiverMarkers.forEach(function(marker) {
                        marker.setMap(map);
                    });
                    riverMarkers.forEach(function(marker) {
                        marker.setMap(null);
                    });
                } else if (tab === 'riverside') {
                    // 강변 마커만 표시
                    riverMarkers.forEach(function(marker) {
                        marker.setMap(map);
                    });
                    hanRiverMarkers.forEach(function(marker) {
                        marker.setMap(null);
                    });
                }
            }

            // 현재 위치 마커 생성 함수
            function createCurrentLocationMarker(lat, lng) {
                // 기존 현재 위치 마커 제거
                if (currentLocationMarker) {
                    currentLocationMarker.setMap(null);
                }
                if (currentLocationCircle) {
                    currentLocationCircle.setMap(null);
                }
                
                var currentPosition = new kakao.maps.LatLng(lat, lng);
                
                // 현재 위치 원형 마커 생성 (빨간색)
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
                    zIndex: 1000 // 다른 마커들보다 위에 표시
                });
                
                // 현재 위치 정확도를 나타내는 원 생성
                currentLocationCircle = new kakao.maps.Circle({
                    center: currentPosition,
                    radius: 50, // 50미터 반경
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
            
            // 현재 위치로 지도 이동 함수
            function moveToCurrentLocation(lat, lng) {
                var currentPosition = new kakao.maps.LatLng(lat, lng);
                map.setCenter(currentPosition);
                map.setLevel(5); // 줌 레벨 조정
                log('📍 현재 위치로 지도 이동', 'info');
            }
            
            // 특정 위치로 지도 이동 함수
            function moveToLocation(lat, lng, level) {
                var position = new kakao.maps.LatLng(lat, lng);
                map.setCenter(position);
                map.setLevel(level || 5); // 기본 줌 레벨 5로 변경하여 더 확대
                log('🗺️ 위치로 이동: ' + lat + ', ' + lng + ' (레벨: ' + level + ')', 'info');
            }

            // React Native에서 메시지 수신
            window.addEventListener('message', function(event) {
                var data = JSON.parse(event.data);
                if (data.type === 'switchTab') {
                    switchTab(data.tab);
                } else if (data.type === 'updateCurrentLocation') {
                    createCurrentLocationMarker(data.latitude, data.longitude);
                } else if (data.type === 'moveToCurrentLocation') {
                    moveToCurrentLocation(data.latitude, data.longitude);
                } else if (data.type === 'moveToLocation') {
                    moveToLocation(data.latitude, data.longitude, data.level);
                } else if (data.type === 'simulateMarkerClick') {
                    // 마커 클릭 시뮬레이션 - 해당 위치의 마커를 찾아서 클릭 이벤트 발생
                    simulateMarkerClick(data.location, data.category);
                }
            });
            
            // 마커 클릭 시뮬레이션 함수
            function simulateMarkerClick(locationName, category) {
                var targetMarker = null;
                var targetInfoWindow = null;
                var markerIndex = -1;
                
                if (category === 'hanriver') {
                    // 한강공원 마커에서 찾기
                    for (var i = 0; i < hanRiverMarkers.length; i++) {
                        if (hanRiverPoints[i] && hanRiverPoints[i].name === locationName) {
                            targetMarker = hanRiverMarkers[i];
                            targetInfoWindow = allInfoWindows[i];
                            markerIndex = i;
                            break;
                        }
                    }
                } else if (category === 'riverside') {
                    // 강변 마커에서 찾기
                    for (var i = 0; i < riverMarkers.length; i++) {
                        if (riverPoints[i] && riverPoints[i].name === locationName) {
                            targetMarker = riverMarkers[i];
                            targetInfoWindow = allInfoWindows[i + hanRiverPoints.length];
                            markerIndex = i + hanRiverPoints.length;
                            break;
                        }
                    }
                }
                
                if (targetMarker && targetInfoWindow) {
                    // 다른 정보창들 닫기
                    allInfoWindows.forEach(function(iw, i) {
                        if (i !== markerIndex) {
                            iw.close();
                        }
                    });
                    
                    // 현재 정보창 열기
                    targetInfoWindow.open(map, targetMarker);
                    
                    // React Native로 마커 클릭 이벤트 전송
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'markerClick',
                            category: category,
                            location: locationName
                        }));
                    }
                    
                    log('📍 마커 클릭 시뮬레이션 성공: ' + locationName, 'success');
                } else {
                    log('❌ 마커 클릭 시뮬레이션 실패: ' + locationName + ' (마커를 찾을 수 없음)', 'error');
                }
            }

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
                        log('⏰ Kakao SDK 로딩 타임아웃 (10초)', 'error');
                        
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
                        
                        var mapContainer = document.getElementById('map');
                        if (!mapContainer) {
                            throw new Error('지도 컨테이너를 찾을 수 없음');
                        }
                        
                        var mapOption = {
                            center: new kakao.maps.LatLng(37.5350, 126.9800),
                            level: 9,
                            disableDoubleClick: true,
                            disableDoubleClickZoom: true
                        };
                        
                        window.map = new kakao.maps.Map(mapContainer, mapOption);
                        map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);

                        // 한강공원 마커 생성
                        hanRiverPoints.forEach(function(point, index) {
                            try {
                                var markerPosition = new kakao.maps.LatLng(point.lat, point.lng);
                                
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
                                
                                var marker = new kakao.maps.Marker({
                                    position: markerPosition,
                                    image: markerImage,
                                    map: currentTab === 'hanriver' ? map : null
                                });
                                
                                hanRiverMarkers.push(marker);
                                
                                // 정보창 생성 (위치명 표시용)
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
                                
                                allInfoWindows.push(infoWindow);
                                
                                // 마커 클릭 이벤트 (정보창 표시 + 모임카드 표시)
                                (function(currentMarker, currentInfoWindow, currentIndex) {
                                    kakao.maps.event.addListener(currentMarker, 'click', function() {
                                        // 다른 정보창들 닫기
                                        allInfoWindows.forEach(function(iw, i) {
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
                                        
                                        // React Native로 마커 클릭 이벤트 전송 (모임카드 표시용)
                                        if (window.ReactNativeWebView) {
                                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                                type: 'markerClick',
                                                category: 'hanriver',
                                                location: point.name
                                            }));
                                        }
                                        
                                        log('📍 한강공원 마커 클릭: ' + point.name, 'info');
                                    });
                                })(marker, infoWindow, index);
                                
                                log('📍 한강공원 마커 생성: ' + point.name, 'success');
                            } catch (markerError) {
                                log('❌ 한강공원 마커 실패: ' + point.name, 'error');
                            }
                        });

                        // 강변 마커 생성
                        riverPoints.forEach(function(point, index) {
                            try {
                                var markerPosition = new kakao.maps.LatLng(point.lat, point.lng);
                                
                                var riverSvgString = '<svg width="24" height="30" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">' +
                                    '<path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 18 12 18s12-10.8 12-18c0-6.6-5.4-12-12-12z" fill="#3AF8FF"/>' +
                                    '<path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 18 12 18s12-10.8 12-18c0-6.6-5.4-12-12-12z" fill="none" stroke="#ffffff" stroke-width="2"/>' +
                                    '<circle cx="12" cy="12" r="6" fill="#ffffff"/>' +
                                    '<circle cx="12" cy="12" r="3" fill="#3AF8FF"/>' +
                                    '</svg>';
                                
                                var riverMarkerImageSrc = 'data:image/svg+xml;base64,' + btoa(riverSvgString);
                                var riverMarkerImageSize = new kakao.maps.Size(24, 30);
                                var riverMarkerImageOffset = new kakao.maps.Point(12, 30);
                                
                                var riverMarkerImage = new kakao.maps.MarkerImage(
                                    riverMarkerImageSrc,
                                    riverMarkerImageSize,
                                    { offset: riverMarkerImageOffset }
                                );
                                
                                var riverMarker = new kakao.maps.Marker({
                                    position: markerPosition,
                                    image: riverMarkerImage,
                                    map: currentTab === 'riverside' ? map : null
                                });
                                
                                riverMarkers.push(riverMarker);
                                
                                // 강변 정보창 생성 (위치명 표시용)
                                var riverInfoWindowContent = '<div class="info-window">' + point.name + '<br/>' + 
                                    '<span style="font-size: 10px; color: #999;">' + point.distance + ' • ' + point.description + '</span></div>';
                                
                                var riverInfoWindow = new kakao.maps.InfoWindow({
                                    content: riverInfoWindowContent,
                                    removable: false,
                                    yAnchor: 1.0
                                });
                                
                                allInfoWindows.push(riverInfoWindow);
                                
                                // 강변 마커 클릭 이벤트 (정보창 표시 + 모임카드 표시)
                                (function(currentRiverMarker, currentRiverInfoWindow, currentIndex) {
                                    kakao.maps.event.addListener(currentRiverMarker, 'click', function() {
                                        // 다른 정보창들 닫기
                                        allInfoWindows.forEach(function(iw, i) {
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
                                        
                                        // React Native로 마커 클릭 이벤트 전송 (모임카드 표시용)
                                        if (window.ReactNativeWebView) {
                                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                                type: 'markerClick',
                                                category: 'riverside',
                                                location: point.name
                                            }));
                                        }
                                        
                                        log('💧 강변 마커 클릭: ' + point.name, 'info');
                                    });
                                })(riverMarker, riverInfoWindow, index + hanRiverPoints.length); // 인덱스 오프셋 추가
                                
                                log('💧 강변 마커 생성: ' + point.name, 'success');
                            } catch (riverMarkerError) {
                                log('❌ 강변 마커 실패: ' + point.name, 'error');
                            }
                        });

                        // 초기 탭 설정
                        showMarkersForTab(currentTab);
                        
                        // 지도 이동 이벤트 리스너 추가 (서울 경계 체크)
                        kakao.maps.event.addListener(map, 'center_changed', function() {
                            var center = map.getCenter();
                            var lat = center.getLat();
                            var lng = center.getLng();
                            
                            log('🗺️ 지도 중심 변경: ' + lat + ', ' + lng, 'info');
                            log('🏗️ 서울 경계 체크 결과: ' + isWithinSeoulBoundary(lat, lng), 'info');
                            
                            if (!isWithinSeoulBoundary(lat, lng)) {
                                log('⚠️ 서울 경계 벗어남 감지: ' + lat + ', ' + lng, 'warning');
                                notifyOutOfSeoulBoundary();
                                
                                // 서울 중심부로 지도 이동
                                setTimeout(function() {
                                    var newCenter = new kakao.maps.LatLng(37.5350, 126.9800);
                                    map.setCenter(newCenter);
                                    log('🎯 서울 중심부로 지도 이동 완료', 'info');
                                }, 500);
                            }
                        });
                        
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

  // 간단한 모임카드 컴포넌트
  const SimpleMeetingCard = ({ meeting, navigation }) => {
    // EventDetailScreen에서 기대하는 형식으로 데이터 변환
    const convertToEventDetailFormat = (meetingData) => {
      return {
        id: meetingData.id || Date.now(), // 고유 ID 생성
        title: meetingData.title,
        type: meetingData.type || '러닝',
        location: meetingData.location,
        date: meetingData.date,
        time: meetingData.time,
        distance: meetingData.distance,
        pace: meetingData.pace,
        difficulty: meetingData.difficulty || '중급',
        organizer: meetingData.organizer,
        participants: meetingData.participants,
        maxParticipants: meetingData.maxParticipants,
        isPublic: true,
        hashtags: meetingData.hashtags,
        customMarkerCoords: meetingData.customMarkerCoords,
        customLocation: meetingData.customLocation,
        status: meetingData.status || 'recruiting',
        isCreatedByUser: false, // 기본값
        isJoined: false // 기본값
      };
    };

    return (
      <TouchableOpacity 
        style={styles.simpleMeetingCard}
        onPress={() => {
          const eventData = convertToEventDetailFormat(meeting);
          
          // Date 객체를 문자열로 직렬화
          const serializedEventData = {
            ...eventData,
            createdAt: eventData.createdAt && typeof eventData.createdAt.toISOString === 'function' ? eventData.createdAt.toISOString() : eventData.createdAt,
            date: eventData.date && typeof eventData.date.toISOString === 'function' ? eventData.date.toISOString() : eventData.date,
            updatedAt: eventData.updatedAt && typeof eventData.updatedAt.toISOString === 'function' ? eventData.updatedAt.toISOString() : eventData.updatedAt
          };
          
          navigation.navigate('EventDetail', { 
            event: serializedEventData,
            isJoined: false,
            currentScreen: 'home'
          });
        }}
      >
        <Text style={styles.simpleMeetingTitle} numberOfLines={1}>
          {meeting.title}
        </Text>

        <View style={styles.simpleMeetingInfoRow}>
          <View style={styles.simpleMeetingInfoItem}>
            <Ionicons name="location-outline" size={16} color="#3AF8FF" />
            <Text style={styles.simpleMeetingInfoText} numberOfLines={1}>
              {meeting.location}
            </Text>
          </View>
          <View style={styles.simpleMeetingInfoItem}>
            <Ionicons name="time-outline" size={16} color="#3AF8FF" />
            <Text style={styles.simpleMeetingInfoText}>
              {meeting.date ? (meeting.date instanceof Date ? meeting.date.toLocaleDateString('ko-KR') : meeting.date) : '날짜 없음'} {meeting.time || '시간 없음'}
            </Text>
          </View>
        </View>

        <View style={styles.simpleMeetingFooter}>
          <View style={styles.simpleMeetingOrganizer}>
            <View style={styles.simpleMeetingAvatar}>
              <Text style={styles.simpleMeetingAvatarText}>
                {meeting.organizer.charAt(0)}
              </Text>
            </View>
            <Text style={styles.simpleMeetingOrganizerName}>{meeting.organizer}</Text>
          </View>
          <Text style={styles.simpleMeetingParticipants}>
            참여자 {meeting.participants}/{meeting.maxParticipants}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const webViewRef = useRef(null);

  const handleWebViewMessage = (event) => {
    const { data } = event.nativeEvent;
    
    if (data.includes('LOG:')) {
      console.log(data);
      return;
    }
    
    if (data === 'mapLoaded') {
      setIsLoading(false);
      setMapError(false);
      
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
        }, 500); // 0.5초 후 전송
      } else {
        console.log('🗺️ 지도 로드 완료, 현재 위치 없음');
      }
    } else if (data.startsWith('kakaoMapError')) {
      const errorMessage = data.substring(14); // 'kakaoMapError: ' 제거
      console.error('❌ 카카오맵 로딩 실패:', errorMessage);
      setMapError(true);
      setUseKakaoMap(false);
      setIsLoading(false);
    } else if (data === 'outOfSeoulBoundary') {
      // 서울 경계 벗어남 알림
              Alert.alert(
          '⚠️ 서울시 경계 벗어남',
          '한강 러닝 코스는 서울시\n내에서만 이용 가능합니다.\n\n지도를 서울 중심부로 이동합니다.',
          [{ text: '확인', style: 'default' }]
        );
    } else {
      // 마커 클릭 이벤트 처리
      try {
        const parsedData = JSON.parse(data);
        if (parsedData.type === 'markerClick') {
          const meeting = meetingsData[parsedData.category]?.[parsedData.location];
          if (meeting) {
            setSelectedMeeting(meeting);
            setSelectedLocation(parsedData.location); // 선택된 위치 설정

          }
        }
      } catch (parseError) {
        console.error('메시지 파싱 오류:', parseError);
      }
    }
  };

  // 탭 변경 함수
  const handleTabChange = (tab) => {
    // 다른 탭으로 전환한 경우
    if (activeTab !== tab) {
      setShowLocationList(true); // 새 탭의 목록 표시
      setSelectedLocationItem(null); // 선택된 아이템 초기화
    } else {
      // 같은 탭을 클릭한 경우 목록 토글
      setShowLocationList(!showLocationList);
    }
    
    setActiveTab(tab);
    setSelectedMeeting(null); // 탭 변경 시 모임카드 닫기
    setSelectedLocation(null); // 탭 변경 시 선택된 위치 초기화
    
    // 슬라이딩 애니메이션
    Animated.timing(slideAnim, {
      toValue: tab === 'hanriver' ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    // 웹뷰에 탭 변경 메시지 전송
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'switchTab',
        tab: tab
      }));
    }
  };

  // 모임 참여 함수
  const handleJoinMeeting = () => {
    Alert.alert(
      '모임 참여',
      `"${selectedMeeting.title}" 모임에 참여하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '참여하기', 
          onPress: () => {
            Alert.alert('참여 완료', '모임 참여가 완료되었습니다!');
            setSelectedMeeting(null);
          }
        }
      ]
    );
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
    <View style={[styles.container, { backgroundColor: '#171719' }]}>
      {/* 지도 헤더 */}
      <View style={[styles.header, { borderBottomColor: '#374151' }]}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>한강 러닝 코스</Text>
          
          {/* 현재 위치 버튼 */}
          <TouchableOpacity 
            style={styles.currentLocationButton}
            onPress={moveToCurrentLocation}
            disabled={isLocationLoading}
          >
            {isLocationLoading ? (
              <ActivityIndicator size="small" color="#FF3A3A" />
            ) : (
              <Ionicons 
                name="locate" 
                size={20} 
                color={currentLocation ? '#FF3A3A' : '#666666'} 
              />
            )}
          </TouchableOpacity>
        </View>
        
        {/* 액티브 탭 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => handleTabChange('hanriver')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'hanriver' && styles.activeTabText
            ]}>
              한강공원
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => handleTabChange('riverside')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'riverside' && styles.activeTabText
            ]}>
              강변
            </Text>
          </TouchableOpacity>
          
          {/* 슬라이딩 박스 */}
          <Animated.View 
            style={[
              styles.slidingBox,
              {
                transform: [
                  {
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 187]
                    })
                  }
                ]
              }
            ]}
          />
        </View>
      </View>
      
      {/* 위치 목록 */}
      {showLocationList && (
        <View style={styles.locationListContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.locationListScroll}
          >
            {locationData[activeTab].map((location, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.locationItem,
                  selectedLocationItem === location.name && styles.locationItemSelected
                ]}
                onPress={() => moveToLocation(location)}
              >
                <View style={styles.locationItemContent}>
                  <Text style={[
                    styles.locationItemName,
                    selectedLocationItem === location.name && styles.locationItemNameSelected
                  ]} numberOfLines={1}>
                    {location.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
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
            <Ionicons name="refresh" size={16} color="#3AF8FF" />
            <Text style={[styles.retryText, { color: '#3AF8FF' }]}>카카오맵 재시도</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.keyButton} 
            onPress={() => setShowKeyInput(!showKeyInput)}
          >
            <Ionicons name="key" size={16} color="#3AF8FF" />
            <Text style={[styles.retryText, { color: '#3AF8FF' }]}>API 키 설정</Text>
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
            <Ionicons name="help-circle" size={16} color="#3AF8FF" />
            <Text style={[styles.retryText, { color: '#3AF8FF' }]}>설정 도움말</Text>
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

      {/* 지도 WebView */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          key={`${useKakaoMap ? 'kakao' : 'fallback'}-${refreshKey}-${activeTab}-seoul-boundary-debug-v6`} // 탭 변경 시에도 리렌더링
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

      {/* 확장된 정보창 및 모임카드 리스트 */}
      {selectedLocation && (
        <View style={styles.expandedInfoContainer}>
          {/* 위치명 및 통계 정보 */}
          <View style={styles.locationHeader}>
            <Text style={styles.locationTitle}>{selectedLocation}</Text>
            <View style={styles.statsContainer}>
              {(() => {
                const stats = calculateMeetingStats(selectedLocation);
                return (
                  <>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{stats.recruiting}</Text>
                      <Text style={styles.statLabel}>모집중</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{stats.full}</Text>
                      <Text style={styles.statLabel}>마감</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{stats.ended}</Text>
                      <Text style={styles.statLabel}>종료</Text>
                    </View>
                  </>
                );
              })()}
            </View>
          </View>

          {/* 현재 모집중인 모임 리스트 */}
          {(() => {
            const recruitingMeetings = getRecruitingMeetings(selectedLocation);
            if (recruitingMeetings.length > 0) {
              return (
                <View style={styles.meetingsListContainer}>
                  <Text style={styles.meetingsListTitle}>현재 모집중인 모임</Text>
                  {recruitingMeetings.map((meeting, index) => (
                    <SimpleMeetingCard key={index} meeting={meeting} navigation={navigation} />
                  ))}
                </View>
              );
            } else {
              return (
                <View style={styles.noMeetingsContainer}>
                  <Text style={styles.noMeetingsText}>현재 모집중인 모임이 없습니다</Text>
                </View>
              );
            }
          })()}
        </View>
      )}

      {/* 기존 모임카드 (선택된 모임이 있을 때만) */}
      {selectedMeeting && !selectedLocation && (
        <MeetingCard
          meeting={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
          onJoin={handleJoinMeeting}
        />
      )}
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
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 0,
    paddingBottom: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  currentLocationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1F1F24',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
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
    height: 250,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 4,
    position: 'relative',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    zIndex: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  activeTabText: {
    color: '#000000',
    fontWeight: '700',
  },
  slidingBox: {
    position: 'absolute',
    top: 2.5,
    left: 4,
    width: 195,
    height: 32,
    backgroundColor: '#3AF8FF',
    borderRadius: 6,
    zIndex: 1,
  },
  locationListContainer: {
    backgroundColor: '#171719',
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  locationListScroll: {
    maxHeight: 90,
  },
  locationItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    minWidth: 120,
    borderColor: '#374151',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationItemSelected: {
    backgroundColor: '#1a2a3a',
    borderColor: '#3AF8FF',
    borderWidth: 1,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  locationItemContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationItemName: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  locationItemNameSelected: {
    color: '#3AF8FF',
    fontWeight: '700',
  },
  locationItemIndicator: {
    marginTop: 4,
  },
  locationItemDistance: {
    fontSize: 10,
    color: '#3AF8FF',
    fontWeight: '400',
  },
  simpleMeetingCard: {
    backgroundColor: '#1F1F24',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  simpleMeetingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  simpleMeetingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
    flexWrap: 'wrap',
  },
  simpleMeetingInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  simpleMeetingInfoText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 8,
    flexShrink: 1,
  },
  simpleMeetingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simpleMeetingOrganizer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  simpleMeetingAvatar: {
    backgroundColor: '#3AF8FF',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  simpleMeetingAvatarText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  simpleMeetingOrganizerName: {
    fontSize: 15,
    color: '#ffffff',
  },
  simpleMeetingParticipants: {
    fontSize: 15,
    color: '#666666',
  },
  expandedInfoContainer: {
    backgroundColor: '#171719',
    marginHorizontal: 0,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
  },
  locationHeader: {
    marginBottom: 16,
  },
  locationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#1F1F24',
    borderRadius: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 15,
    color: '#666666',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#374151',
    marginHorizontal: 8,
  },
  meetingsListContainer: {
    marginTop: 16,
  },
  meetingsListTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  noMeetingsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noMeetingsText: {
    fontSize: 14,
    color: '#666666',
  },
});

export default HanRiverMap;