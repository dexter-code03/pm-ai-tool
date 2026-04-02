/**
 * Record successful generation duration for KPI / p95 (fire-and-forget).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} userId
 * @param {string} kind
 * @param {number} durationMs
 */
export async function recordGenerationMetric(prisma, userId, kind, durationMs) {
  const ms = Math.min(Math.max(0, Math.floor(durationMs)), 1_800_000);
  try {
    await prisma.generationMetric.create({
      data: { userId, kind, durationMs: ms }
    });
  } catch (e) {
    console.error('[generationMetric]', e?.message || e);
  }
}
