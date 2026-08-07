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

        if (
          !user?.passwordHash ||
          !(await bcrypt.compare(parsed.data.password, user.passwordHash))
        ) {
          return null;
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
