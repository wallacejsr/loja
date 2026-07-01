import type { Product } from '../data/mockData';
import type { StoreSettings } from '../types/settings';
import { getConfiguredStoreBackend, type StoreBackend } from './storeBackend';
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
  HomeSectionSource,
  InstagramPost,
  NewsletterSubscriber,
  NewsletterSubscriberInput,
  ProductInput,
  Raffle,
  RaffleInput,
  StoreCategory,
} from './storeApiSupabase';

export type {
  Banner,
  CategoryInput,
  ContactMessage,
  ContactMessageInput,
  ContactMessageStatus,
  ContactMessageUpdateInput,
  HomeCard,
  HomeCardInput,
  HomeSection,
  HomeSectionInput,
  HomeSectionSource,
  InstagramPost,
  NewsletterSubscriber,
  NewsletterSubscriberInput,
  ProductInput,
  Raffle,
  RaffleInput,
  StoreCategory,
} from './storeApiSupabase';

type StoreApiModule = {
  createBanner: (input: Pick<Banner, 'title' | 'desktop' | 'mobile' | 'link'>) => Promise<Banner>;
  createCategory: (input: CategoryInput) => Promise<StoreCategory>;
  createContactMessage: (input: ContactMessageInput) => Promise<ContactMessage>;
  createNewsletterSubscriber: (input: NewsletterSubscriberInput) => Promise<NewsletterSubscriber>;
  createHomeCard: (input: HomeCardInput) => Promise<HomeCard>;
  createProduct: (input: ProductInput) => Promise<Product>;
  createRaffle: (input: RaffleInput) => Promise<Raffle>;
  deleteBanner: (id: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  deleteHomeCard: (id: string) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  deleteRaffle: (id: string) => Promise<void>;
  getBanners: (options?: { onlyActive?: boolean }) => Promise<Banner[]>;
  getCategories: () => Promise<StoreCategory[]>;
  getContactMessages: () => Promise<ContactMessage[]>;
  getHomeCards: (options?: { onlyActive?: boolean }) => Promise<HomeCard[]>;
  getHomeSections: (options?: { onlyActive?: boolean }) => Promise<HomeSection[]>;
  getInstagramFeed: () => Promise<InstagramPost[]>;
  getNewsletterSubscribers: () => Promise<NewsletterSubscriber[]>;
  getProducts: () => Promise<Product[]>;
  getRaffles: (options?: { onlyActive?: boolean }) => Promise<Raffle[]>;
  getStoreSettings: () => Promise<StoreSettings>;
  saveStoreSettings: (settings: StoreSettings) => Promise<StoreSettings>;
  updateBannerPositions: (banners: Banner[]) => Promise<void>;
  updateCategory: (id: string, input: CategoryInput) => Promise<StoreCategory>;
  updateContactMessage: (id: string, input: ContactMessageUpdateInput) => Promise<ContactMessage>;
  updateHomeCard: (id: string, input: HomeCardInput) => Promise<HomeCard>;
  updateHomeSection: (id: string, input: HomeSectionInput) => Promise<HomeSection>;
  updateProduct: (id: string, input: ProductInput) => Promise<Product>;
  updateRaffle: (id: string, input: RaffleInput) => Promise<Raffle>;
  uploadProductImage: (file: File) => Promise<string>;
};

let activeBackendName: StoreBackend | null = null;
let activeModulePromise: Promise<StoreApiModule> | null = null;

async function loadStoreApiModule(backend: StoreBackend): Promise<StoreApiModule> {
  switch (backend) {
    case 'rest':
      return import('./storeApiRest') as Promise<StoreApiModule>;
    case 'supabase':
    case 'local':
    default:
      return import('./storeApiSupabase') as Promise<StoreApiModule>;
  }
}

async function getStoreApiModule() {
  const backend = getConfiguredStoreBackend();

  if (!activeModulePromise || activeBackendName !== backend) {
    activeBackendName = backend;
    activeModulePromise = loadStoreApiModule(backend);
  }

  return activeModulePromise;
}

export function getStoreBackend() {
  return getConfiguredStoreBackend();
}

export async function getProducts() {
  return (await getStoreApiModule()).getProducts();
}

export async function uploadProductImage(file: File) {
  return (await getStoreApiModule()).uploadProductImage(file);
}

export async function createProduct(input: ProductInput) {
  return (await getStoreApiModule()).createProduct(input);
}

export async function updateProduct(id: string, input: ProductInput) {
  return (await getStoreApiModule()).updateProduct(id, input);
}

export async function deleteProduct(id: string) {
  return (await getStoreApiModule()).deleteProduct(id);
}

export async function getCategories() {
  return (await getStoreApiModule()).getCategories();
}

export async function createCategory(input: CategoryInput) {
  return (await getStoreApiModule()).createCategory(input);
}

export async function updateCategory(id: string, input: CategoryInput) {
  return (await getStoreApiModule()).updateCategory(id, input);
}

export async function deleteCategory(id: string) {
  return (await getStoreApiModule()).deleteCategory(id);
}

export async function getBanners(options?: { onlyActive?: boolean }) {
  return (await getStoreApiModule()).getBanners(options);
}

export async function getHomeSections(options?: { onlyActive?: boolean }) {
  return (await getStoreApiModule()).getHomeSections(options);
}

export async function getHomeCards(options?: { onlyActive?: boolean }) {
  return (await getStoreApiModule()).getHomeCards(options);
}

export async function createHomeCard(input: HomeCardInput) {
  return (await getStoreApiModule()).createHomeCard(input);
}

export async function updateHomeCard(id: string, input: HomeCardInput) {
  return (await getStoreApiModule()).updateHomeCard(id, input);
}

export async function deleteHomeCard(id: string) {
  return (await getStoreApiModule()).deleteHomeCard(id);
}

export async function getRaffles(options?: { onlyActive?: boolean }) {
  return (await getStoreApiModule()).getRaffles(options);
}

export async function createRaffle(input: RaffleInput) {
  return (await getStoreApiModule()).createRaffle(input);
}

export async function updateRaffle(id: string, input: RaffleInput) {
  return (await getStoreApiModule()).updateRaffle(id, input);
}

export async function deleteRaffle(id: string) {
  return (await getStoreApiModule()).deleteRaffle(id);
}

export async function updateHomeSection(id: string, input: HomeSectionInput) {
  return (await getStoreApiModule()).updateHomeSection(id, input);
}

export async function createBanner(input: Pick<Banner, 'title' | 'desktop' | 'mobile' | 'link'>) {
  return (await getStoreApiModule()).createBanner(input);
}

export async function deleteBanner(id: string) {
  return (await getStoreApiModule()).deleteBanner(id);
}

export async function updateBannerPositions(banners: Banner[]) {
  return (await getStoreApiModule()).updateBannerPositions(banners);
}

export async function getInstagramFeed() {
  return (await getStoreApiModule()).getInstagramFeed();
}

export async function getStoreSettings() {
  return (await getStoreApiModule()).getStoreSettings();
}

export async function saveStoreSettings(settings: StoreSettings) {
  return (await getStoreApiModule()).saveStoreSettings(settings);
}

export async function getContactMessages() {
  return (await getStoreApiModule()).getContactMessages();
}

export async function getNewsletterSubscribers() {
  return (await getStoreApiModule()).getNewsletterSubscribers();
}

export async function createContactMessage(input: ContactMessageInput) {
  return (await getStoreApiModule()).createContactMessage(input);
}

export async function createNewsletterSubscriber(input: NewsletterSubscriberInput) {
  return (await getStoreApiModule()).createNewsletterSubscriber(input);
}

export async function updateContactMessage(id: string, input: ContactMessageUpdateInput) {
  return (await getStoreApiModule()).updateContactMessage(id, input);
}
