/**
 * Load env from predictable paths (not `process.cwd()`), so `DATABASE_URL` works
 * when the API is started from the monorepo root or any cwd.
 *
 * Order: repo root `.env`, then `server/.env` (override) so server-specific
 * values win when both exist.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.join(__dirname, '..', '.env');
const serverEnv = path.join(__dirname, '.env');

dotenv.config({ path: rootEnv });
dotenv.config({ path: serverEnv, override: true });
