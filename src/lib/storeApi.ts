import { categorias as mockCategories, instagramFeed as mockInstagramFeed, produtos as mockProducts, Product } from '../data/mockData';
import { defaultSettings, StoreSettings } from '../types/settings';
import { isSupabaseConfigured, supabase } from './supabase';

export interface StoreCategory {
  id: string;
  nome: string;
  imagem: string;
  slug: string;
  status: 'Ativo' | 'Inativo';
  showInMenu: boolean;
  menuOrder: number;
  showOnHome: boolean;
  homeSectionTitle: string;
  homeSectionOrder: number;
  homeSectionLimit: number;
  homeSectionFilter: HomeSectionSource | 'all';
  productCount?: number;
}

export interface CategoryInput {
  nome: string;
  slug: string;
  imagem?: string;
  status: 'Ativo' | 'Inativo';
  showInMenu: boolean;
  menuOrder: number;
  showOnHome: boolean;
  homeSectionTitle: string;
  homeSectionOrder: number;
  homeSectionLimit: number;
  homeSectionFilter: HomeSectionSource | 'all';
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

export interface Raffle {
  id: string;
  title: string;
  prize: string;
  description: string;
  image: string;
  productId: string;
  pointsPerTicket: number;
  drawDate: string;
  ctaLabel: string;
  ctaLink: string;
  totalParticipants: number;
  totalTickets: number;
  status: 'Ativo' | 'Inativo' | 'Finalizado' | 'Agendado';
  position: number;
}

export interface RaffleInput {
  title: string;
  prize: string;
  description: string;
  image: string;
  productId: string;
  pointsPerTicket: number;
  drawDate: string;
  ctaLabel: string;
  ctaLink: string;
  totalParticipants: number;
  totalTickets: number;
  status: 'Ativo' | 'Inativo' | 'Finalizado' | 'Agendado';
  position: number;
}

export type HomeSectionSource = 'category' | 'lancamentos' | 'mais_vendidos' | 'promocoes';

export interface HomeSection {
  id: string;
  title: string;
  sourceType: HomeSectionSource;
  categoryName: string;
  limitCount: number;
  link: string;
  position: number;
  status: 'Ativo' | 'Inativo';
}

export interface HomeSectionInput {
  title: string;
  sourceType: HomeSectionSource;
  categoryName: string;
  limitCount: number;
  link: string;
  position: number;
  status: 'Ativo' | 'Inativo';
}

export interface HomeCard {
  id: string;
  title: string;
  image: string;
  link: string;
  ctaLabel: string;
  position: number;
  status: 'Ativo' | 'Inativo';
}

export interface HomeCardInput {
  title: string;
  image: string;
  link: string;
  ctaLabel: string;
  position: number;
  status: 'Ativo' | 'Inativo';
}

export interface ProductInput {
  id?: string;
  nome: string;
  preco: number;
  precoPromocional?: number;
  categoria: Product['categoria'];
  subcategoria?: string;
  imagens: string[];
  descricao?: string;
  composicao?: string;
  tamanhos?: string[];
  cores?: { nome: string; hex: string }[];
  estoque: number;
  maisVendido?: boolean;
  lancamento?: boolean;
}

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

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
  showInMenu: Boolean(row.show_in_menu),
  menuOrder: Number(row.menu_order || 100),
  showOnHome: Boolean(row.show_on_home),
  homeSectionTitle: row.home_section_title || row.nome || '',
  homeSectionOrder: Number(row.home_section_order || row.menu_order || 100),
  homeSectionLimit: Number(row.home_section_limit || 4),
  homeSectionFilter: row.home_section_filter || 'all',
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

const toHomeSection = (row: any): HomeSection => ({
  id: String(row.id),
  title: row.title,
  sourceType: row.source_type || 'category',
  categoryName: row.category_name || '',
  limitCount: Number(row.limit_count || 4),
  link: row.link || '/catalog',
  position: Number(row.position || 100),
  status: row.status || 'Ativo',
});

const toHomeCard = (row: any): HomeCard => ({
  id: String(row.id),
  title: row.title || '',
  image: row.image || '',
  link: row.link || '/catalog',
  ctaLabel: row.cta_label || 'Confira',
  position: Number(row.position || 100),
  status: row.status || 'Ativo',
});

const toRaffle = (row: any): Raffle => ({
  id: String(row.id),
  title: row.title || '',
  prize: row.prize || '',
  description: row.description || '',
  image: row.image || '',
  productId: row.product_id || '',
  pointsPerTicket: Number(row.points_per_ticket || 0),
  drawDate: row.draw_date || '',
  ctaLabel: row.cta_label || 'Participar agora',
  ctaLink: row.cta_link || '/sorteios',
  totalParticipants: Number(row.total_participants || 0),
  totalTickets: Number(row.total_tickets || 0),
  status: row.status || 'Ativo',
  position: Number(row.position || 100),
});

const toSettings = (row: any): StoreSettings => ({
  storeName: row.store_name || defaultSettings.storeName,
  siteTitle: row.site_title || row.store_name || defaultSettings.siteTitle,
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
  supportSalesPhone: row.support_sales_phone || row.phone || defaultSettings.supportSalesPhone,
  supportSacPhone: row.support_sac_phone || defaultSettings.supportSacPhone,
  supportEmail: row.support_email || row.email || defaultSettings.supportEmail,
  supportWeekHours: row.support_week_hours || defaultSettings.supportWeekHours,
  supportSaturdayHours: row.support_saturday_hours || defaultSettings.supportSaturdayHours,
});

const fromSettings = (settings: StoreSettings) => ({
  id: 1,
  store_name: settings.storeName,
  site_title: settings.siteTitle,
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
  support_sales_phone: settings.supportSalesPhone,
  support_sac_phone: settings.supportSacPhone,
  support_email: settings.supportEmail,
  support_week_hours: settings.supportWeekHours,
  support_saturday_hours: settings.supportSaturdayHours,
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

export async function uploadProductImage(file: File): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    return URL.createObjectURL(file);
  }

  const extension = file.name.split('.').pop() || 'jpg';
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const filePath = `products/${fileName}`;
  const { error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
  return data.publicUrl;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const product: Product = {
    id: input.id || crypto.randomUUID(),
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
  };

  if (!isSupabaseConfigured || !supabase) return product;

  const { data, error } = await supabase
    .from('products')
    .insert({
      id: product.id,
      nome: product.nome,
      preco: product.preco,
      preco_promocional: product.precoPromocional,
      categoria: product.categoria,
      subcategoria: product.subcategoria,
      imagens: product.imagens,
      descricao: product.descricao,
      composicao: product.composicao,
      tamanhos: product.tamanhos,
      cores: product.cores,
      avaliacoes: product.avaliacoes,
      mais_vendido: product.maisVendido,
      lancamento: product.lancamento,
      estoque: product.estoque,
      status: 'Ativo',
    })
    .select('*')
    .single();

  if (error) throw error;
  return toProduct(data);
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  const product: Product = {
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
  };

  if (!isSupabaseConfigured || !supabase) return product;

  const { data, error } = await supabase
    .from('products')
    .update({
      nome: product.nome,
      preco: product.preco,
      preco_promocional: product.precoPromocional,
      categoria: product.categoria,
      subcategoria: product.subcategoria,
      imagens: product.imagens,
      descricao: product.descricao,
      composicao: product.composicao,
      tamanhos: product.tamanhos,
      cores: product.cores,
      mais_vendido: product.maisVendido,
      lancamento: product.lancamento,
      estoque: product.estoque,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return toProduct(data);
}

export async function deleteProduct(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase
    .from('products')
    .update({
      status: 'Inativo',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function getCategories(): Promise<StoreCategory[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockCategories.map((category, index) => ({
      id: category.nome,
      nome: category.nome,
      imagem: category.imagem,
      slug: category.nome.toLowerCase().replace(/\s+/g, '-'),
      status: 'Ativo',
      showInMenu: true,
      menuOrder: index + 1,
      showOnHome: false,
      homeSectionTitle: category.nome,
      homeSectionOrder: index + 1,
      homeSectionLimit: 4,
      homeSectionFilter: 'all',
      productCount: mockProducts.filter((product) => product.categoria === category.nome).length,
    }));
  }

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('nome', { ascending: true });

  if (error) throw error;
  return (data || [])
    .map(toCategory)
    .sort((a, b) => a.menuOrder - b.menuOrder || a.nome.localeCompare(b.nome));
}

export async function createCategory(input: CategoryInput): Promise<StoreCategory> {
  const category: StoreCategory = {
    id: crypto.randomUUID(),
    nome: input.nome,
    slug: input.slug,
    imagem: input.imagem || '',
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

  if (!isSupabaseConfigured || !supabase) return category;

  const { data, error } = await supabase
    .from('categories')
    .insert({
      nome: input.nome,
      slug: input.slug,
      imagem: input.imagem || '',
      status: input.status,
      show_in_menu: input.showInMenu,
      menu_order: input.menuOrder,
      show_on_home: input.showOnHome,
      home_section_title: input.homeSectionTitle || input.nome,
      home_section_order: input.homeSectionOrder,
      home_section_limit: input.homeSectionLimit,
      home_section_filter: input.homeSectionFilter,
    })
    .select('*')
    .single();

  if (error) throw error;
  return toCategory({ ...data, product_count: 0 });
}

export async function updateCategory(id: string, input: CategoryInput): Promise<StoreCategory> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      id,
      nome: input.nome,
      slug: input.slug,
      imagem: input.imagem || '',
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
  }

  const { data, error } = await supabase
    .from('categories')
    .update({
      nome: input.nome,
      slug: input.slug,
      imagem: input.imagem || '',
      status: input.status,
      show_in_menu: input.showInMenu,
      menu_order: input.menuOrder,
      show_on_home: input.showOnHome,
      home_section_title: input.homeSectionTitle || input.nome,
      home_section_order: input.homeSectionOrder,
      home_section_limit: input.homeSectionLimit,
      home_section_filter: input.homeSectionFilter,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return toCategory(data);
}

export async function deleteCategory(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase
    .from('categories')
    .update({
      status: 'Inativo',
      show_in_menu: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function getBanners({ onlyActive = true } = {}): Promise<Banner[]> {
  if (!isSupabaseConfigured || !supabase) return fallbackBanners;

  let query = supabase.from('banners').select('*').order('position', { ascending: true });
  if (onlyActive) query = query.eq('status', 'Ativo');

  const { data, error } = await query;
  if (error) return [];
  return (data || []).map(toBanner);
}

export async function getHomeSections({ onlyActive = true } = {}): Promise<HomeSection[]> {
  const fallback: HomeSection[] = [
    {
      id: 'lancamentos',
      title: 'Lançamentos',
      sourceType: 'lancamentos',
      categoryName: '',
      limitCount: 4,
      link: '/catalog?sort=lancamentos',
      position: 1,
      status: 'Ativo',
    },
    {
      id: 'mais-vendidos',
      title: 'Mais Vendidos',
      sourceType: 'mais_vendidos',
      categoryName: '',
      limitCount: 4,
      link: '/catalog?sort=mais-vendidos',
      position: 2,
      status: 'Ativo',
    },
  ];

  if (!isSupabaseConfigured || !supabase) return fallback;

  let query = supabase.from('home_sections').select('*').order('position', { ascending: true });
  if (onlyActive) query = query.eq('status', 'Ativo');

  const { data, error } = await query;
  if (error) return [];

  const sections = (data || []).map(toHomeSection);
  return sections;
}

export async function getHomeCards({ onlyActive = true } = {}): Promise<HomeCard[]> {
  const fallback: HomeCard[] = [
    {
      id: '5f3de6ca-2dcb-4b53-9d2f-0a5dd0b9f111',
      title: 'Camisetas',
      image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=900',
      link: '/catalog?category=Camisetas',
      ctaLabel: 'Confira',
      position: 1,
      status: 'Ativo',
    },
    {
      id: '33e86420-b6d0-45a1-b53d-5fe6b7f1e222',
      title: 'Puffer',
      image: 'https://images.unsplash.com/photo-1548624149-f9b185f6893d?auto=format&fit=crop&q=80&w=900',
      link: '/catalog?q=puffer',
      ctaLabel: 'Confira',
      position: 2,
      status: 'Ativo',
    },
    {
      id: '8f92cb70-7d15-4ab7-8082-8d6b0e51c333',
      title: 'Tric\u00f4s',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=900',
      link: '/catalog?q=trico',
      ctaLabel: 'Confira',
      position: 3,
      status: 'Ativo',
    },
  ];

  if (!isSupabaseConfigured || !supabase) return onlyActive ? fallback.filter((card) => card.status === 'Ativo') : fallback;

  let query = supabase.from('home_cards').select('*').order('position', { ascending: true });
  if (onlyActive) query = query.eq('status', 'Ativo');

  const { data, error } = await query;
  if (error) return [];
  const cards = (data || []).map(toHomeCard);
  return cards;
}

export async function createHomeCard(input: HomeCardInput): Promise<HomeCard> {
  const card: HomeCard = { id: crypto.randomUUID(), ...input };
  if (!isSupabaseConfigured || !supabase) return card;

  const { data, error } = await supabase
    .from('home_cards')
    .insert({
      id: card.id,
      title: input.title,
      image: input.image,
      link: input.link,
      cta_label: input.ctaLabel || 'Confira',
      position: input.position,
      status: input.status,
    })
    .select('*')
    .single();

  if (error) throw error;
  return toHomeCard(data);
}

export async function updateHomeCard(id: string, input: HomeCardInput): Promise<HomeCard> {
  const card: HomeCard = { id, ...input };
  if (!isSupabaseConfigured || !supabase) return card;

  if (!isUuid(id)) {
    return createHomeCard(input);
  }

  const { data, error } = await supabase
    .from('home_cards')
    .upsert({
      id,
      title: input.title,
      image: input.image,
      link: input.link,
      cta_label: input.ctaLabel || 'Confira',
      position: input.position,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return toHomeCard(data);
}

export async function deleteHomeCard(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase.from('home_cards').delete().eq('id', id);
  if (error) throw error;
}

export async function getRaffles({ onlyActive = true } = {}): Promise<Raffle[]> {
  const fallback: Raffle[] = [
    {
      id: 'raffle-1',
      title: 'Sorteio Ativo',
      prize: 'Look exclusivo da loja',
      description: 'Participe do clube de sorteios e concorra a premios especiais.',
      image: mockProducts[0]?.imagens[0] || '',
      productId: mockProducts[0]?.id || '',
      pointsPerTicket: 100,
      drawDate: '2026-12-31',
      ctaLabel: 'Participar agora',
      ctaLink: '/sorteios',
      totalParticipants: 0,
      totalTickets: 0,
      status: 'Ativo',
      position: 1,
    },
  ];

  if (!isSupabaseConfigured || !supabase) return onlyActive ? fallback.filter((raffle) => raffle.status === 'Ativo') : fallback;

  let query = supabase.from('raffles').select('*').order('position', { ascending: true });
  if (onlyActive) query = query.eq('status', 'Ativo');

  const { data, error } = await query;
  if (error) return [];
  return (data || []).map(toRaffle);
}

export async function createRaffle(input: RaffleInput): Promise<Raffle> {
  const raffle: Raffle = { id: crypto.randomUUID(), ...input };
  if (!isSupabaseConfigured || !supabase) return raffle;

  const { data, error } = await supabase
    .from('raffles')
    .insert({
      title: input.title,
      prize: input.prize,
      description: input.description,
      image: input.image,
      product_id: input.productId || null,
      points_per_ticket: input.pointsPerTicket,
      draw_date: input.drawDate || null,
      cta_label: input.ctaLabel || 'Participar agora',
      cta_link: input.ctaLink || '/sorteios',
      total_participants: input.totalParticipants,
      total_tickets: input.totalTickets,
      status: input.status,
      position: input.position,
    })
    .select('*')
    .single();

  if (error) throw error;
  return toRaffle(data);
}

export async function updateRaffle(id: string, input: RaffleInput): Promise<Raffle> {
  const raffle: Raffle = { id, ...input };
  if (!isSupabaseConfigured || !supabase) return raffle;

  const { data, error } = await supabase
    .from('raffles')
    .update({
      title: input.title,
      prize: input.prize,
      description: input.description,
      image: input.image,
      product_id: input.productId || null,
      points_per_ticket: input.pointsPerTicket,
      draw_date: input.drawDate || null,
      cta_label: input.ctaLabel || 'Participar agora',
      cta_link: input.ctaLink || '/sorteios',
      total_participants: input.totalParticipants,
      total_tickets: input.totalTickets,
      status: input.status,
      position: input.position,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return toRaffle(data);
}

export async function deleteRaffle(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase
    .from('raffles')
    .update({
      status: 'Inativo',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function updateHomeSection(id: string, input: HomeSectionInput): Promise<HomeSection> {
  const section: HomeSection = { id, ...input };
  if (!isSupabaseConfigured || !supabase) return section;

  const { data, error } = await supabase
    .from('home_sections')
    .upsert({
      id,
      title: input.title,
      source_type: input.sourceType,
      category_name: input.categoryName,
      limit_count: input.limitCount,
      link: input.link,
      position: input.position,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return toHomeSection(data);
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
