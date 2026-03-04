import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Modal,
    ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { api, Transaction, TransactionType, TransactionStatus } from '../api/client';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

const TYPE_OPTIONS: { value: '' | TransactionType; key: string }[] = [
    { value: '', key: 'allTypes' },
    { value: 'booking', key: 'transactionType_booking' },
    { value: 'product_purchase', key: 'transactionType_product_purchase' },
    { value: 'refund', key: 'transactionType_refund' },
    { value: 'wallet_topup', key: 'transactionType_wallet_topup' },
    { value: 'subscription', key: 'transactionType_subscription' },
    { value: 'loyalty_redemption', key: 'transactionType_loyalty_redemption' },
];

const STATUS_OPTIONS: { value: '' | TransactionStatus; key: string }[] = [
    { value: '', key: 'allTypes' },
    { value: 'completed', key: 'transactionStatus_completed' },
    { value: 'pending', key: 'transactionStatus_pending' },
    { value: 'failed', key: 'transactionStatus_failed' },
    { value: 'refunded', key: 'transactionStatus_refunded' },
];

type DatePreset = 'last7' | 'last30' | 'thisMonth' | 'custom';

function getDateRange(preset: DatePreset): { startDate?: string; endDate?: string } {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    let start: Date;
    if (preset === 'last7') {
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
    } else if (preset === 'last30') {
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
    } else if (preset === 'thisMonth') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
        return {};
    }
    return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
    };
}

