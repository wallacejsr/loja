import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Product } from '../data/mockData';
import {
  Banner,
  CategoryInput,
  createBanner,
  createCategory,
  createHomeCard,
  createProduct,
  createRaffle,
  deleteBanner,
  deleteCategory,
  deleteHomeCard,
  deleteProduct,
  deleteRaffle,
  getBanners,
  getCategories,
  getHomeCards,
  getHomeSections,
  getInstagramFeed,
  getProducts,
  getRaffles,
  HomeCard,
  HomeCardInput,
  HomeSection,
  HomeSectionInput,
  InstagramPost,
  ProductInput,
  Raffle,
  RaffleInput,
  StoreCategory,
  updateBannerPositions,
  updateCategory,
  updateHomeCard,
  updateHomeSection,
  updateProduct,
  updateRaffle,
} from '../lib/storeApi';

export type StoreDomain =
  | 'products'
  | 'categories'
  | 'banners'
  | 'homeSections'
  | 'homeCards'
  | 'raffles'
  | 'instagramFeed';

type BannerInput = Pick<Banner, 'title' | 'desktop' | 'mobile' | 'link'>;

interface StoreDataMap {
  products: Product[];
  categories: StoreCategory[];
  banners: Banner[];
  homeSections: HomeSection[];
  homeCards: HomeCard[];
  raffles: Raffle[];
  instagramFeed: InstagramPost[];
}

interface StoreDataSnapshot extends StoreDataMap {
  cachedAt: string;
}

type DomainLoadingState = Record<StoreDomain, boolean>;
type DomainErrorState = Record<StoreDomain, string | null>;

interface StoreStatusContextValue {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
  domainLoading: DomainLoadingState;
  domainErrors: DomainErrorState;
  refresh: () => Promise<void>;
  refreshDomain: (domain: StoreDomain | StoreDomain[]) => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshBanners: () => Promise<void>;
  refreshHomeSections: () => Promise<void>;
  refreshHomeCards: () => Promise<void>;
  refreshRaffles: () => Promise<void>;
  refreshInstagramFeed: () => Promise<void>;
  isRefreshing: (domain?: StoreDomain) => boolean;
  getDomainError: (domain: StoreDomain) => string | null;
}

interface StoreActionsContextValue {
  addProduct: (product: ProductInput) => Promise<void>;
  editProduct: (id: string, product: ProductInput) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  addCategory: (category: CategoryInput) => Promise<void>;
  editCategory: (id: string, category: CategoryInput) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  editHomeSection: (id: string, section: HomeSectionInput) => Promise<void>;
  addHomeCard: (card: HomeCardInput) => Promise<void>;
  editHomeCard: (id: string, card: HomeCardInput) => Promise<void>;
  removeHomeCard: (id: string) => Promise<void>;
  addRaffle: (raffle: RaffleInput) => Promise<void>;
  editRaffle: (id: string, raffle: RaffleInput) => Promise<void>;
  removeRaffle: (id: string) => Promise<void>;
  addBanner: (banner: BannerInput) => Promise<void>;
  removeBanner: (id: string) => Promise<void>;
  reorderBanners: (index: number, direction: 'up' | 'down') => Promise<void>;
}

type StoreDataContextValue = StoreDataMap & StoreStatusContextValue & StoreActionsContextValue;

const ProductsContext = createContext<Product[] | null>(null);
const CategoriesContext = createContext<StoreCategory[] | null>(null);
const BannersContext = createContext<Banner[] | null>(null);
const HomeSectionsContext = createContext<HomeSection[] | null>(null);
const HomeCardsContext = createContext<HomeCard[] | null>(null);
const RafflesContext = createContext<Raffle[] | null>(null);
const InstagramFeedContext = createContext<InstagramPost[] | null>(null);
const StoreStatusContext = createContext<StoreStatusContextValue | null>(null);
const StoreActionsContext = createContext<StoreActionsContextValue | null>(null);

