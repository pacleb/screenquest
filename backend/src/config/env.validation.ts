type Env = Record<string, unknown>;

const REQUIRED_IN_PRODUCTION = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'APP_URL',
  'FRONTEND_URL',
  'CMS_URL',
  'EMAIL_FROM',
  'REVENUECAT_WEBHOOK_AUTH_KEY',
] as const;

/**
 * Validates runtime environment and throws a single actionable error when
 * required variables are missing in production-like deployments.
 */
export function validateEnv(config: Env): Env {
  const nodeEnv = String(config.NODE_ENV ?? 'development').toLowerCase();
  const isProductionLike = nodeEnv === 'production' || nodeEnv === 'staging';

  if (!isProductionLike) {
    return config;
  }

  const missing = REQUIRED_IN_PRODUCTION.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for ${nodeEnv}: ${missing.join(', ')}`,
    );
  }

  return config;
}
