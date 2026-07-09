import React, { createContext, useState, useContext, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

const NetworkContext = createContext({
  isOnline: true,
  error: null
});

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = isOnline;
      const isNowOnline = state.isConnected;
      
      setIsOnline(isNowOnline);
      
      if (!isNowOnline) {
        console.warn('네트워크 연결이 끊어졌습니다.');
        setError('인터넷 연결을 확인해주세요.');
      } else if (!wasOnline && isNowOnline) {
        console.info('네트워크 연결이 복구되었습니다.');
        setError(null);
      }
    });

    return () => unsubscribe();
  }, [isOnline]);

  return (
    <NetworkContext.Provider value={{ isOnline, error }}>
      {children}
    </NetworkContext.Provider>
  );
}; 