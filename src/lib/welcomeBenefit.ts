import { WELCOME_NEWSLETTER_COUPON_CODE } from './newsletter';

export type StoreCustomerWelcomeBenefitStatus = 'available' | 'expired' | 'used';

export type StoreCustomerWelcomeBenefit = {
  id: string;
  type: 'newsletter-welcome';
  email: string;
  source: string;
  couponCode: string;
  discountType: 'percentage';
  discountValue: number;
  status: StoreCustomerWelcomeBenefitStatus;
  linkedNewsletterSubscriberId?: string;
  createdAt: string;
  linkedAt: string;
  usedAt?: string;
  usedOrderNumber?: string;
};

export type NewsletterSubscriberLike = {
  id: string;
  email: string;
  source?: string;
  couponCode?: string;
};

export type CartPromotionDraft = {
  type: 'newsletter-welcome';
  benefitId: string;
  customerId: string;
  couponCode: string;
  discountType: 'percentage';
  discountValue: number;
  savedAt: string;
};

export type ActiveWelcomePromotion = {
  draft: CartPromotionDraft;
  benefit: StoreCustomerWelcomeBenefit;
  discountAmount: number;
};

let cartPromotionDraftMemory: CartPromotionDraft | null = null;

function roundCurrencyAmount(value: number) {
  return Math.round(value * 100) / 100;
}

export function normalizeCouponCode(value: string) {
  return value.trim().toUpperCase();
}

export function createWelcomeBenefitFromSubscriber(
  email: string,
  subscriber: NewsletterSubscriberLike,
  timestamp = new Date().toISOString(),
): StoreCustomerWelcomeBenefit {
  return {
    id: `welcome-${subscriber.id || encodeURIComponent(email.toLowerCase())}`,
    type: 'newsletter-welcome',
    email: email.trim().toLowerCase(),
    source: subscriber.source || 'footer-newsletter',
    couponCode: subscriber.couponCode || WELCOME_NEWSLETTER_COUPON_CODE,
    discountType: 'percentage',
    discountValue: 10,
    status: 'available',
    linkedNewsletterSubscriberId: subscriber.id,
    createdAt: timestamp,
    linkedAt: timestamp,
  };
}

export function normalizeStoredWelcomeBenefits(value: unknown): StoreCustomerWelcomeBenefit[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): StoreCustomerWelcomeBenefit | null => {
      if (!item || typeof item !== 'object') return null;
      const raw = item as Partial<StoreCustomerWelcomeBenefit>;

      return {
        id: raw.id || `welcome-${Math.random().toString(36).slice(2, 10)}`,
        type: 'newsletter-welcome' as const,
        email: String(raw.email || '').trim().toLowerCase(),
        source: raw.source || 'footer-newsletter',
        couponCode: raw.couponCode || WELCOME_NEWSLETTER_COUPON_CODE,
        discountType: 'percentage' as const,
        discountValue: Number(raw.discountValue || 10),
        status: (raw.status === 'used' || raw.status === 'expired' ? raw.status : 'available') as StoreCustomerWelcomeBenefitStatus,
        linkedNewsletterSubscriberId: raw.linkedNewsletterSubscriberId,
        createdAt: raw.createdAt || new Date().toISOString(),
        linkedAt: raw.linkedAt || raw.createdAt || new Date().toISOString(),
        usedAt: raw.usedAt,
        usedOrderNumber: raw.usedOrderNumber,
      };
    })
    .filter((item): item is StoreCustomerWelcomeBenefit => item !== null);
}

export function getAvailableWelcomeBenefit(benefits: StoreCustomerWelcomeBenefit[]) {
  return benefits.find((benefit) => benefit.type === 'newsletter-welcome' && benefit.status === 'available') || null;
}

export function calculateWelcomeBenefitDiscount(subtotal: number, benefit: StoreCustomerWelcomeBenefit | null) {
  if (!benefit || benefit.status !== 'available') return 0;
  if (benefit.discountType !== 'percentage') return 0;
  if (subtotal <= 0) return 0;
  return roundCurrencyAmount(subtotal * (benefit.discountValue / 100));
}

export function createCartPromotionDraft(customerId: string, benefit: StoreCustomerWelcomeBenefit): CartPromotionDraft {
  return {
    type: 'newsletter-welcome',
    benefitId: benefit.id,
    customerId,
    couponCode: benefit.couponCode || WELCOME_NEWSLETTER_COUPON_CODE,
    discountType: benefit.discountType,
    discountValue: benefit.discountValue,
    savedAt: new Date().toISOString(),
  };
}

export function readCartPromotionDraft(): CartPromotionDraft | null {
  return cartPromotionDraftMemory;
}

export function saveCartPromotionDraft(draft: CartPromotionDraft) {
  cartPromotionDraftMemory = draft;
}

export function clearCartPromotionDraft() {
  cartPromotionDraftMemory = null;
}

export function isCartPromotionDraftValid(
  draft: CartPromotionDraft | null,
  customerId: string | undefined,
  benefit: StoreCustomerWelcomeBenefit | null,
) {
  return Boolean(
    draft
      && customerId
      && benefit
      && benefit.status === 'available'
      && draft.type === 'newsletter-welcome'
      && draft.customerId === customerId
      && draft.benefitId === benefit.id,
  );
}

export function resolveActiveWelcomePromotion(
  draft: CartPromotionDraft | null,
  customerId: string | undefined,
  benefit: StoreCustomerWelcomeBenefit | null,
  subtotal: number,
): ActiveWelcomePromotion | null {
  if (!isCartPromotionDraftValid(draft, customerId, benefit)) {
    return null;
  }

  return {
    draft,
    benefit,
    discountAmount: calculateWelcomeBenefitDiscount(subtotal, benefit),
  };
}
