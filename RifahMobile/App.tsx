import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import * as Linking from 'expo-linking';
import * as Font from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SplashScreen } from './src/screens/SplashScreen';
import { LanguageSelection } from './src/screens/LanguageSelection';
import { OnboardingScreens } from './src/screens/OnboardingScreens';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { CartProvider } from './src/contexts/CartContext';
import { getLanguage } from './src/utils/language';
import { hasCompletedOnboarding, markOnboardingComplete } from './src/utils/onboarding';
import { colors } from './src/theme/colors';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { LogoutContext } from './src/contexts/LogoutContext';

type AppScreen = 'splash' | 'language' | 'onboarding' | 'welcome' | 'login' | 'register' | 'forgotPassword' | 'resetPassword' | 'home';

// Load Cairo fonts (with timeout so app doesn't hang on slow/tunnel connections)
const loadFonts = async (): Promise<boolean> => {
  try {
    await Promise.race([
      Font.loadAsync({
        'Cairo-Regular': require('./assets/fonts/Cairo-Regular.ttf'),
        'Cairo-Light': require('./assets/fonts/Cairo-Light.ttf'),
        'Cairo-Medium': require('./assets/fonts/Cairo-Medium.ttf'),
        'Cairo-SemiBold': require('./assets/fonts/Cairo-SemiBold.ttf'),
        'Cairo-Bold': require('./assets/fonts/Cairo-Bold.ttf'),
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Font load timeout')), 15000)),
    ]);
    const DefaultText = Text as any;
    if (DefaultText.defaultProps == null) DefaultText.defaultProps = {};
    DefaultText.defaultProps.style = { fontFamily: 'Cairo-Regular' };
    return true;
  } catch (e) {
    console.warn('Font load failed, using system font:', e);
    return false;
  }
};

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('splash');
  const [pendingReset, setPendingReset] = useState<{ token: string; email: string } | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const { setLanguage } = useLanguage();
  const navigationRef = useRef<any>(null);

  const handleResetPasswordUrl = (url: string | null) => {
    if (!url) return;
    const parsed = Linking.parse(url);
    const path = (parsed.path || '').replace(/^\/+/, '');
    const token = parsed.queryParams?.token;
    const email = parsed.queryParams?.email;
    if (path === 'reset-password' && token && email) {
      setPendingReset({
        token: String(token),
        email: String(email),
      });
      setCurrentScreen('resetPassword');
    }
  };

  useEffect(() => {
    const init = async () => {
      // DEVELOPMENT ONLY: clear storage to reset app to "First Run" state. Disabled for production.
      if (__DEV__ && false) {
        await AsyncStorage.clear();
      }
      await loadFontsAndLanguage();
      const initialUrl = await Linking.getInitialURL();
      handleResetPasswordUrl(initialUrl);
    };
    init();
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener('url', (e) => handleResetPasswordUrl(e.url));
    return () => sub.remove();
  }, []);

  const loadFontsAndLanguage = async () => {
    try {
      await loadFonts();
    } finally {
      setFontsLoaded(true);
    }
    await checkAppState();
  };

  const checkAppState = async () => {
    const savedLanguage = await getLanguage();
    console.log("APP INIT - Saved Language:", savedLanguage);
    if (savedLanguage) {
      await setLanguage(savedLanguage);
    }
  };

  const handleSplashFinish = async () => {
    const savedLanguage = await getLanguage();
    const onboardingCompleted = await hasCompletedOnboarding();

    console.log("SPLASH FINISH - savedLanguage:", savedLanguage);
    console.log("SPLASH FINISH - onboardingCompleted:", onboardingCompleted);

    if (!savedLanguage) {
      console.log("SPLASH FINISH -> NAV to Language");
      setCurrentScreen('language');
    } else if (!onboardingCompleted) {
      console.log("SPLASH FINISH -> NAV to Onboarding");
      setCurrentScreen('onboarding');
    } else {
      console.log("SPLASH FINISH -> NAV to Welcome");
      setCurrentScreen('welcome');
    }
  };

  const handleLanguageSelect = async (language: 'ar' | 'en') => {
    await setLanguage(language); // Use context's setLanguage instead
    setCurrentScreen('onboarding');
  };

  const handleOnboardingComplete = async () => {
    await markOnboardingComplete();
    setCurrentScreen('welcome');
  };

  const handleLoginSuccess = () => {
    setCurrentScreen('home');
  };

  const handleRegisterSuccess = () => {
    setCurrentScreen('home');
  };

  // Show nothing while fonts are loading
  if (!fontsLoaded) {
    return null;
  }

  if (currentScreen === 'splash') {
    return <><SplashScreen onFinish={handleSplashFinish} /><StatusBar style="light" /></>;
  }

  if (currentScreen === 'language') {
    return <><LanguageSelection onLanguageSelect={handleLanguageSelect} /><StatusBar style="dark" /></>;
  }

  if (currentScreen === 'onboarding') {
    return (
      <>
        <OnboardingScreens
          onComplete={handleOnboardingComplete}
          onBackToLanguage={() => setCurrentScreen('language')}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (currentScreen === 'welcome') {
    return (
      <>
        <WelcomeScreen
          onLogin={() => setCurrentScreen('login')}
          onRegister={() => setCurrentScreen('register')}
          onGuest={() => setCurrentScreen('home')}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (currentScreen === 'login') {
    return (
      <>
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onBackToWelcome={() => setCurrentScreen('welcome')}
          onGoToRegister={() => setCurrentScreen('register')}
          onGoToForgotPassword={() => setCurrentScreen('forgotPassword')}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (currentScreen === 'forgotPassword') {
    return (
      <>
        <ForgotPasswordScreen
          onBackToLogin={() => setCurrentScreen('login')}
          onSuccess={() => setCurrentScreen('login')}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (currentScreen === 'resetPassword' && pendingReset) {
    return (
      <>
        <ResetPasswordScreen
          token={pendingReset.token}
          email={pendingReset.email}
          onSuccess={() => {
            setPendingReset(null);
            setCurrentScreen('login');
          }}
          onBackToLogin={() => {
            setPendingReset(null);
            setCurrentScreen('login');
          }}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (currentScreen === 'resetPassword' && !pendingReset) {
    return (
      <>
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onBackToWelcome={() => setCurrentScreen('welcome')}
          onGoToRegister={() => setCurrentScreen('register')}
          onGoToForgotPassword={() => setCurrentScreen('forgotPassword')}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (currentScreen === 'register') {
    return (
      <>
        <RegisterScreen
          onRegisterSuccess={handleRegisterSuccess}
          onBackToWelcome={() => setCurrentScreen('welcome')}
          onGoToLogin={() => setCurrentScreen('login')}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (currentScreen === 'home') {
    return (
      <LogoutContext.Provider value={{ onLogout: () => setCurrentScreen('welcome') }}>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator navigationRef={navigationRef} />
        </NavigationContainer>
      </LogoutContext.Provider>
    );
  }

  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <LanguageProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
});
