import { Sede } from '../common/enums/sede.enum';
import { AreaTaller } from '../common/enums/area-taller.enum';

export type RolUsuario = 'personal' | 'tecnico' | 'jefe';

/**
 * Usuario del sistema SURMOTOR.
 *
 * Preparado para Firebase Authentication:
 *   - `uid`   → futuro UID de Firebase Auth (vacío hasta que se conecte Auth)
 *   - `email` → será el identificador de autenticación
 *   - `activo`→ cuando se desactive, en Auth se deshabilitará la cuenta
 */
export interface Usuario {
  id: string;

  /** UID de Firebase Authentication (vacío en modo demo) */
  uid: string;

  nombre: string;
  email: string;
  rol: RolUsuario;
  sede: Sede;
  area: AreaTaller;

  /** false = desactivado (equivale a disable en Firebase Auth) */
  activo: boolean;

  /** Foto de perfil — URL de Firebase Storage o placeholder */
  fotoUrl?: string;

  createdAt: string;
  updatedAt: string;
}
