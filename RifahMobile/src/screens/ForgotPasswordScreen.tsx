import React, { useState } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize, borderRadius } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../api/client';

export interface ForgotPasswordScreenProps {
    onBackToLogin: () => void;
    onSuccess?: () => void;
}

export function ForgotPasswordScreen({ onBackToLogin, onSuccess }: ForgotPasswordScreenProps) {
    const { t, isRTL } = useLanguage();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSend = async () => {
        const trimmed = email.trim();
        if (!trimmed) return;

        setLoading(true);
        try {
            await api.forgotPassword(trimmed);
            setSent(true);
        } catch {
            setSent(true);
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <View style={styles.container}>
                <TouchableOpacity style={styles.backButton} onPress={onBackToLogin}>
                    <Text style={styles.backButtonText}>← {t('returnToLogin')}</Text>
                </TouchableOpacity>
                <View style={styles.successWrap}>
                    <Text style={styles.successTitle}>{t('checkEmail')}</Text>
                    <Text style={styles.successDesc}>{t('checkEmailDesc')}</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={onBackToLogin}>
                        <Text style={styles.primaryButtonText}>{t('returnToLogin')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <TouchableOpacity style={styles.backButton} onPress={onBackToLogin}>
                    <Text style={styles.backButtonText}>← {t('returnToLogin')}</Text>
                </TouchableOpacity>

                <Text style={[styles.title, isRTL && styles.rtlText]}>{t('forgotPasswordTitle')}</Text>
                <Text style={[styles.desc, isRTL && styles.rtlText]}>{t('forgotPasswordDesc')}</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('email')}</Text>
                    <TextInput
                        style={[styles.input, isRTL && styles.rtlInput]}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="email@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!loading}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                    onPress={handleSend}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.textInverse} />
                    ) : (
                        <Text style={styles.primaryButtonText}>{t('sendResetLink')}</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xxl,
    },
    backButton: {
        paddingVertical: spacing.sm,
        marginBottom: spacing.md,
    },
    backButtonText: {
        fontSize: fontSize.md,
        color: colors.primary,
        fontWeight: '600',
    },
    title: {
        fontSize: fontSize.xxl,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    rtlText: {
        writingDirection: 'rtl',
    },
    desc: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: fontSize.md,
        color: colors.text,
        backgroundColor: colors.background,
        minHeight: 48,
    },
    rtlInput: {
        textAlign: 'right',
    },
    primaryButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md + 2,
        alignItems: 'center',
        minHeight: 48,
    },
    primaryButtonDisabled: {
        opacity: 0.6,
    },
    primaryButtonText: {
        color: colors.textInverse,
        fontSize: fontSize.xl,
        fontWeight: '700',
    },
    successWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    successTitle: {
        fontSize: fontSize.xxl,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    successDesc: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
});
