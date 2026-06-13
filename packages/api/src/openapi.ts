import { zodToJsonSchema } from 'zod-to-json-schema';
import { LocksLoginSchema } from './auth/locks-login.js';
import { GithubTokenSchema } from './auth/provider-tokens.js';
import { LoginSchema, RegisterSchema } from './config.js';

const JSON_CONTENT = {
  'application/json': {
    schema: {
      type: 'object',
      additionalProperties: true,
    },
  },
};

function successResponse(description: string) {
  return {
    description,
    content: JSON_CONTENT,
  };
}

function authErrorResponse() {
  return {
    description: 'Authentication is required or the provided token is invalid.',
    content: JSON_CONTENT,
  };
}

function validationErrorResponse() {
  return {
    description: 'The request payload failed validation.',
    content: JSON_CONTENT,
  };
}

function jsonRequestBody(description: string, schema: object, example?: Record<string, unknown>) {
  return {
    required: true,
    description,
    content: {
      'application/json': {
        schema,
        ...(example ? { example } : {}),
      },
    },
  };
}

function toOpenApiSchema(schema: Parameters<typeof zodToJsonSchema>[0]) {
  const jsonSchema = zodToJsonSchema(schema, {
    target: 'openApi3',
    $refStrategy: 'none',
  }) as Record<string, unknown>;

  const { $schema: _schema, ...openApiSchema } = jsonSchema;
  return openApiSchema;
}

const REGISTER_SCHEMA = toOpenApiSchema(RegisterSchema);
const LOGIN_SCHEMA = toOpenApiSchema(LoginSchema);
const LOCKS_SCHEMA = toOpenApiSchema(LocksLoginSchema);
const GITHUB_TOKEN_SCHEMA = toOpenApiSchema(GithubTokenSchema);

function operation(
  summary: string,
  tags: string[],
  description: string,
  options?: {
    successCode?: '200' | '201';
    successDescription?: string;
    secured?: boolean;
    requestBody?: ReturnType<typeof jsonRequestBody>;
  }
) {
  const successCode = options?.successCode ?? '200';
  const responses: Record<string, ReturnType<typeof successResponse>> = {
    [successCode]: successResponse(options?.successDescription ?? 'Request completed successfully.'),
    '400': validationErrorResponse(),
  };

  if (options?.secured) {
    responses['401'] = authErrorResponse();
  }

  return {
    summary,
    description,
    tags,
    ...(options?.requestBody ? { requestBody: options.requestBody } : {}),
    ...(options?.secured ? { security: [{ bearerAuth: [] }] } : {}),
    responses,
  };
}

