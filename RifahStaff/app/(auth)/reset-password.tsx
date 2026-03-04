import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../src/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function ResetPasswordScreen() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const router = useRouter();
    const { t } = useTranslation();

    // These params arrive from the deep link:
    // rifahstaff://reset-password?token=abc123&email=staff@example.com
    const { token, email } = useLocalSearchParams<{ token: string; email: string }>();

    const isValidLink = !!token && !!email;

    const handleReset = async () => {
        if (!newPassword || newPassword.length < 8) {
            Alert.alert(t('common.error'), t('auth.errorPasswordLength'));
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert(t('common.error'), t('auth.errorPasswordMatch'));
            return;
        }

        setLoading(true);
        try {
            const response = await api.post(`/auth/staff/reset-password/${token}`, {
                email: email.trim().toLowerCase(),
                newPassword
            });

            if (response.data.success) {
                setDone(true);
            }
        } catch (error: any) {
            console.error('Reset password error:', error.response?.data || error.message);
            Alert.alert(
                t('common.error'),
                error.response?.data?.message || t('auth.errorInvalidResetLink')
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <LinearGradient
                colors={['#8B5ADF', '#683AB7']}
                style={styles.header}
            >
                {!done && (
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.replace('/(auth)/login')}
                    >
                        <Ionicons name="arrow-back" size={24} color="#ffffff" />
                    </TouchableOpacity>
                )}
                <Text style={styles.headerTitle}>{t('auth.resetPasswordTitle')}</Text>
            </LinearGradient>

            <View style={styles.formContainer}>
                {/* Invalid / missing link state */}
                {!isValidLink && (
                    <View style={styles.centeredState}>
                        <Ionicons name="warning-outline" size={64} color="#f59e0b" />
                        <Text style={styles.stateTitle}>{t('auth.errorInvalidResetLink')}</Text>
                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={() => router.replace('/(auth)/forgot-password')}
                        >
                            <Text style={styles.submitButtonText}>{t('auth.sendResetLink')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Success state */}
                {isValidLink && done && (
                    <View style={styles.centeredState}>
                        <Ionicons name="checkmark-circle" size={64} color="#10b981" />
                        <Text style={styles.stateTitle}>{t('auth.successResetPassword')}</Text>
                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={() => router.replace('/(auth)/login')}
                        >
                            <Text style={styles.submitButtonText}>{t('auth.returnToLogin')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Form state */}
                {isValidLink && !done && (
                    <>
                        <Text style={styles.descriptionText}>{t('auth.resetPasswordDesc')}</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t('auth.newPassword')}</Text>
                            <TextInput
                                style={styles.input}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                                placeholder={t('auth.newPasswordPlaceholder')}
                                placeholderTextColor="#9ca3af"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
                            <TextInput
                                style={styles.input}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                placeholder={t('auth.confirmPasswordPlaceholder')}
                                placeholderTextColor="#9ca3af"
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleReset}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>{t('auth.resetPasswordBtn')}</Text>
                            )}
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        paddingTop: 40,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        padding: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    formContainer: {
        flex: 1,
        paddingHorizontal: 24,
        marginTop: -40,
        backgroundColor: '#ffffff',
        marginHorizontal: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        paddingVertical: 30,
    },
    centeredState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        paddingVertical: 20,
    },
    stateTitle: {
        fontSize: 16,
        color: '#374151',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 10,
    },
    descriptionText: {
        fontSize: 15,
        color: '#4b5563',
        lineHeight: 22,
        marginBottom: 24,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        color: '#1f2937',
    },
    submitButton: {
        backgroundColor: '#8B5ADF',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8B5ADF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
        width: '100%',
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
