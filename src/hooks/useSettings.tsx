import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { getStoreSettings, saveStoreSettings } from '../lib/storeApi';
import { defaultSettings, StoreSettings } from '../types/settings';

const SETTINGS_KEY = 'dani_brand_store_settings';

export type { StoreSettings };

const SettingsContext = createContext<{
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
} | null>(null);

function adjustColorIntensity(hex: string, amount: number): string {
  let usePound = false;
  if (hex[0] === '#') {
    hex = hex.slice(1);
    usePound = true;
  }

  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));

  return `${usePound ? '#' : ''}${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  useEffect(() => {
    getStoreSettings()
      .then((remoteSettings) => {
        setSettings(remoteSettings);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(remoteSettings));
      })
      .catch(() => {
        // Keep the local copy when Supabase is not configured or temporarily unavailable.
      });
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--theme-primary', settings.primaryColor);
    document.documentElement.style.setProperty('--theme-primary-dark', adjustColorIntensity(settings.primaryColor, -20));
    document.documentElement.style.setProperty('--theme-secondary', settings.secondaryColor);
    document.title = settings.siteTitle || settings.storeName;
  }, [settings.primaryColor, settings.secondaryColor, settings.siteTitle, settings.storeName]);

  const updateSettings = useCallback((newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      saveStoreSettings(updated).catch(() => {
        // Local state remains updated; the next save can retry the remote write.
      });
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
