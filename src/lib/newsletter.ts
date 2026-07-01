export const WELCOME_NEWSLETTER_COUPON_CODE = 'BEMVINDA10';
export const NEWSLETTER_DEFAULT_SOURCE = 'footer-newsletter';

const NEWSLETTER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeNewsletterEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidNewsletterEmail(value: string) {
  return NEWSLETTER_EMAIL_REGEX.test(normalizeNewsletterEmail(value));
}

export function createNewsletterSubscriberId(email: string) {
  return `newsletter:${encodeURIComponent(normalizeNewsletterEmail(email))}`;
}
