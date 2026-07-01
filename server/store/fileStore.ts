import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Product } from '../../src/data/mockData.ts';
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
  decodeStoredStripeCredentials,
} from '../integrations/stripeCredentials';
import { cloneStoreSnapshot, createDefaultStoreSnapshot, createId } from './defaultData';
import type {
  ListOptions,
  StoreRepository,
  StoreSnapshot,
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
