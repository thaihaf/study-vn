import { serverEnvSchema } from '../src/lib/env';

const result = serverEnvSchema.safeParse(process.env);
if (!result.success) {
  console.error('Environment validation failed (values redacted):');
  for (const issue of result.error.issues) console.error(`- ${issue.path.join('.') || 'environment'}: ${issue.message}`);
  process.exitCode = 1;
} else {
  console.log('Environment validation passed.');
  console.log(`AI provider: ${result.data.AI_PROVIDER}; OpenAI configured: ${Boolean(result.data.OPENAI_API_KEY)}`);
}
