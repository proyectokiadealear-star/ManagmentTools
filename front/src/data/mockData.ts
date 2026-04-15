
export interface CustodyTransfer {
  id: string;
  assetId: string;
  fromCustodio: string;
  toCustodio: string;
  fecha: string;
  autorizadoPor: string;
}

export interface Asset {
  id: string;
  codigo: string;
  descripcion: string;
  tipo: string;
  marca: string;
  modelo: string;
  serial: string;
  placa: string;
  proveedor: string;
  factura: string;
  fechaCompra: string;
  valor: number;
  ubicacion: string;
  area?: string;
  bahia?: string;
  rack?: string;
  caja?: string;
  sede?: string;
  responsable: string;
  custodio: string;
  encargado: string;
  estado: 'Activo' | 'En Reparación' | 'Dado de Baja';
  vidaUtil: number;
  observacion: string;
  comentario: string;
  itemProveedor: string;
  capacidadEspecificacion: string;
  periodicidad: string;
  fechaUltimoMantenimiento?: string;
  imagenUrl?: string;
}

export interface DataQualityIssue {
  campo: string;
  problema: string;
  impacto: string;
  ejemplos: string;
  severidad: 'Alta' | 'Media' | 'Baja';
}

export interface Proforma {
  id: string;
  wishlistItemId: string;
  proveedor: string;
  contacto: string;
  valor: number;
  fechaCotizacion: string;
  validezDias: number;
  condiciones: string;
  seleccionada: boolean;
}

export interface WishlistItem {
  id: string;
  descripcion: string;
  tipo: 'Tablet' | 'Herramienta' | 'Conector' | 'Equipo';
  marca: string;
  modelo: string;
  cantidad: number;
  prioridad: 'Alta' | 'Media' | 'Baja';
  justificacion: string;
  solicitadoPor: string;
  fechaSolicitud: string;
  estado: 'Pendiente' | 'Cotizando' | 'Aprobado' | 'Comprado';
  proformas: Proforma[];
}

// ─── PILAR 2: Planificación Oportuna ───────────────────────────────────────

export type SemaforoEstado = 'verde' | 'amarillo' | 'rojo';

export interface ProformaServicio {
  id: string;
  proveedor: string;
  contacto: string;
  telefono: string;
  correo: string;
  descripcionServicio: string;
  valorManoObra: number;
  valorRepuestos: number;
  valorTotal: number;
  tiempoEstimadoDias: number;
  garantiaDias: number;
  fechaCotizacion: string;
  validezDias: number;
  condiciones: string;
  seleccionada: boolean;
  documentoUrl?: string;
}

export interface MantenimientoPreventivo {
  id: string;
  assetId: string;
  assetDescripcion: string;
  tipo: string;
  periodicidad: 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual';
  ultimoMantenimiento: string;
  proximoMantenimiento: string;
  responsable: string;
  estado: SemaforoEstado;
  diasRestantes: number;
  observacion?: string;
  ejecutado: boolean;
  proformas: ProformaServicio[];
  firmaDocumentoUrl?: string;
}

export interface FallaCorrectiva {
  id: string;
  assetId: string;
  assetDescripcion: string;
  fechaFalla: string;
  descripcionFalla: string;
  tipoCausa: 'Eléctrica' | 'Mecánica' | 'Software' | 'Desgaste' | 'Accidente';
  tiempoParada: number;
  fechaSolicitudAutorizacion: string;
  fechaAutorizacion: string | null;
  horasEsperaAutorizacion: number | null;
  costoReparacion: number;
  proveedor: string;
  tecnico: string;
  estado: 'Pendiente Autorización' | 'En Reparación' | 'Resuelto';
  evidenciaFoto?: string;
  solucion?: string;
  proformas: ProformaServicio[];
  firmaDocumentoUrl?: string;
}

export type TipoCotizacion = 'Correctivo' | 'Preventivo' | 'Correctivo y Preventivo';

export interface CotizacionRegistro {
  id: string;
  assetId: string;
  assetDescripcion: string;
  tipo: TipoCotizacion;
  descripcionTrabajo: string;
  fechaRegistro: string;
  creadoPor: string;
  proformas: ProformaServicio[];
  estado: 'Borrador' | 'Completa' | 'Aprobada';
  fallaId?: string;
  mantenimientoId?: string;
}

