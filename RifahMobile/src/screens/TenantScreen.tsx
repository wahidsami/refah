import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Platform, Image, TouchableOpacity, ActivityIndicator, ImageBackground, Dimensions, Linking, FlatList, Modal, TextInput, KeyboardAvoidingView, Alert, Share } from 'react-native';
import { WebView } from 'react-native-webview';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize, borderRadius } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { api, Tenant, Service, Staff, Product, getImageUrl } from '../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export interface TenantTheme {
    primaryColor: string;
    secondaryColor: string;
    helperColor: string;
}

const DEFAULT_THEME: TenantTheme = {
    primaryColor: colors.primary,
    secondaryColor: colors.secondary,
    helperColor: colors.accent,
};

interface TenantDetailsProps {
    route: any;
    navigation: any;
}

const { width } = Dimensions.get('window');
/** Map embed height - explicit so WebView doesn't collapse inside ScrollView */
const MAP_HEIGHT = 220;

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function formatTimeForDisplay(time: string): string {
    if (!time) return '';
    const parts = time.split(':').map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    if (h === 0 && m === 0) return '12:00 AM';
    if (h < 12) return `${h}:${m.toString().padStart(2, '0')} AM`;
    if (h === 12) return `12:${m.toString().padStart(2, '0')} PM`;
    return `${h - 12}:${m.toString().padStart(2, '0')} PM`;
}

export interface TenantReview {
    id: string;
    rating: number;
    comment: string | null;
    customerName: string | null;
    staffReply: string | null;
    staffRepliedAt: string | null;
    createdAt: string;
    staff?: { id: string; name: string } | null;
    /** Profile image path for avatar (from PlatformUser when review was submitted while logged in) */
    customerProfileImage?: string | null;
}

const TEMPLATE_HERO_HEIGHT: Record<string, number> = { template1: 300, template2: 260, template3: 220 };
const TEMPLATE_TAB_ORDER: Record<string, Array<'services' | 'products' | 'reviews' | 'about'>> = {
    template1: ['services', 'products', 'reviews', 'about'],
    template2: ['products', 'services', 'reviews', 'about'],
    template3: ['services', 'about', 'products', 'reviews'],
};

/** Haversine distance in km */
function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth radius km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function formatDistance(km: number): string {
    if (km < 1) return `${Math.round(km * 1000)} m away`;
    return `${km.toFixed(1)} km away`;
}

function getOpenStatus(workingHours: Record<string, { open?: string; close?: string; isOpen?: boolean }> | undefined): { isOpen: boolean; closeTime: string; openTime: string; isClosedDay: boolean } {
    if (!workingHours || typeof workingHours !== 'object') {
        return { isOpen: false, closeTime: '', openTime: '', isClosedDay: true };
    }
    const now = new Date();
    const dayKey = DAY_KEYS[now.getDay()];
    const hours = workingHours[dayKey];
    if (!hours || !hours.isOpen) {
        return { isOpen: false, closeTime: '', openTime: hours?.open || '', isClosedDay: true };
    }
    const open = hours.open || '00:00';
    const close = hours.close || '23:59';
    const current = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const isOpen = current >= open && current < close;
    return { isOpen, closeTime: close, openTime: open, isClosedDay: false };
}

