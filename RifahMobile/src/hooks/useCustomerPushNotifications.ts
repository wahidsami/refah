import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { api } from '../api/client';

const KEYS = { ACCESS_TOKEN: 'refah_access_token' };

// Push notifications were removed from Expo Go on SDK 53+; skip setup so app runs in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';
if (!isExpoGo) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

export function useCustomerPushNotifications(navigationRef: React.RefObject<any>) {
    const [deviceToken, setDeviceToken] = useState<string>('');
    const responseListenerRef = useRef<Notifications.Subscription | undefined>();

    useEffect(() => {
        if (isExpoGo) {
            console.log('⚠️ Running in Expo Go - Push notifications disabled (SDK 53+ limitation)');
            return; // Push not supported in Expo Go (SDK 53+); skip to avoid crash
        }

        console.log('✅ Running in dev build - Push notifications enabled');
        
        let mounted = true;

        const registerAndSendToken = async () => {
            const token = await SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
            console.log('Access token exists:', !!token);
            if (!token || !mounted) return;

            try {
                console.log('Registering push token...');
                const pushToken = await registerForPushNotificationsAsync();
                console.log('Push token received:', pushToken ? `${pushToken.substring(0, 20)}...` : 'null');
                if (pushToken && mounted) {
                    setDeviceToken(pushToken);
                    console.log('Sending FCM token to backend...');
                    await api.registerFcmToken(pushToken);
                    console.log('✅ FCM token registered successfully');
                }
            } catch (e) {
                console.warn('Push registration failed:', e);
            }
        };

        registerAndSendToken();

        responseListenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data as Record<string, string>;
            const type = data?.type;
            const nav = navigationRef?.current;
            if (!nav?.navigate) return;

            if (type === 'BOOKING_CONFIRMED' || type === 'BOOKING_CANCELLED') {
                nav.navigate('Tabs', { screen: 'Appointments' });
            } else if (type === 'SERVICE_COMPLETED_REMAINDER_DUE') {
                nav.navigate('ServiceCompletedModal', {
                    type: 'remainder_due',
                    appointmentId: data?.appointmentId,
                    tenantId: data?.tenantId,
                    remainderAmount: data?.remainderAmount,
                });
            } else if (type === 'SERVICE_COMPLETED_THANK_YOU') {
                nav.navigate('ServiceCompletedModal', {
                    type: 'thank_you',
                    appointmentId: data?.appointmentId,
                    tenantId: data?.tenantId,
                });
            } else if (type === 'REVIEW_REPLY' && data?.tenantId) {
                nav.navigate('Tenant', { tenantId: data.tenantId, openTab: 'reviews' });
            } else if (type === 'MARKETING' && data?.tenantId) {
                if (data?.linkType === 'service' && data?.serviceId) {
                    nav.navigate('Tenant', { tenantId: data.tenantId, openServiceId: data.serviceId });
                } else {
                    nav.navigate('Tenant', { tenantId: data.tenantId });
                }
            } else {
                nav.navigate('Tabs', { screen: 'Me' });
            }
        });

        const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
            const data = (notification.request.content.data || {}) as Record<string, string>;
            const type = data?.type;
            const nav = navigationRef?.current;
            if (!nav?.navigate) return;
            if (type === 'SERVICE_COMPLETED_REMAINDER_DUE') {
                nav.navigate('ServiceCompletedModal', {
                    type: 'remainder_due',
                    appointmentId: data?.appointmentId,
                    tenantId: data?.tenantId,
                    remainderAmount: data?.remainderAmount,
                });
            } else if (type === 'SERVICE_COMPLETED_THANK_YOU') {
                nav.navigate('ServiceCompletedModal', {
                    type: 'thank_you',
                    appointmentId: data?.appointmentId,
                    tenantId: data?.tenantId,
                });
            }
        });

        return () => {
            mounted = false;
            if (responseListenerRef.current) {
                Notifications.removeNotificationSubscription(responseListenerRef.current);
            }
            if (receivedSubscription) {
                Notifications.removeNotificationSubscription(receivedSubscription);
            }
        };
    }, [navigationRef]);

    return { deviceToken };
}

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
    if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return undefined;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        console.log('Push permission not granted');
        return undefined;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
        });
    }

    try {
        // Try device push token first (requires Firebase)
        const tokenData = await Notifications.getDevicePushTokenAsync();
        if (tokenData?.data) {
            console.log('✅ Using device push token (Firebase)');
            return tokenData.data;
        }
    } catch (e) {
        console.warn('Device push token failed, trying Expo token...');
    }

    try {
        // Fallback to Expo push token (no Firebase needed)
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (projectId) {
            const expoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            console.log('✅ Using Expo push token (no Firebase needed)');
            return expoToken;
        }
    } catch (e2) {
        console.warn('Expo push token fallback failed:', e2?.message);
    }
    
    return undefined;
}
