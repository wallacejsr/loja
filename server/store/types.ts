import type { Product } from '../../src/data/mockData.ts';
import type { StoreSettings, StripeMode } from '../../src/types/settings.ts';
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

export interface StoreSnapshot {
  banners: Banner[];
  categories: StoreCategory[];
  contactMessages: ContactMessage[];
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

export interface StoreRepository {
  createBanner(input: Pick<Banner, 'title' | 'desktop' | 'mobile' | 'link'>): Promise<Banner>;
  createCategory(input: CategoryInput): Promise<StoreCategory>;
  createContactMessage(input: ContactMessageInput): Promise<ContactMessage>;
  createNewsletterSubscriber(input: NewsletterSubscriberInput): Promise<NewsletterSubscriber>;
  createHomeCard(input: HomeCardInput): Promise<HomeCard>;
  createProduct(input: ProductInput): Promise<Product>;
  createRaffle(input: RaffleInput): Promise<Raffle>;
  deleteBanner(id: string): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  deleteHomeCard(id: string): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  deleteRaffle(id: string): Promise<void>;
  getBanners(options?: ListOptions): Promise<Banner[]>;
  getCategories(): Promise<StoreCategory[]>;
  getContactMessages(): Promise<ContactMessage[]>;
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
  saveStoreSettings(settings: StoreSettings): Promise<StoreSettings>;
  saveStripeCredentials(input: StripeCredentialInput): Promise<StripeCredentialSummary>;
  updateBannerPositions(banners: Banner[]): Promise<void>;
  updateCategory(id: string, input: CategoryInput): Promise<StoreCategory>;
  updateContactMessage(id: string, input: ContactMessageUpdateInput): Promise<ContactMessage>;
  updateHomeCard(id: string, input: HomeCardInput): Promise<HomeCard>;
  updateHomeSection(id: string, input: HomeSectionInput): Promise<HomeSection>;
  updateProduct(id: string, input: ProductInput): Promise<Product>;
  updateRaffle(id: string, input: RaffleInput): Promise<Raffle>;
}
