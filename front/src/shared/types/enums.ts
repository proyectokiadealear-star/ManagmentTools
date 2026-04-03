// Estos enums deben mantenerse sincronizados con:
// back/src/common/enums/area-taller.enum.ts
// back/src/common/enums/sede.enum.ts

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

export enum Sede {
  SURMOTOR       = 'SURMOTOR',
  GRANDA_CENTENO = 'GRANDA_CENTENO',
  SHYRIS         = 'SHYRIS',
}

export const SEDE_LABELS: Record<Sede, string> = {
  [Sede.SURMOTOR]:       'SURMOTOR',
  [Sede.GRANDA_CENTENO]: 'Granda Centeno',
  [Sede.SHYRIS]:         'Shyris',
};

/** Lista ordenada de áreas para usar en selects */
export const AREAS_OPTIONS = Object.values(AreaTaller).map(value => ({
  value,
  label: AREA_LABELS[value],
}));

/** Lista ordenada de sedes para usar en selects */
export const SEDES_OPTIONS = Object.values(Sede).map(value => ({
  value,
  label: SEDE_LABELS[value],
}));
