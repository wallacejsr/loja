import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Product } from '../data/mockData';
import { Banner, CategoryInput, createBanner, createCategory, createHomeCard, createProduct, createRaffle, deleteBanner, deleteCategory, deleteHomeCard, deleteProduct, deleteRaffle, getBanners, getCategories, getHomeCards, getHomeSections, getInstagramFeed, getProducts, getRaffles, HomeCard, HomeCardInput, HomeSection, HomeSectionInput, InstagramPost, ProductInput, Raffle, RaffleInput, StoreCategory, updateBannerPositions, updateCategory, updateHomeCard, updateHomeSection, updateProduct, updateRaffle } from '../lib/storeApi';

interface StoreDataContextValue {
  products: Product[];
  categories: StoreCategory[];
  banners: Banner[];
  homeSections: HomeSection[];
  homeCards: HomeCard[];
  raffles: Raffle[];
  instagramFeed: InstagramPost[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
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
  addBanner: (banner: Pick<Banner, 'title' | 'desktop' | 'mobile' | 'link'>) => Promise<void>;
  removeBanner: (id: string) => Promise<void>;
  reorderBanners: (index: number, direction: 'up' | 'down') => Promise<void>;
}

const StoreDataContext = createContext<StoreDataContextValue | null>(null);

export function StoreDataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [homeSections, setHomeSections] = useState<HomeSection[]>([]);
  const [homeCards, setHomeCards] = useState<HomeCard[]>([]);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [instagramFeed, setInstagramFeed] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextProducts, nextCategories, nextBanners, nextHomeSections, nextHomeCards, nextRaffles, nextInstagramFeed] = await Promise.all([
        getProducts(),
        getCategories(),
        getBanners(),
        getHomeSections(),
        getHomeCards({ onlyActive: false }),
        getRaffles({ onlyActive: false }),
        getInstagramFeed(),
      ]);
      setProducts(nextProducts);
      setCategories(nextCategories);
      setBanners(nextBanners);
      setHomeSections(nextHomeSections);
      setHomeCards(nextHomeCards);
      setRaffles(nextRaffles);
      setInstagramFeed(nextInstagramFeed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os dados da loja.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addBanner = useCallback(async (banner: Pick<Banner, 'title' | 'desktop' | 'mobile' | 'link'>) => {
    const created = await createBanner(banner);
    setBanners((current) => [...current, created].sort((a, b) => a.position - b.position));
  }, []);

  const addProduct = useCallback(async (product: ProductInput) => {
    const created = await createProduct(product);
    setProducts((current) => [created, ...current]);
    setCategories((current) => current.map((category) => (
      category.nome === created.categoria
        ? { ...category, productCount: (category.productCount || 0) + 1 }
        : category
    )));
  }, []);

  const editProduct = useCallback(async (id: string, product: ProductInput) => {
    const updated = await updateProduct(id, product);
    setProducts((current) => current.map((item) => (item.id === id ? updated : item)));
    await refresh();
  }, [refresh]);

  const removeProduct = useCallback(async (id: string) => {
    await deleteProduct(id);
    setProducts((current) => current.filter((product) => product.id !== id));
    await refresh();
  }, [refresh]);

  const addCategory = useCallback(async (category: CategoryInput) => {
    const created = await createCategory(category);
    setCategories((current) => [...current, created].sort((a, b) => a.menuOrder - b.menuOrder || a.nome.localeCompare(b.nome)));
  }, []);

  const editCategory = useCallback(async (id: string, category: CategoryInput) => {
    const updated = await updateCategory(id, category);
    setCategories((current) => current
      .map((item) => (item.id === id ? { ...item, ...updated } : item))
      .sort((a, b) => a.menuOrder - b.menuOrder || a.nome.localeCompare(b.nome)));
  }, []);

  const removeCategory = useCallback(async (id: string) => {
    await deleteCategory(id);
    setCategories((current) => current.filter((category) => category.id !== id));
  }, []);

  const editHomeSection = useCallback(async (id: string, section: HomeSectionInput) => {
    const updated = await updateHomeSection(id, section);
    setHomeSections((current) => current
      .map((item) => (item.id === id ? updated : item))
      .sort((a, b) => a.position - b.position));
  }, []);

  const addHomeCard = useCallback(async (card: HomeCardInput) => {
    const created = await createHomeCard(card);
    setHomeCards((current) => [...current, created].sort((a, b) => a.position - b.position));
  }, []);

  const editHomeCard = useCallback(async (id: string, card: HomeCardInput) => {
    const updated = await updateHomeCard(id, card);
    setHomeCards((current) => current
      .map((item) => (item.id === id ? updated : item))
      .sort((a, b) => a.position - b.position));
  }, []);

  const removeHomeCard = useCallback(async (id: string) => {
    await deleteHomeCard(id);
    setHomeCards((current) => current.filter((card) => card.id !== id));
  }, []);

  const addRaffle = useCallback(async (raffle: RaffleInput) => {
    const created = await createRaffle(raffle);
    setRaffles((current) => [...current, created].sort((a, b) => a.position - b.position));
  }, []);

  const editRaffle = useCallback(async (id: string, raffle: RaffleInput) => {
    const updated = await updateRaffle(id, raffle);
    setRaffles((current) => current
      .map((item) => (item.id === id ? updated : item))
      .sort((a, b) => a.position - b.position));
  }, []);

  const removeRaffle = useCallback(async (id: string) => {
    await deleteRaffle(id);
    setRaffles((current) => current.map((raffle) => (
      raffle.id === id ? { ...raffle, status: 'Inativo' } : raffle
    )));
  }, []);

  const removeBanner = useCallback(async (id: string) => {
    await deleteBanner(id);
    setBanners((current) => current.filter((banner) => banner.id !== id));
  }, []);

  const reorderBanners = useCallback(async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    setBanners((current) => {
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
      updateBannerPositions(reordered).catch((err) => {
        setError(err instanceof Error ? err.message : 'Não foi possível salvar a ordem dos banners.');
      });
      return reordered.map((banner, nextIndex) => ({ ...banner, position: nextIndex + 1 }));
    });
  }, []);

  const value = useMemo(
    () => ({
      products,
      categories,
      banners,
      homeSections,
      homeCards,
      raffles,
      instagramFeed,
      loading,
      error,
      refresh,
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
    [products, categories, banners, homeSections, homeCards, raffles, instagramFeed, loading, error, refresh, addProduct, editProduct, removeProduct, addCategory, editCategory, removeCategory, editHomeSection, addHomeCard, editHomeCard, removeHomeCard, addRaffle, editRaffle, removeRaffle, addBanner, removeBanner, reorderBanners],
  );

  return <StoreDataContext.Provider value={value}>{children}</StoreDataContext.Provider>;
}

export function useStoreData() {
  const context = useContext(StoreDataContext);
  if (!context) {
    throw new Error('useStoreData must be used within a StoreDataProvider');
  }
  return context;
}
