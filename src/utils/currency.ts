// ============================================================
// Financial Utility Functions
// Uses integer arithmetic (minor units/paise) for precision
// with dynamic live exchange rate conversion across currencies
// ============================================================

import type { CurrencyConfig } from '@/types';
import { getStoredExchangeRates, getExchangeRate } from '@/utils/exchangeRates';
export type { CurrencyConfig };

export const DEFAULT_CURRENCY: CurrencyConfig = {
  code: 'INR',
  symbol: '₹',
  name: 'Indian Rupee',
  decimalPlaces: 2,
  symbolPosition: 'before',
};

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  DEFAULT_CURRENCY,
  { code: 'USD', symbol: '$', name: 'US Dollar', decimalPlaces: 2, symbolPosition: 'before' },
  { code: 'EUR', symbol: '€', name: 'Euro', decimalPlaces: 2, symbolPosition: 'before' },
  { code: 'GBP', symbol: '£', name: 'British Pound', decimalPlaces: 2, symbolPosition: 'before' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimalPlaces: 0, symbolPosition: 'before' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimalPlaces: 2, symbolPosition: 'before' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimalPlaces: 2, symbolPosition: 'before' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimalPlaces: 2, symbolPosition: 'before' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', decimalPlaces: 2, symbolPosition: 'before' },
];

const MASTER_CURRENCY_STORAGE_KEY = 'expense_tracker_active_currency';

/**
 * Get the currently active master currency from localStorage or default to INR
 */
export function getActiveMasterCurrency(): CurrencyConfig {
  try {
    const stored = localStorage.getItem(MASTER_CURRENCY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CurrencyConfig;
      const matched = SUPPORTED_CURRENCIES.find(c => c.code === parsed.code);
      if (matched) return matched;
    }
  } catch {
    // Fall back to default
  }
  return DEFAULT_CURRENCY;
}

/**
 * Set the currently active master currency in localStorage
 */
export function setActiveMasterCurrency(curr: CurrencyConfig): void {
  try {
    localStorage.setItem(MASTER_CURRENCY_STORAGE_KEY, JSON.stringify(curr));
  } catch {
    // Ignore storage quota
  }
}

/**
 * Convert a display amount (e.g. "123.45") to minor units (e.g. 12345 paise)
 */
export function toMinorUnits(amount: number | string, decimalPlaces: number = 2): number {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 0;
  return Math.round(num * Math.pow(10, decimalPlaces));
}

/**
 * Convert minor units back to display amount
 */
export function fromMinorUnits(minorUnits: number, decimalPlaces: number = 2): number {
  return minorUnits / Math.pow(10, decimalPlaces);
}

/**
 * Convert minor units from source currency to target currency using exchange rates
 */
export function convertMinorUnits(
  minorUnits: number,
  fromCode: string = 'INR',
  toCode: string = 'INR',
  rates?: Record<string, number>
): number {
  if (!fromCode || !toCode || fromCode === toCode || minorUnits === 0) {
    return minorUnits;
  }
  const fxRates = rates || getStoredExchangeRates().rates;
  const rate = getExchangeRate(fromCode, toCode, fxRates);

  const fromCurr = SUPPORTED_CURRENCIES.find(c => c.code === fromCode) || DEFAULT_CURRENCY;
  const toCurr = SUPPORTED_CURRENCIES.find(c => c.code === toCode) || DEFAULT_CURRENCY;

  const majorAmount = fromMinorUnits(minorUnits, fromCurr.decimalPlaces);
  const convertedMajor = majorAmount * rate;
  return toMinorUnits(convertedMajor, toCurr.decimalPlaces);
}

/**
 * Format an amount in minor units for display, with automatic exchange rate conversion
 * from source currency (defaults to 'INR') into target master currency.
 */
export function formatCurrency(
  minorUnits: number,
  currency?: CurrencyConfig,
  fromCurrencyCode: string = 'INR',
  rates?: Record<string, number>
): string {
  const targetCurrency = currency || getActiveMasterCurrency();
  
  // Convert minor units if source currency is different from display currency
  let targetMinorUnits = minorUnits;
  if (fromCurrencyCode && targetCurrency.code && fromCurrencyCode !== targetCurrency.code) {
    targetMinorUnits = convertMinorUnits(minorUnits, fromCurrencyCode, targetCurrency.code, rates);
  }

  const amount = fromMinorUnits(targetMinorUnits, targetCurrency.decimalPlaces);
  const formatted = new Intl.NumberFormat(targetCurrency.code === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: targetCurrency.decimalPlaces,
    maximumFractionDigits: targetCurrency.decimalPlaces,
  }).format(Math.abs(amount));

  const sign = targetMinorUnits < 0 ? '-' : '';

  if (targetCurrency.symbolPosition === 'before') {
    return `${sign}${targetCurrency.symbol}${formatted}`;
  }
  return `${sign}${formatted}${targetCurrency.symbol}`;
}

/**
 * Format amount with compact notation for large values with live exchange conversion
 */
export function formatCurrencyCompact(
  minorUnits: number,
  currency?: CurrencyConfig,
  fromCurrencyCode: string = 'INR',
  rates?: Record<string, number>
): string {
  const targetCurrency = currency || getActiveMasterCurrency();

  let targetMinorUnits = minorUnits;
  if (fromCurrencyCode && targetCurrency.code && fromCurrencyCode !== targetCurrency.code) {
    targetMinorUnits = convertMinorUnits(minorUnits, fromCurrencyCode, targetCurrency.code, rates);
  }

  const amount = fromMinorUnits(targetMinorUnits, targetCurrency.decimalPlaces);
  const abs = Math.abs(amount);
  const sign = targetMinorUnits < 0 ? '-' : '';

  let formatted: string;
  if (targetCurrency.code === 'INR') {
    if (abs >= 10000000) {
      formatted = (abs / 10000000).toFixed(1) + 'Cr';
    } else if (abs >= 100000) {
      formatted = (abs / 100000).toFixed(1) + 'L';
    } else if (abs >= 1000) {
      formatted = (abs / 1000).toFixed(1) + 'K';
    } else {
      return formatCurrency(targetMinorUnits, targetCurrency, targetCurrency.code);
    }
  } else {
    if (abs >= 1000000000) {
      formatted = (abs / 1000000000).toFixed(1) + 'B';
    } else if (abs >= 1000000) {
      formatted = (abs / 1000000).toFixed(1) + 'M';
    } else if (abs >= 1000) {
      formatted = (abs / 1000).toFixed(1) + 'K';
    } else {
      return formatCurrency(targetMinorUnits, targetCurrency, targetCurrency.code);
    }
  }

  if (targetCurrency.symbolPosition === 'before') {
    return `${sign}${targetCurrency.symbol}${formatted}`;
  }
  return `${sign}${formatted}${targetCurrency.symbol}`;
}

/**
 * Safe addition of minor unit amounts
 */
export function addAmounts(...amounts: number[]): number {
  return amounts.reduce((sum, a) => sum + a, 0);
}

/**
 * Calculate percentage
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 10000) / 100; // 2 decimal precision
}

/**
 * Parse an amount string to minor units, handling various formats
 */
export function parseAmount(input: string, decimalPlaces: number = 2): number | null {
  const cleaned = input.replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num) || num < 0) return null;
  return toMinorUnits(num, decimalPlaces);
}
