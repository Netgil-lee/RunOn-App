import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import * as Progress from 'react-native-progress';
import { useAuth } from '../contexts/AuthContext';

const SplashScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const exitAnim = useRef(new Animated.Value(1)).current; // 종료 애니메이션용
  const [progress, setProgress] = useState(0);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  
  const { initializing } = useAuth();

  useEffect(() => {

    
    // Fade-in + Scale 애니메이션
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
    ]).start(() => {
      
    });

    // 프로그레스 바 애니메이션
    let startTime = Date.now();
    const duration = 2000; // 2초

    const updateProgress = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const newProgress = Math.min(elapsed / duration, 1);
      
      setProgress(newProgress);

      if (newProgress < 1) {
        requestAnimationFrame(updateProgress);
      } else {

      }
    };

    requestAnimationFrame(updateProgress);

    // 컴포넌트 언마운트 시 정리
    return () => {
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();
      exitAnim.stopAnimation();
    };
  }, [fadeAnim, scaleAnim, exitAnim]);

  // AuthContext 초기화 완료 감지
  useEffect(() => {
    if (!initializing && progress >= 1 && !isAnimatingOut) {
      setIsAnimatingOut(true);
      
      
      // 자연스러운 fade-out 애니메이션
      Animated.parallel([
        Animated.timing(exitAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
      ]).start(() => {
        
      });
    }
  }, [initializing, progress, isAnimatingOut, exitAnim, scaleAnim]);

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: exitAnim,
        }
      ]}
    >
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image 
          source={require('../assets/logo.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.progressContainer}>
        <Text style={styles.subtitle}>너와 나의 러닝 커뮤니티</Text>
        <Progress.Bar
          progress={progress}
          width={200}
          height={4}
          color="#3AF8FF"
          unfilledColor="rgba(255, 255, 255, 0.1)"
          borderWidth={0}
          style={styles.progressBar}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 0,
  },
  logoImage: {
    width: 250,
    height: 65,
    marginBottom: 0,
    backgroundColor: 'transparent',
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 1,
    fontFamily: 'Pretendard-Regular',
    marginBottom: 20,
    textAlign: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  progressBar: {
    borderRadius: 2,
  },
});

export default SplashScreen; 