const STORE_DATA_CACHE_KEY = 'zenv_store_snapshot_v1';
const STORE_DATA_CACHE_TTL_MS = 5 * 60 * 1000;
const STORE_DATA_REVALIDATE_INTERVAL_MS = 60 * 1000;
const STORE_DATA_REVALIDATE_THROTTLE_MS = 15 * 1000;
const STORE_DOMAINS: StoreDomain[] = [
  'products',
  'categories',
  'banners',
  'homeSections',
  'homeCards',
  'raffles',
  'instagramFeed',
];

function isSameData<T>(current: T, next: T) {
  if (Object.is(current, next)) return true;
  return JSON.stringify(current) === JSON.stringify(next);
}

function createEmptySnapshot(): StoreDataSnapshot {
  return {
    products: [],
    categories: [],
    banners: [],
    homeSections: [],
    homeCards: [],
    raffles: [],
    instagramFeed: [],
    cachedAt: new Date(0).toISOString(),
  };
}

function createDomainLoadingState(value = false): DomainLoadingState {
  return {
    products: value,
    categories: value,
    banners: value,
    homeSections: value,
    homeCards: value,
    raffles: value,
    instagramFeed: value,
  };
}

function createDomainErrorState(): DomainErrorState {
  return {
    products: null,
    categories: null,
    banners: null,
    homeSections: null,
    homeCards: null,
    raffles: null,
    instagramFeed: null,
  };
}

