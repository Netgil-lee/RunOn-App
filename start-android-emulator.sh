#!/bin/bash

# Android 에뮬레이터 실행 스크립트

# 환경 변수 설정
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools

# 사용 가능한 에뮬레이터 목록 표시
echo "📱 사용 가능한 에뮬레이터:"
emulator -list-avds

echo ""
echo "🚀 삼성 갤럭시 S25 에뮬레이터 실행 시도..."

# Galaxy S25 에뮬레이터 확인 및 실행
if emulator -list-avds | grep -q "Galaxy_S25\|galaxy_s25"; then
    echo "✅ Galaxy S25 에뮬레이터를 찾았습니다."
    emulator -avd Galaxy_S25 &
elif emulator -list-avds | grep -q "Pixel_9_Pro"; then
    echo "⚠️  Galaxy S25 에뮬레이터가 없습니다. Pixel 9 Pro를 실행합니다 (유사한 스펙)."
    echo "💡 Galaxy S25 에뮬레이터를 생성하려면 Android Studio에서 Device Manager를 열고 Create Device를 클릭하세요."
    emulator -avd Pixel_9_Pro &
else
    echo "⚠️  사용 가능한 에뮬레이터를 찾을 수 없습니다."
    echo "💡 Android Studio에서 에뮬레이터를 생성해주세요."
    echo ""
    echo "사용 가능한 에뮬레이터 목록:"
    emulator -list-avds
    exit 1
fi

echo "⏳ 에뮬레이터가 부팅될 때까지 기다려주세요 (약 1-2분)..."
echo "✅ 에뮬레이터가 실행되면 다음 명령어로 확인하세요:"
echo "   adb devices"

