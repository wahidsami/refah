import React from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Platform,
    Dimensions,
} from 'react-native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize, borderRadius } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { Product, Tenant, getImageUrl } from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../contexts/CartContext';
import type { TenantTheme } from './TenantScreen';

const { width } = Dimensions.get('window');
const defaultTheme: TenantTheme = { primaryColor: colors.primary, secondaryColor: colors.secondary, helperColor: colors.accent };

interface ProductDetailScreenProps {
    route: { params: { product: Product; tenant: Tenant; tenantTheme?: TenantTheme } };
    navigation: any;
}

export function ProductDetailScreen({ route, navigation }: ProductDetailScreenProps) {
    const { product, tenant, tenantTheme: routeTheme } = route.params;
    const tenantTheme = routeTheme || defaultTheme;
    const { isRTL, t } = useLanguage();
    const { addToCart } = useCart();

    const name = isRTL ? (product.name_ar || product.name_en) : (product.name_en || product.name_ar);
    const description = isRTL ? (product.description_ar || product.description_en) : (product.description_en || product.description_ar);
    const images = product.images && product.images.length > 0
        ? product.images
        : [];
    const mainImageUri = images.length > 0 ? getImageUrl(images[0]) : 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=600&auto=format&fit=crop';

    const handleAddToCart = () => {
        addToCart(product);
        navigation.navigate('Cart', { tenant, tenantTheme });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Image source={{ uri: mainImageUri }} style={styles.heroImage} resizeMode="cover" />

                {images.length > 1 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbList}>
                        {images.map((img, i) => (
                            <Image
                                key={i}
                                source={{ uri: getImageUrl(img) }}
                                style={styles.thumb}
                                resizeMode="cover"
                            />
                        ))}
                    </ScrollView>
                ) : null}

                <View style={styles.card}>
                    <Text style={styles.productName}>{name}</Text>
                    <View style={styles.priceRow}>
                        <Text style={[styles.priceText, { color: tenantTheme.primaryColor }]}>{product.price} SAR</Text>
                        {product.stock != null && (
                            <Text style={styles.stockText}>{t('inStock')}: {product.stock}</Text>
                        )}
                    </View>
                </View>

                {description ? (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>{t('description')}</Text>
                        <Text style={styles.descriptionText}>{description}</Text>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: tenantTheme.primaryColor }]}
                    onPress={handleAddToCart}
                    activeOpacity={0.85}
                >
                    <Ionicons name="cart-outline" size={22} color="#fff" />
                    <Text style={styles.addButtonText}>{t('addToCart' as any)}</Text>
                </TouchableOpacity>

                <View style={{ height: spacing.xxl }} />
            </ScrollView>
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
        paddingHorizontal: spacing.lg,
        paddingTop: Platform.OS === 'ios' ? 56 : 20,
        paddingBottom: spacing.md,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: { padding: spacing.sm },
    headerTitle: {
        flex: 1,
        fontSize: fontSize.lg,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
    },
    content: { padding: spacing.lg },
    heroImage: {
        width: '100%',
        height: width * 0.8,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.md,
        backgroundColor: colors.border,
    },
    thumbList: {
        marginBottom: spacing.lg,
    },
    thumb: {
        width: 72,
        height: 72,
        borderRadius: borderRadius.sm,
        marginRight: spacing.sm,
        backgroundColor: colors.border,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    productName: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    priceText: {
        fontSize: fontSize.xxl,
        fontWeight: '700',
        color: colors.primary,
    },
    stockText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    sectionTitle: {
        fontSize: fontSize.md,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    descriptionText: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    addButton: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.lg,
        gap: spacing.md,
        marginTop: spacing.sm,
    },
    addButtonText: {
        fontSize: fontSize.lg,
        fontWeight: '700',
        color: '#fff',
    },
});