function getSnapshotTimestamp(snapshot: Pick<StoreDataSnapshot, 'cachedAt'> | null | undefined) {
  if (!snapshot?.cachedAt) return 0;
  const timestamp = Date.parse(snapshot.cachedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isSnapshotStale(snapshot: Pick<StoreDataSnapshot, 'cachedAt'> | null | undefined, now = Date.now()) {
  const timestamp = getSnapshotTimestamp(snapshot);
  if (!timestamp) return true;
  return now - timestamp >= STORE_DATA_CACHE_TTL_MS;
}

function isSnapshotNewer(nextSnapshot: Pick<StoreDataSnapshot, 'cachedAt'>, currentSnapshot: Pick<StoreDataSnapshot, 'cachedAt'> | null | undefined) {
  return getSnapshotTimestamp(nextSnapshot) > getSnapshotTimestamp(currentSnapshot);
}

function readCachedStoreSnapshot(): StoreDataSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORE_DATA_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoreDataSnapshot>;
    if (
      !parsed
      || !Array.isArray(parsed.products)
      || !Array.isArray(parsed.categories)
      || !Array.isArray(parsed.banners)
      || !Array.isArray(parsed.homeSections)
      || !Array.isArray(parsed.homeCards)
      || !Array.isArray(parsed.raffles)
      || !Array.isArray(parsed.instagramFeed)
    ) {
      return null;
    }

    return {
      products: parsed.products,
      categories: parsed.categories,
      banners: parsed.banners,
      homeSections: parsed.homeSections,
      homeCards: parsed.homeCards,
      raffles: parsed.raffles,
      instagramFeed: parsed.instagramFeed,
      cachedAt: typeof parsed.cachedAt === 'string' ? parsed.cachedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

function writeCachedStoreSnapshot(snapshot: StoreDataSnapshot) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORE_DATA_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota/storage failures and keep the in-memory state alive.
  }
}

async function loadStoreDomain<K extends StoreDomain>(domain: K): Promise<StoreDataMap[K]> {
  switch (domain) {
    case 'products':
      return await getProducts() as StoreDataMap[K];
    case 'categories':
      return await getCategories() as StoreDataMap[K];
    case 'banners':
      return await getBanners() as StoreDataMap[K];
    case 'homeSections':
      return await getHomeSections() as StoreDataMap[K];
    case 'homeCards':
      return await getHomeCards({ onlyActive: false }) as StoreDataMap[K];
    case 'raffles':
      return await getRaffles({ onlyActive: false }) as StoreDataMap[K];
    case 'instagramFeed':
      return await getInstagramFeed() as StoreDataMap[K];
    default:
      throw new Error(`Unsupported store domain: ${domain satisfies never}`);
  }
}

function useRequiredContext<T>(context: React.Context<T | null>, hookName: string) {
  const value = useContext(context);
  if (!value) {
    throw new Error(`${hookName} must be used within a StoreDataProvider`);
  }
  return value;
}

export function StoreDataProvider({ children }: { children: ReactNode }) {
  const initialSnapshotRef = useRef<StoreDataSnapshot | null>(readCachedStoreSnapshot());
  const snapshotRef = useRef<StoreDataSnapshot>(initialSnapshotRef.current ?? createEmptySnapshot());
  const refreshPromisesRef = useRef<Partial<Record<StoreDomain, Promise<void>>>>({});
  const lastRevalidationAttemptAtRef = useRef(0);
  const hasCacheSyncStartedRef = useRef(Boolean(initialSnapshotRef.current));
  const hasBootstrappedRef = useRef(Boolean(initialSnapshotRef.current));
  const initialSnapshot = initialSnapshotRef.current;

  const [products, setProducts] = useState<Product[]>(() => initialSnapshot?.products || []);
  const [categories, setCategories] = useState<StoreCategory[]>(() => initialSnapshot?.categories || []);
  const [banners, setBanners] = useState<Banner[]>(() => initialSnapshot?.banners || []);
  const [homeSections, setHomeSections] = useState<HomeSection[]>(() => initialSnapshot?.homeSections || []);
  const [homeCards, setHomeCards] = useState<HomeCard[]>(() => initialSnapshot?.homeCards || []);
  const [raffles, setRaffles] = useState<Raffle[]>(() => initialSnapshot?.raffles || []);
  const [instagramFeed, setInstagramFeed] = useState<InstagramPost[]>(() => initialSnapshot?.instagramFeed || []);
  const [loading, setLoading] = useState(() => !initialSnapshot);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [domainLoading, setDomainLoading] = useState<DomainLoadingState>(() => createDomainLoadingState(false));
  const [domainErrors, setDomainErrors] = useState<DomainErrorState>(() => createDomainErrorState());
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(() => initialSnapshot?.cachedAt || null);

  const touchCache = useCallback(() => {
    const nextCachedAt = new Date().toISOString();
    hasCacheSyncStartedRef.current = true;
    snapshotRef.current = {
      ...snapshotRef.current,
      cachedAt: nextCachedAt,
    };
    setLastUpdatedAt(nextCachedAt);
  }, []);

  useEffect(() => {
    if (!hasCacheSyncStartedRef.current) return;

    const cachedAt = lastUpdatedAt ?? new Date().toISOString();
    const nextSnapshot: StoreDataSnapshot = {
      products,
      categories,
      banners,
      homeSections,
      homeCards,
      raffles,
      instagramFeed,
      cachedAt,
    };

    snapshotRef.current = nextSnapshot;
    writeCachedStoreSnapshot(nextSnapshot);
  }, [
    banners,
    categories,
    homeCards,
    homeSections,
    instagramFeed,
    lastUpdatedAt,
    products,
    raffles,
  ]);

  const applySnapshot = useCallback((snapshot: StoreDataSnapshot) => {
    hasCacheSyncStartedRef.current = true;
    snapshotRef.current = snapshot;
    setGlobalError(null);
    setDomainErrors((current) => {
      const hasAnyError = Object.values(current).some(Boolean);
      return hasAnyError ? createDomainErrorState() : current;
    });
    setLastUpdatedAt(snapshot.cachedAt);
    setProducts((current) => (isSameData(current, snapshot.products) ? current : snapshot.products));
    setCategories((current) => (isSameData(current, snapshot.categories) ? current : snapshot.categories));
    setBanners((current) => (isSameData(current, snapshot.banners) ? current : snapshot.banners));
    setHomeSections((current) => (isSameData(current, snapshot.homeSections) ? current : snapshot.homeSections));
    setHomeCards((current) => (isSameData(current, snapshot.homeCards) ? current : snapshot.homeCards));
    setRaffles((current) => (isSameData(current, snapshot.raffles) ? current : snapshot.raffles));
    setInstagramFeed((current) => (isSameData(current, snapshot.instagramFeed) ? current : snapshot.instagramFeed));
  }, []);

  const applyDomainData = useCallback(<K extends StoreDomain>(domain: K, nextValue: StoreDataMap[K], cachedAt = new Date().toISOString()) => {
    hasCacheSyncStartedRef.current = true;
    snapshotRef.current = {
      ...snapshotRef.current,
      [domain]: nextValue,
      cachedAt,
    };
    setLastUpdatedAt(cachedAt);
    setDomainErrors((current) => (current[domain] ? { ...current, [domain]: null } : current));

    switch (domain) {
      case 'products':
        setProducts((current) => (isSameData(current, nextValue) ? current : nextValue as Product[]));
        return;
      case 'categories':
        setCategories((current) => (isSameData(current, nextValue) ? current : nextValue as StoreCategory[]));
        return;
      case 'banners':
        setBanners((current) => (isSameData(current, nextValue) ? current : nextValue as Banner[]));
        return;
      case 'homeSections':
        setHomeSections((current) => (isSameData(current, nextValue) ? current : nextValue as HomeSection[]));
        return;
      case 'homeCards':
        setHomeCards((current) => (isSameData(current, nextValue) ? current : nextValue as HomeCard[]));
        return;
      case 'raffles':
        setRaffles((current) => (isSameData(current, nextValue) ? current : nextValue as Raffle[]));
        return;
      case 'instagramFeed':
        setInstagramFeed((current) => (isSameData(current, nextValue) ? current : nextValue as InstagramPost[]));
        return;
      default:
        return;
    }
  }, []);

  const refreshDomain = useCallback(async (domainsInput: StoreDomain | StoreDomain[]) => {
    const domains = Array.from(new Set(Array.isArray(domainsInput) ? domainsInput : [domainsInput]));
    setGlobalError(null);

    const pendingRefreshes = domains.map((domain) => {
      const existing = refreshPromisesRef.current[domain];
      if (existing) {
        return existing;
      }

      setDomainLoading((current) => (current[domain] ? current : { ...current, [domain]: true }));
      setDomainErrors((current) => (current[domain] ? { ...current, [domain]: null } : current));

      const pending = (async () => {
        try {
          const nextValue = await loadStoreDomain(domain);
          applyDomainData(domain, nextValue);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'NÃ£o foi possÃ­vel carregar os dados da loja.';
          setDomainErrors((current) => ({ ...current, [domain]: message }));
          setGlobalError(message);
          throw err;
        } finally {
          setDomainLoading((current) => (current[domain] ? { ...current, [domain]: false } : current));
          delete refreshPromisesRef.current[domain];
        }
      })();

      refreshPromisesRef.current[domain] = pending;
      return pending;
    });

    await Promise.all(pendingRefreshes);
  }, [applyDomainData]);

  const refresh = useCallback(async () => {
    const shouldShowBootstrapLoader = !hasBootstrappedRef.current && !initialSnapshotRef.current;
    if (shouldShowBootstrapLoader) {
      setLoading(true);
    }

    try {
      await refreshDomain(STORE_DOMAINS);
    } finally {
      hasBootstrappedRef.current = true;
      setLoading(false);
    }
  }, [refreshDomain]);

  useEffect(() => {
    const cachedSnapshot = initialSnapshotRef.current;
    if (cachedSnapshot && !isSnapshotStale(cachedSnapshot)) {
      hasBootstrappedRef.current = true;
      setLoading(false);
      return;
    }

    void refresh();
  }, [refresh]);

  const revalidateIfStale = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    if (!isSnapshotStale(snapshotRef.current)) {
      return;
    }

    const now = Date.now();
    if (now - lastRevalidationAttemptAtRef.current < STORE_DATA_REVALIDATE_THROTTLE_MS) {
      return;
    }

    lastRevalidationAttemptAtRef.current = now;

    try {
      await refresh();
    } catch {
      // Keep the current snapshot visible; the UI can retry later.
    }
  }, [refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void revalidateIfStale();
      }
    };

    const handleFocus = () => {
      void revalidateIfStale();
    };

    const intervalId = window.setInterval(() => {
      void revalidateIfStale();
    }, STORE_DATA_REVALIDATE_INTERVAL_MS);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [revalidateIfStale]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORE_DATA_CACHE_KEY) return;

      if (!event.newValue) {
        void refresh();
        return;
      }

      try {
        const nextSnapshot = JSON.parse(event.newValue) as StoreDataSnapshot;
        if (
          !Array.isArray(nextSnapshot.products)
          || !Array.isArray(nextSnapshot.categories)
          || !Array.isArray(nextSnapshot.banners)
          || !Array.isArray(nextSnapshot.homeSections)
          || !Array.isArray(nextSnapshot.homeCards)
          || !Array.isArray(nextSnapshot.raffles)
          || !Array.isArray(nextSnapshot.instagramFeed)
        ) {
          void refresh();
          return;
        }

        if (isSnapshotNewer(nextSnapshot, snapshotRef.current)) {
          applySnapshot(nextSnapshot);
          return;
        }

        if (isSnapshotStale(snapshotRef.current)) {
          void revalidateIfStale();
        }
      } catch {
        void refresh();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [applySnapshot, refresh, revalidateIfStale]);

  const refreshProducts = useCallback(() => refreshDomain('products'), [refreshDomain]);
  const refreshCategories = useCallback(() => refreshDomain('categories'), [refreshDomain]);
  const refreshBanners = useCallback(() => refreshDomain('banners'), [refreshDomain]);
  const refreshHomeSections = useCallback(() => refreshDomain('homeSections'), [refreshDomain]);
  const refreshHomeCards = useCallback(() => refreshDomain('homeCards'), [refreshDomain]);
  const refreshRaffles = useCallback(() => refreshDomain('raffles'), [refreshDomain]);
  const refreshInstagramFeed = useCallback(() => refreshDomain('instagramFeed'), [refreshDomain]);

  const addBanner = useCallback(async (banner: BannerInput) => {
    const created = await createBanner(banner);
    setBanners((current) => [...current, created].sort((a, b) => a.position - b.position));
    touchCache();
  }, [touchCache]);

  const addProduct = useCallback(async (product: ProductInput) => {
    const created = await createProduct(product);
    setProducts((current) => [created, ...current]);
    setCategories((current) => current.map((category) => (
      category.nome === created.categoria
        ? { ...category, productCount: (category.productCount || 0) + 1 }
        : category
    )));
    touchCache();
  }, [touchCache]);

  const editProduct = useCallback(async (id: string, product: ProductInput) => {
    const updated = await updateProduct(id, product);
    setProducts((current) => current.map((item) => (item.id === id ? updated : item)));
    touchCache();
    await refreshDomain(['products', 'categories']);
  }, [refreshDomain, touchCache]);

  const removeProduct = useCallback(async (id: string) => {
    await deleteProduct(id);
    setProducts((current) => current.filter((product) => product.id !== id));
    touchCache();
    await refreshDomain(['products', 'categories']);
  }, [refreshDomain, touchCache]);

  const addCategory = useCallback(async (category: CategoryInput) => {
    const created = await createCategory(category);
    setCategories((current) => [...current, created].sort((a, b) => a.menuOrder - b.menuOrder || a.nome.localeCompare(b.nome)));
    touchCache();
  }, [touchCache]);

  const editCategory = useCallback(async (id: string, category: CategoryInput) => {
    const updated = await updateCategory(id, category);
    setCategories((current) => current
      .map((item) => (item.id === id ? { ...item, ...updated } : item))
      .sort((a, b) => a.menuOrder - b.menuOrder || a.nome.localeCompare(b.nome)));
    touchCache();
  }, [touchCache]);

  const removeCategory = useCallback(async (id: string) => {
    await deleteCategory(id);
    setCategories((current) => current.filter((category) => category.id !== id));
    touchCache();
  }, [touchCache]);

  const editHomeSection = useCallback(async (id: string, section: HomeSectionInput) => {
    const updated = await updateHomeSection(id, section);
    setHomeSections((current) => current
      .map((item) => (item.id === id ? updated : item))
      .sort((a, b) => a.position - b.position));
    touchCache();
  }, [touchCache]);

  const addHomeCard = useCallback(async (card: HomeCardInput) => {
    const created = await createHomeCard(card);
    setHomeCards((current) => [...current, created].sort((a, b) => a.position - b.position));
    touchCache();
  }, [touchCache]);

  const editHomeCard = useCallback(async (id: string, card: HomeCardInput) => {
    const updated = await updateHomeCard(id, card);
    setHomeCards((current) => current
      .map((item) => (item.id === id ? updated : item))
      .sort((a, b) => a.position - b.position));
    touchCache();
  }, [touchCache]);

  const removeHomeCard = useCallback(async (id: string) => {
    await deleteHomeCard(id);
    setHomeCards((current) => current.filter((card) => card.id !== id));
    touchCache();
  }, [touchCache]);

  const addRaffle = useCallback(async (raffle: RaffleInput) => {
    const created = await createRaffle(raffle);
    setRaffles((current) => [...current, created].sort((a, b) => a.position - b.position));
    touchCache();
  }, [touchCache]);

  const editRaffle = useCallback(async (id: string, raffle: RaffleInput) => {
    const updated = await updateRaffle(id, raffle);
    setRaffles((current) => current
      .map((item) => (item.id === id ? updated : item))
      .sort((a, b) => a.position - b.position));
    touchCache();
  }, [touchCache]);

  const removeRaffle = useCallback(async (id: string) => {
    await deleteRaffle(id);
    setRaffles((current) => current.map((raffle) => (
      raffle.id === id ? { ...raffle, status: 'Inativo' } : raffle
    )));
    touchCache();
  }, [touchCache]);

  const removeBanner = useCallback(async (id: string) => {
    await deleteBanner(id);
    setBanners((current) => current.filter((banner) => banner.id !== id));
    touchCache();
  }, [touchCache]);

  const reorderBanners = useCallback(async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    setBanners((current) => {
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
      updateBannerPositions(reordered).catch((err) => {
        setGlobalError(err instanceof Error ? err.message : 'NÃ£o foi possÃ­vel salvar a ordem dos banners.');
      });
      return reordered.map((banner, nextIndex) => ({ ...banner, position: nextIndex + 1 }));
    });
    touchCache();
  }, [touchCache]);

  const refreshing = useMemo(
    () => Object.values(domainLoading).some(Boolean),
    [domainLoading],
  );

  const error = useMemo(
    () => globalError ?? Object.values(domainErrors).find((value): value is string => Boolean(value)) ?? null,
    [domainErrors, globalError],
  );

  const isRefreshing = useCallback((domain?: StoreDomain) => {
    if (!domain) {
      return Object.values(refreshPromisesRef.current).some(Boolean);
    }

    return Boolean(refreshPromisesRef.current[domain]);
  }, []);

  const getDomainError = useCallback((domain: StoreDomain) => domainErrors[domain] ?? null, [domainErrors]);

  const statusValue = useMemo<StoreStatusContextValue>(
    () => ({
      loading,
      refreshing,
      error,
      lastUpdatedAt,
      domainLoading,
      domainErrors,
      refresh,
      refreshDomain,
      refreshProducts,
      refreshCategories,
      refreshBanners,
      refreshHomeSections,
      refreshHomeCards,
      refreshRaffles,
      refreshInstagramFeed,
      isRefreshing,
      getDomainError,
    }),
    [
      domainErrors,
      domainLoading,
      error,
      getDomainError,
      isRefreshing,
      lastUpdatedAt,
      loading,
      refresh,
      refreshBanners,
      refreshCategories,
      refreshDomain,
      refreshHomeCards,
      refreshHomeSections,
      refreshInstagramFeed,
      refreshProducts,
      refreshRaffles,
      refreshing,
    ],
  );

  const actionsValue = useMemo<StoreActionsContextValue>(
    () => ({
      addProduct,
      editProduct,
      removeProduct,
      addCategory,
      editCategory,
      removeCategory,
      editHomeSection,
      addHomeCard,
      editHomeCard,
      removeHomeCard,
      addRaffle,
      editRaffle,
      removeRaffle,
      addBanner,
      removeBanner,
      reorderBanners,
    }),
    [
      addBanner,
      addCategory,
      addHomeCard,
      addProduct,
      addRaffle,
      editCategory,
      editHomeCard,
      editHomeSection,
      editProduct,
      editRaffle,
      removeBanner,
      removeCategory,
      removeHomeCard,
      removeProduct,
      removeRaffle,
      reorderBanners,
    ],
  );

  return (
    <StoreStatusContext.Provider value={statusValue}>
      <StoreActionsContext.Provider value={actionsValue}>
        <ProductsContext.Provider value={products}>
          <CategoriesContext.Provider value={categories}>
            <BannersContext.Provider value={banners}>
              <HomeSectionsContext.Provider value={homeSections}>
                <HomeCardsContext.Provider value={homeCards}>
                  <RafflesContext.Provider value={raffles}>
                    <InstagramFeedContext.Provider value={instagramFeed}>
                      {children}
                    </InstagramFeedContext.Provider>
                  </RafflesContext.Provider>
                </HomeCardsContext.Provider>
              </HomeSectionsContext.Provider>
            </BannersContext.Provider>
          </CategoriesContext.Provider>
        </ProductsContext.Provider>
      </StoreActionsContext.Provider>
    </StoreStatusContext.Provider>
  );
}

