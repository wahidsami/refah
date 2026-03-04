/**
 * Secure API Client for Refah Mobile App
 * Adapted from web client with AsyncStorage for React Native
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// API base URL.  We support three sources for the value, in order of
// priority:
// 1. `Constants.expoConfig.extra.serverUrl` — set it in `app.json` or via
//    `EAS_BUILD_PROFILE_EXTRA_SERVERURL` when building with EAS.
// 2. `process.env.EXPO_PUBLIC_SERVER_URL` — works in Expo Go / dev builds.
// 3. a hard‑coded default that points at the emulator loopback for web
//    debugging.
//
// When running on a physical device, you must override this value with the
// machine's LAN IP (e.g. "http://192.168.0.100:5000") or a public URL so the
// APK can reach the backend.
//
// Auth routes:  /api/v1/auth/*
// App routes:   /api/v1/*
import Constants from 'expo-constants';

const _defaultServer = 'http://10.0.2.2:5000';

export const SERVER_URL =
  (Constants.expoConfig?.extra?.serverUrl as string) ||
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SERVER_URL) ||
  _defaultServer;

const API_BASE_URL = `${SERVER_URL}/api/v1`;

/** Request options: skipAuth = true for login, register, forgot/reset password (no Bearer token) */
type RequestOptions = RequestInit & { skipAuth?: boolean };

/**
 * Helper to get full image URL from relative path
 */
export const getImageUrl = (path: string | null | undefined): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;

    // Normalize path (convert backslashes to forward slashes if any)
    const normalizedPath = path.replace(/\\/g, '/');

    // Check if the path already starts with /uploads
    if (normalizedPath.startsWith('uploads/') || normalizedPath.startsWith('/uploads/')) {
        const fullPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
        return `${SERVER_URL}${fullPath}`;
    }

    // Prepend /uploads/ if missing
    const prefix = normalizedPath.startsWith('/') ? '/uploads' : '/uploads/';
    return `${SERVER_URL}${prefix}${normalizedPath}`;
};

// Storage keys
const KEYS = {
    ACCESS_TOKEN: 'refah_access_token',
    REFRESH_TOKEN: 'refah_refresh_token',
    USER: 'refah_user',
};

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}

export interface User {
    id: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    createdAt?: string;
    dateOfBirth?: string | null;
    gender?: 'male' | 'female' | 'other' | null;
    emailVerified: boolean;
    phoneVerified: boolean;
    walletBalance: number;
    loyaltyPoints: number;
    totalBookings: number;
    totalSpent: number;
    preferredLanguage?: string;
    notificationPreferences?: {
        email: boolean;
        sms: boolean;
        push?: boolean;
        whatsapp?: boolean;
    };
    addressStreet?: string;
    addressCity?: string;
    addressBuilding?: string;
    addressFloor?: string;
    addressApartment?: string;
    addressDistrict?: string;
    addressPhone?: string;
    addressNotes?: string;
}

export interface Tenant {
    id: string;
    name: string;
    name_en?: string;
    name_ar?: string;
    slug: string;
    plan: string;
    status: string;
    businessType?: string | string[];
    servicesCount?: number;
    staffCount?: number;
    customColors?: {
        primaryColor: string;
    };
    logo?: string;
    coverImage?: string;
    city?: string;
    location?: string;
    address?: string;
    buildingNumber?: string;
    street?: string;
    district?: string;
    country?: string;
    googleMapLink?: string;
    coordinates?: { lat: number; lng: number } | null;
    description?: string;
    descriptionAr?: string;
    description_en?: string;
    description_ar?: string;
    phone?: string;
    mobile?: string;
    email?: string;
    website?: string;
    instagramUrl?: string;
    twitterUrl?: string;
    facebookUrl?: string;
    workingHours?: {
        [key: string]: { open: string; close: string; isOpen: boolean };
    };
    isAvailable?: boolean;
    defaultDeliveryFee?: number;
}

export interface GiftProduct {
    id: string;
    name_en: string;
    name_ar: string;
    image?: string;
    images?: string[];
}

export interface Service {
    id: string;
    name_en: string;
    name_ar: string;
    description_en: string;
    description_ar: string;
    category: string;
    duration: number;
    basePrice?: number;
    rawPrice?: number;
    finalPrice?: number;
    image?: string;
    hasOffer?: boolean;
    offerDetails?: string;
    offerFrom?: string;
    offerTo?: string;
    offerActive?: boolean;
    hasGift?: boolean;
    giftType?: string;
    giftDetails?: string;
    giftProduct?: GiftProduct;
}

