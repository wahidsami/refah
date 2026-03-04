import type { OrderStatus } from '../api/client';

/**
 * Order status display color (hex) - aligned with tenant dashboard semantics.
 */
export function getOrderStatusColor(status: string): string {
    switch (status) {
        case 'pending': return '#F59E0B';       // Orange
        case 'confirmed': return '#3B82F6';    // Blue
        case 'processing': return '#8B5CF6';   // Purple
        case 'ready_for_pickup': return '#6366F1'; // Indigo
        case 'shipped': return '#06B6D4';      // Cyan
        case 'delivered': return '#14B8A6';    // Teal
        case 'completed': return '#10B981';    // Green
        case 'cancelled': return '#EF4444';    // Red
        case 'refunded': return '#6B7280';     // Gray
        default: return '#6B7280';
    }
}

/**
 * Order status label key for i18n (e.g. orderStatus_pending).
 */
export function getOrderStatusKey(status: string): string {
    const key = status ? `orderStatus_${status}` : 'orderStatus_pending';
    return key;
}

/**
 * Payment status display color (hex).
 */
export function getPaymentStatusColor(status: string): string {
    switch (status) {
        case 'pending': return '#F59E0B';
        case 'paid': return '#10B981';
        case 'failed': return '#EF4444';
        case 'refunded': return '#6B7280';
        case 'partially_refunded': return '#F97316';
        default: return '#6B7280';
    }
}

/**
 * Payment status label key for i18n (e.g. paymentStatus_paid).
 */
export function getPaymentStatusKey(status: string): string {
    const key = status ? `paymentStatus_${status}` : 'paymentStatus_pending';
    return key;
}

/**
 * Whether the order can be cancelled by the customer (pending or confirmed only).
 */
export function canCancelOrder(status: OrderStatus): boolean {
    return status === 'pending' || status === 'confirmed';
}