export function useStoreProducts() {
  return useRequiredContext(ProductsContext, 'useStoreProducts');
}

export function useStoreCategories() {
  return useRequiredContext(CategoriesContext, 'useStoreCategories');
}

export function useStoreBanners() {
  return useRequiredContext(BannersContext, 'useStoreBanners');
}

export function useStoreHomeSections() {
  return useRequiredContext(HomeSectionsContext, 'useStoreHomeSections');
}

export function useStoreHomeCards() {
  return useRequiredContext(HomeCardsContext, 'useStoreHomeCards');
}

export function useStoreRaffles() {
  return useRequiredContext(RafflesContext, 'useStoreRaffles');
}

export function useStoreInstagramFeed() {
  return useRequiredContext(InstagramFeedContext, 'useStoreInstagramFeed');
}

export function useStoreStatus() {
  return useRequiredContext(StoreStatusContext, 'useStoreStatus');
}

export function useStoreActions() {
  return useRequiredContext(StoreActionsContext, 'useStoreActions');
}

export function useStoreDomainStatus(domain: StoreDomain) {
  const status = useStoreStatus();

  return useMemo(
    () => ({
      loading: status.domainLoading[domain],
      refreshing: status.isRefreshing(domain),
      error: status.getDomainError(domain),
      refresh: () => status.refreshDomain(domain),
    }),
    [domain, status],
  );
}