export function buildOpenApiSpec(baseUrl: string) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Heramb API',
      version: '0.1.0',
      description:
        'Heramb authentication API. JWT sessions with email/password, provider token sign-in, and optional GitHub/Google OAuth. Interactive docs at /docs.',
    },
    servers: [{ url: baseUrl }],
    tags: [
      {
        name: 'Health',
        description: 'Service health checks.',
      },
      {
        name: 'Auth',
        description: 'Authentication, sessions, and OAuth flows.',
      },
    ],
    paths: {
      '/health': {
        get: operation('Health check', ['Health'], 'Returns API service status.', {
          successDescription: 'API is healthy.',
        }),
      },
      '/auth/methods': {
        get: operation(
          'List sign-in methods',
          ['Auth'],
          'Returns which authentication methods are currently enabled (OAuth depends on env vars).',
          { successDescription: 'Available sign-in methods returned.' }
        ),
      },
      '/auth/register': {
        post: operation(
          'Register with email',
          ['Auth'],
          'Creates a new account and returns a JWT session.',
          {
            successCode: '201',
            successDescription: 'Account created and session returned.',
            requestBody: jsonRequestBody(
              'Registration payload.',
              REGISTER_SCHEMA,
              { name: 'Demo User', email: 'you@example.com', password: 'securepass123' }
            ),
          }
        ),
      },
      '/auth/login': {
        post: operation(
          'Login with email',
          ['Auth'],
          'Authenticates with email and password. Demo account: demo@heramb.dev / heramb123',
          {
            requestBody: jsonRequestBody(
              'Login payload.',
              LOGIN_SCHEMA,
              { email: 'demo@heramb.dev', password: 'heramb123' }
            ),
          }
        ),
      },
      '/auth/locks': {
        post: operation(
          'Sign in with provider tokens',
          ['Auth'],
          'Paste GitHub, Railway, and/or Vercel tokens. Verifies each against the provider API and returns a JWT session with verified locks.',
          {
            requestBody: jsonRequestBody(
              'Provider token payload. At least one of github, railway, or vercel is required.',
              LOCKS_SCHEMA,
              { github: 'ghp_...', railway: 'rw_...', vercel: 'vercel_...' }
            ),
          }
        ),
      },
      '/auth/github-token': {
        post: operation(
          'Sign in with GitHub PAT',
          ['Auth'],
          'Sign in using a GitHub personal access token only.',
          {
            requestBody: jsonRequestBody(
              'GitHub personal access token.',
              GITHUB_TOKEN_SCHEMA,
              { token: 'ghp_...' }
            ),
          }
        ),
      },
      '/auth/me': {
        get: operation('Get current user', ['Auth'], 'Returns the authenticated user profile.', {
          secured: true,
          successDescription: 'Current user profile returned.',
        }),
      },
      '/auth/oauth/github': {
        get: {
          summary: 'Start GitHub OAuth',
          description:
            'Redirects to GitHub authorization. Requires GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET. Returns 503 if OAuth is not configured.',
          tags: ['Auth'],
          responses: {
            '302': { description: 'Redirect to GitHub authorization.' },
            '503': {
              description: 'GitHub OAuth not configured.',
              content: JSON_CONTENT,
            },
          },
        },
      },
      '/auth/oauth/github/callback': {
        get: {
          summary: 'GitHub OAuth callback',
          description: 'Handles the GitHub OAuth callback and redirects to the web app with a session.',
          tags: ['Auth'],
          parameters: [
            { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'state', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '302': { description: 'Redirect to web app login or dashboard.' },
          },
        },
      },
      '/auth/oauth/google': {
        get: {
          summary: 'Start Google OAuth',
          description:
            'Redirects to Google authorization. Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. Returns 503 if OAuth is not configured.',
          tags: ['Auth'],
          responses: {
            '302': { description: 'Redirect to Google authorization.' },
            '503': {
              description: 'Google OAuth not configured.',
              content: JSON_CONTENT,
            },
          },
        },
      },
      '/auth/oauth/google/callback': {
        get: {
          summary: 'Google OAuth callback',
          description: 'Handles the Google OAuth callback and redirects to the web app with a session.',
          tags: ['Auth'],
          parameters: [
            { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'state', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '302': { description: 'Redirect to web app login or dashboard.' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  };
}

export const DOCS_FAVICON_PATH = '/docs-favicon.svg';

export const DOCS_FAVICON_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="16" fill="#0f0d0a"/>
  <text x="32" y="42" text-anchor="middle" font-size="32">🔑</text>
</svg>`;

export const SCALAR_CUSTOM_CSS = `
  :root {
    --scalar-color-1: #f4efe2;
    --scalar-color-2: #d9c7a6;
    --scalar-color-3: #e8a838;
    --scalar-color-accent: #e8a838;
    --scalar-background-1: #0f0d0a;
    --scalar-background-2: #1a1612;
    --scalar-background-3: #241e18;
    --scalar-sidebar-background-1: #120f0c;
    --scalar-sidebar-item-hover-background: rgba(232, 168, 56, 0.14);
    --scalar-sidebar-color-1: #f6ecd9;
  }

  .scalar-app {
    font-family: 'Inter', sans-serif;
  }
`;
