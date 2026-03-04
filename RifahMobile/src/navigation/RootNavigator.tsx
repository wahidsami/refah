import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { PurchasesScreen } from '../screens/PurchasesScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { TenantScreen } from '../screens/TenantScreen';
import { BookingFlow } from '../screens/BookingFlow';
import { HotDealDetailScreen } from '../screens/HotDealDetailScreen';
import { ServiceDetailScreen } from '../screens/ServiceDetailScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { CartScreen } from '../screens/CartScreen';
import { PaymentSimulatorScreen } from '../screens/PaymentSimulatorScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { FaqScreen } from '../screens/FaqScreen';
import { TermsScreen } from '../screens/TermsScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { ServiceCompletedModalScreen } from '../screens/ServiceCompletedModalScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { AppointmentDetailScreen } from '../screens/AppointmentDetailScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import { RescheduleScreen } from '../screens/RescheduleScreen';
import { EmployeeDetailScreen } from '../screens/EmployeeDetailScreen';
import { PaymentHistoryScreen } from '../screens/PaymentHistoryScreen';
import { AboutRefahScreen } from '../screens/AboutRefahScreen';
import { useCustomerPushNotifications } from '../hooks/useCustomerPushNotifications';

const Stack = createNativeStackNavigator();

export function RootNavigator({ navigationRef }: { navigationRef: React.RefObject<any> }) {
    useCustomerPushNotifications(navigationRef);

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Screen name="Browse" component={SearchScreen} />
            <Stack.Screen name="Tenant" component={TenantScreen} />
            <Stack.Screen name="Booking" component={BookingFlow} />
            <Stack.Screen name="MyPurchases" component={PurchasesScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} />
            <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
            <Stack.Screen name="AboutRefah" component={AboutRefahScreen} />
            <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen name="Reschedule" component={RescheduleScreen} />
            <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} />
            <Stack.Screen name="HotDealDetail" component={HotDealDetailScreen} />
            <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="PaymentSimulator" component={PaymentSimulatorScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="FAQ" component={FaqScreen} />
            <Stack.Screen name="Terms" component={TermsScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen
                name="ServiceCompletedModal"
                component={ServiceCompletedModalScreen}
                options={{ presentation: 'modal' }}
            />
        </Stack.Navigator>
    );
}
