/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const TOKEN_KEY = 'mi-receta-jwt';

/**
 * Retorna los headers de autorización para peticiones autenticadas.
 * Centraliza la construcción del token JWT que antes estaba duplicada
 * en 6+ archivos.
 */
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(TOKEN_KEY) || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Retorna solo el header de Authorization (sin Content-Type).
 * Útil para peticiones multipart o donde Content-Type se setea automáticamente.
 */
export function getAuthOnlyHeaders(): HeadersInit {
  const token = localStorage.getItem(TOKEN_KEY) || '';
  return {
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Retorna el token JWT actual o null si no hay sesión activa.
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Wrapper de fetch con headers de autorización incluidos por defecto.
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string; message?: string }).error ||
      (data as { error?: string; message?: string }).message ||
      `Error HTTP ${response.status}`
    );
  }

  return response;
}

/**
 * Wrapper de apiFetch que retorna directamente el JSON parseado.
 */
export async function apiFetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(url, options);
  return response.json() as Promise<T>;
}
