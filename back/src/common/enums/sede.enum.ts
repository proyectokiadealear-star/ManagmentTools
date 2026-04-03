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
