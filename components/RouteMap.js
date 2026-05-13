import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import Svg, { Polyline } from 'react-native-svg';
import ENV from '../config/environment';

const normalizeCoordinates = (coordinates = []) => (
  (coordinates || [])
    .map((coord) => ({
      latitude: Number(coord?.latitude ?? coord?.lat),
      longitude: Number(coord?.longitude ?? coord?.lng ?? coord?.lon),
    }))
    .filter((coord) => Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude))
);

const RouteMapSvg = ({ coordinates, width, height }) => {
  const minLat = Math.min(...coordinates.map((coord) => coord.latitude));
  const maxLat = Math.max(...coordinates.map((coord) => coord.latitude));
  const minLng = Math.min(...coordinates.map((coord) => coord.longitude));
  const maxLng = Math.max(...coordinates.map((coord) => coord.longitude));
  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;
  const margin = 15;
  const svgWidth = width - (margin * 2);
  const svgHeight = height - (margin * 2);
  const scaleX = svgWidth / Math.max(lngRange, 0.001);
  const scaleY = svgHeight / Math.max(latRange, 0.001);
  const svgCoordinates = coordinates.map((coord) => {
    const x = margin + ((coord.longitude - minLng) * scaleX);
    const y = margin + ((maxLat - coord.latitude) * scaleY);
    return `${x},${y}`;
  }).join(' ');

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={svgCoordinates}
        fill="none"
        stroke="#3AF8FF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

const RouteMap = ({
  coordinates,
  width = 200,
  height = 100,
  provider = 'kakao',
  debugTag = 'route-map',
  showErrorBadge = true,
  disableSvgFallback = false,
}) => {
  const [miniMapStatus, setMiniMapStatus] = useState('loading'); // loading | ready | error
  const [miniMapErrorCode, setMiniMapErrorCode] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [forceSvgFallback, setForceSvgFallback] = useState(false);
  const webViewRef = useRef(null);
  const normalizedCoordinates = useMemo(
    () => normalizeCoordinates(coordinates),
    [coordinates]
  );

  if (normalizedCoordinates.length < 2) {
    return null;
  }
  const useSvgProvider = provider === 'svg' || (forceSvgFallback && !disableSvgFallback);

  const routeData = useMemo(
    () => JSON.stringify(normalizedCoordinates).replace(/</g, '\\u003c'),
    [normalizedCoordinates]
  );

  useEffect(() => {
    setMiniMapStatus('loading');
    setMiniMapErrorCode('');
    setAutoRetryCount(0);
    setForceSvgFallback(false);
  }, [routeData]);

  useEffect(() => {
    if (useSvgProvider || miniMapStatus === 'ready') return undefined;
    const timer = setTimeout(() => {
      if (miniMapStatus === 'ready') return;
      if (autoRetryCount < 1) {
        setAutoRetryCount((prev) => prev + 1);
        setMiniMapStatus('loading');
        setMiniMapErrorCode('');
        setReloadKey((prev) => prev + 1);
        return;
      }
      setMiniMapStatus('error');
      setMiniMapErrorCode((prev) => prev || 'MAP_READY_TIMEOUT');
      if (!disableSvgFallback) {
        setForceSvgFallback(true);
      }
    }, 5500);
    return () => clearTimeout(timer);
  }, [autoRetryCount, miniMapStatus, useSvgProvider, routeData, disableSvgFallback]);

  const kakaoMiniMapHtml = useMemo(() => {
    const kakaoApiKey = ENV.kakaoMapApiKey;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <style>
            html, body, #map {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              background: #101014;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var routeCoordinates = ${routeData};
            var map = null;
            var polyline = null;
            var startMarker = null;
            var endMarker = null;
            var latestBounds = null;

            function postToRN(type, detail) {
              try {
                if (!window.ReactNativeWebView) return;
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: type,
                  detail: detail || ''
                }));
              } catch (e) {}
            }

            function createMarkerImage(fillColor) {
              var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">' +
                '<circle cx="11" cy="11" r="8.5" fill="' + fillColor + '" stroke="#ffffff" stroke-width="2.5" />' +
                '</svg>';
              var imageSrc = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
              return new kakao.maps.MarkerImage(imageSrc, new kakao.maps.Size(22, 22));
            }

            function renderRoute() {
              if (!map || !Array.isArray(routeCoordinates) || routeCoordinates.length < 2) {
                postToRN('MINIMAP_ERROR', 'ROUTE_INVALID');
                return;
              }
              var path = routeCoordinates.map(function(coord) {
                return new kakao.maps.LatLng(coord.latitude, coord.longitude);
              });
              polyline = new kakao.maps.Polyline({
                path: path,
                strokeWeight: 4,
                strokeColor: '#3AF8FF',
                strokeOpacity: 0.9,
                strokeStyle: 'solid'
              });
              polyline.setMap(map);

              startMarker = new kakao.maps.Marker({
                position: path[0],
                image: createMarkerImage('#28C76F')
              });
              startMarker.setMap(map);

              endMarker = new kakao.maps.Marker({
                position: path[path.length - 1],
                image: createMarkerImage('#FF4D4F')
              });
              endMarker.setMap(map);

              var bounds = new kakao.maps.LatLngBounds();
              for (var i = 0; i < path.length; i += 1) {
                bounds.extend(path[i]);
              }
              latestBounds = bounds;
              map.setBounds(bounds, 26, 26, 26, 26);
              function forceRelayout() {
                try {
                  if (!map) return;
                  map.relayout();
                  if (latestBounds) {
                    map.setBounds(latestBounds, 26, 26, 26, 26);
                  }
                } catch (e) {}
              }
              window.__forceRelayoutMiniMap = forceRelayout;
              setTimeout(forceRelayout, 140);
              setTimeout(forceRelayout, 420);
              setTimeout(forceRelayout, 900);
              postToRN('MINIMAP_READY', 'ROUTE_RENDERED');
            }

            function initMap() {
              try {
                if (
                  typeof kakao === 'undefined'
                  || !kakao.maps
                  || typeof kakao.maps.LatLng !== 'function'
                  || typeof kakao.maps.Map !== 'function'
                ) {
                  postToRN('MINIMAP_ERROR', 'KAKAO_NOT_READY');
                  return;
                }
                var first = routeCoordinates[0];
                var center = new kakao.maps.LatLng(first.latitude, first.longitude);
                map = new kakao.maps.Map(document.getElementById('map'), {
                  center: center,
                  level: 5,
                  draggable: false,
                  disableDoubleClickZoom: true,
                  disableDoubleClick: true
                });
                postToRN('MINIMAP_STATUS', 'MAP_INIT_OK');
                renderRoute();
              } catch (e) {
                postToRN('MINIMAP_ERROR', 'MAP_INIT_EXCEPTION:' + (e && e.message ? e.message : 'UNKNOWN'));
              }
            }

            (function loadKakaoSdk() {
              postToRN('MINIMAP_STATUS', 'SDK_LOAD_START');
              try {
                var sdk = document.createElement('script');
                sdk.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&autoload=false';
                sdk.async = true;
                sdk.onload = function() {
                  postToRN('MINIMAP_STATUS', 'SDK_LOAD_OK');
                  try {
                    if (kakao && kakao.maps && typeof kakao.maps.load === 'function') {
                      kakao.maps.load(function() { initMap(); });
                    } else {
                      initMap();
                    }
                  } catch (e) {
                    postToRN('MINIMAP_ERROR', 'KAKAO_LOAD_EXCEPTION:' + (e && e.message ? e.message : 'UNKNOWN'));
                  }
                };
                sdk.onerror = function() {
                  postToRN('MINIMAP_ERROR', 'SDK_LOAD_ERROR');
                };
                document.head.appendChild(sdk);
              } catch (e) {
                postToRN('MINIMAP_ERROR', 'SDK_APPEND_EXCEPTION:' + (e && e.message ? e.message : 'UNKNOWN'));
              }
            })();

            setTimeout(function() {
              if (!map) {
                postToRN('MINIMAP_ERROR', 'MAP_LOAD_TIMEOUT');
              }
            }, 7000);

            window.addEventListener('resize', function() {
              try {
                if (typeof window.__forceRelayoutMiniMap === 'function') {
                  window.__forceRelayoutMiniMap();
                }
              } catch (e) {}
            });
          </script>
        </body>
      </html>
    `;
  }, [routeData]);

  const handleMiniMapMessage = (event) => {
    const rawData = event?.nativeEvent?.data;
    if (!rawData) return;
    try {
      const payload = JSON.parse(rawData);
      const type = payload?.type || 'UNKNOWN';
      const detail = payload?.detail || '';
      console.log(`[MiniMap:${debugTag}]`, type, detail);
      if (type === 'MINIMAP_STATUS' && detail === 'MAP_INIT_OK') {
        setMiniMapStatus('ready');
        setMiniMapErrorCode('');
        return;
      }
      if (type === 'MINIMAP_ERROR') {
        const errorCode = detail || 'UNKNOWN_ERROR';
        if (autoRetryCount < 1) {
          setAutoRetryCount((prev) => prev + 1);
          setMiniMapStatus('loading');
          setMiniMapErrorCode('');
          setReloadKey((prev) => prev + 1);
          return;
        }
        setMiniMapStatus('error');
        setMiniMapErrorCode(errorCode);
        if (!disableSvgFallback) {
          setForceSvgFallback(true);
        }
        return;
      }
      if (type === 'MINIMAP_READY') {
        setMiniMapStatus('ready');
        setMiniMapErrorCode('');
      }
    } catch (error) {
      console.log(`[MiniMap:${debugTag}] RAW`, rawData);
    }
  };

  return (
    <View style={[styles.container, { width, height }]}>
      {useSvgProvider ? (
        <RouteMapSvg coordinates={normalizedCoordinates} width={width} height={height} />
      ) : (
        <>
      <WebView
        key={`kakao-mini-${reloadKey}-${routeData.length}`}
        ref={webViewRef}
        source={{ html: kakaoMiniMapHtml }}
        style={styles.webView}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        scrollEnabled={false}
        bounces={false}
        setSupportMultipleWindows={false}
        onLayout={() => {
          try {
            if (webViewRef.current && typeof webViewRef.current.injectJavaScript === 'function') {
              webViewRef.current.injectJavaScript(`
                try {
                  if (typeof window.__forceRelayoutMiniMap === 'function') {
                    window.__forceRelayoutMiniMap();
                  }
                } catch (e) {}
                true;
              `);
            }
          } catch (e) {}
        }}
        onMessage={handleMiniMapMessage}
        onError={() => {
          if (autoRetryCount < 1) {
            setAutoRetryCount((prev) => prev + 1);
            setMiniMapStatus('loading');
            setMiniMapErrorCode('');
            setReloadKey((prev) => prev + 1);
            return;
          }
          setMiniMapStatus('error');
          setMiniMapErrorCode('WEBVIEW_LOAD_ERROR');
          if (!disableSvgFallback) {
            setForceSvgFallback(true);
          }
        }}
        onContentProcessDidTerminate={() => {
          if (autoRetryCount < 1) {
            setAutoRetryCount((prev) => prev + 1);
            setMiniMapStatus('loading');
            setMiniMapErrorCode('');
            setReloadKey((prev) => prev + 1);
            return;
          }
          setMiniMapStatus('error');
          setMiniMapErrorCode('WEBVIEW_PROCESS_TERMINATED');
          if (!disableSvgFallback) {
            setForceSvgFallback(true);
          }
        }}
      />
      {miniMapStatus === 'loading' && (
        <View style={styles.loadingBadge}>
          <Text style={styles.loadingBadgeText}>지도를 준비중입니다...</Text>
        </View>
      )}
      {!!miniMapErrorCode && showErrorBadge && (
        <View style={styles.errorBadge}>
          <Text style={styles.errorBadgeText}>지도 오류: {miniMapErrorCode}</Text>
          <Text style={styles.retryText} onPress={() => {
            setMiniMapStatus('loading');
            setMiniMapErrorCode('');
            setForceSvgFallback(false);
            setAutoRetryCount(0);
            setReloadKey((prev) => prev + 1);
          }}>
            다시 시도
          </Text>
        </View>
      )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  webView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#101014',
  },
  loadingBadge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,16,20,0.26)',
  },
  loadingBadgeText: {
    color: '#AEB0B7',
    fontSize: 12,
  },
  errorBadge: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.58)',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  errorBadgeText: {
    color: '#F8B4B4',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  retryText: {
    color: '#D7F8FF',
    fontSize: 11,
    textAlign: 'center',
  },
});

export default RouteMap;