export interface Product {
    id: string;
    name_en: string;
    name_ar: string;
    description_en: string;
    description_ar: string;
    category: string;
    price: number;
    rawPrice: number;
    images?: string[];
    stock: number;
    isAvailable: boolean;
    allowsDelivery?: boolean;
    allowsPickup?: boolean;
}

export interface Staff {
    id: string;
    name: string;
    role?: string;
    specialty?: string;
    avatar?: string;
    image?: string;
    rating: number;
    skills: string[];
    bio?: string;
    experience?: string;
    totalBookings?: number;
    aiScore?: number;
    recommended?: boolean;
    specialization?: string;
}

export interface Booking {
    id: string;
    serviceId: string;
    staffId: string;
    platformUserId: string;
    startTime: string;
    endTime: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
    price: number;
    paymentStatus?: string;
    paymentMethod?: string;
    paidAt?: string;
    notes?: string;
    tenantId?: string;
    Service?: Service;
    Staff?: Staff;
    service?: Service;
    staff?: Staff;
    tenant?: {
        id: string;
        name: string;
        slug?: string;
        logo?: string;
    };
    duration?: number;
    depositAmount?: number;
    remainderAmount?: number;
    totalPaid?: number;
    depositPaid?: boolean;
    remainderPaid?: boolean;
    reminder?: {
        reminderMinutesBefore?: number;
        sentAt?: string | null;
    } | null;
}

export interface OrderItem {
    id: string;
    productId: string;
    quantity: number;
    price?: number;
    unitPrice?: number;
    totalPrice?: number;
    productName?: string;
    productNameAr?: string;
    Product?: {
        name_en: string;
        name_ar?: string;
        images?: string[];
        image?: string;
    };
    product?: {
        name_en: string;
        name_ar?: string;
        images?: string[];
        image?: string;
    };
}

export type OrderStatus =
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'ready_for_pickup'
    | 'shipped'
    | 'delivered'
    | 'completed'
    | 'cancelled'
    | 'refunded';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export type TransactionType = 'booking' | 'product_purchase' | 'refund' | 'wallet_topup' | 'loyalty_redemption' | 'subscription';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Transaction {
    id: string;
    type: TransactionType;
    status: TransactionStatus;
    amount: number;
    currency: string;
    createdAt: string;
    appointmentId?: string | null;
    orderId?: string | null;
    tenantId?: string | null;
    appointment?: {
        id: string;
        service?: { name_en?: string; name_ar?: string };
        staff?: { firstName?: string; lastName?: string };
    } | null;
    order?: { id: string; orderNumber?: string } | null;
    tenant?: { id: string; name?: string; name_en?: string; name_ar?: string } | null;
    paymentMethod?: { id: string; type?: string } | null;
}

export interface PaymentHistoryResponse {
    success: boolean;
    transactions: Transaction[];
    count: number;
    pagination: { total: number; page: number; limit: number; totalPages: number };
}

export interface Order {
    id: string;
    tenantId: string;
    platformUserId: string;
    items: OrderItem[];
    totalAmount: number;
    status: OrderStatus;
    paymentStatus: string;
    paymentMethod: string;
    createdAt: string;
    orderNumber?: string;
    trackingNumber?: string | null;
    estimatedDeliveryDate?: string | null;
    deliveryType?: 'pickup' | 'delivery';
    shippingAddress?: Record<string, string> | null;
    subtotal?: number;
    taxAmount?: number;
    shippingFee?: number;
    platformFee?: number;
    notes?: string | null;
    tenant?: {
        name: string;
        name_en?: string;
        name_ar?: string;
        logo?: string;
    };
}

export interface SlotItem {
    startTime: string;
    endTime: string;
    available: boolean;
    staffId?: string;
    staffName?: string;
}

export interface HotDeal {
    id: string;
    title_en: string;
    title_ar: string;
    description_en?: string;
    description_ar?: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    originalPrice: number;
    discountedPrice: number;
    validFrom: string;
    validUntil: string;
    maxRedemptions: number;
    currentRedemptions: number;
    image?: string;
    tenant?: { id: string; name: string; name_en?: string; name_ar?: string; logo?: string; slug?: string };
    service?: { id: string; name_en: string; name_ar: string; duration?: number };
}

