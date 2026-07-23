import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { getPhoneE164 } from '../../src/lib/customerForm.ts';
import type { StoreProduct as Product } from '../../src/types/store';
import type {
  CustomerAddressInput,
  CustomerProfileUpdateInput,
  CustomerSessionPayload,
  StoreCustomerAddress,
  StoreCustomerProfile,
} from '../../src/lib/storeCustomerApi.ts';
import {
  createWelcomeBenefitFromSubscriber,
  calculateWelcomeBenefitDiscount,
  getAvailableWelcomeBenefit,
  type StoreCustomerWelcomeBenefit,
} from '../../src/lib/welcomeBenefit.ts';
import {
  createNewsletterSubscriberId,
  isValidNewsletterEmail,
  NEWSLETTER_DEFAULT_SOURCE,
  normalizeNewsletterEmail,
  WELCOME_NEWSLETTER_COUPON_CODE,
} from '../../src/lib/newsletter.ts';
import { defaultSettings, normalizeStoreSettings, type StoreSettings, type StripeMode } from '../../src/types/settings.ts';
import type {
  Banner,
  CategoryInput,
  ContactMessage,
  ContactMessageInput,
  ContactMessageUpdateInput,
  HomeCard,
  HomeCardInput,
  HomeSection,
  HomeSectionInput,
  InstagramPost,
  NewsletterSubscriber,
  NewsletterSubscriberInput,
  ProductInput,
  Raffle,
  RaffleInput,
  StoreCategory,
} from '../../src/types/storeApi.ts';
import {
  applyStripeCredentialInput,
  buildStripeCredentialSummary,
  createEmptyStoredStripeCredentialSet,
  decodeStoredStripeCredentials,
} from '../integrations/stripeCredentials';
import { getAdminRolePermissions, type AdminRole } from '../auth/adminPermissions';

import type {
  AdminDashboardRecentOrder,
  AdminDashboardSummary,
  AdminPromotionInput,
  AdminPromotionRecord,
  AdminPromotionStatus,
  CustomerCartPayload,
  CustomerCartSaveInput,
  AdminCustomerActivity,
  AdminCustomerAddress,
  AdminCustomerAuditLog,
  AdminCustomerOrder,
  AdminCustomerOrderItem,
  AdminCustomerRecord,
  AdminAuthLookup,
  AuditLogRecord,
  AdminPasswordResetTokenRecord,
  AdminSessionLookup,
  AdminSessionPayload,
  AdminUserProfile,
  AuditLogInput,
  CreateAdminPasswordResetTokenInput,
  CreateAdminSessionInput,
  CreateCustomerSessionInput,
  CustomerAddressMutationResult,
  CustomerAuthLookup,
  CustomerBenefitMutationResult,
  CustomerProfileUpdateResult,
  CustomerRegistrationInput,
  CustomerSessionLookup,
  EnsureAdminUserInput,
  ListOptions,
  StoreRepository,
  StoreSnapshot,
  StoredStripeCredentialSet,
  StripeCredentialInput,
} from './types';

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

type MariaDbPool = any;
type MariaDbConnection = any;

function createId(prefix?: string) {
  return prefix ? `${prefix}-${randomUUID()}` : randomUUID();
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return value as T;
  }

  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

function toBoolean(value: unknown) {
  return value === true || value === 1 || value === '1';
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function toSqlDateTime(value: string | Date | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return [
    date.getUTCFullYear(),
    padDatePart(date.getUTCMonth() + 1),
    padDatePart(date.getUTCDate()),
  ].join('-')
    + ` ${padDatePart(date.getUTCHours())}:${padDatePart(date.getUTCMinutes())}:${padDatePart(date.getUTCSeconds())}`;
}

function toIsoDateTime(value: unknown, fallback = new Date().toISOString()) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const raw = String(value).trim();

  if (!raw) {
    return fallback;
  }

  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? `${raw.replace(' ', 'T')}Z`
    : raw;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
}

function toSqlDate(value: string | Date | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalizedValue = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return normalizedValue;
  }

  const parsed = new Date(normalizedValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeAdminRole(value: unknown): AdminRole {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'administrator' || normalized === 'financial' || normalized === 'support') {
    return normalized;
  }

  if (normalized === 'admin') {
    return 'administrator';
  }

  if (normalized === 'financeiro') {
    return 'financial';
  }

  if (normalized === 'suporte') {
    return 'support';
  }

  return 'support';
}

function normalizeDashboardOrderStatus(value: unknown) {
  const normalized = String(value || '').trim().toLowerCase();

  switch (normalized) {
    case 'pending_payment':
    case 'awaiting_payment':
    case 'aguardando pagamento':
      return 'Aguardando Pagamento';
    case 'paid':
    case 'pago':
      return 'Pago';
    case 'processing':
    case 'em separacao':
    case 'em separaÃ§Ã£o':
      return 'Em Separacao';
    case 'shipped':
    case 'enviado':
      return 'Enviado';
    case 'delivered':
    case 'entregue':
      return 'Entregue';
    case 'cancelled':
    case 'canceled':
    case 'cancelado':
      return 'Cancelado';
    default:
      return String(value || 'Aguardando Pagamento');
  }
}

function parseDashboardCustomerName(value: unknown) {
  const payload = parseJsonValue<Record<string, unknown>>(value, {});
  return String(
    payload.fullName
    || payload.full_name
    || payload.name
    || payload.customerName
    || payload.customer_name
    || 'Cliente',
  );
}

function mapAdminCustomerAddress(row: any): AdminCustomerAddress {
  return {
    country: row.country || 'US',
    cep: row.postal_code || row.postalCode || row.cep || '',
    street: row.street || '',
    number: row.number || '',
    complement: row.complement || '',
    district: row.neighborhood || row.district || '',
    city: row.city || '',
    state: row.region || row.state || '',
  };
}

function buildEmptyCustomerCartPayload(): CustomerCartPayload {
  return {
    appliedBenefitId: null,
    appliedCouponId: null,
    currency: 'USD',
    discount: 0,
    items: [],
    shipping: 0,
    shippingMethod: '',
    subtotal: 0,
    tax: 0,
    total: 0,
    updatedAt: new Date().toISOString(),
  };
}

function resolveCartProduct(row: any): Product {
  const metadata = parseJsonValue<Record<string, unknown>>(row.metadata, {});
  const product = metadata.product as Product | undefined;

  if (product?.id) {
    return product;
  }

  return {
    id: String(row.product_id || ''),
    nome: row.product_name_snapshot || '',
    preco: toNumber(row.unit_price_snapshot),
    precoPromocional: undefined,
    categoria: 'AcessÃ³rios' as Product['categoria'],
    subcategoria: '',
    imagens: [],
    descricao: '',
    composicao: '',
    tamanhos: [],
    cores: [],
    avaliacoes: [],
    estoque: toNumber(row.quantity, 1),
    shippingWeightGrams: 500,
  };
}

function buildCustomerCartPayload(cartRow: any | null, cartItemRows: any[]): CustomerCartPayload {
  if (!cartRow) {
    return buildEmptyCustomerCartPayload();
  }

  return {
    appliedBenefitId: cartRow.applied_benefit_id || null,
    appliedCouponId: cartRow.applied_coupon_id || null,
    currency: cartRow.currency || 'USD',
    discount: toNumber(cartRow.discount),
    items: cartItemRows.map((row) => ({
      id: String(row.id),
      productId: String(row.product_id),
      product: resolveCartProduct(row),
      quantity: toNumber(row.quantity, 1),
      size: row.size_label || '',
      color: row.color_label || '',
    })),
    shipping: toNumber(cartRow.shipping),
    shippingMethod: cartRow.shipping_method || '',
    subtotal: toNumber(cartRow.subtotal),
    tax: toNumber(cartRow.tax),
    total: toNumber(cartRow.total),
    updatedAt: toIsoDateTime(cartRow.updated_at || cartRow.created_at),
  };
}

function normalizeCartInputItems(input: CustomerCartSaveInput) {
  const items = (input.items || [])
    .filter((item) => item.product?.id && Number(item.quantity) > 0)
    .map((item) => ({
      id: createId('cart-item'),
      productId: item.product.id,
      productNameSnapshot: item.product.nome || '',
      skuSnapshot: String((item.product as Product & { sku?: string }).sku || ''),
      unitPriceSnapshot: item.product.precoPromocional || item.product.preco || 0,
      quantity: Math.max(1, Math.trunc(Number(item.quantity) || 1)),
      sizeLabel: item.size || '',
      colorLabel: item.color || '',
      metadata: { product: item.product },
    }));

  const subtotal = items.reduce((sum, item) => sum + item.unitPriceSnapshot * item.quantity, 0);
  const discount = Math.max(0, Number(input.discount || 0));
  const shipping = Math.max(0, Number(input.shipping || 0));
  const tax = Math.max(0, Number(input.tax || 0));
  const total = Math.max(0, subtotal - discount + shipping + tax);

  return {
    currency: (input.currency || 'USD').toUpperCase(),
    discount,
    items,
    shipping,
    shippingMethod: String(input.shippingMethod || ''),
    subtotal,
    tax,
    total,
  };
}

function normalizeAdminCustomerOrderStatus(value: unknown) {
  const normalized = String(value || '').trim().toLowerCase();

  switch (normalized) {
    case 'pending_payment':
    case 'awaiting_payment':
    case 'aguardando pagamento':
      return 'Aguardando Pagamento';
    case 'paid':
    case 'pago':
      return 'Pago';
    case 'processing':
    case 'em separacao':
    case 'em separaÃ§Ã£o':
      return 'Em Separação';
    case 'shipped':
    case 'enviado':
      return 'Enviado';
    case 'delivered':
    case 'entregue':
      return 'Entregue';
    case 'cancelled':
    case 'canceled':
    case 'cancelado':
      return 'Cancelado';
    default:
      return 'Aguardando Pagamento';
  }
}

function toPublicAdminUser(row: any): AdminUserProfile {
  return {
    id: String(row.id),
    email: row.email || '',
    fullName: row.full_name || '',
    role: normalizeAdminRole(row.role),
    status: row.status === 'inactive' ? 'inactive' : 'active',
    mfaEnabled: toBoolean(row.mfa_enabled),
    lastLoginAt: row.last_login_at ? toIsoDateTime(row.last_login_at, new Date(0).toISOString()) : null,
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  };
}

function buildAdminSessionPayloadFromRow(row: any): AdminSessionPayload {
  const user = toPublicAdminUser(row);
  return {
    authenticated: true,
    permissions: getAdminRolePermissions(user.role),
    user,
  };
}

function getTaxDocumentType(registrationType: StoreCustomerProfile['registrationType']) {
  return registrationType === 'J' ? 'business_tax_id' : 'tax_id';
}

async function loadMariaDbModule() {
  const moduleName = 'mysql2/promise';

  try {
    return await import(moduleName);
  } catch (error) {
    throw new Error(
      'O driver mysql2 nao esta instalado. Rode "npm install mysql2" antes de usar STORE_DATA_DRIVER=mariadb.',
      { cause: error },
    );
  }
}

export class MariaDbStoreRepository implements StoreRepository {
  static async createFromEnv() {
    const mysql = await loadMariaDbModule();
    const pool = mysql.createPool({
      host: process.env.MARIADB_HOST || '127.0.0.1',
      port: Number(process.env.MARIADB_PORT || 3306),
      user: process.env.MARIADB_USER || 'root',
      password: process.env.MARIADB_PASSWORD || '',
      database: process.env.MARIADB_DATABASE || 'loja',
      connectionLimit: Number(process.env.MARIADB_CONNECTION_LIMIT || 10),
      charset: 'utf8mb4',
      namedPlaceholders: false,
      multipleStatements: true,
    });

    const repository = new MariaDbStoreRepository(pool);
    await repository.bootstrap();
    return repository;
  }

  constructor(private readonly pool: MariaDbPool) {}

  private async bootstrap() {
    await this.ensureSchema();
  }

  private async ensureSchema() {
    const schemaPath = path.resolve(process.cwd(), 'server', 'store', 'mariadb-schema.sql');
    const sql = await readFile(schemaPath, 'utf8');
    await this.pool.query(sql);
  }

  private async queryRows<T = any>(sql: string, params: unknown[] = []) {
    const [rows] = await this.pool.query(sql, params);
    return rows as T[];
  }

