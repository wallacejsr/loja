import type { Product } from '../../src/data/mockData.ts';
import type {
  CustomerAddressInput,
  CustomerProfileUpdateInput,
  CustomerRegisterInput,
  CustomerSessionPayload,
  StoreCustomerAddress,
  StoreCustomerProfile,
} from '../../src/lib/storeCustomerApi.ts';
import type { StoreSettings, StripeMode } from '../../src/types/settings.ts';
import type { StoreCustomerWelcomeBenefit } from '../../src/lib/welcomeBenefit.ts';
import type { AdminPermission, AdminRole } from '../auth/adminPermissions';
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
} from '../../src/lib/storeApiSupabase.ts';

export type StoredStatus = 'Ativo' | 'Inativo';

export type StoredProduct = Product & {
  createdAt: string;
  status: StoredStatus;
  updatedAt: string;
};

export type StoredInstagramPost = InstagramPost & {
  status: StoredStatus;
};

export type StoredStripeCredentialSet = {
  publishableKeyEncrypted: string;
  secretKeyEncrypted: string;
  updatedAt: string | null;
  webhookSecretEncrypted: string;
};

export type AdminUserStatus = 'active' | 'inactive';

export type AdminUserProfile = {
  createdAt: string;
  email: string;
  fullName: string;
  id: string;
  lastLoginAt: string | null;
  mfaEnabled: boolean;
  role: AdminRole;
  status: AdminUserStatus;
  updatedAt: string;
};

export type StoredAdminUserProfile = AdminUserProfile & {
  failedLoginAttempts: number;
  lockedUntil: string | null;
  mfaSecretEncrypted: string;
  passwordHash: string;
};

export type AdminAuthLookup = {
  email: string;
  failedLoginAttempts: number;
  id: string;
  lockedUntil: string | null;
  mfaEnabled: boolean;
  mfaSecretEncrypted: string;
  passwordHash: string;
  role: AdminRole;
  status: AdminUserStatus;
};

export type AdminSessionLookup = {
  adminUserId: string;
  expiresAt: string;
  id: string;
  revokedAt: string | null;
};

export type CreateAdminSessionInput = {
  adminUserId: string;
  expiresAt: string;
  ipAddress: string;
  sessionTokenHash: string;
  userAgent: string;
};

export type AdminPasswordResetTokenRecord = {
  adminUserId: string;
  email: string;
  expiresAt: string;
  id: string;
  usedAt: string | null;
};

export type CreateAdminPasswordResetTokenInput = {
  adminUserId: string;
  expiresAt: string;
  ipAddress: string;
  tokenHash: string;
  userAgent: string;
};

export type AuditLogInput = {
  action: string;
  actorEmail?: string;
  actorId?: string;
  actorType?: 'admin' | 'customer' | 'system';
  diffJson?: Record<string, unknown> | null;
  entityId: string;
  entityType: string;
  ipAddress?: string;
  userAgent?: string;
};

export type AuditLogRecord = {
  action: string;
  actorEmail: string;
  actorId: string;
  actorType: 'admin' | 'customer' | 'system';
  createdAt: string;
  diffJson: Record<string, unknown> | null;
  entityId: string;
  entityType: string;
  id: string;
  ipAddress: string;
  userAgent: string;
};

export type EnsureAdminUserInput = {
  email: string;
  fullName: string;
  passwordHash: string;
  role: AdminRole;
};

export type AdminSessionPayload = {
  authenticated: boolean;
  permissions: AdminPermission[];
  user: AdminUserProfile | null;
};

export type CustomerAuthLookup = {
  email: string;
  id: string;
  passwordHash: string;
  status: StoreCustomerProfile['status'];
};

export type CustomerRegistrationInput = CustomerRegisterInput & {
  passwordHash: string;
};

export type CustomerSessionLookup = {
  customerId: string;
  expiresAt: string;
  id: string;
  revokedAt: string | null;
};

export type CreateCustomerSessionInput = {
  customerId: string;
  expiresAt: string;
  ipAddress: string;
  sessionTokenHash: string;
  userAgent: string;
};

export type StoredCustomerProfile = StoreCustomerProfile & {
  passwordHash: string;
};

