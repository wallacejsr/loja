import type { StoreProduct } from './store';

export interface StoreCategory {
  id: string;
  nome: string;
  imagem: string;
  slug: string;
  subcategories: string[];
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
  subcategories: string[];
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

export type RaffleInput = Omit<Raffle, 'id'>;
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

export type HomeSectionInput = Omit<HomeSection, 'id'>;

export interface HomeCard {
  id: string;
  title: string;
  image: string;
  link: string;
  ctaLabel: string;
  position: number;
  status: 'Ativo' | 'Inativo';
}

export type HomeCardInput = Omit<HomeCard, 'id'>;
export type ContactMessageStatus = 'Novo' | 'Lido' | 'Respondido' | 'Arquivado';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  orderNumber: string;
  message: string;
  status: ContactMessageStatus;
  source: string;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
  repliedAt?: string;
}

export interface ContactMessageInput {
  name: string;
  email: string;
  phone?: string;
  orderNumber?: string;
  message: string;
}

export interface ContactMessageUpdateInput {
  status?: ContactMessageStatus;
  adminNotes?: string;
  repliedAt?: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: 'Ativo' | 'Inativo';
  source: string;
  couponCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterSubscriberInput {
  email: string;
  source?: string;
}

export interface ProductInput {
  id?: string;
  nome: string;
  preco: number;
  precoPromocional?: number;
  categoria: StoreProduct['categoria'];
  subcategoria?: string;
  imagens: string[];
  descricao?: string;
  composicao?: string;
  tamanhos?: string[];
  cores?: { nome: string; hex: string }[];
  estoque: number;
  maisVendido?: boolean;
  lancamento?: boolean;
  shippingWeightGrams?: number;
}

export type PromotionStatus = 'Ativo' | 'Pausado' | 'Finalizado' | 'Arquivada';
export type DiscountType = 'percentual' | 'valor_fixo';
export type ApplicationType = 'todos' | 'categorias' | 'produtos';
export type OrderStatus =
  | 'Aguardando Pagamento'
  | 'Pago'
  | 'Em Separação'
  | 'Em Separacao'
  | 'Enviado'
  | 'Entregue'
  | 'Cancelado';

export interface PromotionAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
}

export interface PromotionOrderItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PromotionOrder {
  id: string;
  orderNumber: string;
  purchaseDate: string;
  status: OrderStatus;
  total: number;
  paymentMethod: string;
  customer: { name: string; email: string; phone: string; cpf?: string };
  shippingAddress: PromotionAddress;
  items: PromotionOrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  history: { createdAt: string; paidAt?: string; shippedAt?: string; deliveredAt?: string };
}

export interface PromotionUsage {
  id: string;
  customerName: string;
  customerEmail: string;
  dateTime: string;
  orderValue: number;
  discountApplied: number;
  order: PromotionOrder;
}

export interface PromotionLog {
  id: string;
  user: string;
  dateTime: string;
  ip: string;
  action: string;
}

export interface PromotionCampaign {
  id: string;
  name: string;
  description: string;
  promoCode: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  totalUseLimit: number;
  useLimitPerCustomer: number;
  startsAt: string;
  expiresAt: string;
  applicationType: ApplicationType;
  categoryNames: string[];
  productIds: string[];
  status: PromotionStatus;
  audienceSize: number;
  usages: PromotionUsage[];
  logs: PromotionLog[];
}
