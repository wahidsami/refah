import React, { useState, useCallback } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
    Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize, borderRadius } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { api, Order, getImageUrl } from '../api/client';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import {
    getOrderStatusColor,
    getOrderStatusKey,
    getPaymentStatusColor,
    getPaymentStatusKey,
    canCancelOrder,
} from '../utils/orderStatusUtils';

export function OrderDetailScreen({ route, navigation }: any) {
    const { orderId, order: initialOrder } = route?.params || {};
    const { t, language } = useLanguage();
    const isArabic = language === 'ar';
    const [order, setOrder] = useState<Order | null>(initialOrder || null);
    const [loading, setLoading] = useState(!initialOrder);
    const [refreshing, setRefreshing] = useState(false);

    const loadOrder = useCallback(async () => {
        if (!orderId) return;
        try {
            const data = await api.getOrder(orderId);
            setOrder(data);
        } catch (e) {
            console.error('Failed to load order', e);
            setOrder(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [orderId]);

    useFocusEffect(
        useCallback(() => {
            loadOrder();
        }, [loadOrder])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadOrder();
    };

    const handleCancel = () => {
        if (!order?.id) return;
        Alert.alert(
            t('cancelOrder'),
            t('cancelOrderConfirm'),
            [
                { text: t('no'), style: 'cancel' },
                {
                    text: t('yes'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const success = await api.cancelOrder(order.id);
                            if (success) {
                                Alert.alert(t('success'), t('orderCancelled'), [
                                    { text: 'OK', onPress: () => navigation.goBack() },
                                ]);
                            }
                        } catch {
                            Alert.alert(t('error'), t('failedToCancelOrder'));
                        }
                    },
                },
            ]
        );
    };

    if (loading && !order) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!order) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{t('orderNotFound')}</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>← {isArabic ? 'رجوع' : 'Go back'}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const orderNumber = order.orderNumber || order.id.slice(0, 8).toUpperCase();
    const statusColor = getOrderStatusColor(order.status);
    const statusLabel = t(getOrderStatusKey(order.status) as any) || order.status;
    const paymentStatusLabel = order.paymentStatus
        ? (t(getPaymentStatusKey(order.paymentStatus) as any) || order.paymentStatus)
        : null;
    const showCancel = canCancelOrder(order.status as any);
    const shippingAddr = order.shippingAddress && typeof order.shippingAddress === 'object'
        ? order.shippingAddress
        : null;
    const subtotal = order.subtotal != null ? Number(order.subtotal) : null;
    const taxAmount = order.taxAmount != null ? Number(order.taxAmount) : 0;
    const shippingFee = order.shippingFee != null ? Number(order.shippingFee) : 0;
    const totalAmount = Number(order.totalAmount);

    const formatDateStr = (dateStr: string) =>
        format(new Date(dateStr), 'eeee, d MMMM yyyy', { locale: isArabic ? ar : enUS });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{t('orderDetails' as any)}</Text>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    <Text style={styles.orderNumberLabel}>{t('orderNumber' as any)}</Text>
                    <Text style={styles.orderNumberValue}>{orderNumber}</Text>
                    <Text style={styles.dateText}>{formatDateStr(order.createdAt)}</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                        </View>
                        {paymentStatusLabel && (
                            <View
                                style={[
                                    styles.statusBadge,
                                    { backgroundColor: getPaymentStatusColor(order.paymentStatus) + '20' },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.statusText,
                                        { color: getPaymentStatusColor(order.paymentStatus) },
                                    ]}
                                >
                                    {paymentStatusLabel}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {order.tenant && (
                    <View style={styles.card}>
                        <View style={styles.tenantRow}>
                            {order.tenant.logo ? (
                                <Image
                                    source={{ uri: getImageUrl(order.tenant.logo) }}
                                    style={styles.tenantLogo}
                                />
                            ) : (
                                <View style={[styles.tenantLogo, styles.placeholderLogo]}>
                                    <Text style={styles.placeholderText}>
                                        {order.tenant.name?.charAt(0) || 'S'}
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.tenantName}>
                                {isArabic && order.tenant.name_ar ? order.tenant.name_ar : order.tenant.name || ''}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('orderItems' as any)}</Text>
                    {(order.items || []).map((item) => {
                        const name = isArabic
                            ? item.productNameAr || item.product?.name_ar || item.Product?.name_ar || item.productName || item.product?.name_en || item.Product?.name_en
                            : item.productName || item.product?.name_en || item.Product?.name_en || item.productNameAr || item.product?.name_ar || item.Product?.name_ar;
                        const qty = item.quantity;
                        const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
                        const lineTotal = Number(item.totalPrice ?? item.price ?? 0) || qty * unitPrice;
                        return (
                            <View key={item.id} style={styles.itemRow}>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName} numberOfLines={2}>{name}</Text>
                                    <Text style={styles.itemMeta}>
                                        {unitPrice.toFixed(2)} SAR × {qty} = {lineTotal.toFixed(2)} SAR
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('deliveryType' as any)} & {t('payment' as any)}</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t('deliveryType' as any)}</Text>
                        <Text style={styles.infoValue}>
                            {order.deliveryType === 'delivery'
                                ? t('delivery' as any)
                                : t('pickup' as any)}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t('paymentMethod' as any)}</Text>
                        <Text style={styles.infoValue}>
                            {order.paymentMethod === 'online'
                                ? t('paymentMethod_online' as any)
                                : order.paymentMethod === 'cash_on_delivery'
                                ? t('paymentMethod_cash_on_delivery' as any)
                                : t('paymentMethod_pay_on_visit' as any)}
                        </Text>
                    </View>
                    {shippingAddr && (shippingAddr.street || shippingAddr.city) && (
                        <View style={styles.addressBlock}>
                            <Text style={styles.infoLabel}>{t('shippingAddress' as any)}</Text>
                            <Text style={styles.infoValue}>
                                {[shippingAddr.street, shippingAddr.district, shippingAddr.city]
                                    .filter(Boolean)
                                    .join(', ')}
                            </Text>
                            {(shippingAddr.building || shippingAddr.floor || shippingAddr.apartment) && (
                                <Text style={styles.infoValue}>
                                    {[shippingAddr.building, shippingAddr.floor, shippingAddr.apartment]
                                        .filter(Boolean)
                                        .join(', ')}
                                </Text>
                            )}
                        </View>
                    )}
                </View>

                {(order.trackingNumber || order.estimatedDeliveryDate) && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>{t('trackingNumber' as any)}</Text>
                        {order.trackingNumber && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>{t('trackingNumber' as any)}</Text>
                                <Text style={styles.infoValue}>{order.trackingNumber}</Text>
                            </View>
                        )}
                        {order.estimatedDeliveryDate && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>{t('estimatedDelivery' as any)}</Text>
                                <Text style={styles.infoValue}>
                                    {formatDateStr(order.estimatedDeliveryDate)}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('priceBreakdown' as any)}</Text>
                    {subtotal != null && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{t('subtotal' as any)}</Text>
                            <Text style={styles.infoValue}>{subtotal.toFixed(2)} SAR</Text>
                        </View>
                    )}
                    {taxAmount > 0 && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{t('tax' as any)}</Text>
                            <Text style={styles.infoValue}>{taxAmount.toFixed(2)} SAR</Text>
                        </View>
                    )}
                    {shippingFee > 0 && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{t('shippingFee' as any)}</Text>
                            <Text style={styles.infoValue}>{shippingFee.toFixed(2)} SAR</Text>
                        </View>
                    )}
                    <View style={[styles.infoRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>{t('total' as any)}</Text>
                        <Text style={styles.totalValue}>{totalAmount.toFixed(2)} SAR</Text>
                    </View>
                </View>

                {order.notes && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>{t('notes' as any)}</Text>
                        <Text style={styles.notesText}>{order.notes}</Text>
                    </View>
                )}

                {showCancel && (
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                        <Text style={styles.cancelButtonText}>{t('cancelOrder')}</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: spacing.xl }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    headerTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
    card: {
        backgroundColor: '#FFF',
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    orderNumberLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 4 },
    orderNumberValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
    dateText: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4 },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    statusBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 12,
    },
    statusText: { fontSize: fontSize.sm, fontWeight: '600' },
    tenantRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    tenantLogo: { width: 48, height: 48, borderRadius: 24 },
    placeholderLogo: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    placeholderText: { fontSize: fontSize.lg, fontWeight: '700', color: '#FFF' },
    tenantName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, flex: 1 },
    sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
    itemRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
    itemInfo: {},
    itemName: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
    itemMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
    infoValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
    addressBlock: { marginTop: spacing.sm },
    totalRow: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
    totalLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
    totalValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary },
    notesText: { fontSize: fontSize.sm, color: colors.textSecondary },
    cancelButton: {
        marginTop: spacing.md,
        padding: spacing.lg,
        backgroundColor: '#FEE2E2',
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    cancelButtonText: { fontSize: fontSize.md, fontWeight: '600', color: '#DC2626' },
    errorText: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' },
    backButton: { padding: spacing.md },
    backButtonText: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
});
