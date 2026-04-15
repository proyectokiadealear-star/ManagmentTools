export interface Ubicacion {
  areaId: string;
  areaNombre?: string;
  bahiaId?: string;
  bahiaNombre?: string;
  rackId?: string;
  rackNombre?: string;
  cajaId?: string;
  cajaNumero?: string;
  sede?: string;
}

export interface Movimiento {
  id: string;
  activoId: string;
  activoNombre?: string;
  desde?: Ubicacion;
  hasta: Ubicacion;
  motivo: string;
  usuarioId: string;
  usuarioNombre?: string;
  fecha: string;
  tipo: 'transferencia' | 'asignacion' | 'baja';
}
