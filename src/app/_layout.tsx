import { DarkTheme, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppTabs from '@/components/app-tabs';
import { DATABASE_NAME, initDb } from '@/db/schema';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Always-dark app: fixed theme regardless of the system scheme.
  // GestureHandlerRootView must wrap everything for native-thread gestures.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDb}>
          <AppTabs />
        </SQLiteProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
