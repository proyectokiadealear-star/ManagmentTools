/**
 * Calcula estadísticas básicas de un array de números.
 */
export function computeStats(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) / values.length
  );
  return { mean, stdDev };
}
