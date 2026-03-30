/**
 * Parsea una fecha en formato 'dd-mmm-yy' (ej: '28-oct-22') o 'dd-mmm-yyyy' (ej: '15-mar-2021')
 * y retorna el año como número.
 */
function parseYearFromDate(fechaCompra: string): number {
  // Intenta formato con mes en texto: 15-oct-22 o 15-oct-2022
  const parts = fechaCompra.split('-');
  if (parts.length === 3) {
    const yearStr = parts[2];
    const year = parseInt(yearStr.length === 2 ? `20${yearStr}` : yearStr, 10);
    if (!isNaN(year)) return year;
  }
  // Fallback: intentar Date.parse
  const parsed = new Date(fechaCompra);
  if (!isNaN(parsed.getTime())) return parsed.getFullYear();
  return 2022; // Fallback seguro
}

export interface DepreciationResult {
  currentValue: number;
  accumulatedDepreciation: number;
  yearsUsed: number;
  isFullyDepreciated: boolean;
  porcentajeDepreciado: number;
}

/**
 * Calcula depreciación lineal (método de línea recta).
 * 
 * @param valor - Valor de compra del activo (en USD)
 * @param fechaCompra - Fecha de compra en formato 'dd-mmm-yy' (ej: '28-oct-22')
 * @param vidaUtil - Vida útil en años
 * @param fechaCalculo - Fecha de referencia para el cálculo (default: hoy)
 * @returns DepreciationResult con valores calculados
 */
export function calcDepreciation(
  valor: number,
  fechaCompra: string,
  vidaUtil: number,
  fechaCalculo?: Date
): DepreciationResult {
  const referenceYear = (fechaCalculo ?? new Date()).getFullYear();
  const purchaseYear = parseYearFromDate(fechaCompra);
  const yearsUsed = Math.max(0, referenceYear - purchaseYear);
  const depreciationPerYear = valor / vidaUtil;
  const accumulatedDepreciation = Math.min(valor, depreciationPerYear * yearsUsed);
  const currentValue = Math.max(0, valor - accumulatedDepreciation);
  const porcentajeDepreciado = valor > 0 ? Math.round((accumulatedDepreciation / valor) * 100) : 0;

  return {
    currentValue,
    accumulatedDepreciation,
    yearsUsed,
    isFullyDepreciated: currentValue <= 0,
    porcentajeDepreciado,
  };
}
