// usuariosService.ts — CRUD de usuarios contra /api/usuarios
// Usa httpClient (inyección automática de token Firebase Auth).

import { httpClient } from './httpClient';
import { AreaTaller, Sede } from '@shared/types/enums';

export type RolUsuario = 'personal' | 'tecnico' | 'jefe';

export interface Usuario {
  id: string;
  uid: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  sede: Sede;
  area: AreaTaller;
  activo: boolean;
  fotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateUsuarioPayload = Omit<Usuario, 'id' | 'uid' | 'createdAt' | 'updatedAt'>;
export type UpdateUsuarioPayload = Partial<CreateUsuarioPayload>;

const BASE = '/api/usuarios';

// ─────────────────────────────────────────────────────────────────────────────
// API pública (httpClient inyecta token Firebase Auth automáticamente)
// ─────────────────────────────────────────────────────────────────────────────
export async function getUsuarios(): Promise<Usuario[]> {
  return httpClient.get<Usuario[]>(BASE);
}

export async function getUsuario(id: string): Promise<Usuario> {
  return httpClient.get<Usuario>(`${BASE}/${id}`);
}

export async function createUsuario(payload: CreateUsuarioPayload): Promise<Usuario> {
  return httpClient.post<Usuario>(BASE, payload);
}

export async function updateUsuario(id: string, payload: UpdateUsuarioPayload): Promise<Usuario> {
  return httpClient.patch<Usuario>(`${BASE}/${id}`, payload);
}

export async function desactivarUsuario(id: string): Promise<Usuario> {
  return httpClient.patch<Usuario>(`${BASE}/${id}/desactivar`);
}

export async function activarUsuario(id: string): Promise<Usuario> {
  return httpClient.patch<Usuario>(`${BASE}/${id}/activar`);
}

export async function deleteUsuario(id: string): Promise<void> {
  await httpClient.delete<void>(`${BASE}/${id}`);
}

export async function seedUsuarios(): Promise<{ message: string }> {
  return httpClient.post<{ message: string }>(`${BASE}/seed`);
}
