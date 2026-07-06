type ExpectedHeader =
  | string
  | RegExp
  | ((value: string | null) => boolean);

type RequestExpectation = {
  bodyIncludes?: string[];
  bodyExcludes?: string[];
  headers?: Record<string, ExpectedHeader>;
  name: string;
  path: string;
  method?: 'GET' | 'POST';
  status: number;
};

type TestResult = {
  details: string[];
  name: string;
  passed: boolean;
};

const baseUrl = resolveBaseUrl();
const allowInsecureTls = ['1', 'true', 'yes'].includes((process.env.SECURITY_TEST_INSECURE_TLS || '').trim().toLowerCase());

if (allowInsecureTls) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('Warning: SECURITY_TEST_INSECURE_TLS is enabled. TLS certificate validation is temporarily disabled for diagnostics.\n');
}

const checks: RequestExpectation[] = [
  {
    name: 'API health responds',
    path: '/api/health',
    status: 200,
    headers: {
      'strict-transport-security': /max-age=/i,
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
    },
    bodyIncludes: ['"ok":true', '"service":"store-api"'],
  },
  {
    name: 'Admin session stays public but empty',
    path: '/api/admin/session',
    status: 200,
    headers: {
      'cache-control': /no-store/i,
      'x-ratelimit-limit': (value) => Number(value || 0) >= 1,
    },
    bodyIncludes: ['"authenticated":false'],
  },
  {
    name: 'Admin audit logs require authentication',
    path: '/api/admin/audit-logs',
    status: 401,
    headers: {
      'cache-control': /no-store/i,
    },
    bodyIncludes: ['"code":"ADMIN_UNAUTHORIZED"'],
  },
  {
    name: 'Stripe admin status requires authentication',
    path: '/api/integrations/stripe/status',
    status: 401,
    headers: {
      'cache-control': /no-store/i,
    },
    bodyIncludes: ['"code":"ADMIN_UNAUTHORIZED"'],
  },
  {
    name: 'Customer session stays public but empty',
    path: '/api/account/session',
    status: 200,
    headers: {
      'cache-control': /no-store/i,
    },
    bodyIncludes: ['"authenticated":false'],
  },
  {
    name: 'Ready endpoint hides internal paths in production',
    path: '/api/ready',
    status: 200,
    bodyIncludes: ['"ok":true', '"service":"store-api"'],
    bodyExcludes: ['uploadsRoot', 'appBaseUrl'],
  },
  {
    name: 'Stripe session-status rejects missing identifiers',
    path: '/api/integrations/stripe/session-status',
    status: 400,
    headers: {
      'cache-control': /no-store/i,
      'x-ratelimit-limit': '30',
    },
    bodyIncludes: ['session_id and order_number are required'],
  },
  {
    name: 'Stripe webhook rejects unsigned requests',
    path: '/api/integrations/stripe/webhook',
    method: 'POST',
    status: 400,
    headers: {
      'cache-control': /no-store/i,
      'x-ratelimit-limit': '120',
    },
    bodyIncludes: ['"success":false'],
    bodyExcludes: ['eventId', 'orderNumber', 'sessionId', 'webhookSource'],
  },
  {
    name: 'Stripe checkout session rejects invalid public request',
    path: '/api/integrations/stripe/checkout-session',
    method: 'POST',
    status: 400,
    headers: {
      'cache-control': /no-store/i,
      'x-ratelimit-limit': '15',
    },
    bodyIncludes: ['"success":false'],
  },
];

async function main() {
  console.log(`\nSecurity smoke test against ${baseUrl}\n`);

  const results: TestResult[] = [];

  for (const check of checks) {
    results.push(await runCheck(check));
  }

  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;

  for (const result of results) {
    const marker = result.passed ? 'PASS' : 'FAIL';
    console.log(`[${marker}] ${result.name}`);
    for (const detail of result.details) {
      console.log(`  - ${detail}`);
    }
  }

  console.log(`\nSummary: ${passed}/${results.length} passed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

async function runCheck(check: RequestExpectation): Promise<TestResult> {
  const url = new URL(check.path, ensureTrailingSlash(baseUrl)).toString();
  const response = await fetch(url, {
    method: check.method || 'GET',
    headers: {
      Accept: 'application/json',
    },
  });
  const bodyText = await response.text();
  const details: string[] = [`${response.status} ${response.statusText}`];
  let passed = response.status === check.status;

  if (!passed) {
    details.push(`expected status ${check.status}`);
  }

  for (const [headerName, expected] of Object.entries(check.headers || {})) {
    const actual = response.headers.get(headerName);
    const headerPassed = matchesExpectedHeader(actual, expected);

    if (!headerPassed) {
      passed = false;
      details.push(`header ${headerName} failed (actual: ${actual ?? 'missing'})`);
    }
  }

  for (const text of check.bodyIncludes || []) {
    if (!bodyText.includes(text)) {
      passed = false;
      details.push(`body missing "${text}"`);
    }
  }

  for (const text of check.bodyExcludes || []) {
    if (bodyText.includes(text)) {
      passed = false;
      details.push(`body exposed "${text}"`);
    }
  }

  if (passed) {
    details.push('all expectations satisfied');
  }

  return {
    name: check.name,
    passed,
    details,
  };
}

function matchesExpectedHeader(actual: string | null, expected: ExpectedHeader) {
  if (typeof expected === 'string') {
    return actual === expected;
  }

  if (expected instanceof RegExp) {
    return expected.test(actual || '');
  }

  return expected(actual);
}

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`;
}

function resolveBaseUrl() {
  const fromArg = process.argv[2]?.trim();
  const fromEnv = process.env.SECURITY_TEST_BASE_URL?.trim();
  const fallback = process.env.APP_BASE_URL?.trim() || 'https://zenvapparel.com';

  return (fromArg || fromEnv || fallback).replace(/\/$/, '');
}

void main().catch((error) => {
  console.error('\nSecurity smoke test failed unexpectedly.');
  if (error instanceof Error && /certificate|tls|ssl/i.test(error.message)) {
    console.error(`${error.message}\nHint: if this is only a chain/certificate diagnostic on the VPS, rerun with SECURITY_TEST_INSECURE_TLS=1.`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
