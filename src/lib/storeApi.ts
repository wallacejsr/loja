import { categorias as mockCategories, instagramFeed as mockInstagramFeed, produtos as mockProducts, Product } from '../data/mockData';
import { defaultSettings, StoreSettings } from '../types/settings';
import { isSupabaseConfigured, supabase } from './supabase';

export interface StoreCategory {
  id: string;
  nome: Product['categoria'];
  imagem: string;
  slug: string;
  status: 'Ativo' | 'Inativo';
  productCount?: number;
}

export interface Banner {
  id: string;
  title: string;
  desktop: string;
  mobile: string;
  image: string;
  link: string;
  status: 'Ativo' | 'Inativo';
  position: number;
}

export interface InstagramPost {
  id: string;
  image: string;
  link?: string;
  position: number;
}

const fallbackBanners: Banner[] = [
  {
    id: '1',
    title: 'Coleção Principal',
    desktop: 'https://cdn.awsli.com.br/1920x1920/2751/2751677/banner/18-0grlts3ju4.png',
    mobile: 'https://cdn.awsli.com.br/1920x1920/2751/2751677/banner/2-iwz6y4331u.png',
    image: 'https://cdn.awsli.com.br/1920x1920/2751/2751677/banner/18-0grlts3ju4.png',
    link: '/catalog',
    status: 'Ativo',
    position: 1,
  },
];

const toProduct = (row: any): Product => ({
  id: String(row.id),
  nome: row.nome,
  preco: Number(row.preco || 0),
  precoPromocional: row.preco_promocional === null || row.preco_promocional === undefined ? undefined : Number(row.preco_promocional),
  categoria: row.categoria,
  subcategoria: row.subcategoria || '',
  imagens: row.imagens || [],
  descricao: row.descricao || '',
  composicao: row.composicao || '',
  tamanhos: row.tamanhos || [],
  cores: row.cores || [],
  avaliacoes: row.avaliacoes || [],
  maisVendido: Boolean(row.mais_vendido),
  lancamento: Boolean(row.lancamento),
  estoque: Number(row.estoque || 0),
});

const toCategory = (row: any): StoreCategory => ({
  id: String(row.id),
  nome: row.nome,
  imagem: row.imagem || '',
  slug: row.slug || String(row.nome).toLowerCase().replace(/\s+/g, '-'),
  status: row.status || 'Ativo',
  productCount: row.product_count,
});

const toBanner = (row: any): Banner => ({
  id: String(row.id),
  title: row.title,
  desktop: row.desktop_image || row.image || '',
  mobile: row.mobile_image || row.desktop_image || row.image || '',
  image: row.desktop_image || row.image || '',
  link: row.link || '/catalog',
  status: row.status || 'Ativo',
  position: row.position || 0,
});

const toSettings = (row: any): StoreSettings => ({
  storeName: row.store_name || defaultSettings.storeName,
  logoUrl: row.logo_url || defaultSettings.logoUrl,
  email: row.email || defaultSettings.email,
  phone: row.phone || defaultSettings.phone,
  instagram: row.instagram || '',
  facebook: row.facebook || '',
  tiktok: row.tiktok || '',
  description: row.description || defaultSettings.description,
  primaryColor: row.primary_color || defaultSettings.primaryColor,
  secondaryColor: row.secondary_color || defaultSettings.secondaryColor,
  pointsPerReal: Number(row.points_per_real || defaultSettings.pointsPerReal),
});

const fromSettings = (settings: StoreSettings) => ({
  id: 1,
  store_name: settings.storeName,
  logo_url: settings.logoUrl,
  email: settings.email,
  phone: settings.phone,
  instagram: settings.instagram,
  facebook: settings.facebook,
  tiktok: settings.tiktok,
  description: settings.description,
  primary_color: settings.primaryColor,
  secondary_color: settings.secondaryColor,
  points_per_real: settings.pointsPerReal,
  updated_at: new Date().toISOString(),
});

export async function getProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured || !supabase) return mockProducts;

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'Ativo')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toProduct);
}

export async function getCategories(): Promise<StoreCategory[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockCategories.map((category) => ({
      id: category.nome,
      nome: category.nome,
      imagem: category.imagem,
      slug: category.nome.toLowerCase().replace(/\s+/g, '-'),
      status: 'Ativo',
      productCount: mockProducts.filter((product) => product.categoria === category.nome).length,
    }));
  }

  const { data, error } = await supabase
    .from('categories_with_product_count')
    .select('*')
    .order('nome', { ascending: true });

  if (error) throw error;
  return (data || []).map(toCategory);
}

export async function getBanners({ onlyActive = true } = {}): Promise<Banner[]> {
  if (!isSupabaseConfigured || !supabase) return fallbackBanners;

  let query = supabase.from('banners').select('*').order('position', { ascending: true });
  if (onlyActive) query = query.eq('status', 'Ativo');

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toBanner);
}

export async function createBanner(input: Pick<Banner, 'title' | 'desktop' | 'mobile' | 'link'>): Promise<Banner> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      id: crypto.randomUUID(),
      title: input.title,
      desktop: input.desktop,
      mobile: input.mobile || input.desktop,
      image: input.desktop,
      link: input.link || '/catalog',
      status: 'Ativo',
      position: Date.now(),
    };
  }

  const { data, error } = await supabase
    .from('banners')
    .insert({
      title: input.title,
      desktop_image: input.desktop,
      mobile_image: input.mobile || input.desktop,
      link: input.link || '/catalog',
      status: 'Ativo',
    })
    .select('*')
    .single();

  if (error) throw error;
  return toBanner(data);
}

export async function deleteBanner(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) throw error;
}

export async function updateBannerPositions(banners: Banner[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const rows = banners.map((banner, index) => ({
    id: banner.id,
    title: banner.title,
    desktop_image: banner.desktop,
    mobile_image: banner.mobile,
    link: banner.link,
    status: banner.status,
    position: index + 1,
  }));

  const { error } = await supabase.from('banners').upsert(rows);
  if (error) throw error;
}

export async function getInstagramFeed(): Promise<InstagramPost[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockInstagramFeed.map((image, index) => ({
      id: String(index + 1),
      image,
      position: index + 1,
    }));
  }

  const { data, error } = await supabase
    .from('instagram_posts')
    .select('*')
    .eq('status', 'Ativo')
    .order('position', { ascending: true });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: String(row.id),
    image: row.image,
    link: row.link,
    position: row.position || 0,
  }));
}

export async function getStoreSettings(): Promise<StoreSettings> {
  if (!isSupabaseConfigured || !supabase) return defaultSettings;

  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  return data ? toSettings(data) : defaultSettings;
}

export async function saveStoreSettings(settings: StoreSettings): Promise<StoreSettings> {
  if (!isSupabaseConfigured || !supabase) return settings;

  const { data, error } = await supabase
    .from('store_settings')
    .upsert(fromSettings(settings))
    .select('*')
    .single();

  if (error) throw error;
  return toSettings(data);
}
