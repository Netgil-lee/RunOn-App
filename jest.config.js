module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native-community|@react-navigation|expo|expo-auth-session|expo-web-browser|expo-constants)',
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  // backups/ 안의 사본은 루트와 이름이 겹쳐 haste 충돌·중복 테스트를 만든다
  // (프로젝트 경로에 괄호가 있어 <rootDir>를 쓰면 정규식 그룹으로 해석되므로 경로 조각만 쓴다)
  modulePathIgnorePatterns: ['/backups/'],
  testPathIgnorePatterns: ['/node_modules/', '/backups/'],
}; 