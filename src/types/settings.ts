export interface StoreSettings {
  storeName: string;
  siteTitle: string;
  siteLanguage: 'pt-BR' | 'en-US';
  logoUrl: string;
  email: string;
  phone: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  pointsPerReal: number;
  supportSalesPhone: string;
  supportSacPhone: string;
  supportEmail: string;
  supportWeekHours: string;
  supportSaturdayHours: string;
}

export const defaultSettings: StoreSettings = {
  storeName: 'Spacodani',
  siteTitle: 'Spacodani',
  siteLanguage: 'pt-BR',
  logoUrl: 'https://cdn.awsli.com.br/400x300/2751/2751677/logo/logo-dani-morais-ky8ceccgy5.png',
  email: 'contato@danibrand.com.br',
  phone: '(11) 99999-9999',
  instagram: 'https://instagram.com/danibrand',
  facebook: 'https://facebook.com/',
  tiktok: 'https://tiktok.com/@',
  description: 'Loja oficial DANI Brand. Roupas minimalistas e exclusivas, feitas com algodao premium.',
  primaryColor: '#ba884b',
  secondaryColor: '#1a222b',
  pointsPerReal: 1,
  supportSalesPhone: '(64) 99202-3191',
  supportSacPhone: '(64) 99209-6899',
  supportEmail: 'spacodanimorais@gmail.com',
  supportWeekHours: 'Seg a Sex das 08h as 18h',
  supportSaturdayHours: 'Sab das 08h as 13h',
};
