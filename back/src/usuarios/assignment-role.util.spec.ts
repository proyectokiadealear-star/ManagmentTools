import { isAssignableRole, projectAssignmentRole } from './assignment-role.util';

describe('assignment-role.util', () => {
  it('proyecta roles canónicos a roles de asignación', () => {
    expect(projectAssignmentRole('personal')).toBe('personal_taller');
    expect(projectAssignmentRole('tecnico')).toBe('tecnico_lider');
    expect(projectAssignmentRole('jefe')).toBe('no_elegible');
    expect(projectAssignmentRole('otro')).toBe('no_elegible');
  });

  it('marca elegibilidad por rol', () => {
    expect(isAssignableRole('personal')).toBe(true);
    expect(isAssignableRole('tecnico')).toBe(true);
    expect(isAssignableRole('jefe')).toBe(false);
    expect(isAssignableRole('admin')).toBe(false);
  });
});
