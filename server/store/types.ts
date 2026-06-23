import type { Product } from '../../src/data/mockData';
import type { StoreSettings } from '../../src/types/settings';
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
  ProductInput,
  Raffle,
  RaffleInput,
  StoreCategory,
} from '../../src/lib/storeApiSupabase';

export type StoredStatus = 'Ativo' | 'Inativo';

export type StoredProduct = Product & {
  createdAt: string;
  status: StoredStatus;
  updatedAt: string;
};

export type StoredInstagramPost = InstagramPost & {
  status: StoredStatus;
};

export interface StoreSnapshot {
  banners: Banner[];
  categories: StoreCategory[];
  contactMessages: ContactMessage[];
  homeCards: HomeCard[];
  homeSections: HomeSection[];
  instagramFeed: StoredInstagramPost[];
  products: StoredProduct[];
  raffles: Raffle[];
  settings: StoreSettings;
}

export type ListOptions = {
  onlyActive?: boolean;
};

export interface StoreRepository {
  createBanner(input: Pick<Banner, 'title' | 'desktop' | 'mobile' | 'link'>): Promise<Banner>;
  createCategory(input: CategoryInput): Promise<StoreCategory>;
  createContactMessage(input: ContactMessageInput): Promise<ContactMessage>;
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
  getProducts(options?: ListOptions): Promise<Product[]>;
  getRaffles(options?: ListOptions): Promise<Raffle[]>;
  getStoreSettings(): Promise<StoreSettings>;
  saveStoreSettings(settings: StoreSettings): Promise<StoreSettings>;
  updateBannerPositions(banners: Banner[]): Promise<void>;
  updateCategory(id: string, input: CategoryInput): Promise<StoreCategory>;
  updateContactMessage(id: string, input: ContactMessageUpdateInput): Promise<ContactMessage>;
  updateHomeCard(id: string, input: HomeCardInput): Promise<HomeCard>;
  updateHomeSection(id: string, input: HomeSectionInput): Promise<HomeSection>;
  updateProduct(id: string, input: ProductInput): Promise<Product>;
  updateRaffle(id: string, input: RaffleInput): Promise<Raffle>;
}
