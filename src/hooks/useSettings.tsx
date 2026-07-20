import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { getStoreSettings, saveStoreSettings } from '../lib/storeApi';
import { defaultSettings, normalizeStoreSettings, StoreSettings } from '../types/settings';

export type { StoreSettings };

const SettingsContext = createContext<{
  settings: StoreSettings;
  loading: boolean;
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
  const [settings, setSettings] = useState<StoreSettings>(() => normalizeStoreSettings(defaultSettings));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoreSettings()
      .then((remoteSettings) => {
        const normalizedSettings = normalizeStoreSettings(remoteSettings);
        setSettings(normalizedSettings);
        setLoading(false);

        if (normalizedSettings.storeCurrency !== remoteSettings.storeCurrency) {
          saveStoreSettings(normalizedSettings).catch(() => {
            // Keep the normalized local state even if the remote migration fails for now.
          });
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--theme-primary', settings.primaryColor);
    document.documentElement.style.setProperty('--theme-primary-dark', adjustColorIntensity(settings.primaryColor, -20));
    document.documentElement.style.setProperty('--theme-secondary', settings.secondaryColor);
    if (loading) return;
    document.title = settings.siteTitle || settings.storeName;
  }, [loading, settings.primaryColor, settings.secondaryColor, settings.siteTitle, settings.storeName]);

  const updateSettings = useCallback((newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => {
      const updated = normalizeStoreSettings({ ...prev, ...newSettings });
      saveStoreSettings(updated).catch(() => {
        getStoreSettings()
          .then((remoteSettings) => setSettings(normalizeStoreSettings(remoteSettings)))
          .catch(() => undefined);
      });
      return updated;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
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
