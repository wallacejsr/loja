import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const SETTINGS_KEY = 'dani_brand_store_settings';

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

const defaultSettings: StoreSettings = {
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

const SettingsContext = createContext<{
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
} | null>(null);

function adjustColorIntensity(hex: string, amount: number): string {
  let usePound = false;
  if (hex[0] == "#") {
      hex = hex.slice(1);
      usePound = true;
  }
  let R = parseInt(hex.substring(0,2),16);
  let G = parseInt(hex.substring(2,4),16);
  let B = parseInt(hex.substring(4,6),16);

  R = Math.max(0, Math.min(255, R + amount));
  G = Math.max(0, Math.min(255, G + amount));
  B = Math.max(0, Math.min(255, B + amount));

  let RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
  let GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
  let BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

  return (usePound?"#":"") + RR + GG + BB;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  useEffect(() => {
    // Apply theme colors to css variables
    document.documentElement.style.setProperty('--theme-primary', settings.primaryColor);
    document.documentElement.style.setProperty('--theme-primary-dark', adjustColorIntensity(settings.primaryColor, -20)); // darken primary
    document.documentElement.style.setProperty('--theme-secondary', settings.secondaryColor);
  }, [settings.primaryColor, settings.secondaryColor]);

  const updateSettings = useCallback((newSettings: Partial<StoreSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

