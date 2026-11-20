// ============================================================
// Emojis and Icons for Categories and Payment Methods
// ============================================================

export const DEFAULT_CATEGORY_EMOJIS: Record<string, string> = {
  // Expense Categories
  food: '🍔',
  groceries: '🛒',
  transportation: '🚗',
  transport: '🚗',
  shopping: '🛍️',
  entertainment: '🎬',
  education: '📚',
  healthcare: '💊',
  health: '💊',
  rent: '🏠',
  housing: '🏠',
  utilities: '⚡',
  bills: '⚡',
  travel: '✈️',
  subscriptions: '📱',
  'personal care': '💅',
  personal: '💅',
  gifts: '🎁',
  gift: '🎁',
  other: '📦',
  general: '🏷️',

  // Income Categories
  salary: '💼',
  freelance: '💻',
  business: '🏢',
  allowance: '🪙',
  investment: '📈',
  investments: '📈',
  bonus: '🎉',
  dividend: '📊',
  refund: '↩️',
};

export const POPULAR_CATEGORY_EMOJIS = [
  '🍔', '🛒', '🚗', '🛍️', '🎬', '📚', '💊', '🏠',
  '⚡', '✈️', '📱', '💅', '🎁', '📦', '💼', '💻',
  '🏢', '🪙', '📈', '☕', '🍕', '🍻', '🏋️', '🐶',
  '👶', '🎮', '🎨', '🎧', '🔧', '🛡️', '🩺', '🎟️',
  '⛽', '🚌', '🚆', '🚕', '🏨', '🏖️', '🍿', '🧁',
];

export const PAYMENT_METHOD_ICONS: Record<string, { emoji: string; label: string }> = {
  cash: { emoji: '💵', label: 'Cash' },
  upi: { emoji: '📱', label: 'UPI' },
  gpay: { emoji: '📱', label: 'GPay' },
  phonepe: { emoji: '📱', label: 'PhonePe' },
  paytm: { emoji: '📱', label: 'Paytm' },
  'credit card': { emoji: '💳', label: 'Credit Card' },
  'debit card': { emoji: '💳', label: 'Debit Card' },
  card: { emoji: '💳', label: 'Card' },
  'bank transfer': { emoji: '🏦', label: 'Bank Transfer' },
  bank: { emoji: '🏦', label: 'Bank' },
  cheque: { emoji: '📝', label: 'Cheque' },
  crypto: { emoji: '🪙', label: 'Crypto' },
  wallet: { emoji: '👛', label: 'Wallet' },
  other: '💳',
} as any;

/**
 * Returns an emoji for a category.
 * If the category already has an emoji stored in its icon field, return it.
 * Otherwise, maps the category name or icon to a known emoji.
 */
export function getCategoryEmoji(category?: { name?: string; icon?: string } | string | null): string {
  if (!category) return '🏷️';
  if (typeof category === 'string') {
    const trimmed = category.trim();
    if (isEmoji(trimmed)) return trimmed;
    const lower = trimmed.toLowerCase();
    return DEFAULT_CATEGORY_EMOJIS[lower] || '🏷️';
  }

  // Check if icon is already an emoji
  if (category.icon && isEmoji(category.icon.trim())) {
    return category.icon.trim();
  }

  // Check category name mapping
  if (category.name) {
    const lower = category.name.trim().toLowerCase();
    if (DEFAULT_CATEGORY_EMOJIS[lower]) {
      return DEFAULT_CATEGORY_EMOJIS[lower];
    }
    // Partial matches
    for (const [key, emoji] of Object.entries(DEFAULT_CATEGORY_EMOJIS)) {
      if (lower.includes(key)) return emoji;
    }
  }

  return '🏷️';
}

/**
 * Returns an emoji for a payment method name or id
 */
export function getPaymentMethodEmoji(nameOrId?: string | null): string {
  if (!nameOrId) return '💳';
  const lower = nameOrId.trim().toLowerCase();

  for (const [key, val] of Object.entries(PAYMENT_METHOD_ICONS)) {
    if (lower.includes(key)) {
      return typeof val === 'string' ? val : val.emoji;
    }
  }

  if (lower.includes('cash')) return '💵';
  if (lower.includes('upi') || lower.includes('phonepe') || lower.includes('gpay')) return '📱';
  if (lower.includes('bank') || lower.includes('transfer') || lower.includes('neft') || lower.includes('imps')) return '🏦';
  if (lower.includes('credit') || lower.includes('debit') || lower.includes('card')) return '💳';
  if (lower.includes('wallet')) return '👛';
  if (lower.includes('crypto')) return '🪙';

  return '💳';
}

/**
 * Simple emoji detector
 */
function isEmoji(str: string): boolean {
  if (!str) return false;
  // If string length is short and contains unicode emoji characters
  return /\p{Extended_Pictographic}/u.test(str);
}
