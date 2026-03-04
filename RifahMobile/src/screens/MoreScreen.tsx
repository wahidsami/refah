import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize, borderRadius } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { useLogout } from '../contexts/LogoutContext';
import { api, getImageUrl, User } from '../api/client';

interface MoreScreenProps {
    navigation?: any;
}

export function MoreScreen({ navigation }: MoreScreenProps) {
    const { t } = useLanguage();
    const logoutContext = useLogout();
    const [user, setUser] = useState<User | null>(null);

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            (async () => {
                try {
                    const isAuth = await api.isAuthenticated();
                    if (!isAuth) {
                        if (!cancelled) setUser(await api.getUser());
                        return;
                    }
                    const { user: profileUser } = await api.getProfile();
                    if (!cancelled) setUser(profileUser);
                } catch {
                    if (!cancelled) setUser(await api.getUser());
                }
            })();
            return () => { cancelled = true; };
        }, [])
    );

    const menuItems = [
        { id: 'notifications', icon: '🔔', label: t('notifications') || 'Notifications', route: 'Notifications' },
        { id: 'profile', icon: '👤', label: t('profile'), route: 'Profile' },
        { id: 'myAppointments', icon: '📅', label: t('myAppointments'), route: 'AppointmentsTab' },
        { id: 'myPurchases', icon: '🛍️', label: t('myPurchases'), route: 'MyPurchases' },
        { id: 'payments', icon: '💳', label: t('payments'), route: 'Payments' },
        { id: 'settings', icon: '⚙️', label: t('settings'), route: 'Settings' },
        { id: 'about', icon: '💜', label: t('aboutRefah'), route: 'About' },
    ];

    const handleLogout = async () => {
        Alert.alert(
            t('logout') || 'Logout',
            t('logoutConfirm') || 'Are you sure you want to log out?',
            [
                { text: t('cancel') || 'Cancel', style: 'cancel' },
                {
                    text: t('logout') || 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await api.clearTokens();
                        logoutContext?.onLogout();
                    },
                },
            ]
        );
    };

    const handleMenuPress = (item: (typeof menuItems)[0]) => {
        if (item.route === 'AppointmentsTab') {
            navigation?.navigate('Tabs', { screen: 'Appointments' });
            return;
        }
        if (item.route === 'Settings') {
            navigation?.navigate('Settings');
            return;
        }
        if (item.route === 'Payments') {
            navigation?.navigate('PaymentHistory');
            return;
        }
        if (item.route === 'About') {
            navigation?.navigate('AboutRefah');
            return;
        }
        if (['Profile', 'MyPurchases', 'Notifications'].includes(item.route)) {
            navigation?.navigate(item.route);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    {user?.profileImage ? (
                        <Image source={{ uri: getImageUrl(user.profileImage) }} style={styles.avatarImage} />
                    ) : (
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user ? (user.firstName?.charAt(0)?.toUpperCase() || 'U') : 'U'}
                            </Text>
                        </View>
                    )}
                    <View style={styles.userTextWrap}>
                        <Text style={styles.userName} numberOfLines={1}>
                            {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || t('profile') : (t('guestTitle') || 'Guest')}
                        </Text>
                        <Text style={styles.userEmail} numberOfLines={1}>
                            {user?.email || (t('welcome') || 'Welcome to Refah')}
                        </Text>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.content}>
                {/* Menu Items */}
                <View style={styles.menuSection}>
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.menuItem}
                            onPress={() => handleMenuPress(item)}
                        >
                            <View style={styles.menuItemLeft}>
                                <Text style={styles.menuIcon}>{item.icon}</Text>
                                <Text style={styles.menuLabel}>{item.label}</Text>
                            </View>
                            <Text style={styles.menuArrow}>›</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Booking reminders info */}
                <View style={styles.reminderSection}>
                    <Text style={styles.reminderSectionTitle}>
                        {t('bookingReminders') || 'Booking reminders'}
                    </Text>
                    <Text style={styles.reminderSectionText}>
                        {t('bookingRemindersDescription') || 'Turn on "Notify me before this appointment" from each appointment\'s detail screen to get a reminder (with sound) before your visit.'}
                    </Text>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutIcon}>🚪</Text>
                    <Text style={styles.logoutText}>{t('logout')}</Text>
                </TouchableOpacity>

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Text style={styles.appInfoText}>Refah v1.0.0</Text>
                    <Text style={styles.appInfoText}>© 2024 Refah Platform</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        backgroundColor: colors.primary,
        padding: spacing.xl,
        paddingTop: spacing.xl + 20,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: fontSize.xxl,
        fontWeight: '700',
        color: colors.primary,
    },
    avatarImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    userTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    userName: {
        fontSize: fontSize.lg,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: fontSize.sm,
        color: '#FFFFFF',
        opacity: 0.9,
    },
    content: {
        flex: 1,
    },
    menuSection: {
        backgroundColor: '#FFFFFF',
        marginTop: spacing.md,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    menuIcon: {
        fontSize: 24,
    },
    menuLabel: {
        fontSize: fontSize.md,
        color: colors.text,
        fontWeight: '500',
    },
    menuArrow: {
        fontSize: 24,
        color: colors.textSecondary,
    },
    reminderSection: {
        backgroundColor: '#FFFFFF',
        marginTop: spacing.md,
        padding: spacing.lg,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    reminderSectionTitle: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    reminderSectionText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: '#FEE2E2',
        marginHorizontal: spacing.lg,
        marginTop: spacing.xl,
        padding: spacing.lg,
        borderRadius: 12,
    },
    logoutIcon: {
        fontSize: 20,
    },
    logoutText: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: '#DC2626',
    },
    appInfo: {
        alignItems: 'center',
        padding: spacing.xl,
        gap: 4,
    },
    appInfoText: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
    },
});