export function PaymentHistoryScreen() {
    const navigation = useNavigation<any>();
    const { t, language, isRTL } = useLanguage();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [typeFilter, setTypeFilter] = useState<'' | TransactionType>('');
    const [statusFilter, setStatusFilter] = useState<'' | TransactionStatus>('');
    const [datePreset, setDatePreset] = useState<DatePreset | ''>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const limit = 20;
    const effectIdRef = useRef(0);

    const dateRange = useMemo(() => (datePreset ? getDateRange(datePreset as DatePreset) : {}), [datePreset]);

    const loadPage = useCallback(
        async (
            pageNum: number,
            append: boolean,
            isStale?: () => boolean
        ) => {
            try {
                if (pageNum === 1) setError(null);
                const res = await api.getPaymentHistory({
                    type: typeFilter || undefined,
                    status: statusFilter || undefined,
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate,
                    page: pageNum,
                    limit,
                });
                if (isStale?.()) return;
                const list = res.transactions || [];
                setTransactions((prev) => (append ? [...prev, ...list] : list));
                setTotalPages(res.pagination?.totalPages ?? 1);
                setPage(pageNum);
            } catch (e: any) {
                if (isStale?.()) return;
                setError(e?.message || 'Failed to load');
                if (!append) setTransactions([]);
            } finally {
                if (!isStale?.()) {
                    setLoading(false);
                    setRefreshing(false);
                    setLoadingMore(false);
                }
            }
        },
        [typeFilter, statusFilter, dateRange.startDate, dateRange.endDate]
    );

    const loadInitial = useCallback(
        (isStale?: () => boolean) => {
            setLoading(true);
            loadPage(1, false, isStale);
        },
        [loadPage]
    );

    const loadMore = useCallback(() => {
        if (loadingMore || page >= totalPages) return;
        setLoadingMore(true);
        loadPage(page + 1, true);
    }, [loadPage, loadingMore, page, totalPages]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadPage(1, false);
    }, [loadPage]);

    React.useEffect(() => {
        effectIdRef.current += 1;
        const thisId = effectIdRef.current;
        const isStale = () => effectIdRef.current !== thisId;
        loadInitial(isStale);
    }, [typeFilter, statusFilter, datePreset]);

    const isArabic = language === 'ar';
    const hasMore = page < totalPages;

    const filteredTransactions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return transactions;
        return transactions.filter((item) => {
            const tenantName = (isArabic ? item.tenant?.name_ar : item.tenant?.name_en) || item.tenant?.name || '';
            const svcName = item.appointment?.service ? (isArabic ? item.appointment.service.name_ar : item.appointment.service.name_en) || '' : '';
            const orderNum = item.order?.orderNumber || (item.orderId ? item.orderId.slice(0, 8).toUpperCase() : '');
            const typeLabel = (t(`transactionType_${item.type}` as any) || item.type).toLowerCase();
            const statusLabel = (t(`transactionStatus_${item.status}` as any) || item.status).toLowerCase();
            const amountStr = String(item.amount);
            const searchable = [tenantName, svcName, orderNum, typeLabel, statusLabel, amountStr].join(' ').toLowerCase();
            return searchable.includes(q);
        });
    }, [transactions, searchQuery, isArabic, t]);

    const renderTransactionCard = ({ item }: { item: Transaction }) => {
        const dateStr = item.createdAt
            ? format(new Date(item.createdAt), 'd MMM yyyy', { locale: isArabic ? ar : enUS })
            : '';
        const typeKey = `transactionType_${item.type}`;
        const statusKey = `transactionStatus_${item.status}`;
        const typeLabel = t(typeKey as any) || item.type;
        const statusLabel = t(statusKey as any) || item.status;
        const tenantName =
            (isArabic ? item.tenant?.name_ar : item.tenant?.name_en) || item.tenant?.name || '';
        const isRefundOrCredit = item.type === 'refund' || item.type === 'wallet_topup' || item.type === 'loyalty_redemption';
        const amountStr = `${isRefundOrCredit ? '+' : '-'} ${item.amount} ${item.currency || 'SAR'}`;

        let subtitle = tenantName;
        if (item.type === 'booking' && item.appointment?.service) {
            const svc = item.appointment.service;
            const svcName = isArabic ? svc.name_ar : svc.name_en;
            if (svcName) subtitle = `${tenantName} · ${svcName}`.trim();
        } else if (item.type === 'product_purchase') {
            const orderNum = item.order?.orderNumber || (item.orderId ? `#${item.orderId.slice(0, 8).toUpperCase()}` : '');
            subtitle = orderNum ? `${t('orderNumber')} ${orderNum}` : tenantName || t('productPurchase');
        }

        const statusBg = item.status === 'completed' ? colors.success + '18' : item.status === 'failed' ? colors.error + '18' : item.status === 'refunded' ? colors.textTertiary + '20' : colors.warning + '18';
        return (
            <TouchableOpacity
                style={[styles.card, isRTL && styles.cardRTL]}
                activeOpacity={0.9}
                onPress={() => {
                    if (item.appointmentId) navigation.navigate('AppointmentDetail', { appointmentId: item.appointmentId });
                    else if (item.orderId) navigation.navigate('OrderDetail', { orderId: item.orderId });
                }}
            >
                <View style={[styles.cardRow, isRTL && styles.cardRowRTL]}>
                    <View style={[styles.cardAccent, isRTL && styles.cardAccentRTL, { backgroundColor: isRefundOrCredit ? colors.success : colors.primary }]} />
                    <View style={styles.cardMain}>
                        <View style={[styles.cardTopRow, isRTL && styles.cardTopRowRTL]}>
                            <Text style={[styles.cardType, isRTL && styles.textRTL]}>{typeLabel}</Text>
                            <Text style={[styles.amount, { color: isRefundOrCredit ? colors.success : colors.text }]}>
                                {amountStr}
                            </Text>
                        </View>
                        <Text style={[styles.cardSubtitle, isRTL && styles.textRTL]} numberOfLines={1}>
                            {subtitle}
                        </Text>
                        <View style={[styles.cardMetaRow, isRTL && styles.cardMetaRowRTL]}>
                            <Text style={[styles.cardDate, isRTL && styles.textRTL]}>{dateStr}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                                <Text style={[styles.statusText, { color: item.status === 'completed' ? colors.success : item.status === 'failed' ? colors.error : colors.textSecondary }]}>
                                    {statusLabel}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const hasActiveFilters = !!(typeFilter || statusFilter || datePreset);

    const listHeader = (
        <>
            <View style={[styles.searchRow, isRTL && styles.searchRowRTL]}>
                <TextInput
                    style={[styles.searchInput, isRTL && styles.textRTL]}
                    placeholder={t('searchPayments')}
                    placeholderTextColor={colors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                <TouchableOpacity
                    style={styles.filterIconBtn}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Ionicons name="options-outline" size={24} color={colors.text} />
                    {hasActiveFilters && <View style={[styles.filterBadge, isRTL && styles.filterBadgeRTL]} />}
                </TouchableOpacity>
            </View>
            {error && !loading && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => loadInitial()}>
                        <Text style={styles.retryBtnText}>{t('retry')}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </>
    );

    const listEmpty =
        !error && !loading ? (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💳</Text>
                <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('noPaymentsFound')}</Text>
                <Text style={[styles.emptyHint, isRTL && styles.textRTL]}>{t('adjustFilters')}</Text>
            </View>
        ) : null;

    const listFooter =
        hasMore && filteredTransactions.length > 0 ? (
            <TouchableOpacity style={styles.loadMore} onPress={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                    <Text style={styles.loadMoreText}>{t('viewAll')}</Text>
                )}
            </TouchableOpacity>
        ) : null;

    return (
        <View style={styles.container}>
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.backBtn, isRTL && styles.backBtnRTL]}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('paymentHistory')}</Text>
            </View>

            <FlatList
                data={filteredTransactions}
                renderItem={renderTransactionCard}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={listHeader}
                ListEmptyComponent={listEmpty}
                ListFooterComponent={listFooter}
                contentContainerStyle={filteredTransactions.length === 0 ? styles.scrollContent : styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            />

            {loading && !refreshing && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            )}

            <PaymentFilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                typeFilter={typeFilter}
                statusFilter={statusFilter}
                datePreset={datePreset}
                onApply={(type, status, date) => {
                    setTypeFilter(type);
                    setStatusFilter(status);
                    setDatePreset(date);
                    setFilterModalVisible(false);
                }}
                onClear={() => {
                    setTypeFilter('');
                    setStatusFilter('');
                    setDatePreset('');
                    setFilterModalVisible(false);
                    loadInitial();
                }}
                t={t}
                isRTL={isRTL}
            />
        </View>
    );
}

