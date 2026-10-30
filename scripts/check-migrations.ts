/**
 * Migration immutability guard. Usage: npm run check:migrations [-- --base <ref>]
 *
 * Once a migration file is on the base ref (default origin/main) it is immutable: `supabase db push`
 * skips versions it already applied, so editing one silently does nothing in production.
 * Changes go in a NEW migration with a later timestamp.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = 'supabase/migrations';

/** file name -> content hash */
export type MigrationSet = Record<string, string>;

export interface MigrationCheck {
  ok: boolean;
  errors: string[];
}

const prefix = (name: string) => name.split('_')[0];

export function checkMigrations(base: MigrationSet, head: MigrationSet): MigrationCheck {
  const errors: string[] = [];
  const fix = 'Migrations on the base are immutable: add a new migration instead.';

  for (const name of Object.keys(base).sort()) {
    if (!(name in head)) {
      errors.push(`${name}: exists at the base but is deleted or renamed. ${fix}`);
    } else if (head[name] !== base[name]) {
      errors.push(`${name}: exists at the base but was modified. ${fix}`);
    }
  }

  const baseNames = Object.keys(base);
  if (baseNames.length > 0) {
    const newest = baseNames.map(prefix).sort().at(-1)!;
    for (const name of Object.keys(head).sort()) {
      if (name in base) continue;
      if (prefix(name) <= newest) {
        errors.push(
          `${name}: new migration timestamp ${prefix(name)} is not later than the newest at the base (${newest}). ` +
            `Give it a later timestamp (add a new migration instead of reusing an old slot).`,
        );
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Ignore CRLF vs LF so Windows checkouts don't look modified. */
const hash = (buf: Buffer) => createHash('sha256').update(buf.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');
const git = (...args: string[]) => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });

function readBase(ref: string): MigrationSet {
  const names = git('ls-tree', '--name-only', ref, `${DIR}/`)
    .toString('utf8')
    .split('\n')
    .map((n) => n.trim())
    .filter((n) => n.endsWith('.sql'));
  const set: MigrationSet = {};
  for (const n of names) set[n.slice(DIR.length + 1)] = hash(git('show', `${ref}:${n}`));
  return set;
}

function readHead(): MigrationSet {
  const set: MigrationSet = {};
  for (const n of readdirSync(DIR).filter((f) => f.endsWith('.sql'))) set[n] = hash(readFileSync(join(DIR, n)));
  return set;
}

function main() {
  const i = process.argv.indexOf('--base');
  const ref = i >= 0 ? process.argv[i + 1] : 'origin/main';
  if (!ref) {
    console.error('--base needs a git ref');
    process.exit(2);
  }
  let base: MigrationSet;
  try {
    base = readBase(ref);
  } catch (e) {
    console.error(
      `Cannot read ${DIR} at "${ref}" (${(e as Error).message.split('\n')[0]}). Fetch it first, e.g. git fetch origin main.`,
    );
    process.exit(2);
  }
  const res = checkMigrations(base, readHead());
  if (!res.ok) {
    console.error(`Migration check FAILED against ${ref}:`);
    for (const e of res.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`Migration check passed against ${ref} (${Object.keys(base).length} base migrations unchanged).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
