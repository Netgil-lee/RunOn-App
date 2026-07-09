import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';
import App from './App';

// 불필요한 경고 메시지 숨기기
LogBox.ignoreLogs([
  'AsyncStorage has been extracted from react-native',
  'Setting a timer for a long period of time',
]);

// Expo용 루트 컴포넌트 등록
registerRootComponent(App);
