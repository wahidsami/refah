import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { ThemedText as Text } from '../ThemedText';
import { colors, spacing, fontSize, borderRadius } from '../../theme/colors';
import { useLanguage } from '../../contexts/LanguageContext';
import { api, StaffWithTenant, getImageUrl } from '../../api/client';
import { SkeletonCard } from './SkeletonCard';

interface TopProvidersSectionProps {
    navigation: any;
}

export function TopProvidersSection({ navigation }: TopProvidersSectionProps) {
    const { t } = useLanguage();
    const [providers, setProviders] = useState<StaffWithTenant[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadProviders(); }, []);

    const loadProviders = async () => {
        setLoading(true);
        try {
            const data = await api.getTopProviders(8);
            setProviders(data);
        } catch {
            setProviders([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <FlatList
                horizontal
                data={[1, 2, 3, 4]}
                renderItem={() => <SkeletonCard variant="provider" />}
                keyExtractor={(_, i) => `sk-${i}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            />
        );
    }

    if (providers.length === 0) {
        return null;
    }

    const renderProvider = ({ item }: { item: StaffWithTenant }) => {
        const avatarUrl = (item.avatar || item.image) ? getImageUrl(item.avatar || item.image) : undefined;
        const initials = item.name?.charAt(0)?.toUpperCase() || '?';
        const rating = typeof item.rating === 'number' ? item.rating : 0;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => {
                    if (item.tenantId) {
                        navigation.navigate('Tenant', {
                            tenantId: item.tenantId,
                            staffId: item.id,
                        });
                    }
                }}
            >
                {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                )}
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <View style={styles.ratingRow}>
                    <Text style={styles.star}>⭐</Text>
                    <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : '—'}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.sectionContainer}>
            <FlatList
                horizontal
                data={providers}
                renderItem={renderProvider}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    sectionContainer: {
        backgroundColor: colors.backgroundGray,
        paddingVertical: spacing.md,
        marginBottom: spacing.xl,
    },
    listContent: {
        paddingHorizontal: spacing.lg,
    },
    card: {
        width: 100,
        alignItems: 'center',
        marginRight: spacing.md,
        backgroundColor: '#FFF',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginBottom: spacing.xs,
    },
    avatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    avatarText: {
        color: '#FFF',
        fontSize: fontSize.lg,
        fontWeight: '700',
    },
    name: {
        fontSize: fontSize.xs,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 2,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    star: {
        fontSize: 12,
    },
    ratingText: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        fontWeight: '600',
    },
});
