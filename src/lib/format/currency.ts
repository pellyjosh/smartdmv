export type CurrencyInfo = { code?: string | null; symbol?: string | null; decimals?: number | null };

export function formatAmountWithCurrency(amount: number, currency?: CurrencyInfo) {
  const decimals = currency?.decimals ?? 2;
  const code = currency?.code ?? null;

  if (!code) {
    // No configured currency: format numerically and append marker to avoid silent fallback
    return (
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
      }).format(amount || 0) +
      " (no currency configured)"
    );
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    minimumFractionDigits: decimals,
  }).format(amount || 0);
}

export default formatAmountWithCurrency;
