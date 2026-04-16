import type { RolUsuario, Usuario } from '../../services/usuariosService';

export type AssignmentBusinessRole =
  | 'personal_taller'
  | 'tecnico_lider'
  | 'no_elegible';

export function projectAssignmentRole(rol: RolUsuario): AssignmentBusinessRole {
  if (rol === 'personal') return 'personal_taller';
  if (rol === 'tecnico') return 'tecnico_lider';
  return 'no_elegible';
}

export function isAssignableUser(user: Pick<Usuario, 'rol' | 'activo'>): boolean {
  return user.activo && projectAssignmentRole(user.rol) !== 'no_elegible';
}
