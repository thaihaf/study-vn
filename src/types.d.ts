import type { Role } from '@prisma/client';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      role: Role;
      canPublish: boolean;
    };
  }

  interface User {
    role: Role;
    canPublish: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role;
    canPublish: boolean;
  }
}

declare module 'pdf-parse/lib/pdf-parse.js' {
  type PdfParseResult = {
    text: string;
    numpages?: number;
    info?: unknown;
    metadata?: unknown;
  };

  export default function pdfParse(buffer: Buffer): Promise<PdfParseResult>;
}
