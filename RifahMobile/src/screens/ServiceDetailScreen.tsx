import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Platform,
} from 'react-native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize, borderRadius } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { Service, Tenant, getImageUrl, api } from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import type { TenantTheme } from './TenantScreen';

const defaultTheme: TenantTheme = { primaryColor: colors.primary, secondaryColor: colors.secondary, helperColor: colors.accent };

interface ServiceDetailScreenProps {
    route: { params: { service: Service; tenant: Tenant; tenantTheme?: TenantTheme } };
    navigation: any;
}

export function ServiceDetailScreen({ route, navigation }: ServiceDetailScreenProps) {
    const { service: initialService, tenant, tenantTheme: routeTheme } = route.params;
    const [service, setService] = useState<Service>(initialService);
    const tenantTheme = routeTheme || defaultTheme;
    const { isRTL, t } = useLanguage();

    useEffect(() => {
        if (initialService.hasGift && initialService.giftType === 'product' && !initialService.giftProduct && tenant?.id && initialService?.id) {
            api.getPublicService(tenant.id, initialService.id).then((s) => {
                if (s) setService(s);
            });
        }
    }, [tenant?.id, initialService?.id, initialService?.hasGift, initialService?.giftType, initialService?.giftProduct]);

    const name = isRTL ? (service.name_ar || service.name_en) : (service.name_en || service.name_ar);
    const description = isRTL ? (service.description_ar || service.description_en) : (service.description_en || service.description_ar);
    const finalPrice = Number(service.finalPrice ?? service.basePrice ?? 0);
    const rawPrice = service.rawPrice != null ? Number(service.rawPrice) : null;
    const offerActive = Boolean(service.offerActive && service.hasOffer);
    const offerDetails = service.offerDetails || '';
    const pctMatch = offerDetails.match(/(\d+)\s*%/);
    const offerPct = pctMatch ? Math.min(99, Math.max(1, parseInt(pctMatch[1], 10))) : null;
    const originalPrice = offerActive && finalPrice
        ? (rawPrice != null && rawPrice > finalPrice ? rawPrice : (offerPct != null ? finalPrice / (1 - offerPct / 100) : null))
        : null;
    const displayPrice = finalPrice;
    const imageUri = service.image ? getImageUrl(service.image) : 'https://images.unsplash.com/photo-1560066984-12186d305d4d?q=80&w=600&auto=format&fit=crop';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />

                <View style={styles.card}>
                    <Text style={styles.serviceName}>{name}</Text>
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                            <Text style={styles.metaText}>{service.duration} {t('mins')}</Text>
                        </View>
                        <View style={[styles.priceBadge, { backgroundColor: tenantTheme.primaryColor + '18' }]}>
                            {originalPrice != null && originalPrice > displayPrice ? (
                                <View style={styles.priceRow}>
                                    <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>{Number(originalPrice).toFixed(0)} SAR</Text>
                                    <Text style={[styles.priceText, { color: tenantTheme.primaryColor }]}>{displayPrice.toFixed(0)} SAR</Text>
                                </View>
                            ) : (
                                <Text style={[styles.priceText, { color: tenantTheme.primaryColor }]}>{displayPrice.toFixed(0)} SAR</Text>
                            )}
                        </View>
                    </View>
                </View>

                {description ? (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>{t('description')}</Text>
                        <Text style={styles.descriptionText}>{description}</Text>
                    </View>
                ) : null}

                {service.offerActive && service.hasOffer && service.offerDetails ? (
                    <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: tenantTheme.primaryColor }]}>
                        <Text style={styles.sectionTitle}>{isRTL ? 'العرض' : 'Offer'}</Text>
                        <Text style={styles.descriptionText}>{service.offerDetails}</Text>
                    </View>
                ) : null}

                {service.offerActive && service.hasGift && (service.giftProduct || service.giftDetails || service.giftType) ? (
                    <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.accent }]}>
                        <Text style={styles.sectionTitle}>{isRTL ? 'الهدية' : 'Gift'}</Text>
                        {service.giftProduct ? (
                            <View style={styles.giftProductRow}>
                                {(service.giftProduct.image || (service.giftProduct.images && service.giftProduct.images.length > 0)) ? (
                                    <Image
                                        source={{ uri: getImageUrl(service.giftProduct.image || service.giftProduct.images![0]) }}
                                        style={styles.giftProductImage}
                                        resizeMode="cover"
                                    />
                                ) : null}
                                <View style={styles.giftProductInfo}>
                                    <Text style={styles.giftProductName}>
                                        {isRTL ? (service.giftProduct.name_ar || service.giftProduct.name_en) : (service.giftProduct.name_en || service.giftProduct.name_ar)}
                                    </Text>
                                    {service.giftDetails && String(service.giftDetails) !== service.giftProduct.id ? (
                                        <Text style={styles.descriptionText}>{String(service.giftDetails)}</Text>
                                    ) : null}
                                </View>
                            </View>
                        ) : (
                            <Text style={styles.descriptionText}>
                                {service.giftType === 'product' ? (isRTL ? 'منتج هدية' : 'Gift product') : (service.giftDetails || '')}
                            </Text>
                        )}
                    </View>
                ) : null}

                <TouchableOpacity
                    style={[styles.bookButton, { backgroundColor: tenantTheme.primaryColor }]}
                    onPress={() => navigation.navigate('Booking', { service, tenant, tenantTheme })}
                    activeOpacity={0.85}
                >
                    <Text style={styles.bookButtonText}>{t('bookNow')}</Text>
                    <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={20} color="#fff" />
                </TouchableOpacity>

                <View style={{ height: spacing.xxl }} />
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
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: Platform.OS === 'ios' ? 56 : 20,
        paddingBottom: spacing.md,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: { padding: spacing.sm },
    headerTitle: {
        flex: 1,
        fontSize: fontSize.lg,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
    },
    content: { padding: spacing.lg },
    heroImage: {
        width: '100%',
        height: 220,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.lg,
        backgroundColor: colors.border,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    serviceName: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    metaText: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
    },
    priceBadge: {
        backgroundColor: colors.primary + '20',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    originalPrice: {
        fontSize: fontSize.sm,
        textDecorationLine: 'line-through',
    },
    priceText: {
        fontSize: fontSize.lg,
        fontWeight: '700',
        color: colors.primary,
    },
    giftProductRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    giftProductImage: {
        width: 72,
        height: 72,
        borderRadius: borderRadius.md,
        backgroundColor: colors.border,
    },
    giftProductInfo: {
        flex: 1,
    },
    giftProductName: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    sectionTitle: {
        fontSize: fontSize.md,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    descriptionText: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    bookButton: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.lg,
        gap: spacing.md,
        marginTop: spacing.sm,
    },
    bookButtonText: {
        fontSize: fontSize.lg,
        fontWeight: '700',
        color: '#fff',
    },
});
