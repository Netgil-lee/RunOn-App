import React from 'react';
import { Text } from 'react-native';

const CustomText = ({ style, children, ...props }) => {
  return (
    <Text 
      style={[
        { fontFamily: 'Pretendard-Regular' },
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
};

export default CustomText; 