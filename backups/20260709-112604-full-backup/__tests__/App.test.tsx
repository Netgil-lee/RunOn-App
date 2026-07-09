// @ts-nocheck
import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

// Expo 및 Firebase 관련 모듈 모킹
jest.mock('expo-web-browser', () => ({}));
jest.mock('expo-auth-session/providers/google', () => ({}));
jest.mock('expo-constants', () => ({}));
jest.mock('expo-modules-core', () => ({
  UnavailabilityError: class {},
}));
jest.mock('../config/firebase', () => ({
  getAuth: jest.fn(() => ({})),
}));

// React Navigation, AuthProvider, useAuth 모킹
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
}));
jest.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: null, initializing: false }),
}));

// NetworkProvider 모킹
jest.mock('../contexts/NetworkContext', () => ({
  NetworkProvider: ({ children }) => children,
  useNetwork: () => ({ isOnline: true, error: null }),
}));

// @react-navigation/stack 모킹
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

describe('App', () => {
  it('renders correctly', () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId('app-root')).toBeTruthy();
  });
}); 