  private async queryRowsWithExecutor<T = any>(
    executor: MariaDbPool | MariaDbConnection,
    sql: string,
    params: unknown[] = [],
  ) {
    const [rows] = await executor.query(sql, params);
    return rows as T[];
  }

  private mapProduct(row: any): Product {
    return {
      id: String(row.id),
      nome: row.nome,
      preco: toNumber(row.preco),
      precoPromocional: row.preco_promocional === null ? undefined : toNumber(row.preco_promocional),
      categoria: row.categoria,
      subcategoria: row.subcategoria || '',
      imagens: parseJsonValue<string[]>(row.imagens, []),
      descricao: row.descricao || '',
      composicao: row.composicao || '',
      tamanhos: parseJsonValue<string[]>(row.tamanhos, []),
      cores: parseJsonValue<{ hex: string; nome: string }[]>(row.cores, []),
      avaliacoes: parseJsonValue<any[]>(row.avaliacoes, []),
      maisVendido: toBoolean(row.mais_vendido),
      lancamento: toBoolean(row.lancamento),
      estoque: toNumber(row.estoque),
      shippingWeightGrams: toNumber(row.shipping_weight_grams, 500),
    };
  }

  private mapCategory(row: any): StoreCategory {
    return {
      id: String(row.id),
      nome: row.nome,
      imagem: row.imagem || '',
      slug: row.slug || String(row.nome).toLowerCase().replace(/\s+/g, '-'),
      subcategories: parseJsonValue<string[]>(row.subcategories, []),
      status: row.status || 'Ativo',
      showInMenu: toBoolean(row.show_in_menu),
      menuOrder: toNumber(row.menu_order, 100),
      showOnHome: toBoolean(row.show_on_home),
      homeSectionTitle: row.home_section_title || row.nome || '',
      homeSectionOrder: toNumber(row.home_section_order, toNumber(row.menu_order, 100)),
      homeSectionLimit: toNumber(row.home_section_limit, 4),
      homeSectionFilter: row.home_section_filter || 'all',
      productCount: toNumber(row.product_count, 0),
    };
  }

  private mapBanner(row: any): Banner {
    return {
      id: String(row.id),
      title: row.title || '',
      desktop: row.desktop_image || row.image || '',
      mobile: row.mobile_image || row.desktop_image || row.image || '',
      image: row.desktop_image || row.image || '',
      link: row.link || '/catalog',
      status: row.status || 'Ativo',
      position: toNumber(row.position, 1),
    };
  }

  private mapHomeSection(row: any): HomeSection {
    return {
      id: String(row.id),
      title: row.title || '',
      sourceType: row.source_type || 'category',
      categoryName: row.category_name || '',
      limitCount: toNumber(row.limit_count, 4),
      link: row.link || '/catalog',
      position: toNumber(row.position, 100),
      status: row.status || 'Ativo',
    };
  }

  private mapHomeCard(row: any): HomeCard {
    return {
      id: String(row.id),
      title: row.title || '',
      image: row.image || '',
      link: row.link || '/catalog',
      ctaLabel: row.cta_label || 'Confira',
      position: toNumber(row.position, 100),
      status: row.status || 'Ativo',
    };
  }

  private mapRaffle(row: any): Raffle {
    return {
      id: String(row.id),
      title: row.title || '',
      prize: row.prize || '',
      description: row.description || '',
      image: row.image || '',
      productId: row.product_id || '',
      pointsPerTicket: toNumber(row.points_per_ticket),
      drawDate: row.draw_date || '',
      ctaLabel: row.cta_label || 'Participar agora',
      ctaLink: row.cta_link || '/sorteios',
      totalParticipants: toNumber(row.total_participants),
      totalTickets: toNumber(row.total_tickets),
      status: row.status || 'Ativo',
      position: toNumber(row.position, 100),
    };
  }

  private mapInstagramPost(row: any): InstagramPost {
    return {
      id: String(row.id),
      image: row.image || '',
      link: row.link || '',
      position: toNumber(row.position, 0),
    };
  }

