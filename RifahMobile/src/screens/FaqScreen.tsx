import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

const FAQ_ENTRIES = [
    { q: 'faqQ1' as const, a: 'faqA1' as const },
    { q: 'faqQ2' as const, a: 'faqA2' as const },
    { q: 'faqQ3' as const, a: 'faqA3' as const },
    { q: 'faqQ4' as const, a: 'faqA4' as const },
    { q: 'faqQ5' as const, a: 'faqA5' as const },
    { q: 'faqQ6' as const, a: 'faqA6' as const },
];

export function FaqScreen() {
    const navigation = useNavigation<any>();
    const { t, isRTL } = useLanguage();

    return (
        <View style={styles.container}>
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('faq')}</Text>
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {FAQ_ENTRIES.map(({ q, a }, i) => (
                    <View key={i} style={styles.entry}>
                        <Text style={[styles.question, isRTL && styles.textRTL]}>{t(q)}</Text>
                        <Text style={[styles.answer, isRTL && styles.textRTL]}>{t(a)}</Text>
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
    entry: { marginBottom: spacing.xl },
    question: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
    answer: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },
    textRTL: { textAlign: 'right' },
});