export function TenantScreen({ route, navigation }: TenantDetailsProps) {
    const { tenantId, slug, tenant: routeTenant, openServiceId } = route.params || {}; // openServiceId: open ServiceDetail when coming from push
    const { t, isRTL, language } = useLanguage();

    const [tenant, setTenant] = useState<Tenant | null>(routeTenant || null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'services' | 'products' | 'reviews' | 'about'>('services');
    const [services, setServices] = useState<Service[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [showServicesTab, setShowServicesTab] = useState(true);
    const [showProductsTab, setShowProductsTab] = useState(true);
    const [showReviewsTab, setShowReviewsTab] = useState(true);
    const [showAboutTab, setShowAboutTab] = useState(true);
    const [pageBanners, setPageBanners] = useState<{ services?: string; products?: string; about?: string; contact?: string } | null>(null);
    const [heroImageFromPage, setHeroImageFromPage] = useState<string | null>(null);
    const [heroSliders, setHeroSliders] = useState<Array<{ image?: string; title?: string; link?: string }>>([]);
    const [tenantTheme, setTenantTheme] = useState<TenantTheme>(DEFAULT_THEME);
    const [showCallToAction, setShowCallToAction] = useState(false);
    const [publicPageLogo, setPublicPageLogo] = useState<string | null>(null);
    const [layoutTemplate, setLayoutTemplate] = useState<'template1' | 'template2' | 'template3'>('template1');
    const heroCarouselRef = useRef<FlatList>(null);
    const openedServiceIdRef = useRef<string | null>(null);
    const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
    const [aboutUs, setAboutUs] = useState<{
        storyEn?: string; storyAr?: string; storyTitle?: string;
        missions?: Array<{ titleEn?: string; titleAr?: string; detailsEn?: string; detailsAr?: string }>;
        visions?: Array<{ titleEn?: string; titleAr?: string; detailsEn?: string; detailsAr?: string }>;
        values?: Array<{ titleEn?: string; titleAr?: string; detailsEn?: string; detailsAr?: string }>;
        facilitiesDescriptionEn?: string; facilitiesDescriptionAr?: string;
        facilitiesImages?: string[];
        finalWordTitleEn?: string; finalWordTitleAr?: string;
        finalWordTextEn?: string; finalWordTextAr?: string;
        finalWordType?: string; finalWordImageUrl?: string; finalWordIconName?: string;
    } | null>(null);
    const [reviews, setReviews] = useState<TenantReview[]>([]);
    const [reviewsAvgRating, setReviewsAvgRating] = useState<number | null>(null);
    const [distanceKm, setDistanceKm] = useState<number | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [showAddReviewModal, setShowAddReviewModal] = useState(false);
    const [addReviewRating, setAddReviewRating] = useState(0);
    const [addReviewComment, setAddReviewComment] = useState('');
    const [addReviewName, setAddReviewName] = useState('');
    const [addReviewSubmitting, setAddReviewSubmitting] = useState(false);
    const { itemCount, addToCart } = useCart();

    // Use tenant id from route (prefer full tenant object so we have correct id)
    const effectiveTenantId = routeTenant?.id ?? tenantId;

    useEffect(() => {
        loadTenantDetails();
    }, [effectiveTenantId, slug]);

    // Fetch user location and compute distance to tenant when tenant has coordinates
    useEffect(() => {
        if (!tenant) {
            setDistanceKm(null);
            setUserLocation(null);
            return;
        }
        const coords = tenant.coordinates && typeof tenant.coordinates === 'object' && 'lat' in tenant.coordinates && 'lng' in tenant.coordinates
            ? tenant.coordinates as { lat: number; lng: number }
            : null;
        if (!coords) {
            setDistanceKm(null);
            setUserLocation(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted' || cancelled) {
                    if (!cancelled) setDistanceKm(null);
                    return;
                }
                const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                if (cancelled) return;
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setUserLocation({ lat, lng });
                const km = haversineDistanceKm(lat, lng, coords.lat, coords.lng);
                setDistanceKm(km);
            } catch {
                if (!cancelled) setDistanceKm(null);
            }
        })();
        return () => { cancelled = true; };
    }, [tenant?.id, tenant?.coordinates]);

    const loadTenantDetails = async () => {
        if (!effectiveTenantId || effectiveTenantId === 'default-id') {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            if (routeTenant) setTenant(routeTenant);

            // 1. Fetch page-data for section visibility and banners (non-blocking)
            let isProductsEnabled = true;
            let isServicesEnabled = true;
            let isReviewsEnabled = true;
            let isAboutEnabled = true;
            try {
                const pageDataRes = await api.get<{ success: boolean; data: any }>(`/public/tenant/${effectiveTenantId}/page-data`);
                if (pageDataRes.success && pageDataRes.data?.generalSettings?.sections) {
                    const sections = pageDataRes.data.generalSettings.sections;
                    isProductsEnabled = sections.products !== false;
                    isServicesEnabled = sections.services !== false;
                    isReviewsEnabled = sections.reviews !== false;
                    isAboutEnabled = sections.about !== false;
                    setShowProductsTab(isProductsEnabled);
                    setShowServicesTab(isServicesEnabled);
                    setShowReviewsTab(isReviewsEnabled);
                    setShowAboutTab(isAboutEnabled);
                }
                if (pageDataRes.success && pageDataRes.data?.pageBanners) {
                    setPageBanners(pageDataRes.data.pageBanners);
                }
                const sliders = pageDataRes.success && pageDataRes.data?.heroSliders?.length > 0
                    ? pageDataRes.data.heroSliders
                    : [];
                setHeroSliders(sliders);
                if (pageDataRes.success && pageDataRes.data?.aboutUs?.heroImage) {
                    setHeroImageFromPage(pageDataRes.data.aboutUs.heroImage);
                } else if (sliders.length > 0) {
                    const first = sliders[0];
                    setHeroImageFromPage(typeof first === 'string' ? first : (first?.image || null));
                } else {
                    setHeroImageFromPage(null);
                }
                if (pageDataRes.success && pageDataRes.data?.generalSettings?.theme) {
                    const th = pageDataRes.data.generalSettings.theme;
                    setTenantTheme({
                        primaryColor: th.primaryColor || DEFAULT_THEME.primaryColor,
                        secondaryColor: th.secondaryColor || DEFAULT_THEME.secondaryColor,
                        helperColor: th.helperColor || DEFAULT_THEME.helperColor,
                    });
                } else {
                    setTenantTheme(DEFAULT_THEME);
                }
                setShowCallToAction(pageDataRes.success && pageDataRes.data?.generalSettings?.sections?.callToAction === true);
                setPublicPageLogo(pageDataRes.success && pageDataRes.data?.generalSettings?.logo ? pageDataRes.data.generalSettings.logo : null);
                const template = pageDataRes.success && pageDataRes.data?.generalSettings?.template
                    ? pageDataRes.data.generalSettings.template
                    : 'template1';
                setLayoutTemplate(['template1', 'template2', 'template3'].includes(template) ? template : 'template1');
                if (pageDataRes.success && pageDataRes.data?.aboutUs) {
                    setAboutUs(pageDataRes.data.aboutUs);
                } else {
                    setAboutUs(null);
                }
                if (pageDataRes.success && pageDataRes.data?.tenantInfo && routeTenant) {
                    setTenant(prev => prev ? { ...prev, ...pageDataRes.data.tenantInfo } : { ...routeTenant, ...pageDataRes.data.tenantInfo });
                } else if (pageDataRes.success && pageDataRes.data?.tenantInfo) {
                    const info = pageDataRes.data.tenantInfo as any;
                    setTenant(prev => prev ? { ...prev, ...info } : { ...info, id: info.id || effectiveTenantId, slug: info.slug || prev?.slug || '' });
                }
                if (pageDataRes.success && pageDataRes.data && typeof pageDataRes.data.defaultDeliveryFee === 'number') {
                    setTenant(prev => prev ? { ...prev, defaultDeliveryFee: pageDataRes.data.defaultDeliveryFee } : prev);
                }
            } catch (_e) {
                setHeroImageFromPage(null);
                // When we only have tenantId (e.g. from notification), set minimal tenant so Booking has id
                if (!routeTenant && effectiveTenantId) {
                    setTenant(prev => prev ? prev : { id: effectiveTenantId, name: '', name_en: '', name_ar: '', slug: '' } as Tenant);
                }
            }

            if (!isServicesEnabled) {
                if (isProductsEnabled) setActiveTab('products');
                else if (isReviewsEnabled) setActiveTab('reviews');
                else if (isAboutEnabled) setActiveTab('about');
            }

            // 2. Fetch Services (always try when tab is shown)
            if (isServicesEnabled) {
                try {
                    const servicesRes = await api.get<{ success: boolean; services: Service[] }>(`/public/tenant/${effectiveTenantId}/services`);
                    if (servicesRes.success) setServices(servicesRes.services || []);
                } catch (e) {
                    console.warn('Error fetching services:', e);
                }
            }

            // 3. Fetch Products
            if (isProductsEnabled) {
                try {
                    const productsRes = await api.get<{ success: boolean; products: Product[] }>(`/public/tenant/${effectiveTenantId}/products`);
                    if (productsRes.success) setProducts(productsRes.products || []);
                } catch (e) {
                    console.warn('Error fetching products', e);
                }
            }

            // 4. Fetch Reviews (public, visible only)
            if (isReviewsEnabled) {
                try {
                    const reviewsRes = await api.get<{ success: boolean; reviews: TenantReview[]; avgRating: number | null; total: number }>(`/public/tenant/${effectiveTenantId}/reviews`);
                    if (reviewsRes.success) {
                        setReviews(reviewsRes.reviews || []);
                        setReviewsAvgRating(reviewsRes.avgRating ?? null);
                    }
                } catch (e) {
                    console.warn('Error fetching reviews', e);
                }
            }

            // 4. Fetch Staff
            try {
                const staffRes = await api.get<{ success: boolean; staff: Staff[] }>(`/public/tenant/${effectiveTenantId}/staff`);
                if (staffRes.success) setStaff(staffRes.staff || []);
            } catch (e) {
                console.warn('Error fetching staff', e);
            }
        } catch (error) {
            console.error('Failed to load tenant details:', error);
        } finally {
            setLoading(false);
            // When opened from notification we only have tenantId; ensure tenant has id for Booking flow
            if (effectiveTenantId && !routeTenant) {
                setTenant(prev => (prev && prev.id) ? prev : { id: effectiveTenantId, name: prev?.name ?? '', name_en: prev?.name_en ?? '', name_ar: prev?.name_ar ?? '', slug: prev?.slug ?? '' } as Tenant);
            }
        }
    };

    // When opened from push with openServiceId, navigate to ServiceDetail once services are loaded
    useEffect(() => {
        if (!openServiceId || services.length === 0 || !tenant || openedServiceIdRef.current === openServiceId) return;
        const service = services.find((s) => s.id === openServiceId);
        if (service) {
            openedServiceIdRef.current = openServiceId;
            setActiveTab('services');
            navigation.navigate('ServiceDetail', { service, tenant, tenantTheme });
        }
    }, [openServiceId, services, tenant, tenantTheme, navigation]);

    const refetchReviews = async () => {
        if (!effectiveTenantId) return;
        try {
            const reviewsRes = await api.get<{ success: boolean; reviews: TenantReview[]; avgRating: number | null; total: number }>(`/public/tenant/${effectiveTenantId}/reviews`);
            if (reviewsRes.success) {
                setReviews(reviewsRes.reviews || []);
                setReviewsAvgRating(reviewsRes.avgRating ?? null);
            }
        } catch (e) {
            console.warn('Error fetching reviews', e);
        }
    };

    const handleOpenAddReview = () => {
        setAddReviewRating(0);
        setAddReviewComment('');
        setAddReviewName('');
        setShowAddReviewModal(true);
        api.getUser().then((u: any) => {
            if (u?.firstName != null) setAddReviewName([u.firstName, u.lastName].filter(Boolean).join(' '));
        }).catch(() => {});
    };

    const handleSubmitAddReview = async () => {
        if (!tenant || addReviewRating === 0) {
            Alert.alert(t('error' as any) || 'Error', t('pleaseSelectRating' as any) || 'Please select a rating.');
            return;
        }
        try {
            setAddReviewSubmitting(true);
            const payload: { rating: number; comment?: string; customerName?: string } = {
                rating: addReviewRating,
                comment: addReviewComment.trim() || undefined,
                customerName: addReviewName.trim() || undefined
            };
            const res = await api.post<{ success: boolean; message?: string }>(`/public/tenant/${tenant.id}/reviews`, payload);
            if (res.success) {
                Alert.alert(t('success' as any) || 'Success', t('thankYouReview' as any) || 'Thank you for your review!');
                setShowAddReviewModal(false);
                await refetchReviews();
            } else {
                Alert.alert(t('error' as any) || 'Error', res.message || 'Failed to submit review.');
            }
        } catch (err: any) {
            Alert.alert(t('error' as any) || 'Error', err.response?.data?.message || err.message || 'Failed to submit review.');
        } finally {
            setAddReviewSubmitting(false);
        }
    };

    const renderHero = () => {
        if (!tenant) return null;

        const heroHeight = TEMPLATE_HERO_HEIGHT[layoutTemplate] ?? 300;
        const openStatus = getOpenStatus(tenant.workingHours);
        let statusLabel = '';
        if (openStatus.isOpen) {
            statusLabel = `${t('openNow' as any) || 'Open now'} • ${t('closes' as any) || 'Closes'} ${formatTimeForDisplay(openStatus.closeTime)}`;
        } else if (openStatus.isClosedDay) {
            statusLabel = (t('closed' as any) || 'Closed') + (openStatus.openTime ? ` • ${t('opens' as any) || 'Opens'} ${formatTimeForDisplay(openStatus.openTime)}` : '');
        } else {
            statusLabel = (t('closed' as any) || 'Closed') + ` • ${t('closes' as any) || 'Closes'} ${formatTimeForDisplay(openStatus.closeTime)}`;
        }
        if (!statusLabel) statusLabel = t('openNow' as any) || 'Open now';

        const logoUri = (publicPageLogo ? getImageUrl(publicPageLogo) : null) || (tenant?.logo ? getImageUrl(tenant.logo) : null);
        const fallbackCover = heroImageFromPage ? getImageUrl(heroImageFromPage) : (tenant.logo ? getImageUrl(tenant.logo) : null);
        const defaultCover = fallbackCover || 'https://images.unsplash.com/photo-1560066984-12186d305d4d?q=80&w=2574&auto=format&fit=crop';

        const subtitleParts: string[] = [];
        if (tenant.businessType) {
            const bt = Array.isArray(tenant.businessType) ? tenant.businessType[0] : tenant.businessType;
            if (bt && typeof bt === 'string') subtitleParts.push(bt);
        }
        if (distanceKm != null) subtitleParts.push(formatDistance(distanceKm));
        const heroSubtitle = subtitleParts.length > 0 ? subtitleParts.join(' • ') : '';

        const renderHeroSlide = ({ item, index }: { item: any; index: number }) => {
            const img = typeof item === 'string' ? item : item?.image;
            const uri = img ? getImageUrl(img) : defaultCover;
            return (
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => { if (item?.link) Linking.openURL(item.link); }}
                    style={{ width }}
                >
                    <ImageBackground source={{ uri }} style={styles.heroImage} resizeMode="cover">
                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.heroGradient}>
                            <View style={styles.heroContent}>
                                <View style={styles.heroHeader}>
                                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                        <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="white" />
                                    </TouchableOpacity>
                                    <View style={styles.heroActions}>
                                        <TouchableOpacity
                                            style={styles.iconButton}
                                            onPress={() => Alert.alert(t('comingSoon') || 'Coming soon', t('favoritesComingSoon') || 'Favorites coming soon.')}
                                        >
                                            <Ionicons name="heart-outline" size={24} color="white" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.iconButton}
                                            onPress={() => {
                                                const name = (isRTL ? tenant.name_ar : tenant.name_en) || tenant.name_ar || tenant.name_en || tenant.name || '';
                                                Share.share({
                                                    message: name ? `${name} – Refah` : 'Check this out on Refah',
                                                    title: name || 'Refah',
                                                }).catch(() => {});
                                            }}
                                        >
                                            <Ionicons name="share-outline" size={24} color="white" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Cart', { tenant, tenantTheme })}>
                                            <Ionicons name="cart-outline" size={24} color="white" />
                                            {itemCount > 0 && (
                                                <View style={styles.badgeContainer}>
                                                    <Text style={styles.badgeText}>{itemCount}</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                {index === 0 && (
                                    <View style={styles.heroInfo}>
                                        {logoUri && (
                                            <View style={styles.heroLogoWrap}>
                                                <Image source={{ uri: logoUri }} style={styles.heroLogo} resizeMode="contain" />
                                            </View>
                                        )}
                                        {reviewsAvgRating != null && (
                                            <View style={styles.ratingBadge}>
                                                <Ionicons name="star" size={14} color="#F59E0B" />
                                                <Text style={styles.ratingText}>{reviewsAvgRating.toFixed(1)} ({reviews.length}{reviews.length >= 100 ? '+' : ''})</Text>
                                            </View>
                                        )}
                                        <Text style={styles.heroTitle}>
                                            {isRTL ? (tenant.name_ar || tenant.name_en || tenant.name) : (tenant.name_en || tenant.name_ar || tenant.name)}
                                        </Text>
                                        {heroSubtitle ? <Text style={styles.heroSubtitle}>{heroSubtitle}</Text> : null}
                                        <View style={styles.openStatus}>
                                            <View style={[styles.statusDot, { backgroundColor: openStatus.isOpen ? tenantTheme.helperColor : colors.error }]} />
                                            <Text style={[styles.statusText, { color: openStatus.isOpen ? tenantTheme.helperColor : colors.error }]}>{statusLabel}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </LinearGradient>
                    </ImageBackground>
                </TouchableOpacity>
            );
        };

        if (heroSliders.length > 0) {
            const slides = heroSliders.map(s => (typeof s === 'string' ? { image: s } : s));
            return (
                <View style={[styles.heroContainer, { height: heroHeight }]}>
                    <FlatList
                        ref={heroCarouselRef}
                        data={slides}
                        renderItem={renderHeroSlide}
                        keyExtractor={(_, i) => String(i)}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        style={{ height: heroHeight }}
                        onMomentumScrollEnd={(e) => {
                            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                            setCurrentHeroIndex(idx);
                        }}
                    />
                    {slides.length > 1 && (
                        <View style={styles.carouselDots} pointerEvents="none">
                            {slides.map((_, i) => (
                                <View key={i} style={[styles.carouselDot, { backgroundColor: i === currentHeroIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }]} />
                            ))}
                        </View>
                    )}
                </View>
            );
        }

        return (
            <View style={[styles.heroContainer, { height: heroHeight }]}>
                <ImageBackground source={{ uri: defaultCover }} style={styles.heroImage} resizeMode="cover">
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.heroGradient}>
                        <View style={styles.heroContent}>
                            <View style={styles.heroHeader}>
                                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="white" />
                                </TouchableOpacity>
                                <View style={styles.heroActions}>
                                    <TouchableOpacity
                                        style={styles.iconButton}
                                        onPress={() => Alert.alert(t('comingSoon') || 'Coming soon', t('favoritesComingSoon') || 'Favorites coming soon.')}
                                    >
                                        <Ionicons name="heart-outline" size={24} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.iconButton}
                                        onPress={() => {
                                            const name = (isRTL ? tenant.name_ar : tenant.name_en) || tenant.name_ar || tenant.name_en || tenant.name || '';
                                            Share.share({
                                                message: name ? `${name} – Refah` : 'Check this out on Refah',
                                                title: name || 'Refah',
                                            }).catch(() => {});
                                        }}
                                    >
                                        <Ionicons name="share-outline" size={24} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Cart', { tenant, tenantTheme })}>
                                        <Ionicons name="cart-outline" size={24} color="white" />
                                        {itemCount > 0 && (
                                            <View style={styles.badgeContainer}>
                                                <Text style={styles.badgeText}>{itemCount}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.heroInfo}>
                                {logoUri && (
                                    <View style={styles.heroLogoWrap}>
                                        <Image source={{ uri: logoUri }} style={styles.heroLogo} resizeMode="contain" />
                                    </View>
                                )}
                                {reviewsAvgRating != null && (
                                    <View style={styles.ratingBadge}>
                                        <Ionicons name="star" size={14} color="#F59E0B" />
                                        <Text style={styles.ratingText}>{reviewsAvgRating.toFixed(1)} ({reviews.length}{reviews.length >= 100 ? '+' : ''})</Text>
                                    </View>
                                )}
                                <Text style={styles.heroTitle}>
                                    {isRTL ? (tenant.name_ar || tenant.name_en || tenant.name) : (tenant.name_en || tenant.name_ar || tenant.name)}
                                </Text>
                                {heroSubtitle ? <Text style={styles.heroSubtitle}>{heroSubtitle}</Text> : null}
                                <View style={styles.openStatus}>
                                    <View style={[styles.statusDot, { backgroundColor: openStatus.isOpen ? tenantTheme.helperColor : colors.error }]} />
                                    <Text style={[styles.statusText, { color: openStatus.isOpen ? tenantTheme.helperColor : colors.error }]}>{statusLabel}</Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </ImageBackground>
            </View>
        );
    };

    const renderTabs = () => {
        const order = TEMPLATE_TAB_ORDER[layoutTemplate] ?? TEMPLATE_TAB_ORDER.template1;
        const showMap = { services: showServicesTab, products: showProductsTab, reviews: showReviewsTab, about: showAboutTab };
        const availableTabs = order.filter(tab => showMap[tab]);

        if (availableTabs.length === 0) return null;

        return (
            <View style={styles.tabContainer}>
                {availableTabs.map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[
                            styles.tab,
                            activeTab === tab && { borderBottomColor: tenantTheme.primaryColor },
                        ]}
                        onPress={() => setActiveTab(tab as any)}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab === tab && { color: tenantTheme.primaryColor },
                        ]}>
                            {t(tab as any) || tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderCallToAction = () => {
        return null; // CTA "Book now" box hidden per product request
    };

    const renderServices = () => {
        const categories = Array.from(new Set(services.map(s => s.category || 'General')));

        return (
            <View style={styles.contentSection}>
                {renderSectionBanner('services')}
                {services.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No services available yet.</Text>
                    </View>
                ) : (
                    categories.map(category => (
                        <View key={category} style={styles.categorySection}>
                            <Text style={styles.categoryTitle}>{category}</Text>
                            {services.filter(s => (s.category || 'General') === category).map(service => {
                                const thumbUri = service.image
                                    ? getImageUrl(service.image)
                                    : 'https://images.unsplash.com/photo-1560066984-12186d305d4d?q=80&w=200&auto=format&fit=crop';
                                return (
                                <View key={service.id} style={[styles.serviceCard, { borderColor: tenantTheme.primaryColor + '30' }]}>
                                    {service.offerActive ? (
                                        <View style={[styles.offerRibbon, { backgroundColor: tenantTheme.primaryColor }]} pointerEvents="none">
                                            <Text style={styles.offerRibbonText}>{isRTL ? 'عرض' : 'Has offer'}</Text>
                                        </View>
                                    ) : null}
                                    <TouchableOpacity
                                        style={styles.serviceCardMain}
                                        onPress={() => navigation.navigate('ServiceDetail', { service, tenant, tenantTheme })}
                                        activeOpacity={0.85}
                                    >
                                        <Image
                                            source={{ uri: thumbUri }}
                                            style={styles.serviceThumb}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.serviceInfo}>
                                            <Text style={styles.serviceName}>
                                                {isRTL ? (service.name_ar || service.name_en) : (service.name_en || service.name_ar)}
                                            </Text>
                                            <Text style={styles.serviceDuration}>{service.duration} {t('mins')}</Text>
                                            <Text style={[styles.servicePrice, { color: tenantTheme.primaryColor }]}>{(service.basePrice ?? service.finalPrice ?? 0)} SAR</Text>
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.addButton, { borderColor: tenantTheme.primaryColor }]}
                                        onPress={() => navigation.navigate('Booking', { service, tenant, tenantTheme })}
                                    >
                                        <Ionicons name="add" size={24} color={tenantTheme.primaryColor} />
                                    </TouchableOpacity>
                                </View>
                                );
                            })}
                        </View>
                    ))
                )}
            </View>
        );
    };

    const renderSectionBanner = (bannerKey: 'services' | 'products' | 'about' | 'contact') => {
        const bannerPath = pageBanners?.[bannerKey];
        if (!bannerPath) return null;
        const uri = getImageUrl(bannerPath);
        if (!uri) return null;
        return (
            <View style={styles.sectionBannerWrap}>
                <Image source={{ uri }} style={styles.sectionBanner} resizeMode="cover" />
            </View>
        );
    };

    const renderProducts = () => {
        return (
            <View style={styles.contentSection}>
                {renderSectionBanner('products')}
                {products.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No products available yet.</Text>
                    </View>
                ) : (
                    <View style={styles.productGrid}>
                        {products.map(product => {
                            const imageUri = product.images && product.images.length > 0
                                ? getImageUrl(product.images[0])
                                : 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=600&auto=format&fit=crop';

                            return (
                                <TouchableOpacity
                                    key={product.id}
                                    style={styles.productCard}
                                    onPress={() => navigation.navigate('ProductDetail', { product, tenant, tenantTheme })}
                                    activeOpacity={0.9}
                                >
                                    <Image
                                        source={{ uri: imageUri }}
                                        style={styles.productImage}
                                    />
                                    <View style={styles.productInfo}>
                                        <Text style={styles.productName} numberOfLines={2}>
                                            {isRTL ? (product.name_ar || product.name_en) : (product.name_en || product.name_ar)}
                                        </Text>
                                        <Text style={[styles.productPrice, { color: tenantTheme.primaryColor }]}>{product.price} SAR</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.addToCartButton, { backgroundColor: tenantTheme.primaryColor }]}
                                        onPress={(e) => { e.stopPropagation(); addToCart(product); }}
                                    >
                                        <Text style={styles.addToCartText}>{t('addToCart' as any) || 'Add'}</Text>
                                        <Ionicons name="cart-outline" size={18} color="white" />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    };

    const renderReviews = () => (
        <View style={styles.contentSection}>
            <View style={styles.reviewsHeader}>
                <Text style={styles.sectionTitle}>{t('reviews' as any)}</Text>
                <TouchableOpacity
                    style={[styles.addReviewButton, { backgroundColor: tenantTheme.primaryColor }]}
                    onPress={handleOpenAddReview}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.addReviewButtonText}>{t('addReview' as any) || 'Add review'}</Text>
                </TouchableOpacity>
            </View>
            {reviews.length === 0 ? (
                <Text style={styles.emptyText}>{t('noReviewsYet' as any) || 'No reviews yet.'}</Text>
            ) : (
                reviews.map((r) => {
                    const displayName = r.customerName || (t('valuedCustomer' as any) || 'Valued Customer');
                    const initial = (r.customerName || '?').trim().charAt(0).toUpperCase();
                    const avatarUri = r.customerProfileImage ? getImageUrl(r.customerProfileImage) : null;
                    return (
                    <View key={r.id} style={styles.reviewCard}>
                        <View style={[styles.reviewCardHeader, isRTL && styles.reviewCardHeaderRTL]}>
                            <View style={[styles.reviewAvatar, { backgroundColor: `${tenantTheme.primaryColor}22` }, isRTL ? styles.reviewAvatarRTL : null]}>
                                {avatarUri ? (
                                    <Image source={{ uri: avatarUri }} style={styles.reviewAvatarImage} />
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
                        {r.staff?.name ? <Text style={styles.reviewStaff}>{t('withStaff' as any) || 'with'} {r.staff.name}</Text> : null}
                        {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                        {r.staffReply ? (
                            <View style={[styles.reviewReply, { borderLeftColor: tenantTheme.primaryColor }]}>
                                <Text style={styles.reviewReplyLabel}>{t('replyFromBusiness' as any) || 'Reply from business'}</Text>
                                <Text style={styles.reviewReplyText}>{r.staffReply}</Text>
                            </View>
                        ) : null}
                    </View>
                    );
                })
            )}
        </View>
    );

    const renderAbout = () => {
        const storyText = aboutUs
            ? (isRTL ? (aboutUs.storyAr || aboutUs.storyEn) : (aboutUs.storyEn || aboutUs.storyAr))
            : (isRTL ? (tenant?.description_ar || tenant?.descriptionAr || tenant?.description) : (tenant?.description_en || tenant?.description || ''));
        const missions = aboutUs?.missions || [];
        const visions = aboutUs?.visions || [];
        const values = aboutUs?.values || [];
        const facilitiesText = aboutUs
            ? (isRTL ? (aboutUs.facilitiesDescriptionAr || aboutUs.facilitiesDescriptionEn) : (aboutUs.facilitiesDescriptionEn || aboutUs.facilitiesDescriptionAr))
            : '';
        const addressParts = [
            tenant?.address,
            tenant?.buildingNumber,
            tenant?.street,
            tenant?.district,
            tenant?.city,
            tenant?.country
        ].filter(Boolean);
        const addressLine = addressParts.length > 0 ? addressParts.join(', ') : '';

        return (
        <View style={styles.contentSection}>
            {renderSectionBanner('about')}
            {(storyText || !aboutUs) && (
            <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>{t('about')}</Text>
                <Text style={styles.aboutText}>
                    {storyText || (tenant ? (isRTL ? (tenant.description_ar || tenant.descriptionAr || tenant.description) : (tenant.description_en || tenant.description)) : '') || 'No description available.'}
                </Text>
            </View>
            )}

            {missions.length > 0 && (
            <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>{t('mission')}</Text>
                {missions.map((m, i) => (
                    <View key={i} style={styles.aboutSubBlock}>
                        <Text style={styles.aboutSubTitle}>{isRTL ? (m.titleAr || m.titleEn) : (m.titleEn || m.titleAr)}</Text>
                        <Text style={styles.aboutText}>{(isRTL ? (m.detailsAr || m.detailsEn) : (m.detailsEn || m.detailsAr)) || ''}</Text>
                    </View>
                ))}
            </View>
            )}

            {visions.length > 0 && (
            <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>{t('vision')}</Text>
                {visions.map((v, i) => (
                    <View key={i} style={styles.aboutSubBlock}>
                        <Text style={styles.aboutSubTitle}>{isRTL ? (v.titleAr || v.titleEn) : (v.titleEn || v.titleAr)}</Text>
                        <Text style={styles.aboutText}>{(isRTL ? (v.detailsAr || v.detailsEn) : (v.detailsEn || v.detailsAr)) || ''}</Text>
                    </View>
                ))}
            </View>
            )}

            {values.length > 0 && (
            <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>{t('values')}</Text>
                {values.map((v, i) => (
                    <View key={i} style={styles.aboutSubBlock}>
                        <Text style={styles.aboutSubTitle}>{isRTL ? (v.titleAr || v.titleEn) : (v.titleEn || v.titleAr)}</Text>
                        <Text style={styles.aboutText}>{(isRTL ? (v.detailsAr || v.detailsEn) : (v.detailsEn || v.detailsAr)) || ''}</Text>
                    </View>
                ))}
            </View>
            )}

            {(facilitiesText || (aboutUs?.facilitiesImages && aboutUs.facilitiesImages.length > 0)) ? (
            <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>{t('facilities')}</Text>
                {facilitiesText ? <Text style={styles.aboutText}>{facilitiesText}</Text> : null}
                {(aboutUs?.facilitiesImages && aboutUs.facilitiesImages.length > 0) ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.facilitiesGallery}>
                        {aboutUs.facilitiesImages.map((img, i) => {
                            const uri = getImageUrl(img);
                            if (!uri) return null;
                            return (
                                <Image key={i} source={{ uri }} style={styles.facilityImage} resizeMode="cover" />
                            );
                        })}
                    </ScrollView>
                ) : null}
            </View>
            ) : null}

            <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>{t('location')}</Text>
                <Text style={styles.addressText}>{addressLine || (tenant?.address || 'No address provided.')}</Text>
                {(() => {
                    const coords = tenant?.coordinates && typeof tenant.coordinates === 'object' && 'lat' in tenant.coordinates && 'lng' in tenant.coordinates
                        ? tenant.coordinates as { lat: number; lng: number }
                        : null;
                    const rawMapLink = tenant?.googleMapLink;
                    const useHttpsOnly = typeof rawMapLink === 'string' && rawMapLink.startsWith('intent://');
                    const mapUrl = coords
                        ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=15`
                        : rawMapLink && !useHttpsOnly
                            ? rawMapLink
                            : null;
                    if (mapUrl) {
                        const directionsUrl = coords
                            ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=driving${userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : ''}`
                            : mapUrl;
                        return (
                            <>
                                <View style={[styles.mapWebViewContainer, { height: MAP_HEIGHT, minHeight: MAP_HEIGHT }]}>
                                    <WebView
                                        source={{ uri: mapUrl }}
                                        style={[styles.mapWebView, { width: '100%', height: MAP_HEIGHT }]}
                                        scrollEnabled={false}
                                        nestedScrollEnabled={true}
                                        androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
                                        onShouldStartLoadWithRequest={(req) => {
                                            if (req.url.startsWith('intent://')) {
                                                Linking.openURL(mapUrl).catch(() => {});
                                                return false;
                                            }
                                            return true;
                                        }}
                                    />
                                </View>
                                <View style={styles.mapButtonsRow}>
                                    <TouchableOpacity
                                        style={[styles.mapOpenButton, { borderColor: tenantTheme.primaryColor }]}
                                        onPress={() => Linking.openURL(mapUrl)}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="open-outline" size={24} color={tenantTheme.primaryColor} />
                                        <Text style={[styles.mapText, { color: tenantTheme.primaryColor, fontWeight: '600', marginTop: 0, marginStart: spacing.sm }]}>{t('viewOnMap')}</Text>
                                    </TouchableOpacity>
                                    {coords && (
                                        <TouchableOpacity
                                            style={[styles.mapOpenButton, styles.mapDirectionsButton, { borderColor: tenantTheme.primaryColor, backgroundColor: tenantTheme.primaryColor }]}
                                            onPress={() => Linking.openURL(directionsUrl)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="navigate" size={24} color="#fff" />
                                            <Text style={[styles.mapText, { color: '#fff', fontWeight: '600', marginTop: 0, marginStart: spacing.sm }]}>{t('getDirections')}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </>
                        );
                    }
                    return (
                        <View style={styles.mapPlaceholder}>
                            <Ionicons name="map" size={32} color={colors.textSecondary} />
                            <Text style={styles.mapText}>{t('viewOnMap')}</Text>
                        </View>
                    );
                })()}
            </View>

            <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>{t('workingHours')}</Text>
                <View style={styles.hoursContainer}>
                    {tenant?.workingHours ? Object.entries(tenant.workingHours).map(([day, hours]: [string, any]) => (
                        <View key={day} style={styles.hoursRow}>
                            <Text style={styles.dayText}>{t(day as any) || day.charAt(0).toUpperCase() + day.slice(1)}</Text>
                            <Text style={[styles.timeText, !hours.isOpen && { color: colors.error }]}>
                                {hours.isOpen ? `${hours.open} - ${hours.close}` : t('closed')}
                            </Text>
                        </View>
                    )) : (
                        <Text style={styles.aboutText}>Hours not available.</Text>
                    )}
                </View>
            </View>

            {renderSectionBanner('contact')}
            <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>{t('contact')}</Text>
                <View style={styles.contactRow}>
                    <Ionicons name="call-outline" size={20} color={tenantTheme.primaryColor} />
                    <Text style={styles.contactText}>{tenant?.phone || tenant?.mobile || 'N/A'}</Text>
                </View>
                <View style={styles.contactRow}>
                    <Ionicons name="mail-outline" size={20} color={tenantTheme.primaryColor} />
                    <Text style={styles.contactText}>{tenant?.email || 'N/A'}</Text>
                </View>
                {tenant?.website && (
                    <View style={styles.contactRow}>
                        <Ionicons name="globe-outline" size={20} color={tenantTheme.primaryColor} />
                        <Text style={styles.contactText}>{tenant.website}</Text>
                    </View>
                )}
            </View>

            <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>{t('followUs')}</Text>
                <View style={styles.socialRow}>
                    {tenant?.instagramUrl && (
                        <TouchableOpacity style={styles.socialIcon} onPress={() => tenant.instagramUrl && Linking.openURL(tenant.instagramUrl)}>
                            <Ionicons name="logo-instagram" size={24} color="#E1306C" />
                        </TouchableOpacity>
                    )}
                    {tenant?.twitterUrl && (
                        <TouchableOpacity style={styles.socialIcon} onPress={() => tenant.twitterUrl && Linking.openURL(tenant.twitterUrl)}>
                            <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
                        </TouchableOpacity>
                    )}
                    {tenant?.facebookUrl && (
                        <TouchableOpacity style={styles.socialIcon} onPress={() => tenant.facebookUrl && Linking.openURL(tenant.facebookUrl)}>
                            <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                        </TouchableOpacity>
                    )}
                    {(!tenant?.instagramUrl && !tenant?.twitterUrl && !tenant?.facebookUrl) && (
                        <Text style={styles.aboutText}>No social media links.</Text>
                    )}
                </View>
            </View>

            {(aboutUs?.finalWordTitleEn || aboutUs?.finalWordTitleAr || aboutUs?.finalWordTextEn || aboutUs?.finalWordTextAr) ? (
            <View style={[styles.sectionBlock, styles.finalWordBlock]}>
                {aboutUs.finalWordType === 'image' && aboutUs.finalWordImageUrl ? (
                    <Image source={{ uri: getImageUrl(aboutUs.finalWordImageUrl)! }} style={styles.finalWordImage} resizeMode="cover" />
                ) : aboutUs.finalWordIconName ? (
                    <View style={[styles.finalWordIconWrap, { backgroundColor: tenantTheme.primaryColor + '20' }]}>
                        <Ionicons name={aboutUs.finalWordIconName as any} size={40} color={tenantTheme.primaryColor} />
                    </View>
                ) : null}
                <Text style={[styles.finalWordTitle, { color: tenantTheme.primaryColor }]}>
                    {isRTL ? (aboutUs.finalWordTitleAr || aboutUs.finalWordTitleEn) : (aboutUs.finalWordTitleEn || aboutUs.finalWordTitleAr)}
                </Text>
                <Text style={styles.aboutText}>
                    {isRTL ? (aboutUs.finalWordTextAr || aboutUs.finalWordTextEn) : (aboutUs.finalWordTextEn || aboutUs.finalWordTextAr)}
                </Text>
            </View>
            ) : null}
        </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={tenantTheme.primaryColor} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {renderHero()}
                {renderCallToAction()}
                {renderTabs()}
                {activeTab === 'services' && renderServices()}
                {activeTab === 'products' && renderProducts()}
                {activeTab === 'reviews' && renderReviews()}
                {activeTab === 'about' && renderAbout()}
            </ScrollView>

            {/* Add Review Modal (from tenant page Reviews tab) */}
            <Modal visible={showAddReviewModal} animationType="slide" transparent onRequestClose={() => setShowAddReviewModal(false)}>
                <KeyboardAvoidingView style={styles.addReviewModalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.addReviewModalContent}>
                        <View style={styles.addReviewModalHeader}>
                            <Text style={styles.addReviewModalTitle}>{t('addReview' as any) || 'Add review'}</Text>
                            <TouchableOpacity onPress={() => setShowAddReviewModal(false)} hitSlop={12}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.addReviewModalSubtitle}>
                            {tenant ? (t('rateYourExperience' as any) || `How was your experience at ${tenant.name || 'this place'}?`) : ''}
                        </Text>
                        <View style={styles.addReviewStarsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity key={star} onPress={() => setAddReviewRating(star)} style={styles.addReviewStarBtn}>
                                    <Ionicons name={star <= addReviewRating ? 'star' : 'star-outline'} size={40} color="#F59E0B" />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput
                            style={styles.addReviewNameInput}
                            placeholder={t('yourName' as any) || 'Your name (optional)'}
                            placeholderTextColor={colors.textSecondary}
                            value={addReviewName}
                            onChangeText={setAddReviewName}
                        />
                        <TextInput
                            style={[styles.addReviewNameInput, styles.addReviewCommentInput]}
                            placeholder={t('shareExperience' as any) || 'Share your experience (optional)'}
                            placeholderTextColor={colors.textSecondary}
                            value={addReviewComment}
                            onChangeText={setAddReviewComment}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                        <TouchableOpacity
                            style={[styles.addReviewSubmitBtn, { backgroundColor: tenantTheme.primaryColor }, addReviewSubmitting && styles.addReviewSubmitDisabled]}
                            onPress={handleSubmitAddReview}
                            disabled={addReviewSubmitting}
                        >
                            {addReviewSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.addReviewSubmitText}>{t('submitReview' as any) || 'Submit review'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroContainer: {
        height: 300,
        width: '100%',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroGradient: {
        flex: 1,
        justifyContent: 'space-between',
        padding: spacing.md,
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: Platform.OS === 'ios' ? 40 : 20,
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    iconButton: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroContent: {
        flex: 1,
        justifyContent: 'space-between',
    },
    heroInfo: {
        marginBottom: spacing.md,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: spacing.xs,
        gap: 4,
    },
    ratingText: {
        color: 'white',
        fontSize: fontSize.xs,
        fontWeight: 'bold',
    },
    heroTitle: {
        color: 'white',
        fontSize: fontSize.xxl,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    heroSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: fontSize.sm,
        marginBottom: spacing.sm,
    },
    openStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981', // Green for open
    },
    statusText: {
        color: '#10B981',
        fontSize: fontSize.xs,
        fontWeight: '600',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingHorizontal: spacing.md,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: colors.primary,
    },
    tabText: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    activeTabText: {
        color: colors.primary,
    },
    contentSection: {
        padding: spacing.lg,
    },
    sectionTitle: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.md,
    },
    categorySection: {
        marginBottom: spacing.lg,
    },
    categoryTitle: {
        fontSize: fontSize.lg,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    serviceCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        position: 'relative',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    offerRibbon: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 4,
        zIndex: 1,
    },
    offerRibbonText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },
    serviceCardMain: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    serviceThumb: {
        width: 72,
        height: 72,
        borderRadius: borderRadius.sm,
        marginRight: spacing.md,
        backgroundColor: colors.border,
    },
    serviceInfo: {
        flex: 1,
    },
    serviceName: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    serviceDuration: {
        fontSize: fontSize.xs,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    servicePrice: {
        fontSize: fontSize.sm,
        fontWeight: '700',
        color: colors.primary,
    },
    addButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    emptyState: {
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: fontSize.md,
    },
    reviewsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    addReviewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.xs,
    },
    addReviewButtonText: {
        color: '#fff',
        fontSize: fontSize.md,
        fontWeight: '600',
    },
    addReviewModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    addReviewModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        padding: spacing.xl,
        paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    },
    addReviewModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    addReviewModalTitle: {
        fontSize: fontSize.xl,
        fontWeight: '700',
        color: colors.text,
    },
    addReviewModalSubtitle: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    addReviewStarsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    addReviewStarBtn: {
        padding: spacing.xs,
    },
    addReviewNameInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: fontSize.md,
        color: colors.text,
        marginBottom: spacing.md,
    },
    addReviewCommentInput: {
        minHeight: 100,
    },
    addReviewSubmitBtn: {
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    addReviewSubmitDisabled: {
        opacity: 0.7,
    },
    addReviewSubmitText: {
        color: '#fff',
        fontSize: fontSize.lg,
        fontWeight: '600',
    },
    reviewCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    reviewCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    reviewCardHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    reviewAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    reviewAvatarRTL: {
        marginRight: 0,
        marginLeft: spacing.md,
    },
    reviewAvatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    reviewAvatarText: {
        fontSize: 18,
        fontWeight: '700',
    },
    reviewCardHeaderContent: {
        flex: 1,
    },
    reviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    reviewStars: {
        flexDirection: 'row',
        gap: 2,
    },
    reviewDate: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    reviewAuthor: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    reviewStaff: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    reviewComment: {
        fontSize: fontSize.md,
        color: colors.text,
        lineHeight: 22,
        marginBottom: spacing.sm,
    },
    reviewReply: {
        borderLeftWidth: 3,
        paddingLeft: spacing.md,
        marginTop: spacing.sm,
    },
    reviewReplyLabel: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 4,
    },
    reviewReplyText: {
        fontSize: fontSize.md,
        color: colors.text,
        lineHeight: 20,
    },
    aboutText: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    sectionBlock: {
        marginBottom: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: spacing.lg,
    },
    aboutSubBlock: {
        marginBottom: spacing.md,
    },
    aboutSubTitle: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    addressText: {
        fontSize: fontSize.md,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    hoursContainer: {
        marginTop: spacing.sm,
    },
    mapPlaceholder: {
        height: 150,
        backgroundColor: '#F3F4F6',
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.sm,
        flexDirection: 'row',
    },
    mapWebViewContainer: {
        width: '100%',
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: '#F3F4F6',
        marginTop: spacing.sm,
    },
    mapWebView: {
        borderRadius: borderRadius.lg,
    },
    mapButtonsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    mapOpenButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
    },
    mapDirectionsButton: {
        borderWidth: 0,
    },
    mapText: {
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },
    hoursRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dayText: {
        fontSize: fontSize.md,
        color: colors.text,
    },
    timeText: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
        gap: spacing.md,
    },
    contactText: {
        fontSize: fontSize.md,
        color: colors.text,
        fontWeight: '500',
    },
    socialRow: {
        flexDirection: 'row',
        gap: spacing.xl,
        marginTop: spacing.sm,
    },
    socialIcon: {
        padding: spacing.sm,
        backgroundColor: '#F3F4F6',
        borderRadius: borderRadius.full,
    },
    badgeContainer: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: colors.error,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    productGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    productCard: {
        width: (width - spacing.lg * 2 - spacing.md) / 2, // 2 columns with padding and gap
        backgroundColor: 'white',
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    productImage: {
        width: '100%',
        height: 120,
    },
    productInfo: {
        padding: spacing.sm,
    },
    productName: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
        height: 40,
    },
    productPrice: {
        fontSize: fontSize.sm,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: spacing.sm,
    },
    addToCartButton: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        gap: spacing.xs,
    },
    addToCartText: {
        color: 'white',
        fontSize: fontSize.sm,
        fontWeight: 'bold',
    },
    heroLogoWrap: {
        alignSelf: 'flex-start',
        marginBottom: spacing.sm,
        padding: spacing.sm,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: borderRadius.md,
    },
    heroLogo: {
        width: 64,
        height: 64,
    },
    carouselDots: {
        position: 'absolute',
        bottom: spacing.md,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    carouselDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    ctaSection: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
    },
    ctaTitle: {
        fontSize: fontSize.lg,
        fontWeight: '700',
        marginBottom: spacing.xs,
    },
    ctaSubtext: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
    },
    ctaButtonText: {
        color: 'white',
        fontSize: fontSize.md,
        fontWeight: '700',
    },
    sectionBannerWrap: {
        marginBottom: spacing.lg,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        height: 100,
    },
    sectionBanner: {
        width: '100%',
        height: '100%',
    },
    facilitiesGallery: {
        marginTop: spacing.sm,
    },
    facilityImage: {
        width: 120,
        height: 120,
        borderRadius: borderRadius.sm,
        marginRight: spacing.md,
        backgroundColor: colors.border,
    },
    finalWordBlock: {
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    finalWordImage: {
        width: width - spacing.lg * 2,
        height: 160,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        backgroundColor: colors.border,
    },
    finalWordIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    finalWordTitle: {
        fontSize: fontSize.xl,
        fontWeight: '700',
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
});
