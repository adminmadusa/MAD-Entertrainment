export interface CountryConfig {
  countryCode: string;
  countryName: string;
  currency: string;
  symbol: string;
  taxLabel: string;
  defaultTax: number;
  locale: string;
}

export const COUNTRY_CONFIG: Record<string, CountryConfig> = {
  US: {
    countryCode: 'US',
    countryName: 'United States',
    currency: 'USD',
    symbol: '$',
    taxLabel: 'Sales Tax',
    defaultTax: 0,
    locale: 'en-US',
  },
  IN: {
    countryCode: 'IN',
    countryName: 'India',
    currency: 'INR',
    symbol: '₹',
    taxLabel: 'GST',
    defaultTax: 18,
    locale: 'en-IN',
  },
} as const;

export const DEFAULT_COUNTRY = COUNTRY_CONFIG.US;

export function getCountryConfig(countryCode?: string): CountryConfig {
  const code = (countryCode || 'US').toUpperCase();
  return COUNTRY_CONFIG[code] || DEFAULT_COUNTRY;
}

export function formatMoney(amount: number, currency = 'USD'): string {
  const currencyUpper = currency.toUpperCase();
  const locale = currencyUpper === 'INR' ? 'en-IN' : 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyUpper,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const symbol = currencyUpper === 'INR' ? '₹' : '$';
    return `${symbol}${amount}`;
  }
}