  private mapContactMessage(row: any): ContactMessage {
    return {
      id: String(row.id),
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      orderNumber: row.order_number || '',
      message: row.message || '',
      status: row.status || 'Novo',
      source: row.source || 'site-contact',
      adminNotes: row.admin_notes || '',
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at || row.created_at),
      repliedAt: row.replied_at ? toIsoDateTime(row.replied_at) : undefined,
    };
  }

  private mapNewsletterSubscriber(row: any): NewsletterSubscriber {
    return {
      id: String(row.id),
      email: row.email || '',
      status: row.status || 'Ativo',
      source: row.source || NEWSLETTER_DEFAULT_SOURCE,
      couponCode: row.coupon_code || WELCOME_NEWSLETTER_COUPON_CODE,
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at || row.created_at),
    };
  }

  private async mapAdminPromotion(row: any): Promise<AdminPromotionRecord> {
    const payload = parseJsonValue<{ categoryNames?: string[]; productIds?: string[]; audienceSize?: number }>(
      row.applies_to_payload,
      {},
    );
    const usages = await this.queryRows(
      `
        SELECT
          o.id,
          o.order_number,
          o.total,
          o.discount,
          o.created_at,
          o.customer_snapshot,
          c.name AS customer_name,
          c.email AS customer_email
        FROM orders o
        LEFT JOIN customers c ON c.id = o.customer_id
        WHERE o.coupon_id = ?
        ORDER BY o.created_at DESC
      `,
      [row.id],
    );
    const logs = await this.queryRows(
      `
        SELECT * FROM audit_logs
        WHERE entity_type = 'promotion' AND entity_id = ?
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [row.id],
    );

    return {
      id: String(row.id),
      name: String(row.title || ''),
      description: String(row.description || ''),
      promoCode: String(row.code || ''),
      discountType: row.coupon_type === 'fixed_amount' ? 'valor_fixo' : 'percentual',
      discountValue: toNumber(row.coupon_value),
      minOrderValue: toNumber(row.min_order_value),
      totalUseLimit: Number(row.usage_limit_total || 0),
      useLimitPerCustomer: Number(row.usage_limit_per_customer || 0),
      startsAt: row.starts_at ? toIsoDateTime(row.starts_at).slice(0, 16) : '',
      expiresAt: row.expires_at ? toIsoDateTime(row.expires_at).slice(0, 16) : '',
      applicationType: row.applies_to_scope === 'categories' ? 'categorias' : row.applies_to_scope === 'products' ? 'produtos' : 'todos',
      categoryNames: Array.isArray(payload.categoryNames) ? payload.categoryNames : [],
      productIds: Array.isArray(payload.productIds) ? payload.productIds : [],
      status: row.status === 'paused'
        ? 'Pausado'
        : row.status === 'finished'
          ? 'Finalizado'
          : row.status === 'archived'
            ? 'Arquivada'
            : 'Ativo',
      audienceSize: Number(payload.audienceSize || 0),
      usages: usages.map((usage) => {
        const snapshot = parseJsonValue<Record<string, unknown>>(usage.customer_snapshot, {});
        return {
          id: String(usage.id),
          customerName: String(usage.customer_name || snapshot.name || snapshot.fullName || 'Cliente'),
          customerEmail: String(usage.customer_email || snapshot.email || ''),
          dateTime: toIsoDateTime(usage.created_at),
          orderNumber: String(usage.order_number || ''),
          orderValue: toNumber(usage.total),
          discountApplied: toNumber(usage.discount),
        };
      }),
      logs: logs.map((log) => ({
        id: String(log.id),
        user: String(log.actor_email || log.actor_id || 'Sistema'),
        dateTime: toIsoDateTime(log.created_at),
        ip: String(log.ip_address || ''),
        action: String(log.action || ''),
      })),
    };
  }

  private toCouponPayload(input: AdminPromotionInput) {
    return {
      code: input.promoCode.trim().toUpperCase(),
      title: input.name.trim(),
      description: input.description.trim(),
      couponType: input.discountType === 'valor_fixo' ? 'fixed_amount' : 'percentage',
      couponValue: Number(input.discountValue || 0),
      minOrderValue: Number(input.minOrderValue || 0),
      usageLimitTotal: Number(input.totalUseLimit || 0),
      usageLimitPerCustomer: Number(input.useLimitPerCustomer || 0),
      startsAt: toSqlDateTime(input.startsAt),
      expiresAt: toSqlDateTime(input.expiresAt),
      status: input.status === 'Pausado' ? 'paused' : input.status === 'Finalizado' ? 'finished' : 'active',
      appliesToScope: input.applicationType === 'categorias' ? 'categories' : input.applicationType === 'produtos' ? 'products' : 'all',
      appliesToPayload: JSON.stringify({
        audienceSize: Number(input.audienceSize || 0),
        categoryNames: input.categoryNames || [],
        productIds: input.productIds || [],
      }),
    };
  }

  private mapCustomerAddress(row: any): StoreCustomerAddress {
    return {
      id: String(row.id),
      label: row.label || '',
      country: row.country || 'US',
      postalCode: row.postal_code || '',
      street: row.street || '',
      number: row.number || '',
      complement: row.complement || '',
      neighborhood: row.neighborhood || '',
      city: row.city || '',
      region: row.region || '',
      isPrimary: toBoolean(row.is_primary),
    };
  }

  private mapCustomerBenefit(row: any): StoreCustomerWelcomeBenefit {
    return {
      id: String(row.id),
      type: 'newsletter-welcome',
      email: row.linked_email || '',
      source: row.source || NEWSLETTER_DEFAULT_SOURCE,
      couponCode: row.coupon_code || WELCOME_NEWSLETTER_COUPON_CODE,
      discountType: 'percentage',
      discountValue: toNumber(row.discount_value, 10),
      status: row.status === 'used' || row.status === 'expired' ? row.status : 'available',
      linkedNewsletterSubscriberId: row.linked_newsletter_subscriber_id || undefined,
      createdAt: toIsoDateTime(row.created_at),
      linkedAt: toIsoDateTime(row.available_at || row.created_at),
      usedAt: row.used_at ? toIsoDateTime(row.used_at) : undefined,
      usedOrderNumber: row.used_order_id || undefined,
    };
  }

  private async loadCustomerAddresses(customerId: string, executor: MariaDbPool | MariaDbConnection = this.pool) {
    const rows = await this.queryRowsWithExecutor(
      executor,
      'SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_primary DESC, created_at ASC',
      [customerId],
    );

    return rows.map((row) => this.mapCustomerAddress(row));
  }

  private async loadCustomerBenefits(customerId: string, executor: MariaDbPool | MariaDbConnection = this.pool) {
    const rows = await this.queryRowsWithExecutor(
      executor,
      "SELECT * FROM customer_benefits WHERE customer_id = ? AND benefit_type = 'newsletter-welcome' ORDER BY created_at DESC",
      [customerId],
    );

    return rows.map((row) => this.mapCustomerBenefit(row));
  }

  private async loadCustomerProfile(customerId: string, executor: MariaDbPool | MariaDbConnection = this.pool): Promise<StoreCustomerProfile | null> {
    const [row] = await this.queryRowsWithExecutor(executor, 'SELECT * FROM customers WHERE id = ? LIMIT 1', [customerId]);

    if (!row) {
      return null;
    }

    const [addresses, welcomeBenefits] = await Promise.all([
      this.loadCustomerAddresses(customerId, executor),
      this.loadCustomerBenefits(customerId, executor),
    ]);

    return {
      id: String(row.id),
      email: row.email || '',
      fullName: row.full_name || '',
      phone: row.phone_national || row.phone_e164 || '',
      phoneCountry: row.phone_country || 'US',
      birthDate: row.birth_date ? String(row.birth_date).slice(0, 10) : '',
      gender: row.gender || '',
      registrationType: row.registration_type === 'J' ? 'J' : 'F',
      taxId: row.tax_document || '',
      taxDocumentType: row.tax_document_type || 'tax_id',
      corporateName: row.corporate_name || '',
      stateRegistration: row.state_registration || '',
      allowMarketing: toBoolean(row.allow_marketing),
      blockPurchases: toBoolean(row.block_purchases),
      newsletterSubscribed: toBoolean(row.newsletter_subscribed),
      status: row.status === 'inactive' ? 'inactive' : 'active',
      createdAt: toIsoDateTime(row.created_at),
      updatedAt: toIsoDateTime(row.updated_at || row.created_at),
      addresses,
      welcomeBenefits,
    };
  }

  private buildCustomerSessionPayload(profile: StoreCustomerProfile | null): CustomerSessionPayload {
    if (!profile) {
      return {
        authenticated: false,
        availableWelcomeBenefit: null,
        customer: null,
        primaryAddress: null,
      };
    }

    return {
      authenticated: true,
      availableWelcomeBenefit: getAvailableWelcomeBenefit(profile.welcomeBenefits),
      customer: profile,
      primaryAddress: profile.addresses.find((address) => address.isPrimary) || profile.addresses[0] || null,
    };
  }

  private async loadAdminCustomerOrders(
    customerId: string,
    customerEmail = '',
    executor: MariaDbPool | MariaDbConnection = this.pool,
  ): Promise<AdminCustomerOrder[]> {
    const normalizedEmail = normalizeNewsletterEmail(customerEmail);
    const orders = await this.queryRowsWithExecutor(
      executor,
      `
        SELECT *
        FROM orders
        WHERE customer_id = ?
          OR (
            ? <> ''
            AND (
              LOWER(JSON_UNQUOTE(JSON_EXTRACT(customer_snapshot, '$.email'))) = ?
              OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(customer_snapshot, '$.customer.email'))) = ?
            )
          )
        ORDER BY created_at DESC
      `,
      [customerId, normalizedEmail, normalizedEmail, normalizedEmail],
    );

    if (!orders.length) {
      return [];
    }

    const orderIds = orders.map((row) => String(row.id));
    const placeholders = orderIds.map(() => '?').join(', ');
    const items = await this.queryRowsWithExecutor(
      executor,
      `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY created_at ASC`,
      orderIds,
    );

    const itemsByOrderId = new Map<string, AdminCustomerOrderItem[]>();
    for (const item of items) {
      const orderId = String(item.order_id);
      const current = itemsByOrderId.get(orderId) || [];
      current.push({
        id: String(item.id),
        name: item.product_name_snapshot || '',
        sku: item.sku_snapshot || '',
        quantity: toNumber(item.quantity, 1),
        unitPrice: toNumber(item.unit_price),
        subtotal: toNumber(item.subtotal),
      });
      itemsByOrderId.set(orderId, current);
    }

    return orders.map((row) => {
      const shippingAddress = mapAdminCustomerAddress(parseJsonValue<Record<string, unknown>>(row.shipping_address_snapshot, {}));
      const billingAddress = mapAdminCustomerAddress(parseJsonValue<Record<string, unknown>>(row.billing_address_snapshot || row.shipping_address_snapshot, {}));
      const orderItems = itemsByOrderId.get(String(row.id)) || [];

      return {
        id: String(row.id),
        orderNumber: row.order_number || '',
        date: toIsoDateTime(row.created_at),
        status: normalizeAdminCustomerOrderStatus(row.status),
        itemsCount: orderItems.reduce((sum, item) => sum + item.quantity, 0) || toNumber(row.item_count, orderItems.length),
        total: toNumber(row.total),
        paymentMethod: row.payment_method || '',
        shippingAddress,
        billingAddress,
        items: orderItems,
        subtotal: toNumber(row.subtotal),
        shipping: toNumber(row.shipping),
        discount: toNumber(row.discount),
      };
    });
  }

  private async loadAdminCustomerActivities(customerId: string, registeredAt: string, orders: AdminCustomerOrder[]): Promise<AdminCustomerActivity[]> {
    const activities: AdminCustomerActivity[] = [
      {
        id: `${customerId}-registered`,
        type: 'Cliente cadastrado',
        description: 'Cadastro criado na base.',
        dateTime: registeredAt,
      },
    ];

    for (const order of orders) {
      activities.push({
        id: `${order.id}-created`,
        type: 'Pedido criado',
        description: `Pedido ${order.orderNumber} registrado para o cliente.`,
        dateTime: order.date,
      });

      const statusMap: Record<string, { type: string; description: string }> = {
        'Pago': { type: 'Pagamento aprovado', description: `Pagamento do pedido ${order.orderNumber} aprovado.` },
        'Enviado': { type: 'Pedido enviado', description: `Pedido ${order.orderNumber} enviado.` },
        'Entregue': { type: 'Pedido entregue', description: `Pedido ${order.orderNumber} entregue.` },
        'Cancelado': { type: 'Pedido cancelado', description: `Pedido ${order.orderNumber} cancelado.` },
      };

      const event = statusMap[order.status];
      if (event) {
        activities.push({
          id: `${order.id}-${order.status}`,
          type: event.type,
          description: event.description,
          dateTime: order.date,
        });
      }
    }

    return activities.sort((left, right) => right.dateTime.localeCompare(left.dateTime));
  }

  private async loadAdminCustomerAuditLogs(customerId: string, executor: MariaDbPool | MariaDbConnection = this.pool): Promise<AdminCustomerAuditLog[]> {
    const rows = await this.queryRowsWithExecutor(
      executor,
      `SELECT * FROM audit_logs WHERE entity_type = 'customer' AND entity_id = ? ORDER BY created_at DESC LIMIT 100`,
      [customerId],
    );

    return rows.map((row) => {
      const diff = parseJsonValue<Record<string, unknown>>(row.diff_json, {});
      const previousValue = diff.previous !== undefined ? String(diff.previous) : diff.before !== undefined ? String(diff.before) : '';
      const nextValue = diff.next !== undefined ? String(diff.next) : diff.after !== undefined ? String(diff.after) : '';
      const field = diff.field ? String(diff.field) : row.action || 'AlteraÃ§Ã£o';

      return {
        id: String(row.id),
        customerId,
        user: row.actor_email || row.actor_id || 'Sistema',
        field,
        previousValue,
        nextValue,
        dateTime: toIsoDateTime(row.created_at),
        ip: row.ip_address || '',
      };
    });
  }

  private async loadAdminCustomerRecord(customerId: string, executor: MariaDbPool | MariaDbConnection = this.pool): Promise<AdminCustomerRecord | null> {
    const [row] = await this.queryRowsWithExecutor(executor, 'SELECT * FROM customers WHERE id = ? LIMIT 1', [customerId]);

    if (!row) {
      return null;
    }

    const [addresses, welcomeBenefits, orders] = await Promise.all([
      this.loadCustomerAddresses(customerId, executor),
      this.loadCustomerBenefits(customerId, executor),
      this.loadAdminCustomerOrders(customerId, row.email || '', executor),
    ]);

    const shippingAddress = addresses[0] || null;
    const billingAddress = addresses[1] || shippingAddress || null;
    const customerCreatedAt = toIsoDateTime(row.created_at);
    const activities = await this.loadAdminCustomerActivities(customerId, customerCreatedAt, orders);
    const auditLogs = await this.loadAdminCustomerAuditLogs(customerId, executor);

    const toAdminAddress = (address: StoreCustomerAddress | null): AdminCustomerAddress => ({
      country: address?.country || 'US',
      cep: address?.postalCode || '',
      street: address?.street || '',
      number: address?.number || '',
      complement: address?.complement || '',
      district: address?.neighborhood || '',
      city: address?.city || '',
      state: address?.region || '',
    });

    return {
      id: String(row.id),
      name: row.full_name || '',
      cpf: row.tax_document || '',
      documentLabel: row.tax_document_type === 'business_tax_id' ? 'CNPJ' : 'CPF',
      birthDate: row.birth_date ? String(row.birth_date).slice(0, 10) : '',
      email: row.email || '',
      phone: row.phone_national || row.phone_e164 || '',
      phoneCountry: row.phone_country || 'US',
      phoneE164: row.phone_e164 || '',
      registeredAt: customerCreatedAt,
      status: row.status === 'inactive' ? 'Inativo' : 'Ativo',
      blockPurchases: toBoolean(row.block_purchases),
      allowMarketing: toBoolean(row.allow_marketing),
      shippingAddress: toAdminAddress(shippingAddress),
      billingAddress: toAdminAddress(billingAddress),
      orders,
      activities,
      auditLogs,
      // keep compatible access to newsletter-derived benefits on session payloads elsewhere
      // not exposed in the admin customers view
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as AdminCustomerRecord;
  }

  private async ensureNewsletterBenefitForCustomer(customerId: string, executor: MariaDbPool | MariaDbConnection = this.pool) {
    const [customerRow] = await this.queryRowsWithExecutor(
      executor,
      'SELECT id, email FROM customers WHERE id = ? LIMIT 1',
      [customerId],
    );

    if (!customerRow) {
      return null;
    }

    const normalizedEmail = normalizeNewsletterEmail(customerRow.email || '');
    const [existingBenefitRow] = await this.queryRowsWithExecutor(
      executor,
      "SELECT * FROM customer_benefits WHERE customer_id = ? AND benefit_type = 'newsletter-welcome' LIMIT 1",
      [customerId],
    );

    if (existingBenefitRow) {
      await executor.query(
        'UPDATE customers SET newsletter_subscribed = 1, updated_at = NOW() WHERE id = ?',
        [customerId],
      );
      return this.mapCustomerBenefit(existingBenefitRow);
    }

    const [subscriberRow] = await this.queryRowsWithExecutor(
      executor,
      "SELECT * FROM newsletter_subscribers WHERE email = ? AND status = 'Ativo' LIMIT 1",
      [normalizedEmail],
    );

    if (!subscriberRow) {
      return null;
    }

    const subscriber = this.mapNewsletterSubscriber(subscriberRow);
    const benefit = createWelcomeBenefitFromSubscriber(normalizedEmail, subscriber);

    await executor.query(
      `
        INSERT INTO customer_benefits (
          id, customer_id, benefit_type, source, status, coupon_code, discount_type,
          discount_value, linked_email, linked_newsletter_subscriber_id, metadata,
          available_at, used_at, used_order_id, created_at, updated_at
        ) VALUES (?, ?, 'newsletter-welcome', ?, 'available', ?, 'percentage', ?, ?, ?, NULL, ?, NULL, NULL, ?, ?)
      `,
      [
        benefit.id,
        customerId,
        benefit.source,
        benefit.couponCode,
        benefit.discountValue,
        benefit.email,
        benefit.linkedNewsletterSubscriberId || null,
        toSqlDateTime(benefit.linkedAt),
        toSqlDateTime(benefit.createdAt),
        toSqlDateTime(benefit.createdAt),
      ],
    );

    await executor.query(
      'UPDATE customers SET newsletter_subscribed = 1, updated_at = NOW() WHERE id = ?',
      [customerId],
    );

    return benefit;
  }

  private mapSettings(row: any): StoreSettings {
    return normalizeStoreSettings({
      storeName: row.store_name,
      siteTitle: row.site_title || row.store_name,
      adminPanelName: row.admin_panel_name || defaultSettings.adminPanelName,
      siteLanguage: row.site_language === 'en-US' ? 'en-US' : defaultSettings.siteLanguage,
      allowBusinessRegistration: toBoolean(row.allow_business_registration),
      storeCurrency: row.store_currency || 'USD',
      logoUrl: row.logo_url || '',
      email: row.email || '',
      phone: row.phone || '',
      phoneCountry: row.phone_country || 'US',
      instagram: row.instagram || '',
      facebook: row.facebook || '',
      tiktok: row.tiktok || '',
      description: row.description || '',
      primaryColor: row.primary_color || '#ba884b',
      secondaryColor: row.secondary_color || '#1a222b',
      pointsPerReal: toNumber(row.points_per_real, 1),
      supportSalesPhone: row.support_sales_phone || row.phone || '',
      supportSalesPhoneCountry: row.support_sales_phone_country || row.phone_country || 'US',
      supportSacPhone: row.support_sac_phone || '',
      supportSacPhoneCountry: row.support_sac_phone_country || row.phone_country || 'US',
      supportEmail: row.support_email || row.email || '',
      supportWeekHours: row.support_week_hours || '',
      supportSaturdayHours: row.support_saturday_hours || '',
      shippingOriginCountry: row.shipping_origin_country || 'US',
      shippingOriginPostalCode: row.shipping_origin_postal_code || '',
      shippingOriginCity: row.shipping_origin_city || '',
      shippingOriginRegion: row.shipping_origin_region || '',
      shippingOriginStreet: row.shipping_origin_street || '',
      shippingOriginNumber: row.shipping_origin_number || '',
      shippingFreeThreshold: toNumber(row.shipping_free_threshold, 0),
      shippingDefaultProductWeightGrams: toNumber(row.shipping_default_product_weight_grams, 500),
      shippingPackageLengthCm: toNumber(row.shipping_package_length_cm, 30),
      shippingPackageWidthCm: toNumber(row.shipping_package_width_cm, 24),
      shippingPackageHeightCm: toNumber(row.shipping_package_height_cm, 6),
      stripeEnabled: toBoolean(row.stripe_enabled),
      stripeMode: row.stripe_mode === 'live' ? 'live' : 'test',
      stripeCurrency: row.stripe_currency || 'USD',
      stripeAllowCard: row.stripe_allow_card === null || row.stripe_allow_card === undefined ? true : toBoolean(row.stripe_allow_card),
      stripeAllowApplePay: toBoolean(row.stripe_allow_apple_pay),
      stripeAllowGooglePay: toBoolean(row.stripe_allow_google_pay),
      stripeSuccessUrl: row.stripe_success_url || '/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      stripeCancelUrl: row.stripe_cancel_url || '/cart',
    });
  }

  private mapStoredStripeCredentialSet(row: any): StoredStripeCredentialSet {
    return {
      publishableKeyEncrypted: row?.publishable_key_encrypted || '',
      secretKeyEncrypted: row?.secret_key_encrypted || '',
      webhookSecretEncrypted: row?.webhook_secret_encrypted || '',
      updatedAt: row?.updated_at
        ? toIsoDateTime(row.updated_at)
        : null,
    };
  }

  private async getStoredStripeCredentialSet(mode: StripeMode) {
    const [row] = await this.queryRows(
      `
        SELECT publishable_key_encrypted, secret_key_encrypted, webhook_secret_encrypted, updated_at
        FROM payment_gateway_credentials
        WHERE provider = 'stripe' AND mode = ?
        LIMIT 1
      `,
      [mode],
    );

    return row
      ? this.mapStoredStripeCredentialSet(row)
      : createEmptyStoredStripeCredentialSet();
  }

  async getProducts(options: ListOptions = {}) {
    const onlyActive = options.onlyActive !== false;
    const rows = await this.queryRows(
      `SELECT * FROM products ${onlyActive ? "WHERE status = 'Ativo'" : ''} ORDER BY updated_at DESC, created_at DESC`,
    );
    return rows.map((row) => this.mapProduct(row));
  }

  async createProduct(input: ProductInput) {
    const id = input.id || createId('product');

    await this.pool.query(
      `
        INSERT INTO products (
          id, nome, preco, preco_promocional, categoria, subcategoria, imagens, descricao,
          composicao, tamanhos, cores, avaliacoes, mais_vendido, lancamento, estoque,
          shipping_weight_grams, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Ativo', NOW(), NOW())
      `,
      [
        id,
        input.nome,
        input.preco,
        input.precoPromocional ?? null,
        input.categoria,
        input.subcategoria || '',
        JSON.stringify(input.imagens),
        input.descricao || '',
        input.composicao || '',
        JSON.stringify(input.tamanhos || []),
        JSON.stringify(input.cores || []),
        JSON.stringify([]),
        input.maisVendido ? 1 : 0,
        input.lancamento ? 1 : 0,
        input.estoque,
        input.shippingWeightGrams ?? 500,
      ],
    );

    const [created] = await this.queryRows('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    return this.mapProduct(created);
  }

  async updateProduct(id: string, input: ProductInput) {
    await this.pool.query(
      `
        UPDATE products
        SET nome = ?, preco = ?, preco_promocional = ?, categoria = ?, subcategoria = ?,
            imagens = ?, descricao = ?, composicao = ?, tamanhos = ?, cores = ?,
            mais_vendido = ?, lancamento = ?, estoque = ?, shipping_weight_grams = ?, updated_at = NOW()
        WHERE id = ?
      `,
      [
        input.nome,
        input.preco,
        input.precoPromocional ?? null,
        input.categoria,
        input.subcategoria || '',
        JSON.stringify(input.imagens),
        input.descricao || '',
        input.composicao || '',
        JSON.stringify(input.tamanhos || []),
        JSON.stringify(input.cores || []),
        input.maisVendido ? 1 : 0,
        input.lancamento ? 1 : 0,
        input.estoque,
        input.shippingWeightGrams ?? 500,
        id,
      ],
    );

    const [updated] = await this.queryRows('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    if (!updated) throw new Error('Produto nao encontrado.');
    return this.mapProduct(updated);
  }

  async deleteProduct(id: string) {
    await this.pool.query('DELETE FROM products WHERE id = ?', [id]);
  }

  async getCategories() {
    const rows = await this.queryRows(
      `
        SELECT c.*, COUNT(p.id) AS product_count
        FROM categories c
        LEFT JOIN products p ON p.categoria = c.nome AND p.status = 'Ativo'
        GROUP BY c.id
        ORDER BY c.menu_order ASC, c.nome ASC
      `,
    );

    return rows.map((row) => this.mapCategory(row));
  }

  async createCategory(input: CategoryInput) {
    const id = createId('category');

    await this.pool.query(
      `
        INSERT INTO categories (
          id, nome, slug, imagem, subcategories, status, show_in_menu, menu_order,
          show_on_home, home_section_title, home_section_order, home_section_limit,
          home_section_filter, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        id,
        input.nome,
        input.slug,
        input.imagem || '',
        JSON.stringify(input.subcategories || []),
        input.status,
        input.showInMenu ? 1 : 0,
        input.menuOrder,
        input.showOnHome ? 1 : 0,
        input.homeSectionTitle || input.nome,
        input.homeSectionOrder,
        input.homeSectionLimit,
        input.homeSectionFilter,
      ],
    );

    const [created] = await this.queryRows(
      `
        SELECT c.*, COUNT(p.id) AS product_count
        FROM categories c
        LEFT JOIN products p ON p.categoria = c.nome AND p.status = 'Ativo'
        WHERE c.id = ?
        GROUP BY c.id
      `,
      [id],
    );
    return this.mapCategory(created);
  }

  async updateCategory(id: string, input: CategoryInput) {
    await this.pool.query(
      `
        UPDATE categories
        SET nome = ?, slug = ?, imagem = ?, subcategories = ?, status = ?, show_in_menu = ?,
            menu_order = ?, show_on_home = ?, home_section_title = ?, home_section_order = ?,
            home_section_limit = ?, home_section_filter = ?, updated_at = NOW()
        WHERE id = ?
      `,
      [
        input.nome,
        input.slug,
        input.imagem || '',
        JSON.stringify(input.subcategories || []),
        input.status,
        input.showInMenu ? 1 : 0,
        input.menuOrder,
        input.showOnHome ? 1 : 0,
        input.homeSectionTitle || input.nome,
        input.homeSectionOrder,
        input.homeSectionLimit,
        input.homeSectionFilter,
        id,
      ],
    );

    const [updated] = await this.queryRows(
      `
        SELECT c.*, COUNT(p.id) AS product_count
        FROM categories c
        LEFT JOIN products p ON p.categoria = c.nome AND p.status = 'Ativo'
        WHERE c.id = ?
        GROUP BY c.id
      `,
      [id],
    );
    if (!updated) throw new Error('Categoria nao encontrada.');
    return this.mapCategory(updated);
  }

  async deleteCategory(id: string) {
    await this.pool.query('DELETE FROM categories WHERE id = ?', [id]);
  }

  async getBanners(options: ListOptions = {}) {
    const onlyActive = options.onlyActive !== false;
    const rows = await this.queryRows(
      `SELECT * FROM banners ${onlyActive ? "WHERE status = 'Ativo'" : ''} ORDER BY position ASC`,
    );
    return rows.map((row) => this.mapBanner(row));
  }

  async createBanner(input: Pick<Banner, 'title' | 'desktop' | 'mobile' | 'link'>) {
    const id = createId('banner');
    const [[{ nextPosition }]] = await this.pool.query('SELECT COALESCE(MAX(position), 0) + 1 AS nextPosition FROM banners');

    await this.pool.query(
      `
        INSERT INTO banners (id, title, desktop_image, mobile_image, link, status, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'Ativo', ?, NOW(), NOW())
      `,
      [id, input.title, input.desktop, input.mobile || input.desktop, input.link || '/catalog', toNumber(nextPosition, 1)],
    );

    const [created] = await this.queryRows('SELECT * FROM banners WHERE id = ? LIMIT 1', [id]);
    return this.mapBanner(created);
  }

  async deleteBanner(id: string) {
    await this.pool.query('DELETE FROM banners WHERE id = ?', [id]);
  }

  async updateBannerPositions(banners: Banner[]) {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const [index, banner] of banners.entries()) {
        await connection.query(
          'UPDATE banners SET position = ?, updated_at = NOW() WHERE id = ?',
          [index + 1, banner.id],
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getHomeSections(options: ListOptions = {}) {
    const onlyActive = options.onlyActive !== false;
    const rows = await this.queryRows(
      `SELECT * FROM home_sections ${onlyActive ? "WHERE status = 'Ativo'" : ''} ORDER BY position ASC`,
    );
    return rows.map((row) => this.mapHomeSection(row));
  }

  async updateHomeSection(id: string, input: HomeSectionInput) {
    await this.pool.query(
      `
        INSERT INTO home_sections (id, title, source_type, category_name, limit_count, link, position, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          source_type = VALUES(source_type),
          category_name = VALUES(category_name),
          limit_count = VALUES(limit_count),
          link = VALUES(link),
          position = VALUES(position),
          status = VALUES(status),
          updated_at = NOW()
      `,
      [id, input.title, input.sourceType, input.categoryName, input.limitCount, input.link, input.position, input.status],
    );

    const [updated] = await this.queryRows('SELECT * FROM home_sections WHERE id = ? LIMIT 1', [id]);
    return this.mapHomeSection(updated);
  }

  async getHomeCards(options: ListOptions = {}) {
    const onlyActive = options.onlyActive !== false;
    const rows = await this.queryRows(
      `SELECT * FROM home_cards ${onlyActive ? "WHERE status = 'Ativo'" : ''} ORDER BY position ASC`,
    );
    return rows.map((row) => this.mapHomeCard(row));
  }

  async createHomeCard(input: HomeCardInput) {
    const id = createId('home-card');

    await this.pool.query(
      `
        INSERT INTO home_cards (id, title, image, link, cta_label, position, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [id, input.title, input.image, input.link, input.ctaLabel || 'Confira', input.position, input.status],
    );

    const [created] = await this.queryRows('SELECT * FROM home_cards WHERE id = ? LIMIT 1', [id]);
    return this.mapHomeCard(created);
  }

  async updateHomeCard(id: string, input: HomeCardInput) {
    await this.pool.query(
      `
        UPDATE home_cards
        SET title = ?, image = ?, link = ?, cta_label = ?, position = ?, status = ?, updated_at = NOW()
        WHERE id = ?
      `,
      [input.title, input.image, input.link, input.ctaLabel || 'Confira', input.position, input.status, id],
    );

    const [updated] = await this.queryRows('SELECT * FROM home_cards WHERE id = ? LIMIT 1', [id]);
    if (!updated) throw new Error('Card da home nao encontrado.');
    return this.mapHomeCard(updated);
  }

  async deleteHomeCard(id: string) {
    await this.pool.query('DELETE FROM home_cards WHERE id = ?', [id]);
  }

  async getRaffles(options: ListOptions = {}) {
    const onlyActive = options.onlyActive !== false;
    const rows = await this.queryRows(
      `SELECT * FROM raffles ${onlyActive ? "WHERE status = 'Ativo'" : ''} ORDER BY position ASC`,
    );
    return rows.map((row) => this.mapRaffle(row));
  }

  async createRaffle(input: RaffleInput) {
    const id = createId('raffle');

    await this.pool.query(
      `
        INSERT INTO raffles (
          id, title, prize, description, image, product_id, points_per_ticket, draw_date,
          cta_label, cta_link, total_participants, total_tickets, status, position, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        id,
        input.title,
        input.prize,
        input.description,
        input.image,
        input.productId || null,
        input.pointsPerTicket,
        input.drawDate || null,
        input.ctaLabel || 'Participar agora',
        input.ctaLink || '/sorteios',
        input.totalParticipants,
        input.totalTickets,
        input.status,
        input.position,
      ],
    );

    const [created] = await this.queryRows('SELECT * FROM raffles WHERE id = ? LIMIT 1', [id]);
    return this.mapRaffle(created);
  }

  async updateRaffle(id: string, input: RaffleInput) {
    await this.pool.query(
      `
        UPDATE raffles
        SET title = ?, prize = ?, description = ?, image = ?, product_id = ?, points_per_ticket = ?,
            draw_date = ?, cta_label = ?, cta_link = ?, total_participants = ?, total_tickets = ?,
            status = ?, position = ?, updated_at = NOW()
        WHERE id = ?
      `,
      [
        input.title,
        input.prize,
        input.description,
        input.image,
        input.productId || null,
        input.pointsPerTicket,
        input.drawDate || null,
        input.ctaLabel || 'Participar agora',
        input.ctaLink || '/sorteios',
        input.totalParticipants,
        input.totalTickets,
        input.status,
        input.position,
        id,
      ],
    );

    const [updated] = await this.queryRows('SELECT * FROM raffles WHERE id = ? LIMIT 1', [id]);
    if (!updated) throw new Error('Sorteio nao encontrado.');
    return this.mapRaffle(updated);
  }

  async deleteRaffle(id: string) {
    await this.pool.query('DELETE FROM raffles WHERE id = ?', [id]);
  }

  async getInstagramFeed() {
    const rows = await this.queryRows("SELECT * FROM instagram_posts WHERE status = 'Ativo' ORDER BY position ASC");
    return rows.map((row) => this.mapInstagramPost(row));
  }

  async getStoreSettings() {
    const [settingsRow] = await this.queryRows('SELECT * FROM store_settings WHERE id = 1 LIMIT 1');
    if (!settingsRow) {
      throw new Error('Store settings are missing from MariaDB.');
    }

    return this.mapSettings(settingsRow);
  }

  async getStripeCredentialSummary(mode: StripeMode) {
    return buildStripeCredentialSummary(mode, await this.getStoredStripeCredentialSet(mode));
  }

  async listStripeCredentialSummaries() {
    const [test, live] = await Promise.all([
      this.getStoredStripeCredentialSet('test'),
      this.getStoredStripeCredentialSet('live'),
    ]);

    return {
      test: buildStripeCredentialSummary('test', test),
      live: buildStripeCredentialSummary('live', live),
    };
  }

  async getStripeCredentials(mode: StripeMode) {
    return decodeStoredStripeCredentials(mode, await this.getStoredStripeCredentialSet(mode));
  }

  async saveStripeCredentials(input: StripeCredentialInput) {
    const current = await this.getStoredStripeCredentialSet(input.mode);
    const next = applyStripeCredentialInput(current, input);

    await this.pool.query(
      `
        INSERT INTO payment_gateway_credentials (
          provider, mode, publishable_key_encrypted, secret_key_encrypted, webhook_secret_encrypted, updated_at
        ) VALUES ('stripe', ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          publishable_key_encrypted = VALUES(publishable_key_encrypted),
          secret_key_encrypted = VALUES(secret_key_encrypted),
          webhook_secret_encrypted = VALUES(webhook_secret_encrypted),
          updated_at = NOW()
      `,
      [
        input.mode,
        next.publishableKeyEncrypted,
        next.secretKeyEncrypted,
        next.webhookSecretEncrypted,
      ],
    );

    const saved = await this.getStoredStripeCredentialSet(input.mode);
    return buildStripeCredentialSummary(input.mode, saved);
  }

  async saveStoreSettings(settings: StoreSettings) {
    const normalized = normalizeStoreSettings(settings);

    await this.pool.query(
      `
        INSERT INTO store_settings (
          id, store_name, site_title, admin_panel_name, site_language, allow_business_registration,
          store_currency, logo_url, email, phone, phone_country, instagram, facebook, tiktok,
          description, primary_color, secondary_color, points_per_real, support_sales_phone,
          support_sales_phone_country, support_sac_phone, support_sac_phone_country, support_email,
          support_week_hours, support_saturday_hours, shipping_origin_country, shipping_origin_postal_code,
          shipping_origin_city, shipping_origin_region, shipping_origin_street, shipping_origin_number,
          shipping_free_threshold, shipping_default_product_weight_grams, shipping_package_length_cm,
          shipping_package_width_cm, shipping_package_height_cm, stripe_enabled, stripe_mode,
          stripe_currency, stripe_allow_card, stripe_allow_apple_pay, stripe_allow_google_pay,
          stripe_success_url, stripe_cancel_url, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          store_name = VALUES(store_name),
          site_title = VALUES(site_title),
          admin_panel_name = VALUES(admin_panel_name),
          site_language = VALUES(site_language),
          allow_business_registration = VALUES(allow_business_registration),
          store_currency = VALUES(store_currency),
          logo_url = VALUES(logo_url),
          email = VALUES(email),
          phone = VALUES(phone),
          phone_country = VALUES(phone_country),
          instagram = VALUES(instagram),
          facebook = VALUES(facebook),
          tiktok = VALUES(tiktok),
          description = VALUES(description),
          primary_color = VALUES(primary_color),
          secondary_color = VALUES(secondary_color),
          points_per_real = VALUES(points_per_real),
          support_sales_phone = VALUES(support_sales_phone),
          support_sales_phone_country = VALUES(support_sales_phone_country),
          support_sac_phone = VALUES(support_sac_phone),
          support_sac_phone_country = VALUES(support_sac_phone_country),
          support_email = VALUES(support_email),
          support_week_hours = VALUES(support_week_hours),
          support_saturday_hours = VALUES(support_saturday_hours),
          shipping_origin_country = VALUES(shipping_origin_country),
          shipping_origin_postal_code = VALUES(shipping_origin_postal_code),
          shipping_origin_city = VALUES(shipping_origin_city),
          shipping_origin_region = VALUES(shipping_origin_region),
          shipping_origin_street = VALUES(shipping_origin_street),
          shipping_origin_number = VALUES(shipping_origin_number),
          shipping_free_threshold = VALUES(shipping_free_threshold),
          shipping_default_product_weight_grams = VALUES(shipping_default_product_weight_grams),
          shipping_package_length_cm = VALUES(shipping_package_length_cm),
          shipping_package_width_cm = VALUES(shipping_package_width_cm),
          shipping_package_height_cm = VALUES(shipping_package_height_cm),
          stripe_enabled = VALUES(stripe_enabled),
          stripe_mode = VALUES(stripe_mode),
          stripe_currency = VALUES(stripe_currency),
          stripe_allow_card = VALUES(stripe_allow_card),
          stripe_allow_apple_pay = VALUES(stripe_allow_apple_pay),
          stripe_allow_google_pay = VALUES(stripe_allow_google_pay),
          stripe_success_url = VALUES(stripe_success_url),
          stripe_cancel_url = VALUES(stripe_cancel_url),
          updated_at = NOW()
      `,
      [
        1,
        normalized.storeName,
        normalized.siteTitle,
        normalized.adminPanelName,
        normalized.siteLanguage,
        normalized.allowBusinessRegistration ? 1 : 0,
        normalized.storeCurrency,
        normalized.logoUrl,
        normalized.email,
        normalized.phone,
        normalized.phoneCountry,
        normalized.instagram,
        normalized.facebook,
        normalized.tiktok,
        normalized.description,
        normalized.primaryColor,
        normalized.secondaryColor,
        normalized.pointsPerReal,
        normalized.supportSalesPhone,
        normalized.supportSalesPhoneCountry,
        normalized.supportSacPhone,
        normalized.supportSacPhoneCountry,
        normalized.supportEmail,
        normalized.supportWeekHours,
        normalized.supportSaturdayHours,
        normalized.shippingOriginCountry,
        normalized.shippingOriginPostalCode,
        normalized.shippingOriginCity,
        normalized.shippingOriginRegion,
        normalized.shippingOriginStreet,
        normalized.shippingOriginNumber,
        normalized.shippingFreeThreshold,
        normalized.shippingDefaultProductWeightGrams,
        normalized.shippingPackageLengthCm,
        normalized.shippingPackageWidthCm,
        normalized.shippingPackageHeightCm,
        normalized.stripeEnabled ? 1 : 0,
        normalized.stripeMode,
        normalized.stripeCurrency,
        normalized.stripeAllowCard ? 1 : 0,
        normalized.stripeAllowApplePay ? 1 : 0,
        normalized.stripeAllowGooglePay ? 1 : 0,
        normalized.stripeSuccessUrl,
        normalized.stripeCancelUrl,
      ],
    );

    return normalized;
  }

  async ensureAdminUser(input: EnsureAdminUserInput): Promise<AdminUserProfile> {
    const normalizedEmail = input.email.trim().toLowerCase();

    await this.pool.query(
      `
        INSERT INTO admin_users (
          id, email, password_hash, full_name, role, status,
          mfa_enabled, mfa_secret_encrypted, failed_login_attempts, locked_until,
          last_login_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'active', 0, '', 0, NULL, NULL, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          full_name = VALUES(full_name),
          role = VALUES(role),
          status = 'active',
          updated_at = NOW()
      `,
      [
        createId('admin-user'),
        normalizedEmail,
        input.passwordHash,
        input.fullName.trim(),
        input.role,
      ],
    );

    const [row] = await this.queryRows(
      `
        SELECT id, email, full_name, role, status, mfa_enabled, last_login_at, created_at, updated_at
        FROM admin_users
        WHERE email = ?
        LIMIT 1
      `,
      [normalizedEmail],
    );

    if (!row) {
      throw new Error('Nao foi possivel preparar o administrador inicial.');
    }

    return toPublicAdminUser(row);
  }

  async findAdminAuthByEmail(email: string): Promise<AdminAuthLookup | null> {
    const [row] = await this.queryRows(
      `
        SELECT id, email, password_hash, role, status, mfa_enabled, mfa_secret_encrypted, failed_login_attempts, locked_until
        FROM admin_users
        WHERE email = ?
        LIMIT 1
      `,
      [email.trim().toLowerCase()],
    );

    if (!row) {
      return null;
    }

    return {
      email: row.email || '',
      failedLoginAttempts: toNumber(row.failed_login_attempts, 0),
      id: String(row.id),
      lockedUntil: row.locked_until ? toIsoDateTime(row.locked_until, new Date(0).toISOString()) : null,
      mfaEnabled: toBoolean(row.mfa_enabled),
      mfaSecretEncrypted: row.mfa_secret_encrypted || '',
      passwordHash: row.password_hash || '',
      role: normalizeAdminRole(row.role),
      status: row.status === 'inactive' ? 'inactive' : 'active',
    };
  }

  async getAdminUserById(adminUserId: string): Promise<AdminUserProfile | null> {
    const [row] = await this.queryRows(
      `
        SELECT id, email, full_name, role, status, mfa_enabled, last_login_at, created_at, updated_at
        FROM admin_users
        WHERE id = ?
        LIMIT 1
      `,
      [adminUserId],
    );

    return row ? toPublicAdminUser(row) : null;
  }

  async createAdminSession(input: CreateAdminSessionInput): Promise<AdminSessionLookup> {
    const id = createId('admin-session');

    await this.pool.query(
      `
        INSERT INTO admin_sessions (
          id, admin_user_id, session_token_hash, ip_address, user_agent,
          last_seen_at, expires_at, revoked_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), ?, NULL, NOW(), NOW())
      `,
      [
        id,
        input.adminUserId,
        input.sessionTokenHash,
        input.ipAddress,
        input.userAgent,
        toSqlDateTime(input.expiresAt),
      ],
    );

    await this.pool.query(
      `
        UPDATE admin_users
        SET last_login_at = NOW(),
            failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = NOW()
        WHERE id = ?
      `,
      [input.adminUserId],
    );

    return {
      adminUserId: input.adminUserId,
      expiresAt: input.expiresAt,
      id,
      revokedAt: null,
    };
  }

  async getAdminSessionByTokenHash(tokenHash: string): Promise<AdminSessionLookup | null> {
    const [row] = await this.queryRows(
      'SELECT id, admin_user_id, expires_at, revoked_at FROM admin_sessions WHERE session_token_hash = ? LIMIT 1',
      [tokenHash],
    );

    if (!row) {
      return null;
    }

    return {
      adminUserId: String(row.admin_user_id),
      expiresAt: toIsoDateTime(row.expires_at),
      id: String(row.id),
      revokedAt: row.revoked_at ? toIsoDateTime(row.revoked_at) : null,
    };
  }

  async touchAdminSession(sessionId: string, ipAddress: string, userAgent: string, expiresAt: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE admin_sessions
        SET ip_address = ?,
            user_agent = ?,
            last_seen_at = NOW(),
            expires_at = ?,
            updated_at = NOW()
        WHERE id = ?
      `,
      [ipAddress, userAgent, toSqlDateTime(expiresAt), sessionId],
    );
  }

  async revokeAdminSession(sessionId: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE admin_sessions
        SET revoked_at = COALESCE(revoked_at, NOW()),
            updated_at = NOW()
        WHERE id = ?
      `,
      [sessionId],
    );
  }

  async revokeAdminSessionsByUserId(adminUserId: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE admin_sessions
        SET revoked_at = COALESCE(revoked_at, NOW()),
            updated_at = NOW()
        WHERE admin_user_id = ?
      `,
      [adminUserId],
    );
  }

  async getAdminSessionPayload(adminUserId: string): Promise<AdminSessionPayload | null> {
    const [row] = await this.queryRows(
      `
        SELECT id, email, full_name, role, status, mfa_enabled, last_login_at, created_at, updated_at
        FROM admin_users
        WHERE id = ?
        LIMIT 1
      `,
      [adminUserId],
    );

    return row ? buildAdminSessionPayloadFromRow(row) : null;
  }

  async saveAdminMfaSecret(adminUserId: string, secretEncrypted: string, enabled: boolean): Promise<AdminUserProfile> {
    await this.pool.query(
      `
        UPDATE admin_users
        SET mfa_secret_encrypted = ?,
            mfa_enabled = ?,
            updated_at = NOW()
        WHERE id = ?
      `,
      [secretEncrypted, enabled ? 1 : 0, adminUserId],
    );

    const [row] = await this.queryRows(
      `
        SELECT id, email, full_name, role, status, mfa_enabled, last_login_at, created_at, updated_at
        FROM admin_users
        WHERE id = ?
        LIMIT 1
      `,
      [adminUserId],
    );

    if (!row) {
      throw new Error('Administrador nao encontrado.');
    }

    return toPublicAdminUser(row);
  }

  async createAdminPasswordResetToken(input: CreateAdminPasswordResetTokenInput): Promise<AdminPasswordResetTokenRecord> {
    const id = createId('admin-reset');
    await this.pool.query(
      `
        INSERT INTO admin_password_resets (
          id, admin_user_id, token_hash, ip_address, user_agent, expires_at, used_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, NOW(), NOW())
      `,
      [
        id,
        input.adminUserId,
        input.tokenHash,
        input.ipAddress,
        input.userAgent,
        toSqlDateTime(input.expiresAt),
      ],
    );

    const [row] = await this.queryRows(
      `
        SELECT r.id, r.admin_user_id, r.expires_at, r.used_at, u.email
        FROM admin_password_resets r
        INNER JOIN admin_users u ON u.id = r.admin_user_id
        WHERE r.id = ?
        LIMIT 1
      `,
      [id],
    );

    if (!row) {
      throw new Error('Nao foi possivel criar o token de recuperacao.');
    }

    return {
      adminUserId: String(row.admin_user_id),
      email: row.email || '',
      expiresAt: toIsoDateTime(row.expires_at),
      id: String(row.id),
      usedAt: row.used_at ? toIsoDateTime(row.used_at) : null,
    };
  }

  async getAdminPasswordResetByTokenHash(tokenHash: string): Promise<AdminPasswordResetTokenRecord | null> {
    const [row] = await this.queryRows(
      `
        SELECT r.id, r.admin_user_id, r.expires_at, r.used_at, u.email
        FROM admin_password_resets r
        INNER JOIN admin_users u ON u.id = r.admin_user_id
        WHERE r.token_hash = ?
        LIMIT 1
      `,
      [tokenHash],
    );

    if (!row) {
      return null;
    }

    return {
      adminUserId: String(row.admin_user_id),
      email: row.email || '',
      expiresAt: toIsoDateTime(row.expires_at),
      id: String(row.id),
      usedAt: row.used_at ? toIsoDateTime(row.used_at) : null,
    };
  }

  async getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
    const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_IN_MS);
    const thirtyDaysAgoSql = toSqlDateTime(thirtyDaysAgo) || toSqlDateTime(new Date())!;

    const [[{ activeProducts }]] = await this.pool.query(
      "SELECT COUNT(*) AS activeProducts FROM products WHERE status = 'Ativo'",
    );

    const [[{ newCustomers }]] = await this.pool.query(
      'SELECT COUNT(*) AS newCustomers FROM customers WHERE created_at >= ?',
      [thirtyDaysAgoSql],
    );

    const [[{ ordersTableCount }]] = await this.pool.query(
      'SELECT COUNT(*) AS ordersTableCount FROM orders',
    );

    if (toNumber(ordersTableCount) > 0) {
      const [[ordersMetrics]] = await this.pool.query(
        `SELECT
          COUNT(*) AS totalOrders,
          COALESCE(SUM(total), 0) AS totalRevenue
        FROM orders
        WHERE created_at >= ?`,
        [thirtyDaysAgoSql],
      );

      const [recentOrderRows] = await this.pool.query(
        `SELECT
          order_number,
          status,
          total,
          created_at,
          customer_snapshot
        FROM orders
        ORDER BY created_at DESC
        LIMIT 5`,
      );

      return {
        metrics: {
          revenue: {
            label: 'Receita total',
            value: toNumber(ordersMetrics.totalRevenue),
            description: 'Ultimos 30 dias.',
          },
          orders: {
            label: 'Pedidos',
            value: toNumber(ordersMetrics.totalOrders),
            description: 'Ultimos 30 dias.',
          },
          newCustomers: {
            label: 'Clientes novos',
            value: toNumber(newCustomers),
            description: 'Ultimos 30 dias.',
          },
          activeProducts: {
            label: 'Produtos ativos',
            value: toNumber(activeProducts),
            description: 'Catalogo ativo agora.',
          },
        },
        recentOrders: (recentOrderRows as any[]).map<AdminDashboardRecentOrder>((row) => ({
          orderNumber: String(row.order_number || ''),
          customerName: parseDashboardCustomerName(row.customer_snapshot),
          createdAt: toIsoDateTime(row.created_at),
          status: normalizeDashboardOrderStatus(row.status),
          total: toNumber(row.total),
          source: 'orders',
        })),
      };
    }

    const [[stripeMetrics]] = await this.pool.query(
      `SELECT
        COUNT(*) AS totalOrders,
        COALESCE(SUM(total), 0) AS totalRevenue
      FROM stripe_checkout_orders
      WHERE created_at >= ?`,
      [thirtyDaysAgoSql],
    );

    const [recentStripeRows] = await this.pool.query(
      `SELECT
        order_number,
        order_status,
        total,
        created_at,
        customer
      FROM stripe_checkout_orders
      ORDER BY created_at DESC
      LIMIT 5`,
    );

    return {
      metrics: {
        revenue: {
          label: 'Receita total',
          value: toNumber(stripeMetrics.totalRevenue),
          description: 'Ultimos 30 dias.',
        },
        orders: {
          label: 'Pedidos',
          value: toNumber(stripeMetrics.totalOrders),
          description: 'Ultimos 30 dias.',
        },
        newCustomers: {
          label: 'Clientes novos',
          value: toNumber(newCustomers),
          description: 'Ultimos 30 dias.',
        },
        activeProducts: {
          label: 'Produtos ativos',
          value: toNumber(activeProducts),
          description: 'Catalogo ativo agora.',
        },
      },
      recentOrders: (recentStripeRows as any[]).map<AdminDashboardRecentOrder>((row) => ({
        orderNumber: String(row.order_number || ''),
        customerName: parseDashboardCustomerName(row.customer),
        createdAt: toIsoDateTime(row.created_at),
        status: normalizeDashboardOrderStatus(row.order_status),
        total: toNumber(row.total),
        source: 'stripe_checkout_orders',
      })),
    };
  }

  async markAdminPasswordResetTokenUsed(id: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE admin_password_resets
        SET used_at = COALESCE(used_at, NOW()),
            updated_at = NOW()
        WHERE id = ?
      `,
      [id],
    );
  }

  async getAdminCustomers(): Promise<AdminCustomerRecord[]> {
    const rows = await this.queryRows('SELECT id FROM customers ORDER BY created_at DESC');
    const customers = await Promise.all(rows.map((row) => this.loadAdminCustomerRecord(String(row.id))));
    return customers.filter((customer): customer is AdminCustomerRecord => Boolean(customer));
  }

  async getAdminCustomer(customerId: string): Promise<AdminCustomerRecord | null> {
    return this.loadAdminCustomerRecord(customerId);
  }

  async updateAdminCustomer(customerId: string, input: AdminCustomerRecord): Promise<AdminCustomerRecord> {
    const current = await this.loadAdminCustomerRecord(customerId);
    if (!current) {
      throw new Error('Cliente nao encontrado.');
    }

    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `
          UPDATE customers
          SET email = ?,
              full_name = ?,
              tax_document = ?,
              birth_date = ?,
              phone_e164 = ?,
              phone_country = ?,
              phone_national = ?,
              allow_marketing = ?,
              block_purchases = ?,
              status = ?,
              updated_at = NOW()
          WHERE id = ?
        `,
        [
          input.email.trim().toLowerCase(),
          input.name.trim(),
          input.cpf.trim(),
          toSqlDate(input.birthDate),
          getPhoneE164(input.phone.trim(), input.phoneCountry || 'US'),
          input.phoneCountry || 'US',
          input.phone.trim(),
          input.allowMarketing ? 1 : 0,
          input.blockPurchases ? 1 : 0,
          input.status === 'Inativo' ? 'inactive' : 'active',
          customerId,
        ],
      );

      await connection.query('DELETE FROM customer_addresses WHERE customer_id = ?', [customerId]);

      const addresses = [
        { label: 'Entrega', address: input.shippingAddress, primary: true },
        { label: 'CobranÃ§a', address: input.billingAddress, primary: false },
      ];

      for (const item of addresses) {
        await connection.query(
          `
            INSERT INTO customer_addresses (
              id, customer_id, label, country, postal_code, street, number,
              complement, neighborhood, city, region, is_primary, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `,
          [
            createId('address'),
            customerId,
            item.label,
            item.address.country || 'US',
            item.address.cep.trim(),
            item.address.street.trim(),
            item.address.number.trim(),
            item.address.complement || '',
            item.address.district.trim(),
            item.address.city.trim(),
            item.address.state.trim(),
            item.primary ? 1 : 0,
          ],
        );
      }

      await connection.commit();

      const updated = await this.loadAdminCustomerRecord(customerId, connection);
      if (!updated) {
        throw new Error('Cliente nao encontrado apos atualizacao.');
      }

      return updated;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async recordAdminLoginFailure(adminUserId: string, failedAttempts: number, lockedUntil: string | null): Promise<void> {
    await this.pool.query(
      `
        UPDATE admin_users
        SET failed_login_attempts = ?,
            locked_until = ?,
            updated_at = NOW()
        WHERE id = ?
      `,
      [failedAttempts, toSqlDateTime(lockedUntil), adminUserId],
    );
  }

  async updateAdminPassword(adminUserId: string, passwordHash: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE admin_users
        SET password_hash = ?,
            failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = NOW()
        WHERE id = ?
      `,
      [passwordHash, adminUserId],
    );
  }

  async createAuditLog(input: AuditLogInput): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO audit_logs (
          actor_type, actor_id, actor_email, entity_type, entity_id,
          action, ip_address, user_agent, diff_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        input.actorType || 'system',
        input.actorId || '',
        input.actorEmail || '',
        input.entityType,
        input.entityId,
        input.action,
        input.ipAddress || '',
        input.userAgent || '',
        input.diffJson ? JSON.stringify(input.diffJson) : null,
      ],
    );
  }

  async getAdminAuditLogs(limit = 100): Promise<AuditLogRecord[]> {
    const normalizedLimit = Math.max(1, Math.min(Number(limit) || 100, 200));
    const rows = await this.queryRows(
      `
        SELECT
          id,
          actor_type,
          actor_id,
          actor_email,
          entity_type,
          entity_id,
          action,
          ip_address,
          user_agent,
          diff_json,
          created_at
        FROM audit_logs
        ORDER BY created_at DESC, id DESC
        LIMIT ?
      `,
      [normalizedLimit],
    );

    return rows.map((row) => ({
      id: String(row.id),
      actorType: row.actor_type === 'admin' || row.actor_type === 'customer' ? row.actor_type : 'system',
      actorId: row.actor_id || '',
      actorEmail: row.actor_email || '',
      entityType: row.entity_type || '',
      entityId: row.entity_id || '',
      action: row.action || '',
      ipAddress: row.ip_address || '',
      userAgent: row.user_agent || '',
      diffJson: parseJsonValue<Record<string, unknown> | null>(row.diff_json, null),
      createdAt: toIsoDateTime(row.created_at),
    }));
  }

  async findCustomerAuthByEmail(email: string): Promise<CustomerAuthLookup | null> {
    const [row] = await this.queryRows(
      'SELECT id, email, password_hash, status FROM customers WHERE email = ? LIMIT 1',
      [normalizeNewsletterEmail(email)],
    );

    if (!row) {
      return null;
    }

    return {
      email: row.email || '',
      id: String(row.id),
      passwordHash: row.password_hash || '',
      status: row.status === 'inactive' ? 'inactive' : 'active',
    };
  }

  async createCustomerAccount(input: CustomerRegistrationInput): Promise<CustomerSessionPayload> {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      const existingEmailRows = await this.queryRowsWithExecutor(
        connection,
        'SELECT id FROM customers WHERE email = ? LIMIT 1',
        [normalizeNewsletterEmail(input.email)],
      );

      if (existingEmailRows.length > 0) {
        throw new Error('An account with this email already exists.');
      }

      const customerId = createId('customer');
      const birthDate = toSqlDate(input.birthDate);
      const normalizedPhoneCountry = input.phoneCountry || 'US';
      const normalizedPhone = input.phone.trim();

      await connection.query(
        `
          INSERT INTO customers (
            id, email, password_hash, full_name, tax_document, tax_document_type, birth_date,
            gender, phone_e164, phone_country, phone_national, registration_type,
            corporate_name, state_registration, allow_marketing, block_purchases,
            newsletter_subscribed, status, email_verified_at, last_login_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'active', NULL, NULL, NOW(), NOW())
        `,
        [
          customerId,
          normalizeNewsletterEmail(input.email),
          input.passwordHash,
          input.fullName.trim(),
          input.taxId.trim(),
          getTaxDocumentType(input.registrationType),
          birthDate,
          input.gender.trim(),
          getPhoneE164(normalizedPhone, normalizedPhoneCountry),
          normalizedPhoneCountry,
          normalizedPhone,
          input.registrationType,
          input.corporateName.trim(),
          input.stateRegistration.trim(),
          input.allowMarketing !== false ? 1 : 0,
        ],
      );

      if (input.address) {
        await connection.query(
          `
            INSERT INTO customer_addresses (
              id, customer_id, label, country, postal_code, street, number,
              complement, neighborhood, city, region, is_primary, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `,
          [
            createId('address'),
            customerId,
            input.address.label.trim(),
            input.address.country,
            input.address.postalCode.trim(),
            input.address.street.trim(),
            input.address.number.trim(),
            input.address.complement.trim(),
            input.address.neighborhood.trim(),
            input.address.city.trim(),
            input.address.region.trim(),
            input.address.isPrimary !== false ? 1 : 0,
          ],
        );
      }

      await this.ensureNewsletterBenefitForCustomer(customerId, connection);
      await connection.commit();

      const profile = await this.loadCustomerProfile(customerId);
      return this.buildCustomerSessionPayload(profile);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async createCustomerSession(input: CreateCustomerSessionInput): Promise<CustomerSessionLookup> {
    const id = createId('customer-session');

    await this.pool.query(
      `
        INSERT INTO customer_sessions (
          id, customer_id, session_token_hash, ip_address, user_agent,
          last_seen_at, expires_at, revoked_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), ?, NULL, NOW(), NOW())
      `,
      [
        id,
        input.customerId,
        input.sessionTokenHash,
        input.ipAddress,
        input.userAgent,
        toSqlDateTime(input.expiresAt),
      ],
    );

    await this.pool.query(
      'UPDATE customers SET last_login_at = NOW(), updated_at = NOW() WHERE id = ?',
      [input.customerId],
    );

    return {
      customerId: input.customerId,
      expiresAt: input.expiresAt,
      id,
      revokedAt: null,
    };
  }

  async getCustomerSessionByTokenHash(tokenHash: string): Promise<CustomerSessionLookup | null> {
    const [row] = await this.queryRows(
      'SELECT id, customer_id, expires_at, revoked_at FROM customer_sessions WHERE session_token_hash = ? LIMIT 1',
      [tokenHash],
    );

    if (!row) {
      return null;
    }

    return {
      customerId: String(row.customer_id),
      expiresAt: toIsoDateTime(row.expires_at),
      id: String(row.id),
      revokedAt: row.revoked_at ? toIsoDateTime(row.revoked_at) : null,
    };
  }

  async touchCustomerSession(sessionId: string, ipAddress: string, userAgent: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE customer_sessions
        SET ip_address = ?,
            user_agent = ?,
            last_seen_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
      `,
      [ipAddress, userAgent, sessionId],
    );
  }

  async revokeCustomerSession(sessionId: string): Promise<void> {
    await this.pool.query(
      `
        UPDATE customer_sessions
        SET revoked_at = COALESCE(revoked_at, NOW()),
            updated_at = NOW()
        WHERE id = ?
      `,
      [sessionId],
    );
  }

  async getCustomerSessionPayload(customerId: string): Promise<CustomerSessionPayload | null> {
    await this.ensureNewsletterBenefitForCustomer(customerId);
    const profile = await this.loadCustomerProfile(customerId);
    return profile ? this.buildCustomerSessionPayload(profile) : null;
  }

  async updateCustomerProfile(customerId: string, input: CustomerProfileUpdateInput): Promise<CustomerProfileUpdateResult> {
    const currentProfile = await this.loadCustomerProfile(customerId);
    if (!currentProfile) {
      throw new Error('Customer account not found.');
    }

    const nextPhoneCountry = input.phoneCountry || currentProfile.phoneCountry;
    const nextPhone = input.phone?.trim() || currentProfile.phone;
    const nextBirthDate = input.birthDate?.trim() || currentProfile.birthDate;
    const nextTaxId = input.taxId?.trim() || currentProfile.taxId;
    const nextCorporateName = input.corporateName?.trim() || currentProfile.corporateName;
    const nextStateRegistration = input.stateRegistration?.trim() || currentProfile.stateRegistration;
    const nextAllowMarketing = input.allowMarketing ?? currentProfile.allowMarketing;

    await this.pool.query(
      `
        UPDATE customers
        SET full_name = ?,
            tax_document = ?,
            tax_document_type = ?,
            birth_date = ?,
            gender = ?,
            phone_e164 = ?,
            phone_country = ?,
            phone_national = ?,
            corporate_name = ?,
            state_registration = ?,
            allow_marketing = ?,
            updated_at = NOW()
        WHERE id = ?
      `,
      [
        input.fullName?.trim() || currentProfile.fullName,
        nextTaxId,
        getTaxDocumentType(currentProfile.registrationType),
        toSqlDate(nextBirthDate),
        input.gender?.trim() || currentProfile.gender,
        getPhoneE164(nextPhone, nextPhoneCountry),
        nextPhoneCountry,
        nextPhone,
        nextCorporateName,
        nextStateRegistration,
        nextAllowMarketing ? 1 : 0,
        customerId,
      ],
    );

    const profile = await this.loadCustomerProfile(customerId);
    return this.buildCustomerSessionPayload(profile);
  }

  async saveCustomerAddress(customerId: string, input: CustomerAddressInput): Promise<CustomerAddressMutationResult> {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      const addressId = input.id?.trim() || createId('address');
      const [existingAddress] = await this.queryRowsWithExecutor(
        connection,
        'SELECT id FROM customer_addresses WHERE id = ? AND customer_id = ? LIMIT 1',
        [addressId, customerId],
      );

      if (input.isPrimary !== false) {
        await connection.query(
          'UPDATE customer_addresses SET is_primary = 0, updated_at = NOW() WHERE customer_id = ?',
          [customerId],
        );
      }

      if (existingAddress) {
        await connection.query(
          `
            UPDATE customer_addresses
            SET label = ?,
                country = ?,
                postal_code = ?,
                street = ?,
                number = ?,
                complement = ?,
                neighborhood = ?,
                city = ?,
                region = ?,
                is_primary = ?,
                updated_at = NOW()
            WHERE id = ? AND customer_id = ?
          `,
          [
            input.label.trim(),
            input.country,
            input.postalCode.trim(),
            input.street.trim(),
            input.number.trim(),
            input.complement.trim(),
            input.neighborhood.trim(),
            input.city.trim(),
            input.region.trim(),
            input.isPrimary !== false ? 1 : 0,
            addressId,
            customerId,
          ],
        );
      } else {
        const [existingPrimary] = await this.queryRowsWithExecutor(
          connection,
          'SELECT id FROM customer_addresses WHERE customer_id = ? AND is_primary = 1 LIMIT 1',
          [customerId],
        );

        await connection.query(
          `
            INSERT INTO customer_addresses (
              id, customer_id, label, country, postal_code, street, number,
              complement, neighborhood, city, region, is_primary, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `,
          [
            addressId,
            customerId,
            input.label.trim(),
            input.country,
            input.postalCode.trim(),
            input.street.trim(),
            input.number.trim(),
            input.complement.trim(),
            input.neighborhood.trim(),
            input.city.trim(),
            input.region.trim(),
            input.isPrimary !== false || !existingPrimary ? 1 : 0,
          ],
        );
      }

      await connection.query('UPDATE customers SET updated_at = NOW() WHERE id = ?', [customerId]);
      await connection.commit();

      const profile = await this.loadCustomerProfile(customerId);
      return this.buildCustomerSessionPayload(profile);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteCustomerAddress(customerId: string, addressId: string): Promise<CustomerAddressMutationResult> {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.query('DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?', [addressId, customerId]);

      const remainingAddresses = await this.queryRowsWithExecutor(
        connection,
        'SELECT id, is_primary FROM customer_addresses WHERE customer_id = ? ORDER BY created_at ASC',
        [customerId],
      );

      const hasPrimary = remainingAddresses.some((row) => toBoolean(row.is_primary));
      if (remainingAddresses.length > 0 && !hasPrimary) {
        await connection.query(
          'UPDATE customer_addresses SET is_primary = 1, updated_at = NOW() WHERE id = ?',
          [String(remainingAddresses[0].id)],
        );
      }

      await connection.query('UPDATE customers SET updated_at = NOW() WHERE id = ?', [customerId]);
      await connection.commit();

      const profile = await this.loadCustomerProfile(customerId);
      return this.buildCustomerSessionPayload(profile);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async activateNewsletterBenefitForCustomer(customerId: string): Promise<CustomerBenefitMutationResult> {
    await this.ensureNewsletterBenefitForCustomer(customerId);
    const profile = await this.loadCustomerProfile(customerId);
    return this.buildCustomerSessionPayload(profile);
  }

  async consumeCustomerBenefit(customerId: string, benefitId: string, orderNumber: string): Promise<CustomerBenefitMutationResult> {
    await this.pool.query(
      `
        UPDATE customer_benefits
        SET status = 'used',
            used_at = NOW(),
            used_order_id = ?,
            updated_at = NOW()
        WHERE id = ? AND customer_id = ? AND status = 'available'
      `,
      [orderNumber, benefitId, customerId],
    );

    await this.pool.query('UPDATE customers SET updated_at = NOW() WHERE id = ?', [customerId]);

    const profile = await this.loadCustomerProfile(customerId);
    return this.buildCustomerSessionPayload(profile);
  }

  async getCustomerCart(customerId: string): Promise<CustomerCartPayload> {
    const [cartRows] = await Promise.all([
      this.queryRows(
        `SELECT * FROM carts WHERE customer_id = ? AND status = 'active' ORDER BY updated_at DESC, created_at DESC LIMIT 1`,
        [customerId],
      ),
    ]);

    const cartRow = cartRows[0] || null;
    if (!cartRow) {
      return buildEmptyCustomerCartPayload();
    }

    const cartItems = await this.queryRows(
      'SELECT * FROM cart_items WHERE cart_id = ? ORDER BY created_at ASC',
      [String(cartRow.id)],
    );

    return buildCustomerCartPayload(cartRow, cartItems);
  }

  async saveCustomerCart(customerId: string, input: CustomerCartSaveInput): Promise<CustomerCartPayload> {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      const customerRows = await this.queryRowsWithExecutor(
        connection,
        'SELECT id FROM customers WHERE id = ? LIMIT 1',
        [customerId],
      );

      if (!customerRows.length) {
        throw new Error('Customer account not found.');
      }

      const customerBenefits = await this.loadCustomerBenefits(customerId, connection);
      const availableBenefit = getAvailableWelcomeBenefit(customerBenefits);
      const normalized = normalizeCartInputItems(input);
      const [existingCart] = await this.queryRowsWithExecutor(
        connection,
        `SELECT * FROM carts WHERE customer_id = ? AND status = 'active' ORDER BY updated_at DESC, created_at DESC LIMIT 1`,
        [customerId],
      );

      if (!normalized.items.length) {
        if (existingCart) {
          await connection.query('DELETE FROM cart_items WHERE cart_id = ?', [existingCart.id]);
          await connection.query('DELETE FROM carts WHERE id = ?', [existingCart.id]);
        }

        await connection.commit();
        return buildEmptyCustomerCartPayload();
      }

      const requestedBenefitId = String(input.appliedBenefitId || '').trim();
      const resolvedBenefit =
        (requestedBenefitId
          ? customerBenefits.find((benefit) => benefit.id === requestedBenefitId && benefit.status === 'available') || null
          : null)
        || availableBenefit;

      let appliedBenefitId: string | null = null;
      if (resolvedBenefit && (Number(input.discount || 0) > 0 || requestedBenefitId)) {
        const expectedDiscount = calculateWelcomeBenefitDiscount(normalized.subtotal, resolvedBenefit);
        if (Math.abs(expectedDiscount - Number(input.discount || 0)) > 0.01 && Number(input.discount || 0) > 0) {
          throw new Error('The discount amount does not match the customer benefit.');
        }

        normalized.discount = expectedDiscount;
        appliedBenefitId = resolvedBenefit.id;
      }

      const timestamp = new Date().toISOString();
      const cartId = existingCart?.id || createId('cart');

      if (existingCart) {
        await connection.query(
          `
            UPDATE carts
            SET currency = ?,
                subtotal = ?,
                discount = ?,
                shipping = ?,
                tax = ?,
                total = ?,
                shipping_method = ?,
                applied_coupon_id = ?,
                applied_benefit_id = ?,
                updated_at = ?
            WHERE id = ?
          `,
          [
            normalized.currency,
            normalized.subtotal,
            normalized.discount,
            normalized.shipping,
            normalized.tax,
            normalized.total,
            normalized.shippingMethod,
            input.appliedCouponId ? String(input.appliedCouponId).trim() || null : null,
            appliedBenefitId,
            toSqlDateTime(timestamp),
            cartId,
          ],
        );
      } else {
        await connection.query(
          `
            INSERT INTO carts (
              id, customer_id, status, currency, subtotal, discount, shipping, tax, total,
              shipping_method, shipping_quote_snapshot, applied_coupon_id, applied_benefit_id,
              converted_order_id, created_at, updated_at, converted_at
            ) VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?, ?, NULL)
          `,
          [
            cartId,
            customerId,
            normalized.currency,
            normalized.subtotal,
            normalized.discount,
            normalized.shipping,
            normalized.tax,
            normalized.total,
            normalized.shippingMethod,
            input.appliedCouponId ? String(input.appliedCouponId).trim() || null : null,
            appliedBenefitId,
            toSqlDateTime(timestamp),
            toSqlDateTime(timestamp),
          ],
        );
      }

      await connection.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);

      for (const item of normalized.items) {
        await connection.query(
          `
            INSERT INTO cart_items (
              id, cart_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot,
              quantity, size_label, color_label, metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            item.id,
            cartId,
            item.productId,
            item.productNameSnapshot,
            item.skuSnapshot,
            item.unitPriceSnapshot,
            item.quantity,
            item.sizeLabel,
            item.colorLabel,
            JSON.stringify(item.metadata || {}),
            toSqlDateTime(timestamp),
            toSqlDateTime(timestamp),
          ],
        );
      }

      await connection.commit();

      const savedCartRows = await this.queryRows('SELECT * FROM carts WHERE id = ? LIMIT 1', [cartId]);
      const savedCart = savedCartRows[0] || null;
      const savedCartItems = savedCart ? await this.queryRows('SELECT * FROM cart_items WHERE cart_id = ? ORDER BY created_at ASC', [cartId]) : [];
      return buildCustomerCartPayload(savedCart, savedCartItems);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async clearCustomerCart(customerId: string): Promise<CustomerCartPayload> {
    return this.saveCustomerCart(customerId, { items: [] });
  }

  async getAdminPromotions(): Promise<AdminPromotionRecord[]> {
    const rows = await this.queryRows('SELECT * FROM coupons ORDER BY updated_at DESC, created_at DESC');
    return Promise.all(rows.map((row) => this.mapAdminPromotion(row)));
  }

  async createAdminPromotion(input: AdminPromotionInput): Promise<AdminPromotionRecord> {
    const id = createId('promotion');
    const payload = this.toCouponPayload(input);

    await this.pool.query(
      `
        INSERT INTO coupons (
          id, code, title, description, coupon_type, coupon_value,
          min_order_value, usage_limit_total, usage_limit_per_customer,
          starts_at, expires_at, status, applies_to_scope, applies_to_payload,
          created_at, updated_at, archived_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)
      `,
      [
        id,
        payload.code,
        payload.title,
        payload.description,
        payload.couponType,
        payload.couponValue,
        payload.minOrderValue,
        payload.usageLimitTotal,
        payload.usageLimitPerCustomer,
        payload.startsAt,
        payload.expiresAt,
        payload.status,
        payload.appliesToScope,
        payload.appliesToPayload,
      ],
    );

    const [created] = await this.queryRows('SELECT * FROM coupons WHERE id = ? LIMIT 1', [id]);
    return this.mapAdminPromotion(created);
  }

  async updateAdminPromotion(id: string, input: AdminPromotionInput): Promise<AdminPromotionRecord> {
    const payload = this.toCouponPayload(input);

    await this.pool.query(
      `
        UPDATE coupons
        SET code = ?,
            title = ?,
            description = ?,
            coupon_type = ?,
            coupon_value = ?,
            min_order_value = ?,
            usage_limit_total = ?,
            usage_limit_per_customer = ?,
            starts_at = ?,
            expires_at = ?,
            status = ?,
            applies_to_scope = ?,
            applies_to_payload = ?,
            archived_at = CASE WHEN ? = 'archived' THEN COALESCE(archived_at, NOW()) ELSE NULL END,
            updated_at = NOW()
        WHERE id = ?
      `,
      [
        payload.code,
        payload.title,
        payload.description,
        payload.couponType,
        payload.couponValue,
        payload.minOrderValue,
        payload.usageLimitTotal,
        payload.usageLimitPerCustomer,
        payload.startsAt,
        payload.expiresAt,
        payload.status,
        payload.appliesToScope,
        payload.appliesToPayload,
        payload.status,
        id,
      ],
    );

    const [updated] = await this.queryRows('SELECT * FROM coupons WHERE id = ? LIMIT 1', [id]);
    if (!updated) throw new Error('Campanha nao encontrada.');
    return this.mapAdminPromotion(updated);
  }

  async setAdminPromotionStatus(id: string, status: AdminPromotionStatus): Promise<AdminPromotionRecord> {
    const databaseStatus = status === 'Pausado'
      ? 'paused'
      : status === 'Finalizado'
        ? 'finished'
        : status === 'Arquivada'
          ? 'archived'
          : 'active';

    await this.pool.query(
      `
        UPDATE coupons
        SET status = ?,
            archived_at = CASE WHEN ? = 'archived' THEN COALESCE(archived_at, NOW()) ELSE NULL END,
            updated_at = NOW()
        WHERE id = ?
      `,
      [databaseStatus, databaseStatus, id],
    );

    const [updated] = await this.queryRows('SELECT * FROM coupons WHERE id = ? LIMIT 1', [id]);
    if (!updated) throw new Error('Campanha nao encontrada.');
    return this.mapAdminPromotion(updated);
  }

  async deleteAdminPromotion(id: string): Promise<{ archived: boolean }> {
    const [{ total = 0 } = {}] = await this.queryRows('SELECT COUNT(*) AS total FROM orders WHERE coupon_id = ?', [id]);
    const hasHistory = Number(total || 0) > 0;

    if (hasHistory) {
      await this.setAdminPromotionStatus(id, 'Arquivada');
      return { archived: true };
    }

    await this.pool.query('DELETE FROM coupons WHERE id = ?', [id]);
    return { archived: false };
  }

  async getContactMessages() {
    const rows = await this.queryRows('SELECT * FROM contact_messages ORDER BY created_at DESC');
    return rows.map((row) => this.mapContactMessage(row));
  }

  async getNewsletterSubscribers() {
    const rows = await this.queryRows('SELECT * FROM newsletter_subscribers ORDER BY created_at DESC');
    return rows.map((row) => this.mapNewsletterSubscriber(row));
  }

  async createContactMessage(input: ContactMessageInput) {
    const id = createId('contact');
    const timestamp = toSqlDateTime(new Date());

    await this.pool.query(
      `
        INSERT INTO contact_messages (
          id, name, email, phone, order_number, message, status, source,
          admin_notes, created_at, updated_at, replied_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'Novo', 'site-contact', '', ?, ?, NULL)
      `,
      [id, input.name.trim(), input.email.trim(), input.phone?.trim() || '', input.orderNumber?.trim() || '', input.message.trim(), timestamp, timestamp],
    );

    const [created] = await this.queryRows('SELECT * FROM contact_messages WHERE id = ? LIMIT 1', [id]);
    return this.mapContactMessage(created);
  }

  async updateContactMessage(id: string, input: ContactMessageUpdateInput) {
    await this.pool.query(
      `
        UPDATE contact_messages
        SET status = COALESCE(?, status),
            admin_notes = COALESCE(?, admin_notes),
            replied_at = COALESCE(?, replied_at),
            updated_at = NOW()
        WHERE id = ?
      `,
      [input.status ?? null, input.adminNotes ?? null, toSqlDateTime(input.repliedAt) ?? null, id],
    );

    const [updated] = await this.queryRows('SELECT * FROM contact_messages WHERE id = ? LIMIT 1', [id]);
    if (!updated) throw new Error('Mensagem nao encontrada.');
    return this.mapContactMessage(updated);
  }

  async createNewsletterSubscriber(input: NewsletterSubscriberInput) {
    const normalizedEmail = normalizeNewsletterEmail(input.email);

    if (!isValidNewsletterEmail(normalizedEmail)) {
      throw new Error('Informe um e-mail valido para receber o cupom.');
    }

    const id = createNewsletterSubscriberId(normalizedEmail);
    const source = input.source?.trim() || NEWSLETTER_DEFAULT_SOURCE;

    await this.pool.query(
      `
        INSERT INTO newsletter_subscribers (
          id, email, status, source, coupon_code, created_at, updated_at
        ) VALUES (?, ?, 'Ativo', ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          source = VALUES(source),
          coupon_code = VALUES(coupon_code),
          updated_at = NOW()
      `,
      [id, normalizedEmail, source, WELCOME_NEWSLETTER_COUPON_CODE],
    );

    const [created] = await this.queryRows('SELECT * FROM newsletter_subscribers WHERE email = ? LIMIT 1', [normalizedEmail]);
    if (!created) {
      throw new Error('Nao foi possivel salvar o cadastro da newsletter.');
    }

    return this.mapNewsletterSubscriber(created);
  }
}
