import { randomUUID } from 'node:crypto';
import { categorias, instagramFeed, produtos } from '../../src/data/mockData.ts';
import { defaultSettings, normalizeStoreSettings } from '../../src/types/settings.ts';
import { createEmptyStoredStripeCredentialSet } from '../integrations/stripeCredentials';
import type { StoreSnapshot, StoredInstagramPost, StoredProduct } from './types';

const now = () => new Date().toISOString();

function toStoredProduct(product: typeof produtos[number]): StoredProduct {
  const timestamp = now();

  return {
    ...product,
    createdAt: timestamp,
    shippingWeightGrams: product.shippingWeightGrams ?? defaultSettings.shippingDefaultProductWeightGrams,
    status: 'Ativo',
    updatedAt: timestamp,
  };
}

function toStoredInstagramPost(image: string, index: number): StoredInstagramPost {
  return {
    id: String(index + 1),
    image,
    position: index + 1,
    status: 'Ativo',
  };
}

export function createDefaultStoreSnapshot(): StoreSnapshot {
  return {
    products: produtos.map(toStoredProduct),
    categories: categorias.map((category, index) => ({
      id: category.nome.toLowerCase().replace(/\s+/g, '-'),
      nome: category.nome,
      imagem: category.imagem,
      slug: category.nome.toLowerCase().replace(/\s+/g, '-'),
      subcategories: Array.from(
        new Set(
          produtos
            .filter((product) => product.categoria === category.nome && product.subcategoria)
            .map((product) => product.subcategoria),
        ),
      ),
      status: 'Ativo',
      showInMenu: true,
      menuOrder: index + 1,
      showOnHome: false,
      homeSectionTitle: category.nome,
      homeSectionOrder: index + 1,
      homeSectionLimit: 4,
      homeSectionFilter: 'all',
      productCount: produtos.filter((product) => product.categoria === category.nome).length,
    })),
    banners: [
      {
        id: '1',
        title: 'ZENV Essentials',
        desktop: produtos[0]?.imagens[0] || categorias[0]?.imagem || '',
        mobile: produtos[0]?.imagens[0] || categorias[0]?.imagem || '',
        image: produtos[0]?.imagens[0] || categorias[0]?.imagem || '',
        link: '/catalog',
        status: 'Ativo',
        position: 1,
      },
    ],
    homeSections: [
      {
        id: 'lancamentos',
        title: 'Lancamentos',
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
    ],
    homeCards: [
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
        title: 'Novidades',
        image: produtos[1]?.imagens[0] || categorias[1]?.imagem || '',
        link: '/catalog?sort=lancamentos',
        ctaLabel: 'Confira',
        position: 2,
        status: 'Ativo',
      },
      {
        id: '8f92cb70-7d15-4ab7-8082-8d6b0e51c333',
        title: 'Mais Vendidos',
        image: produtos[2]?.imagens[0] || categorias[0]?.imagem || '',
        link: '/catalog?sort=mais-vendidos',
        ctaLabel: 'Confira',
        position: 3,
        status: 'Ativo',
      },
    ],
    raffles: [
      {
        id: 'raffle-1',
        title: 'Sorteio Ativo',
        prize: 'Look exclusivo da loja',
        description: 'Participe do clube de sorteios e concorra a premios especiais.',
        image: produtos[0]?.imagens[0] || '',
        productId: produtos[0]?.id || '',
        pointsPerTicket: 100,
        drawDate: '2026-12-31',
        ctaLabel: 'Participar agora',
        ctaLink: '/sorteios',
        totalParticipants: 0,
        totalTickets: 0,
        status: 'Ativo',
        position: 1,
      },
    ],
    instagramFeed: instagramFeed.map(toStoredInstagramPost),
    settings: normalizeStoreSettings(defaultSettings),
    contactMessages: [],
    newsletterSubscribers: [],
    stripeCredentials: {
      test: createEmptyStoredStripeCredentialSet(),
      live: createEmptyStoredStripeCredentialSet(),
    },
  };
}

export function cloneStoreSnapshot(snapshot: StoreSnapshot): StoreSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as StoreSnapshot;
}

export function createId(prefix?: string) {
  return prefix ? `${prefix}-${randomUUID()}` : randomUUID();
}
