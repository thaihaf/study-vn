import { redirect } from 'next/navigation'; import { auth } from '@/auth'; import { assertPermission, type Permission } from './permissions';
export async function requireUser(){const session=await auth();if(!session?.user)redirect('/login');return session.user;}
export async function requirePermission(permission:Permission){const user=await requireUser();assertPermission(user.role,permission,user.canPublish);return user;}
