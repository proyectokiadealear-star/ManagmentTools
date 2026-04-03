/**
 * httpClient — cliente HTTP centralizado para SURMOTOR
 *
 * - Inyecta automáticamente el token Firebase actualizado en cada request
 * - Firebase renueva el ID token de forma transparente cuando expira (cada ~1h)
 * - La sesión del usuario dura mientras el refresh token sea válido (~2 semanas por defecto en Firebase,
 *   o hasta que el usuario haga logout explícito)
 * - getIdToken(true) fuerza renovación si el token está por vencer
 */

import { auth } from '../config/firebase';
import { environment } from '../environments/environment';

const BASE_URL = environment.apiUrl || 'http://localhost:3000';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  // forceRefresh=false: devuelve el token cacheado si sigue válido, lo renueva si está por vencer
  const token = await user.getIdToken(false);
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const authHeader = await getAuthHeader();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const message = payload?.message || `Error ${res.status}: ${res.statusText}`;
    throw new Error(message);
  }

  // 204 No Content — no parsear body
  if (res.status === 204) return undefined as unknown as T;

  return res.json();
}

export const httpClient = {
  get:    <T>(path: string, headers?: Record<string, string>) =>
            request<T>(path, { method: 'GET', headers }),

  post:   <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
            request<T>(path, { method: 'POST', body, headers }),

  patch:  <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
            request<T>(path, { method: 'PATCH', body, headers }),

  put:    <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
            request<T>(path, { method: 'PUT', body, headers }),

  delete: <T>(path: string, headers?: Record<string, string>) =>
            request<T>(path, { method: 'DELETE', headers }),
};
