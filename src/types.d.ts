import type { DefaultSession } from 'next-auth'; import type { Role } from '@prisma/client';
declare module 'next-auth' { interface Session { user: DefaultSession['user'] & {id:string;role:Role;canPublish:boolean} } interface User {role:Role;canPublish:boolean} }
