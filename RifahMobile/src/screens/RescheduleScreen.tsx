import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize, borderRadius } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { api, SlotItem } from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface RescheduleScreenProps {
    route: { params: { appointmentId: string; tenantId: string; serviceId: string; staffId?: string } };
    navigation: any;
}

const DAYS_AHEAD = 30;

export function RescheduleScreen({ route, navigation }: RescheduleScreenProps) {
    const { appointmentId, tenantId, serviceId, staffId: initialStaffId } = route.params || {};
    const { language, isRTL } = useLanguage();
    const today = startOfDay(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(today);
    const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
    const [slots, setSlots] = useState<SlotItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!tenantId || !serviceId || !selectedDate) return;
        loadSlots();
    }, [tenantId, serviceId, selectedDate, initialStaffId]);

    const loadSlots = async () => {
        setLoading(true);
        setSlots([]);
        setSelectedSlot(null);
        try {
            const response = await api.post<{ slots: SlotItem[] }>('/bookings/search', {
                tenantId,
                serviceId,
                date: format(selectedDate, 'yyyy-MM-dd'),
                staffId: initialStaffId || undefined,
            });
            const available = (response.slots || []).filter(s => s.available);
            setSlots(available);
        } catch (error: any) {
            console.error('Failed to load slots', error);
            Alert.alert(language === 'ar' ? 'خطأ' : 'Error', error.message || 'Could not load time slots');
        } finally {
            setLoading(false);
        }
    };

    const handleReschedule = async () => {
        if (!selectedSlot || !appointmentId) return;
        try {
            setSubmitting(true);
            await api.rescheduleBooking(appointmentId, selectedSlot.startTime, selectedSlot.staffId);
            Alert.alert(
                language === 'ar' ? 'تم إعادة الجدولة' : 'Rescheduled',
                language === 'ar' ? 'تم تغيير موعد الحجز بنجاح.' : 'Your appointment has been rescheduled successfully.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            Alert.alert(language === 'ar' ? 'خطأ' : 'Error', error.message || 'Failed to reschedule');
        } finally {
            setSubmitting(false);
        }
    };

    const isArabic = language === 'ar';
    const dateOptions: Date[] = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
        dateOptions.push(addDays(today, i));
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{language === 'ar' ? 'إعادة الجدولة' : 'Reschedule'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionLabel}>{language === 'ar' ? 'اختر التاريخ' : 'Select date'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
                    {dateOptions.map((d) => {
                        const isSelected = isSameDay(d, selectedDate);
                        return (
                            <TouchableOpacity
                                key={d.toISOString()}
                                style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                                onPress={() => setSelectedDate(d)}
                            >
                                <Text style={[styles.dateChipDay, isSelected && styles.dateChipDaySelected]}>
                                    {format(d, 'EEE', { locale: isArabic ? ar : enUS })}
                                </Text>
                                <Text style={[styles.dateChipNum, isSelected && styles.dateChipNumSelected]}>
                                    {format(d, 'd')}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <Text style={styles.sectionLabel}>{language === 'ar' ? 'اختر الوقت' : 'Select time'}</Text>
                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                ) : (
                    <View style={styles.slotGrid}>
                        {slots.map((slot) => {
                            const isSelected = selectedSlot?.startTime === slot.startTime;
                            const slotTime = format(new Date(slot.startTime), 'h:mm a', { locale: isArabic ? ar : enUS });
                            return (
                                <TouchableOpacity
                                    key={slot.startTime}
                                    style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                                    onPress={() => setSelectedSlot(slot)}
                                >
                                    <Text style={[styles.slotChipText, isSelected && styles.slotChipTextSelected]}>
                                        {slotTime}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                        {slots.length === 0 && !loading && (
                            <Text style={styles.noSlots}>
                                {language === 'ar' ? 'لا توجد أوقات متاحة في هذا اليوم' : 'No available times for this day'}
                            </Text>
                        )}
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.confirmButton, (!selectedSlot || submitting) && styles.confirmButtonDisabled]}
                    onPress={handleReschedule}
                    disabled={!selectedSlot || submitting}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.confirmButtonText}>
                            {language === 'ar' ? 'تأكيد الموعد الجديد' : 'Confirm new time'}
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundGray },
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
    sectionLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
    dateRow: { marginBottom: spacing.xl, flexGrow: 0 },
    dateChip: {
        width: 56,
        paddingVertical: spacing.sm,
        marginRight: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    dateChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    dateChipDay: { fontSize: 12, color: colors.textSecondary },
    dateChipDaySelected: { color: '#fff' },
    dateChipNum: { fontSize: 18, fontWeight: '700', color: colors.text },
    dateChipNumSelected: { color: '#fff' },
    slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
    slotChip: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.border,
    },
    slotChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    slotChipText: { fontSize: fontSize.sm, color: colors.text },
    slotChipTextSelected: { color: '#fff', fontWeight: '600' },
    noSlots: { color: colors.textSecondary, fontSize: fontSize.sm },
    loader: { marginVertical: spacing.xl },
    confirmButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    confirmButtonDisabled: { opacity: 0.6 },
    confirmButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
});
