// screens/MapScreen.js
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Linking, StatusBar, TouchableOpacity, Text, TextInput, FlatList, ScrollView, Image, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import MeetingCard from '../components/MeetingCard';
import EventDetailScreen from './EventDetailScreen';
import ENV from '../config/environment';
import firestoreService from '../services/firestoreService';
import { unifiedSearch } from '../services/searchService';

const MapScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [activeToggle, setActiveToggle] = useState('events'); // 'events' | 'cafes'
  const [events, setEvents] = useState([]);
  const [cafes, setCafes] = useState([]);
  const [clusterData, setClusterData] = useState(null); // 클러스터 클릭 시 데이터
  const [selectedEvent, setSelectedEvent] = useState(null); // 선택된 모임 (상세 화면 표시용)
  const [selectedCafe, setSelectedCafe] = useState(null); // 선택된 카페 (상세 화면 표시용)
  const [searchQuery, setSearchQuery] = useState(''); // 검색어
  const [cafeSearchQuery, setCafeSearchQuery] = useState(''); // 카페 검색어
  const [mapSearchQuery, setMapSearchQuery] = useState(''); // 지도 탭 검색어
  const [searchResults, setSearchResults] = useState([]); // 검색 결과
  const [isSearching, setIsSearching] = useState(false); // 검색 중 상태
  const [showSearchResults, setShowSearchResults] = useState(false); // 검색 결과 표시 여부
  const [isSearchMode, setIsSearchMode] = useState(false); // 검색 전용 화면 모드
  const [pendingSearchResult, setPendingSearchResult] = useState(null); // 검색 모드 종료 후 처리할 검색 결과
  const webViewRef = useRef(null);
  const bottomSheetRef = useRef(null);
  const searchInputRef = useRef(null);
  
  // 애니메이션 값들
  const locationButtonOpacity = useRef(new Animated.Value(1)).current;
  const locationButtonWidth = useRef(new Animated.Value(52)).current;
  const searchBarBorderWidth = useRef(new Animated.Value(0)).current;
  const searchBarBorderColor = useRef(new Animated.Value(0)).current;
  
  // Bottom Sheet snap points (부분 확장, 전체 확장)
  const snapPoints = useMemo(() => ['10%', '90%'], []);
  
  // 필터링된 모임 목록 (검색어 기반)
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) {
      return clusterData 
        ? clusterData.filter(item => item.type === 'event').map(item => item.data)
        : events;
    }
    
    const query = searchQuery.toLowerCase();
    const allEvents = clusterData 
      ? clusterData.filter(item => item.type === 'event').map(item => item.data)
      : events;
    
    return allEvents.filter(event => {
      const titleMatch = event.title?.toLowerCase().includes(query);
      const tagMatch = event.tags?.some(tag => 
        tag.toLowerCase().includes(query) || 
        (typeof tag === 'string' && tag.toLowerCase().includes(query))
      );
      const hashtagMatch = event.hashtags?.toLowerCase().includes(query);
      
      return titleMatch || tagMatch || hashtagMatch;
    });
  }, [events, clusterData, searchQuery]);
  
  // 필터링된 카페 목록 (검색어 기반)
  const filteredCafes = useMemo(() => {
    if (!cafeSearchQuery.trim()) {
      return clusterData 
        ? clusterData.filter(item => item.type === 'cafe').map(item => item.data)
        : cafes;
    }
    
    const query = cafeSearchQuery.toLowerCase();
    const allCafes = clusterData 
      ? clusterData.filter(item => item.type === 'cafe').map(item => item.data)
      : cafes;
    
    return allCafes.filter(cafe => {
      const nameMatch = cafe.name?.toLowerCase().includes(query);
      return nameMatch;
    });
  }, [cafes, clusterData, cafeSearchQuery]);

  // Runon 색상 시스템
  const COLORS = {
    PRIMARY: '#3AF8FF',
    BACKGROUND: '#000000',
    SURFACE: '#1F1F24',
    SECONDARY: '#666666',
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
          var eventMarkers = [];
          var cafeMarkers = [];
          var currentToggle = 'events'; // 'events' | 'cafes'
          var clusterer = null; // MarkerClusterer 인스턴스
          var currentEventsData = []; // 현재 표시된 모임 데이터
          var currentCafesData = []; // 현재 표시된 카페 데이터
          var searchPlaceMarker = null; // 검색한 장소 마커
          
          function log(message, type = 'info') {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage('LOG: ' + type.toUpperCase() + ' - ' + message);
            }
          }
          
          // 클러스터 업데이트 함수
          function updateClusterer() {
            if (!clusterer || !map) return;
            
            var activeMarkers = [];
            if (currentToggle === 'events') {
              activeMarkers = eventMarkers;
            } else if (currentToggle === 'cafes') {
              activeMarkers = cafeMarkers;
            }
            
            // 클러스터에 마커 업데이트
            clusterer.clear();
            if (activeMarkers.length > 0) {
              clusterer.addMarkers(activeMarkers);
            }
            
            log('🔄 클러스터 업데이트: ' + activeMarkers.length + '개 마커', 'info');
          }
          
          // 마커 표시/숨김 함수
          function showMarkersForToggle(toggle) {
            currentToggle = toggle;
            
            if (toggle === 'events') {
              // 모임 마커 표시, 카페 마커 숨김
              eventMarkers.forEach(function(marker) {
                marker.setMap(map);
              });
              cafeMarkers.forEach(function(marker) {
                marker.setMap(null);
              });
            } else if (toggle === 'cafes') {
              // 카페 마커 표시, 모임 마커 숨김
              cafeMarkers.forEach(function(marker) {
                marker.setMap(map);
              });
              eventMarkers.forEach(function(marker) {
                marker.setMap(null);
              });
            }
            
            // 클러스터 업데이트
            updateClusterer();
            
            log('🔄 토글 변경: ' + toggle, 'info');
          }
          
          // 모임 마커 생성 함수
          function createEventMarkers(eventsData) {
            // 기존 마커 제거
            eventMarkers.forEach(function(marker) {
              marker.setMap(null);
            });
            eventMarkers = [];
            currentEventsData = eventsData || [];
            
            if (!eventsData || eventsData.length === 0) {
              log('📍 모임 데이터 없음', 'info');
              updateClusterer();
              return;
            }
            
            eventsData.forEach(function(event) {
              try {
                // 좌표 추출 (하위 호환성 고려)
                var lat, lng;
                if (event.coordinates) {
                  lat = event.coordinates.latitude || event.coordinates._lat;
                  lng = event.coordinates.longitude || event.coordinates._long;
                } else if (event.customMarkerCoords) {
                  lat = event.customMarkerCoords.latitude;
                  lng = event.customMarkerCoords.longitude;
                } else {
                  return; // 좌표가 없으면 스킵
                }
                
                var markerPosition = new kakao.maps.LatLng(lat, lng);
                
                // 모임 마커 SVG (청록색)
                var eventSvg = '<svg width="24" height="30" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">' +
                  '<path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 18 12 18s12-10.8 12-18c0-6.6-5.4-12-12-12z" fill="#3AF8FF"/>' +
                  '<path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 18 12 18s12-10.8 12-18c0-6.6-5.4-12-12-12z" fill="none" stroke="#ffffff" stroke-width="2"/>' +
                  '<circle cx="12" cy="12" r="6" fill="#ffffff"/>' +
                  '<circle cx="12" cy="12" r="3" fill="#3AF8FF"/>' +
                  '</svg>';
                
                var eventImageSrc = 'data:image/svg+xml;base64,' + btoa(eventSvg);
                var eventImageSize = new kakao.maps.Size(24, 30);
                var eventImageOffset = new kakao.maps.Point(12, 30);
                
                var eventImage = new kakao.maps.MarkerImage(
                  eventImageSrc,
                  eventImageSize,
                  { offset: eventImageOffset }
                );
                
                var marker = new kakao.maps.Marker({
                  position: markerPosition,
                  image: eventImage,
                  map: currentToggle === 'events' ? map : null,
                  zIndex: 100
                });
                
                eventMarkers.push(marker);
                
                // 마커 클릭 이벤트
                (function(currentEvent, currentMarker) {
                  kakao.maps.event.addListener(currentMarker, 'click', function() {
                    if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'eventMarkerClick',
                        eventId: currentEvent.id,
                        event: currentEvent
                      }));
                    }
                    log('📍 모임 마커 클릭: ' + (currentEvent.title || currentEvent.id), 'info');
                  });
                })(event, marker);
                
              } catch (error) {
                log('❌ 모임 마커 생성 실패: ' + error.message, 'error');
              }
            });
            
            // 클러스터 업데이트
            updateClusterer();
            
            log('✅ 모임 마커 생성 완료: ' + eventMarkers.length + '개', 'success');
          }
          
          // 카페 마커 생성 함수
          function createCafeMarkers(cafesData) {
            // 기존 마커 제거
            cafeMarkers.forEach(function(marker) {
              marker.setMap(null);
            });
            cafeMarkers = [];
            currentCafesData = cafesData || [];
            
            if (!cafesData || cafesData.length === 0) {
              log('📍 카페 데이터 없음', 'info');
              updateClusterer();
              return;
            }
            
            cafesData.forEach(function(cafe) {
              try {
                // 좌표 추출
                var lat, lng;
                if (cafe.coordinates) {
                  lat = cafe.coordinates.latitude || cafe.coordinates._lat;
                  lng = cafe.coordinates.longitude || cafe.coordinates._long;
                } else {
                  return; // 좌표가 없으면 스킵
                }
                
                var markerPosition = new kakao.maps.LatLng(lat, lng);
                
                // 카페 마커 SVG (주황색)
                var cafeSvg = '<svg width="24" height="30" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">' +
                  '<path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 18 12 18s12-10.8 12-18c0-6.6-5.4-12-12-12z" fill="#FF9500"/>' +
                  '<path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 18 12 18s12-10.8 12-18c0-6.6-5.4-12-12-12z" fill="none" stroke="#ffffff" stroke-width="2"/>' +
                  '<circle cx="12" cy="12" r="6" fill="#ffffff"/>' +
                  '<circle cx="12" cy="12" r="3" fill="#FF9500"/>' +
                  '</svg>';
                
                var cafeImageSrc = 'data:image/svg+xml;base64,' + btoa(cafeSvg);
                var cafeImageSize = new kakao.maps.Size(24, 30);
                var cafeImageOffset = new kakao.maps.Point(12, 30);
                
                var cafeImage = new kakao.maps.MarkerImage(
                  cafeImageSrc,
                  cafeImageSize,
                  { offset: cafeImageOffset }
                );
                
                var marker = new kakao.maps.Marker({
                  position: markerPosition,
                  image: cafeImage,
                  map: currentToggle === 'cafes' ? map : null,
                  zIndex: 100
                });
                
                cafeMarkers.push(marker);
                
                // 마커 클릭 이벤트
                (function(currentCafe, currentMarker) {
                  kakao.maps.event.addListener(currentMarker, 'click', function() {
                    if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'cafeMarkerClick',
                        cafeId: currentCafe.id,
                        cafe: currentCafe
                      }));
                    }
                    log('📍 카페 마커 클릭: ' + (currentCafe.name || currentCafe.id), 'info');
                  });
                })(cafe, marker);
                
              } catch (error) {
                log('❌ 카페 마커 생성 실패: ' + error.message, 'error');
              }
            });
            
            // 클러스터 업데이트
            updateClusterer();
            
            log('✅ 카페 마커 생성 완료: ' + cafeMarkers.length + '개', 'success');
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
          
          // React Native에서 메시지 수신
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
              } else if (data.type === 'updateEvents') {
                createEventMarkers(data.events);
              } else if (data.type === 'updateCafes') {
                createCafeMarkers(data.cafes);
              } else if (data.type === 'switchToggle') {
                showMarkersForToggle(data.toggle);
              } else if (data.type === 'moveToEvent') {
                if (map) {
                  var eventPosition = new kakao.maps.LatLng(data.latitude, data.longitude);
                  map.setCenter(eventPosition);
                  map.setLevel(5);
                  log('📍 모임 위치로 지도 이동', 'info');
                }
              } else if (data.type === 'moveToCafe') {
                if (map) {
                  var cafePosition = new kakao.maps.LatLng(data.latitude, data.longitude);
                  map.setCenter(cafePosition);
                  map.setLevel(5);
                  log('📍 카페 위치로 지도 이동', 'info');
                }
              } else if (data.type === 'moveToPlace') {
                if (map) {
                  var placePosition = new kakao.maps.LatLng(data.latitude, data.longitude);
                  map.setCenter(placePosition);
                  map.setLevel(3); // 더 확대 (숫자가 작을수록 확대)
                  
                  // 기존 검색 장소 마커 제거
                  if (searchPlaceMarker) {
                    searchPlaceMarker.setMap(null);
                    searchPlaceMarker = null;
                  }
                  
                  // 검색한 장소에 마커 표시 (금색 마커)
                  var searchPlaceSvg = '<svg width="28" height="35" viewBox="0 0 28 35" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M14 0C6.3 0 0 6.3 0 14c0 8.4 14 21 14 21s14-12.6 14-21c0-7.7-6.3-14-14-14z" fill="#FFD700"/>' +
                    '<path d="M14 0C6.3 0 0 6.3 0 14c0 8.4 14 21 14 21s14-12.6 14-21c0-7.7-6.3-14-14-14z" fill="none" stroke="#ffffff" stroke-width="2"/>' +
                    '<circle cx="14" cy="14" r="7" fill="#ffffff"/>' +
                    '<circle cx="14" cy="14" r="4" fill="#FFD700"/>' +
                    '</svg>';
                  
                  var searchPlaceImageSrc = 'data:image/svg+xml;base64,' + btoa(searchPlaceSvg);
                  var searchPlaceImageSize = new kakao.maps.Size(28, 35);
                  var searchPlaceImageOffset = new kakao.maps.Point(14, 35);
                  
                  var searchPlaceImage = new kakao.maps.MarkerImage(
                    searchPlaceImageSrc,
                    searchPlaceImageSize,
                    { offset: searchPlaceImageOffset }
                  );
                  
                  searchPlaceMarker = new kakao.maps.Marker({
                    position: placePosition,
                    image: searchPlaceImage,
                    map: map,
                    zIndex: 200
                  });
                  
                  log('📍 장소 위치로 지도 이동 및 마커 표시', 'info');
                }
              } else if (data.type === 'mapClick' || data.type === 'mapDrag') {
                // 지도 클릭/드래그 시 Bottom Sheet 축소
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'collapseBottomSheet'
                  }));
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
                
                // MarkerClusterer 초기화
                clusterer = new kakao.maps.MarkerClusterer({
                  map: map,
                  markers: [],
                  gridSize: 60,
                  minClusterSize: 5,
                  averageCenter: true,
                  styles: [{
                    width: '50px',
                    height: '50px',
                    background: 'rgba(58, 248, 255, 0.5)',
                    borderRadius: '50%',
                    textAlign: 'center',
                    lineHeight: '50px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }]
                });
                
                // 클러스터 클릭 이벤트
                kakao.maps.event.addListener(clusterer, 'clusterclick', function(cluster) {
                  var markers = cluster.getMarkers();
                  var clusterData = [];
                  
                  markers.forEach(function(marker) {
                    // 마커가 eventMarkers에 속하는지 확인
                    var eventIndex = eventMarkers.indexOf(marker);
                    if (eventIndex !== -1 && currentEventsData[eventIndex]) {
                      clusterData.push({
                        type: 'event',
                        data: currentEventsData[eventIndex]
                      });
                    }
                    
                    // 마커가 cafeMarkers에 속하는지 확인
                    var cafeIndex = cafeMarkers.indexOf(marker);
                    if (cafeIndex !== -1 && currentCafesData[cafeIndex]) {
                      clusterData.push({
                        type: 'cafe',
                        data: currentCafesData[cafeIndex]
                      });
                    }
                  });
                  
                  if (window.ReactNativeWebView && clusterData.length > 0) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'clusterClick',
                      clusterData: clusterData,
                      markerCount: markers.length
                    }));
                    log('📍 클러스터 클릭: ' + markers.length + '개 마커', 'info');
                  }
                });
                
                // 지도 클릭 이벤트 리스너 추가
                kakao.maps.event.addListener(map, 'click', function() {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'mapClick'
                    }));
                  }
                });
                
                // 지도 드래그 이벤트 리스너 추가
                kakao.maps.event.addListener(map, 'dragend', function() {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'mapDrag'
                    }));
                  }
                });
                
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

  // 모임 데이터 로드
  const loadEvents = async (latitude, longitude) => {
    try {
      console.log('📍 모임 데이터 로드 시작:', latitude, longitude);
      const nearbyEvents = await firestoreService.getEventsNearbyHybrid(latitude, longitude, 3);
      console.log('✅ 모임 데이터 로드 완료:', nearbyEvents.length, '개');
      setEvents(nearbyEvents);
      
      // WebView에 마커 업데이트 전송
      if (webViewRef.current) {
        const message = JSON.stringify({
          type: 'updateEvents',
          events: nearbyEvents
        });
        webViewRef.current.postMessage(message);
      }
    } catch (error) {
      console.error('❌ 모임 데이터 로드 실패:', error);
    }
  };

  // 카페 데이터 로드
  const loadCafes = async (latitude, longitude) => {
    try {
      console.log('📍 카페 데이터 로드 시작:', latitude, longitude);
      const nearbyCafes = await firestoreService.getCafesNearby(latitude, longitude, 0.7);
      console.log('✅ 카페 데이터 로드 완료:', nearbyCafes.length, '개');
      setCafes(nearbyCafes);
      
      // WebView에 마커 업데이트 전송
      if (webViewRef.current) {
        const message = JSON.stringify({
          type: 'updateCafes',
          cafes: nearbyCafes
        });
        webViewRef.current.postMessage(message);
      }
    } catch (error) {
      console.error('❌ 카페 데이터 로드 실패:', error);
    }
  };

  // 초기 위치 설정 및 데이터 로드
  useEffect(() => {
    const initializeLocation = async () => {
      // GPS 권한 승인 시 현재 위치 사용, 거부 시 서울 중심 사용
      const location = await getCurrentLocation();
      
      // 위치가 있으면 해당 위치 기준으로 데이터 로드
      const loadLocation = location || DEFAULT_LOCATION;
      await Promise.all([
        loadEvents(loadLocation.latitude, loadLocation.longitude),
        loadCafes(loadLocation.latitude, loadLocation.longitude)
      ]);
    };
    
    initializeLocation();
  }, []);

  // 화면 포커스 시 StatusBar 설정 및 위치 업데이트
  useFocusEffect(
    React.useCallback(() => {
      // StatusBar 설정 (iOS) - 한 번만 설정
      StatusBar.setBarStyle('dark-content', true);
      
      // 화면 포커스 시 위치 권한 확인 및 위치 업데이트
      const checkAndUpdateLocation = async () => {
        try {
          // 현재 권한 상태 확인
          const { status } = await Location.getForegroundPermissionsAsync();
          
          if (status === 'granted') {
            // 권한이 있으면 위치 가져오기 (항상 업데이트)
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
    }, []) // dependency를 빈 배열로 하여 화면 포커스 시에만 실행되도록 함
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
      
      // 지도 로드 완료 후 마커 데이터 전송
      if (webViewRef.current) {
        setTimeout(() => {
          if (events.length > 0) {
            const eventsMessage = JSON.stringify({
              type: 'updateEvents',
              events: events
            });
            webViewRef.current.postMessage(eventsMessage);
          }
          if (cafes.length > 0) {
            const cafesMessage = JSON.stringify({
              type: 'updateCafes',
              cafes: cafes
            });
            webViewRef.current.postMessage(cafesMessage);
          }
          // 기본 토글 설정
          const toggleMessage = JSON.stringify({
            type: 'switchToggle',
            toggle: activeToggle
          });
          webViewRef.current.postMessage(toggleMessage);
        }, 1000);
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
        
        // 지도 클릭/드래그 시 Bottom Sheet 축소
        if (parsedData.type === 'mapClick' || parsedData.type === 'mapDrag') {
          handleMapInteraction();
        }
        
        // 클러스터 클릭 시 Bottom Sheet 확장 및 목록 표시
        if (parsedData.type === 'clusterClick') {
          const { clusterData: clickedClusterData, markerCount } = parsedData;
          console.log('📍 클러스터 클릭:', markerCount, '개 마커');
          
          // 클러스터 데이터를 상태에 저장
          setClusterData(clickedClusterData);
          
          // Bottom Sheet 확장
          if (bottomSheetRef.current) {
            bottomSheetRef.current.snapToIndex(1); // 전체 확장
          }
        }
        
        // 모임 마커 클릭 시
        if (parsedData.type === 'eventMarkerClick') {
          const { event } = parsedData;
          if (event) {
            handleEventClick(event);
          }
        }
      } catch (parseError) {
        // 문자열 메시지 처리 (collapseBottomSheet)
        if (data === 'collapseBottomSheet') {
          handleMapInteraction();
        } else {
          console.error('메시지 파싱 오류:', parseError);
        }
      }
    }
  };

  // WebView 로드 완료 핸들러 (HanRiverMap.js와 동일)
  const handleLoadEnd = () => {
    // 검색 모드 종료 후 대기 중인 검색 결과가 있으면 처리
    if (pendingSearchResult && webViewRef.current) {
      const result = pendingSearchResult;
      
      setTimeout(() => {
        if (result.searchType === 'event') {
          // 모임 선택 시
          handleEventClick(result);
        } else if (result.searchType === 'cafe') {
          // 카페 선택 시
          handleCafeClick(result);
        } else if (result.searchType === 'place') {
          // 장소 선택 시 - 지도 이동 및 마커 표시
          if (webViewRef.current && result.x && result.y) {
            const message = JSON.stringify({
              type: 'moveToPlace',
              latitude: parseFloat(result.y),
              longitude: parseFloat(result.x),
              name: result.name || result.place_name // 마커에 표시할 이름
            });
            webViewRef.current.postMessage(message);
          }
        }
        
        // 처리 완료 후 pendingSearchResult 초기화
        setPendingSearchResult(null);
      }, 300); // WebView가 완전히 준비될 시간을 주기 위한 지연
    }
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

  // 토글 변경 핸들러
  const handleToggleChange = (toggle) => {
    setActiveToggle(toggle);
    if (webViewRef.current) {
      const message = JSON.stringify({
        type: 'switchToggle',
        toggle: toggle
      });
      webViewRef.current.postMessage(message);
    }
  };

  // Bottom Sheet 핸들러
  const handleSheetChanges = useCallback((index) => {
    console.log('📄 Bottom Sheet 변경:', index);
  }, []);

  // 지도 클릭/드래그 시 Bottom Sheet 축소
  const handleMapInteraction = useCallback(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(0); // 부분 확장으로 복귀
    }
    setSelectedEvent(null); // 상세 화면 닫기
    setSelectedCafe(null); // 카페 상세 화면 닫기
    setClusterData(null); // 클러스터 데이터 초기화
  }, []);
  
  // 모임 클릭 핸들러
  const handleEventClick = useCallback((event) => {
    setSelectedEvent(event);
    // 해당 마커가 지도 가운데에 나타나도록 이동
    if (webViewRef.current && event) {
      let lat, lng;
      if (event.coordinates) {
        lat = event.coordinates.latitude || event.coordinates._lat;
        lng = event.coordinates.longitude || event.coordinates._long;
      } else if (event.customMarkerCoords) {
        lat = event.customMarkerCoords.latitude;
        lng = event.customMarkerCoords.longitude;
      }
      
      if (lat && lng) {
        const message = JSON.stringify({
          type: 'moveToEvent',
          latitude: lat,
          longitude: lng
        });
        webViewRef.current.postMessage(message);
      }
    }
    
    // Bottom Sheet 전체 확장
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(1);
    }
  }, []);
  
  // 모임 상세 화면 닫기
  const handleCloseEventDetail = useCallback(() => {
    setSelectedEvent(null);
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(0); // 부분 확장으로 복귀
    }
  }, []);
  
  // 카페 클릭 핸들러
  const handleCafeClick = useCallback((cafe) => {
    setSelectedCafe(cafe);
    // 해당 마커가 지도 가운데에 나타나도록 이동
    if (webViewRef.current && cafe) {
      let lat, lng;
      if (cafe.coordinates) {
        lat = cafe.coordinates.latitude || cafe.coordinates._lat;
        lng = cafe.coordinates.longitude || cafe.coordinates._long;
      }
      
      if (lat && lng) {
        const message = JSON.stringify({
          type: 'moveToCafe',
          latitude: lat,
          longitude: lng
        });
        webViewRef.current.postMessage(message);
      }
    }
    
    // Bottom Sheet 전체 확장
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(1);
    }
  }, []);
  
  // 카페 상세 화면 닫기
  const handleCloseCafeDetail = useCallback(() => {
    setSelectedCafe(null);
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(0); // 부분 확장으로 복귀
    }
  }, []);
  
  // 검색어 입력 핸들러
  const handleMapSearchInput = useCallback((query) => {
    setMapSearchQuery(query);
  }, []);
  
  // 검색 모드 진입
  const handleSearchFocus = useCallback(() => {
    // 애니메이션 먼저 시작
    Animated.parallel([
      // 현재 위치 버튼 사라지기
      Animated.timing(locationButtonOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false, // width 애니메이션을 위해 false
      }),
      Animated.timing(locationButtonWidth, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
      // 검색바 테두리 나타나기
      Animated.timing(searchBarBorderWidth, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(searchBarBorderColor, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      // 애니메이션 완료 후 검색 모드 진입
      setIsSearchMode(true);
      
      // 검색 모드 진입 시 자동 포커스
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    });
  }, [locationButtonOpacity, locationButtonWidth, searchBarBorderWidth, searchBarBorderColor]);
  
  // 검색 모드 종료
  const handleSearchBack = useCallback(() => {
    // 먼저 검색 모드 종료 (검색 전용 화면 숨김)
    setIsSearchMode(false);
    setMapSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    
    // 약간의 지연 후 애니메이션 역방향 실행 (지도 화면의 검색바가 다시 나타난 후)
    setTimeout(() => {
      Animated.parallel([
        // 현재 위치 버튼 나타나기
        Animated.timing(locationButtonOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(locationButtonWidth, {
          toValue: 52,
          duration: 300,
          useNativeDriver: false,
        }),
        // 검색바 테두리 사라지기
        Animated.timing(searchBarBorderWidth, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(searchBarBorderColor, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }, 50);
  }, [locationButtonOpacity, locationButtonWidth, searchBarBorderWidth, searchBarBorderColor]);
  
  // 통합 검색 실행
  const performMapSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    setShowSearchResults(true);
    
    try {
      const results = await unifiedSearch(query);
      const allResults = [];
      
      // Firestore 결과 추가
      if (results.firestoreResults && results.firestoreResults.length > 0) {
        results.firestoreResults.forEach(item => {
          allResults.push({
            ...item,
            searchType: item.type, // 'event' or 'cafe'
            source: 'firestore'
          });
        });
      }
      
      // Kakao Places API 결과 추가
      if (results.kakaoResults && results.kakaoResults.length > 0) {
        results.kakaoResults.forEach(item => {
          allResults.push({
            ...item,
            searchType: 'place',
            source: 'kakao',
            name: item.place_name,
            address: item.address_name || item.road_address_name,
            category: item.category_name
          });
        });
      }
      
      // 최대 5개로 제한
      setSearchResults(allResults.slice(0, 5));
      
      // 검색 결과가 없으면 알림
      if (allResults.length === 0) {
        Alert.alert('검색 결과 없음', '장소를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('검색 실패:', error);
      Alert.alert('검색 실패', '장소를 찾을 수 없습니다.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);
  
  // 검색 실행 핸들러 (엔터/입력 버튼 클릭 시)
  const handleSearchSubmit = useCallback(async () => {
    if (!mapSearchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    // 검색 실행
    await performMapSearch(mapSearchQuery);
    
    // 검색 결과 확인은 performMapSearch 내부에서 처리
    // 결과가 있으면 자동으로 표시되고, 없으면 빈 상태로 유지
  }, [mapSearchQuery, performMapSearch]);
  
  // Debounce를 통한 자동 검색 (드롭다운 결과 표시)
  useEffect(() => {
    if (!mapSearchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      performMapSearch(mapSearchQuery);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [mapSearchQuery, performMapSearch]);
  
  // 검색 결과 선택 핸들러
  const handleSearchResultSelect = useCallback((result) => {
    setShowSearchResults(false);
    setMapSearchQuery('');
    
    // 검색 결과를 저장하고 검색 모드 종료
    setPendingSearchResult(result);
    setIsSearchMode(false);
    
    // 역방향 애니메이션 실행
    setTimeout(() => {
      Animated.parallel([
        // 현재 위치 버튼 나타나기
        Animated.timing(locationButtonOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(locationButtonWidth, {
          toValue: 52,
          duration: 300,
          useNativeDriver: false,
        }),
        // 검색바 테두리 사라지기
        Animated.timing(searchBarBorderWidth, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(searchBarBorderColor, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }, 50);
  }, [locationButtonOpacity, locationButtonWidth, searchBarBorderWidth, searchBarBorderColor]);
  

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          </View>
        )}
        
        {/* 검색바 및 현재 위치 버튼 */}
        <View style={[styles.mapSearchWrapper, { top: insets.top + 10 }]}>
          <Animated.View 
            style={[
              styles.mapSearchContainer,
              {
                borderWidth: searchBarBorderWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5],
                }),
                borderColor: searchBarBorderColor.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['transparent', '#FFFFFF'],
                }),
              }
            ]}
          >
            {isSearchMode ? (
              <TouchableOpacity 
                onPress={handleSearchBack}
                style={styles.searchBackButton}
              >
                <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="search" size={24} color={COLORS.SECONDARY} style={styles.mapSearchIcon} />
            )}
            <TextInput
              style={styles.mapSearchInput}
              placeholder="모임, 카페, 장소 검색..."
              placeholderTextColor={COLORS.SECONDARY}
              value={mapSearchQuery}
              onChangeText={handleMapSearchInput}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={handleSearchFocus}
              ref={searchInputRef}
              onBlur={() => {
                // 약간의 지연 후 드롭다운 닫기 (선택 이벤트가 먼저 발생하도록)
                setTimeout(() => setShowSearchResults(false), 200);
              }}
            />
            {isSearching && (
              <ActivityIndicator size="small" color={COLORS.PRIMARY} style={styles.mapSearchLoading} />
            )}
            {mapSearchQuery.length > 0 && !isSearching && (
              <TouchableOpacity
                onPress={() => {
                  setMapSearchQuery('');
                  setSearchResults([]);
                  setShowSearchResults(false);
                }}
                style={styles.mapSearchClearButton}
              >
                <Ionicons name="close-circle" size={20} color={COLORS.SECONDARY} />
              </TouchableOpacity>
            )}
          </Animated.View>
          <Animated.View
            style={[
              styles.currentLocationButton,
              {
                opacity: locationButtonOpacity,
                width: locationButtonWidth,
                marginLeft: locationButtonWidth.interpolate({
                  inputRange: [0, 52],
                  outputRange: [0, 8],
                }),
              }
            ]}
          >
            <TouchableOpacity
              style={styles.currentLocationButtonInner}
            onPress={async () => {
              const location = await getCurrentLocation();
              if (location && webViewRef.current) {
                const message = JSON.stringify({
                  type: 'moveToCurrentLocation',
                  latitude: location.latitude,
                  longitude: location.longitude
                });
                webViewRef.current.postMessage(message);
              }
            }}
          >
            <Image 
              source={require('../assets/images/locate_button.png')} 
              style={styles.currentLocationIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          </Animated.View>
        </View>
        
        {/* 검색 전용 화면 */}
        {isSearchMode && (
          <View style={styles.searchModeContainer}>
            <View style={[styles.searchModeHeader, { paddingTop: insets.top }]}>
              <View style={styles.searchModeSearchBar}>
                <TouchableOpacity 
                  onPress={handleSearchBack}
                  style={styles.searchModeBackButton}
                >
                  <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY} />
                </TouchableOpacity>
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchModeInput}
                  placeholder="모임, 카페, 장소 검색..."
                  placeholderTextColor={COLORS.SECONDARY}
                  value={mapSearchQuery}
                  onChangeText={handleMapSearchInput}
                  onSubmitEditing={handleSearchSubmit}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus={true}
                />
                {isSearching && (
                  <ActivityIndicator size="small" color={COLORS.PRIMARY} style={styles.searchModeLoading} />
                )}
                {mapSearchQuery.length > 0 && !isSearching && (
                  <TouchableOpacity
                    onPress={() => {
                      setMapSearchQuery('');
                      setSearchResults([]);
                    }}
                    style={styles.searchModeClearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={COLORS.SECONDARY} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* 검색 결과 리스트 */}
            <ScrollView style={styles.searchModeResultsList}>
              {searchResults.length > 0 ? (
                searchResults.map((result, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.searchModeResultItem}
                    onPress={() => handleSearchResultSelect(result)}
                  >
                    <Ionicons
                      name={
                        result.searchType === 'event' ? 'people' :
                        result.searchType === 'cafe' ? 'cafe' :
                        'location'
                      }
                      size={20}
                      color={COLORS.PRIMARY}
                      style={styles.searchModeResultIcon}
                    />
                    <View style={styles.searchModeResultContent}>
                      <Text style={styles.searchModeResultTitle}>
                        {result.searchType === 'event' ? result.title :
                         result.searchType === 'cafe' ? result.name :
                         result.name || result.place_name}
                      </Text>
                      <Text style={styles.searchModeResultSubtitle} numberOfLines={1}>
                        {result.searchType === 'event' ? result.location :
                         result.searchType === 'cafe' ? result.address :
                         result.address || result.address_name || result.road_address_name}
                      </Text>
                      {result.searchType === 'place' && result.category && (
                        <Text style={styles.searchModeResultCategory}>{result.category}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              ) : mapSearchQuery.trim().length > 0 && !isSearching ? (
                <View style={styles.searchModeEmptyContainer}>
                  <Text style={styles.searchModeEmptyText}>검색 결과가 없습니다</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        )}
        
        {/* 검색 결과 드롭다운 (지도 화면에서만 표시) */}
        {!isSearchMode && showSearchResults && searchResults.length > 0 && (
          <View style={[styles.searchResultsDropdown, { top: insets.top + 70 }]}>
            <ScrollView style={styles.searchResultsList}>
              {searchResults.map((result, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.searchResultItem}
                  onPress={() => handleSearchResultSelect(result)}
                >
                  <Ionicons
                    name={
                      result.searchType === 'event' ? 'people' :
                      result.searchType === 'cafe' ? 'cafe' :
                      'location'
                    }
                    size={20}
                    color={COLORS.PRIMARY}
                    style={styles.searchResultIcon}
                  />
                  <View style={styles.searchResultContent}>
                    <Text style={styles.searchResultTitle}>
                      {result.searchType === 'event' ? result.title :
                       result.searchType === 'cafe' ? result.name :
                       result.name || result.place_name}
                    </Text>
                    <Text style={styles.searchResultSubtitle} numberOfLines={1}>
                      {result.searchType === 'event' ? result.location :
                       result.searchType === 'cafe' ? result.address :
                       result.address || result.address_name || result.road_address_name}
                    </Text>
                    {result.searchType === 'place' && result.category && (
                      <Text style={styles.searchResultCategory}>{result.category}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* 토글 버튼 */}
        {!isSearchMode && (
          <View style={[styles.toggleContainer, { top: insets.top + 77 }]}>
          <TouchableOpacity
            style={[styles.toggleButton, activeToggle === 'events' && styles.toggleButtonActive]}
            onPress={() => handleToggleChange('events')}
          >
            <Text style={[styles.toggleText, activeToggle === 'events' && styles.toggleTextActive]}>
              러닝모임
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, activeToggle === 'cafes' && styles.toggleButtonActive]}
            onPress={() => handleToggleChange('cafes')}
          >
            <Text style={[styles.toggleText, activeToggle === 'cafes' && styles.toggleTextActive]}>
              러닝카페
            </Text>
          </TouchableOpacity>
          </View>
        )}
        
        {!isSearchMode && (
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
        )}
        
        {/* Bottom Sheet */}
        {!isSearchMode && (
          <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
          enablePanDownToClose={false}
          backgroundStyle={styles.bottomSheetBackground}
          handleIndicatorStyle={styles.bottomSheetIndicator}
        >
          <BottomSheetView style={styles.bottomSheetContent}>
            {activeToggle === 'events' && selectedEvent ? (
              // 모임 상세 화면
              <View style={styles.bottomSheetBody}>
                <EventDetailScreen
                  route={{
                    params: {
                      event: selectedEvent,
                      isJoined: false,
                      returnToScreen: 'MapScreen'
                    }
                  }}
                  navigation={{
                    ...navigation,
                    goBack: handleCloseEventDetail
                  }}
                />
              </View>
            ) : activeToggle === 'cafes' && selectedCafe ? (
              // 카페 상세 화면
              <BottomSheetScrollView style={styles.bottomSheetBody}>
                <View style={styles.cafeDetailContainer}>
                  <View style={styles.cafeDetailHeader}>
                    <Text style={styles.cafeDetailName}>{selectedCafe.name || '카페'}</Text>
                    <TouchableOpacity
                      onPress={handleCloseCafeDetail}
                      style={styles.cafeDetailCloseButton}
                    >
                      <Ionicons name="close" size={24} color={COLORS.SECONDARY} />
                    </TouchableOpacity>
                  </View>
                  
                  {/* 카페 이미지 슬라이드 */}
                  {selectedCafe.images && selectedCafe.images.length > 0 && (
                    <ScrollView
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      style={styles.cafeImageSlider}
                    >
                      {selectedCafe.images.map((imageUri, index) => (
                        <Image
                          key={index}
                          source={{ uri: imageUri }}
                          style={styles.cafeDetailImage}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                  )}
                  
                  {/* 카페 설명 */}
                  {selectedCafe.description && (
                    <View style={styles.cafeDetailSection}>
                      <Text style={styles.cafeDetailSectionTitle}>소개</Text>
                      <Text style={styles.cafeDetailText}>{selectedCafe.description}</Text>
                    </View>
                  )}
                  
                  {/* 러닝인증 혜택 */}
                  {selectedCafe.runningCertificationBenefit && (
                    <View style={styles.cafeDetailSection}>
                      <Text style={styles.cafeDetailSectionTitle}>러닝인증 혜택</Text>
                      <View style={styles.cafeBenefit}>
                        <Ionicons name="gift" size={18} color={COLORS.PRIMARY} />
                        <Text style={styles.cafeBenefitText}>
                          {selectedCafe.runningCertificationBenefit}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {/* 주소 */}
                  {selectedCafe.address && (
                    <View style={styles.cafeDetailSection}>
                      <Text style={styles.cafeDetailSectionTitle}>주소</Text>
                      <Text style={styles.cafeDetailText}>{selectedCafe.address}</Text>
                    </View>
                  )}
                  
                  {/* 운영시간 */}
                  {selectedCafe.operatingHours && (
                    <View style={styles.cafeDetailSection}>
                      <Text style={styles.cafeDetailSectionTitle}>운영시간</Text>
                      {Object.entries(selectedCafe.operatingHours).map(([day, hours]) => (
                        <View key={day} style={styles.operatingHoursRow}>
                          <Text style={styles.operatingHoursDay}>{day}</Text>
                          <Text style={styles.operatingHoursTime}>
                            {hours ? `${hours.open} - ${hours.close}` : '휴무'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </BottomSheetScrollView>
            ) : (
              // 모임 목록 화면
              <>
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>
                    {activeToggle === 'events' ? '러닝모임' : '러닝카페'}
                  </Text>
                </View>
                {activeToggle === 'events' && (
                  <>
                    {/* 검색바 */}
                    <View style={styles.searchContainer}>
                      <Ionicons name="search" size={20} color={COLORS.SECONDARY} style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="모임 제목, 태그로 검색..."
                        placeholderTextColor={COLORS.SECONDARY}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {searchQuery.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setSearchQuery('')}
                          style={styles.clearButton}
                        >
                          <Ionicons name="close-circle" size={20} color={COLORS.SECONDARY} />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {/* 모임 목록 */}
                    <BottomSheetScrollView style={styles.bottomSheetBody}>
                      {filteredEvents.length > 0 ? (
                        filteredEvents.map((event, index) => (
                          <TouchableOpacity
                            key={event.id || index}
                            onPress={() => handleEventClick(event)}
                            style={styles.eventCardContainer}
                          >
                            <MeetingCard
                              meeting={event}
                              onClose={() => {}}
                              onJoin={() => handleEventClick(event)}
                            />
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={styles.emptyContainer}>
                          <Text style={styles.emptyText}>
                            {searchQuery.trim() 
                              ? '검색 결과가 없습니다'
                              : '주변에 러닝모임이 없습니다'}
                          </Text>
                        </View>
                      )}
                    </BottomSheetScrollView>
                  </>
                )}
                {activeToggle === 'cafes' && (
                  <>
                    {/* 검색바 */}
                    <View style={styles.searchContainer}>
                      <Ionicons name="search" size={20} color={COLORS.SECONDARY} style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="카페 상호명으로 검색..."
                        placeholderTextColor={COLORS.SECONDARY}
                        value={cafeSearchQuery}
                        onChangeText={setCafeSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {cafeSearchQuery.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setCafeSearchQuery('')}
                          style={styles.clearButton}
                        >
                          <Ionicons name="close-circle" size={20} color={COLORS.SECONDARY} />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {/* 카페 목록 */}
                    <BottomSheetScrollView style={styles.bottomSheetBody}>
                      {filteredCafes.length > 0 ? (
                        filteredCafes.map((cafe, index) => (
                          <TouchableOpacity
                            key={cafe.id || index}
                            onPress={() => handleCafeClick(cafe)}
                            style={styles.cafeCardContainer}
                          >
                            <View style={styles.cafeCard}>
                              {/* 카페 이미지 */}
                              {cafe.images && cafe.images.length > 0 && (
                                <Image
                                  source={{ uri: cafe.images[0] }}
                                  style={styles.cafeImage}
                                  resizeMode="cover"
                                />
                              )}
                              <View style={styles.cafeCardContent}>
                                <Text style={styles.cafeName}>{cafe.name || '카페'}</Text>
                                {cafe.description && (
                                  <Text style={styles.cafeDescription} numberOfLines={2}>
                                    {cafe.description}
                                  </Text>
                                )}
                                {cafe.runningCertificationBenefit && (
                                  <View style={styles.cafeBenefit}>
                                    <Ionicons name="gift" size={14} color={COLORS.PRIMARY} />
                                    <Text style={styles.cafeBenefitText}>
                                      {cafe.runningCertificationBenefit}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={styles.emptyContainer}>
                          <Text style={styles.emptyText}>
                            {cafeSearchQuery.trim() 
                              ? '검색 결과가 없습니다'
                              : '주변에 러닝카페가 없습니다'}
                          </Text>
                        </View>
                      )}
                    </BottomSheetScrollView>
                  </>
                )}
              </>
            )}
          </BottomSheetView>
          </BottomSheet>
        )}
      </View>
    </GestureHandlerRootView>
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
  toggleContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    gap: 8,
    zIndex: 201,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  toggleButton: {
    backgroundColor: 'rgba(31, 31, 36, 0.95)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    // iOS 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    // Android 그림자
    elevation: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#3AF8FF',
    // iOS 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    // Android 그림자
    elevation: 8,
  },
  toggleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
  },
  bottomSheetBackground: {
    backgroundColor: '#1F1F24', // COLORS.SURFACE
    // iOS 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    // Android 그림자
    elevation: 8,
  },
  bottomSheetIndicator: {
    backgroundColor: '#666666',
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bottomSheetHeader: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  bottomSheetTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  bottomSheetBody: {
    flex: 1,
    paddingTop: 16,
  },
  bottomSheetPlaceholder: {
    color: '#999999',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171719',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  eventCardContainer: {
    marginBottom: 12,
    marginHorizontal: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#999999',
    fontSize: 14,
  },
  cafeCardContainer: {
    marginBottom: 12,
    marginHorizontal: 20,
  },
  cafeCard: {
    backgroundColor: '#171719',
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cafeImage: {
    width: 100,
    height: 100,
    backgroundColor: '#333333',
  },
  cafeCardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cafeName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cafeDescription: {
    color: '#999999',
    fontSize: 12,
    marginBottom: 8,
  },
  cafeBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cafeBenefitText: {
    color: '#3AF8FF', // COLORS.PRIMARY
    fontSize: 12,
    marginLeft: 4,
  },
  cafeDetailContainer: {
    padding: 20,
  },
  cafeDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cafeDetailName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  cafeDetailCloseButton: {
    padding: 4,
  },
  cafeImageSlider: {
    marginBottom: 20,
  },
  cafeDetailImage: {
    width: 335,
    height: 200,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#333333',
  },
  cafeDetailSection: {
    marginBottom: 20,
  },
  cafeDetailSectionTitle: {
    color: '#3AF8FF', // COLORS.PRIMARY
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  cafeDetailText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  operatingHoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  operatingHoursDay: {
    color: '#999999',
    fontSize: 14,
  },
  operatingHoursTime: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  mapSearchWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 200,
  },
  mapSearchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 31, 36, 0.95)',
    borderRadius: 26,
    paddingHorizontal: 16,
    height: 52,
    // iOS 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
    // Android 그림자
    elevation: 8,
  },
  mapSearchIcon: {
    marginRight: 10,
  },
  mapSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  currentLocationButton: {
    height: 52,
    borderRadius: 26,
    // overflow는 width가 0일 때만 필요하므로 조건부로 처리하지 않음
    // 그림자가 보이도록 overflow 제거
  },
  currentLocationButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(31, 31, 36, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    // iOS 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
    // Android 그림자
    elevation: 8,
  },
  currentLocationIcon: {
    width: 30,
    height: 30,
    // 아이콘 위치 수동 조절을 위한 속성 (필요시 조정)
    marginTop: 5, // 위로 이동하려면 음수 값 (예: -2)
    marginLeft: -2, // 오른쪽으로 이동하려면 양수 값 (예: 1)
  },
  mapSearchLoading: {
    marginLeft: 8,
  },
  mapSearchClearButton: {
    marginLeft: 8,
    padding: 4,
  },
  searchResultsDropdown: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(31, 31, 36, 0.95)',
    borderRadius: 8,
    maxHeight: 300,
    zIndex: 199,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  searchResultsList: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  searchResultIcon: {
    marginRight: 12,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  searchResultSubtitle: {
    color: '#999999',
    fontSize: 12,
  },
  searchResultCategory: {
    color: '#666666',
    fontSize: 11,
    marginTop: 2,
  },
  // 검색 전용 화면 스타일
  searchModeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 300,
  },
  searchModeHeader: {
    backgroundColor: '#1F1F24',
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  searchModeSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 31, 36, 0.95)',
    borderRadius: 26,
    paddingHorizontal: 16,
    height: 52,
    marginTop: 10,
    borderWidth: 0.5,
    borderColor: '#FFFFFF',
  },
  searchModeBackButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchModeInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  searchModeLoading: {
    marginLeft: 8,
  },
  searchModeClearButton: {
    marginLeft: 8,
    padding: 4,
  },
  searchModeResultsList: {
    flex: 1,
    paddingTop: 16,
  },
  searchModeResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchModeResultIcon: {
    marginRight: 12,
  },
  searchModeResultContent: {
    flex: 1,
  },
  searchModeResultTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  searchModeResultSubtitle: {
    color: '#999999',
    fontSize: 14,
  },
  searchModeResultCategory: {
    color: '#3AF8FF',
    fontSize: 12,
    marginTop: 4,
  },
  searchModeEmptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchModeEmptyText: {
    color: '#999999',
    fontSize: 14,
  },
  searchBackButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
});

export default MapScreen;
