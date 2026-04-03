export type NivelResponsabilidad = 'area' | 'caja';
export type TipoAsignacion = 'titular' | 'co_responsable';
export type PermisoResponsabilidad =
  | 'gestionar_prestamos'
  | 'aprobar_devoluciones'
  | 'registrar_fallas'
  | 'gestionar_epp'
  | 'ver_reportes';

export interface PeriodoResponsabilidad {
  id: string;
  nivel: NivelResponsabilidad;
  area: string;
  caja?: string;
  personalId: string;
  personalNombre: string;
  tipo: TipoAsignacion;
  permisos: PermisoResponsabilidad[];
  fechaInicio: string;       // ISO date YYYY-MM-DD
  fechaFin?: string;         // undefined = período activo
  asignadoPor: string;
  notificacionEnviada: boolean;
  observacion?: string;
  createdAt: string;
  updatedAt: string;
}
