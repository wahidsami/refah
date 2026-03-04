import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

const SECTIONS: { title: 'termsAcceptance' | 'termsUseOfService' | 'termsUserObligations' | 'termsPayments' | 'termsCancellation' | 'termsLiability' | 'termsChanges' | 'termsContact'; body: 'termsAcceptanceBody' | 'termsUseBody' | 'termsUserBody' | 'termsPaymentsBody' | 'termsCancellationBody' | 'termsLiabilityBody' | 'termsChangesBody' | 'termsContactBody' }[] = [
    { title: 'termsAcceptance', body: 'termsAcceptanceBody' },
    { title: 'termsUseOfService', body: 'termsUseBody' },
    { title: 'termsUserObligations', body: 'termsUserBody' },
    { title: 'termsPayments', body: 'termsPaymentsBody' },
    { title: 'termsCancellation', body: 'termsCancellationBody' },
    { title: 'termsLiability', body: 'termsLiabilityBody' },
    { title: 'termsChanges', body: 'termsChangesBody' },
    { title: 'termsContact', body: 'termsContactBody' },
];

export function TermsScreen() {
    const navigation = useNavigation<any>();
    const { t, isRTL } = useLanguage();

    return (
        <View style={styles.container}>
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('termsOfService')}</Text>
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {SECTIONS.map(({ title, body }, i) => (
                    <View key={i} style={styles.section}>
                        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t(title)}</Text>
                        <Text style={[styles.sectionBody, isRTL && styles.textRTL]}>{t(body)}</Text>
                    </View>
                ))}
                <View style={{ height: spacing.xl * 2 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, paddingTop: spacing.xl + 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: colors.border },
    headerRTL: { flexDirection: 'row-reverse' },
    backBtn: { padding: spacing.sm, marginRight: spacing.sm },
    headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl },
    section: { marginBottom: spacing.xl },
    sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
    sectionBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },
    textRTL: { textAlign: 'right' },
});
