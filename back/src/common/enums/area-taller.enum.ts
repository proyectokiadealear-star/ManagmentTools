export enum AreaTaller {
  TALLER     = 'TALLER',
  ENDEREZADO = 'ENDEREZADO',
  PINTURA    = 'PINTURA',
  RECEPCION  = 'RECEPCION',
  BODEGA     = 'BODEGA',
}

export const AREA_LABELS: Record<AreaTaller, string> = {
  [AreaTaller.TALLER]:     'Taller Mecánica',
  [AreaTaller.ENDEREZADO]: 'Enderezado',
  [AreaTaller.PINTURA]:    'Pintura',
  [AreaTaller.RECEPCION]:  'Recepción',
  [AreaTaller.BODEGA]:     'Bodega / Repuestos',
};
