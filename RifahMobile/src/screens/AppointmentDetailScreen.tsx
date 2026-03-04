import React, { useState, useCallback } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize, borderRadius } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { api, Booking, getImageUrl } from '../api/client';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

function getStatusColor(status: string): string {
    switch (status) {
        case 'confirmed': return colors.success;
        case 'pending': return colors.warning;
        case 'cancelled': return colors.error;
        case 'completed': return colors.info;
        default: return colors.textSecondary;
    }
}

export function AppointmentDetailScreen({ route, navigation }: any) {
    const { appointmentId, appointment: initialAppointment } = route?.params || {};
    const { t, language, isRTL } = useLanguage();
    const [appointment, setAppointment] = useState<Booking | null>(initialAppointment || null);
    const [loading, setLoading] = useState(!initialAppointment);
    const [reminderUpdating, setReminderUpdating] = useState(false);

    const loadAppointment = useCallback(async () => {
        if (!appointmentId) return;
        try {
            setLoading(true);
            const data = await api.getBooking(appointmentId);
            setAppointment(data);
        } catch (e) {
            console.error('Failed to load appointment', e);
            Alert.alert(t('error') || 'Error', (e as Error)?.message || 'Failed to load appointment');
        } finally {
            setLoading(false);
        }
    }, [appointmentId, t]);

    useFocusEffect(
        useCallback(() => {
            loadAppointment();
        }, [loadAppointment])
    );

    const handleCancel = () => {
        if (!appointment?.id) return;
        Alert.alert(
            t('cancelBooking'),
            t('cancelBookingConfirm'),
            [
                { text: t('no'), style: 'cancel' },
                {
                    text: t('yes'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await api.cancelBooking(appointment.id);
                            if (result.success) {
                                let msg = t('bookingCancelled');
                                if (result.refundAmount != null && result.refundAmount > 0) {
                                    msg += ` ${language === 'ar' ? 'المبلغ المسترد:' : 'Refund:'} ${result.refundAmount} SAR.`;
                                }
                                if (result.feeRetained != null && result.feeRetained > 0) {
                                    msg += ` ${language === 'ar' ? 'رسوم الإلغاء:' : 'Cancellation fee:'} ${result.feeRetained} SAR.`;
                                }
                                Alert.alert(t('success'), msg, [
                                    { text: 'OK', onPress: () => navigation.goBack() }
                                ]);
                            }
                        } catch (error) {
                            Alert.alert(t('error'), t('failedToCancel'));
                        }
                    },
                },
            ]
        );
    };

    if (loading && !appointment) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!appointment) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{language === 'ar' ? 'لم يتم العثور على الحجز' : 'Appointment not found'}</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>{language === 'ar' ? 'رجوع' : 'Go back'}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const service = appointment.service || (appointment as any).Service;
    const staff = appointment.staff || (appointment as any).Staff;
    const tenant = appointment.tenant;
    const isArabic = language === 'ar';
    const dateDate = new Date(appointment.startTime);
    const paymentStatus = (appointment.paymentStatus || '').toLowerCase();
    const remainderAmount = appointment.remainderAmount != null ? Number(appointment.remainderAmount) : null;
    const isPaid =
        paymentStatus === 'fully_paid' ||
        paymentStatus === 'paid' ||
        paymentStatus === 'refunded' ||
        paymentStatus === 'partially_refunded' ||
        (paymentStatus === 'deposit_paid' && (appointment.remainderPaid === true || (remainderAmount != null && remainderAmount === 0)));
    const showPayNow = !isPaid && appointment.status !== 'cancelled';
    const totalPaid = appointment.totalPaid != null ? Number(appointment.totalPaid) : 0;
    const remainder = appointment.remainderAmount != null ? Number(appointment.remainderAmount) : 0;
    const hoursUntilStart = (dateDate.getTime() - Date.now()) / (60 * 60 * 1000);
    const canReschedule = (appointment.status === 'confirmed' || appointment.status === 'pending') && hoursUntilStart > 24;
    const showReminder = (appointment.status === 'confirmed' || appointment.status === 'pending') && hoursUntilStart > 0;
    const reminderActive = !!appointment.reminder && appointment.reminder.sentAt == null;
    const reminderMinutes = appointment.reminder?.reminderMinutesBefore ?? 30;

    const REMINDER_OPTIONS = [30, 60, 120];
    const handleReminderToggle = async (on: boolean) => {
        if (!appointment?.id || reminderUpdating) return;
        setReminderUpdating(true);
        try {
            await api.updateBookingReminder(appointment.id, on, on ? reminderMinutes : undefined);
            const updated = await api.getBooking(appointment.id);
            setAppointment(updated);
        } catch (e) {
            Alert.alert(t('error') || 'Error', (e as Error)?.message || 'Failed to update reminder');
        } finally {
            setReminderUpdating(false);
        }
    };
    const handleReminderMinutesChange = async (mins: number) => {
        if (!appointment?.id || !reminderActive || reminderUpdating) return;
        setReminderUpdating(true);
        try {
            await api.updateBookingReminder(appointment.id, true, mins);
            const updated = await api.getBooking(appointment.id);
            setAppointment(updated);
        } catch (e) {
            Alert.alert(t('error') || 'Error', (e as Error)?.message || 'Failed to update reminder');
        } finally {
            setReminderUpdating(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{language === 'ar' ? 'تفاصيل الحجز' : 'Appointment details'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {tenant && (
                    <View style={styles.card}>
                        <View style={styles.tenantRow}>
                            {tenant.logo ? (
                                <Image source={{ uri: getImageUrl(tenant.logo) }} style={styles.tenantLogo} />
                            ) : (
                                <View style={[styles.tenantLogo, styles.placeholderLogo]}>
                                    <Text style={styles.placeholderText}>{tenant.name?.charAt(0) || 'S'}</Text>
                                </View>
                            )}
                            <Text style={styles.tenantName}>{tenant.name}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.card}>
                    <View style={styles.statusRow}>
                        <Text style={styles.label}>{language === 'ar' ? 'الحالة' : 'Status'}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
                                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </Text>
                        </View>
                    </View>
                    {service && (
                        <View style={styles.row}>
                            <Text style={styles.label}>{language === 'ar' ? 'الخدمة' : 'Service'}</Text>
                            <Text style={styles.value}>{isArabic ? service.name_ar : service.name_en}</Text>
                        </View>
                    )}
                    {staff && (
                        <View style={styles.row}>
                            <Text style={styles.label}>{t('specialist')}</Text>
                            <Text style={styles.value}>{staff.name}</Text>
                        </View>
                    )}
                    <View style={styles.row}>
                        <Text style={styles.label}>{language === 'ar' ? 'التاريخ' : 'Date'}</Text>
                        <Text style={styles.value}>{format(dateDate, 'eeee, d MMMM yyyy', { locale: isArabic ? ar : enUS })}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>{language === 'ar' ? 'الوقت' : 'Time'}</Text>
                        <Text style={styles.value}>{format(dateDate, 'h:mm a', { locale: isArabic ? ar : enUS })}</Text>
                    </View>
                    {appointment.duration != null && (
                        <View style={styles.row}>
                            <Text style={styles.label}>{language === 'ar' ? 'المدة' : 'Duration'}</Text>
                            <Text style={styles.value}>{appointment.duration} {t('mins')}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{language === 'ar' ? 'الدفع' : 'Payment'}</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>{language === 'ar' ? 'السعر الإجمالي' : 'Total price'}</Text>
                        <Text style={styles.value}>{Number(appointment.price)} SAR</Text>
                    </View>
                    {totalPaid > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>{language === 'ar' ? 'المدفوع' : 'Paid'}</Text>
                            <Text style={styles.value}>{totalPaid.toFixed(2)} SAR</Text>
                        </View>
                    )}
                    {remainder > 0 && !isPaid && (
                        <View style={styles.row}>
                            <Text style={styles.label}>{language === 'ar' ? 'المتبقي' : 'Remainder'}</Text>
                            <Text style={[styles.value, { color: colors.warning }]}>{remainder.toFixed(2)} SAR</Text>
                        </View>
                    )}
                </View>

                {appointment.notes ? (
                    <View style={styles.card}>
                        <Text style={styles.label}>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Text>
                        <Text style={styles.notesText}>{appointment.notes}</Text>
                    </View>
                ) : null}

                <View style={styles.actions}>
                    {showPayNow && (
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => navigation.navigate('Payment', {
                                appointmentId: appointment.id,
                                amount: remainder > 0 ? remainder : appointment.price,
                                tenantId: appointment.tenantId
                            })}
                        >
                            <Text style={styles.primaryButtonText}>{t('payNow')}</Text>
                        </TouchableOpacity>
                    )}
                    {canReschedule && (
                        <TouchableOpacity
                            style={styles.rescheduleButton}
                            onPress={() => navigation.navigate('Reschedule', {
                                appointmentId: appointment.id,
                                tenantId: appointment.tenantId,
                                serviceId: appointment.serviceId,
                                staffId: appointment.staffId
                            })}
                        >
                            <Text style={styles.rescheduleButtonText}>
                                {language === 'ar' ? 'إعادة الجدولة' : 'Reschedule'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    {appointment.status === 'confirmed' && (
                        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                            <Text style={styles.cancelButtonText}>{t('cancel' as any)}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ height: spacing.xxl }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundGray },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.md },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: Platform.OS === 'ios' ? 56 : 20,
        paddingBottom: spacing.md,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerBack: { padding: spacing.sm },
    headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
    scroll: { padding: spacing.lg },
    backButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
    backButtonText: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
    card: {
        backgroundColor: '#fff',
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tenantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
    tenantLogo: { width: 48, height: 48, borderRadius: 24, marginRight: spacing.md },
    placeholderLogo: { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
    placeholderText: { fontSize: 20, fontWeight: '600', color: colors.textSecondary },
    tenantName: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: fontSize.sm, fontWeight: '600' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    label: { fontSize: fontSize.sm, color: colors.textSecondary },
    value: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
    sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
    notesText: { fontSize: fontSize.sm, color: colors.textSecondary },
    reminderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    reminderLabel: { fontSize: fontSize.md, color: colors.text },
    reminderOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    reminderChip: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.backgroundGray,
        borderWidth: 1,
        borderColor: colors.border,
    },
    reminderChipSelected: { backgroundColor: colors.primaryLight + '40', borderColor: colors.primary },
    reminderChipText: { fontSize: fontSize.sm, color: colors.text },
    reminderChipTextSelected: { color: colors.primary, fontWeight: '600' },
    actions: { marginTop: spacing.md, gap: spacing.sm },
    primaryButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    primaryButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
    rescheduleButton: {
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    rescheduleButtonText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
    cancelButton: {
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.error,
    },
    cancelButtonText: { color: colors.error, fontSize: fontSize.md, fontWeight: '600' },
});
