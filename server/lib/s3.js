import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { isS3Configured } from './env.js';

let client = null;

function getClient() {
  if (!isS3Configured()) return null;
  if (client) return client;
  const region = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
  const endpoint = process.env.S3_ENDPOINT || undefined;
  client = new S3Client({
    region,
    endpoint,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  return client;
}

/**
 * @param {object} opts
 * @param {string} opts.key Object key (e.g. uploads/userId/uuid.jpg)
 * @param {string} opts.contentType
 * @param {number} [opts.expiresIn=3600]
 */
export async function getPresignedPutUrl({ key, contentType, expiresIn = 3600 }) {
  const c = getClient();
  if (!c) {
    throw new Error('S3 is not configured (set S3_BUCKET, S3_REGION, credentials)');
  }
  const bucket = process.env.S3_BUCKET;
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  });
  const url = await getSignedUrl(c, cmd, { expiresIn });
  return { url, bucket, key, publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || null };
}

export function s3Ready() {
  return isS3Configured() && !!getClient();
}