// ─── PILAR 3: Control Riguroso ─────────────────────────────────────────────

export type EstadoSolicitudPrestamo = 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Devuelto' | 'Vencido';
export type EstadoDevolucion = 'Nueva' | 'Usada Normal' | 'Dañada' | 'Incompleta';

export interface SolicitudPrestamo {
  id: string;
  assetId: string;
  assetDescripcion: string;
  assetPlaca: string;
  solicitante: string;
  ordenTrabajo: string;
  motivoUso: string;
  fechaSolicitud: string;
  fechaAprobacion?: string;
  aprobadoPor?: string;
  firmaDigital?: string;
  fechaSalida?: string;
  fechaDevolucionEstimada: string;
  fechaDevolucionReal?: string;
  estadoDevolucion?: EstadoDevolucion;
  fotoDevolucionUrl?: string;
  observacionDevolucion?: string;
  estado: EstadoSolicitudPrestamo;
  motivoRechazo?: string;
}

export interface InspeccionFotografica {
  id: string;
  tecnico: string;
  inspeccionadoPor: string;
  fechaInspeccion: string;
  ubicacion: string;
  fotoActualUrl: string;
  fotoBaseUrl?: string;
  discrepancias: string[];
  tieneDiscrepancias: boolean;
  reporteGenerado: boolean;
  observaciones?: string;
}

export interface ActaDevolucion {
  id: string;
  solicitudPrestamoId: string;
  assetId: string;
  assetDescripcion: string;
  tecnico: string;
  firmadoPor: string;
  fechaEmision: string;
  condiciones: string;
  estadoAlDevolver: EstadoDevolucion;
  fotoEvidenciaUrl?: string;
  requiereDescuento: boolean;
  valorReposicion?: number;
  documentoNominaGenerado: boolean;
  observaciones?: string;
}

// ─── PILAR 4: Optimización Eficiente de Insumos y EPP ──────────────────────

export type CategoriaInsumo = 'Lubricante' | 'Filtro' | 'Refrigerante' | 'Frenos' | 'Eléctrico' | 'Otro';
export type CategoriaEPP = 'Guantes' | 'Lentes' | 'Calzado' | 'Mascarilla' | 'Overol' | 'Otro';

export interface ConsumoInsumo {
  id: string;
  ordenTrabajo: string;
  tecnico: string;
  fecha: string;
  insumo: string;
  categoria: CategoriaInsumo;
  cantidad: number;
  unidad: string;
  costoUnitario: number;
  costoTotal: number;
  observacion?: string;
}

export interface EntregaEPP {
  id: string;
  tecnico: string;
  area: string;
  item: string;
  categoria: CategoriaEPP;
  cantidad: number;
  fechaEntrega: string;
  fechaReposicionProgramada: string;
  entregadoPor: string;
  observacion?: string;
}

// ─── Designación de Responsables ──────────────────────────────────────────────

export type NivelResponsabilidad = 'area' | 'caja';

export type PermisoResponsabilidad =
  | 'gestionar_prestamos'
  | 'aprobar_devoluciones'
  | 'registrar_fallas'
  | 'gestionar_epp'
  | 'ver_reportes';

export type TipoAsignacion = 'titular' | 'co_responsable';

export interface PeriodoResponsabilidad {
  id: string;
  nivel: NivelResponsabilidad;
  area: string;
  caja?: string;
  personalId: string;
  personalNombre: string;
  tipo: TipoAsignacion;
  permisos: PermisoResponsabilidad[];
  fechaInicio: string;
  fechaFin?: string;
  asignadoPor: string;
  notificacionEnviada: boolean;
  observacion?: string;
}

export interface PersonalTaller {
  id: string;
  nombre: string;
  cargo: string;
  area: string;
  activo: boolean;
}

export const PERMISO_LABELS: Record<PermisoResponsabilidad, string> = {
  gestionar_prestamos: 'Gestionar Préstamos',
  aprobar_devoluciones: 'Aprobar Devoluciones',
  registrar_fallas: 'Registrar Fallas',
  gestionar_epp: 'Gestionar EPP',
  ver_reportes: 'Ver Reportes',
};
