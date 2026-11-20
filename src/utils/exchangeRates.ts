// ============================================================
// Real-Time Currency Exchange Rate Engine
// Supports dynamic currency selection with live offline-resilient sync
// ============================================================

export interface ExchangeRateData {
  base: string;
  rates: Record<string, number>;
  lastUpdated: number; // ms timestamp
}

// Robust fallback rates (Base: USD = 1.0)
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 86.85,
  EUR: 0.96,
  GBP: 0.80,
  JPY: 154.50,
  AUD: 1.58,
  CAD: 1.42,
  SGD: 1.35,
  AED: 3.67,
  CHF: 0.90,
  CNY: 7.28,
};

const CACHE_KEY = 'expense_tracker_fx_rates';
const CACHE_DURATION_MS = 1000 * 60 * 60 * 6; // 6 hours cache

/**
 * Get cached or fallback exchange rates immediately
 */
export function getStoredExchangeRates(): ExchangeRateData {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.rates) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore storage parse issues
  }
  return {
    base: 'USD',
    rates: FALLBACK_RATES,
    lastUpdated: Date.now(),
  };
}

/**
 * Fetch latest live exchange rates from open endpoint with fallback
 */
export async function fetchLiveExchangeRates(): Promise<ExchangeRateData> {
  const cached = getStoredExchangeRates();
  // Return cached if still within fresh threshold
  if (Date.now() - cached.lastUpdated < CACHE_DURATION_MS && Object.keys(cached.rates).length > 5) {
    return cached;
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('FX HTTP error');
    const data = await res.json();
    if (data && data.rates && data.result === 'success') {
      const rateData: ExchangeRateData = {
        base: 'USD',
        rates: { ...FALLBACK_RATES, ...data.rates },
        lastUpdated: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(rateData));
      return rateData;
    }
  } catch (err) {
    console.warn('Live currency rate sync offline, using local exchange matrix.');
  }

  return cached;
}

/**
 * Calculate the conversion rate from one currency to another
 */
export function getExchangeRate(
  fromCode: string,
  toCode: string,
  rates: Record<string, number> = FALLBACK_RATES
): number {
  if (fromCode === toCode) return 1.0;
  const fromRate = rates[fromCode] || FALLBACK_RATES[fromCode] || 1.0;
  const toRate = rates[toCode] || FALLBACK_RATES[toCode] || 1.0;
  return toRate / fromRate;
}

/**
 * Convert an amount from foreign currency to master currency
 */
export function convertAmount(
  amount: number,
  fromCode: string,
  toCode: string,
  rates: Record<string, number> = FALLBACK_RATES
): { convertedAmount: number; rate: number } {
  const rate = getExchangeRate(fromCode, toCode, rates);
  return {
    convertedAmount: amount * rate,
    rate,
  };
}
