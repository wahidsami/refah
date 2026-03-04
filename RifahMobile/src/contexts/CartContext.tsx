import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../api/client';

export interface CartItem {
    product: Product;
    quantity: number;
}

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (product: Product, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    cartTotal: number;
    itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = '@rifah_cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    useEffect(() => {
        loadCart();
    }, []);

    const loadCart = async () => {
        try {
            const storedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
            if (storedCart) {
                setCartItems(JSON.parse(storedCart));
            }
        } catch (error) {
            console.error('Failed to load cart from storage:', error);
        }
    };

    const saveCart = async (items: CartItem[]) => {
        try {
            await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        } catch (error) {
            console.error('Failed to save cart to storage:', error);
        }
    };

    const normId = (id: string | number | undefined) => String(id ?? '');

    const addToCart = (product: Product, quantity: number = 1) => {
        setCartItems(prev => {
            const pid = normId(product.id);
            const existingItem = prev.find(item => normId(item.product.id) === pid);
            let updatedCart: CartItem[];

            if (existingItem) {
                updatedCart = prev.map(item =>
                    normId(item.product.id) === pid
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            } else {
                updatedCart = [...prev, { product, quantity }];
            }

            saveCart(updatedCart);
            return updatedCart;
        });
    };

    const removeFromCart = (productId: string) => {
        const pid = normId(productId);
        setCartItems(prev => {
            const updatedCart = prev.filter(item => normId(item.product.id) !== pid);
            saveCart(updatedCart);
            return updatedCart;
        });
    };

    const updateQuantity = (productId: string, quantity: number) => {
        const pid = normId(productId);
        setCartItems(prev => {
            if (quantity <= 0) {
                const updatedCart = prev.filter(item => normId(item.product.id) !== pid);
                saveCart(updatedCart);
                return updatedCart;
            }

            const updatedCart = prev.map(item =>
                normId(item.product.id) === pid
                    ? { ...item, quantity }
                    : item
            );
            saveCart(updatedCart);
            return updatedCart;
        });
    };

    const clearCart = () => {
        setCartItems([]);
        saveCart([]);
    };

    const cartTotal = cartItems.reduce(
        (total, item) => total + (Number(item.product.price) || 0) * item.quantity,
        0
    );

    const itemCount = cartItems.reduce(
        (count, item) => count + item.quantity,
        0
    );

    return (
        <CartContext.Provider
            value={{
                cartItems,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                cartTotal,
                itemCount
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
