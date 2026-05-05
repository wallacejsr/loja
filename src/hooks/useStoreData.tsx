import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Product } from '../data/mockData';
import { Banner, createBanner, deleteBanner, getBanners, getCategories, getInstagramFeed, getProducts, InstagramPost, StoreCategory, updateBannerPositions } from '../lib/storeApi';

interface StoreDataContextValue {
  products: Product[];
  categories: StoreCategory[];
  banners: Banner[];
  instagramFeed: InstagramPost[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addBanner: (banner: Pick<Banner, 'title' | 'desktop' | 'mobile' | 'link'>) => Promise<void>;
  removeBanner: (id: string) => Promise<void>;
  reorderBanners: (index: number, direction: 'up' | 'down') => Promise<void>;
}

const StoreDataContext = createContext<StoreDataContextValue | null>(null);

export function StoreDataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [instagramFeed, setInstagramFeed] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextProducts, nextCategories, nextBanners, nextInstagramFeed] = await Promise.all([
        getProducts(),
        getCategories(),
        getBanners(),
        getInstagramFeed(),
      ]);
      setProducts(nextProducts);
      setCategories(nextCategories);
      setBanners(nextBanners);
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
      instagramFeed,
      loading,
      error,
      refresh,
      addBanner,
      removeBanner,
      reorderBanners,
    }),
    [products, categories, banners, instagramFeed, loading, error, refresh, addBanner, removeBanner, reorderBanners],
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
