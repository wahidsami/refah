import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { ThemedText as Text } from '../components/ThemedText';
import { colors, spacing, fontSize, borderRadius } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { Ionicons } from '@expo/vector-icons';
import { api, getImageUrl, Tenant, User } from '../api/client';

interface CartScreenProps {
    route: any;
    navigation: any;
}

export function CartScreen({ route, navigation }: CartScreenProps) {
    const { t, isRTL } = useLanguage();
    const { cartItems, cartTotal, updateQuantity, removeFromCart, clearCart } = useCart();

    const tenant: Tenant = route.params?.tenant;

    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<User | null>(null);
    const [profileLoaded, setProfileLoaded] = useState(false);

    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');

    const [useSavedAddress, setUseSavedAddress] = useState(true);
    const [saveAddressToProfile, setSaveAddressToProfile] = useState(false);
    const [city, setCity] = useState('');
    const [district, setDistrict] = useState('');
    const [street, setStreet] = useState('');
    const [building, setBuilding] = useState('');
    const [floor, setFloor] = useState('');
    const [apartment, setApartment] = useState('');

    const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
    const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash_on_delivery' | 'pay_on_visit'>('online');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const loggedIn = await api.isAuthenticated();
                if (!loggedIn || cancelled) {
                    if (!cancelled) setProfileLoaded(true);
                    return;
                }
                const { user } = await api.getProfile();
                if (!cancelled && user) {
                    setProfile(user);
                    setCustomerName([user.firstName, user.lastName].filter(Boolean).join(' ') || '');
                    setCustomerEmail(user.email || '');
                    setCustomerPhone(user.phone || '');
                    setCity(user.addressCity || '');
                    setDistrict(user.addressDistrict || '');
                    setStreet(user.addressStreet || '');
                    setBuilding(user.addressBuilding || '');
                    setFloor(user.addressFloor || '');
                    setApartment(user.addressApartment || '');
                }
            } catch (_e) {
                // ignore (e.g. 401, network)
            } finally {
                if (!cancelled) setProfileLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const isLoggedIn = !!profile;
    const defaultDeliveryFee = (tenant?.defaultDeliveryFee != null ? Number(tenant.defaultDeliveryFee) : 0) || 0;

    const allowsDelivery = cartItems.every(item => item.product.allowsDelivery !== false);
    const allowsPickup = cartItems.every(item => item.product.allowsPickup !== false);
    const fulfillmentOptions: Array<'delivery' | 'pickup'> = [];
    if (allowsDelivery) fulfillmentOptions.push('delivery');
    if (allowsPickup) fulfillmentOptions.push('pickup');
    const effectiveDeliveryType = fulfillmentOptions.length === 1 ? fulfillmentOptions[0] : deliveryType;

    const deliveryFee = effectiveDeliveryType === 'delivery' ? defaultDeliveryFee : 0;
    const tax = cartTotal * 0.15;
    const finalTotal = cartTotal + tax + deliveryFee;

    const handleCheckout = async () => {
        if (!tenant?.id) {
            Alert.alert('Error', 'Tenant information is missing.');
            return;
        }

        if (!customerName || !customerEmail || !customerPhone) {
            Alert.alert('Missing Details', 'Please fill in Name, Email, and Phone.');
            return;
        }

        if (effectiveDeliveryType === 'delivery') {
            if (!street && !city && !district) {
                Alert.alert('Missing Address', 'Please fill in at least City, District, or Street for delivery.');
                return;
            }
        }

        const paymentApi = paymentMethod === 'online' ? 'online' : (effectiveDeliveryType === 'pickup' ? 'pay_on_visit' : 'cash_on_delivery');
        const items = cartItems.map(item => ({ productId: item.product.id, quantity: item.quantity }));

        if (isLoggedIn && saveAddressToProfile && effectiveDeliveryType === 'delivery') {
            try {
                await api.updateProfile({
                    addressCity: city,
                    addressDistrict: district,
                    addressStreet: street,
                    addressBuilding: building || undefined,
                    addressFloor: floor || undefined,
                    addressApartment: apartment || undefined,
                });
            } catch (_e) {
                // non-blocking; order can still proceed
            }
        }

        if (paymentApi === 'online') {
            if (isLoggedIn) {
                navigation.navigate('PaymentSimulator', {
                    isAuthOrder: true,
                    tenantId: tenant.id,
                    total: finalTotal,
                    payload: {
                        tenantId: tenant.id,
                        items,
                        paymentMethod: 'online',
                        deliveryType: effectiveDeliveryType,
                        shippingAddress: effectiveDeliveryType === 'delivery' ? { street, city, district, building, floor, apartment } : undefined,
                        shippingFee: effectiveDeliveryType === 'delivery' ? deliveryFee : undefined,
                    },
                });
            } else {
                navigation.navigate('PaymentSimulator', {
                    isAuthOrder: false,
                    tenantId: tenant.id,
                    total: finalTotal,
                    payload: {
                        items,
                        customerName,
                        customerEmail,
                        customerPhone,
                        deliveryType: effectiveDeliveryType,
                        shippingAddress: effectiveDeliveryType === 'delivery' ? { street, city, district, building, floor, apartment } : undefined,
                        shippingFee: effectiveDeliveryType === 'delivery' ? deliveryFee : undefined,
                        paymentMethod: 'online',
                    },
                });
            }
            return;
        }

        try {
            setLoading(true);
            if (isLoggedIn) {
                const res = await api.createOrder({
                    tenantId: tenant.id,
                    items,
                    paymentMethod: paymentApi,
                    deliveryType: effectiveDeliveryType,
                    shippingAddress: effectiveDeliveryType === 'delivery' ? { street, city, district, building, floor, apartment } : undefined,
                    shippingFee: effectiveDeliveryType === 'delivery' ? deliveryFee : undefined,
                });
                if (res.success) {
                    clearCart();
                    Alert.alert('Success', 'Order placed successfully!', [{ text: 'OK', onPress: () => navigation.popToTop() }]);
                } else {
                    Alert.alert('Error', res.message || 'Failed to place order.');
                }
            } else {
                const res = await api.createPublicOrder(tenant.id, {
                    items,
                    customerName,
                    customerEmail,
                    customerPhone,
                    deliveryType: effectiveDeliveryType,
                    shippingAddress: effectiveDeliveryType === 'delivery' ? { street, city, district, building, floor, apartment } : undefined,
                    shippingFee: effectiveDeliveryType === 'delivery' ? deliveryFee : undefined,
                    paymentMethod: paymentApi,
                });
                if (res.success) {
                    clearCart();
                    Alert.alert('Success', 'Order placed successfully!', [{ text: 'OK', onPress: () => navigation.popToTop() }]);
                } else {
                    Alert.alert('Error', res.message || 'Failed to place order.');
                }
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to place order.');
        } finally {
            setLoading(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <View style={[styles.container, styles.centerAll]}>
                <Ionicons name="cart-outline" size={80} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <Text style={styles.emptyTitle}>Your cart is empty</Text>
                <Text style={styles.emptySubtitle}>Looks like you haven't added any products yet.</Text>
                <TouchableOpacity style={styles.continueButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.continueButtonText}>Continue Shopping</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('shoppingCart' as any)}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Items</Text>
                    {cartItems.map(item => {
                        const productId = String(item.product.id ?? '');
                        const unitPrice = Number(item.product.price) || 0;
                        const lineTotal = unitPrice * item.quantity;
                        return (
                        <View key={productId} style={styles.cartItem}>
                            <Image
                                source={{ uri: item.product.images?.length ? getImageUrl(item.product.images[0]) : 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=600&auto=format&fit=crop' }}
                                style={styles.itemImage}
                            />
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName} numberOfLines={2}>{isRTL ? item.product.name_ar : item.product.name_en}</Text>
                                <Text style={styles.itemPrice}>{unitPrice} SAR × {item.quantity} = {lineTotal.toFixed(2)} SAR</Text>
                                <View style={styles.qtyControls}>
                                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(productId, item.quantity - 1)}>
                                        <Ionicons name="remove" size={18} color={colors.text} />
                                    </TouchableOpacity>
                                    <Text style={styles.qtyText}>{item.quantity}</Text>
                                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(productId, item.quantity + 1)}>
                                        <Ionicons name="add" size={18} color={colors.text} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => removeFromCart(productId)} style={styles.removeBtn}>
                                <Ionicons name="trash-outline" size={20} color={colors.error} />
                            </TouchableOpacity>
                        </View>
                        );
                    })}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('personalInfo' as any)}</Text>
                    <TextInput
                        style={[styles.input, isLoggedIn && styles.inputReadOnly]}
                        placeholder="Full Name *"
                        value={customerName}
                        onChangeText={setCustomerName}
                        editable={!isLoggedIn}
                    />
                    <TextInput
                        style={[styles.input, isLoggedIn && styles.inputReadOnly]}
                        placeholder="Email Address *"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={customerEmail}
                        onChangeText={setCustomerEmail}
                        editable={!isLoggedIn}
                    />
                    <TextInput
                        style={[styles.input, isLoggedIn && styles.inputReadOnly]}
                        placeholder="Phone Number *"
                        keyboardType="phone-pad"
                        value={customerPhone}
                        onChangeText={setCustomerPhone}
                        editable={!isLoggedIn}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('fulfillment' as any)}</Text>
                    {fulfillmentOptions.length === 1 && (
                        <Text style={[styles.hint, { marginBottom: spacing.sm }]}>
                            {allowsDelivery && !allowsPickup ? 'All items are delivery only.' : 'All items are pickup only.'}
                        </Text>
                    )}
                    <View style={styles.methodOptions}>
                        {fulfillmentOptions.includes('delivery') && (
                            <TouchableOpacity
                                style={[styles.methodOption, effectiveDeliveryType === 'delivery' && styles.methodOptionActive]}
                                onPress={() => setDeliveryType('delivery')}
                            >
                                <Ionicons name="bicycle-outline" size={24} color={effectiveDeliveryType === 'delivery' ? colors.primary : colors.textSecondary} />
                                <Text style={[styles.methodLabel, effectiveDeliveryType === 'delivery' && styles.methodLabelActive]}>{t('delivery' as any)}</Text>
                                <Text style={styles.methodDesc}>{defaultDeliveryFee > 0 ? `${defaultDeliveryFee} SAR` : 'Free'}</Text>
                            </TouchableOpacity>
                        )}
                        {fulfillmentOptions.includes('pickup') && (
                            <TouchableOpacity
                                style={[styles.methodOption, effectiveDeliveryType === 'pickup' && styles.methodOptionActive]}
                                onPress={() => setDeliveryType('pickup')}
                            >
                                <Ionicons name="storefront-outline" size={24} color={effectiveDeliveryType === 'pickup' ? colors.primary : colors.textSecondary} />
                                <Text style={[styles.methodLabel, effectiveDeliveryType === 'pickup' && styles.methodLabelActive]}>{t('pickOnVisit' as any)}</Text>
                                <Text style={styles.methodDesc}>No fee</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {effectiveDeliveryType === 'delivery' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('shippingAddress' as any)}</Text>
                        {isLoggedIn && (
                            <>
                                <View style={styles.addressToggle}>
                                    <TouchableOpacity onPress={() => { setUseSavedAddress(true); setCity(profile?.addressCity ?? ''); setDistrict(profile?.addressDistrict ?? ''); setStreet(profile?.addressStreet ?? ''); setBuilding(profile?.addressBuilding ?? ''); setFloor(profile?.addressFloor ?? ''); setApartment(profile?.addressApartment ?? ''); }} style={[styles.toggleBtn, useSavedAddress && styles.toggleBtnActive]}>
                                        <Text style={[styles.toggleBtnText, useSavedAddress && styles.toggleBtnTextActive]}>{t('useSavedAddress' as any)}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setUseSavedAddress(false)} style={[styles.toggleBtn, !useSavedAddress && styles.toggleBtnActive]}>
                                        <Text style={[styles.toggleBtnText, !useSavedAddress && styles.toggleBtnTextActive]}>{t('enterNewAddress' as any)}</Text>
                                    </TouchableOpacity>
                                </View>
                                {useSavedAddress && (
                                    <Text style={[styles.hint, { marginBottom: spacing.sm }]}>{t('savedAddressReadOnly' as any) || 'Saved address (read-only)'}</Text>
                                )}
                            </>
                        )}
                        <View style={styles.row}>
                            <TextInput style={[styles.input, { flex: 1, marginRight: spacing.sm }, isLoggedIn && useSavedAddress && styles.inputReadOnly]} placeholder="City *" value={city} onChangeText={setCity} editable={!isLoggedIn || !useSavedAddress} />
                            <TextInput style={[styles.input, { flex: 1 }, isLoggedIn && useSavedAddress && styles.inputReadOnly]} placeholder="District *" value={district} onChangeText={setDistrict} editable={!isLoggedIn || !useSavedAddress} />
                        </View>
                        <TextInput style={[styles.input, isLoggedIn && useSavedAddress && styles.inputReadOnly]} placeholder="Street *" value={street} onChangeText={setStreet} editable={!isLoggedIn || !useSavedAddress} />
                        <TextInput style={[styles.input, isLoggedIn && useSavedAddress && styles.inputReadOnly]} placeholder="Building" value={building} onChangeText={setBuilding} editable={!isLoggedIn || !useSavedAddress} />
                        <View style={styles.row}>
                            <TextInput style={[styles.input, { flex: 1, marginRight: spacing.sm }, isLoggedIn && useSavedAddress && styles.inputReadOnly]} placeholder="Floor" value={floor} onChangeText={setFloor} editable={!isLoggedIn || !useSavedAddress} />
                            <TextInput style={[styles.input, { flex: 1 }, isLoggedIn && useSavedAddress && styles.inputReadOnly]} placeholder="Apartment" value={apartment} onChangeText={setApartment} editable={!isLoggedIn || !useSavedAddress} />
                        </View>
                        {isLoggedIn && !useSavedAddress && (
                            <TouchableOpacity style={styles.saveAddressRow} onPress={() => setSaveAddressToProfile(prev => !prev)}>
                                <Ionicons name={saveAddressToProfile ? 'checkbox' : 'square-outline'} size={22} color={saveAddressToProfile ? colors.primary : colors.textSecondary} />
                                <Text style={styles.saveAddressLabel}>{t('saveAddressToProfile' as any) || 'Save this address to my profile'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('paymentMethod' as any)}</Text>
                    <View style={styles.methodOptions}>
                        <TouchableOpacity
                            style={[styles.methodOption, paymentMethod === 'online' && styles.methodOptionActive]}
                            onPress={() => setPaymentMethod('online')}
                        >
                            <Ionicons name="card-outline" size={24} color={paymentMethod === 'online' ? colors.primary : colors.textSecondary} />
                            <Text style={[styles.methodLabel, paymentMethod === 'online' && styles.methodLabelActive]}>{t('creditCard' as any)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.methodOption, (paymentMethod === 'cash_on_delivery' || paymentMethod === 'pay_on_visit') && styles.methodOptionActive]}
                            onPress={() => setPaymentMethod(effectiveDeliveryType === 'pickup' ? 'pay_on_visit' : 'cash_on_delivery')}
                        >
                            <Ionicons name="cash-outline" size={24} color={(paymentMethod === 'cash_on_delivery' || paymentMethod === 'pay_on_visit') ? colors.primary : colors.textSecondary} />
                            <Text style={[styles.methodLabel, (paymentMethod === 'cash_on_delivery' || paymentMethod === 'pay_on_visit') && styles.methodLabelActive]}>
                                {effectiveDeliveryType === 'pickup' ? (t('payOnVisit' as any)) : (t('cashOnDelivery' as any))}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.section, styles.summarySection]}>
                    <Text style={styles.sectionTitle}>{t('orderSummary' as any)}</Text>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal</Text>
                        <Text style={styles.summaryValue}>{cartTotal.toFixed(2)} SAR</Text>
                    </View>
                    {effectiveDeliveryType === 'delivery' && (
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Delivery</Text>
                            <Text style={styles.summaryValue}>{deliveryFee.toFixed(2)} SAR</Text>
                        </View>
                    )}
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>VAT (15%)</Text>
                        <Text style={styles.summaryValue}>{tax.toFixed(2)} SAR</Text>
                    </View>
                    <View style={[styles.summaryRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>{finalTotal.toFixed(2)} SAR</Text>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.checkoutBtnText}>Place Order • {finalTotal.toFixed(2)} SAR</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centerAll: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyTitle: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    continueButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
    },
    continueButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: fontSize.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: spacing.md,
        paddingHorizontal: spacing.md,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: spacing.sm,
    },
    headerTitle: {
        fontSize: fontSize.lg,
        fontWeight: 'bold',
        color: colors.text,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: 40,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.md,
    },
    hint: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    addressToggle: {
        flexDirection: 'row',
        marginBottom: spacing.md,
        backgroundColor: '#F3F4F6',
        borderRadius: borderRadius.md,
        padding: 4,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderRadius: borderRadius.sm,
    },
    toggleBtnActive: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    toggleBtnText: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    toggleBtnTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    cartItem: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: spacing.md,
    },
    itemImage: {
        width: 80,
        height: 80,
        borderRadius: borderRadius.md,
        backgroundColor: '#F3F4F6',
    },
    itemInfo: {
        flex: 1,
        marginLeft: spacing.md,
        justifyContent: 'center',
    },
    itemName: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: fontSize.md,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: spacing.sm,
    },
    qtyControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
    },
    qtyBtn: {
        padding: 6,
    },
    qtyText: {
        paddingHorizontal: 12,
        fontWeight: 'bold',
        color: colors.text,
    },
    removeBtn: {
        padding: spacing.sm,
        justifyContent: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        fontSize: fontSize.md,
        color: colors.text,
        backgroundColor: 'white',
    },
    inputReadOnly: {
        backgroundColor: '#F9FAFB',
        color: colors.textSecondary,
    },
    row: {
        flexDirection: 'row',
    },
    saveAddressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
        gap: spacing.sm,
    },
    saveAddressLabel: {
        fontSize: fontSize.sm,
        color: colors.text,
    },
    methodOptions: {
        flexDirection: 'row',
        gap: spacing.md,
        flexWrap: 'wrap',
    },
    methodOption: {
        flex: 1,
        minWidth: 120,
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 2,
        borderColor: colors.border,
    },
    methodOptionActive: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}12`,
    },
    methodLabel: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
        marginTop: 4,
    },
    methodLabelActive: {
        color: colors.primary,
    },
    methodDesc: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        marginTop: 2,
    },
    summarySection: {
        marginBottom: spacing.xl,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.xs,
    },
    summaryLabel: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
    },
    summaryValue: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text,
    },
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        marginTop: spacing.sm,
        paddingTop: spacing.md,
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
        padding: spacing.md,
        paddingBottom: Platform.OS === 'ios' ? 34 : spacing.md,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    checkoutBtn: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    checkoutBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: fontSize.lg,
    },
});
