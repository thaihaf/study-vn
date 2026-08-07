import type { Role } from '@prisma/client';
export type Permission =
  | 'course:read'
  | 'course:edit'
  | 'course:publish'
  | 'review'
  | 'source:manage'
  | 'ai:generate'
  | 'user:roles'
  | 'audit:read';
const policies: Record<Role, ReadonlySet<Permission>> = {
  SUPER_ADMIN: new Set([
    'course:read',
    'course:edit',
    'course:publish',
    'review',
    'source:manage',
    'ai:generate',
    'user:roles',
    'audit:read',
  ]),
  CONTENT_ADMIN: new Set([
    'course:read',
    'course:edit',
    'source:manage',
    'ai:generate',
  ]),
  REVIEWER: new Set(['course:read', 'review']),
  INSTRUCTOR: new Set(['course:read']),
  LEARNER: new Set(['course:read']),
};
export const can = (role: Role, permission: Permission, canPublish = false) =>
  policies[role].has(permission) ||
  (permission === 'course:publish' && role === 'CONTENT_ADMIN' && canPublish);
export function assertPermission(
  role: Role,
  permission: Permission,
  canPublish = false,
) {
  if (!can(role, permission, canPublish)) throw new Error('FORBIDDEN');
}
export const isAdmin = (role: Role) => role !== 'LEARNER';
