import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize, borderRadius } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { api, Tenant, getImageUrl } from '../api/client';

const DEBOUNCE_MS = 300;

export function SearchScreen({ navigation, route }: { navigation: any; route?: any }) {
    const { t, isRTL } = useLanguage();
    // When opening from category tap: pass categorySlug to API but leave search box empty so we get all tenants offering that category
    const categorySlugFromRoute = route?.params?.categorySlug ?? '';
    const [query, setQuery] = useState('');
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const searchTenants = useCallback(async (q: string) => {
        if (!q.trim() && !categorySlugFromRoute) {
            setTenants([]);
            setSearched(false);
            return;
        }
        setLoading(true);
        setSearched(true);
        try {
            const data = await api.getSearchTenants(q, 20, categorySlugFromRoute || undefined);
            setTenants(data);
        } catch {
            setTenants([]);
        } finally {
            setLoading(false);
        }
    }, [categorySlugFromRoute]);

    useEffect(() => {
        const timer = setTimeout(() => {
            searchTenants(query);
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [query, searchTenants]);

    const displayName = (item: Tenant) =>
        isRTL ? (item.name_ar || item.name) : (item.name_en || item.name);
    const businessTypes = (item: Tenant) =>
        Array.isArray((item as any).businessType)
            ? (item as any).businessType.map((x: string) => x.replace('_', ' ')).join(' • ')
            : (item as any).businessType?.replace('_', ' ') || '';

    const renderTenant = ({ item }: { item: Tenant }) => {
        const logoUrl = getImageUrl(item.logo);
        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() =>
                    navigation.navigate('Tenant', {
                        tenantId: item.id,
                        slug: item.slug,
                        tenant: item,
                    })
                }
            >
                <View style={styles.coverContainer}>
                    {logoUrl ? (
                        <Image
                            source={{ uri: logoUrl }}
                            style={styles.coverImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.coverPlaceholder}>
                            <Text style={styles.coverLetter}>
                                {(displayName(item) || '?').charAt(0)}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={styles.infoContainer}>
                    <Text style={styles.tenantName} numberOfLines={1}>
                        {displayName(item)}
                    </Text>
                    <Text style={styles.metaRow} numberOfLines={1}>
                        {businessTypes(item) ? `${businessTypes(item)} • ` : ''}
                        {item.city || ''}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing.sm }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
                </TouchableOpacity>
                <TextInput
                    style={[styles.input, { flex: 1, textAlign: isRTL ? 'right' : 'left' }]}
                    placeholder={t('searchSalons')}
                    placeholderTextColor={colors.textSecondary}
                    value={query}
                    onChangeText={setQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                />
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : searched && tenants.length === 0 ? (
                <View style={styles.centered}>
                    <Text style={styles.emptyText}>
                        {isRTL ? 'لا توجد نتائج' : 'No results found'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={tenants}
                    renderItem={renderTenant}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl + 20,
        paddingBottom: spacing.md,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: spacing.xs,
    },
    input: {
        height: 48,
        backgroundColor: colors.backgroundGray,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        fontSize: fontSize.md,
        color: colors.text,
    },
    listContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xl * 2,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: borderRadius.xl,
        marginBottom: spacing.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    coverContainer: {
        height: 120,
        backgroundColor: '#F3E8FF',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3E8FF',
    },
    coverLetter: {
        fontSize: 40,
        fontWeight: '700',
        color: colors.primary,
    },
    infoContainer: {
        padding: spacing.sm,
    },
    tenantName: {
        fontSize: fontSize.md,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 2,
    },
    metaRow: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
    },
});
