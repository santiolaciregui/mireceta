import { Request } from 'express';

/**
 * Extracts the tenantId from the authenticated request user with a safe fallback.
 */
export function getTenantId(req: Request, defaultTenant: string = 'TEN-0001'): string {
  const user = req.user as Record<string, any> | undefined;
  return user?.tenantId || defaultTenant;
}

/**
 * Safely retrieves the authenticated user object from the request.
 */
export function getCurrentUser(req: Request): Record<string, any> | undefined {
  return req.user as Record<string, any> | undefined;
}
