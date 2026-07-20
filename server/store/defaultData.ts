import { randomUUID } from 'node:crypto';
import { defaultSettings, normalizeStoreSettings } from '../../src/types/settings.ts';
import { createEmptyStoredStripeCredentialSet } from '../integrations/stripeCredentials';
import type { StoreSnapshot } from './types';

export function createDefaultStoreSnapshot(): StoreSnapshot {
  return {
    products: [],
    categories: [],
    banners: [],
    homeSections: [],
    homeCards: [],
    raffles: [],
    instagramFeed: [],
    settings: normalizeStoreSettings(defaultSettings),
    carts: [],
    cartItems: [],
    contactMessages: [],
    newsletterSubscribers: [],
    stripeCredentials: {
      test: createEmptyStoredStripeCredentialSet(),
      live: createEmptyStoredStripeCredentialSet(),
    },
  };
}

export function cloneStoreSnapshot(snapshot: StoreSnapshot): StoreSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as StoreSnapshot;
}

export function createId(prefix?: string) {
  return prefix ? `${prefix}-${randomUUID()}` : randomUUID();
}
