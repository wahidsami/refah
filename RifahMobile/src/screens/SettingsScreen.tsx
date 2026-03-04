import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { api, User } from '../api/client';
import { Ionicons } from '@expo/vector-icons';

const SECTION_HEADER = { marginTop: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: spacing.lg };

export function SettingsScreen() {
    const navigation = useNavigation<any>();
    const { t, language, setLanguage } = useLanguage();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState<string | null>(null);

    const loadUser = useCallback(async () => {
        try {
            const isAuth = await api.isAuthenticated();
            if (!isAuth) {
                setUser(await api.getUser());
                return;
            }
            const { user: profileUser } = await api.getProfile();
            setUser(profileUser);
        } catch {
            setUser(await api.getUser());
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { loadUser(); }, [loadUser]));

    const prefs = user?.notificationPreferences ?? { email: true, sms: true, push: true, whatsapp: true };
    const pushOn = prefs.push !== false;
    const emailOn = prefs.email !== false;
    const smsOn = prefs.sms !== false;
    const whatsappOn = prefs.whatsapp !== false;

    const onLanguageChange = async (lang: 'ar' | 'en') => {
        setSyncing('language');
        try {
            await setLanguage(lang);
            if (user) {
                const { user: updated } = await api.updateProfile({ preferredLanguage: lang });
                setUser(updated);
                if (updated) await api.setUser(updated);
            }
        } finally {
            setSyncing(null);
        }
    };

    const onNotificationToggle = async (key: 'push' | 'email' | 'sms' | 'whatsapp', value: boolean) => {
        if (!user) return;
        setSyncing(key);
        try {
            const next = { ...prefs, [key]: value };
            const { user: updated } = await api.updateProfile({ notificationPreferences: next });
            setUser(updated);
            if (updated) await api.setUser(updated);
        } catch {
            // keep previous state on error
        } finally {
            setSyncing(null);
        }
    };

    const handlePlaceholder = (title: string) => () => Alert.alert(title, t('comingSoon') || 'Coming soon.');

    const version = Constants.expoConfig?.version ?? '1.0.0';

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('settings')}</Text>
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.sectionTitle, SECTION_HEADER]}>{t('account') || 'Account'}</Text>
                <View style={styles.sectionBlock}>
                    <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ChangePassword')}>
                        <Text style={styles.rowLabel}>{t('changePassword') || 'Change password'}</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, SECTION_HEADER]}>{t('preferences') || 'Preferences'}</Text>
                <View style={styles.sectionBlock}>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>{t('language') || 'Language'}</Text>
                        <View style={styles.langRow}>
                            <TouchableOpacity style={[styles.langBtn, language === 'en' && styles.langBtnActive]} onPress={() => onLanguageChange('en')} disabled={syncing === 'language'}>
                                <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>EN</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.langBtn, language === 'ar' && styles.langBtnActive]} onPress={() => onLanguageChange('ar')} disabled={syncing === 'language'}>
                                <Text style={[styles.langBtnText, language === 'ar' && styles.langBtnTextActive]}>AR</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={[styles.row, styles.rowBorder]}>
                        <Text style={styles.rowLabel}>{t('pushNotifications')}</Text>
                        <Switch value={pushOn} onValueChange={(v) => onNotificationToggle('push', v)} disabled={syncing === 'push'} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" />
                    </View>
                    <View style={[styles.row, styles.rowBorder]}>
                        <Text style={styles.rowLabel}>{t('emailNotifications') || 'Email notifications'}</Text>
                        <Switch value={emailOn} onValueChange={(v) => onNotificationToggle('email', v)} disabled={syncing === 'email'} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" />
                    </View>
                    <View style={[styles.row, styles.rowBorderLast]}>
                        <Text style={styles.rowLabel}>{t('smsNotifications') || 'SMS notifications'}</Text>
                        <Switch value={smsOn} onValueChange={(v) => onNotificationToggle('sms', v)} disabled={syncing === 'sms'} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" />
                    </View>
                    {/* WhatsApp notifications: uncomment when service is available
                    <View style={[styles.row, styles.rowBorderLast]}>
                        <Text style={styles.rowLabel}>{t('whatsappNotifications')}</Text>
                        <Switch value={whatsappOn} onValueChange={(v) => onNotificationToggle('whatsapp', v)} disabled={syncing === 'whatsapp'} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" />
                    </View>
                    */}
                </View>

                <Text style={[styles.sectionTitle, SECTION_HEADER]}>{t('support') || 'Support'}</Text>
                <View style={styles.sectionBlock}>
                    <TouchableOpacity style={styles.row} onPress={handlePlaceholder(t('helpAndContact') || 'Help & Contact')}>
                        <Text style={styles.rowLabel}>{t('helpAndContact') || 'Help & Contact'}</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.row, styles.rowBorderLast]} onPress={() => navigation.navigate('FAQ')}>
                        <Text style={styles.rowLabel}>{t('faq') || 'FAQ'}</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, SECTION_HEADER]}>{t('about') || 'About'}</Text>
                <View style={styles.sectionBlock}>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>{t('version') || 'Version'}</Text>
                        <Text style={styles.rowValue}>{version}</Text>
                    </View>
                    <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={() => navigation.navigate('Terms')}>
                        <Text style={styles.rowLabel}>{t('termsOfService') || 'Terms of Service'}</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.row, styles.rowBorderLast]} onPress={() => navigation.navigate('PrivacyPolicy')}>
                        <Text style={styles.rowLabel}>{t('privacyPolicy') || 'Privacy Policy'}</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
                <View style={{ height: spacing.xl * 2 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, paddingTop: spacing.xl + 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { padding: spacing.sm, marginRight: spacing.sm },
    headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: spacing.xl },
    sectionTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
    sectionBlock: { backgroundColor: '#FFFFFF', marginHorizontal: spacing.lg, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    rowBorderLast: { borderTopWidth: 1, borderTopColor: colors.border },
    rowLabel: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
    rowValue: { fontSize: fontSize.sm, color: colors.textSecondary },
    langRow: { flexDirection: 'row', gap: spacing.sm },
    langBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8, backgroundColor: colors.backgroundGray },
    langBtnActive: { backgroundColor: colors.primary },
    langBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
    langBtnTextActive: { color: '#FFFFFF' },
});
