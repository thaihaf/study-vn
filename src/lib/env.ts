import { z } from 'zod';

const optionalEmptyString = z.preprocess((value) => (value === '' ? undefined : value), z.string().optional());

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().refine((url) => (url.startsWith('postgresql://') || url.startsWith('postgres://')) && !url.includes('USER:PASSWORD'), 'must be a configured PostgreSQL URL'),
  DIRECT_URL: z.string().url().refine((url) => (url.startsWith('postgresql://') || url.startsWith('postgres://')) && !url.includes('USER:PASSWORD'), 'must be a configured PostgreSQL URL'),
  AUTH_SECRET: z.string().min(32).refine((value) => !value.startsWith('replace-with-'), 'must not be a placeholder'),
  AUTH_TRUST_HOST: z.enum(['true', 'false']).default('true'),
  OPENAI_API_KEY: optionalEmptyString,
  OPENAI_MODEL: z.string().min(1).default('gpt-5-mini'),
  AI_PROVIDER: z.enum(['openai', 'fake']).default('openai'),
  UPLOAD_DIR: z.string().min(1).default('./uploads'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().max(25 * 1024 * 1024).default(5 * 1024 * 1024),
  SEED_ADMIN_EMAIL: optionalEmptyString.pipe(z.string().email().optional()),
  SEED_ADMIN_PASSWORD: optionalEmptyString,
  SEED_LEARNER_EMAIL: optionalEmptyString.pipe(z.string().email().optional()),
  SEED_LEARNER_PASSWORD: optionalEmptyString,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Parse only on demand so public pages and builds can explain missing configuration safely. */
export function getServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  return serverEnvSchema.parse(source);
}

// There are intentionally no browser-exposed environment variables in the MVP.
export const clientEnvSchema = z.object({}).strict();
export type ClientEnv = z.infer<typeof clientEnvSchema>;
