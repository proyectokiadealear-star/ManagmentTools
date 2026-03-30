/**
 * Formatea un número como moneda USD con locale español ecuatoriano.
 */
export function formatCurrency(value: number, locale = 'es-EC'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Formatea una fecha ISO como string legible en español.
 */
export function formatDate(date: Date | string, locale = 'es-EC'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formatea un número como porcentaje.
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
