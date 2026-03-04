import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { api, User, getImageUrl } from '../api/client';
import { Ionicons } from '@expo/vector-icons';

export function ProfileScreen() {
    const navigation = useNavigation<any>();
    const { t, language } = useLanguage();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const isFirstFocus = useRef(true);

    useEffect(() => {
        loadUserData();
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (isFirstFocus.current) {
                isFirstFocus.current = false;
                return;
            }
            loadUserData();
        }, [])
    );

    const loadUserData = async () => {
        try {
            const isAuth = await api.isAuthenticated();
            if (!isAuth) {
                setUser(await api.getUser());
                setLoading(false);
                return;
            }
            const { user: profileUser } = await api.getProfile();
            setUser(profileUser);
        } catch (error) {
            console.error('Failed to load user data:', error);
            const localUser = await api.getUser();
            setUser(localUser);
        } finally {
            setLoading(false);
        }
    };

    const handleEditPhoto = async () => {
        if (!user || uploadLoading) return;
        setUploadError(null);
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                setUploadError('Permission to access camera roll is required');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });
            if (result.canceled) return;
            const asset = result.assets[0];
            const uri = asset.uri;
            const uriParts = uri.split('.');
            const ext = uriParts.length > 1 ? uriParts[uriParts.length - 1] : 'jpg';
            const fileName = `photo.${ext}`;
            const type = asset.mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`;
            setUploadLoading(true);
            const res = await api.uploadProfilePhoto(uri, fileName, type);
            const updatedUser = { ...user, profileImage: res.profileImage };
            setUser(updatedUser);
            await api.setUser(updatedUser);
        } catch (err: any) {
            console.error('Profile photo upload error:', err);
            setUploadError(err.message || 'Failed to upload photo');
        } finally {
            setUploadLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!user) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <Text style={styles.errorText}>{t('failedToLoadProfile')}</Text>
            </View>
        );
    }

    const fullName = `${user.firstName} ${user.lastName}`;
    const avatarLetter = user.firstName?.charAt(0).toUpperCase() || 'U';

    const genderLabel = user.gender === 'male' ? (t('genderMale') || 'Male') : user.gender === 'female' ? (t('genderFemale') || 'Female') : user.gender === 'other' ? (t('genderOther') || 'Other') : '—';
    const hasAddress = [user.addressStreet, user.addressCity, user.addressDistrict, user.addressBuilding, user.addressFloor, user.addressApartment].some(Boolean);
    const addressLine = [user.addressStreet, user.addressDistrict, user.addressCity].filter(Boolean).join(', ') || null;
    const addressDetail = [user.addressBuilding, user.addressFloor, user.addressApartment].filter(Boolean).join(', ') || null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('profile')}</Text>
            </View>
            <ScrollView style={styles.content}>
                {/* Profile Picture */}
                <View style={styles.avatarSection}>
                    {user.profileImage ? (
                        <Image
                            source={{ uri: getImageUrl(user.profileImage) }}
                            style={styles.avatarImage}
                        />
                    ) : (
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{avatarLetter}</Text>
                        </View>
                    )}
                    {uploadError ? (
                        <Text style={styles.uploadErrorText}>{uploadError}</Text>
                    ) : null}
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={handleEditPhoto}
                        disabled={uploadLoading}
                    >
                        {uploadLoading ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Text style={styles.editButtonText}>{t('editPhoto')}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Profile Info - editable fields shown; email & phone read-only */}
                <View style={styles.infoSection}>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>{t('fullName')}</Text>
                        <Text style={styles.infoValue}>{fullName}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>{t('email')}</Text>
                        <Text style={[styles.infoValue, styles.readOnly]}>{user.email}</Text>
                        <Text style={styles.readOnlyHint}>{t('emailNotEditable') || 'Cannot be changed'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>{t('phone')}</Text>
                        <Text style={[styles.infoValue, styles.readOnly]}>{user.phone}</Text>
                        <Text style={styles.readOnlyHint}>{t('phoneNotEditable') || 'Cannot be changed'}</Text>
                    </View>
                    {user.gender != null && user.gender !== '' && (
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>{t('gender') || 'Gender'}</Text>
                            <Text style={styles.infoValue}>{genderLabel}</Text>
                        </View>
                    )}
                    {user.dateOfBirth && (
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>{t('dateOfBirth') || 'Date of birth'}</Text>
                            <Text style={styles.infoValue}>
                                {new Date(user.dateOfBirth).toLocaleDateString(language === 'ar' ? 'ar' : undefined)}
                            </Text>
                        </View>
                    )}
                    {user.createdAt && (
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>{t('memberSince')}</Text>
                            <Text style={styles.infoValue}>
                                {new Date(user.createdAt).toLocaleDateString()}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Address block */}
                {hasAddress && (
                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>{t('savedAddress') || 'Saved address'}</Text>
                        {addressLine ? (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoValue}>{addressLine}</Text>
                            </View>
                        ) : null}
                        {addressDetail ? (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoValue}>{addressDetail}</Text>
                            </View>
                        ) : null}
                        {user.addressPhone ? (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>{t('addressPhone') || 'Address phone'}</Text>
                                <Text style={styles.infoValue}>{user.addressPhone}</Text>
                            </View>
                        ) : null}
                        {user.addressNotes ? (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>{t('notes') || 'Notes'}</Text>
                                <Text style={styles.infoValue}>{user.addressNotes}</Text>
                            </View>
                        ) : null}
                    </View>
                )}

                <TouchableOpacity
                    style={styles.editProfileButton}
                    onPress={() => navigation.navigate('EditProfile', { user })}
                >
                    <Text style={styles.editProfileText}>{t('editProfile')}</Text>
                </TouchableOpacity>
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        paddingTop: spacing.xl + 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: {
        padding: spacing.sm,
        marginRight: spacing.sm,
    },
    headerTitle: {
        fontSize: fontSize.lg,
        fontWeight: '700',
        color: colors.text,
        flex: 1,
    },
    readOnly: {
        color: colors.textSecondary,
    },
    readOnlyHint: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: colors.textSecondary,
        paddingVertical: spacing.sm,
        paddingHorizontal: 0,
    },
    content: {
        flex: 1,
    },
    avatarSection: {
        alignItems: 'center',
        padding: spacing.xl,
        backgroundColor: '#FFFFFF',
        marginBottom: spacing.md,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    editButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    editButtonText: {
        fontSize: fontSize.sm,
        color: colors.primary,
        fontWeight: '600',
    },
    infoSection: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: spacing.lg,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    infoItem: {
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    infoItemLast: {
        borderBottomWidth: 0,
    },
    infoLabel: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: fontSize.md,
        color: colors.text,
        fontWeight: '500',
    },
    editProfileButton: {
        backgroundColor: colors.primary,
        marginHorizontal: spacing.lg,
        marginTop: spacing.xl,
        padding: spacing.lg,
        borderRadius: 12,
        alignItems: 'center',
    },
    editProfileText: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
    },
    uploadErrorText: {
        fontSize: fontSize.sm,
        color: colors.error,
        marginBottom: spacing.sm,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: spacing.md,
    },
});
