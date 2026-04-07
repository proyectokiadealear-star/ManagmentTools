/**
 * Parsea una fecha en múltiples formatos y retorna un Date.
 * Soporta: ISO 'YYYY-MM-DD', 'dd-mmm-yy', 'dd-mmm-yyyy'
 */
function parseFechaCompra(fechaCompra: string): Date | null {
  if (!fechaCompra) return null;

  // Formato ISO: YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss...
  const isoMatch = fechaCompra.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // Formato legado: dd-mmm-yy o dd-mmm-yyyy (ej: 28-oct-22, 15-mar-2021)
  const monthMap: Record<string, number> = {
    ene: 0, jan: 0, feb: 1, mar: 2, abr: 3, apr: 3, may: 4,
    jun: 5, jul: 6, ago: 7, aug: 7, sep: 8, oct: 9, nov: 10, dic: 11, dec: 11,
  };
  const parts = fechaCompra.toLowerCase().split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = monthMap[parts[1]];
    const yearStr = parts[2];
    const year = parseInt(yearStr.length === 2 ? `20${yearStr}` : yearStr, 10);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  // Último recurso
  const parsed = new Date(fechaCompra);
  return isNaN(parsed.getTime()) ? null : parsed;
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
  const reference = fechaCalculo ?? new Date();
  const purchaseDate = parseFechaCompra(fechaCompra);

  // Años de uso como fracción decimal (días exactos / 365)
  const yearsUsedExact = purchaseDate
    ? Math.max(0, (reference.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : 0;
  const yearsUsed = Math.floor(yearsUsedExact);

  const depreciationPerYear = valor / vidaUtil;
  const accumulatedDepreciation = Math.min(valor, depreciationPerYear * yearsUsedExact);
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
