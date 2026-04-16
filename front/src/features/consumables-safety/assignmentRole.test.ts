import { describe, expect, it } from 'vitest';
import { isAssignableUser, projectAssignmentRole } from './assignmentRole';

describe('assignmentRole helpers', () => {
  it('proyecta roles canónicos a rol de negocio de asignación', () => {
    expect(projectAssignmentRole('personal')).toBe('personal_taller');
    expect(projectAssignmentRole('tecnico')).toBe('tecnico_lider');
    expect(projectAssignmentRole('jefe')).toBe('no_elegible');
  });

  it('filtra elegibilidad por activo y rol', () => {
    expect(isAssignableUser({ rol: 'personal', activo: true } as any)).toBe(true);
    expect(isAssignableUser({ rol: 'tecnico', activo: true } as any)).toBe(true);
    expect(isAssignableUser({ rol: 'jefe', activo: true } as any)).toBe(false);
    expect(isAssignableUser({ rol: 'personal', activo: false } as any)).toBe(false);
  });
});
