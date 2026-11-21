// ============================================================
// Financial Utility Functions
// Uses integer arithmetic (minor units/paise) for precision
// ============================================================

import type { CurrencyConfig } from '@/types';
export type { CurrencyConfig };

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
 * Format an amount in minor units for display
 */
export function formatCurrency(
  minorUnits: number,
  currency: CurrencyConfig = DEFAULT_CURRENCY
): string {
  const amount = fromMinorUnits(minorUnits, currency.decimalPlaces);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces,
  }).format(Math.abs(amount));

  const sign = minorUnits < 0 ? '-' : '';

  if (currency.symbolPosition === 'before') {
    return `${sign}${currency.symbol}${formatted}`;
  }
  return `${sign}${formatted}${currency.symbol}`;
}

/**
 * Format amount with compact notation for large values
 */
export function formatCurrencyCompact(
  minorUnits: number,
  currency: CurrencyConfig = DEFAULT_CURRENCY
): string {
  const amount = fromMinorUnits(minorUnits, currency.decimalPlaces);
  const abs = Math.abs(amount);
  const sign = minorUnits < 0 ? '-' : '';

  let formatted: string;
  if (abs >= 10000000) {
    formatted = (abs / 10000000).toFixed(1) + 'Cr';
  } else if (abs >= 100000) {
    formatted = (abs / 100000).toFixed(1) + 'L';
  } else if (abs >= 1000) {
    formatted = (abs / 1000).toFixed(1) + 'K';
  } else {
    return formatCurrency(minorUnits, currency);
  }

  if (currency.symbolPosition === 'before') {
    return `${sign}${currency.symbol}${formatted}`;
  }
  return `${sign}${formatted}${currency.symbol}`;
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
