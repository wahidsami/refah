import React from 'react';
import { Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/HomeScreen';
import { BookingsScreen } from '../screens/BookingsScreen';
import { PurchasesScreen } from '../screens/PurchasesScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { colors } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';

const Tab = createBottomTabNavigator();

const TAB_BAR_BASE_HEIGHT = 60;
const TAB_BAR_PADDING_BOTTOM = 5;
/** Minimum extra bottom padding so tab bar sits above device nav buttons (e.g. Android 3-button bar) when safe area is 0 */
const MIN_BOTTOM_INSET = Platform.OS === 'android' ? 32 : 0;

export function TabNavigator() {
    const { t, language } = useLanguage();
    const insets = useSafeAreaInsets();
    const bottomInset = Math.max(insets.bottom ?? 0, MIN_BOTTOM_INSET);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: '#E5E7EB',
                    paddingBottom: bottomInset + TAB_BAR_PADDING_BOTTOM,
                    paddingTop: 5,
                    height: TAB_BAR_BASE_HEIGHT + bottomInset,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    fontFamily: language === 'ar' ? 'Cairo-Regular' : undefined,
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarLabel: language === 'ar' ? 'الرئيسية' : 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size, color }}>🏠</Text>
                    ),
                }}
            />
            <Tab.Screen
                name="Appointments"
                component={BookingsScreen}
                options={{
                    tabBarLabel: t('appointments'),
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size, color }}>📅</Text>
                    ),
                }}
            />
            <Tab.Screen
                name="Purchases"
                component={PurchasesScreen}
                options={{
                    tabBarLabel: t('purchases'),
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size, color }}>🛍️</Text>
                    ),
                }}
            />
            <Tab.Screen
                name="Me"
                component={MoreScreen}
                options={{
                    tabBarLabel: t('me'),
                    tabBarIcon: ({ color, size }) => (
                        <Text style={{ fontSize: size, color }}>👤</Text>
                    ),
                }}
            />
        </Tab.Navigator>
    );
}
