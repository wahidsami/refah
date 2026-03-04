import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize, borderRadius } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { api, getImageUrl, Staff } from '../api/client';
import type { TenantTheme } from './TenantScreen';
import { Ionicons } from '@expo/vector-icons';

const defaultTheme: TenantTheme = { primaryColor: colors.primary, secondaryColor: colors.secondary, helperColor: colors.accent };

type TabType = 'details' | 'reviews';

export interface EmployeeDetailParams {
    staff: Staff;
    tenantId: string;
    tenant: { id: string; name?: string; name_en?: string; name_ar?: string };
    tenantTheme?: TenantTheme;
    fromBookingFlow?: boolean;
    service?: { id: string; name_en?: string; name_ar?: string };
}

interface EmployeeDetailScreenProps {
    route: { params: EmployeeDetailParams };
    navigation: any;
}

interface ReviewItem {
    id: string;
    rating: number;
    comment: string | null;
    customerName: string | null;
    staffReply: string | null;
    staffRepliedAt: string | null;
    createdAt: string;
    staff?: { id: string; name: string } | null;
    customerProfileImage?: string | null;
}

export function EmployeeDetailScreen({ route, navigation }: EmployeeDetailScreenProps) {
    const { staff: initialStaff, tenantId, tenant, tenantTheme: paramTheme, fromBookingFlow, service } = route.params;
    const tenantTheme = paramTheme || defaultTheme;
    const { t, isRTL, language } = useLanguage();

    const [staff, setStaff] = useState<Staff>(initialStaff);
    const [activeTab, setActiveTab] = useState<TabType>('details');
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsFetched, setReviewsFetched] = useState(false);

    useEffect(() => {
        api.getPublicStaffById(tenantId, initialStaff.id).then((s) => {
            if (s) setStaff(s);
        }).catch(() => {});
    }, [tenantId, initialStaff.id]);

    const loadReviews = useCallback(async () => {
        if (reviewsFetched) return;
        setReviewsLoading(true);
        try {
            const res = await api.getPublicReviews(tenantId, { staffId: staff.id });
            setReviews(res.reviews);
        } catch {
            setReviews([]);
        } finally {
            setReviewsLoading(false);
            setReviewsFetched(true);
        }
    }, [tenantId, staff.id, reviewsFetched]);

    useEffect(() => {
        if (activeTab === 'reviews') loadReviews();
    }, [activeTab, loadReviews]);

    const handleSelectSpecialist = () => {
        if (!fromBookingFlow || !service) return;
        navigation.navigate('Booking', {
            service,
            tenant,
            tenantTheme,
            preselectedStaffId: staff.id,
        });
    };

    const avatarUri = staff.image || (staff as any).avatar ? getImageUrl(staff.image || (staff as any).avatar) : null;
    const ratingNum = typeof staff.rating === 'number' ? staff.rating : parseFloat(String(staff.rating || 0)) || 0;
    const skills = Array.isArray(staff.skills) ? staff.skills : [];

    const labelDetails = language === 'ar' ? 'التفاصيل' : 'Details';
    const labelReviews = language === 'ar' ? 'التقييمات' : 'Reviews';
    const labelSelectThisSpecialist = language === 'ar' ? 'اختر' : 'Select';
    const labelBio = language === 'ar' ? 'نبذة' : 'Bio';
    const labelExperience = language === 'ar' ? 'الخبرة' : 'Experience';
    const labelSkills = language === 'ar' ? 'المهارات' : 'Skills';
    const labelNoReviewsYet = language === 'ar' ? 'لا توجد تقييمات بعد' : 'No reviews yet';
    const labelReplyFromBusiness = language === 'ar' ? 'رد من المركز' : 'Reply from business';
    const labelBookings = language === 'ar' ? 'حجوزات' : 'bookings';

    return (
        <View style={styles.container}>
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{staff.name}</Text>
                {fromBookingFlow ? (
                    <TouchableOpacity
                        onPress={handleSelectSpecialist}
                        style={[styles.selectBtn, { backgroundColor: tenantTheme.primaryColor }]}
                    >
                        <Text style={styles.selectBtnText}>{labelSelectThisSpecialist}</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 24 }} />
                )}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.hero}>
                    <View style={[styles.avatarWrap, { backgroundColor: tenantTheme.primaryColor + '22' }]}>
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.avatar} />
                        ) : (
                            <Text style={[styles.avatarLetter, { color: tenantTheme.primaryColor }]}>
                                {staff.name.charAt(0).toUpperCase()}
                            </Text>
                        )}
                    </View>
                    <Text style={styles.heroName}>{staff.name}</Text>
                    <View style={styles.heroMeta}>
                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Ionicons
                                    key={star}
                                    name={star <= Math.round(ratingNum) ? 'star' : 'star-outline'}
                                    size={20}
                                    color="#F59E0B"
                                />
                            ))}
                        </View>
                        <Text style={styles.ratingText}>{ratingNum.toFixed(1)}</Text>
                    </View>
                    {(staff.totalBookings != null && staff.totalBookings > 0) && (
                        <Text style={[styles.bookingsBadge, { color: tenantTheme.primaryColor }]}>
                            {staff.totalBookings} {labelBookings}
                        </Text>
                    )}
                </View>

                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'details' && { borderBottomColor: tenantTheme.primaryColor }]}
                        onPress={() => setActiveTab('details')}
                    >
                        <Text style={[styles.tabText, activeTab === 'details' && { color: tenantTheme.primaryColor }]}>
                            {labelDetails}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'reviews' && { borderBottomColor: tenantTheme.primaryColor }]}
                        onPress={() => setActiveTab('reviews')}
                    >
                        <Text style={[styles.tabText, activeTab === 'reviews' && { color: tenantTheme.primaryColor }]}>
                            {labelReviews}
                        </Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'details' && (
                    <View style={styles.detailsSection}>
                        {staff.bio ? (
                            <View style={styles.block}>
                                <Text style={styles.sectionTitle}>{labelBio}</Text>
                                <Text style={styles.bodyText}>{staff.bio}</Text>
                            </View>
                        ) : null}
                        {staff.experience ? (
                            <View style={styles.block}>
                                <Text style={styles.sectionTitle}>{labelExperience}</Text>
                                <Text style={styles.bodyText}>{staff.experience}</Text>
                            </View>
                        ) : null}
                        {skills.length > 0 ? (
                            <View style={styles.block}>
                                <Text style={styles.sectionTitle}>{labelSkills}</Text>
                                <View style={styles.skillsRow}>
                                    {skills.map((skill, idx) => (
                                        <View key={idx} style={[styles.skillChip, { backgroundColor: tenantTheme.primaryColor + '18' }]}>
                                            <Text style={[styles.skillChipText, { color: tenantTheme.primaryColor }]}>{skill}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ) : null}
                        {!staff.bio && !staff.experience && skills.length === 0 && (
                            <Text style={styles.bodyText}>{language === 'ar' ? 'لا توجد تفاصيل إضافية.' : 'No additional details.'}</Text>
                        )}
                    </View>
                )}

                {activeTab === 'reviews' && (
                    <View style={styles.reviewsSection}>
                        {reviewsLoading ? (
                            <ActivityIndicator size="large" color={tenantTheme.primaryColor} style={styles.loader} />
                        ) : reviews.length === 0 ? (
                            <Text style={styles.emptyText}>{labelNoReviewsYet}</Text>
                        ) : (
                            reviews.map((r) => {
                                const displayName = r.customerName || (language === 'ar' ? 'عميل' : 'Customer');
                                const initial = displayName.charAt(0).toUpperCase();
                                const avatarUriReview = r.customerProfileImage ? getImageUrl(r.customerProfileImage) : null;
                                return (
                                    <View key={r.id} style={styles.reviewCard}>
                                        <View style={[styles.reviewCardHeader, isRTL && styles.reviewCardHeaderRTL]}>
                                            <View style={[styles.reviewAvatar, { backgroundColor: tenantTheme.primaryColor + '22' }, isRTL ? styles.reviewAvatarRTL : null]}>
                                                {avatarUriReview ? (
                                                    <Image source={{ uri: avatarUriReview }} style={styles.reviewAvatarImage} />
                                                ) : (
                                                    <Text style={[styles.reviewAvatarText, { color: tenantTheme.primaryColor }]}>{initial}</Text>
                                                )}
                                            </View>
                                            <View style={styles.reviewCardHeaderContent}>
                                                <Text style={styles.reviewAuthor}>{displayName}</Text>
                                                <View style={styles.reviewRow}>
                                                    <View style={styles.reviewStars}>
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Ionicons key={star} name={star <= r.rating ? 'star' : 'star-outline'} size={16} color="#F59E0B" />
                                                        ))}
                                                    </View>
                                                    <Text style={styles.reviewDate}>
                                                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                                        {r.staffReply ? (
                                            <View style={[styles.reviewReply, { borderLeftColor: tenantTheme.primaryColor }]}>
                                                <Text style={styles.reviewReplyLabel}>{labelReplyFromBusiness}</Text>
                                                <Text style={styles.reviewReplyText}>{r.staffReply}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerRTL: { flexDirection: 'row-reverse' },
    backBtn: { padding: spacing.xs },
    headerTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginHorizontal: spacing.sm, textAlign: 'center' },
    selectBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md },
    selectBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: '#fff' },
    scrollContent: { paddingBottom: spacing.xl },
    hero: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
    avatarWrap: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
    avatar: { width: 96, height: 96, borderRadius: 48 },
    avatarLetter: { fontSize: 36, fontWeight: '700' },
    heroName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
    heroMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    starsRow: { flexDirection: 'row', gap: 2 },
    ratingText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
    bookingsBadge: { fontSize: fontSize.sm, marginTop: spacing.xs },
    tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: spacing.md },
    tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '600' },
    detailsSection: { padding: spacing.lg },
    block: { marginBottom: spacing.xl },
    sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
    bodyText: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },
    skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    skillChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
    skillChipText: { fontSize: fontSize.sm, fontWeight: '600' },
    reviewsSection: { padding: spacing.lg },
    loader: { marginVertical: spacing.xl },
    emptyText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
    reviewCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    reviewCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
    reviewCardHeaderRTL: { flexDirection: 'row-reverse' },
    reviewAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
    reviewAvatarRTL: { marginRight: 0, marginLeft: spacing.md },
    reviewAvatarImage: { width: 40, height: 40, borderRadius: 20 },
    reviewAvatarText: { fontSize: 18, fontWeight: '700' },
    reviewCardHeaderContent: { flex: 1 },
    reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
    reviewStars: { flexDirection: 'row', gap: 2 },
    reviewDate: { fontSize: fontSize.sm, color: colors.textSecondary },
    reviewAuthor: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: 2 },
    reviewComment: { fontSize: fontSize.md, color: colors.text, lineHeight: 22, marginBottom: spacing.sm },
    reviewReply: { borderLeftWidth: 3, paddingLeft: spacing.md, marginTop: spacing.sm },
    reviewReplyLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
    reviewReplyText: { fontSize: fontSize.md, color: colors.text, lineHeight: 20 },
});
