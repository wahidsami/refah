import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../api/client';
import { Ionicons } from '@expo/vector-icons';

export function ChangePasswordScreen() {
    const navigation = useNavigation<any>();
    const { t } = useLanguage();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSubmit = async () => {
        const cur = currentPassword.trim();
        const newP = newPassword.trim();
        const conf = confirmPassword.trim();

        if (!cur) {
            Alert.alert(t('error') || 'Error', t('currentPasswordRequired') || 'Current password is required.');
            return;
        }
        if (!newP || newP.length < 8) {
            Alert.alert(t('error') || 'Error', t('passwordMinLength') || 'New password must be at least 8 characters.');
            return;
        }
        if (newP !== conf) {
            Alert.alert(t('error') || 'Error', t('passwordsDoNotMatch') || 'New password and confirmation do not match.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.changePassword(cur, newP);
            if (res.success) {
                Alert.alert(
                    t('success') || 'Success',
                    t('changePasswordSuccess') || 'Password changed successfully. You can now log in with your new password.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert(t('error') || 'Error', res.message || t('changePasswordFailed') || 'Failed to change password.');
            }
        } catch (err: any) {
            const msg = err?.message || '';
            if (msg.toLowerCase().includes('current') || msg.toLowerCase().includes('incorrect')) {
                Alert.alert(t('error') || 'Error', t('currentPasswordIncorrect') || 'Current password is incorrect.');
            } else {
                Alert.alert(t('error') || 'Error', msg || t('changePasswordFailed') || 'Failed to change password.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('changePassword') || 'Change password'}</Text>
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.field}>
                    <Text style={styles.label}>{t('currentPassword') || 'Current password'}</Text>
                    <View style={styles.inputWrap}>
                        <TextInput
                            style={styles.input}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder="••••••••"
                            secureTextEntry={!showCurrent}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                        <TouchableOpacity onPress={() => setShowCurrent((s) => !s)} style={styles.eye}>
                            <Text>{showCurrent ? '🙈' : '👁'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.field}>
                    <Text style={styles.label}>{t('newPassword') || 'New password'}</Text>
                    <View style={styles.inputWrap}>
                        <TextInput
                            style={styles.input}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="••••••••"
                            secureTextEntry={!showNew}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                        <TouchableOpacity onPress={() => setShowNew((s) => !s)} style={styles.eye}>
                            <Text>{showNew ? '🙈' : '👁'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.field}>
                    <Text style={styles.label}>{t('confirmPassword') || 'Confirm new password'}</Text>
                    <View style={styles.inputWrap}>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="••••••••"
                            secureTextEntry={!showConfirm}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />
                        <TouchableOpacity onPress={() => setShowConfirm((s) => !s)} style={styles.eye}>
                            <Text>{showConfirm ? '🙈' : '👁'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.submitBtnText}>{t('save') || 'Save'}</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        paddingTop: spacing.xl + 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: { padding: spacing.sm, marginRight: spacing.sm },
    headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
    field: { marginBottom: spacing.lg },
    label: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },
    inputWrap: { position: 'relative' },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        paddingRight: 48,
        fontSize: fontSize.md,
        color: colors.text,
    },
    eye: { position: 'absolute', right: spacing.md, top: 0, bottom: 0, justifyContent: 'center' },
    submitBtn: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.lg,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: { fontSize: fontSize.md, fontWeight: '600', color: '#FFFFFF' },
});
