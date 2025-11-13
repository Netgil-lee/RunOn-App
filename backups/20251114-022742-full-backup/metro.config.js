const { getDefaultConfig } = require('@expo/metro-config');
const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.sourceExts.push('cjs');

// This is the new line you should add in, after the previous lines
defaultConfig.resolver.unstable_enablePackageExports = false;

// 에셋 해결을 위한 설정 추가
defaultConfig.resolver.assetExts.push('png', 'jpg', 'jpeg', 'gif');
defaultConfig.resolver.sourceExts.push('js', 'jsx', 'ts', 'tsx');

module.exports = defaultConfig;