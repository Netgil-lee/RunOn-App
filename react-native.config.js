module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts/'],
  // backups 폴더를 빌드에서 제외
  watchFolders: [],
  projectRoot: __dirname,
  // Android 빌드에서 제외할 경로
  android: {
    sourceDir: './android',
    // backups 폴더 제외
    exclude: ['**/backups/**'],
  },
};

