import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { StoreProduct as Product } from '../types/store';
import { useCustomerSession } from './CustomerSessionContext';
import {
  clearCurrentCustomerCart,
  getCurrentCustomerCart,
  saveCurrentCustomerCart,
} from '../lib/storeCustomerApi';
import { calculateWelcomeBenefitDiscount } from '../lib/welcomeBenefit';

export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
  color: string;
}

interface CartContextData {
  cart: CartItem[];
  addToCart: (product: Product, quantity: number, size: string, color: string) => void;
  clearCart: () => void;
  removeFromCart: (productId: string, size: string, color: string) => void;
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  appliedBenefitId: string | null;
  setAppliedBenefitId: (benefitId: string | null) => void;
  cartCount: number;
  cartTotal: number;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

function getCartItemKey(item: CartItem) {
  return `${item.product.id}::${item.size}::${item.color}`;
}

function getCartSignature(items: CartItem[]) {
  return JSON.stringify(
    items
      .map((item) => ({
        id: item.product.id,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      }))
      .sort((left, right) => left.id.localeCompare(right.id) || left.size.localeCompare(right.size) || left.color.localeCompare(right.color)),
  );
}

function mergeCartItems(baseItems: CartItem[], incomingItems: CartItem[]) {
  const map = new Map<string, CartItem>();

  for (const item of [...baseItems, ...incomingItems]) {
    const key = getCartItemKey(item);
    const existing = map.get(key);

    if (existing) {
      map.set(key, {
        ...existing,
        quantity: existing.quantity + item.quantity,
      });
      continue;
    }

    map.set(key, { ...item });
  }

  return [...map.values()];
}

function getCartSignatureWithPromotion(signature: string, appliedBenefitId: string | null) {
  return `${signature}::benefit=${appliedBenefitId || ''}`;
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { currentCustomer, isLoggedIn, isSessionLoading } = useCustomerSession();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [appliedBenefitId, setAppliedBenefitId] = useState<string | null>(null);
  const cartRef = useRef<CartItem[]>([]);
  const appliedBenefitIdRef = useRef<string | null>(null);
  const previousCustomerIdRef = useRef<string | null>(null);
  const lastSyncedSignatureRef = useRef<string>('');
  const hydrationInFlightRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    appliedBenefitIdRef.current = appliedBenefitId;
  }, [appliedBenefitId]);

  useEffect(() => {
    if (isSessionLoading) {
      return;
    }

    const currentCustomerId = currentCustomer?.id || null;
    const previousCustomerId = previousCustomerIdRef.current;

    if (previousCustomerId && previousCustomerId !== currentCustomerId) {
      setCart([]);
      cartRef.current = [];
      setAppliedBenefitId(null);
      lastSyncedSignatureRef.current = '';
    }

    previousCustomerIdRef.current = currentCustomerId;
  }, [currentCustomer?.id, isSessionLoading]);

  useEffect(() => {
    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isSessionLoading || !isLoggedIn || !currentCustomer?.id) {
      hydrationInFlightRef.current = false;
      return;
    }

    let cancelled = false;
    hydrationInFlightRef.current = true;

    void getCurrentCustomerCart()
      .then((payload) => {
        if (cancelled) return;

        const serverCart = payload.items.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        }));
        const guestCart = cartRef.current;
        const serverSignature = getCartSignature(serverCart);
        const guestSignature = getCartSignature(guestCart);

        const nextCart = !guestCart.length
          ? serverCart
          : !serverCart.length
            ? guestCart
            : serverSignature === guestSignature
              ? serverCart
              : mergeCartItems(serverCart, guestCart);

        setCart(nextCart);
        cartRef.current = nextCart;
        setAppliedBenefitId(payload.appliedBenefitId || null);
        lastSyncedSignatureRef.current = getCartSignatureWithPromotion(serverSignature, payload.appliedBenefitId || null);
      })
      .catch((error) => {
        console.error('Falha ao carregar o carrinho do cliente', error);
      })
      .finally(() => {
        if (!cancelled) {
          hydrationInFlightRef.current = false;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentCustomer?.id, isLoggedIn, isSessionLoading]);

  useEffect(() => {
    if (isSessionLoading || !isLoggedIn || !currentCustomer?.id || hydrationInFlightRef.current) {
      return;
    }

    const signature = getCartSignatureWithPromotion(getCartSignature(cart), appliedBenefitId);
    if (signature === lastSyncedSignatureRef.current) {
      return;
    }

    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = window.setTimeout(() => {
      const activeBenefit = currentCustomer?.welcomeBenefits.find(
        (benefit) => benefit.id === appliedBenefitIdRef.current && benefit.status === 'available',
      ) || null;
      const discount = activeBenefit
        ? calculateWelcomeBenefitDiscount(
            cartRef.current.reduce(
              (acc, item) => acc + (item.product.precoPromocional || item.product.preco) * item.quantity,
              0,
            ),
            activeBenefit,
          )
        : 0;

      void saveCurrentCustomerCart({
        appliedBenefitId: activeBenefit?.id || null,
        items: cart.map((item) => ({
          productId: item.product.id,
          product: item.product,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        })),
        discount,
      })
        .then((payload) => {
          setAppliedBenefitId(payload.appliedBenefitId || null);
          lastSyncedSignatureRef.current = getCartSignatureWithPromotion(
            getCartSignature(payload.items.map((item) => ({
              product: item.product,
              quantity: item.quantity,
              size: item.size,
              color: item.color,
            }))),
            payload.appliedBenefitId || null,
          );
        })
        .catch((error) => {
          console.error('Falha ao salvar o carrinho do cliente', error);
        });
    }, 250);

    return () => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, [appliedBenefitId, cart, currentCustomer?.id, currentCustomer?.welcomeBenefits, isLoggedIn, isSessionLoading]);

  const addToCart = (product: Product, quantity: number, size: string, color: string) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.size === size && item.color === color,
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.size === size && item.color === color
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...prev, { product, quantity, size, color }];
    });
  };

  const removeFromCart = (productId: string, size: string, color: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.product.id === productId && item.size === size && item.color === color),
      ),
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedBenefitId(null);
    lastSyncedSignatureRef.current = getCartSignatureWithPromotion('[]', null);

    if (isLoggedIn && currentCustomer?.id) {
      void clearCurrentCustomerCart().catch((error) => {
        console.error('Falha ao limpar o carrinho do cliente', error);
      });
    }
  };

  const updateQuantity = (productId: string, size: string, color: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId && item.size === size && item.color === color
          ? { ...item, quantity }
          : item,
      ),
    );
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce(
    (acc, item) => acc + (item.product.precoPromocional || item.product.preco) * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        clearCart,
        removeFromCart,
        updateQuantity,
        cartCount,
        cartTotal,
        appliedBenefitId,
        setAppliedBenefitId,
        wishlist,
        toggleWishlist,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
