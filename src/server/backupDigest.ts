import { createHash } from 'node:crypto';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export type DigestColumn = {
  name: string;
  dataType: string;
  udtName: string;
  nullable: string;
  defaultValue: string | null;
  ordinal: number;
};

export type DigestTable = {
  name: string;
  columns: DigestColumn[];
  primaryKey: string[];
  constraints: string[];
  indexes: string[];
  rowSecurity?: { enabled: boolean; forced: boolean };
  policies?: string[];
  triggers?: string[];
  rows: Record<string, unknown>[];
};

export type DigestSchemaObject = { kind: string; name: string; definition: string };

export type TableDigest = { count: number; sha256: string };
export type DatabaseDigest = {
  format: 'sdinfinova-backup-digest-v2';
  tables: Record<string, TableDigest>;
  schemaObjects: DigestSchemaObject[];
  schemaSha256: string;
  migrationSha256: string | null;
};

const SUPPORTED_TYPES = new Set([
  'text', 'character varying', 'character', 'integer', 'bigint', 'smallint',
  'numeric', 'real', 'double precision', 'boolean', 'date',
  'timestamp with time zone', 'timestamp without time zone',
  'time with time zone', 'time without time zone', 'json', 'jsonb', 'bytea',
  'uuid',
]);

function normalizeNumeric(value: string): string {
  const text = value.trim();
  if (/^[+-]?nan$/i.test(text)) return 'NaN';
  if (/^\+?infinity$/i.test(text)) return 'Infinity';
  if (/^-infinity$/i.test(text)) return '-Infinity';
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (!match || (!match[2] && !match[3])) throw new Error('Unsupported numeric value');
  const exponent = Number(match[4] || '0');
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 10000) throw new Error('Numeric exponent out of range');
  let digits = `${match[2] || ''}${match[3] || ''}`;
  let scale = (match[3] || '').length - exponent;
  digits = digits.replace(/^0+/, '') || '0';
  if (digits === '0') return '0';
  if (scale < 0) {
    digits += '0'.repeat(-scale);
    scale = 0;
  }
  if (scale >= digits.length) digits = `${'0'.repeat(scale - digits.length + 1)}${digits}`;
  let whole = scale ? digits.slice(0, -scale) : digits;
  let fraction = scale ? digits.slice(-scale) : '';
  fraction = fraction.replace(/0+$/, '');
  whole = whole.replace(/^0+/, '') || '0';
  return `${match[1] === '-' ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

function parseJsonCanonical(text: string): string {
  let position = 0;
  const skipWhitespace = () => { while (/\s/.test(text[position] || '')) position += 1; };
  const parseString = (): string => {
    const start = position;
    if (text[position] !== '"') throw new Error('Invalid JSON string');
    position += 1;
    while (position < text.length) {
      const ch = text[position++];
      if (ch === '\\') { position += 1; continue; }
      if (ch === '"') return JSON.stringify(JSON.parse(text.slice(start, position)) as string);
      if (ch < ' ') throw new Error('Invalid JSON control character');
    }
    throw new Error('Unterminated JSON string');
  };
  const parseValue = (): string => {
    skipWhitespace();
    const ch = text[position];
    if (ch === '"') return parseString();
    if (ch === '[') {
      position += 1;
      skipWhitespace();
      const values: string[] = [];
      if (text[position] === ']') { position += 1; return '[]'; }
      while (true) {
        values.push(parseValue());
        skipWhitespace();
        if (text[position] === ']') { position += 1; break; }
        if (text[position++] !== ',') throw new Error('Invalid JSON array');
      }
      return `[${values.join(',')}]`;
    }
    if (ch === '{') {
      position += 1;
      skipWhitespace();
      const entries: Array<[string, string]> = [];
      const seen = new Set<string>();
      if (text[position] === '}') { position += 1; return '{}'; }
      while (true) {
        skipWhitespace();
        const keyStart = position;
        const keyJson = parseString();
        const key = JSON.parse(keyJson) as string;
        if (seen.has(key)) throw new Error('Duplicate JSON object key is unsupported');
        seen.add(key);
        skipWhitespace();
        if (text[position++] !== ':') throw new Error('Invalid JSON object');
        entries.push([text.slice(keyStart, position - 1).trim().replace(/,$/, ''), parseValue()]);
        skipWhitespace();
        if (text[position] === '}') { position += 1; break; }
        if (text[position++] !== ',') throw new Error('Invalid JSON object');
      }
      entries.sort((a, b) => {
        const ka = JSON.parse(a[0]) as string;
        const kb = JSON.parse(b[0]) as string;
        return ka < kb ? -1 : ka > kb ? 1 : 0;
      });
      return `{${entries.map(([key, value]) => `${key}:${value}`).join(',')}}`;
    }
    for (const literal of ['true', 'false', 'null']) {
      if (text.startsWith(literal, position)) { position += literal.length; return literal; }
    }
    const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(position));
    if (!number) throw new Error('Unsupported or invalid JSON value');
    position += number[0].length;
    return normalizeNumeric(number[0]);
  };

  const canonical = parseValue();
  skipWhitespace();
  if (position !== text.length) throw new Error('Trailing JSON input');
  return canonical;
}

function canonicalTimestamp(value: string | Date, withTimezone: boolean): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error('Invalid date value');
    if (withTimezone) return value.toISOString();
    return value.toISOString().replace(/Z$/, '');
  }
  const text = value.trim();
  if (withTimezone) {
    const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)$/i.exec(text);
    if (!match) throw new Error('Unsupported timestamp with time zone');
    const [, datePart, timePart, rawFraction = '', rawOffset] = match;
    const base = new Date(`${datePart}T${timePart}Z`);
    if (Number.isNaN(base.getTime()) || base.toISOString().slice(0, 19) !== `${datePart}T${timePart}`) throw new Error('Invalid timestamp value');
    let offsetMinutes = 0;
    if (rawOffset.toUpperCase() !== 'Z') {
      const offset = /^([+-])(\d{2})(?::?(\d{2}))?$/.exec(rawOffset);
      if (!offset) throw new Error('Invalid timestamp offset');
      const hours = Number(offset[2]);
      const minutes = Number(offset[3] || '0');
      if (hours > 15 || minutes > 59) throw new Error('Timestamp offset out of range');
      offsetMinutes = (offset[1] === '+' ? 1 : -1) * (hours * 60 + minutes);
    }
    const utcSecond = new Date(base.getTime() - offsetMinutes * 60_000).toISOString().slice(0, 19);
    const fraction = rawFraction.replace(/0+$/, '');
    return `${utcSecond}${fraction ? `.${fraction}` : ''}Z`;
  }
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?$/.exec(text);
  if (!match) throw new Error('Unsupported timestamp without time zone');
  const fraction = (match[3] || '').replace(/0+$/, '');
  return `${match[1]}T${match[2]}${fraction ? `.${fraction}` : ''}`;
}

export function canonicalizeCell(dataType: string, value: unknown): string {
  const type = dataType.toLowerCase();
  if (!SUPPORTED_TYPES.has(dataType) && !SUPPORTED_TYPES.has(type)) throw new Error(`Unsupported database type: ${dataType}`);
  if (value === null) return '["null"]';
  if (value === undefined) throw new Error('Incomplete database row');
  if (type === 'json' || type === 'jsonb') {
    if (typeof value !== 'string') throw new Error('JSON database value was not returned as text');
    return JSON.stringify(['json', parseJsonCanonical(value)]);
  }
  if (type === 'bytea') {
    if (typeof value !== 'string' || !/^\\x(?:[\da-f]{2})*$/i.test(value)) throw new Error('Unsupported binary database value');
    return JSON.stringify(['bytea', value.slice(2).toLowerCase()]);
  }
  if (type === 'boolean') {
    if (value !== 'true' && value !== 'false' && value !== 't' && value !== 'f' && typeof value !== 'boolean') throw new Error('Invalid boolean value');
    return JSON.stringify(['boolean', value === true || value === 'true' || value === 't']);
  }
  if (type === 'date') {
    const date = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error('Invalid date value');
    return JSON.stringify(['date', date]);
  }
  if (type === 'timestamp with time zone' || type === 'timestamp without time zone') {
    if (typeof value !== 'string' && !(value instanceof Date)) throw new Error('Invalid timestamp value');
    return JSON.stringify([type, canonicalTimestamp(value, type === 'timestamp with time zone')]);
  }
  if (['smallint', 'integer', 'bigint', 'numeric', 'real', 'double precision'].includes(type)) {
    const numeric = typeof value === 'number' ? String(value) : typeof value === 'bigint' ? value.toString() : String(value);
    return JSON.stringify(['numeric', normalizeNumeric(numeric)]);
  }
  if (typeof value !== 'string') throw new Error('Database scalar was not returned as text');
  return JSON.stringify([type, value]);
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function digestTable(table: DigestTable): TableDigest {
  const columns = [...table.columns].sort((a, b) => a.ordinal - b.ordinal);
  if (columns.length === 0) throw new Error(`Table has no readable columns: ${table.name}`);
  const canonicalRows = table.rows.map((row) => {
    const cells = columns.map((column) => {
      if (!Object.prototype.hasOwnProperty.call(row, column.name)) throw new Error('Incomplete database row');
      return [column.name, canonicalizeCell(column.dataType, row[column.name])];
    });
    return JSON.stringify(cells);
  }).sort();
  const schema = JSON.stringify({
    name: table.name,
    columns,
    primaryKey: [...table.primaryKey],
    constraints: [...table.constraints].sort(),
    indexes: [...table.indexes].sort(),
    rowSecurity: table.rowSecurity ?? { enabled: false, forced: false },
    policies: [...(table.policies ?? [])].sort(),
    triggers: [...(table.triggers ?? [])].sort(),
  });
  const digest = createHash('sha256');
  digest.update(schema, 'utf8');
  digest.update('\n', 'utf8');
  for (const row of canonicalRows) { digest.update(row, 'utf8'); digest.update('\n', 'utf8'); }
  return { count: canonicalRows.length, sha256: digest.digest('hex') };
}

export function createDatabaseDigest(tables: DigestTable[], schemaObjects: DigestSchemaObject[] = []): DatabaseDigest {
  const sorted = [...tables].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const tableDigests = Object.create(null) as Record<string, TableDigest>;
  for (const table of sorted) {
    if (Object.prototype.hasOwnProperty.call(tableDigests, table.name)) throw new Error(`Duplicate table in snapshot: ${table.name}`);
    tableDigests[table.name] = digestTable(table);
  }
  const schemaMaterial = sorted.map((table) => JSON.stringify({
    name: table.name,
    columns: [...table.columns].sort((a, b) => a.ordinal - b.ordinal),
    primaryKey: table.primaryKey,
    constraints: [...table.constraints].sort(),
    indexes: [...table.indexes].sort(),
    rowSecurity: table.rowSecurity ?? { enabled: false, forced: false },
    policies: [...(table.policies ?? [])].sort(),
    triggers: [...(table.triggers ?? [])].sort(),
  })).join('\n');
  const sortedObjects = [...schemaObjects].sort((a, b) => {
    const leftKey = `${a.kind}:${a.name}`;
    const rightKey = `${b.kind}:${b.name}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  const completeSchemaMaterial = `${schemaMaterial}\n${JSON.stringify(sortedObjects)}`;
  const migrationSha256 = tableDigests.schema_migrations?.sha256 ?? null;
  return {
    format: 'sdinfinova-backup-digest-v2',
    tables: tableDigests,
    schemaObjects: sortedObjects,
    schemaSha256: sha256(completeSchemaMaterial),
    migrationSha256,
  };
}

