export interface Activo {
  id: string;
  nombre: string;                // descripcion in frontend
  tipo: string;
  marca?: string;
  modelo?: string;
  serial?: string;
  placa?: string;
  codigo?: string;               // Internal inventory code (e.g. SUR-HER-001)
  factura?: string;              // Invoice number
  encargado?: string;            // Person in charge (duplicate of custodio in frontend)
  comentario?: string;           // Comments / notes
  proveedor?: string;
  fechaCompra?: string;
  valor?: number;
  valorActual?: number;          // Valor depreciado calculado
  vidaUtil?: number;             // Años de vida útil
  capacidadEspecificacion?: string; // Capacity / specs (e.g. "3.5 toneladas", "OBD2 / CAN BUS")
  periodicidad?: string;         // Maintenance periodicity (e.g. "Anual")
  itemProveedor?: string;        // Supplier item code
  areaId: string;
  bahiaId?: string;
  rackId?: string;
  cajaId?: string;
  responsable?: string;          // Responsible role (e.g. "Jefe de Taller")
  custodio?: string;             // Custodian person name
  estado: 'activo' | 'inactivo' | 'en-reparacion' | 'dado-de-baja';
  estadoOperativo: 'disponible' | 'en-prestamo' | 'en-mantenimiento' | 'danado';
  observacion?: string;
  especificaciones?: string;     // Legacy — prefer capacidadEspecificacion
  capacidad?: string;            // Legacy — prefer capacidadEspecificacion
  imagenUrl?: string;            // URL de fotografía principal
  createdAt: string;
  updatedAt: string;
  usuarioId?: string;
}
