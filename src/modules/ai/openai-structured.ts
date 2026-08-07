import OpenAI from 'openai';

let client: OpenAI | null = null;
let activeModel = '';

function normalizeGatewayModel(model: string) {
  return model.includes('/') ? model : `openai/${model}`;
}

function getClient() {
  const gatewayToken =
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  const directKey = process.env.OPENAI_API_KEY;

  if (!gatewayToken && !directKey) {
    throw new Error('AI_NOT_CONFIGURED');
  }

  if (gatewayToken) {
    activeModel = normalizeGatewayModel(
      process.env.AI_GATEWAY_MODEL || process.env.OPENAI_MODEL || 'gpt-5.4',
    );
    client ??= new OpenAI({
      apiKey: gatewayToken,
      baseURL: 'https://ai-gateway.vercel.sh/v1',
      timeout: 90_000,
      maxRetries: 2,
    });
    return client;
  }

  if (!process.env.OPENAI_MODEL) throw new Error('AI_MODEL_NOT_CONFIGURED');
  activeModel = process.env.OPENAI_MODEL;
  client ??= new OpenAI({
    apiKey: directKey,
    timeout: 90_000,
    maxRetries: 2,
  });
  return client;
}

export function configuredAIModel() {
  const gatewayToken =
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (gatewayToken) {
    return normalizeGatewayModel(
      process.env.AI_GATEWAY_MODEL || process.env.OPENAI_MODEL || 'gpt-5.4',
    );
  }
  return process.env.OPENAI_MODEL || 'not-configured';
}

export function hasRealAIConfiguration() {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      (process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
  );
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
    model: activeModel,
    store: false,
    max_output_tokens: 12000,
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
  if (!response.output_text) throw new Error('AI_EMPTY_RESPONSE');
  return JSON.parse(response.output_text) as T;
}

export function sourcePrompt(sources: Array<{ id: string; text: string }>) {
  if (!sources.length) return 'Không có tài liệu nguồn được chọn.';
  return sources
    .map((source) => `[SOURCE:${source.id}]\n${source.text}`)
    .join('\n\n---\n\n');
}
