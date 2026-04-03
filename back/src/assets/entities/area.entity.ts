import { Sede } from '../../common/enums/sede.enum';
import { AreaTaller } from '../../common/enums/area-taller.enum';

export interface Area {
  id: string;

  /** Clave de enum — fuente de verdad para la lógica de negocio */
  tipo: AreaTaller;

  /** Nombre para mostrar (ej: "Taller Mecánica") */
  nombre: string;

  descripcion?: string;
  capacidad?: number;
  estado: 'activa' | 'inactiva';

  /** Sede a la que pertenece esta área */
  sede: Sede;

  createdAt: string;
  updatedAt: string;
}