class ApiClient {
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    /** Use AsyncStorage on web (SecureStore not fully supported there); SecureStore on native. */
    private async getToken(): Promise<string | null> {
        try {
            if (Platform.OS === 'web') {
                return await AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
            }
            return await SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
    }

    private async getRefreshToken(): Promise<string | null> {
        try {
            if (Platform.OS === 'web') {
                return await AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
            }
            return await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
        } catch (error) {
            console.error('Error getting refresh token:', error);
            return null;
        }
    }

    async setTokens(accessToken: string, refreshToken: string): Promise<void> {
        try {
            if (Platform.OS === 'web') {
                await AsyncStorage.setItem(KEYS.ACCESS_TOKEN, accessToken);
                await AsyncStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
            } else {
                await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken);
                await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken);
            }
        } catch (error) {
            console.error('Error storing tokens:', error);
        }
    }

    async clearTokens(): Promise<void> {
        try {
            if (Platform.OS === 'web') {
                await AsyncStorage.removeItem(KEYS.ACCESS_TOKEN);
                await AsyncStorage.removeItem(KEYS.REFRESH_TOKEN);
            } else {
                await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
                await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
            }
            await AsyncStorage.removeItem(KEYS.USER);
        } catch (error) {
            console.error('Error clearing tokens:', error);
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(): Promise<string | null> {
        const refreshToken = await this.getRefreshToken();
        if (!refreshToken) return null;

        try {
            const response = await fetch(`${this.baseURL}/auth/user/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
            });

            if (!response.ok) {
                await this.clearTokens();
                return null;
            }

            const data = await response.json();
            if (data.success && data.accessToken) {
                await this.setTokens(data.accessToken, refreshToken);
                return data.accessToken;
            }

            return null;
        } catch (error) {
            console.error('Token refresh failed:', error);
            await this.clearTokens();
            return null;
        }
    }

    /**
     * Make authenticated API request with automatic token refresh.
     * Use skipAuth: true for public auth endpoints (login, forgot-password, reset-password).
     */
    async request(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<Response> {
        const { skipAuth, ...fetchInit } = options;
        const token = await this.getToken();
        const url = `${this.baseURL}${endpoint}`;

        const headers: Record<string, string> = {
            ...(fetchInit.headers as Record<string, string>),
        };

        if (!(fetchInit.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        if (token && !skipAuth) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        console.log('API Request:', {
            url,
            method: fetchInit.method || 'GET',
            headers,
        });

        let response = await fetch(url, {
            ...fetchInit,
            headers,
        });

        if (response.status === 401 && token && !skipAuth) {
            const newToken = await this.refreshAccessToken();
            if (newToken) {
                // Retry with new token
                headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(url, {
                    ...fetchInit,
                    headers,
                });
            } else {
                // Refresh failed, clear tokens
                await this.clearTokens();
            }
        }

        return response;
    }

    /**
     * GET request
     */
    async get<T>(endpoint: string): Promise<T> {
        const response = await this.request(endpoint, { method: 'GET' });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * POST request. Pass { skipAuth: true } for login, forgot-password, reset-password.
     */
    async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
        // Check if data is FormData
        const isFormData = data instanceof FormData;

        const response = await this.request(endpoint, {
            method: 'POST',
            body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
            ...options,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * PUT request
     */
    async put<T>(endpoint: string, data?: any): Promise<T> {
        const response = await this.request(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * PATCH request
     */
    async patch<T>(endpoint: string, data?: any): Promise<T> {
        const response = await this.request(endpoint, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * DELETE request
     */
    async delete<T>(endpoint: string): Promise<T> {
        const response = await this.request(endpoint, { method: 'DELETE' });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * Register FCM token for push notifications (call after login when token is available)
     */
    async registerFcmToken(fcmToken: string): Promise<void> {
        await this.post<{ success: boolean }>('/auth/user/register-fcm', { fcmToken });
    }

    /**
     * Request password reset (forgot password). Sends email with reset link if account exists.
     */
    async forgotPassword(email: string): Promise<{ success: boolean; message?: string }> {
        return this.post<{ success: boolean; message?: string }>('/auth/user/forgot-password', { email: email.trim().toLowerCase() }, { skipAuth: true });
    }

    /**
     * Reset password with token from email link.
     */
    async resetPassword(token: string, password: string): Promise<{ success: boolean; message?: string }> {
        return this.post<{ success: boolean; message?: string }>(`/auth/user/reset-password/${encodeURIComponent(token)}`, { password }, { skipAuth: true });
    }

    /**
     * Get user profile from server (includes notificationPreferences)
     */
    async getProfile(): Promise<{ user: User }> {
        const res = await this.get<{ success: boolean; user: User }>('/users/profile');
        return { user: res.user };
    }

    /**
     * Update user profile (e.g. notificationPreferences)
     */
    async updateProfile(payload: { notificationPreferences?: Partial<NonNullable<User['notificationPreferences']>>; [k: string]: any }): Promise<{ user: User }> {
        const res = await this.put<{ success: boolean; user: User }>('/users/profile', payload);
        return { user: res.user };
    }

    /**
     * Change password (authenticated). PUT /users/password
     */
    async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
        return this.put<{ success: boolean; message?: string }>('/users/password', { currentPassword, newPassword });
    }

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        const token = await this.getToken();
        return !!token;
    }

    /**
     * Get stored user data
     */
    async getUser(): Promise<User | null> {
        try {
            const userJson = await AsyncStorage.getItem(KEYS.USER);
            return userJson ? JSON.parse(userJson) : null;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    /**
     * Store user data
     */
    async setUser(user: User): Promise<void> {
        try {
            await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
        } catch (error) {
            console.error('Error storing user:', error);
        }
    }

    /**
     * Upload profile photo (authenticated).
     * POST /users/profile/photo with FormData key 'photo'.
     * Returns { success, profileImage }.
     */
    async uploadProfilePhoto(uri: string, fileName: string = 'photo.jpg', type: string = 'image/jpeg'): Promise<{ success: boolean; profileImage: string }> {
        const formData = new FormData();
        formData.append('photo', {
            uri,
            name: fileName,
            type,
        } as any);
        const response = await this.request('/users/profile/photo', {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Upload failed' }));
            throw new Error(error.message || 'Upload failed');
        }
        return response.json();
    }

    /**
     * Get user notifications (inbox)
     */
    async getNotifications(page?: number, limit?: number): Promise<{
        notifications: Array<{
            id: string;
            type: string;
            title: string;
            body: string | null;
            data: Record<string, string>;
            readAt: string | null;
            createdAt: string;
            tenantId: string | null;
        }>;
        pagination: { total: number; page: number; limit: number; totalPages: number };
    }> {
        const params = new URLSearchParams();
        if (page != null) params.set('page', String(page));
        if (limit != null) params.set('limit', String(limit));
        const q = params.toString() ? `?${params.toString()}` : '';
        const response = await this.get<{
            success: boolean;
            notifications: any[];
            pagination: { total: number; page: number; limit: number; totalPages: number };
        }>(`/users/notifications${q}`);
        return {
            notifications: response.notifications || [],
            pagination: response.pagination || { total: 0, page: 1, limit: 30, totalPages: 0 },
        };
    }

    /**
     * Mark a notification as read
     */
    async markNotificationRead(id: string): Promise<void> {
        await this.patch<{ success: boolean }>(`/users/notifications/${id}/read`, {});
    }

    /**
     * Get user bookings
     */
    async getBookings(status?: 'upcoming' | 'completed' | 'cancelled'): Promise<Booking[]> {
        const response = await this.get<{ success: boolean; appointments: Booking[] }>(
            status ? `/bookings?status=${status}` : '/bookings'
        );
        return response.appointments || [];
    }

    /**
     * Cancel a booking
     */
    async cancelBooking(id: string): Promise<{ success: boolean; refundAmount?: number; feeRetained?: number }> {
        const response = await this.patch<{ success: boolean; message?: string; refundAmount?: number; feeRetained?: number }>(
            `/bookings/${id}/cancel`
        );
        return {
            success: response.success,
            refundAmount: response.refundAmount,
            feeRetained: response.feeRetained,
        };
    }

    /**
     * Get booking details
     */
    async getBooking(id: string): Promise<Booking> {
        const response = await this.get<{ success: boolean; appointment: Booking }>(
            `/bookings/${id}`
        );
        return response.appointment;
    }

    /**
     * Set or clear reminder for a booking. notify: true with minutesBefore (e.g. 30, 60, 120).
     */
    async updateBookingReminder(id: string, notify: boolean, minutesBefore?: number): Promise<{ reminder: { minutesBefore: number } | null }> {
        const response = await this.patch<{ success: boolean; reminder: { minutesBefore: number } | null }>(
            `/bookings/${id}/reminder`,
            { notify, minutesBefore: minutesBefore ?? 30 }
        );
        return { reminder: response.reminder ?? null };
    }

    /**
     * Reschedule a booking to a new start time (must be 24h+ before current appointment).
     */
    async rescheduleBooking(id: string, startTime: string, staffId?: string): Promise<Booking> {
        const response = await this.patch<{ success: boolean; appointment: Booking }>(
            `/bookings/${id}/reschedule`,
            { startTime, staffId }
        );
        return response.appointment;
    }

    /**
     * Add tip to a completed appointment
     */
    async addAppointmentTip(appointmentId: string, amount: number, paymentMethod?: string): Promise<{ success: boolean; message?: string }> {
        return this.post<{ success: boolean; message?: string }>(`/users/bookings/${appointmentId}/tip`, { amount, paymentMethod: paymentMethod || 'cash' });
    }

    /**
     * Get user orders
     */
    async getOrders(): Promise<Order[]> {
        const response = await this.get<{ success: boolean; orders: Order[] }>('/orders');
        return response.orders || [];
    }

    /**
     * Create order (authenticated user).
     * Payload: tenantId, items: [{ productId, quantity }], paymentMethod: 'online' | 'cash_on_delivery' | 'pay_on_visit',
     * deliveryType: 'pickup' | 'delivery', shippingAddress? (when delivery), shippingFee? (when delivery), notes?
     */
    async createOrder(payload: {
        tenantId: string;
        items: Array<{ productId: string; quantity: number }>;
        paymentMethod: 'online' | 'cash_on_delivery' | 'pay_on_visit';
        deliveryType: 'pickup' | 'delivery';
        shippingAddress?: { street?: string; city?: string; district?: string; building?: string; floor?: string; apartment?: string; phone?: string; notes?: string };
        shippingFee?: number;
        notes?: string;
    }): Promise<{ success: boolean; order: Order; message?: string }> {
        const response = await this.post<{ success: boolean; order: Order; message?: string }>('/orders', payload);
        return response;
    }

    /**
     * Create order as guest (public endpoint, no auth).
     * POST /api/v1/public/tenant/:tenantId/orders
     */
    async createPublicOrder(tenantId: string, payload: {
        items: Array<{ productId: string; quantity: number }>;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        deliveryType: 'pickup' | 'delivery';
        shippingAddress?: { street?: string; city?: string; district?: string; building?: string; floor?: string; apartment?: string; phone?: string; notes?: string };
        shippingFee?: number;
        paymentMethod: 'online' | 'cash_on_delivery' | 'pay_on_visit';
    }): Promise<{ success: boolean; data?: { orderId: string; orderReference: string; total: number; items: any[] }; message?: string }> {
        const response = await this.post<{ success: boolean; data?: any; message?: string }>(
            `/public/tenant/${tenantId}/orders`,
            payload
        );
        return response;
    }

    /**
     * Get order details
     */
    async getOrder(id: string): Promise<Order> {
        const response = await this.get<{ success: boolean; order: Order }>(`/orders/${id}`);
        return response.order;
    }

    /**
     * Cancel an order
     */
    async cancelOrder(id: string): Promise<boolean> {
        const response = await this.patch<{ success: boolean; message: string }>(
            `/orders/${id}/cancel`
        );
        return response.success;
    }

    /**
     * Get payment history with optional filters and pagination
     */
    async getPaymentHistory(params?: {
        type?: TransactionType;
        status?: TransactionStatus;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }): Promise<PaymentHistoryResponse> {
        const q = new URLSearchParams();
        if (params?.type) q.set('type', params.type);
        if (params?.status) q.set('status', params.status);
        if (params?.startDate) q.set('startDate', params.startDate);
        if (params?.endDate) q.set('endDate', params.endDate);
        if (params?.page != null) q.set('page', String(params.page));
        if (params?.limit != null) q.set('limit', String(params.limit));
        const query = q.toString();
        const endpoint = query ? `/payments/history?${query}` : '/payments/history';
        const res = await this.get<PaymentHistoryResponse>(endpoint);
        return res;
    }

    /**
     * Process payment
     */
    async processPayment(data: {
        appointmentId?: string;
        orderId?: string;
        amount: number;
        cardNumber: string;
        expiryDate: string;
        cvv: string;
        cardholderName: string;
        saveCard?: boolean;
        tenantId?: string;
    }): Promise<{ success: boolean; transaction: any }> {
        return this.post<{ success: boolean; transaction: any }>('/payments/process', data);
    }

    /**
     * Get active hot deals for mobile carousel
     */
    async getHotDeals(): Promise<HotDeal[]> {
        const response = await this.get<{ success: boolean; deals: HotDeal[] }>('/hot-deals');
        return response.deals || [];
    }

    /**
     * Get service categories
     */
    async getCategories(): Promise<ServiceCategory[]> {
        const response = await this.get<{ success: boolean; categories: ServiceCategory[] }>('/categories');
        return response.categories || [];
    }

    /**
     * Get newest tenants (recently onboarded)
     */
    async getNewTenants(limit: number = 8): Promise<Tenant[]> {
        const response = await this.get<{ success: boolean; tenants: Tenant[] }>(`/tenants?sort=newest&limit=${limit}`);
        return response.tenants || [];
    }

    /**
     * Get trending tenants (most bookings / activity)
     */
    async getTrendingTenants(limit: number = 8): Promise<Tenant[]> {
        const response = await this.get<{ success: boolean; tenants: Tenant[] }>(`/tenants?sort=trending&limit=${limit}`);
        return response.tenants || [];
    }

    /**
     * Search tenants by name/slug and/or by service category (for Browse/Search screen).
     * When categorySlug is set, returns tenants that have at least one service in that category.
     */
    async getSearchTenants(query: string, limit: number = 20, categorySlug?: string): Promise<Tenant[]> {
        const params = new URLSearchParams();
        params.set('limit', String(limit));
        if (categorySlug && categorySlug.trim()) {
            params.set('categorySlug', categorySlug.trim());
        }
        if (query && query.trim()) {
            params.set('search', query.trim());
        }
        if (!categorySlug && !query?.trim()) return [];
        const response = await this.get<{ success: boolean; tenants: Tenant[] }>(
            `/tenants?${params.toString()}`
        );
        return response.tenants || [];
    }

    /**
     * Get top service providers (cross-tenant staff) from backend.
     * Returns staff with tenantId and tenantName for navigation.
     */
    async getTopProviders(limit: number = 10): Promise<StaffWithTenant[]> {
        const response = await this.get<{ success: boolean; providers: StaffWithTenant[] }>(
            `/public/top-providers?limit=${limit}`
        );
        return response.providers || [];
    }

    /**
     * Get single service details (public), including giftProduct when gift is a product.
     */
    async getPublicService(tenantId: string, serviceId: string): Promise<Service | null> {
        const response = await this.get<{ success: boolean; service: Service }>(
            `/public/tenant/${tenantId}/services/${serviceId}`
        );
        return response?.success && response.service ? response.service : null;
    }

    /**
     * Get single staff member (public), for employee details page.
     */
    async getPublicStaffById(tenantId: string, staffId: string): Promise<Staff | null> {
        const response = await this.get<{ success: boolean; staff: Staff }>(
            `/public/tenant/${tenantId}/staff/${staffId}`
        );
        return response?.success && response.staff ? response.staff : null;
    }

    /**
     * Get tenant reviews (public). Optional staffId to show only reviews for that employee.
     * Same reviews appear in the staff app for that employee.
     */
    async getPublicReviews(tenantId: string, options?: { staffId?: string }): Promise<{
        reviews: Array<{
            id: string;
            rating: number;
            comment: string | null;
            customerName: string | null;
            staffReply: string | null;
            staffRepliedAt: string | null;
            createdAt: string;
            staff?: { id: string; name: string } | null;
            customerProfileImage?: string | null;
        }>;
        avgRating: number | null;
        total: number;
    }> {
        const qs = options?.staffId ? `?staffId=${encodeURIComponent(options.staffId)}` : '';
        const response = await this.get<{ success: boolean; reviews: any[]; avgRating: number | null; total: number }>(
            `/public/tenant/${tenantId}/reviews${qs}`
        );
        return {
            reviews: response?.reviews ?? [],
            avgRating: response?.avgRating ?? null,
            total: response?.total ?? 0
        };
    }
}

/** Staff item from top-providers API (includes tenant for navigation) */
export interface StaffWithTenant extends Staff {
    tenantId?: string;
    tenantName?: string;
}

export interface ServiceCategory {
    id: string;
    name_en: string;
    name_ar: string;
    slug: string;
    icon?: string;
    sortOrder: number;
    isActive: boolean;
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);
