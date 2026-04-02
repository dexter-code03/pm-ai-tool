import '../load-env.js';
import { PrismaClient } from '@prisma/client';

const JSON_FIELDS = {
  User: ['settings'],
  Organisation: ['settings'],
  IntegrationConfig: ['configEncrypted'],
  Prd: ['content'],
  PrdVersion: ['contentSnapshot', 'diffFromPrevious'],
  WireframeScreen: ['editHistory'],
  AuditLog: ['metadata'],
  Template: ['promptRecipe', 'tags'],
};

function serializeJsonFields(model, data) {
  const fields = JSON_FIELDS[model];
  if (!fields || !data) return data;
  const out = { ...data };
  for (const f of fields) {
    if (f in out && out[f] !== undefined && out[f] !== null && typeof out[f] !== 'string') {
      out[f] = JSON.stringify(out[f]);
    }
  }
  return out;
}

function deserializeJsonFields(model, record) {
  const fields = JSON_FIELDS[model];
  if (!fields || !record || typeof record !== 'object') return record;
  for (const f of fields) {
    if (f in record && typeof record[f] === 'string') {
      try { record[f] = JSON.parse(record[f]); } catch { /* keep as string */ }
    }
  }
  return record;
}

function deserialize(model, result) {
  if (Array.isArray(result)) return result.map(r => deserializeJsonFields(model, r));
  return deserializeJsonFields(model, result);
}

function buildQueryOverride(model) {
  return {
    async findMany({ args, query }) {
      const result = await query(args);
      return deserialize(model, result);
    },
    async findFirst({ args, query }) {
      const result = await query(args);
      return result ? deserializeJsonFields(model, result) : result;
    },
    async findUnique({ args, query }) {
      const result = await query(args);
      return result ? deserializeJsonFields(model, result) : result;
    },
    async create({ args, query }) {
      if (args.data) args.data = serializeJsonFields(model, args.data);
      const result = await query(args);
      return deserializeJsonFields(model, result);
    },
    async update({ args, query }) {
      if (args.data) args.data = serializeJsonFields(model, args.data);
      const result = await query(args);
      return deserializeJsonFields(model, result);
    },
    async upsert({ args, query }) {
      if (args.create) args.create = serializeJsonFields(model, args.create);
      if (args.update) args.update = serializeJsonFields(model, args.update);
      const result = await query(args);
      return deserializeJsonFields(model, result);
    },
  };
}

const queryOverrides = {};
for (const model of Object.keys(JSON_FIELDS)) {
  const key = model.charAt(0).toLowerCase() + model.slice(1);
  queryOverrides[key] = buildQueryOverride(model);
}

export const prisma = new PrismaClient().$extends({
  query: queryOverrides,
});
