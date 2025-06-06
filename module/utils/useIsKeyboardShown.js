"use strict";

import * as React from 'react';
import { Keyboard, Platform } from 'react-native';
export function useIsKeyboardShown() {
  const [isKeyboardShown, setIsKeyboardShown] = React.useState(false);
  React.useEffect(() => {
    const handleKeyboardShow = () => setIsKeyboardShown(true);
    const handleKeyboardHide = () => setIsKeyboardShown(false);
    let subscriptions;
    if (Platform.OS === 'ios') {
      subscriptions = [Keyboard.addListener('keyboardWillShow', handleKeyboardShow), Keyboard.addListener('keyboardWillHide', handleKeyboardHide)];
    } else {
      subscriptions = [Keyboard.addListener('keyboardDidShow', handleKeyboardShow), Keyboard.addListener('keyboardDidHide', handleKeyboardHide)];
    }
    return () => {
      subscriptions.forEach(s => s.remove());
    };
  }, []);
  return isKeyboardShown;
}
//# sourceMappingURL=useIsKeyboardShown.js.map