function PaymentFilterModal({
    visible,
    onClose,
    typeFilter,
    statusFilter,
    datePreset,
    onApply,
    onClear,
    t,
    isRTL,
}: {
    visible: boolean;
    onClose: () => void;
    typeFilter: '' | TransactionType;
    statusFilter: '' | TransactionStatus;
    datePreset: '' | DatePreset;
    onApply: (type: '' | TransactionType, status: '' | TransactionStatus, date: '' | DatePreset) => void;
    onClear: () => void;
    t: (key: any) => string;
    isRTL: boolean;
}) {
    const [tempType, setTempType] = useState<'' | TransactionType>(typeFilter);
    const [tempStatus, setTempStatus] = useState<'' | TransactionStatus>(statusFilter);
    const [tempDate, setTempDate] = useState<'' | DatePreset>(datePreset);

    React.useEffect(() => {
        if (visible) {
            setTempType(typeFilter);
            setTempStatus(statusFilter);
            setTempDate(datePreset);
        }
    }, [visible, typeFilter, statusFilter, datePreset]);

    const handleApply = () => onApply(tempType, tempStatus, tempDate);
    const handleClear = () => onClear();

    const chip = (label: string, selected: boolean, onPress: () => void) => (
        <TouchableOpacity
            key={label}
            style={[styles.modalChip, selected && styles.modalChipSelected]}
            onPress={onPress}
        >
            <Text style={[styles.modalChipText, selected && styles.modalChipTextSelected]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} transparent animationType="fade">
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <View style={[styles.modalContent, isRTL && styles.modalContentRTL]} onStartShouldSetResponder={() => true}>
                    <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t('filters')}</Text>
                    <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                        <Text style={[styles.modalLabel, isRTL && styles.textRTL]}>{t('filterByType')}</Text>
                        <View style={[styles.modalChipsRow, isRTL && styles.modalChipsRowRTL]}>
                            {TYPE_OPTIONS.map((opt) => chip(t(opt.key as any), tempType === opt.value, () => setTempType(opt.value)))}
                        </View>
                        <Text style={[styles.modalLabel, isRTL && styles.textRTL]}>{t('filterByStatus')}</Text>
                        <View style={[styles.modalChipsRow, isRTL && styles.modalChipsRowRTL]}>
                            {STATUS_OPTIONS.map((opt) => chip(t(opt.key as any), tempStatus === opt.value, () => setTempStatus(opt.value)))}
                        </View>
                        <Text style={[styles.modalLabel, isRTL && styles.textRTL]}>{t('filterByDate')}</Text>
                        <View style={[styles.modalChipsRow, isRTL && styles.modalChipsRowRTL]}>
                            {chip(t('last7Days'), tempDate === 'last7', () => setTempDate('last7'))}
                            {chip(t('last30Days'), tempDate === 'last30', () => setTempDate('last30'))}
                            {chip(t('thisMonth'), tempDate === 'thisMonth', () => setTempDate('thisMonth'))}
                            {chip(t('custom'), tempDate === 'custom', () => setTempDate('custom'))}
                        </View>
                    </ScrollView>
                    <View style={[styles.modalActions, isRTL && styles.modalActionsRTL]}>
                        <TouchableOpacity style={styles.modalClearBtn} onPress={handleClear}>
                            <Text style={styles.modalClearBtnText}>{t('clear')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalApplyBtn} onPress={handleApply}>
                            <Text style={styles.modalApplyBtnText}>{t('apply')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
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
    headerRTL: { flexDirection: 'row-reverse' },
    backBtn: { padding: spacing.sm, marginRight: spacing.sm },
    backBtnRTL: { marginRight: 0, marginLeft: spacing.sm },
    headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, flex: 1 },
    scrollContent: { flexGrow: 1, paddingBottom: spacing.xl * 2 },
    listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl * 2 },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    searchRowRTL: { flexDirection: 'row-reverse' },
    searchInput: {
        flex: 1,
        height: 44,
        backgroundColor: colors.backgroundGray,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        fontSize: fontSize.sm,
        color: colors.text,
    },
    filterIconBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    filterBadgeRTL: { right: undefined, left: 8 },
    card: {
        backgroundColor: colors.surface,
        marginBottom: spacing.md,
        paddingVertical: spacing.md,
        paddingLeft: 0,
        paddingRight: spacing.md,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        ...shadows.sm,
    },
    cardRTL: { paddingLeft: spacing.md, paddingRight: 0 },
    cardRow: { flexDirection: 'row', alignItems: 'stretch' },
    cardRowRTL: { flexDirection: 'row-reverse' },
    cardAccent: {
        width: 4,
        borderRadius: 2,
        marginRight: spacing.md,
    },
    cardAccentRTL: { marginRight: 0, marginLeft: spacing.md },
    cardMain: { flex: 1, minWidth: 0 },
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
    cardTopRowRTL: { flexDirection: 'row-reverse' },
    cardType: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
    cardSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
    cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardMetaRowRTL: { flexDirection: 'row-reverse' },
    cardDate: { fontSize: fontSize.xs, color: colors.textTertiary },
    amount: { fontSize: fontSize.md, fontWeight: '700' },
    statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm },
    statusText: { fontSize: fontSize.xs, fontWeight: '600' },
    textRTL: { textAlign: 'right' },
    errorBox: { padding: spacing.lg, alignItems: 'center' },
    errorText: { fontSize: fontSize.sm, color: colors.error, marginBottom: spacing.sm },
    retryBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.md },
    retryBtnText: { color: colors.textInverse, fontWeight: '600' },
    emptyContainer: { padding: spacing.xl * 2, alignItems: 'center' },
    emptyIcon: { fontSize: 48, marginBottom: spacing.md },
    emptyText: { fontSize: fontSize.lg, color: colors.text, marginBottom: spacing.sm },
    emptyHint: { fontSize: fontSize.sm, color: colors.textSecondary },
    loadMore: { padding: spacing.lg, alignItems: 'center' },
    loadMoreText: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlayLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        maxHeight: '80%',
    },
    modalContentRTL: { direction: 'rtl' },
    modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
    modalScroll: { maxHeight: 320 },
    modalLabel: {
        fontSize: fontSize.xs,
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    },
    modalChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
    modalChipsRowRTL: { flexDirection: 'row-reverse' },
    modalChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: colors.backgroundGray,
    },
    modalChipSelected: { backgroundColor: colors.primary },
    modalChipText: { fontSize: fontSize.sm, color: colors.text },
    modalChipTextSelected: { fontSize: fontSize.sm, color: colors.textInverse },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
    modalActionsRTL: { flexDirection: 'row-reverse' },
    modalClearBtn: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: colors.backgroundGray,
    },
    modalClearBtnText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
    modalApplyBtn: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: colors.primary,
    },
    modalApplyBtnText: { fontSize: fontSize.sm, color: colors.textInverse, fontWeight: '600' },
});
