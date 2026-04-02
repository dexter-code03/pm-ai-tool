const DEFAULT_JWT = 'dev-only-change-in-production';

/**
 * @returns {boolean}
 */
export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Fail fast when production uses the default JWT secret.
 */
export function assertProductionJwtSecret() {
  const secret = process.env.JWT_SECRET || DEFAULT_JWT;
  if (isProduction() && secret === DEFAULT_JWT) {
    throw new Error(
      'JWT_SECRET must be set to a strong random value when NODE_ENV=production'
    );
  }
}

/**
 * @returns {string}
 */
export function getJwtSecret() {
  return process.env.JWT_SECRET || DEFAULT_JWT;
}

/**
 * True when object storage env is present (S3-compatible).
 */
export function isS3Configured() {
  return !!(
    process.env.S3_BUCKET &&
    process.env.S3_REGION &&
    (process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) &&
    (process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY)
  );
}
