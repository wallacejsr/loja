export interface StoreSettings {
  storeName: string;
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
}

export const defaultSettings: StoreSettings = {
  storeName: 'Spaçodani',
  logoUrl: 'https://cdn.awsli.com.br/400x300/2751/2751677/logo/logo-dani-morais-ky8ceccgy5.png',
  email: 'contato@danibrand.com.br',
  phone: '(11) 99999-9999',
  instagram: 'https://instagram.com/danibrand',
  facebook: 'https://facebook.com/',
  tiktok: 'https://tiktok.com/@',
  description: 'Loja oficial DANI Brand. Roupas minimalistas e exclusivas, feitas com algodão premium.',
  primaryColor: '#ba884b',
  secondaryColor: '#1a222b',
  pointsPerReal: 1,
};