export type StoredCustomerSession = {
  createdAt: string;
  customerId: string;
  expiresAt: string;
  id: string;
  ipAddress: string;
  lastSeenAt: string;
  revokedAt: string | null;
  sessionTokenHash: string;
  updatedAt: string;
  userAgent: string;
};

export interface StoreSnapshot {
  auditLogs?: AuditLogRecord[];
  adminPasswordResets?: Array<{
    adminUserId: string;
    createdAt: string;
    expiresAt: string;
    id: string;
    ipAddress: string;
    tokenHash: string;
    updatedAt: string;
    usedAt: string | null;
    userAgent: string;
  }>;
  adminSessions?: Array<{
    adminUserId: string;
    createdAt: string;
    expiresAt: string;
    id: string;
    ipAddress: string;
    lastSeenAt: string;
    revokedAt: string | null;
    sessionTokenHash: string;
    updatedAt: string;
    userAgent: string;
  }>;
  adminUsers?: StoredAdminUserProfile[];
  banners: Banner[];
  categories: StoreCategory[];
  contactMessages: ContactMessage[];
  customerSessions?: StoredCustomerSession[];
  customers?: StoredCustomerProfile[];
  homeCards: HomeCard[];
  homeSections: HomeSection[];
  instagramFeed: StoredInstagramPost[];
  newsletterSubscribers: NewsletterSubscriber[];
  products: StoredProduct[];
  raffles: Raffle[];
  settings: StoreSettings;
  stripeCredentials?: Partial<Record<StripeMode, StoredStripeCredentialSet>>;
}

export type ListOptions = {
  onlyActive?: boolean;
};

export type StripeCredentialInput = {
  mode: StripeMode;
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
};

export type StripeCredentialSummary = {
  mode: StripeMode;
  publishableKeyConfigured: boolean;
  publishableKeyMasked: string;
  ready: boolean;
  secretKeyConfigured: boolean;
  secretKeyMasked: string;
  updatedAt: string | null;
  webhookSecretConfigured: boolean;
  webhookSecretMasked: string;
};

export type StripeCredentials = {
  mode: StripeMode;
  publishableKey: string;
  secretKey: string;
  updatedAt: string | null;
  webhookSecret: string;
};

export type AdminDashboardMetric = {
  description?: string;
  label: string;
  value: number;
};

export type AdminDashboardRecentOrder = {
  createdAt: string;
  customerName: string;
  orderNumber: string;
  source: 'orders' | 'stripe_checkout_orders';
  status: string;
  total: number;
};

export type AdminDashboardSummary = {
  metrics: {
    activeProducts: AdminDashboardMetric;
    newCustomers: AdminDashboardMetric;
    orders: AdminDashboardMetric;
    revenue: AdminDashboardMetric;
  };
  recentOrders: AdminDashboardRecentOrder[];
};

export type CustomerProfileUpdateResult = CustomerSessionPayload;
export type CustomerAddressMutationResult = CustomerSessionPayload;
export type CustomerBenefitMutationResult = CustomerSessionPayload;