export function useStoreDomainsStatus(domains: readonly StoreDomain[]) {
  const status = useStoreStatus();
  const uniqueDomains = useMemo(
    () => Array.from(new Set(domains)),
    [domains],
  );

  return useMemo(
    () => ({
      loading: uniqueDomains.some((domain) => status.domainLoading[domain]),
      refreshing: uniqueDomains.some((domain) => status.isRefreshing(domain)),
      error: uniqueDomains.map((domain) => status.getDomainError(domain)).find((value): value is string => Boolean(value)) ?? null,
      refresh: () => status.refreshDomain(uniqueDomains),
    }),
    [status, uniqueDomains],
  );
}

export function useStoreData(): StoreDataContextValue {
  const products = useStoreProducts();
  const categories = useStoreCategories();
  const banners = useStoreBanners();
  const homeSections = useStoreHomeSections();
  const homeCards = useStoreHomeCards();
  const raffles = useStoreRaffles();
  const instagramFeed = useStoreInstagramFeed();
  const status = useStoreStatus();
  const actions = useStoreActions();

  return useMemo(
    () => ({
      products,
      categories,
      banners,
      homeSections,
      homeCards,
      raffles,
      instagramFeed,
      ...status,
      ...actions,
    }),
    [
      actions,
      banners,
      categories,
      homeCards,
      homeSections,
      instagramFeed,
      products,
      raffles,
      status,
    ],
  );
}
