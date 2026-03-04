import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize, borderRadius } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { api, Service, Staff, SlotItem } from '../api/client';
import { getImageUrl } from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import type { TenantTheme } from './TenantScreen';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface BookingProps {
    route: any;
    navigation: any;
}

type BookingStep = 'staff' | 'datetime' | 'review' | 'payment';

const defaultTheme = { primaryColor: colors.primary, secondaryColor: colors.secondary, helperColor: colors.accent };

export function BookingFlow({ route, navigation }: BookingProps) {
    const params = route?.params || {};
    const service = params.service;
    const tenant = params.tenant;
    const tenantTheme: TenantTheme = params.tenantTheme || defaultTheme;
    const { t, isRTL, language } = useLanguage();
    const [step, setStep] = useState<BookingStep>('staff');
    const [loading, setLoading] = useState(false);
    const [paymentOption, setPaymentOption] = useState<'pay_50_now' | 'pay_full_online' | 'pay_at_center'>('pay_full_online');

    // Selection State
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null); // null = Any
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
    const [selectedTime, setSelectedTime] = useState<SlotItem | null>(null);
    const [availableSlots, setAvailableSlots] = useState<SlotItem[]>([]);

    const tenantId = tenant?.id;
    const serviceId = service?.id;
    const hasRequiredParams = Boolean(tenantId && serviceId);

    useFocusEffect(
        useCallback(() => {
            const preselectedStaffId = route.params?.preselectedStaffId;
            if (preselectedStaffId && staffList.length > 0) {
                const found = staffList.find((s) => s.id === preselectedStaffId);
                if (found) setSelectedStaff(found);
                navigation.setParams({ preselectedStaffId: undefined });
            }
        }, [staffList, route.params?.preselectedStaffId, navigation])
    );

    useEffect(() => {
        if (!hasRequiredParams) return;
        loadStaff();
    }, [hasRequiredParams]);

    useEffect(() => {
        if (step === 'datetime' && hasRequiredParams) {
            loadTimeSlots();
        }
    }, [selectedDate, step, hasRequiredParams]);

    const loadStaff = async () => {
        if (!tenantId || !serviceId) return;
        try {
            setLoading(true);
            const byServiceRes = await api.get<{ success: boolean; staff: Staff[] }>(
                `/public/tenant/${tenantId}/services/${serviceId}/staff`
            );
            const byService = byServiceRes?.success && Array.isArray(byServiceRes.staff) && byServiceRes.staff.length > 0
                ? byServiceRes.staff
                : null;
            if (byService && byService.length > 0) {
                setStaffList(byService);
                return;
            }
            const response = await api.get<{ success: boolean; staff: Staff[] }>(
                `/public/tenant/${tenantId}/staff`
            );
            if (response.success) {
                setStaffList(response.staff || []);
            }
        } catch (error) {
            console.error('Failed to load staff:', error);
            try {
                const fallback = await api.get<{ success: boolean; staff: Staff[] }>(
                    `/public/tenant/${tenantId}/staff`
                );
                if (fallback?.success) setStaffList(fallback.staff || []);
            } catch {
                setStaffList([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadTimeSlots = async () => {
        if (!tenantId || !serviceId) {
            Alert.alert(
                language === 'ar' ? 'خطأ' : 'Error',
                language === 'ar' ? 'معلومات المركز أو الخدمة ناقصة. يرجى العودة والمحاولة مرة أخرى.' : 'Salon or service info is missing. Please go back and try again.'
            );
            return;
        }
        setLoading(true);
        setAvailableSlots([]);
        setSelectedTime(null);
        try {
            const response = await api.post<{ slots: SlotItem[]; metadata: any }>(
                '/bookings/search',
                {
                    tenantId,
                    serviceId,
                    date: format(selectedDate, 'yyyy-MM-dd'),
                    staffId: selectedStaff?.id || undefined,
                }
            );
            const available = (response.slots || []).filter(s => s.available);
            setAvailableSlots(available);
        } catch (error: any) {
            console.error('Failed to load time slots:', error);
            Alert.alert('Error', error.message || 'Could not load available time slots');
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (step === 'staff') setStep('datetime');
        else if (step === 'datetime') {
            if (!selectedTime) {
                Alert.alert('Select a Time', 'Please select an available time slot');
                return;
            }
            setStep('review');
        }
        else if (step === 'review') setStep('payment');
    };

    const handleBack = () => {
        if (step === 'payment') setStep('review');
        else if (step === 'review') setStep('datetime');
        else if (step === 'datetime') setStep('staff');
        else navigation.goBack();
    };

    if (!hasRequiredParams) {
        return (
            <View style={styles.container}>
                <View style={[styles.header, { justifyContent: 'flex-start' }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { flex: 1 }]}>{language === 'ar' ? 'الحجز' : 'Booking'}</Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl, alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg }}>
                        {language === 'ar' ? 'معلومات المركز أو الخدمة ناقصة. يرجى العودة واختيار الخدمة مرة أخرى.' : 'Salon or service info is missing. Please go back and select the service again.'}
                    </Text>
                </View>
            </View>
        );
    }

    const handleBooking = async () => {
        if (!selectedTime) return;
        try {
            setLoading(true);
            const res = await api.post<{ success: boolean; appointment?: any }>('/bookings/create', {
                serviceId: serviceId!,
                tenantId: tenantId!,
                staffId: selectedTime.staffId || selectedStaff?.id || undefined,
                startTime: selectedTime.startTime,
                paymentIntent: paymentOption === 'pay_50_now' ? 'deposit' : 'full',
            });
            const appointment = res?.appointment;
            if (!appointment) {
                Alert.alert('Booking Failed', 'No appointment data returned.');
                return;
            }
            if (paymentOption === 'pay_at_center') {
                Alert.alert(
                    language === 'ar' ? 'تم تأكيد الحجز' : 'Booking Confirmed! 🎉',
                    language === 'ar' ? 'يرجى الدفع في المركز.' : 'Please pay at the center.',
                    [{ text: language === 'ar' ? 'عرض الحجوزات' : 'View My Bookings', onPress: () => navigation.navigate('Tabs', { screen: 'Appointments' }) }]
                );
                return;
            }
            const fullPrice = parseFloat(appointment.price || service.basePrice || service.finalPrice || 0);
            const depositAmount = appointment.depositAmount != null ? parseFloat(appointment.depositAmount) : 0;
            const amountToPay = paymentOption === 'pay_50_now' && depositAmount > 0 ? depositAmount : fullPrice;
            navigation.navigate('Payment', {
                appointmentId: appointment.id,
                amount: amountToPay,
                tenantId: tenant.id,
                serviceName: isRTL ? service.name_ar : service.name_en,
                staffName: selectedStaff?.name || '',
                dateTime: selectedTime.startTime,
                tenant,
                tenantTheme,
            });
        } catch (error: any) {
            const msg = error.message || 'Failed to create booking';
            Alert.alert('Booking Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    const renderStaffSelection = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Specialist</Text>
            <TouchableOpacity
                style={[styles.staffCard, selectedStaff === null && { borderColor: tenantTheme.primaryColor, backgroundColor: tenantTheme.primaryColor + '18' }]}
                onPress={() => setSelectedStaff(null)}
            >
                <View style={styles.avatarPlaceholder}>
                    <Ionicons name="people" size={24} color={tenantTheme.primaryColor} />
                </View>
                <View>
                    <Text style={styles.staffName}>Any Professional</Text>
                    <Text style={styles.staffRole}>Maximum Availability</Text>
                </View>
                {selectedStaff === null && <Ionicons name="checkmark-circle" size={24} color={tenantTheme.primaryColor} />}
            </TouchableOpacity>

            {staffList.map(staff => {
                const avatarUri = staff.image || (staff as any).avatar ? getImageUrl(staff.image || (staff as any).avatar) : null;
                const isSelected = selectedStaff?.id === staff.id;
                return (
                <View
                    key={staff.id}
                    style={[styles.staffCard, isSelected && { borderColor: tenantTheme.primaryColor, backgroundColor: tenantTheme.primaryColor + '18' }]}
                >
                    <TouchableOpacity
                        style={styles.staffCardMain}
                        onPress={() => navigation.navigate('EmployeeDetail', { staff, tenantId, tenant, tenantTheme, fromBookingFlow: true, service })}
                    >
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.staffAvatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={{ fontSize: 18 }}>{staff.name.charAt(0)}</Text>
                            </View>
                        )}
                        <View style={styles.staffCardInfo}>
                            <Text style={styles.staffName}>{staff.name}</Text>
                            <Text style={styles.staffRole}>{staff.role || staff.specialty || 'Specialist'}</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.staffSelectBtn, { borderColor: tenantTheme.primaryColor }]}
                        onPress={() => setSelectedStaff(staff)}
                    >
                        <Text style={[styles.staffSelectBtnText, { color: tenantTheme.primaryColor }]}>
                            {language === 'ar' ? 'اختر' : 'Select'}
                        </Text>
                    </TouchableOpacity>
                    {isSelected && <Ionicons name="checkmark-circle" size={24} color={tenantTheme.primaryColor} style={styles.staffCheck} />}
                </View>
                );
            })}
        </View>
    );

    const renderDateTimeSelection = () => {
        const dates = Array.from({ length: 14 }).map((_, i) => addDays(startOfToday(), i)); // Next 2 weeks

        return (
            <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Select Date & Time</Text>

                {/* Horizontal Date Picker */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datePicker}>
                    {dates.map(date => {
                        const isSelected = isSameDay(date, selectedDate);
                        return (
                            <TouchableOpacity
                                key={date.toString()}
                                style={[styles.dateCard, isSelected && { backgroundColor: tenantTheme.primaryColor, borderColor: tenantTheme.primaryColor }]}
                                onPress={() => {
                                    setSelectedDate(date);
                                    setSelectedTime(null);
                                }}
                            >
                                <Text style={[styles.dayName, isSelected && styles.selectedDateText]}>
                                    {format(date, 'EEE', { locale: isRTL ? ar : enUS })}
                                </Text>
                                <Text style={[styles.dayNumber, isSelected && styles.selectedDateText]}>
                                    {format(date, 'd')}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <Text style={styles.subTitle}>Available Slots</Text>
                <View style={styles.slotsGrid}>
                    {availableSlots.length === 0 && !loading && (
                        <Text style={styles.summaryLabel}>No available slots for this date.</Text>
                    )}
                    {availableSlots.map(slot => {
                        const label = format(new Date(slot.startTime), 'HH:mm');
                        const isSelected = selectedTime?.startTime === slot.startTime;
                        return (
                            <TouchableOpacity
                                key={slot.startTime}
                                style={[styles.slot, isSelected && { backgroundColor: tenantTheme.primaryColor, borderColor: tenantTheme.primaryColor }]}
                                onPress={() => setSelectedTime(slot)}
                            >
                                <Text style={[styles.slotText, isSelected && styles.selectedSlotText]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderReview = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Review Booking</Text>

            <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Service</Text>
                    <Text style={styles.summaryValue}>{isRTL ? service.name_ar : service.name_en}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Specialist</Text>
                    <Text style={styles.summaryValue}>{selectedStaff ? selectedStaff.name : 'Any Professional'}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Date</Text>
                    <Text style={styles.summaryValue}>{format(selectedDate, 'PPP', { locale: isRTL ? ar : enUS })}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Time</Text>
                    <Text style={styles.summaryValue}>
                        {selectedTime ? format(new Date(selectedTime.startTime), 'HH:mm') : ''}
                    </Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={[styles.totalValue, { color: tenantTheme.primaryColor }]}>{(service.basePrice ?? service.finalPrice ?? 0)} SAR</Text>
                </View>
            </View>

            <Text style={[styles.stepTitle, { marginTop: spacing.lg }]}>{language === 'ar' ? 'طريقة الدفع' : 'Payment option'}</Text>
            <TouchableOpacity
                style={[styles.staffCard, paymentOption === 'pay_50_now' && { borderColor: tenantTheme.primaryColor, backgroundColor: tenantTheme.primaryColor + '18' }]}
                onPress={() => setPaymentOption('pay_50_now')}
            >
                <Text style={styles.summaryValue}>{language === 'ar' ? 'ادفع 50٪ الآن (الباقي في المركز)' : 'Pay 50% now (rest at center)'}</Text>
                {paymentOption === 'pay_50_now' && <Ionicons name="checkmark-circle" size={24} color={tenantTheme.primaryColor} />}
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.staffCard, paymentOption === 'pay_full_online' && { borderColor: tenantTheme.primaryColor, backgroundColor: tenantTheme.primaryColor + '18' }]}
                onPress={() => setPaymentOption('pay_full_online')}
            >
                <Text style={styles.summaryValue}>{language === 'ar' ? 'ادفع 100٪ أونلاين' : 'Pay 100% online'}</Text>
                {paymentOption === 'pay_full_online' && <Ionicons name="checkmark-circle" size={24} color={tenantTheme.primaryColor} />}
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.staffCard, paymentOption === 'pay_at_center' && { borderColor: tenantTheme.primaryColor, backgroundColor: tenantTheme.primaryColor + '18' }]}
                onPress={() => setPaymentOption('pay_at_center')}
            >
                <Text style={styles.summaryValue}>{language === 'ar' ? 'ادفع بالكامل في المركز' : 'Pay full amount at center'}</Text>
                {paymentOption === 'pay_at_center' && <Ionicons name="checkmark-circle" size={24} color={tenantTheme.primaryColor} />}
            </TouchableOpacity>
        </View>
    );

    // Step 4: Payment handled by renderReview -> button triggers handleBooking for MVP
    // Or we could show payment methods here. For now, confirming booking directly.

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Booking</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: step === 'staff' ? '25%' : step === 'datetime' ? '50%' : '100%', backgroundColor: tenantTheme.primaryColor }]} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {step === 'staff' && renderStaffSelection()}
                {step === 'datetime' && renderDateTimeSelection()}
                {step === 'review' && renderReview()}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: tenantTheme.primaryColor }]} onPress={step === 'review' ? handleBooking : handleNext}>
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.buttonText}>
                            {step === 'review' ? 'Confirm & Pay' : t('next')}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
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
        padding: spacing.lg,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: fontSize.lg,
        fontWeight: 'bold',
        color: colors.text,
    },
    backButton: {
        padding: spacing.sm,
    },
    progressContainer: {
        height: 4,
        backgroundColor: '#E5E7EB',
        width: '100%',
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    content: {
        padding: spacing.lg,
    },
    stepContainer: {
        gap: spacing.md,
    },
    stepTitle: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.md,
    },
    staffCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: 'white',
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.sm,
        gap: spacing.sm,
    },
    staffCardMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    staffCardInfo: {
        flex: 1,
    },
    staffSelectBtn: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
    },
    staffSelectBtnText: {
        fontSize: fontSize.sm,
        fontWeight: '600',
    },
    staffCheck: {
        marginLeft: 0,
    },
    selectedCard: {
        borderColor: colors.primary,
        backgroundColor: '#F3E8FF',
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    staffAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F3F4F6',
    },
    staffName: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
    },
    staffRole: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    datePicker: {
        marginBottom: spacing.lg,
    },
    dateCard: {
        width: 70,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: spacing.md,
        backgroundColor: 'white',
    },
    selectedDateCard: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    dayName: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    dayNumber: {
        fontSize: fontSize.lg,
        fontWeight: 'bold',
        color: colors.text,
    },
    selectedDateText: {
        color: 'white',
    },
    subTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    slot: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: 'white',
        minWidth: '30%',
        alignItems: 'center',
    },
    selectedSlot: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    slotText: {
        color: colors.text,
    },
    selectedSlotText: {
        color: 'white',
        fontWeight: '600',
    },
    summaryCard: {
        backgroundColor: 'white',
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    summaryLabel: {
        color: colors.textSecondary,
        fontSize: fontSize.md,
    },
    summaryValue: {
        color: colors.text,
        fontSize: fontSize.md,
        fontWeight: '500',
    },
    totalRow: {
        marginTop: spacing.sm,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    totalLabel: {
        fontSize: fontSize.lg,
        fontWeight: 'bold',
        color: colors.text,
    },
    totalValue: {
        fontSize: fontSize.lg,
        fontWeight: 'bold',
        color: colors.primary,
    },
    footer: {
        padding: spacing.lg,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: fontSize.md,
        fontWeight: 'bold',
    },
});