export interface StoreRepository {
  createBanner(input: Pick<Banner, 'title' | 'desktop' | 'mobile' | 'link'>): Promise<Banner>;
  createCategory(input: CategoryInput): Promise<StoreCategory>;
  createContactMessage(input: ContactMessageInput): Promise<ContactMessage>;
  createAdminPasswordResetToken(input: CreateAdminPasswordResetTokenInput): Promise<AdminPasswordResetTokenRecord>;
  createAdminSession(input: CreateAdminSessionInput): Promise<AdminSessionLookup>;
  createAuditLog(input: AuditLogInput): Promise<void>;
  getAdminAuditLogs(limit?: number): Promise<AuditLogRecord[]>;
  createCustomerAccount(input: CustomerRegistrationInput): Promise<CustomerSessionPayload>;
  createCustomerSession(input: CreateCustomerSessionInput): Promise<CustomerSessionLookup>;
  createNewsletterSubscriber(input: NewsletterSubscriberInput): Promise<NewsletterSubscriber>;
  createHomeCard(input: HomeCardInput): Promise<HomeCard>;
  createProduct(input: ProductInput): Promise<Product>;
  createRaffle(input: RaffleInput): Promise<Raffle>;
  deleteCustomerAddress(customerId: string, addressId: string): Promise<CustomerAddressMutationResult>;
  deleteBanner(id: string): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  deleteHomeCard(id: string): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  deleteRaffle(id: string): Promise<void>;
  consumeCustomerBenefit(customerId: string, benefitId: string, orderNumber: string): Promise<CustomerBenefitMutationResult>;
  ensureAdminUser(input: EnsureAdminUserInput): Promise<AdminUserProfile>;
  findAdminAuthByEmail(email: string): Promise<AdminAuthLookup | null>;
  findCustomerAuthByEmail(email: string): Promise<CustomerAuthLookup | null>;
  getAdminPasswordResetByTokenHash(tokenHash: string): Promise<AdminPasswordResetTokenRecord | null>;
  getAdminDashboardSummary(): Promise<AdminDashboardSummary>;
  getAdminSessionByTokenHash(tokenHash: string): Promise<AdminSessionLookup | null>;
  getAdminSessionPayload(adminUserId: string): Promise<AdminSessionPayload | null>;
  getAdminUserById(adminUserId: string): Promise<AdminUserProfile | null>;
  getBanners(options?: ListOptions): Promise<Banner[]>;
  getCategories(): Promise<StoreCategory[]>;
  getContactMessages(): Promise<ContactMessage[]>;
  getCustomerSessionByTokenHash(tokenHash: string): Promise<CustomerSessionLookup | null>;
  getCustomerSessionPayload(customerId: string): Promise<CustomerSessionPayload | null>;
  getHomeCards(options?: ListOptions): Promise<HomeCard[]>;
  getHomeSections(options?: ListOptions): Promise<HomeSection[]>;
  getInstagramFeed(): Promise<InstagramPost[]>;
  getNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  getProducts(options?: ListOptions): Promise<Product[]>;
  getRaffles(options?: ListOptions): Promise<Raffle[]>;
  getStripeCredentials(mode: StripeMode): Promise<StripeCredentials | null>;
  getStripeCredentialSummary(mode: StripeMode): Promise<StripeCredentialSummary>;
  getStoreSettings(): Promise<StoreSettings>;
  listStripeCredentialSummaries(): Promise<Record<StripeMode, StripeCredentialSummary>>;
  markAdminPasswordResetTokenUsed(id: string): Promise<void>;
  recordAdminLoginFailure(adminUserId: string, failedAttempts: number, lockedUntil: string | null): Promise<void>;
  activateNewsletterBenefitForCustomer(customerId: string): Promise<CustomerBenefitMutationResult>;
  revokeAdminSession(sessionId: string): Promise<void>;
  revokeAdminSessionsByUserId(adminUserId: string): Promise<void>;
  revokeCustomerSession(sessionId: string): Promise<void>;
  saveStoreSettings(settings: StoreSettings): Promise<StoreSettings>;
  saveCustomerAddress(customerId: string, input: CustomerAddressInput): Promise<CustomerAddressMutationResult>;
  saveAdminMfaSecret(adminUserId: string, secretEncrypted: string, enabled: boolean): Promise<AdminUserProfile>;
  saveStripeCredentials(input: StripeCredentialInput): Promise<StripeCredentialSummary>;
  touchAdminSession(sessionId: string, ipAddress: string, userAgent: string, expiresAt: string): Promise<void>;
  touchCustomerSession(sessionId: string, ipAddress: string, userAgent: string): Promise<void>;
  updateAdminPassword(adminUserId: string, passwordHash: string): Promise<void>;
  updateBannerPositions(banners: Banner[]): Promise<void>;
  updateCategory(id: string, input: CategoryInput): Promise<StoreCategory>;
  updateContactMessage(id: string, input: ContactMessageUpdateInput): Promise<ContactMessage>;
  updateCustomerProfile(customerId: string, input: CustomerProfileUpdateInput): Promise<CustomerProfileUpdateResult>;
  updateHomeCard(id: string, input: HomeCardInput): Promise<HomeCard>;
  updateHomeSection(id: string, input: HomeSectionInput): Promise<HomeSection>;
  updateProduct(id: string, input: ProductInput): Promise<Product>;
  updateRaffle(id: string, input: RaffleInput): Promise<Raffle>;
}
