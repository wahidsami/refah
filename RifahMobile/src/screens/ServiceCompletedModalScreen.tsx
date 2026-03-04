import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, Alert } from 'react-native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize, borderRadius } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../api/client';

export type ServiceCompletedType = 'remainder_due' | 'thank_you';

export type ServiceCompletedModalParams = {
    type: ServiceCompletedType;
    appointmentId?: string;
    tenantId?: string;
    remainderAmount?: string;
};

export function ServiceCompletedModalScreen({ navigation, route }: any) {
    const { t, language } = useLanguage();
    const params = (route?.params || {}) as ServiceCompletedModalParams;
    const { type, remainderAmount, appointmentId } = params;
    const isRTL = language === 'ar';
    const [step, setStep] = useState<'message' | 'tip'>('message');
    const [price, setPrice] = useState<number>(0);
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [customTip, setCustomTip] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (step === 'tip' && appointmentId) {
            setLoadingPrice(true);
            api.getBooking(appointmentId)
                .then((b) => setPrice(Number((b as any).price) || 0))
                .catch(() => setPrice(0))
                .finally(() => setLoadingPrice(false));
        }
    }, [step, appointmentId]);

    const isRemainderDue = type === 'remainder_due';
    const remainderNum = remainderAmount ? parseFloat(remainderAmount) : 0;

    const title = isRemainderDue
        ? (language === 'ar' ? 'تم إكمال الخدمة' : 'Service completed')
        : (language === 'ar' ? 'شكراً لزيارتك' : 'Thank you for your visit');

    const body = isRemainderDue
        ? (language === 'ar'
            ? `يرجى دفع المبلغ المتبقي ${remainderNum.toFixed(2)} ر.س عند الكاشير.`
            : `Please pay the remaining ${remainderNum.toFixed(2)} SAR at the cashier desk.`)
        : (language === 'ar' ? 'نتمنى رؤيتك مجدداً قريباً.' : 'We hope to see you again soon.');

    const goToBookings = () => {
        navigation.navigate('Tabs', { screen: 'Appointments' });
    };

    const leaveReview = () => {
        navigation.navigate('Tabs', { screen: 'Appointments' });
    };

    const tipOptions = price > 0 ? [
        { label: '5%', value: Math.round(price * 0.05 * 100) / 100 },
        { label: '10%', value: Math.round(price * 0.1 * 100) / 100 },
        { label: '15%', value: Math.round(price * 0.15 * 100) / 100 },
    ] : [];

    const submitTip = async (amount: number) => {
        if (!appointmentId || amount <= 0) return;
        setSubmitting(true);
        try {
            await api.addAppointmentTip(appointmentId, amount, 'cash');
            goToBookings();
        } catch (e: any) {
            Alert.alert(language === 'ar' ? 'خطأ' : 'Error', e?.message || 'Failed to submit tip');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isRemainderDue && step === 'tip' && appointmentId) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.container}>
                    <View style={[styles.card, isRTL && styles.cardRTL]}>
                        <Text style={[styles.title, isRTL && styles.textRTL]}>
                            {language === 'ar' ? 'هل ترغب في ترك إكرامية؟' : 'Would you like to leave a tip?'}
                        </Text>
                        {loadingPrice ? (
                            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.lg }} />
                        ) : (
                            <>
                                <View style={styles.tipRow}>
                                    {tipOptions.map((opt) => (
                                        <TouchableOpacity
                                            key={opt.label}
                                            style={styles.tipOption}
                                            onPress={() => submitTip(opt.value)}
                                            disabled={submitting}
                                        >
                                            <Text style={styles.tipOptionText}>{opt.label}</Text>
                                            <Text style={styles.tipOptionAmount}>{opt.value} SAR</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={styles.customRow}>
                                    <TextInput
                                        style={styles.customInput}
                                        placeholder={language === 'ar' ? 'مبلغ مخصص' : 'Custom'}
                                        keyboardType="decimal-pad"
                                        value={customTip}
                                        onChangeText={setCustomTip}
                                    />
                                    <TouchableOpacity
                                        style={styles.customSubmit}
                                        onPress={() => {
                                            const n = parseFloat(customTip);
                                            if (!Number.isNaN(n) && n > 0 && n <= price) submitTip(n);
                                            else Alert.alert('', language === 'ar' ? 'أدخل مبلغاً صالحاً' : 'Enter a valid amount');
                                        }}
                                        disabled={submitting}
                                    >
                                        <Text style={styles.primaryButtonText}>OK</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('message')} disabled={submitting}>
                                    <Text style={styles.secondaryButtonText}>{language === 'ar' ? 'تخطي' : 'Skip'}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <View style={[styles.card, isRTL && styles.cardRTL]}>
                    <View style={styles.iconWrap}>
                        <Text style={styles.emoji}>{isRemainderDue ? '💳' : '✅'}</Text>
                    </View>
                    <Text style={[styles.title, isRTL && styles.textRTL]}>{title}</Text>
                    <Text style={[styles.body, isRTL && styles.textRTL]}>{body}</Text>

                    <TouchableOpacity style={styles.primaryButton} onPress={goToBookings}>
                        <Text style={styles.primaryButtonText}>
                            {language === 'ar' ? 'عرض الحجوزات' : 'View my bookings'}
                        </Text>
                    </TouchableOpacity>

                    {!isRemainderDue && (
                        <TouchableOpacity style={styles.secondaryButton} onPress={leaveReview}>
                            <Text style={styles.secondaryButtonText}>
                                {t('leaveReview' as any) || 'Leave a review'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    {!isRemainderDue && appointmentId && (
                        <TouchableOpacity style={[styles.secondaryButton, styles.tipButton]} onPress={() => setStep('tip')}>
                            <Text style={styles.secondaryButtonText}>{language === 'ar' ? 'ترك إكرامية' : 'Leave a tip'}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.backgroundGray },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    cardRTL: { direction: 'rtl' },
    textRTL: { textAlign: 'right' },
    iconWrap: { marginBottom: spacing.lg },
    emoji: { fontSize: 56 },
    title: {
        fontSize: fontSize.xl,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    body: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
        textAlign: 'center',
    },
    primaryButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.md,
        width: '100%',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    primaryButtonText: {
        color: colors.textInverse,
        fontSize: fontSize.md,
        fontWeight: '600',
    },
    secondaryButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    secondaryButtonText: {
        color: colors.primary,
        fontSize: fontSize.sm,
        fontWeight: '600',
    },
    tipButton: { borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.md },
    tipRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
    tipOption: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.md, minWidth: 80, alignItems: 'center' },
    tipOptionText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
    tipOptionAmount: { fontSize: fontSize.xs, color: colors.textSecondary },
    customRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
    customInput: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, width: 100 },
    customSubmit: { backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md },
});
