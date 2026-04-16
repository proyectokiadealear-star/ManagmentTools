export type CanonicalUserRole = 'personal' | 'tecnico' | 'jefe';

export type AssignmentBusinessRole =
  | 'personal_taller'
  | 'tecnico_lider'
  | 'no_elegible';

export function projectAssignmentRole(rol: string): AssignmentBusinessRole {
  if (rol === 'personal') return 'personal_taller';
  if (rol === 'tecnico') return 'tecnico_lider';
  return 'no_elegible';
}

export function isAssignableRole(rol: string): boolean {
  return projectAssignmentRole(rol) !== 'no_elegible';
}
