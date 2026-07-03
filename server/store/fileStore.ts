import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Product } from '../../src/data/mockData.ts';
import type {
  CustomerAddressInput,
  CustomerProfileUpdateInput,
  CustomerSessionPayload,
  StoreCustomerAddress,
  StoreCustomerProfile,
} from '../../src/lib/storeCustomerApi.ts';
import {
  createWelcomeBenefitFromSubscriber,
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
import { normalizeStoreSettings, type StoreSettings, type StripeMode } from '../../src/types/settings.ts';
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
import {
  applyStripeCredentialInput,
  buildStripeCredentialSummary,
  createEmptyStoredStripeCredentialSet,
  decryptStoredSecret,
  decodeStoredStripeCredentials,
} from '../integrations/stripeCredentials';
import { getAdminRolePermissions, type AdminRole } from '../auth/adminPermissions';
import { cloneStoreSnapshot, createDefaultStoreSnapshot, createId } from './defaultData';
import type {
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
  StoredAdminUserProfile,
  StoredCustomerProfile,
  StoredCustomerSession,
  StoredProduct,
  StripeCredentialInput,
  StoredStripeCredentialSet,
} from './types';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sortByPosition<T extends { position: number }>(items: T[]) {
  return [...items].sort((left, right) => left.position - right.position);
}

function sortCategories(items: StoreCategory[]) {
  return [...items].sort((left, right) => left.menuOrder - right.menuOrder || left.nome.localeCompare(right.nome));
}

function toPublicProduct(product: StoredProduct): Product {
  const { createdAt: _createdAt, status: _status, updatedAt: _updatedAt, ...publicProduct } = product;
  return publicProduct;
}

function getProductCountByCategory(snapshot: StoreSnapshot, categoryName: string) {
  return snapshot.products.filter((product) => product.status !== 'Inativo' && product.categoria === categoryName).length;
}

function createStoredProduct(input: ProductInput, id = input.id || createId('product')): StoredProduct {
  const timestamp = new Date().toISOString();

  return {
    id,
    nome: input.nome,
    preco: input.preco,
    precoPromocional: input.precoPromocional,
    categoria: input.categoria,
    subcategoria: input.subcategoria || '',
    imagens: input.imagens,
    descricao: input.descricao || '',
    composicao: input.composicao || '',
    tamanhos: input.tamanhos || [],
    cores: input.cores || [],
    avaliacoes: [],
    maisVendido: Boolean(input.maisVendido),
    lancamento: Boolean(input.lancamento),
    estoque: input.estoque,
    shippingWeightGrams: input.shippingWeightGrams ?? 500,
    createdAt: timestamp,
    status: 'Ativo',
    updatedAt: timestamp,
  };
}

function ensureStripeCredentials(snapshot: StoreSnapshot) {
  if (!snapshot.stripeCredentials) {
    snapshot.stripeCredentials = {
      test: createEmptyStoredStripeCredentialSet(),
      live: createEmptyStoredStripeCredentialSet(),
    };
  }

  snapshot.stripeCredentials.test ||= createEmptyStoredStripeCredentialSet();
  snapshot.stripeCredentials.live ||= createEmptyStoredStripeCredentialSet();

  return snapshot.stripeCredentials as Record<StripeMode, StoredStripeCredentialSet>;
}

function ensureSinglePrimaryAddress(addresses: StoreCustomerAddress[]) {
  if (!addresses.length) {
    return [];
  }

  const primaryAddress = addresses.find((address) => address.isPrimary) || addresses[0];

  return addresses.map((address) => ({
    ...address,
    isPrimary: address.id === primaryAddress.id,
  }));
}

function ensureCustomerCollections(snapshot: StoreSnapshot) {
  snapshot.customers ||= [];
  snapshot.customerSessions ||= [];
}

function ensureAdminCollections(snapshot: StoreSnapshot) {
  snapshot.adminUsers ||= [];
  snapshot.adminSessions ||= [];
  snapshot.adminPasswordResets ||= [];
  snapshot.auditLogs ||= [];
}

function mapStoredCustomerToPublic(customer: StoredCustomerProfile): StoreCustomerProfile {
  const { passwordHash: _passwordHash, ...publicCustomer } = customer;
  return {
    ...publicCustomer,
    addresses: ensureSinglePrimaryAddress(publicCustomer.addresses || []),
    welcomeBenefits: Array.isArray(publicCustomer.welcomeBenefits) ? publicCustomer.welcomeBenefits : [],
  };
}

function buildCustomerSessionPayload(customer: StoredCustomerProfile | null): CustomerSessionPayload {
  if (!customer) {
    return {
      authenticated: false,
      availableWelcomeBenefit: null,
      customer: null,
      primaryAddress: null,
    };
  }

  const publicCustomer = mapStoredCustomerToPublic(customer);

  return {
    authenticated: true,
    availableWelcomeBenefit: getAvailableWelcomeBenefit(publicCustomer.welcomeBenefits),
    customer: publicCustomer,
    primaryAddress: publicCustomer.addresses.find((address) => address.isPrimary) || publicCustomer.addresses[0] || null,
  };
}

function toPublicAdminUser(adminUser: StoredAdminUserProfile): AdminUserProfile {
  const { passwordHash: _passwordHash, mfaSecretEncrypted: _mfaSecretEncrypted, failedLoginAttempts: _failedLoginAttempts, lockedUntil: _lockedUntil, ...publicUser } = adminUser;
  return publicUser;
}

function buildAdminSessionPayload(adminUser: StoredAdminUserProfile | null): AdminSessionPayload {
  if (!adminUser) {
    return {
      authenticated: false,
      permissions: [],
      user: null,
    };
  }

  return {
    authenticated: true,
    permissions: getAdminRolePermissions(adminUser.role),
    user: toPublicAdminUser(adminUser),
  };
}

function getTaxDocumentType(customer: Pick<StoredCustomerProfile, 'registrationType'>) {
  return customer.registrationType === 'J' ? 'business_tax_id' : 'tax_id';
}

function createStoredCustomer(input: CustomerRegistrationInput, linkedBenefit: StoreCustomerWelcomeBenefit | null): StoredCustomerProfile {
  const timestamp = new Date().toISOString();
  const address = input.address
    ? ensureSinglePrimaryAddress([
        {
          id: createId('address'),
          label: input.address.label.trim(),
          country: input.address.country,
          postalCode: input.address.postalCode.trim(),
          street: input.address.street.trim(),
          number: input.address.number.trim(),
          complement: input.address.complement.trim(),
          neighborhood: input.address.neighborhood.trim(),
          city: input.address.city.trim(),
          region: input.address.region.trim(),
          isPrimary: input.address.isPrimary !== false,
        },
      ])
    : [];

  return {
    id: createId('customer'),
    email: normalizeNewsletterEmail(input.email),
    passwordHash: input.passwordHash,
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    phoneCountry: input.phoneCountry || 'US',
    birthDate: input.birthDate || '',
    gender: input.gender.trim(),
    registrationType: input.registrationType,
    taxId: input.taxId.trim(),
    taxDocumentType: input.registrationType === 'J' ? 'business_tax_id' : 'tax_id',
    corporateName: input.corporateName.trim(),
    stateRegistration: input.stateRegistration.trim(),
    allowMarketing: input.allowMarketing !== false,
    blockPurchases: false,
    newsletterSubscribed: Boolean(linkedBenefit),
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
    addresses: address,
    welcomeBenefits: linkedBenefit ? [linkedBenefit] : [],
  };
}

export class FileStoreRepository implements StoreRepository {
  constructor(private readonly filePath: string) {}

  private async ensureParentDirectory() {
    await mkdir(path.dirname(this.filePath), { recursive: true });
  }

  private async readSnapshot(): Promise<StoreSnapshot> {
    await this.ensureParentDirectory();

    try {
      const fileContents = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(fileContents) as StoreSnapshot;
      parsed.newsletterSubscribers ||= [];
      ensureCustomerCollections(parsed);
      ensureAdminCollections(parsed);
      ensureStripeCredentials(parsed);
      return deepClone(parsed);
    } catch (error) {
      const snapshot = createDefaultStoreSnapshot();
      await this.writeSnapshot(snapshot);
      return cloneStoreSnapshot(snapshot);
    }
  }

  private async writeSnapshot(snapshot: StoreSnapshot) {
    await this.ensureParentDirectory();
    await writeFile(this.filePath, JSON.stringify(snapshot, null, 2), 'utf8');
  }

  private async mutate<T>(callback: (snapshot: StoreSnapshot) => T | Promise<T>) {
    const snapshot = await this.readSnapshot();
    const result = await callback(snapshot);
    await this.writeSnapshot(snapshot);
    return result;
  }

  async getProducts(options: ListOptions = {}): Promise<Product[]> {
    const snapshot = await this.readSnapshot();
    const onlyActive = options.onlyActive !== false;

    return snapshot.products
      .filter((product) => !onlyActive || product.status !== 'Inativo')
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(toPublicProduct);
  }

  async createProduct(input: ProductInput): Promise<Product> {
    return this.mutate(async (snapshot) => {
      const created = createStoredProduct(input);
      snapshot.products.unshift(created);
      return toPublicProduct(created);
    });
  }

  async updateProduct(id: string, input: ProductInput): Promise<Product> {
    return this.mutate(async (snapshot) => {
      const index = snapshot.products.findIndex((product) => product.id === id);
      if (index < 0) {
        throw new Error('Produto nao encontrado.');
      }

      const current = snapshot.products[index];
      const nextProduct: StoredProduct = {
        ...current,
        nome: input.nome,
        preco: input.preco,
        precoPromocional: input.precoPromocional,
        categoria: input.categoria,
        subcategoria: input.subcategoria || '',
        imagens: input.imagens,
        descricao: input.descricao || '',
        composicao: input.composicao || '',
        tamanhos: input.tamanhos || [],
        cores: input.cores || [],
        maisVendido: Boolean(input.maisVendido),
        lancamento: Boolean(input.lancamento),
        estoque: input.estoque,
        shippingWeightGrams: input.shippingWeightGrams ?? current.shippingWeightGrams ?? 500,
        updatedAt: new Date().toISOString(),
      };

      snapshot.products[index] = nextProduct;
      return toPublicProduct(nextProduct);
    });
  }

  async deleteProduct(id: string): Promise<void> {
    await this.mutate(async (snapshot) => {
      snapshot.products = snapshot.products.filter((product) => product.id !== id);
    });
  }

  async getCategories(): Promise<StoreCategory[]> {
    const snapshot = await this.readSnapshot();

    return sortCategories(
      snapshot.categories.map((category) => ({
        ...category,
        productCount: getProductCountByCategory(snapshot, category.nome),
      })),
    );
  }

  async createCategory(input: CategoryInput): Promise<StoreCategory> {
    return this.mutate(async (snapshot) => {
      const created: StoreCategory = {
        id: createId('category'),
        nome: input.nome,
        slug: input.slug,
        imagem: input.imagem || '',
        subcategories: input.subcategories,
        status: input.status,
        showInMenu: input.showInMenu,
        menuOrder: input.menuOrder,
        showOnHome: input.showOnHome,
        homeSectionTitle: input.homeSectionTitle || input.nome,
        homeSectionOrder: input.homeSectionOrder,
        homeSectionLimit: input.homeSectionLimit,
        homeSectionFilter: input.homeSectionFilter,
        productCount: 0,
      };

      snapshot.categories.push(created);
      return created;
    });
  }

  async updateCategory(id: string, input: CategoryInput): Promise<StoreCategory> {
    return this.mutate(async (snapshot) => {
      const index = snapshot.categories.findIndex((category) => category.id === id);
      if (index < 0) {
        throw new Error('Categoria nao encontrada.');
      }

      const current = snapshot.categories[index];
      const updated: StoreCategory = {
        ...current,
        nome: input.nome,
        slug: input.slug,
        imagem: input.imagem || '',
        subcategories: input.subcategories,
        status: input.status,
        showInMenu: input.showInMenu,
        menuOrder: input.menuOrder,
        showOnHome: input.showOnHome,
        homeSectionTitle: input.homeSectionTitle || input.nome,
        homeSectionOrder: input.homeSectionOrder,
        homeSectionLimit: input.homeSectionLimit,
        homeSectionFilter: input.homeSectionFilter,
        productCount: getProductCountByCategory(snapshot, input.nome),
      };

      snapshot.categories[index] = updated;
      return updated;
    });
  }

  async deleteCategory(id: string): Promise<void> {
    await this.mutate(async (snapshot) => {
      snapshot.categories = snapshot.categories.filter((category) => category.id !== id);
    });
  }

  async getBanners(options: ListOptions = {}): Promise<Banner[]> {
    const snapshot = await this.readSnapshot();
    const onlyActive = options.onlyActive !== false;
    return sortByPosition(
      snapshot.banners.filter((banner) => !onlyActive || banner.status === 'Ativo'),
    );
  }

  async createBanner(input: Pick<Banner, 'title' | 'desktop' | 'mobile' | 'link'>): Promise<Banner> {
    return this.mutate(async (snapshot) => {
      const created: Banner = {
        id: createId('banner'),
        title: input.title,
        desktop: input.desktop,
        mobile: input.mobile || input.desktop,
        image: input.desktop,
        link: input.link || '/catalog',
        status: 'Ativo',
        position: snapshot.banners.length + 1,
      };

      snapshot.banners.push(created);
      return created;
    });
  }

  async deleteBanner(id: string): Promise<void> {
    await this.mutate(async (snapshot) => {
      snapshot.banners = snapshot.banners.filter((banner) => banner.id !== id);
      snapshot.banners = snapshot.banners.map((banner, index) => ({ ...banner, position: index + 1 }));
    });
  }

  async updateBannerPositions(banners: Banner[]): Promise<void> {
    await this.mutate(async (snapshot) => {
      const nextPositions = new Map(banners.map((banner, index) => [banner.id, index + 1]));
      snapshot.banners = snapshot.banners
        .map((banner) => ({
          ...banner,
          position: nextPositions.get(banner.id) ?? banner.position,
        }))
        .sort((left, right) => left.position - right.position);
    });
  }

  async getHomeSections(options: ListOptions = {}): Promise<HomeSection[]> {
    const snapshot = await this.readSnapshot();
    const onlyActive = options.onlyActive !== false;
    return sortByPosition(
      snapshot.homeSections.filter((section) => !onlyActive || section.status === 'Ativo'),
    );
  }

  async updateHomeSection(id: string, input: HomeSectionInput): Promise<HomeSection> {
    return this.mutate(async (snapshot) => {
      const index = snapshot.homeSections.findIndex((section) => section.id === id);
      const updated: HomeSection = {
        id,
        title: input.title,
        sourceType: input.sourceType,
        categoryName: input.categoryName,
        limitCount: input.limitCount,
        link: input.link,
        position: input.position,
        status: input.status,
      };

      if (index < 0) {
        snapshot.homeSections.push(updated);
      } else {
        snapshot.homeSections[index] = updated;
      }

      snapshot.homeSections = sortByPosition(snapshot.homeSections);
      return updated;
    });
  }

  async getHomeCards(options: ListOptions = {}): Promise<HomeCard[]> {
    const snapshot = await this.readSnapshot();
    const onlyActive = options.onlyActive !== false;
    return sortByPosition(
      snapshot.homeCards.filter((card) => !onlyActive || card.status === 'Ativo'),
    );
  }

  async createHomeCard(input: HomeCardInput): Promise<HomeCard> {
    return this.mutate(async (snapshot) => {
      const created: HomeCard = {
        id: createId('home-card'),
        title: input.title,
        image: input.image,
        link: input.link,
        ctaLabel: input.ctaLabel || 'Confira',
        position: input.position,
        status: input.status,
      };

      snapshot.homeCards.push(created);
      snapshot.homeCards = sortByPosition(snapshot.homeCards);
      return created;
    });
  }

  async updateHomeCard(id: string, input: HomeCardInput): Promise<HomeCard> {
    return this.mutate(async (snapshot) => {
      const index = snapshot.homeCards.findIndex((card) => card.id === id);
      if (index < 0) {
        throw new Error('Card da home nao encontrado.');
      }

      const updated: HomeCard = {
        id,
        title: input.title,
        image: input.image,
        link: input.link,
        ctaLabel: input.ctaLabel || 'Confira',
        position: input.position,
        status: input.status,
      };

      snapshot.homeCards[index] = updated;
      snapshot.homeCards = sortByPosition(snapshot.homeCards);
      return updated;
    });
  }

  async deleteHomeCard(id: string): Promise<void> {
    await this.mutate(async (snapshot) => {
      snapshot.homeCards = snapshot.homeCards.filter((card) => card.id !== id);
    });
  }

  async getRaffles(options: ListOptions = {}): Promise<Raffle[]> {
    const snapshot = await this.readSnapshot();
    const onlyActive = options.onlyActive !== false;
    return sortByPosition(
      snapshot.raffles.filter((raffle) => !onlyActive || raffle.status === 'Ativo'),
    );
  }

  async createRaffle(input: RaffleInput): Promise<Raffle> {
    return this.mutate(async (snapshot) => {
      const created: Raffle = {
        id: createId('raffle'),
        title: input.title,
        prize: input.prize,
        description: input.description,
        image: input.image,
        productId: input.productId,
        pointsPerTicket: input.pointsPerTicket,
        drawDate: input.drawDate,
        ctaLabel: input.ctaLabel,
        ctaLink: input.ctaLink,
        totalParticipants: input.totalParticipants,
        totalTickets: input.totalTickets,
        status: input.status,
        position: input.position,
      };

      snapshot.raffles.push(created);
      snapshot.raffles = sortByPosition(snapshot.raffles);
      return created;
    });
  }

  async updateRaffle(id: string, input: RaffleInput): Promise<Raffle> {
    return this.mutate(async (snapshot) => {
      const index = snapshot.raffles.findIndex((raffle) => raffle.id === id);
      if (index < 0) {
        throw new Error('Sorteio nao encontrado.');
      }

      const updated: Raffle = {
        id,
        title: input.title,
        prize: input.prize,
        description: input.description,
        image: input.image,
        productId: input.productId,
        pointsPerTicket: input.pointsPerTicket,
        drawDate: input.drawDate,
        ctaLabel: input.ctaLabel,
        ctaLink: input.ctaLink,
        totalParticipants: input.totalParticipants,
        totalTickets: input.totalTickets,
        status: input.status,
        position: input.position,
      };

      snapshot.raffles[index] = updated;
      snapshot.raffles = sortByPosition(snapshot.raffles);
      return updated;
    });
  }

  async deleteRaffle(id: string): Promise<void> {
    await this.mutate(async (snapshot) => {
      snapshot.raffles = snapshot.raffles.filter((raffle) => raffle.id !== id);
    });
  }

  async getInstagramFeed(): Promise<InstagramPost[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.instagramFeed
      .filter((post) => post.status === 'Ativo')
      .sort((left, right) => left.position - right.position)
      .map(({ status: _status, ...post }) => post);
  }

  async getStoreSettings() {
    const snapshot = await this.readSnapshot();
    return normalizeStoreSettings(snapshot.settings);
  }

  async saveStoreSettings(settings: StoreSettings) {
    return this.mutate(async (snapshot) => {
      const normalized = normalizeStoreSettings(settings);
      snapshot.settings = normalized;
      return normalized;
    });
  }

  async ensureAdminUser(input: EnsureAdminUserInput): Promise<AdminUserProfile> {
    return this.mutate(async (snapshot) => {
      ensureAdminCollections(snapshot);
      const normalizedEmail = input.email.trim().toLowerCase();
      const timestamp = new Date().toISOString();
      const existing = snapshot.adminUsers?.find((item) => item.email.trim().toLowerCase() === normalizedEmail) || null;

      if (existing) {
        existing.fullName = input.fullName.trim();
        existing.role = input.role;
        existing.status = 'active';
        existing.updatedAt = timestamp;
        return toPublicAdminUser(existing);
      }

      const created: StoredAdminUserProfile = {
        id: createId('admin-user'),
        email: normalizedEmail,
        passwordHash: input.passwordHash,
        fullName: input.fullName.trim(),
        role: input.role,
        status: 'active',
        mfaEnabled: false,
        mfaSecretEncrypted: '',
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      snapshot.adminUsers?.unshift(created);
      return toPublicAdminUser(created);
    });
  }

  async findAdminAuthByEmail(email: string): Promise<AdminAuthLookup | null> {
    const snapshot = await this.readSnapshot();
    ensureAdminCollections(snapshot);
    const normalizedEmail = email.trim().toLowerCase();
    const adminUser = snapshot.adminUsers?.find((item) => item.email.trim().toLowerCase() === normalizedEmail) || null;

    if (!adminUser) {
      return null;
    }

    return {
      email: adminUser.email,
      failedLoginAttempts: adminUser.failedLoginAttempts,
      id: adminUser.id,
      lockedUntil: adminUser.lockedUntil,
      mfaEnabled: adminUser.mfaEnabled,
      mfaSecretEncrypted: adminUser.mfaSecretEncrypted,
      passwordHash: adminUser.passwordHash,
      role: adminUser.role,
      status: adminUser.status,
    };
  }

  async getAdminUserById(adminUserId: string): Promise<AdminUserProfile | null> {
    const snapshot = await this.readSnapshot();
    ensureAdminCollections(snapshot);
    const adminUser = snapshot.adminUsers?.find((item) => item.id === adminUserId) || null;
    return adminUser ? toPublicAdminUser(adminUser) : null;
  }

  async createAdminSession(input: CreateAdminSessionInput): Promise<AdminSessionLookup> {
    return this.mutate(async (snapshot) => {
      ensureAdminCollections(snapshot);
      const timestamp = new Date().toISOString();
      const created = {
        id: createId('admin-session'),
        adminUserId: input.adminUserId,
        sessionTokenHash: input.sessionTokenHash,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        lastSeenAt: timestamp,
        expiresAt: input.expiresAt,
        revokedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      snapshot.adminSessions?.unshift(created);
      const adminUser = snapshot.adminUsers?.find((item) => item.id === input.adminUserId);
      if (adminUser) {
        adminUser.lastLoginAt = timestamp;
        adminUser.failedLoginAttempts = 0;
        adminUser.lockedUntil = null;
        adminUser.updatedAt = timestamp;
      }

      return {
        adminUserId: created.adminUserId,
        expiresAt: created.expiresAt,
        id: created.id,
        revokedAt: created.revokedAt,
      };
    });
  }

  async getAdminSessionByTokenHash(tokenHash: string): Promise<AdminSessionLookup | null> {
    const snapshot = await this.readSnapshot();
    ensureAdminCollections(snapshot);
    const session = snapshot.adminSessions?.find((item) => item.sessionTokenHash === tokenHash) || null;

    if (!session) {
      return null;
    }

    return {
      adminUserId: session.adminUserId,
      expiresAt: session.expiresAt,
      id: session.id,
      revokedAt: session.revokedAt,
    };
  }

  async touchAdminSession(sessionId: string, ipAddress: string, userAgent: string, expiresAt: string): Promise<void> {
    await this.mutate(async (snapshot) => {
      ensureAdminCollections(snapshot);
      const session = snapshot.adminSessions?.find((item) => item.id === sessionId);
      if (!session) return;

      const timestamp = new Date().toISOString();
      session.ipAddress = ipAddress;
      session.userAgent = userAgent;
      session.lastSeenAt = timestamp;
      session.expiresAt = expiresAt;
      session.updatedAt = timestamp;
    });
  }

  async revokeAdminSession(sessionId: string): Promise<void> {
    await this.mutate(async (snapshot) => {
      ensureAdminCollections(snapshot);
      const session = snapshot.adminSessions?.find((item) => item.id === sessionId);
      if (!session || session.revokedAt) return;

      const timestamp = new Date().toISOString();
      session.revokedAt = timestamp;
      session.updatedAt = timestamp;
    });
  }

  async revokeAdminSessionsByUserId(adminUserId: string): Promise<void> {
    await this.mutate(async (snapshot) => {
      ensureAdminCollections(snapshot);
      const timestamp = new Date().toISOString();
      snapshot.adminSessions?.forEach((session) => {
        if (session.adminUserId === adminUserId && !session.revokedAt) {
          session.revokedAt = timestamp;
          session.updatedAt = timestamp;
        }
      });
    });
  }

  async getAdminSessionPayload(adminUserId: string): Promise<AdminSessionPayload | null> {
    const snapshot = await this.readSnapshot();
    ensureAdminCollections(snapshot);
    const adminUser = snapshot.adminUsers?.find((item) => item.id === adminUserId) || null;
    return adminUser ? buildAdminSessionPayload(adminUser) : null;
  }

  async saveAdminMfaSecret(adminUserId: string, secretEncrypted: string, enabled: boolean): Promise<AdminUserProfile> {
    return this.mutate(async (snapshot) => {
      ensureAdminCollections(snapshot);
      const adminUser = snapshot.adminUsers?.find((item) => item.id === adminUserId) || null;
      if (!adminUser) {
        throw new Error('Administrador nao encontrado.');
      }

      adminUser.mfaSecretEncrypted = secretEncrypted;
      adminUser.mfaEnabled = enabled;
      adminUser.updatedAt = new Date().toISOString();
      return toPublicAdminUser(adminUser);
    });
  }

  async createAdminPasswordResetToken(input: CreateAdminPasswordResetTokenInput): Promise<AdminPasswordResetTokenRecord> {
    return this.mutate(async (snapshot) => {
      ensureAdminCollections(snapshot);
      const adminUser = snapshot.adminUsers?.find((item) => item.id === input.adminUserId) || null;
      if (!adminUser) {
        throw new Error('Administrador nao encontrado.');
      }

      const timestamp = new Date().toISOString();
      const created = {
        id: createId('admin-reset'),
        adminUserId: input.adminUserId,
        tokenHash: input.tokenHash,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        expiresAt: input.expiresAt,
        usedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      snapshot.adminPasswordResets?.unshift(created);
      return {
        adminUserId: created.adminUserId,
        email: adminUser.email,
        expiresAt: created.expiresAt,
        id: created.id,
        usedAt: created.usedAt,
      };
    });
  }

  async getAdminPasswordResetByTokenHash(tokenHash: string): Promise<AdminPasswordResetTokenRecord | null> {
    const snapshot = await this.readSnapshot();
    ensureAdminCollections(snapshot);
    const reset = snapshot.adminPasswordResets?.find((item) => item.tokenHash === tokenHash) || null;

    if (!reset) {
      return null;
    }

    const adminUser = snapshot.adminUsers?.find((item) => item.id === reset.adminUserId) || null;
    return {
      adminUserId: reset.adminUserId,
      email: adminUser?.email || '',
      expiresAt: reset.expiresAt,
      id: reset.id,
      usedAt: reset.usedAt,
    };
  }

  async markAdminPasswordResetTokenUsed(id: string): Promise<void> {
    await this.mutate(async (snapshot) => {
      ensureAdminCollections(snapshot);
      const reset = snapshot.adminPasswordResets?.find((item) => item.id === id);
      if (!reset) return;
      reset.usedAt = reset.usedAt || new Date().toISOString();
      reset.updatedAt = new Date().toISOString();
    });
  }

  async recordAdminLoginFailure(adminUserId: string, failedAttempts: number, lockedUntil: string | null): Promise<void> {
    await this.mutate(async (snapshot) => {
      ensureAdminCollections(snapshot);
      const adminUser = snapshot.adminUsers?.find((item) => item.id === adminUserId);
      if (!adminUser) return;
      adminUser.failedLoginAttempts = failedAttempts;
      adminUser.lockedUntil = lockedUntil;
      adminUser.updatedAt = new Date().toISOString();
    });
  }

  async updateAdminPassword(adminUserId: string, passwordHash: string): Promise<void> {
    await this.mutate(async (snapshot) => {
      ensureAdminCollections(snapshot);
      const adminUser = snapshot.adminUsers?.find((item) => item.id === adminUserId) || null;
      if (!adminUser) {
        throw new Error('Administrador nao encontrado.');
      }

      adminUser.passwordHash = passwordHash;
      adminUser.failedLoginAttempts = 0;
      adminUser.lockedUntil = null;
      adminUser.updatedAt = new Date().toISOString();
    });
  }

  async createAuditLog(input: AuditLogInput): Promise<void> {
    await this.mutate(async (snapshot) => {
      ensureAdminCollections(snapshot);
      snapshot.auditLogs?.unshift({
        id: createId('audit'),
        actorType: input.actorType || 'system',
        actorId: input.actorId || '',
        actorEmail: input.actorEmail || '',
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        ipAddress: input.ipAddress || '',
        userAgent: input.userAgent || '',
        diffJson: input.diffJson || null,
        createdAt: new Date().toISOString(),
      });
    });
  }

  async getAdminAuditLogs(limit = 100): Promise<AuditLogRecord[]> {
    const snapshot = await this.readSnapshot();
    ensureAdminCollections(snapshot);

    return [...(snapshot.auditLogs || [])]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, Math.max(1, Math.min(limit, 200)));
  }

  async getStripeCredentialSummary(mode: StripeMode) {
    const snapshot = await this.readSnapshot();
    const credentials = ensureStripeCredentials(snapshot);
    return buildStripeCredentialSummary(mode, credentials[mode]);
  }

  async listStripeCredentialSummaries() {
    const snapshot = await this.readSnapshot();
    const credentials = ensureStripeCredentials(snapshot);

    return {
      test: buildStripeCredentialSummary('test', credentials.test),
      live: buildStripeCredentialSummary('live', credentials.live),
    };
  }

  async getStripeCredentials(mode: StripeMode) {
    const snapshot = await this.readSnapshot();
    const credentials = ensureStripeCredentials(snapshot);
    return decodeStoredStripeCredentials(mode, credentials[mode]);
  }

  async saveStripeCredentials(input: StripeCredentialInput) {
    return this.mutate(async (snapshot) => {
      const credentials = ensureStripeCredentials(snapshot);
      credentials[input.mode] = applyStripeCredentialInput(credentials[input.mode], input);
      return buildStripeCredentialSummary(input.mode, credentials[input.mode]);
    });
  }

  private ensureNewsletterBenefitForCustomer(snapshot: StoreSnapshot, customerId: string) {
    ensureCustomerCollections(snapshot);

    const customer = snapshot.customers?.find((item) => item.id === customerId) || null;
    if (!customer) {
      return null;
    }

    const existingBenefit = customer.welcomeBenefits.find((benefit) => benefit.type === 'newsletter-welcome') || null;
    if (existingBenefit) {
      customer.newsletterSubscribed = true;
      return existingBenefit;
    }

    const subscriber = snapshot.newsletterSubscribers.find(
      (item) => normalizeNewsletterEmail(item.email) === normalizeNewsletterEmail(customer.email) && item.status === 'Ativo',
    ) || null;

    if (!subscriber) {
      return null;
    }

    const benefit = createWelcomeBenefitFromSubscriber(customer.email, subscriber);
    customer.newsletterSubscribed = true;
    customer.updatedAt = new Date().toISOString();
    customer.welcomeBenefits = [benefit, ...customer.welcomeBenefits];
    return benefit;
  }

  async findCustomerAuthByEmail(email: string): Promise<CustomerAuthLookup | null> {
    const snapshot = await this.readSnapshot();
    ensureCustomerCollections(snapshot);

    const customer = snapshot.customers?.find(
      (item) => normalizeNewsletterEmail(item.email) === normalizeNewsletterEmail(email),
    ) || null;

    if (!customer) {
      return null;
    }

    return {
      email: customer.email,
      id: customer.id,
      passwordHash: customer.passwordHash,
      status: customer.status,
    };
  }

  async createCustomerAccount(input: CustomerRegistrationInput): Promise<CustomerSessionPayload> {
    return this.mutate(async (snapshot) => {
      ensureCustomerCollections(snapshot);

      const normalizedEmail = normalizeNewsletterEmail(input.email);
      const emailAlreadyExists = snapshot.customers?.some((customer) => normalizeNewsletterEmail(customer.email) === normalizedEmail);

      if (emailAlreadyExists) {
        throw new Error('An account with this email already exists.');
      }

      const subscriber = snapshot.newsletterSubscribers.find(
        (item) => normalizeNewsletterEmail(item.email) === normalizedEmail && item.status === 'Ativo',
      ) || null;
      const linkedBenefit = subscriber ? createWelcomeBenefitFromSubscriber(normalizedEmail, subscriber) : null;
      const createdCustomer = createStoredCustomer({ ...input, email: normalizedEmail }, linkedBenefit);

      snapshot.customers?.unshift(createdCustomer);
      return buildCustomerSessionPayload(createdCustomer);
    });
  }

  async createCustomerSession(input: CreateCustomerSessionInput): Promise<CustomerSessionLookup> {
    return this.mutate(async (snapshot) => {
      ensureCustomerCollections(snapshot);
      const timestamp = new Date().toISOString();

      const created: StoredCustomerSession = {
        id: createId('customer-session'),
        customerId: input.customerId,
        createdAt: timestamp,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        lastSeenAt: timestamp,
        revokedAt: null,
        sessionTokenHash: input.sessionTokenHash,
        updatedAt: timestamp,
        userAgent: input.userAgent,
      };

      snapshot.customerSessions?.unshift(created);

      const customer = snapshot.customers?.find((item) => item.id === input.customerId);
      if (customer) {
        customer.updatedAt = timestamp;
      }

      return {
        customerId: created.customerId,
        expiresAt: created.expiresAt,
        id: created.id,
        revokedAt: created.revokedAt,
      };
    });
  }

  async getCustomerSessionByTokenHash(tokenHash: string): Promise<CustomerSessionLookup | null> {
    const snapshot = await this.readSnapshot();
    ensureCustomerCollections(snapshot);

    const session = snapshot.customerSessions?.find((item) => item.sessionTokenHash === tokenHash) || null;
    if (!session) {
      return null;
    }

    return {
      customerId: session.customerId,
      expiresAt: session.expiresAt,
      id: session.id,
      revokedAt: session.revokedAt,
    };
  }

  async touchCustomerSession(sessionId: string, ipAddress: string, userAgent: string): Promise<void> {
    await this.mutate(async (snapshot) => {
      ensureCustomerCollections(snapshot);
      const session = snapshot.customerSessions?.find((item) => item.id === sessionId);
      if (!session) {
        return;
      }

      const timestamp = new Date().toISOString();
      session.ipAddress = ipAddress;
      session.lastSeenAt = timestamp;
      session.updatedAt = timestamp;
      session.userAgent = userAgent;
    });
  }

  async revokeCustomerSession(sessionId: string): Promise<void> {
    await this.mutate(async (snapshot) => {
      ensureCustomerCollections(snapshot);
      const session = snapshot.customerSessions?.find((item) => item.id === sessionId);
      if (!session || session.revokedAt) {
        return;
      }

      const timestamp = new Date().toISOString();
      session.revokedAt = timestamp;
      session.updatedAt = timestamp;
    });
  }

  async getCustomerSessionPayload(customerId: string): Promise<CustomerSessionPayload | null> {
    return this.mutate(async (snapshot) => {
      ensureCustomerCollections(snapshot);
      this.ensureNewsletterBenefitForCustomer(snapshot, customerId);
      const customer = snapshot.customers?.find((item) => item.id === customerId) || null;
      return customer ? buildCustomerSessionPayload(customer) : null;
    });
  }

  async updateCustomerProfile(customerId: string, input: CustomerProfileUpdateInput): Promise<CustomerProfileUpdateResult> {
    return this.mutate(async (snapshot) => {
      ensureCustomerCollections(snapshot);
      const customer = snapshot.customers?.find((item) => item.id === customerId) || null;

      if (!customer) {
        throw new Error('Customer account not found.');
      }

      customer.fullName = input.fullName?.trim() || customer.fullName;
      customer.phone = input.phone?.trim() || customer.phone;
      customer.phoneCountry = input.phoneCountry || customer.phoneCountry;
      customer.birthDate = input.birthDate?.trim() || customer.birthDate;
      customer.gender = input.gender?.trim() || customer.gender;
      customer.taxId = input.taxId?.trim() || customer.taxId;
      customer.corporateName = input.corporateName?.trim() || customer.corporateName;
      customer.stateRegistration = input.stateRegistration?.trim() || customer.stateRegistration;
      customer.allowMarketing = input.allowMarketing ?? customer.allowMarketing;
      customer.taxDocumentType = getTaxDocumentType(customer);
      customer.updatedAt = new Date().toISOString();

      return buildCustomerSessionPayload(customer);
    });
  }

  async saveCustomerAddress(customerId: string, input: CustomerAddressInput): Promise<CustomerAddressMutationResult> {
    return this.mutate(async (snapshot) => {
      ensureCustomerCollections(snapshot);
      const customer = snapshot.customers?.find((item) => item.id === customerId) || null;

      if (!customer) {
        throw new Error('Customer account not found.');
      }

      const nextAddress: StoreCustomerAddress = {
        id: input.id || createId('address'),
        label: input.label.trim(),
        country: input.country,
        postalCode: input.postalCode.trim(),
        street: input.street.trim(),
        number: input.number.trim(),
        complement: input.complement.trim(),
        neighborhood: input.neighborhood.trim(),
        city: input.city.trim(),
        region: input.region.trim(),
        isPrimary: input.isPrimary ?? customer.addresses.length === 0,
      };

      const existingIndex = customer.addresses.findIndex((address) => address.id === nextAddress.id);

      if (existingIndex >= 0) {
        customer.addresses[existingIndex] = nextAddress;
      } else {
        customer.addresses.push(nextAddress);
      }

      customer.addresses = ensureSinglePrimaryAddress(
        nextAddress.isPrimary
          ? customer.addresses.map((address) => ({ ...address, isPrimary: address.id === nextAddress.id }))
          : customer.addresses,
      );
      customer.updatedAt = new Date().toISOString();

      return buildCustomerSessionPayload(customer);
    });
  }

  async deleteCustomerAddress(customerId: string, addressId: string): Promise<CustomerAddressMutationResult> {
    return this.mutate(async (snapshot) => {
      ensureCustomerCollections(snapshot);
      const customer = snapshot.customers?.find((item) => item.id === customerId) || null;

      if (!customer) {
        throw new Error('Customer account not found.');
      }

      customer.addresses = ensureSinglePrimaryAddress(customer.addresses.filter((address) => address.id !== addressId));
      customer.updatedAt = new Date().toISOString();

      return buildCustomerSessionPayload(customer);
    });
  }

  async activateNewsletterBenefitForCustomer(customerId: string): Promise<CustomerBenefitMutationResult> {
    return this.mutate(async (snapshot) => {
      ensureCustomerCollections(snapshot);
      const customer = snapshot.customers?.find((item) => item.id === customerId) || null;

      if (!customer) {
        throw new Error('Customer account not found.');
      }

      this.ensureNewsletterBenefitForCustomer(snapshot, customerId);
      return buildCustomerSessionPayload(customer);
    });
  }

  async consumeCustomerBenefit(customerId: string, benefitId: string, orderNumber: string): Promise<CustomerBenefitMutationResult> {
    return this.mutate(async (snapshot) => {
      ensureCustomerCollections(snapshot);
      const customer = snapshot.customers?.find((item) => item.id === customerId) || null;

      if (!customer) {
        throw new Error('Customer account not found.');
      }

      const timestamp = new Date().toISOString();
      customer.welcomeBenefits = customer.welcomeBenefits.map((benefit) =>
        benefit.id === benefitId && benefit.status === 'available'
          ? {
              ...benefit,
              status: 'used',
              usedAt: timestamp,
              usedOrderNumber: orderNumber,
            }
          : benefit,
      );
      customer.updatedAt = timestamp;

      return buildCustomerSessionPayload(customer);
    });
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    const snapshot = await this.readSnapshot();
    return [...snapshot.contactMessages].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    const snapshot = await this.readSnapshot();
    return [...snapshot.newsletterSubscribers].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async createContactMessage(input: ContactMessageInput): Promise<ContactMessage> {
    return this.mutate(async (snapshot) => {
      const timestamp = new Date().toISOString();
      const created: ContactMessage = {
        id: createId('contact'),
        name: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim() || '',
        orderNumber: input.orderNumber?.trim() || '',
        message: input.message.trim(),
        status: 'Novo',
        source: 'site-contact',
        adminNotes: '',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      snapshot.contactMessages.unshift(created);
      return created;
    });
  }

  async updateContactMessage(id: string, input: ContactMessageUpdateInput): Promise<ContactMessage> {
    return this.mutate(async (snapshot) => {
      const index = snapshot.contactMessages.findIndex((message) => message.id === id);
      if (index < 0) {
        throw new Error('Mensagem nao encontrada.');
      }

      const current = snapshot.contactMessages[index];
      const updated: ContactMessage = {
        ...current,
        status: input.status ?? current.status,
        adminNotes: input.adminNotes ?? current.adminNotes,
        repliedAt: input.repliedAt ?? current.repliedAt,
        updatedAt: new Date().toISOString(),
      };

      snapshot.contactMessages[index] = updated;
      return updated;
    });
  }

  async createNewsletterSubscriber(input: NewsletterSubscriberInput): Promise<NewsletterSubscriber> {
    return this.mutate(async (snapshot) => {
      const normalizedEmail = normalizeNewsletterEmail(input.email);

      if (!isValidNewsletterEmail(normalizedEmail)) {
        throw new Error('Informe um e-mail valido para receber o cupom.');
      }

      const timestamp = new Date().toISOString();
      const existingIndex = snapshot.newsletterSubscribers.findIndex(
        (subscriber) => normalizeNewsletterEmail(subscriber.email) === normalizedEmail,
      );

      if (existingIndex >= 0) {
        const current = snapshot.newsletterSubscribers[existingIndex];
        const updated: NewsletterSubscriber = {
          ...current,
          status: 'Ativo',
          source: input.source?.trim() || NEWSLETTER_DEFAULT_SOURCE,
          couponCode: WELCOME_NEWSLETTER_COUPON_CODE,
          updatedAt: timestamp,
        };
        snapshot.newsletterSubscribers[existingIndex] = updated;
        return updated;
      }

      const created: NewsletterSubscriber = {
        id: createNewsletterSubscriberId(normalizedEmail),
        email: normalizedEmail,
        status: 'Ativo',
        source: input.source?.trim() || NEWSLETTER_DEFAULT_SOURCE,
        couponCode: WELCOME_NEWSLETTER_COUPON_CODE,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      snapshot.newsletterSubscribers.unshift(created);
      return created;
    });
  }
}
