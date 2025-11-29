/**
 * Doomless AI App
 * Offline AI-powered fact learning app
 *
 * @format
 */

import { StatusBar, useColorScheme } from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { TestScreen } from './src/components/TestScreen';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <TestScreen />
    </SafeAreaProvider>
  );
}

export default App;
