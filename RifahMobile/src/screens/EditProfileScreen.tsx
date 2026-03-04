import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { api, User } from '../api/client';
import { Ionicons } from '@expo/vector-icons';

export function EditProfileScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const initialUser = (route.params as { user?: User })?.user;
    const { t, language } = useLanguage();

    const [firstName, setFirstName] = useState(initialUser?.firstName ?? '');
    const [lastName, setLastName] = useState(initialUser?.lastName ?? '');
    const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>(
        (initialUser as any)?.gender || ''
    );
    const [dateOfBirth, setDateOfBirth] = useState(
        initialUser?.dateOfBirth ? new Date((initialUser as any).dateOfBirth).toISOString().slice(0, 10) : ''
    );
    const [addressStreet, setAddressStreet] = useState((initialUser as any)?.addressStreet ?? '');
    const [addressCity, setAddressCity] = useState((initialUser as any)?.addressCity ?? '');
    const [addressDistrict, setAddressDistrict] = useState((initialUser as any)?.addressDistrict ?? '');
    const [addressBuilding, setAddressBuilding] = useState((initialUser as any)?.addressBuilding ?? '');
    const [addressFloor, setAddressFloor] = useState((initialUser as any)?.addressFloor ?? '');
    const [addressApartment, setAddressApartment] = useState((initialUser as any)?.addressApartment ?? '');
    const [addressPhone, setAddressPhone] = useState((initialUser as any)?.addressPhone ?? '');
    const [addressNotes, setAddressNotes] = useState((initialUser as any)?.addressNotes ?? '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!initialUser) {
            navigation.goBack();
        }
    }, [initialUser, navigation]);

    const handleSave = async () => {
        if (!initialUser) return;
        const trimmedFirst = firstName.trim();
        const trimmedLast = lastName.trim();
        if (!trimmedFirst || !trimmedLast) {
            Alert.alert(t('error') || 'Error', t('fillAllFields') || 'Please fill in required fields.');
            return;
        }
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                firstName: trimmedFirst,
                lastName: trimmedLast,
                addressStreet: addressStreet.trim() || undefined,
                addressCity: addressCity.trim() || undefined,
                addressDistrict: addressDistrict.trim() || undefined,
                addressBuilding: addressBuilding.trim() || undefined,
                addressFloor: addressFloor.trim() || undefined,
                addressApartment: addressApartment.trim() || undefined,
                addressPhone: addressPhone.trim() || undefined,
                addressNotes: addressNotes.trim() || undefined,
            };
            if (gender) payload.gender = gender;
            if (dateOfBirth) payload.dateOfBirth = dateOfBirth;

            const { user: updated } = await api.updateProfile(payload);
            await api.setUser(updated);
            Alert.alert(t('success') || 'Success', t('profileUpdated') || 'Profile updated.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (e: any) {
            Alert.alert(t('error') || 'Error', e.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    if (!initialUser) return null;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('editProfile')}</Text>
            </View>
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('personalInfo') || 'Personal info'}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t('firstName') || 'First name'}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholderTextColor={colors.textSecondary}
                        editable={!saving}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder={t('lastName') || 'Last name'}
                        value={lastName}
                        onChangeText={setLastName}
                        placeholderTextColor={colors.textSecondary}
                        editable={!saving}
                    />
                    {/* Email & phone read-only */}
                    <View style={styles.readOnlyRow}>
                        <Text style={styles.label}>{t('email')}</Text>
                        <Text style={styles.readOnlyValue}>{initialUser.email}</Text>
                    </View>
                    <View style={styles.readOnlyRow}>
                        <Text style={styles.label}>{t('phone')}</Text>
                        <Text style={styles.readOnlyValue}>{initialUser.phone}</Text>
                    </View>
                    {/* Gender */}
                    <Text style={styles.label}>{t('gender') || 'Gender'}</Text>
                    <View style={styles.genderRow}>
                        {(['male', 'female', 'other'] as const).map((g) => (
                            <TouchableOpacity
                                key={g}
                                style={[styles.genderOption, gender === g && styles.genderOptionActive]}
                                onPress={() => setGender(g)}
                                disabled={saving}
                            >
                                <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                                    {g === 'male' ? (t('genderMale') || 'Male') : g === 'female' ? (t('genderFemale') || 'Female') : (t('genderOther') || 'Other')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.label}>{t('dateOfBirth') || 'Date of birth'}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="YYYY-MM-DD"
                        value={dateOfBirth}
                        onChangeText={setDateOfBirth}
                        placeholderTextColor={colors.textSecondary}
                        editable={!saving}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('savedAddress') || 'Address'}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t('street') || 'Street'}
                        value={addressStreet}
                        onChangeText={setAddressStreet}
                        placeholderTextColor={colors.textSecondary}
                        editable={!saving}
                    />
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, styles.half]}
                            placeholder={t('city') || 'City'}
                            value={addressCity}
                            onChangeText={setAddressCity}
                            placeholderTextColor={colors.textSecondary}
                            editable={!saving}
                        />
                        <TextInput
                            style={[styles.input, styles.half]}
                            placeholder={t('district') || 'District'}
                            value={addressDistrict}
                            onChangeText={setAddressDistrict}
                            placeholderTextColor={colors.textSecondary}
                            editable={!saving}
                        />
                    </View>
                    <TextInput
                        style={styles.input}
                        placeholder={t('building') || 'Building'}
                        value={addressBuilding}
                        onChangeText={setAddressBuilding}
                        placeholderTextColor={colors.textSecondary}
                        editable={!saving}
                    />
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, styles.half]}
                            placeholder={t('floor') || 'Floor'}
                            value={addressFloor}
                            onChangeText={setAddressFloor}
                            placeholderTextColor={colors.textSecondary}
                            editable={!saving}
                        />
                        <TextInput
                            style={[styles.input, styles.half]}
                            placeholder={t('apartment') || 'Apartment'}
                            value={addressApartment}
                            onChangeText={setAddressApartment}
                            placeholderTextColor={colors.textSecondary}
                            editable={!saving}
                        />
                    </View>
                    <TextInput
                        style={styles.input}
                        placeholder={t('addressPhone') || 'Phone for delivery'}
                        value={addressPhone}
                        onChangeText={setAddressPhone}
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="phone-pad"
                        editable={!saving}
                    />
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder={t('notes') || 'Notes'}
                        value={addressNotes}
                        onChangeText={setAddressNotes}
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        numberOfLines={2}
                        editable={!saving}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>{t('save') || 'Save'}</Text>
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
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: { padding: spacing.sm, marginRight: spacing.sm },
    headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, flex: 1 },
    scroll: { flex: 1 },
    section: {
        backgroundColor: '#FFF',
        marginTop: spacing.md,
        padding: spacing.lg,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    sectionTitle: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.md,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: fontSize.md,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    row: { flexDirection: 'row', gap: spacing.sm },
    half: { flex: 1 },
    label: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    readOnlyRow: {
        marginBottom: spacing.sm,
        paddingVertical: spacing.sm,
    },
    readOnlyValue: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
    },
    genderRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    genderOption: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    genderOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
    genderText: { fontSize: fontSize.sm, color: colors.textSecondary },
    genderTextActive: { color: colors.primary, fontWeight: '600' },
    textArea: { minHeight: 60, textAlignVertical: 'top' },
    saveButton: {
        backgroundColor: colors.primary,
        marginHorizontal: spacing.lg,
        marginTop: spacing.xl,
        marginBottom: spacing.xl,
        padding: spacing.lg,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonDisabled: { opacity: 0.7 },
    saveButtonText: { fontSize: fontSize.md, fontWeight: '600', color: '#FFF' },
});
