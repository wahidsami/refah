import React, { Component, ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

// Debug: log when bundle runs (shows in Metro terminal when app opens)
console.log('[Refah] Bundle loaded, registering root component');

LogBox.ignoreAllLogs(false);

// Top-level error boundary: shows the REAL error on screen so you can read it in Expo Go
class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[Refah] Caught error:', error?.message, error?.stack);
  }

  render() {
    if (this.state.error) {
      const e = this.state.error;
      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Refah – Error (copy this)</Text>
          <Text style={styles.message}>{e?.message ?? String(e)}</Text>
          {e?.stack ? (
            <Text style={styles.stack} selectable>
              {e.stack}
            </Text>
          ) : null}
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

// Minimal app to test if Expo Go can load anything.
// Set EXPO_PUBLIC_DEBUG_MINIMAL=1 in .env and restart Metro.
function MinimalApp() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#8B5CF6' }}>
      <Text style={{ color: '#fff', fontSize: 24 }}>Hello Expo Go</Text>
      <Text style={{ color: '#fff', marginTop: 8 }}>If you see this, Expo Go works.</Text>
    </View>
  );
}

const useMinimal =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_DEBUG_MINIMAL === '1';

function Root() {
  if (useMinimal) {
    console.log('[Refah] Using minimal debug app');
    return <MinimalApp />;
  }
  // Lazy-load App so import errors are caught by the boundary after first paint
  let App: React.ComponentType<any>;
  try {
    App = require('./App').default;
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
  return <App />;
}

function Entry() {
  return (
    <RootErrorBoundary>
      <Root />
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1f2937' },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: '#f59e0b', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  message: { color: '#fef3c7', fontSize: 14, marginBottom: 12 },
  stack: { color: '#9ca3af', fontSize: 11, fontFamily: 'monospace' },
});

registerRootComponent(Entry);
