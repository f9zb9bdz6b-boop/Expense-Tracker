import * as React from 'react';
import type { UserSettings } from '@/types';
import { settingsRepo } from '@/db/repositories';
import { setActiveMasterCurrency, getActiveMasterCurrency, DEFAULT_CURRENCY } from '@/utils/currency';

interface SettingsContextValue {
  settings: UserSettings | null;
  isLoading: boolean;
  coffeeShopMode: boolean;
  toggleCoffeeShopMode: () => void;
  updateSettings: (data: Partial<UserSettings>) => Promise<void>;
  refresh: () => Promise<void>;
}

const SettingsContext = React.createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<UserSettings | null>(() => {
    const active = getActiveMasterCurrency();
    return {
      id: 'user-settings',
      currency: active,
      dateFormat: 'dd/MM/yyyy',
      timeFormat: '12h',
      theme: 'system',
      defaultClassification: 'necessary',
      budgetAlertThresholds: [50, 75, 90, 100],
      showDecimal: true,
      weekStartsOn: 1,
      enableNotifications: true,
      enableBrowserNotifications: false,
      hasCompletedOnboarding: true,
      backupReminder: true,
      backupReminderDays: 7,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [coffeeShopMode, setCoffeeShopMode] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const s = await settingsRepo.get();
      const active = getActiveMasterCurrency();
      const resolved = {
        ...s,
        currency: s?.currency || active || DEFAULT_CURRENCY,
      };
      setSettings(resolved);
      if (resolved.currency) {
        setActiveMasterCurrency(resolved.currency);
      }
      if (resolved.coffeeShopMode !== undefined) {
        setCoffeeShopMode(resolved.coffeeShopMode);
      } else if (resolved.privacyDefaultActive) {
        setCoffeeShopMode(true);
      }

      // Apply blur radius CSS variable based on privacyBlurStrength setting
      const blurRadiusMap: Record<string, string> = {
        light: '4px',
        medium: '8px',
        heavy: '16px',
      };
      const radius = blurRadiusMap[resolved.privacyBlurStrength || 'medium'] || '8px';
      document.documentElement.style.setProperty('--privacy-blur-radius', radius);
    } catch {
      const active = getActiveMasterCurrency();
      setSettings(prev => ({
        id: 'user-settings',
        currency: active,
        dateFormat: 'dd/MM/yyyy',
        timeFormat: '12h',
        theme: 'system',
        defaultClassification: 'necessary',
        budgetAlertThresholds: [50, 75, 90, 100],
        showDecimal: true,
        weekStartsOn: 1,
        enableNotifications: true,
        enableBrowserNotifications: false,
        hasCompletedOnboarding: true,
        backupReminder: true,
        backupReminderDays: 7,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...(prev || {}),
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Synchronize coffee-shop-mode class on document.documentElement for universal blur across all pages and portals
  React.useEffect(() => {
    if (coffeeShopMode) {
      document.documentElement.classList.add('coffee-shop-mode');
    } else {
      document.documentElement.classList.remove('coffee-shop-mode');
    }
  }, [coffeeShopMode]);

  const toggleCoffeeShopMode = React.useCallback(async () => {
    setCoffeeShopMode(prev => {
      const next = !prev;
      settingsRepo.update({ coffeeShopMode: next }).catch(console.error);
      return next;
    });
  }, []);

  const updateSettings = React.useCallback(async (data: Partial<UserSettings>) => {
    if (data.currency) {
      setActiveMasterCurrency(data.currency);
      setSettings(prev => ({
        id: 'user-settings',
        currency: data.currency!,
        dateFormat: 'dd/MM/yyyy',
        timeFormat: '12h',
        theme: 'system',
        defaultClassification: 'necessary',
        budgetAlertThresholds: [50, 75, 90, 100],
        showDecimal: true,
        weekStartsOn: 1,
        enableNotifications: true,
        enableBrowserNotifications: false,
        hasCompletedOnboarding: true,
        backupReminder: true,
        backupReminderDays: 7,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...(prev || {}),
        ...data,
      }));
    }
    await settingsRepo.update(data);
    await load();
  }, [load]);

  return (
    <SettingsContext.Provider value={{
      settings,
      isLoading,
      coffeeShopMode,
      toggleCoffeeShopMode,
      updateSettings,
      refresh: load
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
