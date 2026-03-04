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
    Alert,
} from 'react-native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize, borderRadius } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../api/client';

export interface ResetPasswordScreenProps {
    token: string;
    email: string;
    onSuccess: () => void;
    onBackToLogin: () => void;
}

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordScreen({ token, email, onSuccess, onBackToLogin }: ResetPasswordScreenProps) {
    const { t, isRTL } = useLanguage();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const valid =
        password.length >= MIN_PASSWORD_LENGTH &&
        password === confirmPassword;

    const handleSubmit = async () => {
        if (!valid) return;
        if (password !== confirmPassword) {
            setError(t('passwordsMustMatch'));
            return;
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(t('passwordMinLength'));
            return;
        }

        setError('');
        setLoading(true);
        try {
            await api.resetPassword(token, password);
            Alert.alert(t('success'), t('resetSuccess'), [
                { text: 'OK', onPress: onSuccess },
            ]);
        } catch (err: any) {
            setError(t('resetLinkInvalid'));
        } finally {
            setLoading(false);
        }
    };

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

                <Text style={[styles.title, isRTL && styles.rtlText]}>{t('resetPasswordTitle')}</Text>
                <Text style={[styles.desc, isRTL && styles.rtlText]}>{t('resetPasswordDesc')}</Text>

                {error ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('newPassword')}</Text>
                    <View style={styles.passwordWrap}>
                        <TextInput
                            style={[styles.input, styles.passwordInput, isRTL && styles.rtlInput]}
                            value={password}
                            onChangeText={(v) => { setPassword(v); setError(''); }}
                            placeholder="••••••••"
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            editable={!loading}
                        />
                        <TouchableOpacity
                            style={styles.eyeBtn}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('confirmPassword')}</Text>
                    <TextInput
                        style={[styles.input, isRTL && styles.rtlInput]}
                        value={confirmPassword}
                        onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
                        placeholder="••••••••"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        editable={!loading}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.primaryButton, (!valid || loading) && styles.primaryButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={!valid || loading}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.textInverse} />
                    ) : (
                        <Text style={styles.primaryButtonText}>{t('resetPasswordBtn')}</Text>
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
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    errorContainer: {
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    errorText: {
        color: colors.error,
        fontSize: fontSize.sm,
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
    passwordWrap: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 50,
    },
    eyeBtn: {
        position: 'absolute',
        right: spacing.md,
        top: spacing.md,
        padding: spacing.xs,
    },
    eyeText: {
        fontSize: 20,
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
});
