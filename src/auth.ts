import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

import { db } from '@/lib/db';

const input = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: { type: 'password' },
      },
      authorize: async (raw) => {
        const parsed = input.safeParse(raw);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user?.passwordHash) return null;

        const recentFailures = await db.auditLog.count({
          where: {
            actorId: user.id,
            action: 'AUTH_LOGIN_FAILED',
            createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          },
        });
        if (recentFailures >= 10) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) {
          await db.auditLog.create({
            data: {
              actorId: user.id,
              action: 'AUTH_LOGIN_FAILED',
              entityType: 'User',
              entityId: user.id,
            },
          });
          return null;
        }

        if (user.role !== 'LEARNER') {
          await db.auditLog.create({
            data: {
              actorId: user.id,
              action: 'AUTH_ADMIN_LOGIN_SUCCESS',
              entityType: 'User',
              entityId: user.id,
            },
          });
        }
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.canPublish = user.canPublish;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? '';
      session.user.role = token.role as Role;
      session.user.canPublish = Boolean(token.canPublish);
      return session;
    },
  },
});
