import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Text as RNText,
    Image,
} from 'react-native';
import { getImageUrl } from '../api/client';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../api/client';

type NotifItem = {
    id: string;
    type: string;
    title: string;
    body: string | null;
    data: Record<string, string>;
    readAt: string | null;
    createdAt: string;
    tenantId: string | null;
};

export function NotificationsScreen() {
    const { t, language } = useLanguage();
    const navigation = useNavigation<any>();
    const [list, setList] = useState<NotifItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const load = useCallback(async (isRefresh = false) => {
        const p = isRefresh ? 1 : page;
        try {
            if (isRefresh) setRefreshing(true);
            else if (p === 1) setLoading(true);
            const res = await api.getNotifications(p, 30);
            setList(res.notifications);
            setTotalPages(res.pagination.totalPages);
            if (isRefresh) setPage(1);
        } catch (e) {
            console.warn('Failed to load notifications', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [page]);

    useFocusEffect(
        useCallback(() => {
            load(true);
        }, [])
    );

    const onItemPress = async (item: NotifItem) => {
        try {
            if (!item.readAt) await api.markNotificationRead(item.id);
        } catch (_) {}
        const data = item.data || {};
        if (data.tenantId) {
            if (data.linkType === 'service' && data.serviceId) {
                navigation.navigate('Tenant', { tenantId: data.tenantId, openServiceId: data.serviceId });
            } else {
                navigation.navigate('Tenant', { tenantId: data.tenantId, openTab: data.type === 'REVIEW_REPLY' ? 'reviews' : undefined });
            }
        } else if (data.appointmentId || item.type === 'booking_confirmed' || item.type === 'booking_cancelled') {
            navigation.navigate('Tabs', { screen: 'Appointments' });
        } else {
            navigation.navigate('Tabs', { screen: 'Me' });
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const iconForType = (type: string) => {
        if (type === 'booking_confirmed' || type === 'booking_cancelled') return '📅';
        if (type === 'review_reply') return '💬';
        if (type === 'marketing') return '📢';
        return '🔔';
    };

    if (loading && list.length === 0) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{language === 'ar' ? 'الإشعارات' : 'Notifications'}</Text>
            </View>
            <FlatList
                data={list}
                keyExtractor={(item) => item.id}
                contentContainerStyle={list.length === 0 ? styles.emptyList : styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>{language === 'ar' ? 'لا توجد إشعارات' : 'No notifications yet'}</Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />
                }
                renderItem={({ item }) => {
                    const logoUrl = item.data?.logoUrl ? (item.data.logoUrl.startsWith('http') ? item.data.logoUrl : getImageUrl(item.data.logoUrl)) : null;
                    return (
                    <TouchableOpacity
                        style={[styles.item, item.readAt ? styles.itemRead : styles.itemUnread]}
                        onPress={() => onItemPress(item)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.iconWrap}>
                            {logoUrl ? (
                                <Image source={{ uri: logoUrl }} style={styles.tenantLogo} resizeMode="cover" />
                            ) : (
                                <RNText style={styles.icon}>{iconForType(item.type)}</RNText>
                            )}
                        </View>
                        <View style={styles.itemBody}>
                            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                            {item.body ? <Text style={styles.itemSub} numberOfLines={2}>{item.body}</Text> : null}
                            <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
                        </View>
                    </TouchableOpacity>
                    );
                }}
            />
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
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        backgroundColor: '#FFF',
    },
    backBtn: { padding: spacing.sm, marginRight: spacing.sm },
    backText: { fontSize: fontSize.xl, color: colors.primary },
    headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
    list: { padding: spacing.md, paddingBottom: spacing.xl },
    emptyList: { flex: 1 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    emptyText: { fontSize: fontSize.md, color: colors.textSecondary },
    item: {
        flexDirection: 'row',
        padding: spacing.md,
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    itemRead: { opacity: 0.85 },
    itemUnread: { backgroundColor: '#F5F3FF' },
    iconWrap: { marginRight: spacing.md },
    icon: { fontSize: 24 },
    tenantLogo: { width: 40, height: 40, borderRadius: 20 },
    itemBody: { flex: 1 },
    itemTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: 2 },
    itemSub: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 4 },
    itemDate: { fontSize: 12, color: colors.textSecondary },
});