export function compareDatabaseDigests(left: DatabaseDigest, right: DatabaseDigest) {
  const tableNames = [...new Set([...Object.keys(left.tables), ...Object.keys(right.tables)])].sort();
  const mismatches = tableNames.filter((name) => {
    const a = left.tables[name];
    const b = right.tables[name];
    return !a || !b || a.count !== b.count || a.sha256 !== b.sha256;
  });
  const schemaMatches = left.schemaSha256 === right.schemaSha256;
  const migrationMatches = left.migrationSha256 === right.migrationSha256;
  return {
    matches: mismatches.length === 0 && schemaMatches && migrationMatches,
    mismatchedTables: mismatches,
    schemaMatches,
    migrationMatches,
    tableCount: tableNames.length,
    rowCount: Object.values(left.tables).reduce((sum, table) => sum + table.count, 0),
  };
}

export async function compareSnapshotReaders(
  readLeft: () => Promise<DatabaseDigest>,
  readRight: () => Promise<DatabaseDigest>,
) {
  const left = await readLeft();
  const right = await readRight();
  return compareDatabaseDigests(left, right);
}

function isSameOrWithin(parent: string, candidate: string): boolean {
  const rel = relative(resolve(parent), resolve(candidate));
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

export function assertScratchIsolation(paths: {
  projectRoot: string;
  scratchRoot: string;
  originalDatabase: string;
  archiveDirectories: string[];
}): void {
  const project = resolve(paths.projectRoot);
  const scratch = resolve(paths.scratchRoot);
  const original = resolve(paths.originalDatabase);
  if (isSameOrWithin(project, scratch)) throw new Error('Scratch directory must be outside the repository');
  if (isSameOrWithin(original, scratch) || isSameOrWithin(scratch, original)) throw new Error('Scratch directory overlaps the original database path');
  for (const directory of paths.archiveDirectories) {
    const archiveDirectory = resolve(directory);
    if (isSameOrWithin(original, archiveDirectory)) throw new Error('Archive location must be outside the original database path');
    if (isSameOrWithin(archiveDirectory, scratch) || isSameOrWithin(scratch, archiveDirectory)) throw new Error('Scratch directory overlaps an input archive location');
  }
}

type QueryDb = {
  exec(sql: string): Promise<unknown>;
  query<T = Record<string, unknown>>(sql: string): Promise<{ rows: T[] }>;
};

const quoteIdent = (value: string) => `"${value.replace(/"/g, '""')}"`;

export async function readDatabaseDigest(db: QueryDb): Promise<DatabaseDigest> {
  let inTransaction = false;
  try {
    await db.exec('BEGIN READ ONLY');
    inTransaction = true;
    await db.exec("SET LOCAL TIME ZONE 'UTC'; SET LOCAL DateStyle TO ISO, YMD");
    const tableResult = await db.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name",
    );
    const columnResult = await db.query<DigestColumn & { table_name: string }>(
      "SELECT table_name, column_name AS name, data_type AS \"dataType\", udt_name AS \"udtName\", is_nullable AS nullable, column_default AS \"defaultValue\", ordinal_position::int AS ordinal FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position",
    );
    const tableNames = tableResult.rows.map((row) => row.table_name).sort();
    if (tableNames.length === 0) throw new Error('No public tables found');
    if (!tableNames.includes('schema_migrations')) throw new Error('Migration ledger is missing');
    const pkResult = await db.query<{ table_name: string; column_name: string; ordinal_position: number }>(
      "SELECT tc.table_name, kcu.column_name, kcu.ordinal_position::int FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON kcu.constraint_schema = tc.constraint_schema AND kcu.constraint_name = tc.constraint_name AND kcu.table_name = tc.table_name WHERE tc.constraint_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY' ORDER BY tc.table_name, kcu.ordinal_position",
    );
    const constraintResult = await db.query<{ table_name: string; definition: string }>(
      "SELECT c.relname AS table_name, concat(con.contype::text, ':', pg_get_constraintdef(con.oid, true)) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' ORDER BY c.relname, definition",
    );
    const indexResult = await db.query<{ tablename: string; indexdef: string }>(
      "SELECT tablename, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname",
    );
    const securityResult = await db.query<{ table_name: string; enabled: boolean; forced: boolean }>(
      "SELECT c.relname AS table_name, c.relrowsecurity AS enabled, c.relforcerowsecurity AS forced FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') ORDER BY c.relname",
    );
    const policyResult = await db.query<{ table_name: string; definition: string }>(
      "SELECT tablename AS table_name, json_build_object('name', policyname, 'permissive', permissive, 'roles', roles, 'command', cmd, 'using', qual, 'check', with_check)::text AS definition FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname",
    );
    const triggerResult = await db.query<{ table_name: string; definition: string }>(
      "SELECT c.relname AS table_name, concat(pg_get_triggerdef(t.oid, true), '|enabled=', t.tgenabled::text, '|function=', pg_get_functiondef(p.oid)) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_proc p ON p.oid = t.tgfoid WHERE n.nspname = 'public' AND NOT t.tgisinternal ORDER BY c.relname, definition",
    );
    const sequenceResult = await db.query<{ name: string; definition: string }>(
      "SELECT sequencename AS name, json_build_object('data_type', data_type, 'start_value', start_value, 'min_value', min_value, 'max_value', max_value, 'increment_by', increment_by, 'cycle', cycle, 'cache_size', cache_size, 'last_value', last_value)::text AS definition FROM pg_sequences WHERE schemaname = 'public' ORDER BY sequencename",
    );
    const routineResult = await db.query<{ name: string; definition: string }>(
      "SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS name, pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p') ORDER BY name",
    );
    const unsupportedRoutineResult = await db.query<{ name: string }>(
      "SELECT p.proname AS name FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prokind NOT IN ('f', 'p') ORDER BY p.proname",
    );
    const unsupportedTypeResult = await db.query<{ name: string }>(
      "SELECT t.typname AS name FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typrelid = 0 AND t.typelem = 0 AND t.typtype IN ('b', 'c', 'd', 'e', 'r', 'm') ORDER BY t.typname",
    );
    const unsupportedRelationResult = await db.query<{ name: string; kind: string }>(
      "SELECT c.relname AS name, c.relkind::text AS kind FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm', 'f') ORDER BY c.relname",
    );
    if (unsupportedRelationResult.rows.length || unsupportedRoutineResult.rows.length || unsupportedTypeResult.rows.length) {
      throw new Error('Unsupported public schema object is present');
    }
    const tables: DigestTable[] = [];
    for (const name of tableNames) {
      const columns = columnResult.rows.filter((column) => column.table_name === name).map(({ table_name: _table, ...column }) => column);
      for (const column of columns) {
      const normalized = column.dataType.toLowerCase();
        if (!SUPPORTED_TYPES.has(normalized) && !SUPPORTED_TYPES.has(column.udtName)) throw new Error(`Unsupported database type in ${name}.${column.name}`);
      }
      const primaryKey = pkResult.rows.filter((row) => row.table_name === name).sort((a, b) => a.ordinal_position - b.ordinal_position).map((row) => row.column_name);
      const rowSecurity = securityResult.rows.find((row) => row.table_name === name);
      if (!rowSecurity) throw new Error(`Incomplete schema security read: ${name}`);
      const select = columns.map((column, index) => `${quoteIdent(column.name)}::text AS ${quoteIdent(`c${index}`)}`).join(', ');
      const relation = `public.${quoteIdent(name)}`;
      const countResult = await db.query<{ row_count: string }>(`SELECT count(*)::text AS row_count FROM ${relation}`);
      const result = await db.query<Record<string, unknown>>(`SELECT ${select} FROM ${relation}`);
      if (BigInt(countResult.rows[0]?.row_count ?? '-1') !== BigInt(result.rows.length)) throw new Error(`Incomplete table read: ${name}`);
      const rows = result.rows.map((row) => Object.fromEntries(columns.map((column, index) => [column.name, row[`c${index}`]])));
      tables.push({
        name,
        columns,
        primaryKey,
        constraints: constraintResult.rows.filter((row) => row.table_name === name).map((row) => row.definition),
        indexes: indexResult.rows.filter((row) => row.tablename === name).map((row) => row.indexdef),
        rowSecurity,
        policies: policyResult.rows.filter((row) => row.table_name === name).map((row) => row.definition),
        triggers: triggerResult.rows.filter((row) => row.table_name === name).map((row) => row.definition),
        rows,
      });
    }
    const schemaObjects: DigestSchemaObject[] = [
      ...sequenceResult.rows.map((row) => ({ kind: 'sequence', name: row.name, definition: row.definition })),
      ...routineResult.rows.map((row) => ({ kind: 'routine', name: row.name, definition: row.definition })),
    ];
    const digest = createDatabaseDigest(tables, schemaObjects);
    await db.exec('ROLLBACK');
    inTransaction = false;
    return digest;
  } catch (error) {
    if (inTransaction) {
      try { await db.exec('ROLLBACK'); } catch { /* Fail closed; caller receives the original comparison failure. */ }
    }
    throw error;
  }
}
