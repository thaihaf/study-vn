import OpenAI from 'openai';

let client: OpenAI | null = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) {
    throw new Error('AI_NOT_CONFIGURED');
  }
  client ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 45_000,
    maxRetries: 2,
  });
  return client;
}

export async function runStructured<T>({
  name,
  schema,
  developer,
  user,
}: {
  name: string;
  schema: Record<string, unknown>;
  developer: string;
  user: string;
}): Promise<T> {
  const response = await getClient().responses.create({
    model: process.env.OPENAI_MODEL!,
    store: false,
    input: [
      { role: 'developer', content: developer },
      { role: 'user', content: user },
    ],
    text: {
      format: {
        type: 'json_schema',
        name,
        strict: true,
        schema,
      },
    },
  });
  return JSON.parse(response.output_text) as T;
}

export function sourcePrompt(sources: Array<{ id: string; text: string }>) {
  if (!sources.length) return 'Không có tài liệu nguồn được chọn.';
  return sources
    .map((source) => `[SOURCE:${source.id}]\n${source.text}`)
    .join('\n\n---\n\n');
}
